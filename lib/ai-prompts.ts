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

export function buildPatientContext(patient: Patient, lifeChanges?: LifeChanges, sessionIntention?: string, locale?: string): string {
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

  if (patient.solutionVision) {
    lines.push(`${L.vision}: "${patient.solutionVision}"`);
  }

  if (lifeChanges && lifeChanges.categories.length > 0) {
    lines.push(`${L.lifeChanges}: ${lifeChanges.categories.join(', ')}${lifeChanges.detail ? `. ${L.detail}: ${lifeChanges.detail}` : ''}`);
  }

  if (sessionIntention) {
    lines.push(`${L.intention}: "${sessionIntention}"`);
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
    const clinicalLine = [
      s.phq9 ? `PHQ-9: ${s.phq9.score}/27 (${s.phq9.severity})` : null,
      s.gad7 ? `GAD-7: ${s.gad7.score}/21 (${s.gad7.severity})` : null,
    ].filter(Boolean).join(', ');
    return [
      `Sesión ${s.sessionNumber} (${date}):`,
      `  Conflictos trabajados: ${conflictos}`,
      `  Marco terapéutico: ${marco}`,
      explorationLine,
      interpretacion ? `  Interpretación (extracto): "${interpretacion}"` : null,
      clinicalLine ? `  Clínico: ${clinicalLine}` : null,
    ].filter(Boolean).join('\n');
  });

  return `\nHistorial de sesiones anteriores (${completed.length} sesión/es completada/s):\n${lines.join('\n\n')}\n`;
}

function buildClinicalSafetyNote(priorSessions: PatientSession[]): string {
  const sorted = [...priorSessions].sort((a, b) => b.sessionNumber - a.sessionNumber);
  const recentPhq9 = sorted.find(s => s.phq9)?.phq9;
  const recentGad7 = sorted.find(s => s.gad7)?.gad7;

  const alerts: string[] = [];
  if (recentPhq9 && recentPhq9.score >= 15) {
    alerts.push(`PHQ-9: ${recentPhq9.score}/27 (${recentPhq9.severity}) — depresión moderada-grave`);
  }
  if (recentGad7 && recentGad7.score >= 10) {
    alerts.push(`GAD-7: ${recentGad7.score}/21 (${recentGad7.severity}) — ansiedad moderada-grave`);
  }

  if (!alerts.length) return '';

  return `\n    NOTA CLÍNICA — CONTENCIÓN PRIORITARIA: ${alerts.join('. ')}.\n    → El nivel de malestar clínico es significativo. Prioriza la validación emocional y la contención sobre la exploración profunda. Ancla la intervención en lo concreto y lo que el paciente puede sostener ahora mismo. Evita abrir nuevas áreas de vulnerabilidad.\n`;
}

