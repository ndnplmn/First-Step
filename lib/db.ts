import { createClient } from './supabase';
import type { Patient, PatientSession, DiaryEntry } from './types';

const GENDER_MAP: Record<string, Patient['gender']> = {
  'Femenino': 'female', 'Masculino': 'male', 'Otro': 'other',
  'female': 'female', 'male': 'male', 'other': 'other',
};
const MARITAL_MAP: Record<string, Patient['maritalStatus']> = {
  'Soltero/a': 'single', 'En pareja': 'partnered', 'Casado/a': 'married',
  'Divorciado/a': 'divorced', 'Viudo/a': 'widowed', 'Separado/a': 'separated',
  'single': 'single', 'partnered': 'partnered', 'married': 'married',
  'divorced': 'divorced', 'widowed': 'widowed', 'separated': 'separated',
};
const LIVING_MAP: Record<string, Patient['livingSituation']> = {
  'Solo/a': 'alone', 'Con pareja': 'with-partner', 'Con familia': 'with-family',
  'Con compañeros': 'with-housemates', 'Con padres': 'with-parents', 'Otro': 'other',
  'alone': 'alone', 'with-partner': 'with-partner', 'with-family': 'with-family',
  'with-housemates': 'with-housemates', 'with-parents': 'with-parents', 'other': 'other',
};
const EMPLOYMENT_MAP: Record<string, Patient['employment']> = {
  'Empleado/a': 'employed', 'Desempleado/a': 'unemployed', 'Estudiante': 'student',
  'Independiente': 'freelance', 'Jubilado/a': 'retired', 'Otro': 'other',
  'employed': 'employed', 'unemployed': 'unemployed', 'student': 'student',
  'freelance': 'freelance', 'retired': 'retired', 'other': 'other',
};

