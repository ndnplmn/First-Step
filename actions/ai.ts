'use server';

import Groq from 'groq-sdk';
import { FRAMEWORKS_DICTIONARY, GESTALT_ACTIVITIES } from '@/lib/theories';
import { Patient, Conflict, Memory, FrameworkMatch, GestaltActivity, Interpretation, Closure, LifeChanges, Stage3Type, WorkCard, PatientSession, ExplorationRecord, ExplorationInsight, FrameworkKey, ExplorationPhase, PHQ9Response, GAD7Response } from '@/lib/types';
import { generateId } from '@/lib/id';

const getAI = () => new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

function buildPatientContext(patient: Patient, lifeChanges?: LifeChanges, sessionIntention?: string, locale?: string): string {
  const isEn = locale === 'en';
  const isRu = locale === 'ru';
  const L = isEn ? {
    name: 'Name', age: 'years', maritalStatus: 'Marital status', children: 'Children',
    noChildren: 'No children', lives: 'Lives', occupation: 'Occupation',
    supportYes: 'Support network: yes', noSupport: 'No identified support network',
    therapyYes: 'Previous therapy: yes', noTherapy: 'No previous therapy',
    medicationYes: 'Medication: yes', noMedication: 'No medication',
    reason: 'Reason for consultation', vision: "Patient's vision of success",
    lifeChanges: 'Recent life changes', detail: 'Detail', intention: 'Intention for this session',
  } : isRu ? {
    name: 'Имя', age: 'лет', maritalStatus: 'Семейное положение', children: 'Дети',
    noChildren: 'Без детей', lives: 'Проживает', occupation: 'Занятость',
    supportYes: 'Сеть поддержки: да', noSupport: 'Без сети поддержки',
    therapyYes: 'Предыдущая терапия: да', noTherapy: 'Без предыдущей терапии',
    medicationYes: 'Медикаменты: да', noMedication: 'Без медикаментов',
    reason: 'Причина обращения', vision: 'Видение успеха пациента',
    lifeChanges: 'Недавние изменения в жизни', detail: 'Подробности', intention: 'Намерение для этой сессии',
  } : {
    name: 'Nombre', age: 'años', maritalStatus: 'Estado civil', children: 'Hijos',
    noChildren: 'Sin hijos', lives: 'Vive', occupation: 'Ocupación',
    supportYes: 'Red de apoyo: sí', noSupport: 'Sin red de apoyo identificada',
    therapyYes: 'Terapia previa: sí', noTherapy: 'Sin terapia previa',
    medicationYes: 'Medicación: sí', noMedication: 'Sin medicación',
    reason: 'Motivo de consulta', vision: 'Visión de éxito del paciente',
    lifeChanges: 'Cambios recientes en su vida', detail: 'Detalle', intention: 'Intención para esta sesión',
  };

  const lines = [
    `${L.name}: ${patient.name}, ${patient.age} ${L.age}, ${patient.gender}`,
    `${L.maritalStatus}: ${patient.maritalStatus}`,
    patient.hasChildren ? `${L.children}: ${patient.childrenCount || 'sí'}` : L.noChildren,
    `${L.lives}: ${patient.livingSituation}${patient.livingSituationDetail ? ` (${patient.livingSituationDetail})` : ''}`,
    `${L.occupation}: ${patient.employment}${patient.occupation ? ` — ${patient.occupation}` : ''}`,
    patient.hasSupportNetwork
      ? `${L.supportYes}${patient.supportDescription ? ` (${patient.supportDescription})` : ''}`
      : L.noSupport,
    patient.previousTherapy
      ? `${L.therapyYes}${patient.previousTherapyDetail ? ` (${patient.previousTherapyDetail})` : ''}`
      : L.noTherapy,
    patient.takingMedication
      ? `${L.medicationYes}${patient.medicationDetail ? ` (${patient.medicationDetail})` : ''}`
      : L.noMedication,
    `${L.reason}: ${patient.consultationReason}`,
  ];

  if (lifeChanges && lifeChanges.categories.length > 0) {
    lines.push(`${L.lifeChanges}: ${lifeChanges.categories.join(', ')}${lifeChanges.detail ? `. ${L.detail}: ${lifeChanges.detail}` : ''}`);
  }

  if (sessionIntention) {
    lines.push(`${L.intention}: "${sessionIntention}"`);
  }

  return lines.join('\n');
}

function handleAIError(error: unknown): never {
  if (error instanceof Error) {
    if (error.message.includes('429') || error.message.includes('rate_limit')) {
      throw new Error('Límite de uso de IA alcanzado. Intenta de nuevo en unos minutos.');
    }
    if (error.message.includes('401') || error.message.includes('403')) {
      throw new Error('Error de autenticación con el servicio de IA.');
    }
  }
  throw new Error('El servicio de IA no está disponible en este momento.');
}

function getLanguageInstruction(locale?: string): string {
  const toneMap: Record<string, string> = {
    es: '\n\nSIEMPRE responde en español. Usa un tono cálido, cercano y reflexivo — como un terapeuta presente, no un sistema. Adapta tu registro al estado emocional del paciente: directo cuando sea necesario, gentil cuando el tema sea sensible, profundo sin ser clínico. Evita frases genéricas o de autoayuda; prioriza la autenticidad y la presencia terapéutica.',
    en: '\n\nYou MUST respond entirely in English. Use a warm, grounded, and reflective tone — like a present therapist, not a system. Adapt your register to the patient\'s emotional state: direct when needed, gentle on sensitive topics, profound without being clinical. Avoid generic self-help phrases; prioritize authenticity and therapeutic presence.',
    ru: '\n\nВы ОБЯЗАНЫ отвечать исключительно на русском языке. Используйте тёплый, вдумчивый и рефлексивный тон — как присутствующий терапевт, а не система. Адаптируйте свой регистр к эмоциональному состоянию пациента: прямой, когда это необходимо, мягкий в чувствительных темах, глубокий без клинического холода. Избегайте банальных фраз; приоритет — подлинность и терапевтическое присутствие.',
  };
  return toneMap[locale ?? 'es'] ?? toneMap.en;
}

function formatFrameworks(matches: FrameworkMatch[]): string {
  return matches.map((m, i) => `${i === 0 ? 'Marco primario' : 'Marco secundario'}: ${m.name} — ${m.focus}`).join('\n');
}

/**
 * Builds a compact, readable summary of prior completed sessions for AI context.
 * Only includes the last 3 sessions to keep prompt size bounded.
 */
