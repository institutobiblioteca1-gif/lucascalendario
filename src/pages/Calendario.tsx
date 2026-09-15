import { useEffect, useState, useMemo } from 'react';
import { CalendarRange, Printer, FileDown, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  PageHeader,
  Card,
  Select,
  Label,
  Button,
  EmptyState,
  Badge,
} from '@/components/ui';
import type {
  Aula,
  Horario,
  Turma,
  Disciplina,
  Professor,
  Feriado,
  Evento,
} from '@/types/database';
import { DIAS_SEMANA_NOMES } from '@/lib/scheduler';
import { generatePdfReport } from '@/lib/pdf';
import type { Configuracoes } from '@/types/database';

type AulaDetalhada = Aula & {
  horario?: Horario;
  turma?: Turma;
  disciplina?: Disciplina;
  professor?: Professor;
};

type ViewMode = 'geral' | 'turma' | 'professor';

export default function Calendario() {
  const [aulas, setAulas] = useState<AulaDetalhada[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [config, setConfig] = useState<Configuracoes | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('geral');
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [selectedProfessorId, setSelectedProfessorId] = useState('');

  useEffect(() => {
    async function fetchAllAulas(): Promise<AulaDetalhada[]> {
      const pageSize = 1000;
      let from = 0;
      let all: AulaDetalhada[] = [];
      while (true) {
        const { data, error } = await supabase
          .from('aulas')
          .select('*, horario:horarios(*), turma:turmas(*), disciplina:disciplinas(*), professor:professores(*)')
          .order('data')
          .order('horario_id')
          .range(from, from + pageSize - 1);
        if (error || !data || data.length === 0) break;
        all = all.concat(data as AulaDetalhada[]);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    }

    async function load() {
      const [aulasData, t, p, f, e, c] = await Promise.all([
        fetchAllAulas(),
        supabase.from('turmas').select('*').order('nome'),
        supabase.from('professores').select('*').order('nome'),
        supabase.from('feriados').select('*').order('data'),
        supabase.from('eventos').select('*').order('data_inicio'),
        supabase.from('configuracoes').select('*').maybeSingle(),
      ]);
      setAulas(aulasData || []);
      setTurmas(t.data || []);
      setProfessores(p.data || []);
      setFeriados(f.data || []);
      setEventos(e.data || []);
      setConfig(c.data);
      setLoading(false);
    }
    load();
  }, []);

  const filteredAulas = useMemo(() => {
    if (viewMode === 'turma' && selectedTurmaId) {
      return aulas.filter(a => a.turma_id === selectedTurmaId);
    }
    if (viewMode === 'professor' && selectedProfessorId) {
      return aulas.filter(a => a.professor_id === selectedProfessorId);
    }
    return aulas;
  }, [aulas, viewMode, selectedTurmaId, selectedProfessorId]);

  // Feriados/eventos relevantes para o filtro atual (mesma regra usada no gerador:
  // abrangência "Todas" sempre conta, "Específica" só conta para a turma selecionada)
  const relevantFeriados = useMemo(() => {
    const turmaId = viewMode === 'turma' ? selectedTurmaId : '';
    return feriados.filter(f => f.abrangencia === 'Todas' || (!!turmaId && f.turma_id === turmaId));
  }, [feriados, viewMode, selectedTurmaId]);

  const relevantEventos = useMemo(() => {
    const turmaId = viewMode === 'turma' ? selectedTurmaId : '';
    return eventos.filter(e => e.abrangencia === 'Todas' || (!!turmaId && e.turma_id === turmaId));
  }, [eventos, viewMode, selectedTurmaId]);

  // Group by date — inclui também datas de feriados/eventos sem nenhuma aula,
  // para que o feriado/evento apareça no calendário mesmo em dias sem aula.
  const groupedByDate = useMemo(() => {
    const map = new Map<string, AulaDetalhada[]>();
    filteredAulas.forEach(a => {
      const list = map.get(a.data) || [];
      list.push(a);
      map.set(a.data, list);
    });
    relevantFeriados.forEach(f => {
      if (!map.has(f.data)) map.set(f.data, []);
    });
    relevantEventos.forEach(ev => {
      let d = ev.data_inicio;
      let guard = 0;
      while (d <= ev.data_fim && guard < 366) {
        if (!map.has(d)) map.set(d, []);
        const next = new Date(d + 'T00:00:00');
        next.setDate(next.getDate() + 1);
        d = next.toISOString().slice(0, 10);
        guard += 1;
      }
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredAulas, relevantFeriados, relevantEventos]);

  function formatDateBR(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  }

  function getDiaSemana(dateStr: string): string {
    const dia = new Date(dateStr + 'T00:00:00').getDay();
    return DIAS_SEMANA_NOMES[dia];
  }

  function getFeriadoForDate(dateStr: string): Feriado | undefined {
    return relevantFeriados.find(f => f.data === dateStr);
  }

  function getEventosForDate(dateStr: string): Evento[] {
    return relevantEventos.filter(e => dateStr >= e.data_inicio && dateStr <= e.data_fim);
  }

  function handlePrint() {
    window.print();
  }

  function handleDownloadPdf() {
    const selectedTurma = turmas.find(t => t.id === selectedTurmaId);
    const selectedProfessor = professores.find(p => p.id === selectedProfessorId);
    const context = viewMode === 'turma' && selectedTurma
      ? selectedTurma.nome
      : viewMode === 'professor' && selectedProfessor
        ? selectedProfessor.nome
        : 'GERAL';
    const title = `CALENDÁRIO ACADÊMICO — ${context}`;
    const subtitle = viewMode === 'professor'
      ? `PROFESSOR: ${selectedProfessor?.nome || 'TODOS'}`
      : viewMode === 'turma'
        ? `TURMA: ${selectedTurma?.nome || 'TODAS'}`
        : 'CALENDÁRIO ACADÊMICO GERAL';
    generatePdfReport({
      aulas: filteredAulas,
      title,
      subtitle,
      institutionName: config?.nome_instituicao || 'IFITEO',
      feriados: relevantFeriados,
      eventos: relevantEventos,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
      );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Calendário Acadêmico"
        description="Visualize o calendário gerado por turma, professor ou geral"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleDownloadPdf} disabled={groupedByDate.length === 0}>
              <FileDown className="w-4 h-4" />
              Baixar PDF
            </Button>
            <Button variant="secondary" onClick={handlePrint}>
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Visualização</Label>
            <Select value={viewMode} onChange={v => setViewMode(v as ViewMode)}>
              <option value="geral">Calendário Geral</option>
              <option value="turma">Por Turma</option>
              <option value="professor">Por Professor</option>
            </Select>
          </div>
          {viewMode === 'turma' && (
            <div>
              <Label>Turma</Label>
              <Select value={selectedTurmaId} onChange={setSelectedTurmaId}>
                <option value="">Todas</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </Select>
            </div>
          )}
          {viewMode === 'professor' && (
            <div>
              <Label>Professor</Label>
              <Select value={selectedProfessorId} onChange={setSelectedProfessorId}>
                <option value="">Todos</option>
                {professores.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </Card>

      {groupedByDate.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarRange className="w-8 h-8" />}
            title="Nenhuma aula no calendário"
            description="Gere o calendário automaticamente na aba Gerador para visualizar as aulas aqui"
          />
        </Card>
      ) : (
        <div className="space-y-4 print-area">
          {groupedByDate.map(([date, aulasDoDia]) => {
            const feriado = getFeriadoForDate(date);
            const eventosDoDia = getEventosForDate(date);
            return (
              <Card key={date} className="overflow-hidden">
                {/* Date header */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[50px]">
                      <p className="text-xs text-slate-400 uppercase">{getDiaSemana(date).slice(0, 3)}</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {new Date(date + 'T00:00:00').getDate()}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {getDiaSemana(date)} — {formatDateBR(date)}
                      </p>
                      {eventosDoDia.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {eventosDoDia.map(ev => (
                            <Badge key={ev.id} color="blue">{ev.nome}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {feriado && <Badge color="red">{feriado.descricao}</Badge>}
                </div>

                {/* Aulas */}
                <div className="divide-y divide-slate-50">
                  {aulasDoDia.length === 0 ? (
                    <div className="px-5 py-3 text-xs text-slate-400 italic">
                      Sem aulas neste dia
                    </div>
                  ) : (
                    aulasDoDia.map(a => (
                      <div key={a.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                        <div className="text-xs font-medium text-slate-500 min-w-[100px]">
                          {a.horario?.hora_inicio} – {a.horario?.hora_fim}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{a.disciplina?.nome}</p>
                          <p className="text-xs text-slate-500">Prof. {a.professor?.nome}</p>
                        </div>
                        {viewMode !== 'turma' && (
                          <Badge color="amber">{a.turma?.nome}</Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
