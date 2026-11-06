# Agendoxa · Handoff de decisiones para resolver la auditoría DOM-01

**Fecha de consolidación:** 2026-11-04
**Repositorio objetivo:** `nanonoir/Agendoxa`
**Base documental de referencia:** rama `develop`, más cualquier cambio local no rastreado que pertenezca a la auditoría.
**Propósito:** alinear documentos funcionales, reglas, invariantes, modelo ERD y referencias a las decisiones tomadas tras la auditoría de 23 hallazgos (F-001 a F-023).
**Carácter:** decisiones acordadas con el responsable de producto en esta conversación. **No equivalen a aprobación formal de todo el equipo, ni a funcionalidad implementada.** Conservar los estados `In Review` / `Proposed` hasta la revisión correspondiente.

> Para el agente que elaboró el reporte: leé primero tu auditoría original y los archivos actuales. Este handoff **resuelve las opciones funcionales que estaban abiertas en el reporte**; no sustituye verificar el repositorio, el estado de las ramas ni los cambios locales. No reabras las decisiones enumeradas ni las reemplaces por propuestas anteriores contradictorias. Si la especificación técnica necesita una elección adicional que no se desprende de ellas, registrala como pendiente identificable, sin inventar aprobación.

## 0. Alcance y disciplina de trabajo

**Se pide una refactorización de documentación y diseño conceptual**, no implementar la aplicación. El código actual es un esqueleto: web inicial, API `/health`, contratos compartidos y paquete de base de datos placeholder. PostgreSQL/Drizzle, `pg-boss`, WhatsApp/IA, pagos, auth, reservas y ERD persistente todavía no están implementados.

1. Verificar `git status`, rama, último commit, archivos modificados y no rastreados. **No descartar, sobrescribir ni limpiar trabajo previo**. En particular, el reporte describió `docs/design-docs/erd.md` como no rastreado en el workspace del auditor; ese contenido local puede no existir en otra sesión o máquina. Si está presente, preservarlo e incorporarlo al análisis; si no, reportar que falta y reconstruir únicamente a partir de las decisiones comprobadas.
2. Trabajar sobre una rama de documentación derivada de `develop` conforme a `CONTRIBUTING.md`; evitar cambiar directamente `develop`, `staging` o `main`. Si se trabaja en la rama actual, asegurarse de no mezclar cambios ajenos.
3. Leer `AGENTS.md`, `CONTRIBUTING.md`, índices existentes y la auditoría original antes de editar. Respetar las instrucciones del repositorio; ningún archivo propuesto debe presentarse como aprobado automáticamente.
4. Modificar solo documentación, referencias y modelo ERD conceptual. **No introducir dependencias, migraciones, código, tablas físicas ni tests E2E**, salvo instrucción posterior explícita.
5. Una fuente canónica por tema: reglas de negocio en `docs/product-specs/uc-03/business-rules.md`; actores en `uc-01/actors.md`; flujos en `uc-01/flows.md`; escenarios en `uc-02/use-cases.md`; invariantes en `uc-03/invariants.md`; alcance en `mvp.md`; diseño técnico y ERD en `docs/design-docs/`. Mantener enlaces en vez de duplicar textos extensos. Las distintas responsabilidades son complementarias, no pretexto para silenciar inconsistencias.
6. Para cada hallazgo F-001..F-023: marcar `resuelto en diseño / pendiente de implementación`, identificar los archivos que cambian y aportar una verificación manual rastreable. No limitarse a marcarlo como resuelto en un resumen; corregir el texto fuente afectado. Marcar como pendiente de revisión de equipo cuando corresponda.
7. Validación focalizada: inspección de enlaces Markdown y Mermaid, búsqueda de afirmaciones antiguas contradictorias, `git diff --check`, `git status`, revisión del diff completo; documentar lo no validado. No lanzar suites costosas.

## 1. Decisiones funcionales acordadas: F-001 a F-023