function buildSessionHistory(priorSessions: PatientSession[]): string {
  if (!priorSessions.length) return '';

  const completed = priorSessions
    .filter(s => s.stage === 6 && s.conflicts.length > 0)
    .sort((a, b) => a.sessionNumber - b.sessionNumber)
    .slice(-3); // last 3 completed sessions

  if (!completed.length) return '';

  // Build wellbeing trend across all completed sessions (not just last 3)
  const allCompleted = priorSessions.filter(s => s.stage === 6).sort((a, b) => a.sessionNumber - b.sessionNumber);
  const wellbeingTrend = allCompleted
    .filter(s => s.wellbeingAfter != null)
    .map(s => `s${s.sessionNumber}:${s.wellbeingAfter}/5`)
    .join(' → ');

  // PHQ-9/GAD-7 trend (last 3 available)
  const clinicalTrend = allCompleted
    .filter(s => s.phq9 || s.gad7)
    .slice(-3)
    .map(s => {
      const parts = [];
      if (s.phq9) parts.push(`PHQ-9:${s.phq9.score}`);
      if (s.gad7) parts.push(`GAD-7:${s.gad7.score}`);
      return `s${s.sessionNumber}(${parts.join(',')})`;
    })
    .join(' → ');

  // Commitment adherence pattern
  const commitmentPattern = allCompleted
    .filter(s => s.commitmentFollowUp)
    .slice(-3)
    .map(s => `s${s.sessionNumber}:${s.commitmentFollowUp!.status}`)
    .join(' → ');

  const lines = completed.map(s => {
    const date = new Date(s.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const conflictos = s.conflicts.map(c => c.synthesized).join(', ');
    const marco = s.frameworkMatches[0]?.name ?? 'No definido';
    const interpretacion = s.interpretation?.text
      ? s.interpretation.text.slice(0, 180).replace(/\n/g, ' ') + (s.interpretation.text.length > 180 ? '…' : '')
      : null;
    const exploration = s.explorationRecord;
    const explorationLine = exploration?.insights?.length
      ? `  Exploración (${exploration.frameworkName}): ${exploration.insights.map(i => i.theme).join(' · ')}`
      : null;
    const interpResponseLine = s.interpretationResponse
      ? `  Respuesta del paciente a la interpretación: "${s.interpretationResponse.slice(0, 120)}"`
      : null;
    const wellbeingLine = (s.wellbeingBefore != null && s.wellbeingAfter != null)
      ? `  Bienestar: ${s.wellbeingBefore}/5 → ${s.wellbeingAfter}/5`
      : null;
    const alignmentLine = s.consultationAlignment
      ? `  Alineación terapéutica percibida: ${s.consultationAlignment === 'yes' ? 'trabajando lo que necesita' : s.consultationAlignment === 'partial' ? 'parcialmente alineado' : 'desviado del motivo de consulta'}`
      : null;
    return [
      `Sesión ${s.sessionNumber} (${date}):`,
      `  Conflictos trabajados: ${conflictos}`,
      `  Marco terapéutico: ${marco}`,
      wellbeingLine,
      explorationLine,
      interpResponseLine,
      interpretacion ? `  Interpretación (extracto): "${interpretacion}"` : null,
      alignmentLine,
    ].filter(Boolean).join('\n');
  });

  const trendSection = [
    wellbeingTrend ? `  Tendencia de bienestar: ${wellbeingTrend}` : null,
    clinicalTrend ? `  Evolución clínica: ${clinicalTrend}` : null,
    commitmentPattern ? `  Adherencia a compromisos: ${commitmentPattern}` : null,
  ].filter(Boolean).join('\n');

  return `\nHistorial de sesiones anteriores (${completed.length} sesión/es completada/s):\n${lines.join('\n\n')}\n${trendSection ? `\nPatrones longitudinales:\n${trendSection}\n` : ''}`;
}

function buildClinicalContext(phq9?: PHQ9Response | null, gad7?: GAD7Response | null): string {
  if (!phq9 && !gad7) return '';
  const sevES: Record<string, string> = {
    minimal: 'mínima', mild: 'leve', moderate: 'moderada', 'moderately-severe': 'moderadamente grave', severe: 'grave',
  };
  const lines: string[] = ['\nEvaluación clínica de esta sesión:'];
  if (phq9) {
    lines.push(`  Depresión PHQ-9: ${phq9.score}/27 — ${sevES[phq9.severity] ?? phq9.severity}`);
    if (phq9.score >= 10) lines.push('  → Puntaje clínicamente significativo: considera el impacto en motivación y estado de ánimo al formular preguntas');
  }
  if (gad7) {
    lines.push(`  Ansiedad GAD-7: ${gad7.score}/21 — ${sevES[gad7.severity] ?? gad7.severity}`);
    if (gad7.score >= 10) lines.push('  → Puntaje clínicamente significativo: considera cómo la ansiedad puede estar estructurando el conflicto actual');
  }
  lines.push('  Nota: calibra profundidad y tono con estos datos. No los menciones directamente al paciente.');
  return lines.join('\n');
}

// --- ACTION 1: Sintetizar conflictos y mapear a marco terapeutico clasico ---
export async function synthesizeConflicts(
  rawConflicts: string[],
  patient: Patient,
  lifeChanges?: LifeChanges,
  sessionIntention?: string,
  priorSessions?: PatientSession[],
  locale?: string,
  phq9?: PHQ9Response | null,
  gad7?: GAD7Response | null,
  consultationAlignment?: 'yes' | 'partial' | 'no',
): Promise<{ conflicts: Conflict[]; frameworkMatches: FrameworkMatch[]; gestaltActivity: GestaltActivity | null; stage3Type: Stage3Type; unmappedPhrases: string[]; narrativeSummary: string }> {
  const frameworksDesc = Object.entries(FRAMEWORKS_DICTIONARY)
    .map(([key, fw]) => `- ${key}: ${fw.name} — ${fw.description}`)
    .join('\n');

  const gestaltActivitiesDesc = Object.entries(GESTALT_ACTIVITIES)
    .map(([key, act]) => `- ${key}: ${act.title} — ${act.description}`)
    .join('\n');

  const sessionHistory = buildSessionHistory(priorSessions ?? []);

  const alignmentAnchor = consultationAlignment === 'no'
    ? `\n    ⚠️ NOTA CLÍNICA: El paciente indicó en el check-in que NO siente que estamos trabajando lo que originalmente lo trajo aquí (motivo de consulta: "${patient.consultationReason}"). Al sintetizar los conflictos y elegir el marco terapéutico, asegúrate de que el análisis conecte directamente con este motivo original. No desvíes hacia temas secundarios.\n`
    : '';

  const prompt = `
    Analiza los siguientes motivos de consulta de un paciente y mápalos al marco terapéutico clásico más adecuado.
${alignmentAnchor}
    Motivos: ${rawConflicts.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

    Contexto del paciente:
    ${buildPatientContext(patient, lifeChanges, sessionIntention, locale)}${buildClinicalContext(phq9, gad7)}
${sessionHistory ? `${sessionHistory}\n    Nota: Si algún conflicto actual es recurrente (aparece en sesiones anteriores), refleja esa continuidad en el narrativeSummary.\n` : ''}
    Marcos Terapéuticos Disponibles:
    ${frameworksDesc}

    Catálogo de Actividades Gestalt (solo si el marco elegido es "gestalt"):
    ${gestaltActivitiesDesc}

    Para cada motivo:
    1. Sintetízalo en 2-3 palabras descriptivas (ej: "Rebeldía con autoridad")
    2. Identifica el frameworkKey y subcategoría que mejor encaja

    Luego:
    3. Elige UN marco primario de entre: freudiano | bioenergetico | adleriano | gestalt | conductual
    4. Opcionalmente, incluye un marco secundario complementario
    5. Si el marco primario es "gestalt", incluye un objeto "gestaltActivity" con type, title, description y prompt personalizado al caso. Si no es gestalt, devuelve "gestaltActivity": null
    6. Determina el "stage3Type" según el marco primario:
       - freudiano → "memories"
       - bioenergetico → "bodywork"
       - adleriano → "social_context"
       - gestalt → "gestalt_activity"
       - conductual → "exposure"
    7. Lista cualquier frase que NO encaje en ningún marco en "unmappedPhrases"
    8. Genera un "narrativeSummary": 2-3 oraciones en lenguaje cálido y accesible que describan el enfoque terapéutico SIN nombrar ninguna teoría ni marco. Habla directamente al paciente en segunda persona.

    Responde SOLO con un objeto JSON con esta estructura exacta:
    {
      "conflicts": [
        { "raw": "...", "synthesized": "...", "frameworkKey": "freudiano|bioenergetico|adleriano|gestalt|conductual", "subCategory": "..." }
      ],
      "frameworkMatches": [
        { "key": "freudiano|bioenergetico|adleriano|gestalt|conductual", "name": "...", "focus": "...", "confidence": 0.9 }
      ],
      "gestaltActivity": null,
      "stage3Type": "memories|bodywork|social_context|gestalt_activity|exposure",
      "unmappedPhrases": ["..."],
      "narrativeSummary": "..."
    }
  ${getLanguageInstruction(locale)}`;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    content = response.choices[0]?.message?.content || '{}';
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  const conflicts: Conflict[] = parsed.conflicts.map((c: Omit<Conflict, 'id'>) => ({
    ...c,
    id: generateId(),
  }));

  const frameworkMatches = parsed.frameworkMatches as FrameworkMatch[];
  const gestaltActivity = parsed.gestaltActivity as GestaltActivity | null;
  const unmappedPhrases: string[] = parsed.unmappedPhrases || [];
  const narrativeSummary: string = parsed.narrativeSummary || '';

  return {
    conflicts,
    frameworkMatches,
    gestaltActivity,
    stage3Type: parsed.stage3Type ?? 'memories',
    unmappedPhrases,
    narrativeSummary,
  };
}

// --- ACTION 2: Extraer keywords de un recuerdo ---
export async function extractMemoryKeywords(
  memory: { raw: string; feelingThen: string; feelingNow: string },
  frameworks: string,
  locale?: string
): Promise<string[]> {
  const prompt = `
    Un paciente ha descrito el siguiente recuerdo en el contexto del siguiente marco terapéutico:

    ${frameworks}

    Suceso: "${memory.raw}"
    Sentimiento entonces: "${memory.feelingThen}"
    Sentimiento ahora: "${memory.feelingNow}"

    Extrae 3-5 palabras clave emocionales o temáticas del recuerdo que sean relevantes para el marco terapéutico del caso.

    Responde SOLO con un objeto JSON: { "keywords": ["palabra1", "palabra2", ...] }
  ${getLanguageInstruction(locale)}`;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    content = response.choices[0]?.message?.content || '{"keywords":[]}';
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  return parsed.keywords;
}

// --- ACTION 3: Generar interpretacion clinica ---
export async function generateInterpretation(params: {
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  memories: Memory[];
  patient: Patient;
  lifeChanges?: LifeChanges;
  stage3Notes?: string;
  explorationRecord?: ExplorationRecord;
  priorSessions?: PatientSession[];
  locale?: string;
}): Promise<Interpretation> {
  const { conflicts, frameworkMatches, memories } = params;

  const stage3Section = params.explorationRecord?.insights?.length
    ? `\n    Registro de exploración profunda (${params.explorationRecord.frameworkName}):\n    ${params.explorationRecord.insights.map(i => `- ${i.theme}: ${i.observation}`).join('\n    ')}\n    Reflexión IA: ${params.explorationRecord.aiReflection}\n`
    : params.stage3Notes
    ? `\n    Notas de exploración del paciente (sesión experiencial):\n    ${params.stage3Notes}\n`
    : '';

  const sessionHistory = buildSessionHistory(params.priorSessions ?? []);

  const prompt = `
    Eres un psicoterapeuta magistral que integra múltiples marcos terapéuticos.

    Combinación de marcos para este caso:
    ${formatFrameworks(frameworkMatches)}

    Contexto del paciente:
    ${buildPatientContext(params.patient, params.lifeChanges, undefined, params.locale)}

    Conflictos del paciente:
    ${conflicts.map(c => `- ${c.synthesized} (${c.frameworkKey}: ${c.subCategory})`).join('\n')}

    Recuerdos del paciente:
    ${memories.length > 0 ? memories.map(m => `
    Suceso: "${m.raw}"
    Sentimiento entonces: "${m.feelingThen}"
    Sentimiento ahora: "${m.feelingNow}"
    Palabras clave: ${m.keywords.join(', ')}
    `).join('\n---\n') : '(Sin recuerdos trabajados en esta sesión)'}
${stage3Section}${sessionHistory}
    Genera una interpretación clínica breve, profunda y reveladora desde el marco terapéutico elegido.
    Los marcos posibles son: Psicoanálisis Freudiano, Terapia Bioenergética, Psicología Individual de Adler, Terapia Gestalt, Sensibilización Sistemática Conductual.

    Reglas:
    - Dirígete directamente al paciente (segunda persona "tú")
    - Conecta lo trabajado en sesión con su conflicto actual desde la lente del marco terapéutico
    - Si hay notas de exploración, integra los insights concretos que el paciente compartió
    - Si hay historial de sesiones anteriores y existe un patrón recurrente, menciónalo brevemente para reforzar la continuidad del proceso
    - Usa lenguaje accesible, no técnico
    - EXACTAMENTE 1 párrafo. Solo 2 párrafos si el material trabajado lo justifica plenamente. Nunca más de 2.
    - Cada párrafo: máximo 4 oraciones. Ve directo al punto — sin preámbulos ni rodeos.
    - Sé empático, no juzgues
    - NO nombres las teorías por su nombre técnico — habla desde ellas, no sobre ellas
  ${getLanguageInstruction(params.locale)}`;

  let text: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    text = response.choices[0]?.message?.content || '';
  } catch (error) {
    handleAIError(error);
  }

  return { text, groundingSources: [] };
}

