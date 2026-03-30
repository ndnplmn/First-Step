export const FRAMEWORKS_DICTIONARY = `
TCC (Terapia Cognitivo-Conductual — Beck, Ellis):
- Subcategorías: distorsiones cognitivas (catastrofización, pensamiento todo-o-nada, lectura mental, sobregeneralización, personalización, filtro mental, razonamiento emocional, etiquetado), esquemas desadaptativos tempranos (abandono, desconfianza, defectuosidad, fracaso, dependencia, vulnerabilidad), creencias centrales negativas, pensamientos automáticos, modelo ABC
- Técnicas: reestructuración cognitiva, exposición gradual, activación conductual, experimentos conductuales, prevención de respuesta, registro de pensamientos, análisis funcional
- Indicadores: ansiedad, fobias, pánico, depresión, TOC, insomnio, rumiación, evitación, pensamientos distorsionados

TG3 (Terapias Cognitivas de Tercera Generación — Hayes, Kabat-Zinn):
- Subcategorías: fusión cognitiva, evitación experiencial, falta de contacto con el presente, yo-como-contenido vs yo-como-contexto, falta de claridad en valores, inacción, flexibilidad psicológica, hexaflex, mindfulness
- Técnicas: defusión cognitiva, aceptación, contacto con el momento presente, yo-observador, clarificación de valores, acción comprometida, meditación mindfulness, compasión
- Indicadores: rigidez mental, evitación, desconexión del presente, pérdida de sentido, lucha contra pensamientos, falta de propósito, dolor crónico, estrés crónico

DBT (Terapia Dialéctico-Conductual — Linehan):
- Subcategorías: desregulación emocional, tolerancia al malestar, efectividad interpersonal, mindfulness, mente sabia, validación, análisis en cadena, habilidades TIPP, acción opuesta
- Técnicas: regulación emocional, tolerancia al malestar (TIPP, distracción, autocalma), efectividad interpersonal (DEAR MAN, GIVE, FAST), mindfulness (mente sabia), análisis en cadena, acción opuesta
- Indicadores: emociones intensas, impulsividad, autolesión, relaciones caóticas, vacío, crisis emocionales, problemas de regulación, ira descontrolada, conductas de riesgo

APEGO_TRAUMA (Terapia Centrada en Apego y Trauma — Bowlby, Ainsworth, van der Kolk, Shapiro):
- Subcategorías: estilos de apego (seguro, ansioso, evitativo, desorganizado), modelos operativos internos, base segura, ruptura y reparación, trauma complejo, disociación, respuestas somáticas al trauma, EMDR, estabilización, procesamiento traumático, regulación diádica, ventana de tolerancia
- Técnicas: estabilización y contención, procesamiento del trauma (fases), psicoeducación del apego, trabajo con la ventana de tolerancia, grounding, regulación somática, reparación vincular
- Indicadores: trauma infantil/adulto, TEPT, abandono, problemas de apego, miedo a la intimidad, dependencia emocional, disociación, flashbacks, hipervigilancia, duelo vincular

PSICODINAMICO (Enfoques Psicodinámicos y Relacionales — Freud, Kernberg, Kohut, Fonagy, Winnicott):
- Subcategorías: mecanismos de defensa (represión, proyección, negación, racionalización, sublimación, escisión, identificación proyectiva), transferencia, inconsciente, pulsiones, relaciones objetales, mentalización, función reflexiva, identidad difusa, self grandioso, elaboración, acting out, asuntos inconclusos del pasado
- Técnicas: insight, elaboración, análisis de defensas, exploración de patrones relacionales, mentalización, trabajo con transferencia, exploración de historia personal, conexión pasado-presente
- Indicadores: patrones repetitivos en relaciones, dificultad para entender las propias emociones, vacío crónico, problemas de identidad, relaciones intensas/inestables, autoestima frágil, conflictos familiares profundos

INTEGRATIVO (Enfoques Integrativos y Mente-Cuerpo — Levine, Ogden, Porges):
- Subcategorías: teoría polivagal, regulación del sistema nervioso, respuestas somáticas, conexión mente-cuerpo, somatización, disociación somática, grounding, estados de activación (hiper/hipo), ventana de tolerancia ampliada, embodiment, integración sensoriomotriz
- Técnicas: grounding corporal, respiración regulada, body scan, movimiento consciente, regulación del sistema nervioso, técnicas de enraizamiento, integración somática, relajación progresiva
- Indicadores: somatización, dolor crónico, trastornos alimentarios, disociación, ansiedad somática, burnout, problemas de sueño, tensión corporal crónica, desconexión del cuerpo

GESTALT (Terapia Gestalt — Perls, Polster):
- Subcategorías: asuntos inconclusos, ciclo de contacto interrumpido (retroflexión, introyección, proyección, confluencia, deflexión), polaridades, figura-fondo, aquí y ahora, awareness, contacto pleno, vacío fértil, ajuste creativo
- Técnicas: silla vacía, diálogo de polaridades, awareness corporal, experimento vivencial, diálogo interno, externalización, trabajo con el cuerpo, amplificación de la experiencia
- Rol especial: Gestalt siempre acompaña como marco de profundización. Hace visible la experiencia completa (emociones, cuerpo, vínculo, contexto) para que el cambio surja de mayor conciencia. SIEMPRE debe incluir una actividad o experimento concreto.
- Indicadores: siempre presente como tercer marco, especialmente cuando hay emociones bloqueadas, desconexión corporal, asuntos inconclusos, necesidades no expresadas
`;