function buildWellbeingTrend(priorSessions: PatientSession[]): string {
  const withWellbeing = [...priorSessions]
    .filter(s => s.stage === 6 && typeof s.wellbeingAfter === 'number')
    .sort((a, b) => a.sessionNumber - b.sessionNumber);
  if (withWellbeing.length < 2) return '';
  const trend = withWellbeing.map(s => `s${s.sessionNumber}:${s.wellbeingAfter}/5`).join(' → ');
  const last = withWellbeing[withWellbeing.length - 1].wellbeingAfter as number;
  const first = withWellbeing[0].wellbeingAfter as number;
  const direction = last > first ? 'mejora' : last < first ? 'descenso' : 'estable';
  return `\n    Tendencia de bienestar entre sesiones (${direction}): ${trend}\n    → Reconoce este arco en la carta — no como evaluación, sino como testigo del proceso.\n`;
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
  const clinicalSafetyNote = buildClinicalSafetyNote(params.priorSessions ?? []);

  const reframeInstruction = params.priorInterpretation
    ? `\n    Interpretación anterior que el paciente quiere reformular:\n    "${params.priorInterpretation.slice(0, 300)}${params.priorInterpretation.length > 300 ? '…' : ''}"\n    → Genera una perspectiva genuinamente distinta. No repitas las mismas metáforas ni los mismos marcos de comprensión. Busca un ángulo nuevo — otra dimensión del mismo material.\n`
    : '';

  return `
    Eres un psicoterapeuta magistral que integra múltiples marcos terapéuticos.
${reframeInstruction}
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
${stage3Section}${sessionHistory}${clinicalSafetyNote}
    Genera una interpretación clínica breve, profunda y reveladora desde el marco terapéutico elegido.
    Los marcos posibles son: Psicoanálisis Freudiano, Terapia Bioenergética, Psicología Individual de Adler, Terapia Gestalt, Sensibilización Sistemática Conductual.

    Reglas:
    - Dirígete directamente al paciente (segunda persona "tú")
    - Conecta lo trabajado en sesión con su conflicto actual desde la lente del marco terapéutico
    - OBLIGATORIO: Si el paciente tiene un motivo de consulta definido, conecta explícitamente la interpretación con ese motivo — no como mera mención, sino como hilo conductor que da sentido a lo trabajado hoy. El paciente debe reconocer la conexión entre lo que exploró y por qué vino.
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
  quickSession?: boolean;
}): string {
  const { conflicts, frameworkMatches, interpretation, gestaltActivity } = params;
  const closureHistory = buildSessionHistory(params.priorSessions ?? []);
  const closureClinicalNote = buildClinicalSafetyNote(params.priorSessions ?? []);
  const wellbeingTrendNote = (params.priorSessions?.length ?? 0) >= 2
    ? buildWellbeingTrend(params.priorSessions ?? [])
    : '';
  const solutionVisionNote = params.patient.solutionVision && (params.priorSessions?.length ?? 0) >= 3
    ? `\n    El paciente definió su visión de éxito al inicio del proceso: "${params.patient.solutionVision}"\n    → En la carta, relaciona sutilmente lo trabajado hoy con esa visión. ¿Nos estamos acercando? ¿Hay nuevos pasos visibles? No la cites textualmente — interpreta si existe conexión.\n`
    : '';
  const gender = params.patient.gender;
  const greetingMap: Record<string, Record<string, string>> = {
    es: { female: 'Querida', male: 'Querido', other: 'Querido/a' },
    en: { female: 'Dear', male: 'Dear', other: 'Dear' },
    ru: { female: 'Дорогая', male: 'Дорогой', other: 'Дорогой/ая' },
  };
  const closingMap: Record<string, string> = { es: `Con cariño,\n    Tend`, en: `With love,\n    Tend`, ru: `С теплом,\n    Tend` };
  const localeGreetings = greetingMap[params.locale ?? 'es'] ?? greetingMap.es;
  const greeting = localeGreetings[gender] ?? localeGreetings.other;
  const closing = closingMap[params.locale ?? 'es'] ?? closingMap.es;

  return `
    Eres un psicoterapeuta magistral.

    El paciente tiene estos conflictos: ${conflicts.map(c => c.synthesized).join(', ')}
    Marcos terapéuticos (de entre: Psicoanálisis Freudiano, Terapia Bioenergética, Psicología Individual de Adler, Terapia Gestalt, Sensibilización Sistemática Conductual):
    ${formatFrameworks(frameworkMatches)}

    Contexto del paciente:
    ${buildPatientContext(params.patient, undefined, undefined, params.locale)}
${closureHistory}${wellbeingTrendNote}${closureClinicalNote}${solutionVisionNote}
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
    ${params.quickSession ? 'IMPORTANTE: Esta fue una sesión breve de contención. El paciente llegó con un estado emocional bajo. La carta debe priorizar la calidez y la validación emocional por encima de la exploración profunda. Evita abrir nuevas preguntas o invitar a ir más profundo — en su lugar, valida el esfuerzo de haber venido y ofrece seguridad.' : ''}
  ${getLanguageInstruction(params.locale)}`;
}
