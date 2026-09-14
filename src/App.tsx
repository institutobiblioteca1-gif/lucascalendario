import { useState } from 'react';
import Layout, { type PageKey } from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Periodos from '@/pages/Periodos';
import Horarios from '@/pages/Horarios';
import Turmas from '@/pages/Turmas';
import Disciplinas from '@/pages/Disciplinas';
import Professores from '@/pages/Professores';
import FeriadosEventos from '@/pages/FeriadosEventos';
import Gerador from '@/pages/Gerador';
import Calendario from '@/pages/Calendario';
import ConfiguracoesPage from '@/pages/Configuracoes';

function App() {
  const [page, setPage] = useState<PageKey>('dashboard');

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
      {page === 'periodos' && <Periodos />}
      {page === 'horarios' && <Horarios />}
      {page === 'turmas' && <Turmas />}
      {page === 'disciplinas' && <Disciplinas />}
      {page === 'professores' && <Professores />}
      {page === 'feriados' && <FeriadosEventos />}
      {page === 'gerador' && <Gerador />}
      {page === 'calendario' && <Calendario />}
      {page === 'configuracoes' && <ConfiguracoesPage />}
    </Layout>
  );
}

export default App;