### F-001 · RBAC configurable, sin excepciones por persona
- `User` es global y cada `TenantMembership` tiene **exactamente un `Role`** del tenant. Permisos **solamente por rol** a través de `RolePermission`, sin permisos directos por miembro ni privilegios delegados ad hoc.
- `Permission` es un catálogo definido por el sistema; roles locales por tenant, roles custom posibles, `Staff` modificable.
- `Admin` protegido, con acceso total, no borrable ni reducible; ciertas operaciones no delegables: administrar roles, excepciones a políticas comerciales, ajustes posteriores al cierre, administrar devoluciones y cambiar precios pactados. Proteger al último Admin activo. Verificación de permisos efectiva en backend, no solo en JWT o UI.
- Permisos operativos de caja y disponibilidad pueden asignarse a roles; preservar aislamiento entre tenants.
- Impacto principal: retirar la antigua especificación de roles fijos más dos permisos personales delegados.

### F-002 · Cuentas receptoras
- `ReceivingAccount` admite varias cuentas del tenant, cuenta predeterminada y rotación automática **opcional y configurable**. La cuenta indicada para una instrucción de pago queda fijada en esa transacción; no cambiar retroactivamente el destino tras rotar.
- Quitar la exclusión desactualizada de rotación automática en documentos de alcance, sin prometer integración bancaria ni algoritmo de rotación no acordado.

### F-003 · Origen de `Payment`
- `Payment` representa **dinero efectivamente verificado y perteneciente a una operación comercial del negocio**. No registra movimientos personales/ajenos o transferencias de origen totalmente desconocido.
- Un `Payment` comercial verificable puede quedar con **cero asignaciones** (`PaymentAllocation`) si, por ejemplo, corresponde a una reserva vencida. Debe conservarse origen comercial, método, comprobación humana, fechas y motivo.
- La imagen de un comprobante jamás es prueba suficiente de acreditación.

### F-004 · Saldos e imputaciones
- `PaymentAllocation` distribuye montos verificados entre cargos (`Charge`), incluso entre distintas reservas, con parcialidades y combinaciones; sin asignación automática.
- Saldo de un cargo = `max(0, importe neto exigible - asignaciones válidas)`. Disponibilidad de pago = `importe neto verificado y no reembolsado - asignaciones válidas` (considerar rectificaciones y reembolsos sin doble imputar).
- Excedentes permanecen no asignados; resolución manual: aplicar a otra obligación o devolución autorizada por Admin. No crear deudas negativas.
- Prevenir asignación superior al saldo disponible o a la deuda, aplicar atomicidad/idempotencia y preservar historial de correcciones sin borrar hechos anteriores.

### F-005 · Evidencia vs dinero
- `PaymentReview` = evaluación humana de evidencia, con estados pendiente/aprobado/rechazado; `Payment` = cobro comercial **verificado**.
- Pago verificado directamente en CRM (efectivo/transferencia) puede existir sin `PaymentReview`. Revisión aprobada puede vincularse como máximo a un pago (y viceversa, cuando exista vínculo); rechazar evidencia no crea `Payment`.
- La revisión pendiente ocupa la franja sin vencimiento automático por *simple falta de decisión humana*, con los matices de F-018 para evidencia expresamente rechazada.

### F-006 · Reprogramación con diferencia de seña
- Para una reserva existente con seña parcial **ya acreditada**, si la reprogramación está permitida y el horario destino está libre, **cambiar atómicamente al horario nuevo y liberar el anterior**; preservar las imputaciones/pagos ya verificados; pedir y verificar después la diferencia adicional.
- El nuevo horario queda reservado/confirmado, no como `HOLD` ni pendiente de la diferencia. Si el cliente no paga la diferencia, la reserva se mantiene y el negocio gestiona el incumplimiento **manualmente**, sin cancelación automática y sin recuperar automáticamente el horario anterior.
- Si el cambio exige una aprobación humana previa por política, no ocupar preventivamente la franja destino mientras espera esa autorización.
- `BookingChangeRequest` y `BookingEvent` dejan trazabilidad del cambio y su consecuencia financiera. **Actualizar la regla vieja BR-CAN-10 que exigía verificar la seña adicional antes de mover.** Mantener controles de restricciones como `FULL_PREPAYMENT` y excepciones solo Admin.

