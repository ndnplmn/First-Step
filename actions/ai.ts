'use server';

import Groq from 'groq-sdk';
import { THEORIES_DICTIONARY } from '@/lib/theories';
import { Patient, Conflict, Memory, TheoryMatch, Interpretation, Closure, LifeChanges } from '@/lib/types';
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

// --- ACTION 1: Sintetizar conflictos y mapear a teoria ---
export async function synthesizeConflicts(
  rawConflicts: string[],
  patient: Patient,
  lifeChanges?: LifeChanges
): Promise<{ conflicts: Conflict[]; theoryMatch: TheoryMatch; unmapped: string[] }> {
  const prompt = `
    Analiza los siguientes motivos de consulta de un paciente.

    Motivos: ${rawConflicts.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

    Contexto del paciente:
    ${buildPatientContext(patient, lifeChanges)}

    Diccionario de Teorias Terapeuticas:
    ${THEORIES_DICTIONARY}

    Para cada motivo:
    1. Sintetizalo en 2-3 palabras descriptivas (ej: "Rebeldia con autoridad")
    2. Identifica la teoria y subcategoria que mejor encaja

    Luego:
    3. Determina la teoria DOMINANTE del caso
    4. Lista cualquier frase que NO encaje en ninguna teoria

    Responde SOLO con un objeto JSON con esta estructura exacta:
    {
      "conflicts": [
        { "raw": "...", "synthesized": "...", "theoryKey": "psychoanalytic|psychodynamic|cbt|dbt|act|gestalt|systemic|humanistic|existential|attachment|narrative|solutionfocused|interpersonal|emotionallyfocused|transpersonal|adlerian|logotherapy", "subCategory": "..." }
      ],
      "dominantTheory": {
        "key": "psychoanalytic|psychodynamic|cbt|dbt|act|gestalt|systemic|humanistic|existential|attachment|narrative|solutionfocused|interpersonal|emotionallyfocused|transpersonal|adlerian|logotherapy",
        "name": "...",
        "subCategory": "...",
        "confidence": 0.0
      },
      "unmapped": ["..."]
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
    theoryMatch: parsed.dominantTheory as TheoryMatch,
    unmapped: parsed.unmapped || [],
  };
}

// --- ACTION 2: Extraer keywords de un recuerdo ---
export async function extractMemoryKeywords(
  memory: { raw: string; feelingThen: string; feelingNow: string },
  theoryKey: string,
  theorySubCategory: string
): Promise<string[]> {
  const prompt = `
    Un paciente ha descrito el siguiente recuerdo en el contexto de la teoria ${theoryKey} (${theorySubCategory}):

    Suceso: "${memory.raw}"
    Sentimiento entonces: "${memory.feelingThen}"
    Sentimiento ahora: "${memory.feelingNow}"

    Extrae 3-5 palabras clave emocionales o tematicas del recuerdo que sean relevantes para esta teoria.

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
  theoryMatch: TheoryMatch;
  memories: Memory[];
  patient: Patient;
  lifeChanges?: LifeChanges;
}): Promise<Interpretation> {
  const { conflicts, theoryMatch, memories } = params;

  const prompt = `
    Eres un psicoterapeuta magistral con profundo conocimiento de la ${theoryMatch.name}.

    Teoria base: ${theoryMatch.name} — ${theoryMatch.subCategory}

    Contexto del paciente:
    ${buildPatientContext(params.patient, params.lifeChanges)}

    Conflictos del paciente:
    ${conflicts.map(c => `- ${c.synthesized}`).join('\n')}

    Recuerdos del paciente:
    ${memories.map(m => `
    Suceso: "${m.raw}"
    Sentimiento entonces: "${m.feelingThen}"
    Sentimiento ahora: "${m.feelingNow}"
    Palabras clave: ${m.keywords.join(', ')}
    `).join('\n---\n')}

    Genera una interpretacion clinica profunda y reveladora.
    - Dirigete directamente al paciente (segunda persona "tu")
    - Conecta sus recuerdos con su conflicto actual basandote en la teoria
    - Usa lenguaje accesible, no tecnico
    - Minimo 3 parrafos, maximo 5
    - Se empatico, no juzgues
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
  theoryMatch: TheoryMatch;
  memories: Memory[];
  interpretation: string;
  patient: Patient;
}): Promise<Closure> {
  const { conflicts, theoryMatch, interpretation } = params;

  const prompt = `
    Eres un psicoterapeuta magistral.

    El paciente tiene estos conflictos: ${conflicts.map(c => c.synthesized).join(', ')}
    Teoria: ${theoryMatch.name} — ${theoryMatch.subCategory}

    Contexto del paciente:
    ${buildPatientContext(params.patient)}

    Se le ha dado esta interpretacion:
    "${interpretation}"

    Ahora genera un CIERRE SIMBOLICO. Es un texto de 2 partes separadas por una línea en blanco:

    PARTE 1 (3-5 oraciones):
    1. Quite el peso de la culpa al paciente
    2. Reencuadre la fantasia o sentimiento negativo como una necesidad humana comprensible
    3. Le de una nueva perspectiva sanadora
    4. Use lenguaje poetico, caloroso, directo al paciente ("tu")

    PARTE 2 (2-3 oraciones):
    - Hazle saber con calidez que este es apenas el primer paso de un proceso
    - Que cada sesión que continúe va a profundizar más en su historia y permitirá llegar a conclusiones más precisas sobre su conflicto
    - Que el autoconocimiento es un camino que se recorre poco a poco, y que volver es parte de cuidarse

    NO expliques teorias. Solo habla al corazon del paciente.
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
  theoryMatch: TheoryMatch;
  closure: string;
}): Promise<string[]> {
  const { conflicts, theoryMatch, closure } = params;

  const prompt = `
    Eres un psicoterapeuta que acaba de completar una sesion con un paciente.

    El paciente trabajó con la teoria ${theoryMatch.name} (${theoryMatch.subCategory}).
    Sus conflictos principales fueron: ${conflicts.map(c => c.synthesized).join(', ')}.
    El cierre simbolico que recibio fue:
    "${closure}"

    Genera exactamente 3 preguntas de reflexion profunda y personalizada para que el paciente
    lleve consigo despues de la sesion. Las preguntas deben:
    - Surgir directamente de sus conflictos y teoria especifica
    - Invitar a la contemplacion sin requerir respuesta inmediata
    - Usar segunda persona singular ("¿Que sientes cuando...", "¿En que momentos...")
    - Ser abiertas, no retorias ni con respuesta obvia
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

// --- ACTION 6: Generar estrategias prácticas para el día a día ---
export async function generateStrategies(params: {
  conflicts: Conflict[];
  theoryMatch: TheoryMatch;
  interpretation: string;
  patient: Patient;
}): Promise<{ title: string; description: string }[]> {
  const { conflicts, theoryMatch, interpretation } = params;

  const prompt = `
    Eres un psicoterapeuta experto en ${theoryMatch.name} (${theoryMatch.subCategory}).

    Contexto del paciente:
    ${buildPatientContext(params.patient)}

    El paciente tiene estos conflictos: ${conflicts.map(c => c.synthesized).join(', ')}

    Se le ha dado esta interpretación:
    "${interpretation}"

    Genera exactamente 3 ESTRATEGIAS PRÁCTICAS que el paciente pueda aplicar en su vida diaria para confrontar su problema. Las estrategias deben:
    - Ser concretas, realizables y específicas (no genéricas como "medita" o "haz ejercicio")
    - Estar fundamentadas en la teoría ${theoryMatch.name} pero explicadas en lenguaje cotidiano
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
}): Promise<{ done: boolean; question: string | null }> {
  const { allInputs, questionsAsked } = params;

  const prompt = `
    Eres un psicoterapeuta experto realizando una primera sesión de evaluación.

    El paciente ha compartido lo siguiente:
    ${allInputs.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

    ${questionsAsked.length > 0 ? `Ya has preguntado:\n${questionsAsked.map((q, i) => `${i + 1}. "${q}"`).join('\n')}` : ''}

    Contexto del paciente:
    ${buildPatientContext(params.patient, params.lifeChanges)}

    Para formular una buena interpretación clínica necesitas conocer:
    A) La emoción central detrás del conflicto (¿qué siente el paciente?)
    B) El impacto en su vida cotidiana (¿cómo le afecta?)
    C) La historia o contexto del conflicto (¿desde cuándo? ¿con quién?)

    Analiza si ya tienes suficiente información sobre estos tres aspectos para poder formular una interpretación clínica profunda y personalizada.

    Si ya tienes suficiente información (el paciente ya describió los tres aspectos con claridad): responde { "done": true, "question": null }

    Si aún te falta información importante: responde con la UNA pregunta más importante que necesitas hacer para completar tu comprensión. La pregunta debe:
    - Centrarse en el aspecto que más te falta (A, B o C)
    - Ser empática, directa, en segunda persona
    - Tener máximo 15 palabras
    - NO repetir lo que ya preguntaste
    - NO ser respondible con sí/no

    Responde SOLO con un JSON: { "done": true/false, "question": "..." o null }
  `;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    content = response.choices[0]?.message?.content || '{"done": true, "question": null}';
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  return {
    done: parsed.done === true,
    question: typeof parsed.question === 'string' ? parsed.question : null,
  };
}
