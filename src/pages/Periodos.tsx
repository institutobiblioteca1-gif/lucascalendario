import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
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
import type { PeriodoAcademico } from '@/types/database';

export default function Periodos() {
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PeriodoAcademico | null>(null);
  const [form, setForm] = useState({
    ano: String(new Date().getFullYear()),
    semestre: '1',
    data_inicio: '',
    data_fim: '',
  });

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('periodos_academicos')
      .select('*')
      .order('ano', { ascending: false })
      .order('semestre', { ascending: false });
    setPeriodos(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setForm({
      ano: String(new Date().getFullYear()),
      semestre: '1',
      data_inicio: '',
      data_fim: '',
    });
    setModalOpen(true);
  }

  function openEdit(p: PeriodoAcademico) {
    setEditing(p);
    setForm({
      ano: String(p.ano),
      semestre: String(p.semestre),
      data_inicio: p.data_inicio,
      data_fim: p.data_fim,
    });
    setModalOpen(true);
  }

  async function save() {
    const payload = {
      ano: Number(form.ano),
      semestre: Number(form.semestre),
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
    };
    if (editing) {
      await supabase.from('periodos_academicos').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('periodos_academicos').insert(payload);
    }
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Excluir este período acadêmico? Turmas vinculadas também serão removidas.')) return;
    await supabase.from('periodos_academicos').delete().eq('id', id);
    load();
  }

  async function toggleAtivo(p: PeriodoAcademico) {
    await supabase
      .from('periodos_academicos')
      .update({ ativo: !p.ativo })
      .eq('id', p.id);
    load();
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Períodos Acadêmicos"
        description="Cadastre os períodos letivos do ano"
        action={
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" />
            Novo Período
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : periodos.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarDays className="w-8 h-8" />}
            title="Nenhum período cadastrado"
            description="Crie um período acadêmico para começar a montar o calendário"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {periodos.map(p => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <CalendarDays className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {p.ano} · {p.semestre}º Semestre
                    </h3>
                    <button onClick={() => toggleAtivo(p)}>
                      <Badge color={p.ativo ? 'green' : 'slate'}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <p>
                  <span className="font-medium">Início:</span>{' '}
                  {new Date(p.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
                <p>
                  <span className="font-medium">Fim:</span>{' '}
                  {new Date(p.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Período' : 'Novo Período Acadêmico'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ano</Label>
              <Input value={form.ano} onChange={v => setForm({ ...form, ano: v })} type="number" />
            </div>
            <div>
              <Label>Semestre</Label>
              <Select value={form.semestre} onChange={v => setForm({ ...form, semestre: v })}>
                <option value="1">1º Semestre</option>
                <option value="2">2º Semestre</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Data de Início</Label>
            <Input value={form.data_inicio} onChange={v => setForm({ ...form, data_inicio: v })} type="date" />
          </div>
          <div>
            <Label>Data de Fim</Label>
            <Input value={form.data_fim} onChange={v => setForm({ ...form, data_fim: v })} type="date" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