### F-007 · Finalización temprana / NO_SHOW y reaprovechamiento interno
- Un `COMPLETED` temprano o `NO_SHOW` **no libera automáticamente el tiempo sobrante** a WhatsApp, agenda pública ni waitlist.
- Staff/rol con permiso de reservar puede usar explícitamente el resto del horario para un **walk-in creado desde CRM** (nombre requerido, teléfono opcional); la operación debe ajustar la ocupación anterior y crear la nueva **atómicamente**, sin solapes y conservando el historial original.
- El tiempo sobrante se mantiene privado/restringido para ofertas automáticas hasta su reasignación interna; documentar cuidadosamente semántica `SlotClaim` y disponibilidad para que no aparezca un hueco público accidental. Corregir posteriormente el NO_SHOW no desplaza al walk-in.
- No recalcular ni devolver automáticamente cobros por completar temprano.

### F-008 · Oferta de waitlist a reserva
- Aceptar una `ExclusiveOffer` vigente (ventana exclusiva de **5 minutos**) debe cerrar/expirar su `SlotClaim` activo y crear **otro** `SlotClaim` para la nueva `Booking` en `HOLD` de **10 minutos**, todo atómicamente.
- No reasignar la titularidad del mismo claim histórico, porque rompe la trazabilidad y el XOR de pertenencia: cada claim pertenece a **Booking o ExclusiveOffer**, nunca ambos. Vincular oferta a reserva resultante (opcional 0..1) para rastrear conversión. No doble ocupación activa.

### F-009 · Preferencia de recurso en waitlist
- `WaitlistEntry.resource_id` **opcional**. Si tiene valor, solo ese recurso, validado como del mismo tenant y compatible con `Service`; si `NULL`, cualquier recurso compatible con el servicio.
- Respetar preferencias temporales y prioridad por llegada **entre entradas elegibles**. El ingreso a waitlist no ocupa horarios; la oferta sí durante su exclusividad.

### F-010 · Prioridad de políticas
- `BookingPolicy`: valores por campo con precedencia **Resource > Service > Tenant**; distinguir explícitamente `inherit`, `set` y `disable`, sin interpretar `NULL` ambiguamente.
- Restricción `FULL_PREPAYMENT` domina las reglas normales de seña, salvo excepción Admin autorizada. Documentar decisión sin inventar valores default.

### F-011 · Disponibilidad y aperturas extraordinarias
- Horario efectivo regular = reglas del tenant y del recurso, con herencia del general si el recurso no define horario propio.
- `AvailabilityException` de **apertura extraordinaria autorizada** puede ampliar el horario regular; disponible por CRM y WhatsApp (no restringida tácitamente al canal de quien la creó).
- No sobreescribir bloqueos explícitos ni claims activos; modificar o quitar un bloqueo requiere permiso y acción explícita. Permiso de disponibilidad delegado **por rol** (F-001), sin excepción comercial automática.

### F-012 · Caja y efectivo
- A lo sumo **una `CashSession` abierta por tenant**. Pago en efectivo exige sesión abierta.
- Si la apertura automática está configurada, el primer cobro abre la sesión; si la apertura es manual, personal autorizado debe abrir antes de registrar el efectivo.
- Transferencias verificadas no requieren caja física. Cierres **siempre manuales**, autorizados e inmutables. Cobro vs cierre concurrente requiere serialización transaccional: cobro entra antes del cierre o exige nueva sesión válida.
- Saldo inicial debe ser explícito y auditable (primera apertura sin historial: declararlo; sucesivas: reconciliar con cierre previo). No fabricar saldos. Acreditación/verificación tardía de transferencia no modifica caja cerrada.

### F-013 · Devoluciones y ajustes
- Pago original y devolución son **operaciones independientes, vinculadas e históricas**; nunca reemplazar/mutar el importe original.
- Agregar la entidad conceptual `Refund`: `Payment` 1:N `Refund`; importe, método (efectivo/transferencia), motivo, autorización Admin, estado de ejecución, fechas, referencia origen/destino y trazabilidad.
- Solo la devolución **efectivamente ejecutada** reduce fondos retenidos. No permitir devolver por encima del importe neto disponible; gestionar competencia entre devoluciones pendientes y asignaciones sin exceso. Corregir asignaciones asociadas mediante historial, sin borrar operaciones.
- Una devolución en efectivo genera salida `CashMovement` dentro de sesión abierta. Transferencia manual se registra como salida bancaria **sin** `CashMovement`. `CashAdjustment` sigue reservado a correcciones de caja posteriores al cierre; `AuditEvent` no suplanta libro financiero.
- Recuento conceptual: 36 entidades originales + `Refund` + `NotificationAttempt` = **38**. No crear una tabla nueva de consentimiento.

