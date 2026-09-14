export type PeriodoAcademico = {
  id: string;
  ano: number;
  semestre: number;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  created_at: string;
};

export type Horario = {
  id: string;
  ordem: number;
  periodo: 'Manhã' | 'Tarde' | 'Noite';
  hora_inicio: string;
  hora_fim: string;
  created_at: string;
};

export type Turma = {
  id: string;
  nome: string;
  curso: string;
  periodo_academico_id: string | null;
  created_at: string;
};

export type Disciplina = {
  id: string;
  nome: string;
  created_at: string;
};

export type Professor = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  created_at: string;
};

export type TurmaDisciplina = {
  id: string;
  turma_id: string;
  disciplina_id: string;
  professor_id: string;
  num_aulas: number;
  created_at: string;
};

export type ProfessorDisponibilidade = {
  id: string;
  professor_id: string;
  dia_semana: number;
  horario_id: string;
};

export type Feriado = {
  id: string;
  data: string;
  descricao: string;
  tipo: 'Nacional' | 'Estadual' | 'Municipal' | 'Institucional' | 'Recesso' | 'Paralisação' | 'Outro';
  abrangencia: string;
  turma_id: string | null;
  created_at: string;
};

export type Evento = {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  horario_id: string | null;
  descricao: string | null;
  abrangencia: string;
  turma_id: string | null;
  bloqueia_aulas: boolean;
  created_at: string;
};

export type Aula = {
  id: string;
  data: string;
  horario_id: string;
  turma_id: string;
  disciplina_id: string;
  professor_id: string;
  turma_disciplina_id: string;
  created_at: string;
};

export type Configuracoes = {
  id: string;
  nome_instituicao: string;
  prioridade_otimizacao: 'concentracao' | 'menor_dias' | 'disponibilidade' | 'equilibrada';
  aulas_consecutivas: boolean;
  multi_turma_mesmo_dia: boolean;
  created_at: string;
};

export type AulaWithRelations = Aula & {
  horario?: Horario;
  turma?: Turma;
  disciplina?: Disciplina;
  professor?: Professor;
};

export type TurmaDisciplinaWithRelations = TurmaDisciplina & {
  disciplina?: Disciplina;
  professor?: Professor;
  turma?: Turma;
};
