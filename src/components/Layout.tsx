import { useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  GraduationCap,
  BookOpen,
  Users,
  CalendarOff,
  Sparkles,
  CalendarRange,
  Settings,
  Menu,
  X,
} from 'lucide-react';

export type PageKey =
  | 'dashboard'
  | 'periodos'
  | 'horarios'
  | 'turmas'
  | 'disciplinas'
  | 'professores'
  | 'feriados'
  | 'gerador'
  | 'calendario'
  | 'configuracoes';

type NavItem = {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
};

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Principal',
    items: [{ key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Configuração',
    items: [
      { key: 'periodos', label: 'Períodos Acadêmicos', icon: CalendarDays },
      { key: 'horarios', label: 'Horários', icon: Clock },
      { key: 'turmas', label: 'Turmas', icon: GraduationCap },
      { key: 'disciplinas', label: 'Disciplinas', icon: BookOpen },
      { key: 'professores', label: 'Professores', icon: Users },
      { key: 'feriados', label: 'Feriados e Eventos', icon: CalendarOff },
    ],
  },
  {
    title: 'Calendário',
    items: [
      { key: 'gerador', label: 'Gerador Automático', icon: Sparkles },
      { key: 'calendario', label: 'Calendário', icon: CalendarRange },
      { key: 'configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
];

export default function Layout({
  currentPage,
  onNavigate,
  children,
}: {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (page: PageKey) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - desktop */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-6 h-6 text-slate-900" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate">IFITEO</h1>
            <p className="text-xs text-slate-400 truncate">Calendário Acadêmico</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navGroups.map(group => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const active = currentPage === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleNavigate(item.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-slate-800">
          <p className="text-xs text-slate-500">
            Instituto Arquidiocesano de Filosofia e Teologia
          </p>
          <p className="text-xs text-slate-600">São João Paulo II</p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-slate-800"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="text-sm font-semibold">IFITEO</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