// --- ACTION 3b: Sintetizar exploración profunda (Etapa 3) ---
export async function synthesizeExploration(params: {
  rawData: string;
  patient: Patient;
  conflicts: Conflict[];
  frameworkKey: FrameworkKey;
  frameworkName: string;
  stage3Type: Stage3Type;
  sessionNumber: number;
  priorExplorations: ExplorationRecord[];
  locale?: string;
}): Promise<ExplorationRecord> {
  const { rawData, patient, conflicts, frameworkKey, frameworkName, stage3Type, sessionNumber, priorExplorations } = params;

  const priorContext = priorExplorations.length > 0
    ? `\nExploraciones previas del paciente (para mantener continuidad):\n${priorExplorations.map(e =>
        `Sesión ${e.sessionNumber} (${e.frameworkName}):\n${e.insights.map(i => `  - ${i.theme}: ${i.observation}`).join('\n')}`
      ).join('\n\n')}\n`
    : '';

  const nextPhaseHint: Record<Stage3Type, string> = {
    memories: 'observar si ese recuerdo sigue vivo en sus relaciones y decisiones presentes',
    bodywork: 'volver a su cuerpo cuando sienta esta emoción durante la semana, con curiosidad en lugar de juicio',
    social_context: 'notar el patrón en sus interacciones cotidianas — ¿cuándo aparece ese mismo movimiento?',
    gestalt_activity: 'recibir el momento de cierre de la sesión con apertura — algo está listo para integrarse',
    exposure: 'identificar el siguiente pequeño paso que se siente alcanzable, sin necesidad de dar el salto completo',
  };

  const prompt = `
Eres un psicoterapeuta magistral. Un paciente acaba de completar una actividad de exploración profunda.

Marco terapéutico: ${frameworkName}
Conflictos del paciente: ${conflicts.map(c => c.synthesized).join(', ')}
Contexto del paciente: ${buildPatientContext(patient, undefined, undefined, params.locale)}
${priorContext}
Material explorado en esta sesión:
${rawData}

Tu tarea:
1. Extrae 3-5 insights clave de lo que el paciente exploró. Cada insight es una pieza del rompecabezas que la IA acumula para entender mejor a este paciente.
2. Escribe una reflexión cálida (aiReflection) en voz de terapeuta (segunda persona "tú"), 2-3 oraciones:
   - Reconoce qué emergió en esta exploración
   - Si hay exploraciones previas, nombra brevemente la continuidad ("Lo que exploramos en la sesión X se conecta con...")
   - Cierra invitando al paciente a: ${nextPhaseHint[stage3Type]}

Reglas para los insights:
- "theme": etiqueta descriptiva de 2-4 palabras en español (ej: "Vínculo paterno ambivalente", "Ansiedad social compensada")
- "observation": 1-2 oraciones factuales sobre lo que el paciente reveló, sin lenguaje técnico
- No repitas insights de sesiones previas a menos que hayan tomado nueva dimensión

Reglas para aiReflection:
- Tono íntimo y empático, no clínico
- Menciona 1-2 elementos concretos de lo que el paciente compartió
- Máximo 3 oraciones

Responde SOLO con JSON:
{
  "insights": [{"theme": "...", "observation": "..."}],
  "aiReflection": "..."
}
  ${getLanguageInstruction(params.locale)}`;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });
    content = response.choices[0]?.message?.content || '{"insights":[],"aiReflection":""}';
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  const insights: ExplorationInsight[] = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 5) : [];

  return {
    sessionNumber,
    framework: frameworkKey,
    frameworkName,
    stage3Type,
    insights,
    aiReflection: typeof parsed.aiReflection === 'string' ? parsed.aiReflection : '',
    completedAt: Date.now(),
  };
}

