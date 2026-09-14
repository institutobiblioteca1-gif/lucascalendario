import { useEffect, useState } from 'react';
import { Plus, Trash2, CalendarOff, Megaphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Label,
  Modal,
  EmptyState,
  Badge,
} from '@/components/ui';
import type { Feriado, Evento, Turma, Horario } from '@/types/database';

export default function FeriadosEventos() {
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'feriados' | 'eventos'>('feriados');

  // Feriado modal
  const [ferModalOpen, setFerModalOpen] = useState(false);
  const [ferForm, setFerForm] = useState({
    data: '',
    descricao: '',
    tipo: 'Nacional' as Feriado['tipo'],
    abrangencia: 'Todas',
    turma_id: '',
  });

  // Evento modal
  const [evModalOpen, setEvModalOpen] = useState(false);
  const [evForm, setEvForm] = useState({
    nome: '',
    data_inicio: '',
    data_fim: '',
    horario_id: '',
    descricao: '',
    abrangencia: 'Todas',
    turma_id: '',
    bloqueia_aulas: true,
  });

  async function load() {
    setLoading(true);
    const [f, e, t, h] = await Promise.all([
      supabase.from('feriados').select('*').order('data'),
      supabase.from('eventos').select('*').order('data_inicio'),
      supabase.from('turmas').select('*').order('nome'),
      supabase.from('horarios').select('*').order('ordem'),
    ]);
    setFeriados(f.data || []);
    setEventos(e.data || []);
    setTurmas(t.data || []);
    setHorarios(h.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveFeriado() {
    await supabase.from('feriados').insert({
      data: ferForm.data,
      descricao: ferForm.descricao,
      tipo: ferForm.tipo,
      abrangencia: ferForm.abrangencia,
      turma_id: ferForm.abrangencia === 'Específica' ? ferForm.turma_id : null,
    });
    setFerModalOpen(false);
    setFerForm({ data: '', descricao: '', tipo: 'Nacional', abrangencia: 'Todas', turma_id: '' });
    load();
  }

  async function removeFeriado(id: string) {
    await supabase.from('feriados').delete().eq('id', id);
    load();
  }

  async function saveEvento() {
    await supabase.from('eventos').insert({
      nome: evForm.nome,
      data_inicio: evForm.data_inicio,
      data_fim: evForm.data_fim,
      horario_id: evForm.horario_id || null,
      descricao: evForm.descricao || null,
      abrangencia: evForm.abrangencia,
      turma_id: evForm.abrangencia === 'Específica' ? evForm.turma_id : null,
      bloqueia_aulas: evForm.bloqueia_aulas,
    });
    setEvModalOpen(false);
    setEvForm({
      nome: '',
      data_inicio: '',
      data_fim: '',
      horario_id: '',
      descricao: '',
      abrangencia: 'Todas',
      turma_id: '',
      bloqueia_aulas: true,
    });
    load();
  }

  async function removeEvento(id: string) {
    await supabase.from('eventos').delete().eq('id', id);
    load();
  }

  const tipoColors: Record<string, 'amber' | 'red' | 'blue' | 'green' | 'slate'> = {
    Nacional: 'red',
    Estadual: 'amber',
    Municipal: 'amber',
    Institucional: 'blue',
    Recesso: 'slate',
    'Paralisação': 'red',
    Outro: 'slate',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Feriados e Eventos"
        description="Cadastre feriados, paralisações, recessos e eventos acadêmicos"
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setTab('feriados')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            tab === 'feriados'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarOff className="w-4 h-4 inline mr-2" />
          Feriados e Bloqueios
        </button>
        <button
          onClick={() => setTab('eventos')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            tab === 'eventos'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Megaphone className="w-4 h-4 inline mr-2" />
          Eventos Acadêmicos
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'feriados' ? (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setFerModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Novo Feriado
            </Button>
          </div>
          {feriados.length === 0 ? (
            <Card>
              <EmptyState
                icon={<CalendarOff className="w-8 h-8" />}
                title="Nenhum feriado cadastrado"
                description="Cadastre feriados nacionais, estaduais, municipais e paralisações"
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {feriados.map(f => (
                <Card key={f.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-xs text-slate-400">
                        {new Date(f.data + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                      </p>
                      <p className="text-xl font-bold text-slate-900">
                        {new Date(f.data + 'T00:00:00').getDate()}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{f.descricao}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge color={tipoColors[f.tipo]}>{f.tipo}</Badge>
                        <Badge>{f.abrangencia === 'Todas' ? 'Todas as turmas' : 'Turma específica'}</Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFeriado(f.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setEvModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Novo Evento
            </Button>
          </div>
          {eventos.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Megaphone className="w-8 h-8" />}
                title="Nenhum evento cadastrado"
                description="Cadastre semanas de provas, palestras e outros eventos acadêmicos"
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {eventos.map(ev => (
                <Card key={ev.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{ev.nome}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(ev.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')} —{' '}
                        {new Date(ev.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}
                        {ev.horario_id && (() => {
                          const h = horarios.find(ho => ho.id === ev.horario_id);
                          return h ? ` · ${h.hora_inicio}–${h.hora_fim}` : '';
                        })()}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {ev.bloqueia_aulas && <Badge color="red">Bloqueia aulas</Badge>}
                        <Badge>{ev.abrangencia === 'Todas' ? 'Todas as turmas' : 'Turma específica'}</Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeEvento(ev.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Feriado modal */}
      <Modal open={ferModalOpen} onClose={() => setFerModalOpen(false)} title="Novo Feriado / Bloqueio">
        <div className="space-y-4">
          <div>
            <Label>Data</Label>
            <Input value={ferForm.data} onChange={v => setFerForm({ ...ferForm, data: v })} type="date" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={ferForm.descricao} onChange={v => setFerForm({ ...ferForm, descricao: v })} placeholder="Ex: Independência do Brasil" />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select
              value={ferForm.tipo}
              onChange={v => setFerForm({ ...ferForm, tipo: v as Feriado['tipo'] })}
            >
              <option value="Nacional">Nacional</option>
              <option value="Estadual">Estadual</option>
              <option value="Municipal">Municipal</option>
              <option value="Institucional">Institucional</option>
              <option value="Recesso">Recesso</option>
              <option value="Paralisação">Paralisação</option>
              <option value="Outro">Outro</option>
            </Select>
          </div>
          <div>
            <Label>Abrangência</Label>
            <Select
              value={ferForm.abrangencia}
              onChange={v => setFerForm({ ...ferForm, abrangencia: v })}
            >
              <option value="Todas">Todas as turmas</option>
              <option value="Específica">Turma específica</option>
            </Select>
          </div>
          {ferForm.abrangencia === 'Específica' && (
            <div>
              <Label>Turma</Label>
              <Select value={ferForm.turma_id} onChange={v => setFerForm({ ...ferForm, turma_id: v })}>
                <option value="">Selecione...</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setFerModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveFeriado}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Evento modal */}
      <Modal open={evModalOpen} onClose={() => setEvModalOpen(false)} title="Novo Evento Acadêmico">
        <div className="space-y-4">
          <div>
            <Label>Nome do Evento</Label>
            <Input value={evForm.nome} onChange={v => setEvForm({ ...evForm, nome: v })} placeholder="Ex: Semana de Avaliações" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input value={evForm.data_inicio} onChange={v => setEvForm({ ...evForm, data_inicio: v })} type="date" />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input value={evForm.data_fim} onChange={v => setEvForm({ ...evForm, data_fim: v })} type="date" />
            </div>
          </div>
          <div>
            <Label>Horário Específico (opcional)</Label>
            <Select value={evForm.horario_id} onChange={v => setEvForm({ ...evForm, horario_id: v })}>
              <option value="">Todos os horários</option>
              {horarios.map(h => (
                <option key={h.id} value={h.id}>{h.hora_inicio}–{h.hora_fim}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Input value={evForm.descricao} onChange={v => setEvForm({ ...evForm, descricao: v })} placeholder="Descrição do evento" />
          </div>
          <div>
            <Label>Abrangência</Label>
            <Select value={evForm.abrangencia} onChange={v => setEvForm({ ...evForm, abrangencia: v })}>
              <option value="Todas">Todas as turmas</option>
              <option value="Específica">Turma específica</option>
            </Select>
          </div>
          {evForm.abrangencia === 'Específica' && (
            <div>
              <Label>Turma</Label>
              <Select value={evForm.turma_id} onChange={v => setEvForm({ ...evForm, turma_id: v })}>
                <option value="">Selecione...</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </Select>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={evForm.bloqueia_aulas}
              onChange={e => setEvForm({ ...evForm, bloqueia_aulas: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm text-slate-700">Bloquear aulas normais neste período</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEvModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveEvento}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
