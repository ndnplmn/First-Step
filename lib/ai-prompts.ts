import type {
  Patient,
  Conflict,
  Memory,
  FrameworkMatch,
  GestaltActivity,
  LifeChanges,
  ExplorationRecord,
  PatientSession,
} from '@/lib/types';

export function buildPatientContext(patient: Patient, lifeChanges?: LifeChanges, sessionIntention?: string): string {
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

export function getLanguageInstruction(locale?: string): string {
  const toneMap: Record<string, string> = {
    es: '',
    en: '\n\nIMPORTANT: You MUST respond entirely in English. Use empathetic, clear, and warm English. All therapeutic content, questions, reflections, analysis, letters, strategies, and any other output must be written in English. This is non-negotiable.',
    ru: '\n\nВАЖНО: Вы ОБЯЗАНЫ отвечать исключительно на русском языке. Используйте тёплый, рефлексивный и сочувственный тон на русском. Всё терапевтическое содержание — вопросы, размышления, анализ, письма, стратегии и любой другой текст — должно быть написано на русском языке. Это обязательное требование.',
  };
  return toneMap[locale ?? 'es'] ?? toneMap.en;
}

export function formatFrameworks(matches: FrameworkMatch[]): string {
  return matches.map((m, i) => `${i === 0 ? 'Marco primario' : 'Marco secundario'}: ${m.name} — ${m.focus}`).join('\n');
}

function buildSessionHistory(priorSessions: PatientSession[]): string {
  if (!priorSessions.length) return '';

  const completed = priorSessions
    .filter(s => s.stage === 6 && s.conflicts.length > 0)
    .sort((a, b) => a.sessionNumber - b.sessionNumber)
    .slice(-3);

  if (!completed.length) return '';

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
    return [
      `Sesión ${s.sessionNumber} (${date}):`,
      `  Conflictos trabajados: ${conflictos}`,
      `  Marco terapéutico: ${marco}`,
      explorationLine,
      interpretacion ? `  Interpretación (extracto): "${interpretacion}"` : null,
    ].filter(Boolean).join('\n');
  });

  return `\nHistorial de sesiones anteriores (${completed.length} sesión/es completada/s):\n${lines.join('\n\n')}\n`;
}

export function buildInterpretationPrompt(params: {
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  memories: Memory[];
  patient: Patient;
  lifeChanges?: LifeChanges;
  stage3Notes?: string;
  explorationRecord?: ExplorationRecord;
  priorSessions?: PatientSession[];
  priorInterpretation?: string;
  locale?: string;
}): string {
  const { conflicts, frameworkMatches, memories } = params;

  const stage3Section = params.explorationRecord?.insights?.length
    ? `\n    Registro de exploración profunda (${params.explorationRecord.frameworkName}):\n    ${params.explorationRecord.insights.map(i => `- ${i.theme}: ${i.observation}`).join('\n    ')}\n    Reflexión IA: ${params.explorationRecord.aiReflection}\n`
    : params.stage3Notes
    ? `\n    Notas de exploración del paciente (sesión experiencial):\n    ${params.stage3Notes}\n`
    : '';

  const sessionHistory = buildSessionHistory(params.priorSessions ?? []);

  const reframeInstruction = params.priorInterpretation
    ? `\n    Interpretación anterior que el paciente quiere reformular:\n    "${params.priorInterpretation.slice(0, 300)}${params.priorInterpretation.length > 300 ? '…' : ''}"\n    → Genera una perspectiva genuinamente distinta. No repitas las mismas metáforas ni los mismos marcos de comprensión. Busca un ángulo nuevo — otra dimensión del mismo material.\n`
    : '';

  return `
    Eres un psicoterapeuta magistral que integra múltiples marcos terapéuticos.
${reframeInstruction}
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
}

export function buildClosurePrompt(params: {
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  memories: Memory[];
  interpretation: string;
  gestaltActivity: GestaltActivity | null;
  gestaltActivityResponse?: string;
  patient: Patient;
  deepWorkSynthesis?: string;
  interpretationResponse?: string;
  priorSessions?: PatientSession[];
  locale?: string;
}): string {
  const { conflicts, frameworkMatches, interpretation, gestaltActivity } = params;
  const closureHistory = buildSessionHistory(params.priorSessions ?? []);
  const greetingMap: Record<string, string> = { es: `Querido/a`, en: `Dear`, ru: `Дорогой/ая` };
  const closingMap: Record<string, string> = { es: `Con cariño,\n    Tend`, en: `With love,\n    Tend`, ru: `С теплом,\n    Tend` };
  const greeting = greetingMap[params.locale ?? 'es'] ?? greetingMap.es;
  const closing = closingMap[params.locale ?? 'es'] ?? closingMap.es;

  return `
    Eres un psicoterapeuta magistral.

    El paciente tiene estos conflictos: ${conflicts.map(c => c.synthesized).join(', ')}
    Marcos terapéuticos (de entre: Psicoanálisis Freudiano, Terapia Bioenergética, Psicología Individual de Adler, Terapia Gestalt, Sensibilización Sistemática Conductual):
    ${formatFrameworks(frameworkMatches)}

    Contexto del paciente:
    ${buildPatientContext(params.patient)}
${closureHistory}

    Se le ha dado esta interpretación:
    "${interpretation}"
    ${params.interpretationResponse ? `\n    El paciente respondió a la interpretación con:\n    "${params.interpretationResponse}"\n    → Si esta respuesta revela algo importante — acuerdo, resistencia, sorpresa — recógela en la carta. No la ignores.` : ''}

    ${gestaltActivity ? `Actividad Gestalt preparada para el paciente:\nTipo: ${gestaltActivity.type}\nTítulo: "${gestaltActivity.title}"\nDescripción: "${gestaltActivity.description}"` : ''}
    ${params.gestaltActivityResponse ? `El paciente completó una actividad Gestalt en una sesión anterior y esto fue lo que escribió:\n"${params.gestaltActivityResponse}"\nIncorpora esta experiencia vivida si es relevante para la carta.` : ''}
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
    Prepáralo para la siguiente fase de exploración que viene. Menciónala como una invitación cálida a ir más profundo. Conecta esta fase con lo que se ha trabajado.

    PÁRRAFO 3 (2-3 oraciones):
    ${closureHistory
      ? 'El paciente ya lleva varias sesiones. Reconoce ese compromiso con su proceso. Que cada regreso muestra valentía y que lo trabajado se acumula.'
      : 'Hazle saber que este es apenas el primer paso. Que cada sesión profundizará más. Que volver es parte de cuidarse.'}

    - Cierra con una línea en blanco y luego exactamente:
    ${closing}

    NO expliques teorías. Habla al corazón.
  ${getLanguageInstruction(params.locale)}`;
}