// --- ACTION 4: Generar cierre simbolico ---
export async function generateClosure(params: {
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  memories: Memory[];
  interpretation: string;
  gestaltActivity: GestaltActivity | null;
  patient: Patient;
  deepWorkSynthesis?: string;
  priorSessions?: PatientSession[];
  locale?: string;
}): Promise<Closure> {
  const { conflicts, frameworkMatches, interpretation, gestaltActivity } = params;
  const closureHistory = buildSessionHistory(params.priorSessions ?? []);
  const { gender } = params.patient;
  const greeting = params.locale === 'ru'
    ? (gender === 'female' ? 'Дорогая' : gender === 'male' ? 'Дорогой' : 'Дорогой/ая')
    : params.locale === 'en'
    ? 'Dear'
    : (gender === 'female' ? 'Querida' : gender === 'male' ? 'Querido' : 'Queride');
  const closingMap: Record<string, string> = { es: `Con cariño,\n    Tend`, en: `With love,\n    Tend`, ru: `С теплом,\n    Tend` };
  const closing = closingMap[params.locale ?? 'es'] ?? closingMap.es;
  const parrafo2 = gestaltActivity
    ? `Presenta la actividad de exploración que viene: "${gestaltActivity.title}". Descríbela como una invitación concreta, no una tarea — algo que el paciente puede explorar con curiosidad fuera de sesión.`
    : params.deepWorkSynthesis
    ? `Refuerza lo que el paciente descubrió en el trabajo activo de hoy. Invítalo a seguir observando ese hilo en su vida cotidiana — no como tarea, sino como curiosidad.`
    : `Invita al paciente a llevar algo concreto de lo trabajado hoy hacia sus próximos días. Sin presión — solo una invitación a notar lo que surge.`;

  const prompt = `
    Eres un psicoterapeuta magistral.

    El paciente tiene estos conflictos: ${conflicts.map(c => c.synthesized).join(', ')}
    Marcos terapéuticos (de entre: Psicoanálisis Freudiano, Terapia Bioenergética, Psicología Individual de Adler, Terapia Gestalt, Sensibilización Sistemática Conductual):
    ${formatFrameworks(frameworkMatches)}

    Contexto del paciente:
    ${buildPatientContext(params.patient, undefined, undefined, params.locale)}
${closureHistory}

    Se le ha dado esta interpretación:
    "${interpretation}"

    ${gestaltActivity ? `Actividad Gestalt preparada para el paciente:\nTipo: ${gestaltActivity.type}\nTítulo: "${gestaltActivity.title}"\nDescripción: "${gestaltActivity.description}"` : ''}
${params.deepWorkSynthesis
  ? `\nEl paciente también trabajó activamente durante la sesión y llegó a esto:\n"${params.deepWorkSynthesis}"\nReconoce este trabajo activo en la carta — menciónalo como un logro concreto de esta sesión.`
  : ''}

    Ahora genera una CARTA PERSONAL al paciente. El formato es epistolar — como una carta íntima de alguien que realmente lo escuchó.

    FORMATO:
    - Empieza con "${greeting} ${params.patient.name},"
    - Escribe en primera persona como el terapeuta
    - 3 párrafos separados por una línea en blanco:

    PÁRRAFO 1 (3-5 oraciones):
    Quita el peso de la culpa. Reencuadra su sentimiento negativo como una necesidad humana comprensible. Dale una nueva perspectiva sanadora. Usa lenguaje poético y cálido.

    PÁRRAFO 2 (2-3 oraciones):
    ${parrafo2}

    PÁRRAFO 3 (2-3 oraciones):
    ${closureHistory
      ? 'El paciente ya lleva varias sesiones. Reconoce ese compromiso con su proceso. Que cada regreso muestra valentía y que lo trabajado se acumula.'
      : 'Hazle saber que este es apenas el primer paso. Que cada sesión profundizará más. Que volver es parte de cuidarse.'}

    - Cierra con una línea en blanco y luego exactamente:
    ${closing}

    NO expliques teorías. Habla al corazón.
  ${getLanguageInstruction(params.locale)}`;

  let text: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    text = response.choices[0]?.message?.content || '';
  } catch (error) {
    handleAIError(error);
  }

  return { text, groundingSources: [] };
}

// --- ACTION 5: Generar preguntas de reflexion ---
export async function generateReflectionQuestions(params: {
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  closure: string;
  explorationRecord?: ExplorationRecord;
  locale?: string;
}): Promise<string[]> {
  const { conflicts, frameworkMatches, closure } = params;

  const explorationContext = params.explorationRecord?.insights?.length
    ? `\n    Insights que emergieron en la exploración de esta sesión (úsalos para personalizar las preguntas):\n${params.explorationRecord.insights.map(i => `    - ${i.theme}: ${i.observation}`).join('\n')}\n`
    : '';

  const prompt = `
    Eres un psicoterapeuta que acaba de completar una sesión con un paciente.

    El paciente trabajó con el siguiente marco terapéutico:
    ${formatFrameworks(frameworkMatches)}

    Sus conflictos principales fueron: ${conflicts.map(c => c.synthesized).join(', ')}.
    El cierre simbólico que recibió fue:
    "${closure}"
${explorationContext}
    Genera exactamente 3 preguntas de reflexión profunda y personalizada para que el paciente
    lleve consigo después de la sesión. Las preguntas deben:
    - Surgir directamente de sus conflictos y el marco terapéutico del caso
    - Al menos una pregunta debe invitar a la exploración emocional; incluye una dimensión corporal SOLO si el marco terapéutico es bioenergético o gestalt
    - Invitar a la contemplación sin requerir respuesta inmediata
    - Usar segunda persona singular ("¿Qué sientes cuando...", "¿En qué momentos...")
    - Ser abiertas, no retóricas ni con respuesta obvia
    - Tener entre 10 y 25 palabras cada una

    Responde SOLO con un objeto JSON: { "questions": ["...", "...", "..."] }
  ${getLanguageInstruction(params.locale)}`;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });
    content = response.choices[0]?.message?.content || '{"questions":[]}';
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  return Array.isArray(parsed.questions) ? parsed.questions.slice(0, 3) : [];
}

// --- ACTION 2b: Generar tarjetas de enfoque de sesión (antes de Stage 3) ---
export async function generateSessionWorkCards(params: {
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  stage3Type?: Stage3Type;
  patient?: Patient;
  consultationAlignment?: 'yes' | 'partial' | 'no';
  consultationAlignmentNote?: string;
  sessionIntention?: string;
  locale?: string;
}): Promise<WorkCard[]> {
  const { conflicts, frameworkMatches } = params;

  const explorationTypeHint: Record<Stage3Type, string> = {
    memories: 'El openingLine debe invitar a recordar — cálido, retrospectivo, orientado a situaciones pasadas concretas.',
    bodywork: 'El openingLine debe orientar hacia el cuerpo — directo, presente, invitando a notar sensaciones físicas.',
    social_context: 'El openingLine debe orientar hacia las relaciones y roles — curioso, indagando en patrones sociales.',
    gestalt_activity: 'El openingLine debe ser presente e inmediato — ¿qué está vivo ahora en el paciente respecto a este tema?',
    exposure: 'El openingLine debe nombrar el patrón de evitación con claridad y proponer empezar a mirarlo directamente.',
  };

  const alignmentNoteClause = params.consultationAlignmentNote
    ? ` El paciente especificó lo que siente que falta: "${params.consultationAlignmentNote.slice(0, 120)}". Orienta al menos una tarjeta hacia eso.`
    : '';
  const recalibrateAnchor = params.consultationAlignment === 'no' && params.patient?.consultationReason
    ? `\nATENCIÓN: El paciente siente que no está trabajando su motivo de consulta original ("${params.patient.consultationReason.slice(0, 100)}"). Al menos una de las tres tarjetas DEBE recalibrar hacia ese motivo original, ayudando al paciente a reconectar con lo que le trajo aquí.${alignmentNoteClause}\n`
    : params.consultationAlignment === 'partial' && params.patient?.consultationReason
    ? `\nNOTA: El paciente siente que estamos trabajando su motivo de consulta solo parcialmente ("${params.patient.consultationReason.slice(0, 100)}"). Al menos una tarjeta debe conectar directamente con ese motivo original.${alignmentNoteClause} Las otras tarjetas pueden seguir la dirección actual del proceso.\n`
    : '';

  const prompt = `
Eres un psicoterapeuta que acaba de identificar los conflictos de un paciente y propones tres áreas concretas de exploración para la sesión de hoy.

Conflictos identificados: ${conflicts.map(c => c.synthesized).join(', ')}
Marco terapéutico: ${formatFrameworks(frameworkMatches)}
${params.patient ? `Contexto del paciente: ${buildPatientContext(params.patient, undefined, params.sessionIntention, params.locale)}\n` : ''}${params.stage3Type ? `Tipo de exploración que viene: ${params.stage3Type}. ${explorationTypeHint[params.stage3Type]}\n` : ''}${recalibrateAnchor}
Genera exactamente 3 tarjetas de enfoque de sesión, cada una representando un ángulo distinto de los conflictos. Para cada tarjeta:
- "title": frase en infinitivo, 4-8 palabras, específica al conflicto (ej: "Explorar la raíz del miedo", "Entender el patrón con mi familia")
- "subtitle": pregunta reflexiva que invita al paciente a explorar, 10-20 palabras, segunda persona singular
- "openingLine": primera frase del terapeuta al comenzar la exploración. Cálida, concreta, máximo 20 palabras. Segunda persona singular. No empieces con "¡"

Las tarjetas son puntos de entrada a la exploración, no conclusiones. Deben sentirse alcanzables en una sesión.

Responde SOLO con JSON: { "cards": [{ "id": "1", "title": "...", "subtitle": "...", "openingLine": "..." }, { "id": "2", ... }, { "id": "3", ... }] }
  ${getLanguageInstruction(params.locale)}`;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });
    content = response.choices[0]?.message?.content || '{"cards":[]}';
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  return Array.isArray(parsed.cards) ? parsed.cards.slice(0, 3) : [];
}

