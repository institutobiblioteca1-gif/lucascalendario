import { useEffect, useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Users,
  CalendarRange,
  Sparkles,
  Clock,
  CalendarOff,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, StatCard, Button, PageHeader } from '@/components/ui';
import type { PageKey } from '@/components/Layout';

export default function Dashboard({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const [stats, setStats] = useState({
    turmas: 0,
    disciplinas: 0,
    professores: 0,
    aulas: 0,
    periodos: 0,
    horarios: 0,
    feriados: 0,
    eventos: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const [turmas, disciplinas, professores, aulas, periodos, horarios, feriados, eventos] =
        await Promise.all([
          supabase.from('turmas').select('*', { count: 'exact', head: true }),
          supabase.from('disciplinas').select('*', { count: 'exact', head: true }),
          supabase.from('professores').select('*', { count: 'exact', head: true }),
          supabase.from('aulas').select('*', { count: 'exact', head: true }),
          supabase.from('periodos_academicos').select('*', { count: 'exact', head: true }),
          supabase.from('horarios').select('*', { count: 'exact', head: true }),
          supabase.from('feriados').select('*', { count: 'exact', head: true }),
          supabase.from('eventos').select('*', { count: 'exact', head: true }),
        ]);

      setStats({
        turmas: turmas.count || 0,
        disciplinas: disciplinas.count || 0,
        professores: professores.count || 0,
        aulas: aulas.count || 0,
        periodos: periodos.count || 0,
        horarios: horarios.count || 0,
        feriados: feriados.count || 0,
        eventos: eventos.count || 0,
      });
      setLoading(false);
    }
    loadStats();
  }, []);

  const steps = [
    { num: 1, label: 'Cadastrar Período Acadêmico', page: 'periodos' as PageKey, icon: CalendarRange, done: stats.periodos > 0 },
    { num: 2, label: 'Configurar Horários', page: 'horarios' as PageKey, icon: Clock, done: stats.horarios > 0 },
    { num: 3, label: 'Cadastrar Turmas', page: 'turmas' as PageKey, icon: GraduationCap, done: stats.turmas > 0 },
    { num: 4, label: 'Cadastrar Disciplinas', page: 'disciplinas' as PageKey, icon: BookOpen, done: stats.disciplinas > 0 },
    { num: 5, label: 'Cadastrar Professores e Disponibilidade', page: 'professores' as PageKey, icon: Users, done: stats.professores > 0 },
    { num: 6, label: 'Cadastrar Feriados e Eventos', page: 'feriados' as PageKey, icon: CalendarOff, done: stats.feriados > 0 || stats.eventos > 0 },
    { num: 7, label: 'Gerar Calendário Automaticamente', page: 'gerador' as PageKey, icon: Sparkles, done: stats.aulas > 0 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        description="Visão geral do sistema de geração automática de calendário acadêmico"
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Turmas" value={stats.turmas} icon={<GraduationCap className="w-6 h-6" />} color="amber" />
            <StatCard label="Disciplinas" value={stats.disciplinas} icon={<BookOpen className="w-6 h-6" />} color="blue" />
            <StatCard label="Professores" value={stats.professores} icon={<Users className="w-6 h-6" />} color="green" />
            <StatCard label="Aulas Geradas" value={stats.aulas} icon={<CalendarRange className="w-6 h-6" />} color="slate" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Passo a Passo
              </h3>
              <div className="space-y-3">
                {steps.map(step => {
                  const Icon = step.icon;
                  return (
                    <button
                      key={step.num}
                      onClick={() => onNavigate(step.page)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                        step.done
                          ? 'border-green-200 bg-green-50'
                          : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          step.done
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {step.done ? '✓' : step.num}
                      </div>
                      <Icon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-700">{step.label}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Resumo Rápido</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Períodos Acadêmicos</span>
                  <span className="text-lg font-bold text-slate-900">{stats.periodos}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Horários Configurados</span>
                  <span className="text-lg font-bold text-slate-900">{stats.horarios}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Feriados Cadastrados</span>
                  <span className="text-lg font-bold text-slate-900">{stats.feriados}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Eventos Acadêmicos</span>
                  <span className="text-lg font-bold text-slate-900">{stats.eventos}</span>
                </div>
                <div className="pt-3">
                  <Button onClick={() => onNavigate('gerador')} className="w-full" size="lg">
                    <Sparkles className="w-5 h-5" />
                    Gerar Calendário
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
