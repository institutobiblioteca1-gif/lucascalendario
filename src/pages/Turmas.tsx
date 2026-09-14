import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, GraduationCap, BookPlus, X } from 'lucide-react';
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
import type { Turma, PeriodoAcademico, Disciplina, Professor, TurmaDisciplinaWithRelations } from '@/types/database';

export default function Turmas() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Turma | null>(null);
  const [form, setForm] = useState({ nome: '', curso: '', periodo_academico_id: '' });

  // Disciplinas modal
  const [discModalOpen, setDiscModalOpen] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [turmaDisciplinas, setTurmaDisciplinas] = useState<TurmaDisciplinaWithRelations[]>([]);
  const [allDisciplinas, setAllDisciplinas] = useState<Disciplina[]>([]);
  const [allProfessores, setAllProfessores] = useState<Professor[]>([]);
  const [discForm, setDiscForm] = useState({ disciplina_id: '', professor_id: '', num_aulas: '2' });

  async function load() {
    setLoading(true);
    const [t, p] = await Promise.all([
      supabase.from('turmas').select('*').order('nome'),
      supabase.from('periodos_academicos').select('*').order('ano', { ascending: false }),
    ]);
    setTurmas(t.data || []);
    setPeriodos(p.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function loadDisciplinasForTurma(turmaId: string) {
    const { data } = await supabase
      .from('turma_disciplinas')
      .select('*, disciplina:disciplinas(*), professor:professores(*)')
      .eq('turma_id', turmaId);
    setTurmaDisciplinas(data || []);
  }

  async function loadDisciplinasEProfessores() {
    const [d, profs] = await Promise.all([
      supabase.from('disciplinas').select('*').order('nome'),
      supabase.from('professores').select('*').order('nome'),
    ]);
    setAllDisciplinas(d.data || []);
    setAllProfessores(profs.data || []);
  }

  function openNew() {
    setEditing(null);
    setForm({ nome: '', curso: '', periodo_academico_id: '' });
    setModalOpen(true);
  }

  function openEdit(t: Turma) {
    setEditing(t);
    setForm({
      nome: t.nome,
      curso: t.curso,
      periodo_academico_id: t.periodo_academico_id || '',
    });
    setModalOpen(true);
  }

  async function save() {
    const payload = {
      nome: form.nome,
      curso: form.curso,
      periodo_academico_id: form.periodo_academico_id || null,
    };
    if (editing) {
      await supabase.from('turmas').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('turmas').insert(payload);
    }
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Excluir esta turma? Todas as disciplinas e aulas vinculadas serão removidas.')) return;
    await supabase.from('turmas').delete().eq('id', id);
    load();
  }

  function openDisciplinas(t: Turma) {
    setSelectedTurma(t);
    setDiscModalOpen(true);
    setDiscForm({ disciplina_id: '', professor_id: '', num_aulas: '2' });
    loadDisciplinasForTurma(t.id);
    loadDisciplinasEProfessores();
  }

  async function addDisciplina() {
    if (!selectedTurma || !discForm.disciplina_id || !discForm.professor_id) return;
    await supabase.from('turma_disciplinas').insert({
      turma_id: selectedTurma.id,
      disciplina_id: discForm.disciplina_id,
      professor_id: discForm.professor_id,
      num_aulas: Number(discForm.num_aulas),
    });
    setDiscForm({ disciplina_id: '', professor_id: '', num_aulas: '2' });
    loadDisciplinasForTurma(selectedTurma.id);
  }

  async function removeDisciplina(tdId: string) {
    if (!confirm('Remover esta disciplina da turma?')) return;
    await supabase.from('turma_disciplinas').delete().eq('id', tdId);
    if (selectedTurma) loadDisciplinasForTurma(selectedTurma.id);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Turmas"
        description="Cadastre as turmas e vincule disciplinas e professores"
        action={
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" />
            Nova Turma
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : turmas.length === 0 ? (
        <Card>
          <EmptyState
            icon={<GraduationCap className="w-8 h-8" />}
            title="Nenhuma turma cadastrada"
            description="Cadastre turmas para vincular disciplinas e gerar o calendário"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {turmas.map(t => {
            const periodo = periodos.find(p => p.id === t.periodo_academico_id);
            return (
              <Card key={t.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{t.nome}</h3>
                      <p className="text-sm text-slate-500">{t.curso}</p>
                    </div>
                  </div>
                </div>
                {periodo && (
                  <Badge color="amber">
                    {periodo.ano} · {periodo.semestre}º Sem
                  </Badge>
                )}
                <div className="flex gap-2 mt-4">
                  <Button variant="secondary" size="sm" onClick={() => openDisciplinas(t)}>
                    <BookPlus className="w-3.5 h-3.5" />
                    Disciplinas
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(t.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Turma modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Turma' : 'Nova Turma'}>
        <div className="space-y-4">
          <div>
            <Label>Nome da Turma</Label>
            <Input value={form.nome} onChange={v => setForm({ ...form, nome: v })} placeholder="Ex: Ano A" />
          </div>
          <div>
            <Label>Curso</Label>
            <Input value={form.curso} onChange={v => setForm({ ...form, curso: v })} placeholder="Ex: Teologia" />
          </div>
          <div>
            <Label>Período Acadêmico</Label>
            <Select value={form.periodo_academico_id} onChange={v => setForm({ ...form, periodo_academico_id: v })}>
              <option value="">Selecione...</option>
              {periodos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.ano} · {p.semestre}º Semestre
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Disciplinas modal */}
      <Modal
        open={discModalOpen}
        onClose={() => setDiscModalOpen(false)}
        title={`Disciplinas — ${selectedTurma?.nome || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Add disciplina form */}
          <Card className="p-4 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Disciplina</Label>
                <Select value={discForm.disciplina_id} onChange={v => setDiscForm({ ...discForm, disciplina_id: v })}>
                  <option value="">Selecione...</option>
                  {allDisciplinas.map(d => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Professor</Label>
                <Select value={discForm.professor_id} onChange={v => setDiscForm({ ...discForm, professor_id: v })}>
                  <option value="">Selecione...</option>
                  {allProfessores.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Nº de Aulas</Label>
                <div className="flex gap-2">
                  <Input value={discForm.num_aulas} onChange={v => setDiscForm({ ...discForm, num_aulas: v })} type="number" />
                  <Button onClick={addDisciplina} className="flex-shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* List of turma_disciplinas */}
          {turmaDisciplinas.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">Nenhuma disciplina vinculada a esta turma</p>
          ) : (
            <div className="space-y-2">
              {turmaDisciplinas.map(td => (
                <div key={td.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{td.disciplina?.nome}</p>
                      <p className="text-xs text-slate-500">Prof. {td.professor?.nome} · {td.num_aulas} aulas</p>
                    </div>
                  </div>
                  <button onClick={() => removeDisciplina(td.id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
