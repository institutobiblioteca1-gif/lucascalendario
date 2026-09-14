import { useEffect, useState } from 'react';
import { Sparkles, AlertTriangle, CheckCircle, Loader2, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  PageHeader,
  Card,
  Button,
  Select,
  Label,
  Badge,
  EmptyState,
} from '@/components/ui';
import { generateSchedule, type ScheduleResult } from '@/lib/scheduler';
import type {
  PeriodoAcademico,
  Horario,
  Turma,
  TurmaDisciplinaWithRelations,
  ProfessorDisponibilidade,
  Feriado,
  Evento,
  Configuracoes,
} from '@/types/database';

export default function Gerador() {
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState('');
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaDisciplinas, setTurmaDisciplinas] = useState<TurmaDisciplinaWithRelations[]>([]);
  const [disponibilidade, setDisponibilidade] = useState<ProfessorDisponibilidade[]>([]);
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [config, setConfig] = useState<Configuracoes | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [existingAulas, setExistingAulas] = useState(0);

  useEffect(() => {
    async function loadData() {
      const [p, h, c] = await Promise.all([
        supabase.from('periodos_academicos').select('*').order('ano', { ascending: false }),
        supabase.from('horarios').select('*').order('ordem'),
        supabase.from('configuracoes').select('*').maybeSingle(),
      ]);
      setPeriodos(p.data || []);
      setHorarios(h.data || []);
      setConfig(c.data);
      if (p.data && p.data.length > 0) {
        setSelectedPeriodoId(p.data[0].id);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedPeriodoId) return;
    async function loadPeriodData() {
      const { data: allTurmas } = await supabase
        .from('turmas')
        .select('*')
        .eq('periodo_academico_id', selectedPeriodoId);
      const filteredTurmas = allTurmas || [];
      setTurmas(filteredTurmas);
      const turmaIds = filteredTurmas.map(t => t.id);
      if (turmaIds.length === 0) {
        setTurmaDisciplinas([]);
        setDisponibilidade([]);
        setFeriados([]);
        setEventos([]);
        setExistingAulas(0);
        return;
      }
      const [td, disp, f, e, aulas] = await Promise.all([
        supabase
          .from('turma_disciplinas')
          .select('*, disciplina:disciplinas(*), professor:professores(*), turma:turmas(*)')
          .in('turma_id', turmaIds),
        supabase.from('professor_disponibilidade').select('*'),
        supabase.from('feriados').select('*'),
        supabase.from('eventos').select('*'),
        supabase.from('aulas').select('*', { count: 'exact', head: true }),
      ]);
      setTurmaDisciplinas(td.data || []);
      setDisponibilidade(disp.data || []);
      setFeriados(f.data || []);
      setEventos(e.data || []);
      setExistingAulas(aulas.count || 0);
    }
    loadPeriodData();
  }, [selectedPeriodoId]);

  async function handleGenerate() {
    const periodo = periodos.find(p => p.id === selectedPeriodoId);
    if (!periodo) return;

    setGenerating(true);
    setResult(null);

    await new Promise(r => setTimeout(r, 300));

    const scheduleResult = generateSchedule({
      periodoInicio: periodo.data_inicio,
      periodoFim: periodo.data_fim,
      horarios,
      turmas,
      turmaDisciplinas,
      disponibilidade,
      feriados,
      eventos,
      config: config || {
        id: '',
        nome_instituicao: '',
        prioridade_otimizacao: 'concentracao',
        aulas_consecutivas: true,
        multi_turma_mesmo_dia: true,
        created_at: '',
      },
    });

    setResult(scheduleResult);
    setGenerating(false);

    if (scheduleResult.aulas.length > 0) {
      const turmaIds = turmas.map(t => t.id);
      if (turmaIds.length > 0) {
        await supabase.from('aulas').delete().in('turma_id', turmaIds);
      }
      await supabase.from('aulas').insert(
        scheduleResult.aulas.map(a => ({
          data: a.data,
          horario_id: a.horario_id,
          turma_id: a.turma_id,
          disciplina_id: a.disciplina_id,
          professor_id: a.professor_id,
          turma_disciplina_id: a.turma_disciplina_id,
        })),
      );
      setExistingAulas(scheduleResult.aulas.length);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const periodo = periodos.find(p => p.id === selectedPeriodoId);
  const canGenerate = periodo && turmas.length > 0 && turmaDisciplinas.length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Gerador Automático"
        description="O sistema calcula a melhor distribuição de aulas automaticamente"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-6 space-y-4">
            <div>
              <Label>Período Acadêmico</Label>
              <Select value={selectedPeriodoId} onChange={setSelectedPeriodoId}>
                <option value="">Selecione...</option>
                {periodos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.ano} · {p.semestre}º Semestre
                  </option>
                ))}
              </Select>
            </div>

            {periodo && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Início</span>
                  <span className="font-medium text-slate-900">
                    {new Date(periodo.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Fim</span>
                  <span className="font-medium text-slate-900">
                    {new Date(periodo.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Turmas</span>
                  <span className="font-medium text-slate-900">{turmas.length}</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Disciplinas vinculadas</span>
                  <span className="font-medium text-slate-900">{turmaDisciplinas.length}</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Horários configurados</span>
                  <span className="font-medium text-slate-900">{horarios.length}</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Aulas já geradas</span>
                  <span className="font-medium text-slate-900">{existingAulas}</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
              size="lg"
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Gerar Calendário
                </>
              )}
            </Button>

            {!canGenerate && (
              <p className="text-xs text-amber-600 text-center">
                Cadastre turmas e vincule disciplinas antes de gerar o calendário.
              </p>
            )}

            {config && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Otimização</p>
                <Badge color="amber">
                  {config.prioridade_otimizacao === 'concentracao' && 'Concentração de aulas'}
                  {config.prioridade_otimizacao === 'menor_dias' && 'Menor número de dias'}
                  {config.prioridade_otimizacao === 'disponibilidade' && 'Disponibilidade do professor'}
                  {config.prioridade_otimizacao === 'equilibrada' && 'Distribuição equilibrada'}
                </Badge>
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          {generating ? (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                <h3 className="text-lg font-semibold text-slate-700">Calculando melhor distribuição...</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Verificando disponibilidades, conflitos e otimizando a presença dos professores
                </p>
              </div>
            </Card>
          ) : result ? (
            <Card className="p-6">
              {result.unassigned.length === 0 ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg mb-4">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-800">Calendário gerado com sucesso!</h3>
                    <p className="text-sm text-green-600">Todas as aulas foram alocadas sem conflitos.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg mb-4">
                  <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-800">Calendário gerado com ressalvas</h3>
                    <p className="text-sm text-amber-600">
                      {result.unassigned.length} disciplina(s) não puderam ser totalmente alocadas.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900">{result.stats.scheduled}</p>
                  <p className="text-xs text-slate-500">Aulas alocadas</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900">{result.stats.unassigned_count}</p>
                  <p className="text-xs text-slate-500">Não alocadas</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900">{result.stats.dias_usados}</p>
                  <p className="text-xs text-slate-500">Dias usados</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900">{result.stats.professores_usados}</p>
                  <p className="text-xs text-slate-500">Professores</p>
                </div>
              </div>

              {result.unassigned.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Aulas não alocadas:</h4>
                  <div className="space-y-2">
                    {result.unassigned.map(u => (
                      <div key={u.turma_disciplina_id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {u.disciplina_nome} — {u.turma_nome} ({u.remaining} aula{u.remaining > 1 ? 's' : ''})
                          </p>
                          <p className="text-xs text-slate-500">Prof. {u.professor_nome}</p>
                          <p className="text-xs text-red-500 mt-1">{u.motivo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-6">
                <Button onClick={handleGenerate} variant="secondary">
                  <RotateCcw className="w-4 h-4" />
                  Reorganizar
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon={<Sparkles className="w-8 h-8" />}
                title="Pronto para gerar"
                description="Selecione um período acadêmico e clique em Gerar Calendário. O sistema fará a distribuição automaticamente."
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
