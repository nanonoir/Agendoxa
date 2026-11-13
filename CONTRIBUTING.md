# Colaborar en Agendoxa

Este documento reúne el acuerdo de colaboración para personas y asistentes. La instalación y los comandos están en el [README](README.md); las referencias funcionales y técnicas se encuentran en los índices de [producto](docs/product-specs/index.md) y [diseño](docs/design-docs/index.md).

> Propuesta de DOC-01 ([Issue #18](https://github.com/nanonoir/Agendoxa/issues/18)): estas convenciones y la Definition of Done quedan sujetas a revisión y aprobación del equipo mediante el PR correspondiente. No describen protecciones o automatizaciones ya configuradas en GitHub.

## Flujo rápido

1. Elegí un Issue, revisá sus dependencias y coordiná su asignación.
2. Actualizá tu base local y creá una rama por tarea desde `develop`.
3. Implementá el alcance, comunicá impactos compartidos y validá lo afectado.
4. Abrí un PR hacia `develop`, vinculá el Issue y solicitá revisión.
5. Resolvé observaciones y conflictos. Integrá solo después de la aprobación de otro integrante y de cumplir los criterios previos a la integración de la [Definition of Done](#definition-of-done).
6. Actualizá el Issue y su seguimiento en Projects.

## Issues y GitHub Projects

- Antes de comenzar, leé el objetivo, alcance, criterios de aceptación, dependencias y comentarios del Issue. Revisá si tiene responsable o trabajo en curso para evitar duplicaciones.
- Asignate el Issue o coordiná la responsabilidad con quien ya figure asignado. Si participan varias personas, dejá explícita la división del trabajo.
- Si la tarea se sigue en GitHub Projects, asociá el Issue al tablero del equipo y actualizá el estado al comenzar, solicitar revisión y terminar. Usá los nombres de estados existentes; este documento no establece columnas nuevas ni presupone automatizaciones.
- Si no tenés acceso al tablero o no sabés cuál corresponde, avisá en el Issue y mantené allí el progreso mientras se resuelve, sin detener trabajo independiente.
- Registrá bloqueos, cambios de alcance y decisiones relevantes en el Issue o el PR. Si una dependencia impide validar o completar algo, explicitá qué queda pendiente; no marques la tarea como terminada.
- Al integrar, comprobá el cierre del Issue cuando todos sus criterios estén cumplidos y actualizá el Project. Un PR parcial no debe cerrar automáticamente toda la tarea.

## Ramas y commits

### Base de trabajo

El flujo es **rama de tarea → `develop` → `staging` → `main`**. Las ramas de tarea parten de `develop`; el término feature incluye también correcciones, documentación y mantenimiento.

| PR | Propósito | Revisión requerida |
|---|---|---|
| Rama de tarea → `develop` | Integrar el cambio de una tarea | Al menos una aprobación de otro integrante |
| `develop` → `staging` | Preparar y validar una entrega integrada | Al menos una aprobación de otro integrante |
| `staging` → `main` | Promover la entrega validada a la rama principal | Al menos una aprobación de otro integrante, distinto del autor del PR |

Cada promoción se realiza mediante un PR que describe el contenido de la entrega y su validación. La aprobación de una etapa no reemplaza la revisión de la siguiente: **pasar de `staging` a `main` requiere su propia revisión y aprobación de otro integrante**. No hagas pushes directos a las ramas compartidas ni reescribas su historial. Este flujo no presupone despliegues automáticos ni protecciones ya configuradas.

Antes de crear una rama, revisá `git status`. Conservá los cambios pendientes mediante un commit en su rama o un stash que incluya los archivos nuevos pertinentes. No descartes trabajo para actualizarte.

Con el árbol limpio:

```bash
git switch develop
git pull --ff-only origin develop
git branch docs/18-collaboration-conventions
git switch docs/18-collaboration-conventions
```

Si la actualización no puede hacerse por avance rápido, revisá la divergencia antes de continuar; no uses un reset para sobrescribirla.

### Nombres

Usá `<tipo>/<identificador>-<descripcion-breve>`, con descripción en minúsculas y palabras separadas por guiones. El identificador puede ser el código de backlog o el número del Issue; vinculá siempre el Issue en el PR.

| Ejemplo | Uso |
|---|---|
| `feat/UC-01-booking-flow` | Funcionalidad |
| `fix/42-booking-validation` | Corrección |
| `chore/REP-01-monorepo` | Mantenimiento o configuración |
| `docs/18-collaboration-conventions` | Documentación |

Preferí [Conventional Commits](https://www.conventionalcommits.org/): `<tipo>(<scope opcional>): <resumen>`. Por ejemplo, `docs: document collaboration conventions` o `fix(api): validate booking input`. Usá commits coherentes y descriptivos, no un archivo por commit ni mensajes genéricos como “cambios”. No mezcles refactorizaciones ajenas a la tarea.

Los tipos permitidos para los commits escritos por el equipo son:

| Tipo | Uso |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de un defecto |
| `docs` | Documentación |
| `refactor` | Reorganización de código sin cambiar su comportamiento |
| `test` | Incorporación o ajuste de pruebas |
| `perf` | Mejora de rendimiento |
| `build` | Sistema de compilación, empaquetado o dependencias |
| `ci` | Configuración de integración y automatización de CI/CD |
| `chore` | Mantenimiento sin cambio funcional que no encaja en un tipo más específico |
| `revert` | Reversión de un cambio anterior |

**`chore` está permitido**, pero no reemplaza tipos más precisos: un cambio exclusivo de documentación es `docs`, uno de dependencias es `build` y uno de workflows es `ci`. Los mensajes de merge generados por Git o GitHub no necesitan reescribirse para seguir este formato.

## Coordinación y conflictos

Los cambios en contratos compartidos, configuración, dependencias o futuras migraciones deben **comunicarse a los integrantes afectados**, mediante el Issue, el PR o el canal habitual del equipo. Si la conversación ocurre fuera de GitHub, resumí allí las decisiones que necesiten conservarse.

**Avisar no exige esperar aprobación previa.** Se puede continuar en la rama de tarea y presentar la decisión y sus impactos en el PR, donde el equipo podrá aprobarla, pedir cambios o rechazarla. Esto no autoriza a integrar cambios sin revisión ni a dar por aprobadas reglas de producto pendientes. Las dudas que impidan implementar correctamente deben señalarse, no resolverse inventando requisitos.

- Integrá novedades de `develop` con frecuencia razonable y antes de fusionar si afectan tu cambio. Evitá reescribir historial publicado; un merge de `origin/develop` en tu rama permite actualizarla sin force-push.
- El autor del PR resuelve los conflictos. Revisá las dos versiones y consultá a los afectados si la intención no es clara; no elijas “ours” o “theirs” indiscriminadamente.
- Después de resolver conflictos, revisá el diff completo y repetí las validaciones afectadas.
- Si cambia contenido relevante después de una aprobación, solicitá una nueva revisión antes de integrar.

## Pull Requests y revisión

Abrí PRs pequeños y enfocados usando la [plantilla](.github/PULL_REQUEST_TEMPLATE.md). Explicá el resultado, las decisiones, el impacto y la validación real. Vinculá el Issue; usá `Closes #18`, por ejemplo, solo si el PR completa la tarea. Para entregas parciales, usá `Refs #18`. No supongas que GitHub cerrará un Issue automáticamente al integrar en una rama que no sea la predeterminada: verificá el seguimiento.

Un PR draft permite compartir trabajo temprano. Cuando esté listo para revisión, solicitá **al menos una aprobación de otro integrante del equipo**, sin importar su especialidad. La prioridad orienta a quién pedir revisión primero; no es una lista de aprobadores exclusivos ni exige esperar a alguien en particular. Omití al autor de la selección.

| Área principal | Orden preferido para solicitar revisión |
|---|---|
| Frontend | Agus, Nano, Nuria, Valentino |
| Backend | Gonzalo, Nano, Nuria |
| Full-stack u otros | Nano, Nuria, Gonzalo, Agus, Valentino |

Solicitá revisión cuando el alcance esté explicado y las validaciones estén informadas, o antes si necesitás feedback puntual, dejándolo explícito. Los cambios compartidos deben hacer visible a quién afectan; no requieren aprobaciones adicionales por especialidad.

Quien revise debe comprobar criterios de aceptación, corrección, legibilidad, riesgos y evidencia de validación. Distinguí comentarios bloqueantes de sugerencias. Respondé observaciones y resolvé las bloqueantes antes de integrar; si hay desacuerdo, discutí el criterio con el equipo en el PR.

Integrá únicamente cuando se cumplan los criterios previos a la integración de la DoD, exista la aprobación requerida, no haya conflictos ni solicitudes de cambios pendientes, y los checks obligatorios que existan estén satisfechos. Usá un método de merge permitido por el repositorio y preservá commits útiles para la revisión. No saltees restricciones ni actives integración automática sin acuerdo. Después, verificá la integración y eliminá la rama remota solo si nadie depende de ella.

### Verificaciones antes de integrar

| PR | Verificación esperada |
|---|---|
| Tarea → `develop` | Controles focalizados del workspace afectado, según [AGENTS.md](AGENTS.md#focused-validation), informados en el PR. El CI no se ejecuta en estos PRs |
| Promoción → `main` | El workflow de CI ejecuta los jobs `quality` (formato, lint, tipos, pruebas unitarias, build y metadata de migraciones) y `database-integration` (PostgreSQL 18 descartable). Ambos deben pasar |

La [verificación completa del README](README.md#verificación-completa) reproduce el CI localmente. Si un check falla, corregí la causa: no lo saltees ni lo marques como exitoso. Que el CI esté en verde no implica que existan RLS, autorización, reglas de reservas ni despliegue.

## Organización y nomenclatura del código

- Usá identificadores técnicos en inglés y nombres que expresen responsabilidad. Conservá el idioma de los documentos existentes.
- Respetá el estilo y la configuración del workspace afectado. `pnpm format:check` verifica el formato de todo el repositorio con la configuración de Prettier de cada workspace; no reformatees archivos ajenos como parte de otra tarea.
- Ubicá código según las responsabilidades descritas en [ARCHITECTURE.md](ARCHITECTURE.md). No importes internals de otra aplicación: los contratos portables se consumen desde `@agendoxa/shared`; la persistencia es solo servidor.
- Seguí las convenciones locales de imports y resolución de módulos. Agregá módulos y capas cuando sean necesarios, no para reproducir estructuras propuestas.
- Consultá las especificaciones antes de cambiar reglas de negocio y actualizá su fuente correspondiente cuando una decisión acordada las modifique. Evitá copiar reglas entre documentos, frontend y herramientas de IA.

### Nombres de archivos, carpetas y módulos

| Elemento | Convención | Ejemplo |
|---|---|---|
| Carpetas de features y módulos | `kebab-case`, agrupadas por responsabilidad | `booking-management/` |
| Archivos TypeScript generales | `kebab-case.ts` | `booking-policy.ts` |
| Archivos de NestJS | Nombre en `kebab-case` más sufijo de responsabilidad | `booking.controller.ts`, `booking.service.ts`, `booking.module.ts` |
| Módulos de NestJS | Clase en `PascalCase` con sufijo `Module`; agrupar por capacidad, no crear módulos vacíos | `BookingModule` en `booking.module.ts` |
| Componentes React propios | Nombre y archivo en `PascalCase` | `BookingCard` en `BookingCard.tsx` |
| Clases, interfaces y tipos | `PascalCase` | `BookingService`, `BookingInput` |
| Variables y funciones | `camelCase` | `bookingId`, `createBooking` |
| Tests unitarios | Nombre del archivo probado más `.spec.ts`, sustituyendo `.ts` | `booking.service.spec.ts` |
| Tests E2E | Nombre del escenario o área más `.e2e-spec.ts` | `booking.e2e-spec.ts` |

Los nombres especiales del framework o del tooling conservan su forma requerida, como `page.tsx`, `layout.tsx`, `route.ts`, `index.ts` o `package.json`. Respetá también las convenciones de rutas de Next.js. Estas reglas se aplican al código nuevo; no implican renombrar código existente ni mover archivos ajenos al cambio.

## Uso de asistentes y configuración personal

Cada integrante puede elegir su herramienta, modelo y configuración local. No se requieren agentes, skills ni comandos personales de otro integrante.

El acuerdo del equipo vive aquí. [AGENTS.md](AGENTS.md) proporciona a los asistentes el mapa operativo del proyecto y referencia estas convenciones; no constituye un proceso de colaboración paralelo.

- Las configuraciones personales deben complementar las reglas del repositorio, no sustituirlas. Cada integrante debe configurar su herramienta para respetarlas.
- Si una instrucción global contradice el acuerdo, ajustá la configuración personal o señalá el conflicto antes de ejecutar la acción afectada. No ignores silenciosamente una regla ni detengas trabajo independiente por ese motivo.
- No impongas aprobaciones previas, herramientas ni artefactos adicionales por preferencia de un asistente. La comunicación y revisión siguen el mismo flujo que los cambios hechos manualmente.
- El autor sigue siendo responsable del código, la documentación y la validación que entrega, aunque haya usado IA. No subas secretos ni afirmes haber ejecutado verificaciones que no se realizaron.

Los archivos del repositorio no garantizan por sí solos la precedencia de instrucciones de todas las herramientas. La revisión del equipo sigue siendo necesaria.

## Definition of Done

Una tarea está terminada cuando:

- [ ] Se cumplen su alcance y criterios de aceptación; no quedan pendientes bloqueantes ocultos.
- [ ] El cambio es enfocado, comprensible y sigue las convenciones del workspace.
- [ ] Se ejecutaron las verificaciones proporcionales al riesgo y se informaron resultados y limitaciones. Si una validación pendiente impide comprobar un criterio, la tarea no está terminada.
- [ ] Se actualizaron documentación, contratos y consumidores afectados, cuando corresponde, sin duplicar fuentes de verdad.
- [ ] Se comunicaron los impactos compartidos y se registraron decisiones relevantes.
- [ ] No se incluyen secretos, cambios ajenos ni archivos temporales.
- [ ] El PR está vinculado al Issue, recibió al menos una aprobación de otro integrante y no tiene observaciones bloqueantes ni conflictos pendientes.
- [ ] El cambio se integró en la rama de destino y se verificó el resultado: `develop` para tareas, `staging` o `main` para promociones, respetando la revisión requerida en cada etapa.
- [ ] El Issue y su seguimiento en Projects reflejan el resultado real, con cierre solo cuando corresponde.

Esta DoD evalúa el resultado final. Antes del merge, la plantilla del PR permite verificar que esté listo para integrarse; las dos últimas comprobaciones se completan después.

## Evolución del acuerdo

Proponé ajustes justificados mediante PR y revisión del equipo; no conviertas una preferencia personal en una regla unilateral. Las decisiones de herramientas de calidad y CI están en el [diseño DOC-02](docs/design-docs/doc-02-quality-ci.md); el proceso detallado de ADRs, a DOC-03. Este acuerdo no exige crear un Plan Maestro ni ExecPlans para completar DOC-01.
