import { useEffect, useState } from 'react';
import { Plus, Trash2, Clock, Sun, Sunset } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button, Input, Select, Label, Modal, EmptyState } from '@/components/ui';
import type { Horario } from '@/types/database';

export default function Horarios() {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    ordem: '1',
    periodo: 'Manhã' as 'Manhã' | 'Tarde' | 'Noite',
    hora_inicio: '',
    hora_fim: '',
  });

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('horarios').select('*').order('ordem');
    setHorarios(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    await supabase.from('horarios').insert({
      ordem: Number(form.ordem),
      periodo: form.periodo,
      hora_inicio: form.hora_inicio,
      hora_fim: form.hora_fim,
    });
    setModalOpen(false);
    setForm({ ordem: '1', periodo: 'Manhã', hora_inicio: '', hora_fim: '' });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Excluir este horário?')) return;
    await supabase.from('horarios').delete().eq('id', id);
    load();
  }

  const grouped = {
    Manhã: horarios.filter(h => h.periodo === 'Manhã'),
    Tarde: horarios.filter(h => h.periodo === 'Tarde'),
    Noite: horarios.filter(h => h.periodo === 'Noite'),
  };

  const periodIcons: Record<string, typeof Sun> = {
    Manhã: Sun,
    Tarde: Sunset,
    Noite: Clock,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Horários"
        description="Configure os períodos de aula disponíveis no dia"
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Novo Horário
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : horarios.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Clock className="w-8 h-8" />}
            title="Nenhum horário cadastrado"
            description="Cadastre os horários das aulas (ex: 08h00-09h40, 10h00-11h40)"
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {(['Manhã', 'Tarde', 'Noite'] as const).map(periodo => {
            const items = grouped[periodo];
            if (items.length === 0) return null;
            const Icon = periodIcons[periodo];
            return (
              <div key={periodo}>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {periodo}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {items.map(h => (
                    <Card key={h.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                          {h.ordem}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {h.hora_inicio} – {h.hora_fim}
                          </p>
                          <p className="text-xs text-slate-400">{h.ordem}º horário</p>
                        </div>
                      </div>
                      <button
                        onClick={() => remove(h.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Horário">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ordem</Label>
              <Input value={form.ordem} onChange={v => setForm({ ...form, ordem: v })} type="number" />
            </div>
            <div>
              <Label>Período</Label>
              <Select
                value={form.periodo}
                onChange={v => setForm({ ...form, periodo: v as 'Manhã' | 'Tarde' | 'Noite' })}
              >
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Hora Início (ex: 08h00)</Label>
              <Input value={form.hora_inicio} onChange={v => setForm({ ...form, hora_inicio: v })} placeholder="08h00" />
            </div>
            <div>
              <Label>Hora Fim (ex: 09h40)</Label>
              <Input value={form.hora_fim} onChange={v => setForm({ ...form, hora_fim: v })} placeholder="09h40" />
            </div>
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