// --- ACTION 5b: Generar tarjetas de trabajo activo ---
export async function generateWorkCards(params: {
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  reflectionQuestions: string[];
  interpretation: string;
  locale?: string;
}): Promise<WorkCard[]> {
  const { conflicts, frameworkMatches, reflectionQuestions, interpretation } = params;

  const prompt = `
Eres un psicoterapeuta que acaba de entregar una interpretación a su paciente y ahora propone tres líneas de trabajo activo para la sesión.

Interpretación dada al paciente:
"${interpretation}"

Conflictos del paciente: ${conflicts.map(c => c.synthesized).join(', ')}

Marco terapéutico: ${formatFrameworks(frameworkMatches)}

Preguntas de reflexión base (una por tarjeta):
${reflectionQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Para cada pregunta de reflexión, genera una tarjeta de trabajo activo con:
- "title": frase de acción en infinitivo, 4-8 palabras, específica al conflicto (ej: "Explorar la culpa hacia tu madre", "Entender por qué evitas el conflicto")
- "subtitle": la pregunta de reflexión original, sin modificar
- "openingLine": primera frase del terapeuta al abrir este hilo de trabajo. Cálida, directa, invita a hablar. Máximo 20 palabras. Segunda persona singular. NO empieces con "¡"

Responde SOLO con JSON: { "cards": [ { "id": "1", "title": "...", "subtitle": "...", "openingLine": "..." }, ... ] }
  ${getLanguageInstruction(params.locale)}`;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });
    content = response.choices[0]?.message?.content || '{"cards":[]}';
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  const cards: WorkCard[] = Array.isArray(parsed.cards) ? parsed.cards.slice(0, 3) : [];
  return cards;
}

