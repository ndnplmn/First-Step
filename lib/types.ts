export type Gender = 'female' | 'male' | 'other';
export type MaritalStatus = 'single' | 'partnered' | 'married' | 'divorced' | 'widowed' | 'separated';
export type LivingSituation = 'alone' | 'with-partner' | 'with-family' | 'with-housemates' | 'with-parents' | 'other';
export type EmploymentStatus = 'employed' | 'unemployed' | 'student' | 'freelance' | 'retired' | 'other';

export type FrameworkKey =
  | 'freudiano'
  | 'bioenergetico'
  | 'adleriano'
  | 'gestalt'
  | 'conductual';

export type Stage3Type =
  | 'memories'          // freudiano
  | 'bodywork'          // bioenergetico
  | 'social_context'    // adleriano
  | 'gestalt_activity'  // gestalt
  | 'exposure';         // conductual

export type FrameworkMatch = {
  key: FrameworkKey;
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

export type WorkCard = {
  id: string;
  title: string;       // action-oriented: "Explorar por qué evitas el conflicto"
  subtitle: string;    // original reflection question shown in italics
  openingLine: string; // first therapist message when this card is selected
};

export type DeepWorkSession = {
  selectedCard: WorkCard;
  messages: { role: 'patient' | 'therapist'; text: string }[];
  synthesis: string;
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

export type ExplorationInsight = {
  theme: string;        // 2-4 word label, e.g. "Vínculo paterno ambivalente"
  observation: string;  // 1-2 sentence factual observation
};

export type ExplorationPhase =
  | 'exploring'
  | 'deepening'
  | 'pattern_linking'
  | 'challenging'
  | 'insight'
  | 'consolidating';

export type ExplorationRecord = {
  sessionNumber: number;
  framework: FrameworkKey;
  frameworkName: string;
  stage3Type: Stage3Type;
  insights: ExplorationInsight[];  // 3-5 key observations extracted by AI
  aiReflection: string;            // Warm therapist-voice paragraph shown to user
  completedAt: number;
  actionCommitment?: string;       // Patient-chosen micro-experiment for next session
};

export type PHQ9Response = {
  answers: number[];  // 9 items, 0–3 each
  score: number;      // 0–27
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately-severe' | 'severe';
  completedAt: number;
};

export type GAD7Response = {
  answers: number[];  // 7 items, 0–3 each
  score: number;      // 0–21
  severity: 'minimal' | 'mild' | 'moderate' | 'severe';
  completedAt: number;
};

export type PatientSession = {
  id: string;
  patientId: string;
  sessionNumber: number;
  stage: 1 | 2 | 3 | 4 | 5 | 6;
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  gestaltActivity: GestaltActivity | null;
  stage3Type?: Stage3Type;
  memories: Memory[];
  interpretation: Interpretation | null;
  closure: Closure | null;
  unmappedPhrases: UnmappedPhrase[];
  reflectionQuestions?: string[];
  deepWork?: DeepWorkSession;
  selectedWorkCard?: WorkCard;
  stage3Notes?: string;
  narrativeSummary?: string;
  wellbeingBefore?: number;  // 1-5 scale
  wellbeingAfter?: number;   // 1-5 scale
  lifeChanges?: LifeChanges;
  sessionIntention?: string;  // what the patient wants to work on this session
  intentionOutcome?: 'yes' | 'related' | 'no';  // did they work what they wanted? set at end of session
  commitmentFollowUp?: { status: 'yes' | 'partial' | 'no'; note?: string };
  gestaltActivityResponse?: string;
  phq9?: PHQ9Response;
  gad7?: GAD7Response;
  explorationRecord?: ExplorationRecord;
  interpretationResponse?: string;  // patient's reflection after reading the interpretation
  quickSession?: boolean;           // skips Stage 2, inherits last session's work
  resolutionAnswer?: 'much_better' | 'better' | 'still_working';  // session 5+ milestone question
  consultationAlignment?: 'yes' | 'partial' | 'no';  // sessions 3/6/9: are we still working on the original issue?
  consultationAnswer?: 'yes' | 'partial' | 'not_yet';  // session 5+: did we resolve what they came for?
  createdAt: number;
  updatedAt: number;
};

export type AppView =
  | 'AUTH'
  | 'ONBOARDING'
  | 'WELCOME'
  | 'DASHBOARD'
  | 'INTAKE'
  | 'SESSION_INTRO'
  | 'CHECK_IN'
  | 'ASSESSMENT'
  | 'SESSION'
  | 'RECORD'
  | 'DIARY'
  | 'PROGRESS'
  | 'SETTINGS';