### F-014 · Evitar doble contabilización
- `Payment` y `CashMovement` de un mismo cobro en efectivo son dos perspectivas **del mismo dinero**, no dos ingresos sumables.
- Caja física: saldo inicial + movimientos físicos firmados; transferencias no aumentan efectivo. En reportes comerciales usar importes netos verificados, imputaciones y devoluciones sin sumar nuevamente la representación de caja.
- Vincular y deduplicar los registros del mismo hecho con operaciones atómicas e idempotentes.

### F-015 · Consentimiento y auditoría
- **NO crear `ConsentEvent` ni `NotificationConsent`.** Estado vigente de recordatorios en `Customer`; consentimiento específico para waitlist en `WaitlistEntry`, independientes entre sí.
- Registrar **solo otorgamientos y revocaciones** de consentimiento en `AuditEvent`, con fecha, canal, alcance y actor (cliente/empleado/sistema, según sea el caso). No guardar un evento de auditoría por cada recordatorio, mensaje o reintento.
- Cambiar estado y escribir auditoría transaccionalmente. Revocar impide envíos futuros aunque estuviesen encolados.

### F-016 · Aviso lógico vs reintentos
- `Notification`: **un aviso lógico** programado, enviado, omitido o fallido. `NotificationAttempt`: **una fila por intento**, con tiempo, resultado, error y referencia opcional a `Message`.
- `Tenant` 1:N `Notification`; `Notification` 1:N `NotificationAttempt` (admite 0 intentos); cada intento produce **0..1 `Message`**. Preservar vínculo `Message` con `Conversation`.
- `pg-boss` gestiona ejecución y reintentos; no agregar tabla Jobs propia ni duplicar `Notification` en un reintento. Antes de cada intento revisar consentimiento, reserva/horario vigente y expiración de oferta.
- Proveedor aceptó ≠ entregado al usuario. Ante timeout de resultado incierto, reconciliar antes de reenviar cuando sea posible. Retención operativa documentada; no declarar retención infinita ni un número ficticio.

### F-017 · Ausencias y responsabilidad
- **El cliente que realiza/es responsable de la reserva carga el `NO_SHOW`, independientemente de quién iba a asistir**. Esto sustituye la distinción anterior de ausencias propias vs terceros.
- `Booking.status`/resultado operativo vigente es **única fuente canónica** del conteo `NO_SHOW`, por `Booking.customer_id`; `BookingEvent` conserva quién registró/corrigió y los cambios. Contar desde reservas, no sumar `CustomerIncident`.
- **Conservar `CustomerIncident`** exclusivamente para otros incidentes operativos vinculados a reservas, como daños o conducta. Mantener `CustomerRestriction` para restricciones manuales con motivo.
- A partir de 2 ausencias, mostrar **indicador interno**, sin sanción automática. Corrección recalcula conteo; corregir no-show no expulsa walk-in que reutilizó tiempo conforme F-007. No fusionar clientes solo por nombres.

### F-018 · Evidencia rechazada y ventana de corrección
- **Primer rechazo** de comprobante de la **seña inicial**: notificar al cliente y dar **15 minutos** para presentar nueva evidencia o resolver válidamente con personal. Durante el plazo la franja sigue ocupada.
- Si llega un **comprobante nuevo a tiempo**, crear otra `PaymentReview` y reenviar solicitud de verificación humana; **suspender cancelación automática mientras la revisión esté efectivamente pendiente**. No sobrescribir el rechazo anterior.
- **Segundo rechazo humano de comprobante distinto** de la misma reserva: cancelar la reserva y liberar la franja **inmediatamente**, sin nuevo plazo de 15 minutos; avisar al cliente y **notificar al personal** para intervención. Los intentos técnicos duplicados no cuentan como rechazos distintos.
- Si expira el primer plazo sin evidencia válida ni resolución manual, cancelar y liberar atómicamente. Nuevos rechazos **no reinician** la ventana; prórrogas, si se admiten, explícitas/autorizadas/auditadas; no suponer extensión automática.
- Cancelación y claim transaccionales e idempotentes; el worker debe revalidar estado, tiempo y revisión humana activa antes de ejecutar.
- **No cancelar ni exponer al público el resto de un turno iniciado**; escalar a resolución manual y respetar F-007. Un pago parcial verificado se conserva como `Payment` y se resuelve según obligaciones/política: no borrarlo por rechazo. **No aplicar este mecanismo a la seña adicional de F-006**, cuya reserva reprogramada se conserva.

