export type Gender = 'Femenino' | 'Masculino' | 'Otro';

export type MaritalStatus = 'Soltero/a' | 'En pareja' | 'Casado/a' | 'Divorciado/a' | 'Viudo/a' | 'Separado/a';
export type LivingSituation = 'Solo/a' | 'Con pareja' | 'Con familia' | 'Con compañeros' | 'Con padres' | 'Otro';
export type EmploymentStatus = 'Empleado/a' | 'Desempleado/a' | 'Estudiante' | 'Independiente' | 'Jubilado/a' | 'Otro';

export type FrameworkKey =
  | 'tcc'
  | 'tg3'
  | 'dbt'
  | 'apego_trauma'
  | 'psicodinamico'
  | 'integrativo'
  | 'gestalt';

export type FrameworkRole = 'primary' | 'secondary' | 'gestalt';

export type FrameworkMatch = {
  key: FrameworkKey;
  role: FrameworkRole;
  name: string;
  focus: string;
  confidence: number;
};

export type GestaltActivityType = 'silla_vacia' | 'polaridades' | 'awareness_corporal' | 'experimento' | 'dialogo_interno';

export type GestaltActivity = {
  type: GestaltActivityType;
  title: string;
  description: string;
  prompt: string;
};

export type Patient = {
  id: string;          // formato: #2026-NNNN
  name: string;
  age: number;
  gender: Gender;
  maritalStatus: MaritalStatus;
  hasChildren: boolean;
  childrenCount?: number;
  livingSituation: LivingSituation;
  livingSituationDetail?: string;
  employment: EmploymentStatus;
  occupation?: string;
  hasSupportNetwork: boolean;
  supportDescription?: string;
  previousTherapy: boolean;
  previousTherapyDetail?: string;
  takingMedication: boolean;
  medicationDetail?: string;
  consultationReason: string;
  createdAt: number;
};

export type Conflict = {
  id: string;
  raw: string;           // texto libre del paciente
  synthesized: string;   // 2-3 palabras sintetizadas por IA
  frameworkKey: FrameworkKey;
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

export type GroundingSource = {
  title: string;
  uri: string;
};

export type Interpretation = {
  text: string;
  groundingSources: GroundingSource[];
  resonatedAt?: number;  // timestamp si el paciente marco "me resuena"
};

export type Strategy = {
  title: string;
  description: string;
};

export type Closure = {
  text: string;
  groundingSources: GroundingSource[];
  strategies?: Strategy[];
};

export type UnmappedPhrase = {
  text: string;
  sessionNumber: number;
};

export type DiaryEmotion =
  | 'Alegría' | 'Tristeza' | 'Ansiedad' | 'Calma'
  | 'Enojo' | 'Miedo' | 'Esperanza' | 'Frustración'
  | 'Gratitud' | 'Soledad' | 'Confusión' | 'Alivio';

export type DiaryEntry = {
  id: string;
  patientId: string;
  emotion: DiaryEmotion;
  intensity: number;        // 1-5
  triggers?: string;
  copingUsed?: string;
  note?: string;
  createdAt: number;
};

export type LifeChanges = {
  categories: string[];
  detail?: string;
};

export type PatientSession = {
  id: string;
  patientId: string;
  sessionNumber: number;
  stage: 1 | 2 | 3 | 4 | 5;
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  gestaltActivity: GestaltActivity | null;
  memories: Memory[];
  interpretation: Interpretation | null;
  closure: Closure | null;
  unmappedPhrases: UnmappedPhrase[];
  reflectionQuestions?: string[];
  narrativeSummary?: string;
  wellbeingBefore?: number;  // 1-5 scale
  wellbeingAfter?: number;   // 1-5 scale
  lifeChanges?: LifeChanges;
  createdAt: number;
  updatedAt: number;
};

export type AppView =
  | 'WELCOME'
  | 'DASHBOARD'
  | 'INTAKE'
  | 'CHECK_IN'
  | 'SESSION'
  | 'RECORD'
  | 'DIARY'
  | 'PROGRESS';