function rowToPatient(row: Record<string, unknown>, userId: string): Patient {
  return {
    id: userId,
    name: row.name as string,
    age: row.age as number,
    gender: GENDER_MAP[row.gender as string] ?? (row.gender as Patient['gender']),
    maritalStatus: MARITAL_MAP[row.marital_status as string] ?? (row.marital_status as Patient['maritalStatus']),
    hasChildren: row.has_children as boolean,
    childrenCount: row.children_count as number | undefined,
    livingSituation: LIVING_MAP[row.living_situation as string] ?? (row.living_situation as Patient['livingSituation']),
    livingSituationDetail: row.living_situation_detail as string | undefined,
    employment: EMPLOYMENT_MAP[row.employment as string] ?? (row.employment as Patient['employment']),
    occupation: row.occupation as string | undefined,
    hasSupportNetwork: row.has_support_network as boolean,
    supportDescription: row.support_description as string | undefined,
    previousTherapy: row.previous_therapy as boolean,
    previousTherapyDetail: row.previous_therapy_detail as string | undefined,
    takingMedication: row.taking_medication as boolean,
    medicationDetail: row.medication_detail as string | undefined,
    consultationReason: row.consultation_reason as string,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

function patientToRow(patient: Patient) {
  return {
    id: patient.id,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    marital_status: patient.maritalStatus,
    has_children: patient.hasChildren,
    children_count: patient.childrenCount,
    living_situation: patient.livingSituation,
    living_situation_detail: patient.livingSituationDetail,
    employment: patient.employment,
    occupation: patient.occupation,
    has_support_network: patient.hasSupportNetwork,
    support_description: patient.supportDescription,
    previous_therapy: patient.previousTherapy,
    previous_therapy_detail: patient.previousTherapyDetail,
    taking_medication: patient.takingMedication,
    medication_detail: patient.medicationDetail,
    consultation_reason: patient.consultationReason,
  };
}

function rowToSession(row: Record<string, unknown>): PatientSession {
  return {
    id: row.id as string,
    patientId: row.user_id as string,
    sessionNumber: row.session_number as number,
    stage: row.stage as PatientSession['stage'],
    conflicts: (row.conflicts as PatientSession['conflicts']) ?? [],
    frameworkMatches: (row.framework_matches as PatientSession['frameworkMatches']) ?? [],
    gestaltActivity: row.gestalt_activity as PatientSession['gestaltActivity'],
    stage3Type: row.stage3_type as PatientSession['stage3Type'],
    memories: (row.memories as PatientSession['memories']) ?? [],
    interpretation: row.interpretation as PatientSession['interpretation'],
    closure: row.closure as PatientSession['closure'],
    unmappedPhrases: (row.unmapped_phrases as PatientSession['unmappedPhrases']) ?? [],
    reflectionQuestions: (row.reflection_questions as string[]) ?? [],
    stage3Notes: row.stage3_notes as string | undefined,
    narrativeSummary: row.narrative_summary as string | undefined,
    wellbeingBefore: row.wellbeing_before as number | undefined,
    wellbeingAfter: row.wellbeing_after as number | undefined,
    lifeChanges: row.life_changes as PatientSession['lifeChanges'],
    sessionIntention: row.session_intention as string | undefined,
    phq9: row.phq9 as PatientSession['phq9'],
    gad7: row.gad7 as PatientSession['gad7'],
    explorationRecord: row.exploration_record as PatientSession['explorationRecord'],
    selectedWorkCard: row.selected_work_card as PatientSession['selectedWorkCard'],
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

export const db = {
  async getProfile(): Promise<Patient | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!data) return null;
    return rowToPatient(data as Record<string, unknown>, user.id);
  },

  async saveProfile(patient: Patient): Promise<void> {
    const supabase = createClient();
    const row = patientToRow(patient);
    await supabase.from('profiles').upsert(row);
  },

  async isOnboardingCompleted(): Promise<boolean> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();
    return (data as Record<string, unknown> | null)?.onboarding_completed as boolean ?? false;
  },

  async markOnboardingCompleted(): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').upsert({ id: user.id, onboarding_completed: true });
  },

  async getSessions(): Promise<PatientSession[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return ((data ?? []) as Record<string, unknown>[]).map(r => rowToSession(r));
  },

  async saveSession(session: PatientSession): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('sessions').upsert({
      id: session.id,
      user_id: user.id,
      session_number: session.sessionNumber,
      stage: session.stage,
      conflicts: session.conflicts,
      framework_matches: session.frameworkMatches,
      gestalt_activity: session.gestaltActivity,
      stage3_type: session.stage3Type,
      memories: session.memories,
      interpretation: session.interpretation,
      closure: session.closure,
      unmapped_phrases: session.unmappedPhrases,
      reflection_questions: session.reflectionQuestions ?? [],
      stage3_notes: session.stage3Notes,
      narrative_summary: session.narrativeSummary,
      wellbeing_before: session.wellbeingBefore,
      wellbeing_after: session.wellbeingAfter,
      life_changes: session.lifeChanges,
      session_intention: session.sessionIntention,
      phq9: session.phq9 ?? null,
      gad7: session.gad7 ?? null,
      exploration_record: session.explorationRecord ?? null,
      selected_work_card: session.selectedWorkCard ?? null,
      updated_at: new Date().toISOString(),
    });
  },

  async deleteSession(sessionId: string): Promise<void> {
    const supabase = createClient();
    await supabase.from('sessions').delete().eq('id', sessionId);
  },

  async getActiveSession(): Promise<PatientSession | null> {
    const sessions = await this.getSessions();
    return sessions.find(s => s.stage < 6) ?? null;
  },

  async getDiaryEntries(): Promise<DiaryEntry[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return ((data ?? []) as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      patientId: r.user_id as string,
      emotion: r.emotion as DiaryEntry['emotion'],
      intensity: r.intensity as number,
      triggers: r.triggers as string | undefined,
      copingUsed: r.coping_used as string | undefined,
      note: r.note as string | undefined,
      createdAt: new Date(r.created_at as string).getTime(),
    }));
  },

  async saveDiaryEntry(entry: DiaryEntry): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('diary_entries').upsert({
      id: entry.id,
      user_id: user.id,
      emotion: entry.emotion,
      intensity: entry.intensity,
      triggers: entry.triggers,
      coping_used: entry.copingUsed,
      note: entry.note,
    });
  },

  async deleteDiaryEntry(entryId: string): Promise<void> {
    const supabase = createClient();
    await supabase.from('diary_entries').delete().eq('id', entryId);
  },

  async signIn(email: string, password: string) {
    const supabase = createClient();
    return supabase.auth.signInWithPassword({ email, password });
  },

  async signUp(email: string, password: string) {
    const supabase = createClient();
    return supabase.auth.signUp({ email, password });
  },

  async signInWithOAuth(provider: 'google' | 'apple') {
    const supabase = createClient();
    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      },
    });
  },

  async signOut() {
    const supabase = createClient();
    return supabase.auth.signOut();
  },

  async resetPassword(email: string) {
    const supabase = createClient();
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  },

  async getUser() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getEmail(): Promise<string | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email ?? null;
  },

  async deleteAccount(): Promise<{ error: Error | null }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('No user') };
    // Delete user data
    await supabase.from('sessions').delete().eq('user_id', user.id);
    await supabase.from('diary_entries').delete().eq('user_id', user.id);
    await supabase.from('profiles').delete().eq('id', user.id);
    await supabase.auth.signOut();
    return { error: null };
  },
};