// --- ACTION 5b: Conversación adaptativa de exploración (Etapa 3) ---
export async function getExplorationResponse(params: {
  selectedCard: WorkCard;
  messages: { role: 'patient' | 'therapist'; text: string }[];
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  patient: Patient;
  stage3Type: Stage3Type;
  currentPhase: ExplorationPhase;
  priorSessions?: PatientSession[];
  locale?: string;
  lifeChanges?: LifeChanges;
  sessionIntention?: string;
  wellbeingBefore?: number;
  phq9?: PHQ9Response | null;
  gad7?: GAD7Response | null;
  recentDiaryEntry?: string;
  quickSession?: boolean;
  solutionVision?: string;
}): Promise<{ done: boolean; response: string; nextPhase: ExplorationPhase; insightDetected: boolean }> {
  const { selectedCard, messages, conflicts, frameworkMatches, patient, stage3Type, currentPhase, priorSessions = [] } = params;

  const patientTurns = messages.filter(m => m.role === 'patient').length;
  const isLightMode = params.wellbeingBefore !== undefined && params.wellbeingBefore <= 2;
  const minTurns = params.quickSession ? 2 : (isLightMode ? 3 : 4);
  const canClose = patientTurns >= minTurns;

  const frameworkLens: Record<Stage3Type, string> = {
    memories: 'Psicoanálisis freudiano: conecta el relato del paciente con figuras de apego tempranas, patrones de repetición, y el significado inconsciente que el paciente no puede ver directamente.',
    bodywork: 'Bioenergética: redirige constantemente hacia el cuerpo — sensaciones físicas concretas, tensiones, temperatura, ritmo. El cuerpo como la puerta al contenido emocional bloqueado.',
    social_context: 'Psicología Individual de Adler: explora el sentido de pertenencia, el estilo de vida compensatorio, los roles sociales asumidos y el telos (propósito inconsciente) detrás de los comportamientos.',
    gestalt_activity: 'Terapia Gestalt: mantén la atención en el momento presente. ¿Qué está vivo ahora mismo? Trabaja con las polaridades, los asuntos inconclusos, y el ciclo de contacto-retirada.',
    exposure: 'Terapia Cognitivo-Conductual: identifica la cadena de eventos (trigger → pensamiento → emoción → conducta → consecuencia). Construye gradualmente hacia la confrontación con lo evitado.',
  };

  const frameworkTone: Record<Stage3Type, string> = {
    memories: `Tono psicoanalítico: cómodo con el silencio y la incomodidad. Cuando el paciente evita algo, lo nombras: "Noto que cada vez que te acercas a esto, das un rodeo." No retrocedes ante la resistencia — la señalas con curiosidad. Interpretas el significado latente, no el manifiesto.`,
    bodywork: `Tono bioenergético: directo sobre el cuerpo. No dejas que el paciente se quede en la cabeza: "Todo eso que describes está en tu cuerpo ahora mismo — ¿qué sientes físicamente?" Nombras la energía bloqueada sin ambigüedad.`,
    social_context: `Tono adleriano: señalas los patrones de compensación sin suavizarlos: "Lo que describes suena a alguien que necesita demostrar algo constantemente — ¿a quién?" Exploras el movimiento social con precisión, no con suposiciones.`,
    gestalt_activity: `Tono gestalt: presente e inmediato. No permites que el paciente escape al pasado o al futuro abstracto: "¿Qué está pasando en ti ahora mismo, en este momento?" Cuando hay evitación del presente, la nombras directamente.`,
    exposure: `Tono conductual: preciso y sin rodeos sobre los patrones de evitación: "Eso es evitación. Cada vez que evitas, el miedo crece. ¿Qué crees que pasaría si no lo evitaras esta vez?" Construyes hacia la exposición con firmeza, no con suavidad excesiva.`,
  };

  const patternLinkingQuestion = stage3Type === 'gestalt_activity'
    ? '"¿Dónde notas esta misma dinámica en tu vida ahora mismo — no en el pasado?"'
    : stage3Type === 'exposure'
    ? '"¿En qué otras situaciones aparece este mismo patrón de evitación?"'
    : stage3Type === 'bodywork'
    ? '"¿Qué parte de ti lleva este peso más tiempo — y desde cuándo?"'
    : '"¿Cuándo fue la primera vez que sentiste algo así?"'; // freudiano / adleriano

  const challengingExample = stage3Type === 'exposure'
    ? '"Si un amigo te contara exactamente esto, ¿qué le dirías?"'
    : stage3Type === 'gestalt_activity'
    ? '"¿Qué parte de ti está defendiendo esa creencia — y qué está protegiendo?"'
    : stage3Type === 'social_context'
    ? '"¿Qué necesitas demostrar con eso, y a quién?"'
    : stage3Type === 'bodywork'
    ? '"¿Qué pasaría en tu cuerpo si no necesitaras creer eso?"'
    : '"¿Esto que sientes es un hecho sobre ti, o es una historia que aprendiste a contar?"'; // freudiano

  const bodyAnchorInstruction = (stage3Type === 'bodywork' || stage3Type === 'gestalt_activity')
    ? '- Anclaje corporal: "¿Dónde sientes esto en tu cuerpo ahora mismo?" — OBLIGATORIO para este marco terapéutico'
    : '- Anclaje corporal: solo si el paciente ha mencionado síntomas físicos espontáneamente — NO lo preguntes de forma rutinaria en este marco';

  const phaseInstructions: Record<ExplorationPhase, string> = {
    exploring: `FASE: EXPLORANDO
Objetivo: anclar en una situación concreta y específica — nada abstracto.
- Pregunta por el cuándo, dónde, quién, qué pasó exactamente
- Evita preguntas genéricas — pide el episodio específico más reciente o más intenso
- Si el paciente responde en abstracto: "¿Puedes darme un ejemplo concreto, una situación específica?"`,

    deepening: `FASE: PROFUNDIZANDO
Objetivo: del relato intelectual al contacto emocional directo.
${bodyAnchorInstruction}
- Emoción precisa: vergüenza / miedo / rabia / tristeza / no genérico "mal"
- Impulso de acción: "¿Qué quieres hacer cuando sientes eso?" — revela la función de la emoción
- Si intelectualiza: "Noto que describes esto como si te estuviera pasando a otra persona. ¿Qué pasa si te acercas más?"`,

    pattern_linking: `FASE: CONECTANDO PATRONES
Objetivo: el paciente reconoce que esto no es un episodio aislado.
- Usa el lente: ${frameworkLens[stage3Type]}
- "¿Esto te suena familiar de otras relaciones o situaciones en tu vida?"
- ${patternLinkingQuestion}
- Nombra el patrón tentativamente: "Me pregunto si..." / "Parece que hay un hilo aquí..."`,

    challenging: `FASE: EXAMINANDO CREENCIAS
Objetivo: cuestionar la creencia o defensa que mantiene el conflicto activo.
- Socratic nivel 3-4: implica, contrasta, lleva a las consecuencias lógicas
- "¿Qué tendría que ser verdad sobre ti para que esto te afecte tanto?"
- ${challengingExample}
- Si hay defensa: "Noto que tienes una respuesta muy ordenada para esto. ¿Qué pasaría si no supieras la respuesta?"
- Si hay autosabot o narrativa negativa: no la valides — desafíala: "¿Eso es un hecho o una interpretación?"`,

    insight: `FASE: INSIGHT EMERGENTE
El paciente acaba de decir algo significativo. NO hagas una pregunta nueva.
- Refleja sus propias palabras sin añadir tu interpretación: "Acabas de decir algo importante..."
- Invita a profundizar: "¿Qué más surge con eso?"
- Crea espacio: "Quédate un momento ahí."`,

    consolidating: `FASE: CONSOLIDANDO
Objetivo: el paciente se apropia del insight — él lo dice, no tú.
- Refleja en sus palabras: "Entonces lo que notas es que..."
- Invita a la síntesis: "¿Qué es lo que quieres llevarte de lo que descubriste hoy?"
- NO ofrezcas nuevas interpretaciones — la última palabra es del paciente
- Si el paciente ha formulado algo genuinamente propio → marca done: true`,
  };

  const closureRules = canClose
    ? `
CUÁNDO MARCAR done: true (solo si canClose es true — ya hay ${patientTurns} turnos del paciente):
- El paciente ha formulado un insight genuino en sus propias palabras (no repitiendo lo que tú dijiste)
- El paciente expresa cierre natural: "ya entiendo", "me queda claro", "creo que sé qué hacer", "ahora tiene sentido"
- La fase de consolidación está activa Y el paciente ha dado al menos una respuesta integradora
- Si hay más por explorar y el material está vivo — NO cierres, aunque hayan pasado muchos turnos
- Un buen terapeuta no cierra por conveniencia — cierra cuando el trabajo está hecho`
    : `CIERRE: Aún no es posible cerrar (mínimo ${minTurns} turnos del paciente — van ${patientTurns}). done debe ser false.`;

  const phaseTransitionRules = `
TRANSICIÓN DE FASE:
- exploring → deepening: cuando el paciente da detalles concretos y empieza a activarse emocionalmente
- deepening → pattern_linking: cuando el paciente ha accedido a material emocional concreto y ha nombrado la emoción dominante${(stage3Type === 'bodywork' || stage3Type === 'gestalt_activity') ? ' (en este marco, también incluye nombramiento de sensaciones físicas)' : ''}
- pattern_linking → challenging: cuando el paciente conecta el conflicto con algo más amplio
- challenging → insight: cuando el paciente dice algo que revela comprensión nueva (insightDetected: true)
- insight → consolidating: cuando el paciente profundizó en el momento de insight
- En cualquier fase → insight: si detectas señales de insight genuino, salta directamente
- challenging → deepening: si el paciente se cierra o se vuelve más abstracto bajo presión

SEÑALES DE INSIGHT:
- Primera persona presente: "me doy cuenta de que...", "lo que siento es..."
- Conexión espontánea no sugerida: "esto es igual que con mi padre...", "siempre hago esto cuando..."
- Lenguaje tentativo de auto-descubrimiento: "quizás por eso...", "creo que ahora entiendo..."
- Reformulación en mitad de una frase
- Sorpresa sobre sí mismo: "no había pensado que...", "es raro pero..."`;

  const authenticToneRules = `
TONO AUTÉNTICO DEL TERAPEUTA — ESTO ES CRÍTICO:
1. PROHIBIDO: "¡Eso es muy importante!", "¡Exacto!", "¡Muy bien!", "Qué valiente eres", "Es una gran reflexión"
2. PERMITIDO: "Entiendo.", "Sí.", "Escucho.", "Continúa." — reconocimientos breves y genuinos
3. Cuando el paciente intelectualiza → nómbralo sin rodeos: "Estás describiendo esto desde fuera. ¿Qué pasa si entras?"
4. Cuando surge emoción genuina → NO continues, profundiza: "Ahí. ¿Qué hay debajo de eso?"
5. Cuando el material lo requiere, di la verdad aunque sea incómoda:
   ${frameworkTone[stage3Type] ?? frameworkTone.memories}
6. NUNCA valides una narrativa autodegradante sin cuestionarla: si el paciente dice "soy así y no puedo cambiar" → desafíalo
7. Hay momentos para preguntar, momentos para señalar, momentos para el silencio — lee el material y elige
8. Si el paciente da respuestas cortas o evasivas → no continúes como si fuera suficiente: "¿Eso es todo lo que surge?"`;

  const priorContext = priorSessions.filter(s => s.explorationRecord).length > 0
    ? `\nHistorial terapéutico (últimas sesiones):\n${priorSessions
        .filter(s => s.explorationRecord)
        .slice(-3)
        .map(s => {
          const r = s.explorationRecord!;
          const commitment = r.actionCommitment ? `\n  Compromiso asumido: "${r.actionCommitment}"` : '';
          return `Sesión ${r.sessionNumber} (${r.frameworkName}): ${r.insights.map(i => i.theme).join(' · ')}${commitment}`;
        })
        .join('\n')}\n`
    : '';

  const history = messages.map(m =>
    `${m.role === 'therapist' ? 'Terapeuta' : 'Paciente'}: ${m.text}`
  ).join('\n');

  const therapistQuestions = messages
    .filter(m => m.role === 'therapist')
    .map(m => `"${m.text}"`);

  const prompt = `
Eres un psicoterapeuta magistral. Tu trabajo no es hacer que el paciente se sienta bien — es ayudarle a ver lo que no puede ver solo. Eres cálido pero honesto. Directo pero sin crueldad.

═══════════════════════════════════════
CONTEXTO DEL CASO
═══════════════════════════════════════
Paciente: ${buildPatientContext(patient, params.lifeChanges, params.sessionIntention, params.locale)}${buildClinicalContext(params.phq9, params.gad7)}${params.recentDiaryEntry ? `\nEntrada reciente en diario: "${params.recentDiaryEntry}". Si surge naturalmente en la conversación, puedes conectarlo. No lo menciones directamente — úsalo como contexto de fondo.` : ''}${params.wellbeingBefore !== undefined ? `\nEstado al llegar a sesión: ${params.wellbeingBefore}/5` : ''}${isLightMode ? `\n\n⚠ MODO SUAVE ACTIVADO: El paciente llegó con bienestar muy bajo (${params.wellbeingBefore}/5). Prioriza contención y presencia sobre insight profundo. No empujes hacia fases de challenging o pattern_linking. El objetivo es que salga mejor de como entró. Sé especialmente cálido y no presiones si hay resistencia.` : ''}${params.quickSession ? `\n\n⚡ SESIÓN CORTA: El paciente eligió una sesión abreviada. Sé más directo y sintético. Busca llegar a un punto de insight o validación en 2-3 turnos. Avanza hacia consolidación antes de lo habitual.` : ''}
Conflictos: ${conflicts.map(c => c.synthesized).join(', ')}
Marco: ${formatFrameworks(frameworkMatches)}
${priorContext}
═══════════════════════════════════════
FOCO DE ESTA SESIÓN
═══════════════════════════════════════
Tema: "${selectedCard.title}"
Eje: "${selectedCard.subtitle}"${params.sessionIntention ? `\nIntención del paciente para hoy: "${params.sessionIntention}"
→ Alrededor del turno 4-5, si el material lo permite, conecta brevemente lo explorado con esta intención. No lo fuerces — solo si es natural.` : ''}${params.solutionVision ? `\nVisión de éxito del paciente: "${params.solutionVision}" → En la fase de consolidación, si surge naturalmente, conecta lo explorado con esta visión. No lo menciones en fases tempranas.` : ''}

═══════════════════════════════════════
CONVERSACIÓN — turno ${patientTurns} del paciente
═══════════════════════════════════════
${history || '(El paciente está a punto de responder por primera vez)'}

Ya preguntaste (NO repetir ninguna de estas):
${therapistQuestions.length > 0 ? therapistQuestions.join('\n') : 'Ninguna aún'}

═══════════════════════════════════════
INSTRUCCIONES
═══════════════════════════════════════
${phaseInstructions[currentPhase]}

${phaseTransitionRules}

${closureRules}

${authenticToneRules}

═══════════════════════════════════════
GENERA TU RESPUESTA
═══════════════════════════════════════
UNA sola intervención. Máximo 25 palabras. No empieces con "¿Podrías...?" / "¿Me puedes decir...?" / "¡".

Responde SOLO con este JSON:
{
  "done": false,
  "response": "tu intervención",
  "nextPhase": "exploring | deepening | pattern_linking | challenging | insight | consolidating",
  "insightDetected": false
}
${getLanguageInstruction(params.locale)}`;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.72,
    });
    content = response.choices[0]?.message?.content || `{"done":false,"response":"","nextPhase":"${currentPhase}","insightDetected":false}`;
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  const validPhases: ExplorationPhase[] = ['exploring', 'deepening', 'pattern_linking', 'challenging', 'insight', 'consolidating'];
  const nextPhase: ExplorationPhase = validPhases.includes(parsed.nextPhase) ? parsed.nextPhase : currentPhase;
  // Enforce minimum turns before allowing done: true
  const done = canClose ? !!parsed.done : false;

  return {
    done,
    response: parsed.response ?? '',
    nextPhase,
    insightDetected: !!parsed.insightDetected,
  };
}

