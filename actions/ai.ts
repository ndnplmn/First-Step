'use server';

import Groq from 'groq-sdk';
import { FRAMEWORKS_DICTIONARY, GESTALT_ACTIVITIES } from '@/lib/theories';
import { Patient, Conflict, Memory, FrameworkMatch, GestaltActivity, Interpretation, Closure, LifeChanges, Stage3Type } from '@/lib/types';
import { generateId } from '@/lib/id';

const getAI = () => new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

function buildPatientContext(patient: Patient, lifeChanges?: LifeChanges, sessionIntention?: string): string {
  const lines = [
    `Nombre: ${patient.name}, ${patient.age} años, ${patient.gender}`,
    `Estado civil: ${patient.maritalStatus}`,
    patient.hasChildren ? `Hijos: ${patient.childrenCount || 'sí'}` : 'Sin hijos',
    `Vive: ${patient.livingSituation}${patient.livingSituationDetail ? ` (${patient.livingSituationDetail})` : ''}`,
    `Ocupación: ${patient.employment}${patient.occupation ? ` — ${patient.occupation}` : ''}`,
    patient.hasSupportNetwork
      ? `Red de apoyo: sí${patient.supportDescription ? ` (${patient.supportDescription})` : ''}`
      : 'Sin red de apoyo identificada',
    patient.previousTherapy
      ? `Terapia previa: sí${patient.previousTherapyDetail ? ` (${patient.previousTherapyDetail})` : ''}`
      : 'Sin terapia previa',
    patient.takingMedication
      ? `Medicación: sí${patient.medicationDetail ? ` (${patient.medicationDetail})` : ''}`
      : 'Sin medicación',
    `Motivo de consulta: ${patient.consultationReason}`,
  ];

  if (lifeChanges && lifeChanges.categories.length > 0) {
    lines.push(`Cambios recientes en su vida: ${lifeChanges.categories.join(', ')}${lifeChanges.detail ? `. Detalle: ${lifeChanges.detail}` : ''}`);
  }

  if (sessionIntention) {
    lines.push(`Intención para esta sesión: "${sessionIntention}"`);
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

function formatFrameworks(matches: FrameworkMatch[]): string {
  return matches.map((m, i) => `${i === 0 ? 'Marco primario' : 'Marco secundario'}: ${m.name} — ${m.focus}`).join('\n');
}

// --- ACTION 1: Sintetizar conflictos y mapear a marco terapeutico clasico ---
export async function synthesizeConflicts(
  rawConflicts: string[],
  patient: Patient,
  lifeChanges?: LifeChanges,
  sessionIntention?: string
): Promise<{ conflicts: Conflict[]; frameworkMatches: FrameworkMatch[]; gestaltActivity: GestaltActivity | null; stage3Type: Stage3Type; unmappedPhrases: string[]; narrativeSummary: string }> {
  const frameworksDesc = Object.entries(FRAMEWORKS_DICTIONARY)
    .map(([key, fw]) => `- ${key}: ${fw.name} — ${fw.description}`)
    .join('\n');

  const gestaltActivitiesDesc = Object.entries(GESTALT_ACTIVITIES)
    .map(([key, act]) => `- ${key}: ${act.title} — ${act.description}`)
    .join('\n');

  const prompt = `
    Analiza los siguientes motivos de consulta de un paciente y mápalos al marco terapéutico clásico más adecuado.

    Motivos: ${rawConflicts.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

    Contexto del paciente:
    ${buildPatientContext(patient, lifeChanges, sessionIntention)}

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
  `;

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
  frameworks: string
): Promise<string[]> {
  const prompt = `
    Un paciente ha descrito el siguiente recuerdo en el contexto del siguiente marco terapéutico:

    ${frameworks}

    Suceso: "${memory.raw}"
    Sentimiento entonces: "${memory.feelingThen}"
    Sentimiento ahora: "${memory.feelingNow}"

    Extrae 3-5 palabras clave emocionales o temáticas del recuerdo que sean relevantes para el marco terapéutico del caso.

    Responde SOLO con un objeto JSON: { "keywords": ["palabra1", "palabra2", ...] }
  `;

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
}): Promise<Interpretation> {
  const { conflicts, frameworkMatches, memories } = params;

  const prompt = `
    Eres un psicoterapeuta magistral que integra múltiples marcos terapéuticos.

    Combinación de marcos para este caso:
    ${formatFrameworks(frameworkMatches)}

    Contexto del paciente:
    ${buildPatientContext(params.patient, params.lifeChanges)}

    Conflictos del paciente:
    ${conflicts.map(c => `- ${c.synthesized} (${c.frameworkKey}: ${c.subCategory})`).join('\n')}

    Recuerdos del paciente:
    ${memories.map(m => `
    Suceso: "${m.raw}"
    Sentimiento entonces: "${m.feelingThen}"
    Sentimiento ahora: "${m.feelingNow}"
    Palabras clave: ${m.keywords.join(', ')}
    `).join('\n---\n')}

    Genera una interpretación clínica profunda y reveladora desde el marco terapéutico elegido.
    Los marcos posibles son: Psicoanálisis Freudiano, Terapia Bioenergética, Psicología Individual de Adler, Terapia Gestalt, Sensibilización Sistemática Conductual.
    Sigue esta secuencia clínica (Fase 2 — Procesamiento Emocional):
    1. Conecta los recuerdos con los conflictos actuales desde el marco primario
    2. Si hay un marco secundario, enriquece la comprensión con esa perspectiva complementaria
    3. Integra el plano emocional y corporal según corresponda al marco elegido

    Reglas:
    - Dirígete directamente al paciente (segunda persona "tú")
    - Conecta sus recuerdos con su conflicto actual desde la lente del marco terapéutico
    - Usa lenguaje accesible, no técnico
    - Mínimo 3 párrafos, máximo 5
    - Sé empático, no juzgues
    - NO nombres las teorías por su nombre técnico — habla desde ellas, no sobre ellas
  `;

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

// --- ACTION 4: Generar cierre simbolico ---
export async function generateClosure(params: {
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  memories: Memory[];
  interpretation: string;
  gestaltActivity: GestaltActivity | null;
  patient: Patient;
}): Promise<Closure> {
  const { conflicts, frameworkMatches, interpretation, gestaltActivity } = params;

  const prompt = `
    Eres un psicoterapeuta magistral.

    El paciente tiene estos conflictos: ${conflicts.map(c => c.synthesized).join(', ')}
    Marcos terapéuticos (de entre: Psicoanálisis Freudiano, Terapia Bioenergética, Psicología Individual de Adler, Terapia Gestalt, Sensibilización Sistemática Conductual):
    ${formatFrameworks(frameworkMatches)}

    Contexto del paciente:
    ${buildPatientContext(params.patient)}

    Se le ha dado esta interpretación:
    "${interpretation}"

    ${gestaltActivity ? `Actividad Gestalt preparada para el paciente:\nTipo: ${gestaltActivity.type}\nTítulo: "${gestaltActivity.title}"\nDescripción: "${gestaltActivity.description}"` : ''}

    Ahora genera una CARTA PERSONAL al paciente. El formato es epistolar — como una carta íntima de alguien que realmente lo escuchó.

    FORMATO:
    - Empieza con "Querido/a ${params.patient.name},"
    - Escribe en primera persona como el terapeuta
    - 3 párrafos separados por una línea en blanco:

    PÁRRAFO 1 (3-5 oraciones):
    Quita el peso de la culpa. Reencuadra su sentimiento negativo como una necesidad humana comprensible. Dale una nueva perspectiva sanadora. Usa lenguaje poético y cálido.

    PÁRRAFO 2 (2-3 oraciones):
    Prepáralo para la siguiente fase de exploración que viene. Menciónala como una invitación cálida a ir más profundo. Conecta esta fase con lo que se ha trabajado.

    PÁRRAFO 3 (2-3 oraciones):
    Hazle saber que este es apenas el primer paso. Que cada sesión profundizará más. Que volver es parte de cuidarse.

    - Cierra con una línea en blanco y luego exactamente:
    Con cariño,
    Tu primer paso

    NO expliques teorías. Habla al corazón.
  `;

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
}): Promise<string[]> {
  const { conflicts, frameworkMatches, closure } = params;

  const prompt = `
    Eres un psicoterapeuta que acaba de completar una sesión con un paciente.

    El paciente trabajó con el siguiente marco terapéutico:
    ${formatFrameworks(frameworkMatches)}

    Sus conflictos principales fueron: ${conflicts.map(c => c.synthesized).join(', ')}.
    El cierre simbólico que recibió fue:
    "${closure}"

    Genera exactamente 3 preguntas de reflexión profunda y personalizada para que el paciente
    lleve consigo después de la sesión. Las preguntas deben:
    - Surgir directamente de sus conflictos y el marco terapéutico del caso
    - Al menos una pregunta debe invitar a la exploración emocional o corporal relevante para el marco terapéutico
    - Invitar a la contemplación sin requerir respuesta inmediata
    - Usar segunda persona singular ("¿Qué sientes cuando...", "¿En qué momentos...")
    - Ser abiertas, no retóricas ni con respuesta obvia
    - Tener entre 10 y 25 palabras cada una

    Responde SOLO con un objeto JSON: { "questions": ["...", "...", "..."] }
  `;

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

// --- ACTION 6: Generar estrategias practicas para el dia a dia ---
export async function generateStrategies(params: {
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  interpretation: string;
  gestaltActivity: GestaltActivity | null;
  patient: Patient;
}): Promise<{ title: string; description: string }[]> {
  const { conflicts, frameworkMatches, interpretation, gestaltActivity } = params;

  const prompt = `
    Eres un psicoterapeuta experto que integra múltiples marcos terapéuticos.

    Marcos del caso:
    ${formatFrameworks(frameworkMatches)}

    Contexto del paciente:
    ${buildPatientContext(params.patient)}

    El paciente tiene estos conflictos: ${conflicts.map(c => c.synthesized).join(', ')}

    Se le ha dado esta interpretación:
    "${interpretation}"

    ${gestaltActivity ? `Actividad Gestalt del caso:\nTipo: ${gestaltActivity.type}\nTítulo: "${gestaltActivity.title}"\nDescripción: "${gestaltActivity.description}"` : ''}

    Genera exactamente 3 ESTRATEGIAS PRÁCTICAS que el paciente pueda aplicar en su vida diaria para confrontar su problema. Las estrategias deben:
    - Derivar del marco terapéutico principal (y secundario si hay) del caso
    - Al menos una estrategia debe invitar al awareness emocional o corporal
    - Ser concretas, realizables y específicas (no genéricas como "medita" o "haz ejercicio")
    - Estar fundamentadas en los marcos pero explicadas en lenguaje cotidiano
    - Incluir un título corto (3-5 palabras) y una descripción práctica (2-3 oraciones max)
    - Ser acciones que pueda empezar hoy mismo, sin necesidad de un terapeuta presente
    - Dirigirse al paciente en segunda persona ("cuando sientas...", "intenta...")
    - Relacionarse directamente con los conflictos específicos del paciente

    Responde SOLO con un objeto JSON: { "strategies": [{ "title": "...", "description": "..." }, ...] }
  `;

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

// --- ACTION 7: Pregunta adaptativa del terapeuta ---
// Evalúa si la IA ya tiene suficiente información para formular su análisis.
// Si no, devuelve la pregunta más importante que falta. Si sí, devuelve done: true.
export async function getNextTherapistQuestion(params: {
  allInputs: string[];       // todo lo que el paciente ha compartido hasta ahora
  questionsAsked: string[];  // preguntas ya realizadas (evitar repetir)
  patient: Patient;
  lifeChanges?: LifeChanges;
  sessionIntention?: string;
}): Promise<{ done: boolean; question: string | null; reflection: string | null; bridgeMessage: string | null }> {
  const { allInputs, questionsAsked } = params;

  const prompt = `
    Eres un psicoterapeuta experto realizando una primera sesión de evaluación.

    El paciente ha compartido lo siguiente:
    ${allInputs.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

    ${questionsAsked.length > 0 ? `Ya has preguntado:\n${questionsAsked.map((q, i) => `${i + 1}. "${q}"`).join('\n')}` : ''}

    Contexto del paciente:
    ${buildPatientContext(params.patient, params.lifeChanges, params.sessionIntention)}

    Para formular una buena interpretación clínica necesitas explorar la siguiente secuencia clínica:
    A) Regulación: ¿Qué siente el paciente ahora? ¿Cómo afecta su cuerpo? (sensaciones, tensión, malestar físico)
    B) Procesamiento emocional: ¿Qué emociones hay debajo? ¿Desde cuándo las siente? ¿Con quién se conectan?
    C) Cambio conductual: ¿Cómo impacta su vida cotidiana? ¿Qué ha intentado hacer al respecto?

    Según el marco terapéutico que emerja del caso, orienta tus preguntas así:
    - freudiano: invita a explorar recuerdos tempranos, sueños y patrones repetitivos
    - bioenergetico: invita al paciente a notar sensaciones corporales y dónde siente las emociones físicamente
    - adleriano: explora el contexto familiar, las relaciones fraternales y cómo la persona se compara con otros
    - gestalt: trabaja en el momento presente — ¿qué nota ahora mismo? ¿qué necesita completarse?
    - conductual: identifica situaciones específicas que generan ansiedad y conductas de evitación

    Analiza si ya tienes suficiente información sobre estos tres aspectos para poder formular una interpretación clínica profunda y personalizada.

    CASO 1 — Ya tienes suficiente información:
    Responde: done: true, question: null, reflection: null
    Y genera un "bridgeMessage" personalizado que:
    1. Reconozca en 1 oración cálida lo que el paciente compartió (menciona 1-2 temas concretos que emergieron, sin lenguaje clínico)
    2. Pregunte si hay algo más que quiera compartir o algún tema que no hayan tenido espacio de tocar
    - Máximo 3 oraciones en total
    - Tono íntimo, segunda persona
    - NO uses frases genéricas como "has compartido mucho" — sé específico con lo que el paciente realmente mencionó
    - Ejemplo: "Lo que describes sobre tu trabajo y la sensación de distancia en casa forma un cuadro muy claro. Antes de que lo destilemos juntos: ¿hay algo más que quieras contarme, o algún tema que sientas que no tuvimos espacio de tocar?"

    CASO 2 — Aún te falta información importante:
    Responde: done: false, bridgeMessage: null
    Y genera:
    - "question": la UNA pregunta más importante que necesitas hacer. Debe:
      - Centrarse en el aspecto que más te falta (A, B o C)
      - Ser empática, directa, en segunda persona
      - Tener máximo 15 palabras
      - NO repetir lo que ya preguntaste
      - NO ser respondible con sí/no
    - "reflection": un micro-reflejo empático de 1-2 oraciones que valide lo que el paciente acaba de compartir ANTES de la pregunta. El reflejo debe:
      - Reconocer la emoción o el esfuerzo del paciente
      - Ser cálido y breve (máximo 2 oraciones)
      - NO repetir lo que el paciente dijo literalmente
      - Ejemplo: "Lo que describes suena realmente pesado. Gracias por confiarme algo así."

    Responde SOLO con un JSON: { "done": true/false, "question": "..." o null, "reflection": "..." o null, "bridgeMessage": "..." o null }
  `;

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
