# Intake Clínico Completo + Check-in entre Sesiones

## Resumen

Rediseñar el intake de 3 pasos mínimos (nombre/edad/género) a un formulario clínico completo en una sola pantalla con secciones acordeón. Agregar pantalla de check-in para sesiones 2+ que detecte cambios de vida relevantes.

## Contexto

- La aplicación es exclusivamente para el paciente, sin interacción de terapeuta
- Todo el lenguaje debe ser cotidiano y accesible
- Los datos recopilados alimentan los prompts de IA para análisis más precisos

## Tipo Patient expandido

```typescript
export type MaritalStatus = 'Soltero/a' | 'En pareja' | 'Casado/a' | 'Divorciado/a' | 'Viudo/a' | 'Separado/a';
export type LivingSituation = 'Solo/a' | 'Con pareja' | 'Con familia' | 'Con compañeros' | 'Con padres' | 'Otro';
export type EmploymentStatus = 'Empleado/a' | 'Desempleado/a' | 'Estudiante' | 'Independiente' | 'Jubilado/a' | 'Otro';

export type Patient = {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  maritalStatus: MaritalStatus;
  hasChildren: boolean;
  childrenCount?: number;
  livingSituation: LivingSituation;
  livingSituationDetail?: string;
  employment: EmploymentStatus;
  occupation?: string;
  hasSupportNetwork: boolean;
  supportDescription?: string;
  previousTherapy: boolean;
  previousTherapyDetail?: string;
  takingMedication: boolean;
  medicationDetail?: string;
  consultationReason: string;
  createdAt: number;
};
```

## Pantalla de Intake — Secciones Acordeón

Una sola pantalla con 5 secciones colapsables. Solo la primera abierta al inicio. Al completar una sección, se colapsa y la siguiente se abre automáticamente.

### Secciones

| Sección | Campos | Obligatorio |
|---------|--------|-------------|
| **Sobre ti** | nombre, edad, género | Sí |
| **Tu situación personal** | estado civil, hijos (sí/no + cuántos), con quién vives | Sí |
| **Ocupación** | situación laboral, ocupación (texto libre) | Laboral sí, ocupación opcional |
| **Tu red de apoyo** | ¿tienes personas de confianza? (sí/no), descripción breve | Sí/no obligatorio, descripción opcional |
| **Tu historial y motivo** | terapia previa (sí/no + detalle), medicación (sí/no + detalle), motivo de consulta (textarea) | Motivo obligatorio, resto sí/no obligatorio, detalles opcionales |

### UX

- Barra de progreso mostrando secciones completadas
- Botón "Comenzar mi proceso" en FloatingBar cuando todo obligatorio esté completo
- Chips/botones para opciones predefinidas (mismo estilo que selector de género actual)
- Lenguaje cotidiano: "¿Vives con alguien?" no "Situación habitacional"

## Check-in para Sesiones 2+

Pantalla breve antes de stage 2 cuando `sessionNumber > 1`.

### Datos

```typescript
// Nuevo campo en PatientSession
lifeChanges?: {
  categories: string[];
  detail?: string;
};
```

### Chips predefinidos

- "Cambié de trabajo"
- "Cambié de vivienda"
- "Cambio en mi relación"
- "Problema de salud"
- "Pérdida de alguien"
- "Conflicto familiar"
- "Cambio económico"
- "Otro"

### UX

- Pregunta: "Desde tu última sesión, ¿hubo algún cambio importante en tu vida?"
- Selección de chips + texto libre opcional
- Botón "Todo sigue igual, continuar" si no hay cambios

## Flujo de navegación

```
WELCOME → INTAKE (accordion) → ChapterTransition → SESSION (stage 2)
WELCOME → DASHBOARD → seleccionar paciente:
  - sessionNumber > 1 → CHECK_IN → SESSION (stage 2)
  - sesión activa → SESSION (resume)
```

`AppView` se extiende con `'CHECK_IN'`.

## Impacto en AI prompts

Los campos del paciente se inyectan como contexto en:
- `getNextTherapistQuestion` — adapta preguntas según contexto de vida
- `synthesizeConflicts` — enriquece análisis teórico
- `generateInterpretation` — interpretación más precisa
- `generateClosure` — estrategias personalizadas

Los `lifeChanges` del check-in se inyectan en los mismos prompts cuando `sessionNumber > 1`.