// --- ACTION 5c: Respuesta terapéutica en modo resolutivo ---
export async function getDeepWorkResponse(params: {
  selectedCard: WorkCard;
  messages: { role: 'patient' | 'therapist'; text: string }[];
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  interpretation: string;
  patient: Patient;
  stage3Type: Stage3Type;
  locale?: string;
  earlyClose?: boolean;
}): Promise<{ done: boolean; response: string; synthesis?: string }> {
  const { selectedCard, messages, conflicts, frameworkMatches, interpretation, patient } = params;

  const patientTurns = messages.filter(m => m.role === 'patient').length;
  const forceClose = params.earlyClose === true || patientTurns >= 5;

  const deepWorkLens: Record<Stage3Type, string> = {
    memories: 'Profundiza en qué figura significativa está en el centro de este patrón y qué necesitaba el paciente que no recibió.',
    bodywork: 'Dirige hacia el cuerpo: qué quiere hacer esa emoción física si la dejara expresarse.',
    social_context: 'Examina el rol social asumido y la necesidad de demostración: a quién, para qué, con qué coste personal.',
    gestalt_activity: 'Trabaja el presente inmediato: qué necesita completar, expresar o recibir el paciente ahora mismo.',
    exposure: 'Identifica exactamente qué evita el paciente y construye hacia el primer paso posible sin evitación.',
  };

  const history = messages.map(m =>
    `${m.role === 'therapist' ? 'Terapeuta' : 'Paciente'}: ${m.text}`
  ).join('\n');

  const prompt = `
Eres un psicoterapeuta en una sesión activa. Ya conoces al paciente a fondo y acabas de darle una interpretación. Ahora estás trabajando un punto específico con él/ella.

Paciente: ${buildPatientContext(patient, undefined, undefined, params.locale)}
Conflictos: ${conflicts.map(c => c.synthesized).join(', ')}
Marco: ${formatFrameworks(frameworkMatches)}
Lente terapéutico para este trabajo: ${deepWorkLens[params.stage3Type]}
Interpretación dada: "${interpretation}"

Línea de trabajo elegida por el paciente: "${selectedCard.title}"
Pregunta base: "${selectedCard.subtitle}"

Conversación hasta ahora:
${history || '(El paciente aún no ha respondido)'}

${forceClose
  ? `INSTRUCCIÓN: Han tenido suficientes intercambios. Genera la síntesis final ahora.
     Responde con: { "done": true, "response": "[síntesis de 2-3 oraciones: lo que el paciente llegó a ver o sentir en este trabajo, en segunda persona, sin lenguaje técnico, cálido]", "synthesis": "[mismo texto]" }`
  : `INSTRUCCIÓN: Estás en modo resolutivo — no exploración abierta. Haz UNA pregunta que lleve al paciente hacia un insight concreto sobre "${selectedCard.title}". Máximo 20 palabras. Segunda persona. No uses "¿Podrías...?" ni "¿Me puedes decir...?".
     Responde con: { "done": false, "response": "[tu pregunta]", "synthesis": null }`
}

Responde SOLO con JSON con esa estructura exacta.
  ${getLanguageInstruction(params.locale)}`;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.65,
    });
    content = response.choices[0]?.message?.content || '{"done":false,"response":"Continúa cuando estés listo.","synthesis":null}';
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  const synthesis = parsed.synthesis || undefined;
  return {
    done: !!parsed.done && !!synthesis,
    response: parsed.response ?? '',
    synthesis,
  };
}

// --- ACTION 6: Generar estrategias practicas para el dia a dia ---
export async function generateStrategies(params: {
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  interpretation: string;
  gestaltActivity: GestaltActivity | null;
  patient: Patient;
  explorationRecord?: ExplorationRecord;
  actionCommitment?: string;
  locale?: string;
}): Promise<{ title: string; description: string }[]> {
  const { conflicts, frameworkMatches, interpretation, gestaltActivity } = params;

  const explorationContext = params.explorationRecord?.insights?.length
    ? `\n    Lo que emergió en la exploración de esta sesión (basa al menos una estrategia en estos insights concretos):\n${params.explorationRecord.insights.map(i => `    - ${i.theme}: ${i.observation}`).join('\n')}\n`
    : '';

  const commitmentContext = params.actionCommitment
    ? `\n    El paciente ya asumió este compromiso de acción: "${params.actionCommitment}". Las estrategias deben COMPLEMENTAR y ampliar ese compromiso, no repetirlo.\n`
    : '';

  const prompt = `
    Eres un psicoterapeuta experto que integra múltiples marcos terapéuticos.

    Marcos del caso:
    ${formatFrameworks(frameworkMatches)}

    Contexto del paciente:
    ${buildPatientContext(params.patient, undefined, undefined, params.locale)}

    El paciente tiene estos conflictos: ${conflicts.map(c => c.synthesized).join(', ')}

    Se le ha dado esta interpretación:
    "${interpretation}"
${explorationContext}${commitmentContext}
    ${gestaltActivity ? `Actividad Gestalt del caso:\nTipo: ${gestaltActivity.type}\nTítulo: "${gestaltActivity.title}"\nDescripción: "${gestaltActivity.description}"` : ''}

    Genera exactamente 3 ESTRATEGIAS PRÁCTICAS que el paciente pueda aplicar en su vida diaria para confrontar su problema. Las estrategias deben:
    - Derivar del marco terapéutico principal (y secundario si hay) del caso
    - Al menos una estrategia debe invitar al awareness emocional; incluye consciencia corporal SOLO si el marco terapéutico es bioenergético o gestalt
    - Ser concretas, realizables y específicas (no genéricas como "medita" o "haz ejercicio")
    - Estar fundamentadas en los marcos pero explicadas en lenguaje cotidiano
    - Incluir un título corto (3-5 palabras) y una descripción práctica (2-3 oraciones max)
    - Ser acciones que pueda empezar hoy mismo, sin necesidad de un terapeuta presente
    - Dirigirse al paciente en segunda persona ("cuando sientas...", "intenta...")
    - Relacionarse directamente con los conflictos específicos del paciente

    Responde SOLO con un objeto JSON: { "strategies": [{ "title": "...", "description": "..." }, ...] }
  ${getLanguageInstruction(params.locale)}`;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });
    content = response.choices[0]?.message?.content || '{"strategies":[]}';
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  return Array.isArray(parsed.strategies) ? parsed.strategies.slice(0, 3) : [];
}

export async function suggestCommitment(params: {
  conflicts: Conflict[];
  interpretation: string;
  patient: Patient;
  explorationRecord?: ExplorationRecord;
  locale?: string;
}): Promise<string> {
  const explorationLine = params.explorationRecord?.insights?.length
    ? `Insights de la exploración: ${params.explorationRecord.insights.map(i => i.theme).join(', ')}.`
    : '';

  const prompt = `
    Eres un psicoterapeuta que sugiere un compromiso de acción concreto y pequeño.

    Contexto del paciente:
    ${buildPatientContext(params.patient, undefined, undefined, params.locale)}

    Conflictos trabajados: ${params.conflicts.map(c => c.synthesized).join(', ')}
    Interpretación de la sesión: "${params.interpretation}"
    ${explorationLine}

    Genera UN SOLO compromiso de acción para esta semana. Debe:
    - Ser conductualmente específico: qué hace, cuándo, durante cuánto tiempo (ej. "Esta semana, cuando notes que te criticas, escribe esa crítica en un papel y añade: ¿qué necesidad estoy intentando proteger?")
    - Ser pequeño y realizable en 7 días sin ayuda profesional
    - Conectar directamente con el material trabajado hoy
    - Estar redactado en primera persona del paciente (empezar con "Esta semana..." o "Cuando..." o "Cada vez que...")
    - Máximo 2 oraciones

    Responde SOLO con el texto del compromiso, sin comillas, sin explicaciones.
  ${getLanguageInstruction(params.locale)}`;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 120,
    });
    content = response.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    handleAIError(error);
  }

  return content;
}