### F-019 · Fuente de documentación canónica
- Una única fuente responsable por tema, enlaces cruzados, sin duplicar literalmente las mismas reglas en varios lugares. Mantener información explicativa adaptada a la función de cada documento, **sin contradicciones**.
- Verificar referencias/versiones y corregir texto viejo, no simplemente añadir un apéndice que diga otra cosa. Conservar estado de propuesta/revisión; decisiones de producto tomadas con una persona no equivalen a aprobación colectiva.

### F-020 · Opt-in independiente
- Consentimiento de recordatorios (`Customer`) y opt-in de lista de espera (`WaitlistEntry`) son **independientes**, no derivar uno del otro ni exigir uno para permitir el otro.
- Ofertas waitlist requieren opt-in específico vigente; revocaciones auditadas (F-015), envío vuelve a validar permiso antes de actuar.

### F-021 · Índice del ERD
- `docs/design-docs/index.md` es índice técnico existente; incorporar enlace a `docs/design-docs/erd.md` **solo cuando el archivo esté efectivamente versionado**, con estado real de propuesta/revisión.
- En la verificación realizada, `erd.md` **no existía en `develop`**, y la auditoría lo describía como archivo local **untracked**. No asumir que ese archivo está accesible para este agente; buscarlo sin destruir cambios. Evitar crear `docs/domain/` como árbol paralelo.

### F-022 · Ubicación de ADR
- `docs/design-docs/index.md` es explícito: `docs/adr/` es solo una sugerencia histórica, **no colección activa**. Conservar decisiones técnicas duraderas en `docs/design-docs/` bajo su índice; cambiar la sección 14.1 de `target-architecture.md` para eliminar referencia contradictoria a `docs/adr/`.
- No inventar ADR anteriores ni convertir automáticamente propuestas en decisiones aprobadas.

### F-023 · Recordatorios programados en el pasado
- Si al confirmar una reserva `booking.start_at - reminder_lead_time <= instante de confirmación`, **omitir** ese recordatorio. La **confirmación** es otro aviso independiente.
- Al reprogramar, invalidar recordatorio previo; calcular para el nuevo horario y programar solo si corresponde; al cancelar, impedir el envío.
- Usar zona horaria del tenant para reglas de calendario y UTC para instantes, incluyendo cruces de día; comprobar consentimiento y estado actual justo antes de cada envío. `Notification` puede registrar omisión sin `NotificationAttempt` cuando no hubo intento.

## 2. Inventario conceptual esperado: 38 entidades

Se parte de 36 entidades previas, sin eliminar `CustomerIncident`, sin crear entidad para consentimientos, **agregando únicamente `Refund` y `NotificationAttempt`**.

| Módulo lógico | Entidades | Total |
|---|---|---:|
| Identidad | `Tenant`, `User`, `TenantMembership`, `Role`, `Permission`, `RolePermission` | 6 |
| Clientes | `Customer` | 1 |
| Catálogo/disponibilidad | `Service`, `Resource`, `ServiceResource`, `AvailabilityCalendar`, `AvailabilityRule`, `AvailabilityException`, `BookingPolicy` | 7 |
| Reservas/waitlist | `Booking`, `SlotClaim`, `BookingChangeRequest`, `BookingEvent`, `WaitlistEntry`, `ExclusiveOffer` | 6 |
| Finanzas/caja | `Charge`, `ReceivingAccount`, `PaymentReview`, `Payment`, `PaymentAllocation`, `CashSession`, `CashMovement`, `CashAdjustment`, **`Refund`** | 9 |
| Mensajería | `ChannelConnection`, `Conversation`, `Message` | 3 |
| Assets | `StoredAsset` | 1 |
| Notificaciones | `Notification`, **`NotificationAttempt`** | 2 |
| Incidentes/auditoría | `CustomerIncident`, `CustomerRestriction`, `AuditEvent` | 3 |
| **Total** | | **38** |

