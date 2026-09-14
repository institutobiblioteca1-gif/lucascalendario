import { useEffect, useState } from 'react';
import { Save, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button, Select, Label } from '@/components/ui';
import type { Configuracoes } from '@/types/database';

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Configuracoes | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('configuracoes').select('*').maybeSingle();
      setConfig(data);
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    await supabase.from('configuracoes').update({
      nome_instituicao: config.nome_instituicao,
      prioridade_otimizacao: config.prioridade_otimizacao,
      aulas_consecutivas: config.aulas_consecutivas,
      multi_turma_mesmo_dia: config.multi_turma_mesmo_dia,
    }).eq('id', config.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Configurações"
        description="Ajuste as preferências do sistema de geração automática"
      />

      <Card className="p-6 space-y-6">
        <div>
          <Label>Nome da Instituição</Label>
          <input
            type="text"
            value={config.nome_instituicao}
            onChange={e => setConfig({ ...config, nome_instituicao: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
          />
        </div>

        <div>
          <Label>Prioridade de Otimização</Label>
          <Select
            value={config.prioridade_otimizacao}
            onChange={v => setConfig({ ...config, prioridade_otimizacao: v as Configuracoes['prioridade_otimizacao'] })}
          >
            <option value="concentracao">Concentração de aulas (priorizar blocos no mesmo dia)</option>
            <option value="menor_dias">Menor número de dias presenciais</option>
            <option value="disponibilidade">Disponibilidade do professor</option>
            <option value="equilibrada">Distribuição equilibrada das disciplinas</option>
          </Select>
          <p className="text-xs text-slate-400 mt-1.5">
            Define como o algoritmo deve priorizar a distribuição das aulas.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={config.aulas_consecutivas}
              onChange={e => setConfig({ ...config, aulas_consecutivas: e.target.checked })}
              className="w-5 h-5 mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-900">Aulas consecutivas</p>
              <p className="text-xs text-slate-500">Tentar agrupar duas aulas da mesma disciplina em horários consecutivos</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={config.multi_turma_mesmo_dia}
              onChange={e => setConfig({ ...config, multi_turma_mesmo_dia: e.target.checked })}
              className="w-5 h-5 mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-900">Multi-turma no mesmo dia</p>
              <p className="text-xs text-slate-500">Aproveitar a presença do professor para atender mais de uma turma no mesmo dia</p>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
          <Button onClick={save} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">Configurações salvas!</span>
          )}
        </div>
      </Card>

      <Card className="p-6 mt-4 bg-slate-50">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-slate-700">Como funciona a otimização?</h4>
            <p className="text-xs text-slate-500 mt-1">
              O algoritmo segue restrições obrigatórias (disponibilidade do professor, sem conflitos de horário,
              respeito a feriados e eventos) e tenta otimizar as preferências acima. Quando não é possível
              encaixar uma aula, o sistema avisa qual disciplina não pôde ser alocada e o motivo.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
