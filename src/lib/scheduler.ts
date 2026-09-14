import type {
  Horario,
  Turma,
  TurmaDisciplinaWithRelations,
  ProfessorDisponibilidade,
  Feriado,
  Evento,
  Aula,
  Configuracoes,
} from '@/types/database';

export type Slot = {
  data: string;
  horario_id: string;
  turma_id: string;
};

export type ScheduledAula = {
  data: string;
  horario_id: string;
  turma_id: string;
  disciplina_id: string;
  professor_id: string;
  turma_disciplina_id: string;
};

export type UnassignedItem = {
  turma_disciplina_id: string;
  turma_nome: string;
  disciplina_nome: string;
  professor_nome: string;
  remaining: number;
  motivo: string;
};

export type ScheduleResult = {
  aulas: ScheduledAula[];
  unassigned: UnassignedItem[];
  stats: {
    total_aulas: number;
    scheduled: number;
    unassigned_count: number;
    dias_usados: number;
    professores_usados: number;
  };
};

const DIAS_SEMANA_NOMES = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isFeriado(
  data: string,
  turmaId: string,
  feriados: Feriado[],
): Feriado | null {
  return (
    feriados.find(
      f =>
        f.data === data &&
        (f.abrangencia === 'Todas' || f.turma_id === turmaId),
    ) || null
  );
}

function isEventoBlocking(
  data: string,
  horarioId: string,
  turmaId: string,
  eventos: Evento[],
): boolean {
  return eventos.some(ev => {
    if (!ev.bloqueia_aulas) return false;
    const dentro =
      data >= ev.data_inicio && data <= ev.data_fim;
    if (!dentro) return false;
    if (ev.abrangencia !== 'Todas' && ev.turma_id !== turmaId) return false;
    if (ev.horario_id && ev.horario_id !== horarioId) return false;
    return true;
  });
}

function isProfessorAvailable(
  professorId: string,
  data: string,
  horarioId: string,
  disponibilidade: ProfessorDisponibilidade[],
): boolean {
  const diaSemana = parseDate(data).getDay();
  return disponibilidade.some(
    d =>
      d.professor_id === professorId &&
      d.dia_semana === diaSemana &&
      d.horario_id === horarioId,
  );
}

