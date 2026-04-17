'use server';

import Groq from 'groq-sdk';
import { FRAMEWORKS_DICTIONARY, GESTALT_ACTIVITIES } from '@/lib/theories';
import { Patient, Conflict, Memory, FrameworkMatch, GestaltActivity, Interpretation, Closure, LifeChanges, Stage3Type, WorkCard } from '@/lib/types';
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
  stage3Notes?: string;
}): Promise<Interpretation> {
  const { conflicts, frameworkMatches, memories } = params;

  const stage3Section = params.stage3Notes
    ? `\n    Notas de exploración del paciente (sesión experiencial):\n    ${params.stage3Notes}\n`
    : '';

  const prompt = `
    Eres un psicoterapeuta magistral que integra múltiples marcos terapéuticos.

    Combinación de marcos para este caso:
    ${formatFrameworks(frameworkMatches)}

    Contexto del paciente:
    ${buildPatientContext(params.patient, params.lifeChanges)}

    Conflictos del paciente:
    ${conflicts.map(c => `- ${c.synthesized} (${c.frameworkKey}: ${c.subCategory})`).join('\n')}

    Recuerdos del paciente:
    ${memories.length > 0 ? memories.map(m => `
    Suceso: "${m.raw}"
    Sentimiento entonces: "${m.feelingThen}"
    Sentimiento ahora: "${m.feelingNow}"
    Palabras clave: ${m.keywords.join(', ')}
    `).join('\n---\n') : '(Sin recuerdos trabajados en esta sesión)'}
${stage3Section}
    Genera una interpretación clínica breve, profunda y reveladora desde el marco terapéutico elegido.
    Los marcos posibles son: Psicoanálisis Freudiano, Terapia Bioenergética, Psicología Individual de Adler, Terapia Gestalt, Sensibilización Sistemática Conductual.

    Reglas:
    - Dirígete directamente al paciente (segunda persona "tú")
    - Conecta lo trabajado en sesión con su conflicto actual desde la lente del marco terapéutico
    - Si hay notas de exploración, integra los insights concretos que el paciente compartió
    - Usa lenguaje accesible, no técnico
    - EXACTAMENTE 1 párrafo. Solo 2 párrafos si el material trabajado lo justifica plenamente. Nunca más de 2.
    - Cada párrafo: máximo 4 oraciones. Ve directo al punto — sin preámbulos ni rodeos.
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
  deepWorkSynthesis?: string;
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
${params.deepWorkSynthesis
  ? `\nEl paciente también trabajó activamente durante la sesión y llegó a esto:\n"${params.deepWorkSynthesis}"\nReconoce este trabajo activo en la carta — menciónalo como un logro concreto de esta sesión.`
  : ''}

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
    Tend

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

// --- ACTION 5b: Generar tarjetas de trabajo activo ---
export async function generateWorkCards(params: {
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  reflectionQuestions: string[];
  interpretation: string;
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
  `;

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

// --- ACTION 5c: Respuesta terapéutica en modo resolutivo ---
export async function getDeepWorkResponse(params: {
  selectedCard: WorkCard;
  messages: { role: 'patient' | 'therapist'; text: string }[];
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  interpretation: string;
  patient: Patient;
}): Promise<{ done: boolean; response: string; synthesis?: string }> {
  const { selectedCard, messages, conflicts, frameworkMatches, interpretation, patient } = params;

  const patientTurns = messages.filter(m => m.role === 'patient').length;
  const forceClose = patientTurns >= 2;

  const history = messages.map(m =>
    `${m.role === 'therapist' ? 'Terapeuta' : 'Paciente'}: ${m.text}`
  ).join('\n');

  const prompt = `
Eres un psicoterapeuta en una sesión activa. Ya conoces al paciente a fondo y acabas de darle una interpretación. Ahora estás trabajando un punto específico con él/ella.

Paciente: ${buildPatientContext(patient)}
Conflictos: ${conflicts.map(c => c.synthesized).join(', ')}
Marco: ${formatFrameworks(frameworkMatches)}
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
  `;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.65,
    });
    content = response.choices[0]?.message?.content || '{"done":true,"response":"","synthesis":""}';
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  return {
    done: !!parsed.done,
    response: parsed.response ?? '',
    synthesis: parsed.synthesis ?? undefined,
  };
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
  allInputs: string[];
  questionsAsked: string[];
  patient: Patient;
  lifeChanges?: LifeChanges;
  sessionIntention?: string;
  forceClose?: boolean;
}): Promise<{ done: boolean; question: string | null; reflection: string | null; bridgeMessage: string | null }> {
  const { allInputs, questionsAsked } = params;

  const prompt = `
Eres un psicoterapeuta experto realizando una primera sesión de evaluación.

El paciente ha compartido lo siguiente:
${allInputs.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

${questionsAsked.length > 0 ? `Ya has preguntado:\n${questionsAsked.map((q, i) => `${i + 1}. "${q}"`).join('\n')}` : ''}

Contexto del paciente (ya conocido — NO preguntes sobre esto):
${buildPatientContext(params.patient, params.lifeChanges, params.sessionIntention)}

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
    CONDUCTA: "¿Qué has intentado hacer para salir de esto, aunque sea algo pequeño?"

"reflection": micro-reflejo empático ANTES de la pregunta (1-2 oraciones):
  - Reconoce la emoción o esfuerzo del paciente. Cálido y breve.
  - NO repetir literalmente lo que el paciente dijo.
  - Ejemplo: "Lo que describes suena realmente agotador. Gracias por confiarme algo así."

Responde: { "done": false, "question": "...", "reflection": "...", "bridgeMessage": null }

─────────────────────────────────────────────────────────────
Responde SOLO con un objeto JSON con esa estructura exacta.
─────────────────────────────────────────────────────────────
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
