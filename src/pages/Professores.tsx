import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Calendar, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Label,
  Modal,
  EmptyState,
  Badge,
} from '@/components/ui';
import type { Professor, Horario, ProfessorDisponibilidade } from '@/types/database';
import { DIAS_SEMANA_NOMES } from '@/lib/scheduler';

const DIAS_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Professores() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Professor | null>(null);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '' });

  // Availability modal
  const [dispModalOpen, setDispModalOpen] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [disponibilidade, setDisponibilidade] = useState<Set<string>>(new Set());
  const [dispLoading, setDispLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('professores').select('*').order('nome');
    setProfessores(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setForm({ nome: '', email: '', telefone: '' });
    setModalOpen(true);
  }

  function openEdit(p: Professor) {
    setEditing(p);
    setForm({ nome: p.nome, email: p.email || '', telefone: p.telefone || '' });
    setModalOpen(true);
  }

  async function save() {
    const payload = { nome: form.nome, email: form.email || null, telefone: form.telefone || null };
    if (editing) {
      await supabase.from('professores').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('professores').insert(payload);
    }
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Excluir este professor?')) return;
    await supabase.from('professores').delete().eq('id', id);
    load();
  }

  async function openDisponibilidade(p: Professor) {
    setSelectedProfessor(p);
    setDispModalOpen(true);
    setDispLoading(true);
    const [h, d] = await Promise.all([
      supabase.from('horarios').select('*').order('ordem'),
      supabase.from('professor_disponibilidade').select('*').eq('professor_id', p.id),
    ]);
    setHorarios(h.data || []);
    const set = new Set<string>();
    (d.data || []).forEach(item => {
      set.add(`${item.dia_semana}|${item.horario_id}`);
    });
    setDisponibilidade(set);
    setDispLoading(false);
  }

  function toggleSlot(dia: number, horarioId: string) {
    const key = `${dia}|${horarioId}`;
    const next = new Set(disponibilidade);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setDisponibilidade(next);
  }

  async function saveDisponibilidade() {
    if (!selectedProfessor) return;
    setDispLoading(true);
    // Delete all existing
    await supabase
      .from('professor_disponibilidade')
      .delete()
      .eq('professor_id', selectedProfessor.id);

    // Insert new ones
    const rows: Omit<ProfessorDisponibilidade, 'id'>[] = [];
    disponibilidade.forEach(key => {
      const [dia, horarioId] = key.split('|');
      rows.push({
        professor_id: selectedProfessor.id,
        dia_semana: Number(dia),
        horario_id: horarioId,
      });
    });

    if (rows.length > 0) {
      await supabase.from('professor_disponibilidade').insert(rows);
    }

    setDispLoading(false);
    setDispModalOpen(false);
  }

  function toggleAllForDay(dia: number) {
    const allChecked = horarios.every(h => disponibilidade.has(`${dia}|${h.id}`));
    const next = new Set(disponibilidade);
    horarios.forEach(h => {
      const key = `${dia}|${h.id}`;
      if (allChecked) {
        next.delete(key);
      } else {
        next.add(key);
      }
    });
    setDisponibilidade(next);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Professores"
        description="Cadastre os professores e sua disponibilidade"
        action={
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" />
            Novo Professor
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : professores.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="Nenhum professor cadastrado"
            description="Cadastre professores e informe os dias e horários disponíveis"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {professores.map(p => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{p.nome}</h3>
                    {p.email && <p className="text-xs text-slate-500">{p.email}</p>}
                  </div>
                </div>
              </div>
              {p.telefone && (
                <p className="text-xs text-slate-500 mb-3">Tel: {p.telefone}</p>
              )}
              <div className="flex gap-2 mt-3 flex-wrap">
                <Button variant="secondary" size="sm" onClick={() => openDisponibilidade(p)}>
                  <Calendar className="w-3.5 h-3.5" />
                  Disponibilidade
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Professor modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Professor' : 'Novo Professor'}>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={form.nome} onChange={v => setForm({ ...form, nome: v })} placeholder="Ex: Marcos Rogério" />
          </div>
          <div>
            <Label>E-mail (opcional)</Label>
            <Input value={form.email} onChange={v => setForm({ ...form, email: v })} type="email" placeholder="email@exemplo.com" />
          </div>
          <div>
            <Label>Telefone (opcional)</Label>
            <Input value={form.telefone} onChange={v => setForm({ ...form, telefone: v })} placeholder="(00) 00000-0000" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Disponibilidade modal */}
      <Modal
        open={dispModalOpen}
        onClose={() => setDispModalOpen(false)}
        title={`Disponibilidade — ${selectedProfessor?.nome || ''}`}
        size="xl"
      >
        {dispLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Marque os dias e horários em que o professor está disponível para dar aula.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-xs font-semibold text-slate-500 p-2 text-left">Dia</th>
                    {horarios.map(h => (
                      <th key={h.id} className="text-xs font-semibold text-slate-500 p-2 text-center">
                        {h.hora_inicio}–{h.hora_fim}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6].map(dia => (
                    <tr key={dia} className="border-t border-slate-100">
                      <td className="p-2">
                        <button
                          onClick={() => toggleAllForDay(dia)}
                          className="text-sm font-medium text-slate-700 hover:text-amber-600 transition-colors"
                        >
                          {DIAS_SEMANA_NOMES[dia]}
                        </button>
                      </td>
                      {horarios.map(h => {
                        const key = `${dia}|${h.id}`;
                        const checked = disponibilidade.has(key);
                        return (
                          <td key={h.id} className="p-2 text-center">
                            <button
                              onClick={() => toggleSlot(dia, h.id)}
                              className={`w-8 h-8 rounded-lg transition-all ${
                                checked
                                  ? 'bg-green-500 text-white'
                                  : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {checked ? <Check className="w-4 h-4 mx-auto" /> : <X className="w-4 h-4 mx-auto" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDispModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveDisponibilidade}>Salvar Disponibilidade</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
