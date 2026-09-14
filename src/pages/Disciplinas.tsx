import { useEffect, useState } from 'react';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button, Input, Modal, EmptyState } from '@/components/ui';
import type { Disciplina } from '@/types/database';

export default function Disciplinas() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('disciplinas').select('*').order('nome');
    setDisciplinas(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!nome.trim()) return;
    await supabase.from('disciplinas').insert({ nome: nome.trim() });
    setNome('');
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Excluir esta disciplina?')) return;
    await supabase.from('disciplinas').delete().eq('id', id);
    load();
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Disciplinas"
        description="Cadastre as disciplinas disponíveis"
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Nova Disciplina
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : disciplinas.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen className="w-8 h-8" />}
            title="Nenhuma disciplina cadastrada"
            description="Cadastre as disciplinas para vinculá-las às turmas"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {disciplinas.map(d => (
            <Card key={d.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <p className="font-medium text-slate-900 text-sm">{d.nome}</p>
              </div>
              <button
                onClick={() => remove(d.id)}
                className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Disciplina">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome da Disciplina</label>
            <Input value={nome} onChange={setNome} placeholder="Ex: Antropologia Teológica" />
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
