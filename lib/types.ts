export type Gender = 'Femenino' | 'Masculino' | 'Otro';

export type TheoryKey = 'psychoanalytic' | 'cbt' | 'gestalt' | 'systemic';

export type Patient = {
  id: string;          // formato: #2026-NNNN
  name: string;
  age: number;
  gender: Gender;
  createdAt: number;
};

export type Conflict = {
  id: string;
  raw: string;           // texto libre del paciente
  synthesized: string;   // 2-3 palabras sintetizadas por IA
  theoryKey: TheoryKey;
  subCategory: string;   // ej: "etapa anal", "distorsion cognitiva"
};

export type Memory = {
  id: string;
  conflictId?: string;   // conflicto relacionado (opcional)
  raw: string;           // descripcion del suceso
  feelingThen: string;
  feelingNow: string;
  keywords: string[];    // extraidos por IA
  sessionNumber: number;
};

export type TheoryMatch = {
  key: TheoryKey;
  name: string;
  subCategory: string;
  confidence: number;    // 0-1
};

export type GroundingSource = {
  title: string;
  uri: string;
};

export type Interpretation = {
  text: string;
  groundingSources: GroundingSource[];
  resonatedAt?: number;  // timestamp si el paciente marco "me resuena"
};

export type Closure = {
  text: string;
  groundingSources: GroundingSource[];
};

export type UnmappedPhrase = {
  text: string;
  sessionNumber: number;
};

export type PatientSession = {
  id: string;
  patientId: string;
  sessionNumber: number;
  stage: 1 | 2 | 3 | 4 | 5;
  conflicts: Conflict[];
  theoryMatch: TheoryMatch | null;
  memories: Memory[];
  interpretation: Interpretation | null;
  closure: Closure | null;
  unmappedPhrases: UnmappedPhrase[];
  createdAt: number;
  updatedAt: number;
};

export type AppView =
  | 'WELCOME'
  | 'DASHBOARD'
  | 'INTAKE'
  | 'SESSION';
