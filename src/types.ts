export type Patient = {
  id: string;
  name: string;
  age: number;
  gender: 'Femenino' | 'Masculino' | 'Otro';
  createdAt: number;
};

export type Memory = {
  description: string;
  feelingThen: string;
  feelingNow: string;
};

export type ExtractedData = {
  isValid: boolean;
  feedback?: string;
  conflicts: string[];
  theory: string;
  memories: Memory[];
  unmappedPhrases: string[];
};

export type GroundingUrl = {
  title: string;
  uri: string;
};

export type ClinicalInsight = {
  interpretation: string;
  closure: string;
  groundingUrls: GroundingUrl[];
};

export type Session = {
  id: string;
  patientId: string;
  date: number;
  narrative: string;
  extractedData: ExtractedData | null;
  insight: ClinicalInsight | null;
};

export type AppState = 
  | 'DASHBOARD'
  | 'NEW_PATIENT'
  | 'PATIENT_HISTORY'
  | 'WRITING' 
  | 'EXTRACTING' 
  | 'STRUCTURED' 
  | 'GENERATING_INSIGHT' 
  | 'INSIGHT_READY'
  | 'REFINING_INSIGHT';