export function generateSchedule(params: {
  periodoInicio: string;
  periodoFim: string;
  horarios: Horario[];
  turmas: Turma[];
  turmaDisciplinas: TurmaDisciplinaWithRelations[];
  disponibilidade: ProfessorDisponibilidade[];
  feriados: Feriado[];
  eventos: Evento[];
  config: Configuracoes;
  aulasExistentes?: Aula[];
}): ScheduleResult {
  const {
    periodoInicio,
    periodoFim,
    horarios,
    turmas,
    turmaDisciplinas,
    disponibilidade,
    feriados,
    eventos,
    config,
  } = params;

  const horariosOrdenados = [...horarios].sort((a, b) => a.ordem - b.ordem);

  // Build list of all teaching days (excluding Sundays)
  const startDate = parseDate(periodoInicio);
  const endDate = parseDate(periodoFim);
  const allDates: string[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 0) {
      // skip Sunday
      allDates.push(formatDate(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Track remaining classes to schedule per turma_disciplina
  const remaining = new Map<string, number>();
  turmaDisciplinas.forEach(td => {
    remaining.set(td.id, td.num_aulas);
  });

  // Track occupied slots: key = `${data}|${horario_id}|${turma_id}` or `${data}|${horario_id}|${professor_id}`
  const turmaSlotOcupado = new Set<string>();
  const professorSlotOcupado = new Set<string>();
  const aulas: ScheduledAula[] = [];

  // Track how many classes each professor has per day (for optimization)
  const professorDayCount = new Map<string, number>();

  // Group turma_disciplinas by professor for multi-turma optimization
  const byProfessor = new Map<string, TurmaDisciplinaWithRelations[]>();
  turmaDisciplinas.forEach(td => {
    const list = byProfessor.get(td.professor_id) || [];
    list.push(td);
    byProfessor.set(td.professor_id, list);
  });

  // Sort professors by total classes descending (schedule busiest first)
  const professorOrder = [...byProfessor.entries()]
    .map(([pid, tds]) => ({
      pid,
      total: tds.reduce((s, td) => s + td.num_aulas, 0),
    }))
    .sort((a, b) => b.total - a.total);

  const unassigned: UnassignedItem[] = [];

  // For each professor, try to schedule their classes
  for (const { pid } of professorOrder) {
    const professorTds = byProfessor.get(pid)!;

    // For each turma_disciplina of this professor, schedule classes
    for (const td of professorTds) {
      const need = remaining.get(td.id)!;
      if (need <= 0) continue;

      const turma = turmas.find(t => t.id === td.turma_id);
      if (!turma) continue;

      let scheduledForThisTd = 0;

      // Try to schedule in blocks of 2 consecutive slots
      while (scheduledForThisTd < need) {
        const remainingForTd = need - scheduledForThisTd;
        const blockSize = remainingForTd >= 2 ? 2 : 1;

        let scheduled = false;

        // Find best day: prefer days where professor already teaches (concentration)
        // or days with most available slots
        const dayScores = allDates.map(data => {
          // Check if date is blocked for this turma
          const feriado = isFeriado(data, turma.id, feriados);
          if (feriado) return { data, score: -1 };

          let score = 0;
          const profKey = `${data}|${pid}`;
          const profDayCount = professorDayCount.get(profKey) || 0;

          // Prefer days where professor already has classes (concentration)
          if (config.prioridade_otimizacao === 'concentracao' && profDayCount > 0) {
            score += profDayCount * 10;
          }

          // For 'menor_dias' priority, also prefer days with existing classes
          if (config.prioridade_otimizacao === 'menor_dias' && profDayCount > 0) {
            score += profDayCount * 15;
          }

          // Check how many slots are available for this block
          let availableSlots = 0;
          for (const h of horariosOrdenados) {
            const slotKey = `${data}|${h.id}|${turma.id}`;
            const profSlotKey = `${data}|${h.id}|${pid}`;
            if (turmaSlotOcupado.has(slotKey)) continue;
            if (professorSlotOcupado.has(profSlotKey)) continue;
            if (isEventoBlocking(data, h.id, turma.id, eventos)) continue;
            if (!isProfessorAvailable(pid, data, h.id, disponibilidade)) continue;
            availableSlots++;
          }
          score += availableSlots;

          if (availableSlots < blockSize) return { data, score: -1 };

          return { data, score };
        });

        // Sort days by score descending
        const sortedDays = dayScores
          .filter(d => d.score > 0)
          .sort((a, b) => b.score - a.score);

        for (const { data } of sortedDays) {
          // Try to find consecutive slots
          const slotsToUse: string[] = [];

          if (blockSize === 2 && config.aulas_consecutivas) {
            // Find two consecutive available slots
            for (let i = 0; i < horariosOrdenados.length - 1; i++) {
              const h1 = horariosOrdenados[i];
              const h2 = horariosOrdenados[i + 1];
              const key1t = `${data}|${h1.id}|${turma.id}`;
              const key1p = `${data}|${h1.id}|${pid}`;
              const key2t = `${data}|${h2.id}|${turma.id}`;
              const key2p = `${data}|${h2.id}|${pid}`;

              if (
                !turmaSlotOcupado.has(key1t) &&
                !professorSlotOcupado.has(key1p) &&
                !turmaSlotOcupado.has(key2t) &&
                !professorSlotOcupado.has(key2p) &&
                !isEventoBlocking(data, h1.id, turma.id, eventos) &&
                !isEventoBlocking(data, h2.id, turma.id, eventos) &&
                isProfessorAvailable(pid, data, h1.id, disponibilidade) &&
                isProfessorAvailable(pid, data, h2.id, disponibilidade)
              ) {
                slotsToUse.push(h1.id, h2.id);
                break;
              }
            }
          }

          // If no consecutive pair found (or blockSize=1), find individual slots
          if (slotsToUse.length === 0) {
            for (const h of horariosOrdenados) {
              if (slotsToUse.length >= blockSize) break;
              const slotKey = `${data}|${h.id}|${turma.id}`;
              const profSlotKey = `${data}|${h.id}|${pid}`;
              if (turmaSlotOcupado.has(slotKey)) continue;
              if (professorSlotOcupado.has(profSlotKey)) continue;
              if (isEventoBlocking(data, h.id, turma.id, eventos)) continue;
              if (!isProfessorAvailable(pid, data, h.id, disponibilidade)) continue;
              slotsToUse.push(h.id);
            }
          }

          if (slotsToUse.length >= blockSize) {
            for (const horarioId of slotsToUse.slice(0, blockSize)) {
              const aula: ScheduledAula = {
                data,
                horario_id: horarioId,
                turma_id: turma.id,
                disciplina_id: td.disciplina_id,
                professor_id: td.professor_id,
                turma_disciplina_id: td.id,
              };
              aulas.push(aula);
              turmaSlotOcupado.add(`${data}|${horarioId}|${turma.id}`);
              professorSlotOcupado.add(`${data}|${horarioId}|${pid}`);
              const profKey = `${data}|${pid}`;
              professorDayCount.set(profKey, (professorDayCount.get(profKey) || 0) + 1);
              scheduledForThisTd++;
            }
            scheduled = true;
            break;
          }
        }

        if (!scheduled) break;
      }

      const actuallyScheduled = scheduledForThisTd;
      remaining.set(td.id, need - actuallyScheduled);

      if (actuallyScheduled < need) {
        const remainingCount = need - actuallyScheduled;
        unassigned.push({
          turma_disciplina_id: td.id,
          turma_nome: turma.nome,
          disciplina_nome: td.disciplina?.nome || '—',
          professor_nome: td.professor?.nome || '—',
          remaining: remainingCount,
          motivo:
            remainingCount === need
              ? 'Professor sem disponibilidade compatível ou todos os horários ocupados.'
              : 'Horários insuficientes para completar todas as aulas.',
        });
      }
    }
  }

  // Calculate stats
  const diasUsados = new Set(aulas.map(a => a.data)).size;
  const professoresUsados = new Set(aulas.map(a => a.professor_id)).size;

  return {
    aulas,
    unassigned,
    stats: {
      total_aulas: turmaDisciplinas.reduce((s, td) => s + td.num_aulas, 0),
      scheduled: aulas.length,
      unassigned_count: unassigned.reduce((s, u) => s + u.remaining, 0),
      dias_usados: diasUsados,
      professores_usados: professoresUsados,
    },
  };
}

export { DIAS_SEMANA_NOMES };
