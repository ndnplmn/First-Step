import { GoogleGenAI, Type } from '@google/genai';
import { THEORIES_DICTIONARY } from '../lib/theories';
import { ExtractedData, ClinicalInsight } from '../types';

// Using the fast, free-tier friendly model
let ai: GoogleGenAI | null = null;
const MODEL = 'gemini-3-flash-preview';

const getAI = () => {
  if (!ai) {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is missing. La aplicación está en GitHub Pages sin una clave configurada.");
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
};

export const extractEntities = async (narrative: string): Promise<ExtractedData> => {
  const prompt = `
    Analiza la siguiente narrativa clínica de un paciente.
    
    Narrativa: "${narrative}"
    
    Diccionario de Teorías:
    ${THEORIES_DICTIONARY}
    
    Extrae la siguiente estructura:
    1. Evalúa si la narrativa tiene suficiente sustancia clínica (isValid). Si es muy corta, vaga o irrelevante, pon isValid en false y escribe un 'feedback' empático pidiendo más detalles.
    2. Si es válida, extrae los conflictos principales mencionados (2-3 palabras cada uno).
    3. La teoría psicológica que mejor encaja con el relato (usa el diccionario).
    4. Los recuerdos mencionados. Para cada recuerdo, infiere qué sintió en ese momento y qué siente ahora al contarlo basado en el texto.
    5. Extrae cualquier frase, queja o dato que NO encaje en la teoría principal o parezca ruido secundario en 'unmappedPhrases'.
  `;

  const response = await getAI().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isValid: { type: Type.BOOLEAN, description: "True si hay suficiente información clínica para analizar. False si el texto es muy vago." },
          feedback: { type: Type.STRING, description: "Si isValid es false, pregunta empática para que el paciente profundice. Si es true, dejar vacío." },
          conflicts: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Lista de conflictos en 2-3 palabras"
          },
          theory: { 
            type: Type.STRING,
            description: "Nombre de la teoría y etapa/concepto"
          },
          memories: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING, description: "Breve descripción del recuerdo" },
                feelingThen: { type: Type.STRING, description: "Emoción en el pasado" },
                feelingNow: { type: Type.STRING, description: "Emoción en el presente" }
              },
              required: ['description', 'feelingThen', 'feelingNow']
            }
          },
          unmappedPhrases: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Frases o datos secundarios que no encajan en la teoría principal."
          }
        },
        required: ['isValid', 'conflicts', 'theory', 'memories', 'unmappedPhrases']
      }
    }
  });

  return JSON.parse(response.text || '{}') as ExtractedData;
};

export const generateInsight = async (data: ExtractedData): Promise<ClinicalInsight> => {
  const prompt = `
    Eres un psicoterapeuta magistral.
    
    Teoría base: ${data.theory}
    Conflictos identificados: ${data.conflicts.join(', ')}
    Recuerdos del paciente: ${JSON.stringify(data.memories)}
    
    Genera:
    1. Una interpretación clínica profunda y reveladora. Dirígete directamente al paciente (en segunda persona "tú"). Conecta sus recuerdos con su conflicto actual basándote estrictamente en la teoría.
    2. Un cierre o reestructuración cognitiva. Una frase o párrafo corto que le quite el peso de la culpa, reencuadre su fantasía o sentimiento negativo en una necesidad humana comprensible, y le dé una nueva perspectiva sanadora.
  `;

  const response = await getAI().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }], // Enable Grounding
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          interpretation: { type: Type.STRING },
          closure: { type: Type.STRING }
        },
        required: ['interpretation', 'closure']
      }
    }
  });

  const parsed = JSON.parse(response.text || '{}');
  
  // Extract Grounding URLs safely
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const groundingUrls = chunks
    .filter(c => c.web?.uri && c.web?.title)
    .map(c => ({ uri: c.web!.uri, title: c.web!.title }));

  return {
    interpretation: parsed.interpretation,
    closure: parsed.closure,
    groundingUrls
  };
};

export const refineInsight = async (
  currentInsight: ClinicalInsight,
  extractedData: ExtractedData,
  refinementPrompt: string
): Promise<ClinicalInsight> => {
  const prompt = `
    Eres un psicoterapeuta magistral.
    
    Teoría base: ${extractedData.theory}
    Conflictos identificados: ${extractedData.conflicts.join(', ')}
    Recuerdos del paciente: ${JSON.stringify(extractedData.memories)}
    
    Interpretación actual: "${currentInsight.interpretation}"
    Cierre actual: "${currentInsight.closure}"
    
    El usuario (o terapeuta supervisor) ha solicitado el siguiente ajuste o refinamiento:
    "${refinementPrompt}"
    
    Por favor, reescribe la interpretación y el cierre incorporando este ajuste. Mantén el tono empático y profundo.
  `;

  const response = await getAI().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }], // Enable Grounding
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          interpretation: { type: Type.STRING },
          closure: { type: Type.STRING }
        },
        required: ['interpretation', 'closure']
      }
    }
  });

  const parsed = JSON.parse(response.text || '{}');
  
  // Extract Grounding URLs safely
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const groundingUrls = chunks
    .filter(c => c.web?.uri && c.web?.title)
    .map(c => ({ uri: c.web!.uri, title: c.web!.title }));

  return {
    interpretation: parsed.interpretation,
    closure: parsed.closure,
    groundingUrls: groundingUrls.length > 0 ? groundingUrls : currentInsight.groundingUrls
  };
};
