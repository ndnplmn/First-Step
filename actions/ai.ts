'use server';

import Groq from 'groq-sdk';
import { THEORIES_DICTIONARY } from '@/lib/theories';
import { Conflict, Memory, TheoryMatch, Interpretation, Closure } from '@/lib/types';
import { generateId } from '@/lib/id';

const getAI = () => new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

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
  rawConflicts: string[]
): Promise<{ conflicts: Conflict[]; theoryMatch: TheoryMatch; unmapped: string[] }> {
  const prompt = `
    Analiza los siguientes motivos de consulta de un paciente.

    Motivos: ${rawConflicts.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

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
        { "raw": "...", "synthesized": "...", "theoryKey": "psychoanalytic|cbt|gestalt|systemic", "subCategory": "..." }
      ],
      "dominantTheory": {
        "key": "psychoanalytic|cbt|gestalt|systemic",
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
}): Promise<Interpretation> {
  const { conflicts, theoryMatch, memories } = params;

  const prompt = `
    Eres un psicoterapeuta magistral con profundo conocimiento de la ${theoryMatch.name}.

    Teoria base: ${theoryMatch.name} — ${theoryMatch.subCategory}

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
}): Promise<Closure> {
  const { conflicts, theoryMatch, interpretation } = params;

  const prompt = `
    Eres un psicoterapeuta magistral.

    El paciente tiene estos conflictos: ${conflicts.map(c => c.synthesized).join(', ')}
    Teoria: ${theoryMatch.name} — ${theoryMatch.subCategory}

    Se le ha dado esta interpretacion:
    "${interpretation}"

    Ahora genera un CIERRE SIMBOLICO. Es un parrafo corto (3-5 oraciones) que:
    1. Quite el peso de la culpa al paciente
    2. Reencuadre la fantasia o sentimiento negativo como una necesidad humana comprensible
    3. Le de una nueva perspectiva sanadora
    4. Use lenguaje poetico, caloroso, directo al paciente ("tu")

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