// --- ACTION 7: Pregunta adaptativa del terapeuta ---
// Evalúa si la IA ya tiene suficiente información para formular su análisis.
// Si no, devuelve la pregunta más importante que falta. Si sí, devuelve done: true.
export async function getNextTherapistQuestion(params: {
  allInputs: string[];
  questionsAsked: string[];
  patient: Patient;
  lifeChanges?: LifeChanges;
  sessionIntention?: string;
  forceClose?: boolean;
  priorSessions?: PatientSession[];
  locale?: string;
  phq9?: PHQ9Response | null;
  gad7?: GAD7Response | null;
  commitmentFollowUp?: { status: 'yes' | 'partial' | 'no'; note?: string } | null;
  recentDiaryEntry?: string;
  priorInterpretation?: string;
}): Promise<{ done: boolean; question: string | null; reflection: string | null; bridgeMessage: string | null }> {
  const { allInputs, questionsAsked } = params;
  const questionHistory = buildSessionHistory(params.priorSessions ?? []);

  const prompt = `
Eres un psicoterapeuta experto${questionHistory ? ' con historial de sesiones previas con este paciente' : ' realizando una primera sesión de evaluación'}.

El paciente ha compartido lo siguiente:
${allInputs.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

${questionsAsked.length > 0 ? `Ya has preguntado:\n${questionsAsked.map((q, i) => `${i + 1}. "${q}"`).join('\n')}` : ''}

Contexto del paciente (ya conocido — NO preguntes sobre esto):
${buildPatientContext(params.patient, params.lifeChanges, params.sessionIntention, params.locale)}${buildClinicalContext(params.phq9, params.gad7)}
${params.recentDiaryEntry ? `\nNota: El paciente escribió en su diario recientemente: "${params.recentDiaryEntry}". Si surge naturalmente en la conversación, puedes conectarlo con lo que trae hoy.\n` : ''}
${params.priorInterpretation ? `\nInterpretación de la sesión anterior: "${params.priorInterpretation.slice(0, 300)}${params.priorInterpretation.length > 300 ? '…' : ''}". Si el conflicto actual parece relacionado con ese tema, reconócelo brevemente en la reflexión — sin repetir el análisis, solo el hilo de continuidad.\n` : ''}
${params.commitmentFollowUp?.status === 'no'
  ? `\nNota clínica: El paciente reportó que NO pudo cumplir su compromiso de la semana pasada${params.commitmentFollowUp.note ? ` ("${params.commitmentFollowUp.note}")` : ''}. Puede ser relevante — nómbralo si surge naturalmente, sin generar culpa.\n`
  : params.commitmentFollowUp?.status === 'partial'
  ? `\nNota clínica: El paciente intentó su compromiso pero fue difícil${params.commitmentFollowUp.note ? ` ("${params.commitmentFollowUp.note}")` : ''}. Puede valer explorar qué lo dificultó si surge en la conversación.\n`
  : ''}
${questionHistory ? `${questionHistory}\nNota: Usa este historial para evitar re-explorar lo ya trabajado. Si el paciente menciona temas recurrentes, reconócelo cálidamente en la "reflection".\n` : ''}

─────────────────────────────────────────────────────────────
DIMENSIONES DEL CONFLICTO — audita cuáles están cubiertas
─────────────────────────────────────────────────────────────

Para cada dimensión decide: CUBIERTA | PARCIAL | AUSENTE.

1. TEMA — El problema central que trajo al paciente.
   → Normalmente presente desde el primer mensaje. Relevante: todos los marcos.

2. EMOCIÓN — La emoción subyacente dominante (miedo, tristeza, rabia, vergüenza, culpa).
   → Busca la emoción nombrada o implícita, no solo la descripción del evento. Relevante: todos.

3. CUERPO — Manifestación física (dónde lo siente, tensión, síntomas somáticos).
   → Especialmente relevante para: bioenergetico, gestalt, conductual.
   → IMPORTANTE: marca como AUSENTE solo si el paciente ya mencionó síntomas físicos y no los exploró, O si hay indicios claros de somatización. NO solicites información corporal de forma rutinaria — es la dimensión de menor prioridad para marcos freudiano y adleriano.

4. TIEMPO — Dimensión temporal (cuándo empezó, si es patrón, si ha ocurrido antes).
   → Especialmente relevante para: freudiano, adleriano, conductual.

5. RELACIÓN — Dimensión relacional (quién más está involucrado, dinámicas familiares/sociales).
   → NOTA: ya se conoce estado civil "${params.patient.maritalStatus}", convivencia "${params.patient.livingSituation}", red de apoyo: ${params.patient.hasSupportNetwork ? 'sí' : 'no'}. Considera PARCIAL salvo que el conflicto requiera exploración relacional específica.
   → Especialmente relevante para: freudiano, adleriano, gestalt.

6. CONDUCTA — Impacto conductual (qué evita, qué ha intentado, efecto en vida cotidiana).
   → NOTA: intención de sesión "${params.sessionIntention ?? ''}" y ocupación "${params.patient.employment}" ya aportan contexto. Considera PARCIAL si la intención menciona conductas.
   → Especialmente relevante para: conductual, adleriano.

─────────────────────────────────────────────────────────────
REGLA DE CIERRE
─────────────────────────────────────────────────────────────

${params.forceClose
  ? `IMPORTANTE: Límite de preguntas alcanzado. Procede directamente al CASO 1 (done: true) independientemente de la cobertura.`
  : `Marca done: true si se cumplen AMBAS condiciones:
  a) TEMA y EMOCIÓN están CUBIERTOS (no solo PARCIALES).
  b) Al menos 2 dimensiones adicionales están CUBIERTOS o PARCIALES.`}

─────────────────────────────────────────────────────────────
CASO 1 — Información suficiente (done: true):
─────────────────────────────────────────────────────────────

Genera "bridgeMessage":
1. En 1 oración cálida reconoce 1-2 temas concretos que emergieron (sin lenguaje clínico, sin nombrar las dimensiones).
2. Pregunta si hay algo más que quiera compartir o algún tema que no hayan tocado.
- Máximo 3 oraciones. Tono íntimo, segunda persona.
- Sé específico con lo que el paciente mencionó — NO uses frases genéricas como "has compartido mucho".
- Ejemplo: "Lo que describes sobre la tensión en el trabajo y la sensación de distancia en casa forma un cuadro muy claro. Antes de que lo destilemos juntos: ¿hay algo más que quieras contarme, o algún tema que sientas que no tuvimos espacio de tocar?"

Responde: { "done": true, "question": null, "reflection": null, "bridgeMessage": "..." }

─────────────────────────────────────────────────────────────
CASO 2 — Falta información importante (done: false):
─────────────────────────────────────────────────────────────

Identifica la dimensión AUSENTE más importante para este caso y genera UNA pregunta sobre ella.

"question":
  - Centrada en la dimensión AUSENTE prioritaria.
  - Empática, directa, segunda persona. Máximo 15 palabras.
  - NO repetir lo ya preguntado. NO respondible con sí/no.
  - Ejemplos por dimensión:
    EMOCIÓN: "¿Qué sientes por dentro cuando eso ocurre — miedo, rabia, tristeza...?"
    CUERPO: "¿Dónde lo notas en el cuerpo cuando piensas en eso?"
    TIEMPO: "¿Cuándo empezaste a sentirte así — fue gradual o hubo un momento específico?"
    RELACIÓN: "¿Hay alguien en tu vida que esté en el centro de todo esto?"
    CONDUCTA: "¿Qué has intentado hacer para manejarlo?"

"reflection": micro-reflejo empático ANTES de la pregunta (1-2 oraciones):
  - Reconoce la emoción o esfuerzo del paciente. Cálido y breve.
  - NO repetir literalmente lo que el paciente dijo.
  - Ejemplo: "Lo que describes suena realmente agotador. Gracias por confiarme algo así."

Responde: { "done": false, "question": "...", "reflection": "...", "bridgeMessage": null }

─────────────────────────────────────────────────────────────
Responde SOLO con un objeto JSON con esa estructura exacta.
─────────────────────────────────────────────────────────────
  ${getLanguageInstruction(params.locale)}`;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    content = response.choices[0]?.message?.content || '{"done": true, "question": null, "reflection": null, "bridgeMessage": null}';
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  const done = parsed.done === true;
  return {
    done,
    question: !done && typeof parsed.question === 'string' ? parsed.question : null,
    reflection: !done && typeof parsed.reflection === 'string' ? parsed.reflection : null,
    bridgeMessage: done && typeof parsed.bridgeMessage === 'string' ? parsed.bridgeMessage : null,
  };
}
