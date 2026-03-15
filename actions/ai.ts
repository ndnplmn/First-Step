'use server';

import { GoogleGenAI, Type } from '@google/genai';
import { THEORIES_DICTIONARY } from '@/lib/theories';
import { Conflict, Memory, TheoryMatch, Interpretation, Closure } from '@/lib/types';
import { generateId } from '@/lib/id';

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = 'gemini-2.0-flash';

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
  `;

  const response = await getAI().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          conflicts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                raw: { type: Type.STRING },
                synthesized: { type: Type.STRING },
                theoryKey: { type: Type.STRING, enum: ['psychoanalytic', 'cbt', 'gestalt', 'systemic'] },
                subCategory: { type: Type.STRING },
              },
              required: ['raw', 'synthesized', 'theoryKey', 'subCategory'],
            },
          },
          dominantTheory: {
            type: Type.OBJECT,
            properties: {
              key: { type: Type.STRING, enum: ['psychoanalytic', 'cbt', 'gestalt', 'systemic'] },
              name: { type: Type.STRING },
              subCategory: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
            },
            required: ['key', 'name', 'subCategory', 'confidence'],
          },
          unmapped: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['conflicts', 'dominantTheory', 'unmapped'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');
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
    Retorna solo el array de strings, sin explicacion.
  `;

  const response = await getAI().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['keywords'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{"keywords":[]}');
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

  const response = await getAI().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
        },
        required: ['text'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const groundingSources = chunks
    .filter((c) => c.web?.uri && c.web?.title)
    .map((c) => ({ uri: c.web!.uri!, title: c.web!.title! }));

  return { text: parsed.text, groundingSources };
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

  const response = await getAI().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
        },
        required: ['text'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const groundingSources = chunks
    .filter((c) => c.web?.uri && c.web?.title)
    .map((c) => ({ uri: c.web!.uri!, title: c.web!.title! }));

  return { text: parsed.text, groundingSources };
}
