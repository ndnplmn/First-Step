'use server';

import Groq from 'groq-sdk';
import { FRAMEWORKS_DICTIONARY, SITUATION_MAPPING, GESTALT_ACTIVITIES } from '@/lib/theories';
import { Patient, Conflict, Memory, FrameworkMatch, GestaltActivity, Interpretation, Closure, LifeChanges } from '@/lib/types';
import { generateId } from '@/lib/id';

const getAI = () => new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

function buildPatientContext(patient: Patient, lifeChanges?: LifeChanges): string {
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
  return matches.map(m => `${m.role === 'primary' ? 'Marco primario' : m.role === 'secondary' ? 'Marco secundario' : 'Marco Gestalt'}: ${m.name} — ${m.focus}`).join('\n');
}

// --- ACTION 1: Sintetizar conflictos y mapear a combinacion de marcos terapeuticos ---
export async function synthesizeConflicts(
  rawConflicts: string[],
  patient: Patient,
  lifeChanges?: LifeChanges
): Promise<{ conflicts: Conflict[]; frameworkMatches: FrameworkMatch[]; gestaltActivity: GestaltActivity; unmapped: string[]; narrativeSummary: string }> {
  const prompt = `
    Analiza los siguientes motivos de consulta de un paciente y mapéalos a una COMBINACIÓN de marcos terapéuticos.

    Motivos: ${rawConflicts.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

    Contexto del paciente:
    ${buildPatientContext(patient, lifeChanges)}

    Diccionario de Marcos Terapéuticos:
    ${FRAMEWORKS_DICTIONARY}

    Mapeo de Situaciones a Marcos:
    ${SITUATION_MAPPING}

    Catálogo de Actividades Gestalt:
    ${GESTALT_ACTIVITIES}

    Para cada motivo:
    1. Sintetízalo en 2-3 palabras descriptivas (ej: "Rebeldía con autoridad")
    2. Identifica el marco terapéutico (frameworkKey) y subcategoría que mejor encaja

    Luego:
    3. Determina la COMBINACIÓN de 3 marcos para el caso:
       - primary: el marco principal que guía la intervención
       - secondary: un marco complementario que enriquece
       - gestalt: SIEMPRE Terapia Gestalt como tercer marco de profundización
    4. Selecciona una actividad Gestalt concreta del catálogo, con tipo, título, descripción y prompt de facilitación personalizado al caso
    5. Lista cualquier frase que NO encaje en ningún marco
    6. Genera un "narrativeSummary": 2-3 oraciones en lenguaje cálido y accesible que describan el enfoque terapéutico SIN nombrar ninguna teoría ni marco. Habla directamente al paciente en segunda persona. Ejemplo: "Vamos a explorar cómo tus pensamientos influyen en lo que sientes, conectándolo con experiencias que te marcaron, y prestando atención a lo que tu cuerpo y emociones te dicen."

    Responde SOLO con un objeto JSON con esta estructura exacta:
    {
      "conflicts": [
        { "raw": "...", "synthesized": "...", "frameworkKey": "tcc|tg3|dbt|apego_trauma|psicodinamico|integrativo|gestalt", "subCategory": "..." }
      ],
      "frameworkMatches": [
        { "key": "tcc|tg3|dbt|apego_trauma|psicodinamico|integrativo|gestalt", "role": "primary", "name": "...", "focus": "...", "confidence": 0.0 },
        { "key": "tcc|tg3|dbt|apego_trauma|psicodinamico|integrativo|gestalt", "role": "secondary", "name": "...", "focus": "...", "confidence": 0.0 },
        { "key": "gestalt", "role": "gestalt", "name": "Terapia Gestalt", "focus": "...", "confidence": 1.0 }
      ],
      "gestaltActivity": {
        "type": "silla_vacia|polaridades|awareness_corporal|experimento|dialogo_interno",
        "title": "...",
        "description": "...",
        "prompt": "..."
      },
      "unmapped": ["..."],
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

  return {
    conflicts,
    frameworkMatches: parsed.frameworkMatches as FrameworkMatch[],
    gestaltActivity: parsed.gestaltActivity as GestaltActivity,
    unmapped: parsed.unmapped || [],
    narrativeSummary: parsed.narrativeSummary || '',
  };
}

// --- ACTION 2: Extraer keywords de un recuerdo ---
export async function extractMemoryKeywords(
  memory: { raw: string; feelingThen: string; feelingNow: string },
  frameworks: string
): Promise<string[]> {
  const prompt = `
    Un paciente ha descrito el siguiente recuerdo en el contexto de la siguiente combinación de marcos terapéuticos:

    ${frameworks}

    Suceso: "${memory.raw}"
    Sentimiento entonces: "${memory.feelingThen}"
    Sentimiento ahora: "${memory.feelingNow}"

    Extrae 3-5 palabras clave emocionales o temáticas del recuerdo que sean relevantes para esta combinación de marcos.

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

    Genera una interpretación clínica profunda y reveladora que integre los tres marcos.
    Sigue esta secuencia clínica (Fase 2 — Procesamiento Emocional):
    1. Conecta los recuerdos con los conflictos actuales desde el marco primario
    2. Enriquece la comprensión con la perspectiva del marco secundario
    3. Señala cómo el awareness Gestalt (cuerpo, emociones, contacto) profundiza la comprensión

    Reglas:
    - Dirígete directamente al paciente (segunda persona "tú")
    - Conecta sus recuerdos con su conflicto actual integrando las tres perspectivas
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
  gestaltActivity: GestaltActivity;
  patient: Patient;
}): Promise<Closure> {
  const { conflicts, frameworkMatches, interpretation, gestaltActivity } = params;

  const prompt = `
    Eres un psicoterapeuta magistral.

    El paciente tiene estos conflictos: ${conflicts.map(c => c.synthesized).join(', ')}
    Marcos terapéuticos:
    ${formatFrameworks(frameworkMatches)}

    Contexto del paciente:
    ${buildPatientContext(params.patient)}

    Se le ha dado esta interpretación:
    "${interpretation}"

    Actividad Gestalt preparada para el paciente:
    Tipo: ${gestaltActivity.type}
    Título: "${gestaltActivity.title}"
    Descripción: "${gestaltActivity.description}"

    Ahora genera una CARTA PERSONAL al paciente. El formato es epistolar — como una carta íntima de alguien que realmente lo escuchó.

    FORMATO:
    - Empieza con "Querido/a ${params.patient.name},"
    - Escribe en primera persona como el terapeuta
    - 3 párrafos separados por una línea en blanco:

    PÁRRAFO 1 (3-5 oraciones):
    Quita el peso de la culpa. Reencuadra su sentimiento negativo como una necesidad humana comprensible. Dale una nueva perspectiva sanadora. Usa lenguaje poético y cálido.

    PÁRRAFO 2 (2-3 oraciones):
    Prepáralo para la actividad Gestalt que viene. Menciónala como una invitación cálida a explorar más profundo. Conecta la actividad con lo que se ha trabajado.

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

    El paciente trabajó con esta combinación de marcos:
    ${formatFrameworks(frameworkMatches)}

    Sus conflictos principales fueron: ${conflicts.map(c => c.synthesized).join(', ')}.
    El cierre simbólico que recibió fue:
    "${closure}"

    Genera exactamente 3 preguntas de reflexión profunda y personalizada para que el paciente
    lleve consigo después de la sesión. Las preguntas deben:
    - Surgir directamente de sus conflictos y la combinación de marcos
    - Al menos una pregunta debe invitar al awareness corporal o emocional (perspectiva Gestalt)
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
  gestaltActivity: GestaltActivity;
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

    Actividad Gestalt del caso:
    Tipo: ${gestaltActivity.type}
    Título: "${gestaltActivity.title}"
    Descripción: "${gestaltActivity.description}"

    Genera exactamente 3 ESTRATEGIAS PRÁCTICAS que el paciente pueda aplicar en su vida diaria para confrontar su problema. Las estrategias deben:
    - Derivar de la COMBINACIÓN de los tres marcos (primario, secundario y Gestalt)
    - Al menos una estrategia debe estar relacionada con la actividad Gestalt o el awareness corporal/emocional
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
}): Promise<{ done: boolean; question: string | null; reflection: string | null }> {
  const { allInputs, questionsAsked } = params;

  const prompt = `
    Eres un psicoterapeuta experto realizando una primera sesión de evaluación.

    El paciente ha compartido lo siguiente:
    ${allInputs.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

    ${questionsAsked.length > 0 ? `Ya has preguntado:\n${questionsAsked.map((q, i) => `${i + 1}. "${q}"`).join('\n')}` : ''}

    Contexto del paciente:
    ${buildPatientContext(params.patient, params.lifeChanges)}

    Para formular una buena interpretación clínica necesitas explorar la siguiente secuencia clínica:
    A) Regulación: ¿Qué siente el paciente ahora? ¿Cómo afecta su cuerpo? (sensaciones, tensión, malestar físico)
    B) Procesamiento emocional: ¿Qué emociones hay debajo? ¿Desde cuándo las siente? ¿Con quién se conectan?
    C) Cambio cognitivo-conductual: ¿Cómo impacta su vida cotidiana? ¿Qué ha intentado hacer al respecto?

    Analiza si ya tienes suficiente información sobre estos tres aspectos para poder formular una interpretación clínica profunda y personalizada.

    Si ya tienes suficiente información (el paciente ya describió los tres aspectos con claridad): responde { "done": true, "question": null, "reflection": null }

    Si aún te falta información importante: responde con la UNA pregunta más importante que necesitas hacer para completar tu comprensión. La pregunta debe:
    - Centrarse en el aspecto que más te falta (A, B o C)
    - Ser empática, directa, en segunda persona
    - Tener máximo 15 palabras
    - NO repetir lo que ya preguntaste
    - NO ser respondible con sí/no

    Además, incluye un "reflection": un micro-reflejo empático de 1-2 oraciones que valide lo que el paciente acaba de compartir ANTES de la pregunta. El reflejo debe:
    - Reconocer la emoción o el esfuerzo del paciente
    - Ser cálido y breve (máximo 2 oraciones)
    - NO repetir lo que el paciente dijo literalmente
    - Ejemplo: "Lo que describes suena realmente pesado. Gracias por confiarme algo así."

    Responde SOLO con un JSON: { "done": true/false, "question": "..." o null, "reflection": "..." o null }
  `;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    content = response.choices[0]?.message?.content || '{"done": true, "question": null, "reflection": null}';
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  return {
    done: parsed.done === true,
    question: typeof parsed.question === 'string' ? parsed.question : null,
    reflection: typeof parsed.reflection === 'string' ? parsed.reflection : null,
  };
}