export const SITUATION_MAPPING = `
=== MAPEO DE SITUACIONES A MARCOS TERAPÉUTICOS ===

--- 1. ANSIEDAD Y PÁNICO ---

SITUACIÓN: Ansiedad generalizada con preocupación constante
→ Primario: TCC (reestructuración de pensamientos catastróficos y registro de preocupaciones)
→ Secundario: TG3 (defusión cognitiva y contacto con el presente)
→ Gestalt: awareness corporal — localizar la ansiedad en el cuerpo y describir su forma, textura, movimiento

SITUACIÓN: Ataques de pánico recurrentes
→ Primario: TCC (psicoeducación del pánico, exposición interoceptiva, desactivación de catastrofización)
→ Secundario: INTEGRATIVO (regulación del sistema nervioso, respiración regulada, grounding)
→ Gestalt: experimento — amplificar la sensación corporal del pánico en un espacio seguro para descubrir qué mensaje trae

SITUACIÓN: Fobias específicas (social, agorafobia, otras)
→ Primario: TCC (exposición gradual, jerarquía de miedos, experimentos conductuales)
→ Secundario: TG3 (aceptación del malestar, defusión del pensamiento catastrófico)
→ Gestalt: diálogo interno — conversar con la parte que tiene miedo y la parte que quiere avanzar

SITUACIÓN: TOC (obsesiones y compulsiones)
→ Primario: TCC (prevención de respuesta, reestructuración cognitiva de pensamientos intrusivos)
→ Secundario: TG3 (defusión cognitiva, aceptación de la incertidumbre)
→ Gestalt: experimento — externalizar la obsesión como un personaje y explorar qué necesita

SITUACIÓN: Rumiación e inquietud mental persistente
→ Primario: TG3 (defusión cognitiva, yo-observador, mindfulness)
→ Secundario: TCC (registro de pensamientos, identificación de distorsiones)
→ Gestalt: awareness corporal — notar dónde se siente la rumiación en el cuerpo y qué pasa al llevar atención ahí

--- 2. DEPRESIÓN Y ESTADO DE ÁNIMO ---

SITUACIÓN: Depresión con aislamiento y desmotivación
→ Primario: TCC (activación conductual, registro de actividades placenteras, reestructuración cognitiva)
→ Secundario: TG3 (clarificación de valores, acción comprometida)
→ Gestalt: polaridades — diálogo entre la parte que quiere moverse y la que quiere quedarse quieta

SITUACIÓN: Pérdida de sentido y vacío existencial
→ Primario: TG3 (clarificación de valores, acción comprometida, conexión con el propósito)
→ Secundario: PSICODINAMICO (exploración de patrones, conexión pasado-presente)
→ Gestalt: silla vacía — hablar con el sentido perdido o con una versión futura de sí mismo que tiene propósito

SITUACIÓN: Duelo y pérdida significativa
→ Primario: APEGO_TRAUMA (procesamiento del duelo vincular, estabilización emocional)
→ Secundario: PSICODINAMICO (elaboración, exploración de la relación con lo perdido)
→ Gestalt: silla vacía — despedirse, decir lo no dicho a la persona o situación perdida

SITUACIÓN: Baja autoestima con autocrítica severa
→ Primario: TCC (identificación de creencias centrales negativas, reestructuración cognitiva)
→ Secundario: PSICODINAMICO (exploración de origen de la autocrítica, mentalización)
→ Gestalt: polaridades — diálogo entre el crítico interno y la parte criticada

SITUACIÓN: Anhedonia y desconexión emocional
→ Primario: TCC (activación conductual gradual, monitoreo de emociones)
→ Secundario: INTEGRATIVO (reconexión mente-cuerpo, body scan, movimiento consciente)
→ Gestalt: awareness corporal — explorar qué se siente en el cuerpo cuando "no se siente nada"

--- 3. TRAUMA Y APEGO ---

SITUACIÓN: TEPT por evento traumático específico
→ Primario: APEGO_TRAUMA (estabilización, procesamiento del trauma por fases, ventana de tolerancia)
→ Secundario: INTEGRATIVO (regulación del sistema nervioso, grounding, regulación somática)
→ Gestalt: experimento — crear un lugar seguro interno y explorar el trauma desde la distancia segura

SITUACIÓN: Trauma complejo infantil
→ Primario: APEGO_TRAUMA (estabilización, psicoeducación del apego, trabajo con la ventana de tolerancia)
→ Secundario: PSICODINAMICO (exploración de patrones relacionales, mentalización, conexión pasado-presente)
→ Gestalt: silla vacía — hablar con el niño/a interior o con la figura de apego que falló

SITUACIÓN: Miedo al abandono y dependencia emocional
→ Primario: APEGO_TRAUMA (psicoeducación del apego ansioso, reparación vincular)
→ Secundario: DBT (regulación emocional, tolerancia al malestar, efectividad interpersonal)
→ Gestalt: polaridades — diálogo entre la parte que necesita al otro y la parte que puede sostenerse sola

SITUACIÓN: Evitación de la intimidad y distanciamiento emocional
→ Primario: APEGO_TRAUMA (psicoeducación del apego evitativo, exploración de modelos operativos internos)
→ Secundario: PSICODINAMICO (análisis de defensas, exploración de patrones relacionales)
→ Gestalt: experimento — imaginar acercarse emocionalmente a alguien y notar qué pasa en el cuerpo

SITUACIÓN: Flashbacks y disociación
→ Primario: APEGO_TRAUMA (estabilización, grounding, trabajo con la ventana de tolerancia)
→ Secundario: INTEGRATIVO (regulación del sistema nervioso, técnicas de enraizamiento, integración somática)
→ Gestalt: awareness corporal — anclar al presente a través de las sensaciones corporales, nombrar lo que se percibe aquí y ahora

--- 4. RELACIONES Y FAMILIA ---

SITUACIÓN: Conflictos de pareja recurrentes
→ Primario: DBT (efectividad interpersonal — DEAR MAN, GIVE, FAST)
→ Secundario: APEGO_TRAUMA (patrones de apego en la relación, ruptura y reparación)
→ Gestalt: silla vacía — hablar con la pareja ausente para expresar lo no dicho

SITUACIÓN: Problemas de límites en relaciones
→ Primario: DBT (efectividad interpersonal, habilidades FAST para autorrespeto)
→ Secundario: PSICODINAMICO (exploración de patrones de subyugación, mentalización)
→ Gestalt: polaridades — diálogo entre la parte que complace y la parte que necesita poner límites

SITUACIÓN: Conflictos familiares profundos y roles disfuncionales
→ Primario: PSICODINAMICO (exploración de patrones multigeneracionales, mentalización)
→ Secundario: APEGO_TRAUMA (estilos de apego familiar, reparación vincular)
→ Gestalt: silla vacía — hablar con el familiar con quien hay conflicto, expresar lo no dicho

SITUACIÓN: Aislamiento social y dificultad para conectar
→ Primario: DBT (efectividad interpersonal, habilidades sociales)
→ Secundario: TCC (identificación de pensamientos que bloquean la conexión, experimentos conductuales)
→ Gestalt: experimento — practicar en imaginación un acercamiento social y notar qué emociones surgen

SITUACIÓN: Codependencia y pérdida de identidad en relaciones
→ Primario: PSICODINAMICO (exploración de patrones de fusión, identidad difusa, mentalización)
→ Secundario: TG3 (clarificación de valores propios, yo-como-contexto)
→ Gestalt: polaridades — diálogo entre "yo para el otro" y "yo para mí"

--- 5. AUTOESTIMA E IDENTIDAD ---

SITUACIÓN: Crisis de identidad y confusión sobre quién soy
→ Primario: PSICODINAMICO (exploración de identidad, mentalización, función reflexiva)
→ Secundario: TG3 (clarificación de valores, yo-como-contexto)
→ Gestalt: polaridades — diálogo entre las distintas partes de la identidad que están en conflicto

SITUACIÓN: Perfeccionismo paralizante
→ Primario: TCC (reestructuración de estándares inalcanzables, experimentos conductuales de imperfección)
→ Secundario: TG3 (aceptación, defusión del pensamiento "no es suficiente")
→ Gestalt: polaridades — diálogo entre el perfeccionista exigente y la parte que quiere descansar

SITUACIÓN: Vergüenza tóxica y sentimiento de defectuosidad
→ Primario: PSICODINAMICO (exploración de esquemas de defectuosidad, mentalización)
→ Secundario: TG3 (compasión, aceptación, defusión de creencias de vergüenza)
→ Gestalt: silla vacía — hablar con la voz que dice "eres defectuoso/a" y descubrir de dónde viene

SITUACIÓN: Comparación constante y envidia
→ Primario: TCC (reestructuración de distorsiones comparativas, registro de pensamientos)
→ Secundario: TG3 (clarificación de valores propios, defusión cognitiva)
→ Gestalt: experimento — imaginar a la persona envidiada sentada enfrente y explorar qué representa

SITUACIÓN: Autoestima frágil dependiente de validación externa
→ Primario: PSICODINAMICO (exploración de self grandioso/frágil, necesidades narcisistas, mentalización)
→ Secundario: TCC (reestructuración de creencias centrales sobre el valor propio)
→ Gestalt: polaridades — diálogo entre la parte que necesita aplausos y la parte que conoce su valor

--- 6. REGULACIÓN EMOCIONAL Y CONDUCTA ---

SITUACIÓN: Ira explosiva y dificultad para controlar impulsos
→ Primario: DBT (regulación emocional, acción opuesta, análisis en cadena)
→ Secundario: TCC (identificación de pensamientos activadores, reestructuración cognitiva)
→ Gestalt: awareness corporal — localizar la ira en el cuerpo, darle voz, escuchar qué necesita

SITUACIÓN: Autolesión y conductas de riesgo
→ Primario: DBT (tolerancia al malestar — TIPP, distracción, autocalma; análisis en cadena)
→ Secundario: APEGO_TRAUMA (estabilización, exploración de la función de la conducta)
→ Gestalt: diálogo interno — conversar con la parte que se hace daño y preguntarle qué intenta comunicar

SITUACIÓN: Emociones intensas y cambiantes (montaña rusa emocional)
→ Primario: DBT (regulación emocional, mindfulness de emociones, mente sabia)
→ Secundario: INTEGRATIVO (regulación del sistema nervioso, ventana de tolerancia)
→ Gestalt: awareness corporal — rastrear la emoción en el cuerpo momento a momento, nombrarla sin juzgarla

SITUACIÓN: Evitación emocional y entumecimiento
→ Primario: TG3 (aceptación, contacto con el momento presente, defusión)
→ Secundario: INTEGRATIVO (reconexión mente-cuerpo, body scan)
→ Gestalt: experimento — invitar a una emoción evitada a aparecer brevemente y notar qué sucede

SITUACIÓN: Conductas adictivas y compulsivas
→ Primario: DBT (tolerancia al malestar, análisis en cadena, acción opuesta)
→ Secundario: TCC (análisis funcional de la conducta, prevención de recaídas)
→ Gestalt: polaridades — diálogo entre la parte que busca la sustancia/conducta y la parte que quiere liberarse

--- 7. ESTRÉS Y ADAPTACIÓN ---

SITUACIÓN: Burnout y agotamiento crónico
→ Primario: INTEGRATIVO (regulación del sistema nervioso, grounding, body scan)
→ Secundario: TG3 (clarificación de valores, reconexión con el propósito)
→ Gestalt: awareness corporal — hacer un mapa del agotamiento en el cuerpo, escuchar qué partes piden descanso

SITUACIÓN: Transiciones vitales difíciles (mudanza, divorcio, jubilación, maternidad)
→ Primario: TG3 (clarificación de valores en la nueva etapa, acción comprometida)
→ Secundario: PSICODINAMICO (elaboración de lo perdido, exploración de identidad en transición)
→ Gestalt: silla vacía — despedirse de la etapa anterior y dar la bienvenida a la nueva

SITUACIÓN: Problemas laborales y estrés ocupacional
→ Primario: TCC (reestructuración de pensamientos sobre el trabajo, resolución de problemas)
→ Secundario: DBT (efectividad interpersonal en el trabajo, tolerancia al malestar)
→ Gestalt: experimento — representar la situación laboral como una escena y explorar qué rol se juega

SITUACIÓN: Sobrecarga y dificultad para decir no
→ Primario: DBT (efectividad interpersonal — DEAR MAN, FAST)
→ Secundario: PSICODINAMICO (exploración de patrones de complacencia, mentalización)
→ Gestalt: polaridades — diálogo entre la parte que dice sí a todo y la parte que está agotada

SITUACIÓN: Adaptación a enfermedad crónica o diagnóstico médico
→ Primario: TG3 (aceptación, clarificación de valores, acción comprometida en el nuevo contexto)
→ Secundario: INTEGRATIVO (reconexión mente-cuerpo, regulación somática, respiración regulada)
→ Gestalt: silla vacía — hablar con la enfermedad o con el cuerpo, preguntarle qué necesita

--- 8. MENTE-CUERPO ---

SITUACIÓN: Somatización (dolores sin causa médica clara)
→ Primario: INTEGRATIVO (conexión mente-cuerpo, body scan, integración somática)
→ Secundario: PSICODINAMICO (exploración de lo que el cuerpo expresa, mentalización)
→ Gestalt: awareness corporal — dar voz al síntoma corporal, preguntarle qué emoción guarda

SITUACIÓN: Trastornos alimentarios (restricción, atracón, purga)
→ Primario: INTEGRATIVO (reconexión mente-cuerpo, regulación somática)
→ Secundario: DBT (regulación emocional, tolerancia al malestar, análisis en cadena)
→ Gestalt: polaridades — diálogo entre la parte que controla la comida y la parte que necesita nutrirse

SITUACIÓN: Problemas de sueño crónicos
→ Primario: TCC (higiene del sueño, reestructuración de pensamientos sobre el insomnio, restricción de estímulos)
→ Secundario: INTEGRATIVO (regulación del sistema nervioso, relajación progresiva, respiración regulada)
→ Gestalt: experimento — explorar qué aparece en la mente cuando llega la hora de dormir, qué asunto inconcluso despierta

SITUACIÓN: Tensión corporal crónica y desconexión del cuerpo
→ Primario: INTEGRATIVO (grounding corporal, body scan, movimiento consciente, integración sensoriomotriz)
→ Secundario: TG3 (mindfulness, contacto con el momento presente)
→ Gestalt: awareness corporal — recorrer el cuerpo zona por zona, notar qué partes están tensas y qué emoción contienen
`;

