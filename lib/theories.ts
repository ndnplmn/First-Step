import type { FrameworkKey, Stage3Type } from './types';

export const FRAMEWORKS_DICTIONARY: Record<FrameworkKey, {
  name: string;
  description: string;
  clinicalFocus: string;
  techniques: string[];
  subcategories: string[];
  indicators: string[];
  stage3Type: Stage3Type;
}> = {
  freudiano: {
    name: 'Psicoanálisis Freudiano',
    description: 'Exploración del inconsciente, conflictos internos tempranos y mecanismos de defensa',
    clinicalFocus: 'Traer a conciencia material reprimido mediante libre asociación y análisis de recuerdos',
    techniques: ['Libre asociación', 'Análisis de sueños', 'Interpretación de síntomas', 'Transferencia'],
    subcategories: ['Represión', 'Conflicto edípico', 'Mecanismos de defensa', 'Trauma temprano', 'Pulsiones'],
    indicators: ['Síntomas sin causa aparente', 'Patrones repetitivos inexplicables', 'Sueños recurrentes', 'Conflictos relacionales profundos'],
    stage3Type: 'memories',
  },
  bioenergetico: {
    name: 'Terapia Bioenergética (Reich)',
    description: 'El cuerpo como portador de conflictos emocionales. Trabajo con respiración, tensión muscular y energía somática',
    clinicalFocus: 'Liberar bloqueos energéticos y tensiones musculares crónicas que expresan conflictos psíquicos',
    techniques: ['Respiración profunda', 'Grounding (conexión tierra)', 'Arco bioenergético', 'Vocalización emocional', 'Movimiento expresivo'],
    subcategories: ['Coraza muscular', 'Bloqueo energético', 'Desconexión cuerpo-mente', 'Tensión crónica'],
    indicators: ['Tensión corporal crónica', 'Respiración superficial', 'Desconexión emocional', 'Síntomas somáticos sin causa médica'],
    stage3Type: 'bodywork',
  },
  adleriano: {
    name: 'Psicología Individual (Adler)',
    description: 'El ser humano como ser social. Los conflictos nacen de sentimientos de inferioridad y estilos de vida compensatorios',
    clinicalFocus: 'Explorar el contexto social, orden de nacimiento y metas de vida para entender el estilo de vida del paciente',
    techniques: ['Análisis del orden de nacimiento', 'Constelación familiar', 'Recuerdos tempranos (primeros)', 'Análisis de metas ficticias', 'Aliento terapéutico'],
    subcategories: ['Sentimiento de inferioridad', 'Complejo de superioridad', 'Estilo de vida', 'Interés social', 'Metas ficticias'],
    indicators: ['Comparación constante con otros', 'Problemas de poder o control', 'Dificultades sociales', 'Competitividad excesiva', 'Aislamiento social'],
    stage3Type: 'social_context',
  },
  gestalt: {
    name: 'Terapia Gestalt',
    description: 'Trabajo con el aquí y ahora, contacto genuino y gestalt inacabadas mediante actividades experienciales',
    clinicalFocus: 'Completar situaciones inconclusas mediante experiencias directas en el presente terapéutico',
    techniques: ['Silla vacía', 'Diálogo de polaridades', 'Awareness corporal', 'Experimento gestáltico', 'Diálogo interno'],
    subcategories: ['Gestalt inacabada', 'Evitación del contacto', 'Retroflexión', 'Proyección', 'Fragmentación del self'],
    indicators: ['Conflictos relacionales no resueltos', 'Emociones bloqueadas', 'Figuras significativas del pasado', 'Dificultad para cerrar ciclos'],
    stage3Type: 'gestalt_activity',
  },
  conductual: {
    name: 'Sensibilización Sistemática Conductual',
    description: 'Desensibilización gradual mediante relajación progresiva y exposición sistemática a estímulos ansiógenos',
    clinicalFocus: 'Reducir respuestas de ansiedad mediante relajación profunda y exposición gradual controlada',
    techniques: ['Relajación muscular progresiva', 'Jerarquía de ansiedad', 'Exposición gradual imaginaria', 'Respiración diafragmática', 'Contracondicionamiento'],
    subcategories: ['Fobia', 'Ansiedad situacional', 'Evitación conductual', 'Respuesta de alarma', 'Condicionamiento negativo'],
    indicators: ['Miedo específico identificable', 'Evitación conductual clara', 'Respuesta de ansiedad ante situaciones concretas', 'Fobias'],
    stage3Type: 'exposure',
  },
};

export const FRAMEWORK_NAMES: Record<FrameworkKey, string> = {
  freudiano: 'Psicoanálisis Freudiano',
  bioenergetico: 'Terapia Bioenergética',
  adleriano: 'Psicología Individual (Adler)',
  gestalt: 'Terapia Gestalt',
  conductual: 'Sensibilización Sistemática',
};

export const GESTALT_ACTIVITIES = {
  silla_vacia: {
    title: 'Silla Vacía',
    description: 'Diálogo con una persona o parte del self ausente',
    facilitation: 'Imagina que [persona/parte] está sentada frente a ti. ¿Qué le dirías?',
  },
  polaridades: {
    title: 'Diálogo de Polaridades',
    description: 'Conversación entre dos partes opuestas del self',
    facilitation: 'Hay una parte de ti que [X] y otra que [Y]. Dale voz a cada una.',
  },
  awareness_corporal: {
    title: 'Awareness Corporal',
    description: 'Exploración consciente de las sensaciones del cuerpo',
    facilitation: 'Cierra los ojos. ¿Dónde sientes esto en tu cuerpo? ¿Qué forma tiene?',
  },
  experimento: {
    title: 'Experimento Gestáltico',
    description: 'Acción simbólica para completar una situación inconclusa',
    facilitation: 'Te propongo un experimento. ¿Estarías dispuesto/a a intentarlo?',
  },
  dialogo_interno: {
    title: 'Diálogo Interno',
    description: 'Conversación entre el crítico interno y el yo compasivo',
    facilitation: '¿Qué dice tu crítico interno? Ahora, ¿qué respondería tu yo más compasivo?',
  },
};