Esto es **inventario conceptual candidato**, no la orden de crear 38 tablas físicas ya ni la aprobación definitiva de un esquema de columnas. El ERD debe distinguir lo aprobado funcionalmente, lo inferido técnicamente y lo que necesita validación.

## 3. Ubicación documental real que debe respetarse

Existentes y verificadas en `develop` en revisión previa:

- `AGENTS.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md` (en la raíz).
- `docs/product-specs/index.md`, `docs/product-specs/mvp.md`.
- `docs/product-specs/uc-01/actors.md`, `docs/product-specs/uc-01/flows.md`.
- `docs/product-specs/uc-02/use-cases.md`.
- `docs/product-specs/uc-03/business-rules.md`, `docs/product-specs/uc-03/invariants.md`.
- `docs/design-docs/index.md`, `docs/design-docs/target-architecture.md`.
- `docs/PLANS.md` y `docs/exec-plans/` para **planes de implementación**, no como segunda fuente de reglas.

No inventar `docs/domain/`, `docs/adr/` ni duplicar índices. `ARCHITECTURE.md` describe **lo que existe**, no el objetivo futuro. `AGENTS.md` es guía para agentes; el global del usuario no debe asumirse ni sustituirse por otro texto contradictorio. `CONTRIBUTING.md` es propuesta vinculada a Issue #18 sujeta a revisión: respetar el estado.

## 4. Entregables esperados del agente

1. **Plan breve**: archivos a tocar, conflictos concretos, orden de edición y riesgos para documentos no rastreados.
2. **Refactorización documental**: corregir las reglas obsoletas y referencias cruzadas; actualizar las especificaciones, invariantes, flujos, ERD e índices, sin crear copias contradictorias.
3. **Matriz de trazabilidad F-001..F-023**: para cada uno, decisión aplicada, archivos cambiados, comprobación y estatus (`documentado`; `pendiente equipo`; `pendiente implementación`). No declarar que código inexistente fue validado.
4. **Validación**: enlaces relativos correctos, Mermaid comprobable por inspección o herramienta disponible, estado correcto, 38 entidades candidatas, `git diff --check`, diff completo revisado, ninguna modificación de código/dependencias.
5. **Resumen de entrega**: lista de archivos modificados/nuevos/no tocados, contradicciones eliminadas, decisiones técnicas realmente no resueltas (si quedan), y PR sugerido hacia `develop` conforme `CONTRIBUTING.md`. No hacer merge ni push sin petición explícita.

## 5. Comprobaciones de contradicciones de alto riesgo

Buscar y corregir especialmente afirmaciones anteriores como:

- RBAC exclusivamente Admin/Staff con privilegios por miembro (F-001).
- Rotación automática de cuentas expresamente fuera de alcance (F-002).
- Devolución como mutación de importe original o ingreso `Payment` negativo, o salida de transferencia como `CashMovement` (F-013/014).
- Seña adicional verificada **antes** de aplicar toda reprogramación (F-006).
- Liberar automáticamente al público resto de servicio completado/NO_SHOW (F-007).
- Reasignar el mismo claim de oferta a reserva (F-008).
- Incidentes de terceros que no cuentan al responsable de la reserva (F-017).
- Duplicar un incidente `NO_SHOW` además del `Booking` (F-017).
- Revisión **rechazada** bloqueando indefinidamente sin plazo o sin límite de dos rechazos (F-018), confundida con revisión **pendiente** legítima (F-005).
- Recordatorios enviados inmediatamente cuando su adelanto configurado ya pasó (F-023).
- Consentimiento de waitlist condicionado al consentimiento general de recordatorios (F-020).
- ADR activos en `docs/adr/` (F-022).

## 6. Criterio de aceptación final

Un lector nuevo (humano o agente) debe poder leer los índices, localizar la única regla canónica correspondiente, seguir los diagramas y el ERD, y reconstruir **sin contradicción** los 23 acuerdos de arriba. Todo lo que aún requiera diseño de columnas, algoritmo o revisión de equipo debe estar etiquetado como tal. El resultado es una **propuesta documental coherente y lista para PR**, nunca una afirmación de sistema implementado.