export const GESTALT_ACTIVITIES = `
=== CATÁLOGO DE ACTIVIDADES GESTALT ===

--- SILLA VACÍA (silla_vacia) ---
Cuándo usar: Cuando hay asuntos inconclusos con una persona (viva o fallecida), cuando necesita decir algo no dicho, cuando hay duelo o pérdida, cuando hay conflicto con una figura significativa.
Descripción: El paciente imagina a una persona sentada en una silla frente a él/ella y le habla directamente. Puede alternar entre las dos sillas para responder desde la perspectiva del otro. El objetivo es completar lo inconcluso, expresar emociones retenidas y llegar a una nueva comprensión.
Ejemplos de facilitación:
- "Imagina que [persona] está sentada frente a ti ahora mismo. ¿Qué necesitas decirle?"
- "Si pudieras decirle algo que nunca le dijiste, ¿qué sería?"
- "Ahora cambia de lugar. Si fueras [persona], ¿qué responderías?"
- "¿Qué sientes en el cuerpo mientras le dices esto?"
- "¿Hay algo más que necesites expresar antes de cerrar este diálogo?"

--- DIÁLOGO DE POLARIDADES (polaridades) ---
Cuándo usar: Cuando hay ambivalencia, conflicto interno, partes contradictorias del self, cuando el paciente dice "una parte de mí quiere X pero otra quiere Y", cuando hay un crítico interno fuerte.
Descripción: El paciente da voz a dos partes opuestas de sí mismo (por ejemplo, el crítico y el vulnerable, el que quiere cambiar y el que tiene miedo). Cada parte habla desde su perspectiva. El objetivo es integración, no eliminación de una parte. Se busca que ambas partes se escuchen y encuentren una síntesis.
Ejemplos de facilitación:
- "Parece que hay dos partes en conflicto dentro de ti. ¿Puedes darle voz a cada una?"
- "Desde la parte que [quiere/siente X], ¿qué le dirías a la otra parte?"
- "Ahora habla desde la otra parte. ¿Qué responde?"
- "¿Qué necesita cada parte? ¿Hay algo en lo que ambas estén de acuerdo?"
- "Si estas dos partes pudieran llegar a un acuerdo, ¿cuál sería?"

--- AWARENESS CORPORAL (awareness_corporal) ---
Cuándo usar: Cuando hay desconexión del cuerpo, cuando las emociones se sienten en el cuerpo pero no se nombran, cuando hay somatización, cuando el paciente intelectualiza y necesita bajar al cuerpo, cuando hay ansiedad o tensión sin palabras.
Descripción: Se guía al paciente a llevar la atención al cuerpo, notar sensaciones, describir lo que encuentra sin juzgar, y explorar qué emoción o mensaje guarda cada sensación. El cuerpo es la puerta de entrada a la experiencia emocional completa.
Ejemplos de facilitación:
- "¿Puedes hacer una pausa y notar qué está pasando en tu cuerpo ahora mismo?"
- "¿Dónde sientes eso en el cuerpo? ¿Cómo lo describirías — tiene forma, color, temperatura, movimiento?"
- "Si esa sensación en [zona del cuerpo] pudiera hablar, ¿qué diría?"
- "¿Qué pasa cuando simplemente te quedas con esa sensación, sin intentar cambiarla?"
- "Recorre tu cuerpo de pies a cabeza. ¿Qué zonas están tensas? ¿Cuáles están relajadas?"

--- EXPERIMENTO VIVENCIAL (experimento) ---
Cuándo usar: Cuando se necesita explorar algo de forma vivencial y no solo intelectual, cuando hay evitación que se puede desafiar suavemente, cuando se quiere amplificar una experiencia para hacerla más visible, cuando se busca crear una nueva experiencia en sesión.
Descripción: Se propone una actividad concreta en sesión — puede ser imaginar una escena, exagerar un gesto, hablar con una parte de sí mismo, representar algo, o hacer algo diferente a lo habitual. El experimento no tiene "resultado correcto"; es una exploración. Lo importante es lo que emerge durante el proceso.
Ejemplos de facilitación:
- "¿Te gustaría intentar algo diferente ahora mismo? Es un pequeño experimento."
- "Imagina la escena que describes. ¿Qué ves? ¿Qué sientes? ¿Qué harías diferente?"
- "Intenta exagerar ese gesto que haces con la mano. ¿Qué notas cuando lo amplificas?"
- "Si pudieras actuar de la forma opuesta a como normalmente actúas en esa situación, ¿qué harías?"
- "Cierra los ojos un momento e imagina que estás en un lugar completamente seguro. Descríbelo."

--- DIÁLOGO INTERNO (dialogo_interno) ---
Cuándo usar: Cuando hay una voz interna crítica, cuando el paciente habla de sí mismo en segunda persona ("eres un tonto"), cuando hay un conflicto entre lo que se "debería" hacer y lo que se quiere hacer, cuando hay introyectos (creencias tragadas de otros sin digerir).
Descripción: El paciente identifica una voz interna (el crítico, el exigente, el miedoso, el saboteador) y entabla un diálogo directo con ella. Se busca escuchar qué dice esa voz, de dónde viene, qué intenta proteger, y qué necesita el paciente frente a ella. Se puede transformar la relación con esa voz.
Ejemplos de facilitación:
- "Esa voz que te dice '[frase del paciente]' — ¿de quién es originalmente? ¿A quién le suena?"
- "¿Puedes hablarle directamente a esa voz interna? ¿Qué le dirías?"
- "Si esa voz crítica tuviera una intención positiva, ¿cuál sería?"
- "¿Qué necesitas decirle a esa voz para que deje de ser tan fuerte?"
- "Imagina que puedes bajar el volumen de esa voz. ¿Qué otra voz aparece cuando esta se calma?"
`;
