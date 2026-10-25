# CLAUDE.md — ActiveHub Frontend (Vite + React)

> **BITÁCORA DEL INFORME — se mantiene siempre.** Todo cambio que pueda afectar el informe final del Proyecto Final (UTN FRM) se registra en `docs/BITACORA-INFORME.txt`, **de este repo y del backend** (copias espejo, UTF-8, sin Markdown). Formato: un bloque `ESTADO GENERAL` al principio que se **reemplaza** en cada actualización, y debajo entradas numeradas que **solo se agregan** — nunca se borra ni se reescribe una entrada anterior; si algo cambió, se agrega una entrada nueva que lo aclare. Se actualiza al terminar cada tarea o grupo de commits y antes de cerrar la sesión de trabajo.
> Reglas que no se negocian: los números salen de **ejecutar comandos**, no de estimar (ESLint, `tsc -b`, suite del backend, conteo de pantallas), indicando el comando usado; se distingue IMPLEMENTADO / PROBADO / PARCIAL / PENDIENTE / RETIRADO y **nunca** se marca como probado algo que no se ejecutó; los textos de interfaz nuevos o modificados se copian **literales**, con el `*` de los campos obligatorios (sirven para el manual de usuario); **nunca** se escriben contraseñas, tokens ni claves. Si creás una pantalla, una historia de usuario o una regla nueva, proponé el código siguiente de su serie y marcalo como NUEVO. El formato completo de cada entrada está en la cabecera del propio archivo y en el encargo original del usuario.

Convenciones de este repositorio. Leer **antes** de escribir código. Repo hermano `activehub-backend` (Spring Boot) es el único backend — su propio `CLAUDE.md` tiene el detalle de endpoints y reglas de negocio.

## Qué es
SPA de ActiveHub para los 3 roles (Alumno, Instructor, Administrador). React 19 + TypeScript + Vite, **sin librería de UI** (ni Tailwind ni Material, etc.) — todo con estilos inline vía el helper `s()` de `src/lib/style.ts`, que parsea un string CSS literal (`"display:flex;gap:10px;"`) a un objeto de React, cacheado. Se sigue así en todo el proyecto, no introducir una librería de estilos nueva a mitad de camino.

## Estructura
- `src/pages/<rol>/Pantalla.tsx` — una pantalla por archivo, sin sub-carpetas de componentes por pantalla.
- `src/**/*.test.ts(x)` — las pruebas, al lado de lo que prueban. `src/test/setup.ts` es la preparación común. Ver "Pruebas automatizadas" y `docs/PRUEBAS.md`.
- `src/components/` — compartidos entre pantallas. Navegación y sesión: `DashLayout`/`DashSidebar` (instructor/admin), `AlumnoNav` (alumno), `Footer` (todas), `NotificationBell`, `Logo`, `Avatar`, `BotonGoogle`, `CambiarEmailCard`. Guardas: `RequireArea`, `RequirePermiso`, `RequireEmailVerificado`, `RequirePerfilCompleto`. Piezas de UI: `ActivityCard`, `ActivityPhoto`, `StatusBadge`, `Modal`, `Cargando`, `ErrorReintentar`, `GraficoBarras`, `LeafletMap`, `ChatbotWidget`.
- `src/context/AuthContext.tsx` — sesión real (JWT en `localStorage`, login/logout/registro, permisos, perfil propio).
- `src/context/DataContext.tsx` — el context grande: catálogo + todas las funciones que llaman a la API real. **Ya no tiene sección mock**: los arrays `inscripciones`/`pagos`/`penalizaciones` que vivían acá se borraron y las pantallas que los leían pasaron a la API.
- `src/lib/api.ts` — cliente HTTP (`api.get/post/put/delete<T>(path, body?)` + `api.postForm` para multipart), lanza `ApiError(code, message, status, fieldErrors)` en no-2xx.
- `src/lib/types.ts` — tipos de dominio compartidos.
- `src/lib/areas.ts` — **fuente de verdad de la navegación**: áreas, pantallas y el permiso que exige cada una. Ver "Permisos en el frontend".
- `src/lib/mockData.ts` — catálogo de demostración + helpers de formato de fecha/hora (`formatFecha`, `formatHora`, `diasHastaClase`, `disponibilidad`, `tipoIngreso`…). **Los helpers son de formato, no de datos**, y se usan en todas las pantallas aunque ya sean 100% reales.
- `src/lib/ia.ts` — cliente del asistente con IA (`preguntarAlAsistente`) y los dos ayudantes que clasifican el error (`esIaNoDisponible`, `esSinCuota`). Ver "Chatbot flotante".
- Resto de `src/lib/`: `texto.ts` (búsqueda sin tildes), `geo.ts` + `nominatim.ts` (distancias y direcciones), `photos.ts`, `nivelStyle.ts`, `status.ts`, `notificaciones.ts`, `resaltado.ts`, `cargaParcial.ts`, `perfil.ts`, `faqs.ts`, `manual.ts` (el texto del Manual de usuario; ver su sección), `ahora.ts`, `exportCsv.ts`, `exportPdf.ts`, `style.ts`, `denuncias.ts` (etiquetas, descripciones y acciones por tipo de las resoluciones), `limites.ts` (topes de sanciones, precio y cupo, espejo del backend) y `paginado.ts` (`usePaginado`, va con `components/Paginacion.tsx`).
- Componentes agregados en el cierre (2026-10-16): `Paginacion`, `FiltroActividad` (selector "Actividad" de Próximas clases e Historial) y `ActivarUbicacion` (botón "Activar ubicación"). Ver "Correcciones de cierre (2026-10-16)".

## Pruebas automatizadas: existen, y una regresión reportada se cubre con una prueba

Hasta este tramo el frontend **no tenía ninguna** (el backend sí: 842). Hoy hay **Vitest + jsdom + Testing Library**, 36 archivos y 239 pruebas (al 2026-10-24). El detalle —qué cubre cada archivo, con qué criterio se agrega una prueba y qué falta— está en **`docs/PRUEBAS.md`**; acá va sólo lo que hay que saber antes de escribir código.

- **Comandos**: `npm test` (una corrida, es lo que corre CI), `npm run test:watch`, `npm run test:coverage`, `npm run typecheck`.
- **Dónde va cada prueba**: al lado del archivo que prueba, `algo.test.ts` / `algo.test.tsx`. No hay carpeta `__tests__`.
- **Configuración**: el bloque `test` de `vite.config.ts` (Vitest comparte la config de Vite, por eso no se eligió Jest) y `src/test/setup.ts`, que sólo tiene lo que **toda** prueba necesita: la limpieza del DOM y los stubs de `scrollTo`, `scrollIntoView`, `matchMedia` y `requestAnimationFrame`, que jsdom no implementa. Un mock que sirve a una sola prueba va en esa prueba.
- **Sin `globals`**: cada archivo importa `describe`/`it`/`expect`/`vi` de `"vitest"`. A cambio no hay identificadores que ESLint no conozca ni tipos globales que declarar.
- **Las pruebas de pantalla mockean los contextos** (`vi.mock` de `AuthContext` y `DataContext`): montar los proveedores de verdad arrastra la sesión y la API, que no son lo que se está probando. Se consulta por lo que ve la persona (texto del botón, placeholder del campo), nunca por clases CSS.
- **La regla**: si se reporta un bug y se arregla, **la prueba va en el mismo cambio**. Varias de las que hay son exactamente eso — la carrera del `onToggle` de las guías de Ayuda, el aterrizaje del admin parcial, el reporte de soporte que no guardaba nada — y el comentario de cada una dice qué se rompió.
- **Lo que no se prueba todavía**: el flujo de inscripción y pago. La integración real con Mercado Pago ya está (ver "Pagos con Mercado Pago"), así que ya no hay motivo para postergarlo; lo que sí está cubierto es la traducción de cada estado de pago a su etiqueta y su frase (`lib/status.test.ts`).

## CI: `.github/workflows/ci.yml`

En cada push y cada Pull Request sobre `integracion` y `main` corren, en este orden y los cuatro bloqueantes: **ESLint → `tsc -b` → `npm test` → `npm run build`**. Primero lo que falla en segundos, al final lo que tarda.

Las **advertencias** de ESLint no hacen fallar el trabajo; los errores sí. Hoy hay 10 advertencias (eran 11; el 2026-10-23 se corrigió la de la lista filtrada de Explorar, que era un bug real), todas de `react-hooks/exhaustive-deps` y todas preexistentes: poner `--max-warnings 0` ahora dejaría la rama en rojo permanente y el chequeo se dejaría de mirar. Se agrega cuando esas 11 estén resueltas, no antes.

## Pagos con Mercado Pago

El backend integra Mercado Pago real como **marketplace**: cada instructor cobra con su propia cuenta. Del lado del cliente:

- **El SDK de MP se carga en `index.html`** (`https://sdk.mercadopago.com/js/v2`) y `lib/mercadopago.ts` lo inicializa con `getMercadoPago(publicKey)`, una instancia por clave.
- **La public key es la del INSTRUCTOR**, no una de la plataforma: en un marketplace la tarjeta se tokeniza con la clave del vendedor. Llega en el detalle de la actividad (`aceptaMercadoPago`, `mpPublicKey`). Si el instructor no tiene la cuenta vinculada, `mpPublicKey` viene vacía y `alumno/Inscripcion.tsx` sólo ofrece Efectivo.
- **No hace falta ninguna variable de entorno para pagar.** `VITE_MERCADOPAGO_PUBLIC_KEY` está declarada en `vite-env.d.ts` pero **no se usa**: es de antes del marketplace.
- `components/pago/ModalPagoMercadoPago.tsx` es el Card Payment Brick: tokeniza la tarjeta y le pasa los datos a `inscribirse`. Solo tarjeta de crédito.
- `components/pago/TarjetaMercadoPago.tsx`, en el Panel del instructor y con el permiso `mercadopago.vincular`, vincula la cuenta por OAuth. Al volver, MP redirige con `?mercadopago=vinculada|cancelada|error`. También **desvincula** (KAN-67, `DELETE /api/instructor/mercadopago`): el botón "Desvincular" aparece con la cuenta `VINCULADA` o `TOKEN_VENCIDO`, pide confirmación y, ante el 409 `MERCADOPAGO_CON_PAGOS_PENDIENTES`, muestra el `message` del backend tal cual (ya dice cuántos pagos faltan). Al salir bien vuelve a pedir `GET /api/instructor/mercadopago`.
- La campana (`NotificationBell`) muestra un ícono de alerta en vez del punto para los tipos de `esAlerta` (`lib/notificaciones.ts`): `MERCADOPAGO_TOKEN_VENCIDO` y `CAPTURA_PAGO_FALLIDA`. Los dos llegan sin destino, así que no tienen link.
- **Inscribirse no cobra: reserva.** El pago queda `Retenido` (autorizado) y MP lo cobra cuando la clase empieza. La pantalla de resultado y "Mis pagos" lo dicen así; nunca "Tu pago fue aprobado".

### Estados de pago: `explicarPagoAlumno` / `explicarPagoInstructor` (KAN-63)

`EstadoPago` (`lib/types.ts`) tiene los **siete** estados del backend: `Retenido`, `Liberado`, `Cancelado`, `Efectivo`, `Rechazado`, `Reembolsado`, `EnRevision`. Antes tenía cuatro, y `pagoStatusType` devolvía `undefined` para los otros tres, que `StatusBadge` pintaba con su estilo por defecto: **un pago reembolsado decía "Disponible"**.

El estado solo no alcanza para explicarle a la persona qué pasó con su plata, así que `lib/status.ts` tiene dos funciones que devuelven `{ type, label, detalle }` a partir de `{ estado, metodo, capturado }`:

- **`Retenido` son dos cosas distintas** según `capturado`: reservado en la tarjeta ("Retenido hasta la clase") o ya cobrado esperando el período de denuncias ("Cobrado"). El backend manda `capturado` en `listarmispagos` y `pagoCapturado` en el roster.
- **`Cancelado` depende del método:** con Mercado Pago es "Retención liberada" (nunca se cobró); en efectivo, "Pago cancelado" (la devolución la coordina el instructor).
- **El instructor lo lee distinto:** le importa si la plata ya es suya. Su texto de `Retenido` cobrado nombra las 24 h del período de denuncias (`VentanaPagos.PERIODO_DENUNCIAS` del backend): si cambia allá, cambia acá.

Las usan `alumno/MisPagos.tsx` (columna "Estado pago", y los totales separan lo cobrado de lo reservado) e `instructor/GestionClase.tsx` (columnas "Pago" y "A recibir", más el total de la clase; el neto es `pagoNeto`, monto menos comisión, que hoy es 0).

## Patrón establecido para cablear una pantalla a datos reales
1. En `DataContext.tsx`: agregar la interfaz de respuesta (`XxxResp`/`Xxx`), la función (`useCallback`) que llama a `api.get/post/put/delete`, agregarla a `DataContextValue` y a **los dos lugares** del `useMemo` final (el objeto `value` y su array de deps — es fácil olvidar el segundo).
2. Si es una lista de alcance amplio para una pantalla admin (no un recurso propio del usuario logueado), el patrón es: el backend hace `JOIN FETCH` y devuelve todo sin paginar, el frontend agrega/filtra/ordena client-side. **No hay paginación ni agregación server-side en ningún lado de este proyecto** — no la introduzcas para "una pantalla más".
3. Si la pantalla necesita el dato solo para sí misma (no compartido), fetchealo en un `useEffect` local de esa pantalla con estado propio (`useState` + `.then(setEstado).catch(() => {})`), en vez de guardarlo en el Context — así hace la mayoría de las pantallas admin (Reportes, Auditoria, Trazabilidad, GestionClase, etc.).
4. Escribí el test de backend correspondiente antes de dar el cableado por terminado, y corré `npx tsc -b` — un `tsc` limpio es la señal mínima de que no rompiste nada, no reemplaza probarlo en el navegador.

## Penalizaciones y Reportes ya no son maqueta

**Penalizaciones** (`admin/Penalizaciones.tsx`) usa `listarPenalizaciones()` y `crearPenalizacion()` contra `/api/admin/penalizaciones`. El formulario tiene campos condicionales por tipo — monto si es Económica, vigencia si es Suspensión temporal — y el selector de usuario sale de `listarUsuariosAdmin()`, no del directorio mock de `AuthContext`. La columna de estado distingue **Vigente** (suspensión en curso, la calcula el backend contra la fecha de hoy) de **Aplicada**.

**Reportes** (`admin/Reportes.tsx`): los filtros de período y categoría son reales y se aplican con el botón "Aplicar" (patrón borrador → aplicado). El encabezado y la vista previa muestran el período y el alcance **efectivamente aplicados**, no un texto fijo. La exportación descarga un CSV real (`descargarCsv`, con BOM y separador `;` para que Excel lo abra bien en es-AR); el botón PDF abre la vista previa para imprimir.

Dos cálculos que estaban mal y quedaron alineados: la columna "Ingresos" de la tabla por categoría ahora cuenta **solo** pagos `Liberado`/`Efectivo`, igual que el KPI de arriba (antes sumaba también Cancelado y Retenido, así que la tabla no cerraba con el KPI), y "Top instructor" se calcula por **reservas**, no por cantidad de actividades publicadas.

## Cuenta propia: perfil, contraseña, baja, pagos, reseñas y "volver a postularme"

Estas cuatro funciones viven en **`AuthContext`** (no en `DataContext`) porque el resultado tiene que reflejarse en `currentUser`, que es de donde leen todas las pantallas: `actualizarMiPerfil(input)`, `cambiarMiContrasenia(actual, nueva)`, `darDeBajaMiCuenta()` (limpia el token y la sesión) y `reabrirSolicitud()`. Las otras son de `DataContext`: `listarMisPagos()` y `actualizarUsuarioAdmin(id, input)` (`actualizarResenia` se retiró en V33: una reseña publicada no se edita).

Quién usa qué:
- `alumno/Perfil.tsx` — edición real de los datos (incluye el campo **Email**, que antes ni se mostraba en modo edición) + tarjeta "Seguridad de la cuenta" con cambio de contraseña y baja. **Desde el 2026-10-24:** sin "Historial de actividades" (repetía "Mis clases") y con la tarjeta **"Información de salud"** (`InformacionSaludCard`, en el mismo archivo): muestra y edita "¿Padecés alguna enfermedad o lesión?" vía `actualizarMiCondicionSalud` de `AuthContext` (`PUT /api/usuarios/me/salud`), que actualiza `currentUser.perfilAlumno.condicionSalud`. El dato llega en `/api/auth/me`. El texto de la tarjeta y el del registro dicen para qué se usa (el informe de beneficios) y que **no lo ve el instructor**: antes el registro decía "Ayuda al instructor a dar la clase de forma segura", y era falso. Lo cubre `Perfil.test.tsx`.
- `alumno/MisPagos.tsx` — ahora usa `listarMisPagos()` (`GET /api/alumno/pagos`) en vez de derivarlo de `listarMisInscripciones`: **un pago sobrevive a su inscripción** (reintegro por cancelación, liberación post-clase) y esa lista lo perdía. Suma un KPI "Reintegrado" y el botón "Reintentar".
- `alumno/MisResenas.tsx` — **sólo crea**: desde V33 del backend una reseña publicada no se edita ni se elimina (ver "Reseñas: se publican al crearse y no se tocan"). Los botones "Editar" y "Eliminar", el modal de edición y `actualizarResenia`/`eliminarResenia` del `DataContext` se retiraron.
- `instructor/Solicitud.tsx` — "Editar mis datos" ya no es un botón muerto, y "Volver a postularme" llama al backend (antes solo parcheaba el directorio mock, así que al recargar la solicitud volvía a aparecer rechazada).
- `admin/Gestion.tsx` — botón "Editar" por fila de usuario, con modal (nombre, apellido, email, teléfono).

Validaciones que hay que mantener en espejo con el backend: el **teléfono es obligatorio** en `actualizarmiperfil` (`@NotBlank`) pero **opcional** en `actualizarusuarioadmin`; en ambos el patrón es `\+?[0-9 ]+`. El email se normaliza a minúsculas del lado del servidor.

Los **intereses** del alumno ya no pasan por acá: tienen su propio endpoint (`PUT /api/usuarios/me/intereses`) y son tipos de actividad, no texto. Ver la sección de intereses más abajo.

## Cambios de contrato al completar el modelo (V15) — leer antes de tocar actividades o clases

Cinco cosas cambiaron de forma y rompen cualquier código viejo que las asuma:

1. **`Actividad.cuposMax` ya no existe.** El cupo es de la `Clase` (y de la `AgendaClases`). En su lugar hay `Actividad.duracionMin`, que el formulario de alta ya pedía y **no se guardaba en ningún lado**. El campo viejo era peligroso: `CrearActividad.tsx` mandaba `cuposMax: 20` hardcodeado y ese 20 terminaba siendo el cupo real de toda clase creada sin cupo explícito.
2. **`Clase.horaFin` es obligatoria** al crear y editar. `ActividadDetalle.tsx` tiene ahora Hora inicio / Hora fin (el fin se propone solo desde `actividad.duracionMin`) y **Cupo máximo es obligatorio**, sin fallback. Si el fin es menor que el inicio se asume que cruza la medianoche.
3. **"Repetir cada semana"** manda `repetirSemanalmente` + `repetirHasta` y crea una agenda en el backend; las clases siguientes las materializa un scheduler **una semana antes** de cada dictado, así que no aparecen todas de golpe en la grilla. El cartel azul del formulario explica eso al instructor.
4. **El login usa `identificador`, no `email`.** Acepta correo **o DNI** (`AuthContext.login(identificador, password)`), y el input de `Login.tsx` es `type="text"` a propósito: con `type="email"` el navegador rechazaba un DNI válido antes de enviar. El registro tiene campo DNI opcional (7-8 dígitos).
5. **`DenunciaAdmin.alumno` puede ser `null`.** Desde que el instructor puede denunciar una reseña, la denuncia no tiene alumno: usá **`denunciante`** para "quién reportó" (ya pasó en `Auditoria.tsx`). El tab Reclamos de `Gestion.tsx` ofrece acciones distintas según `tipo` (`ACCIONES_POR_TIPO`) — antes el único botón era "Reintegrar" y las otras tres acciones que el backend soporta no tenían forma de dispararse.

## Reseñas: se publican al crearse y no se tocan (V33 del backend)

Decisión del usuario (2026-10-23): **una reseña se publica en el momento en que el alumno la envía**. No hay moderación previa del administrador, y una reseña publicada no se edita ni se elimina. Después de publicada sólo pasa esto: el instructor la **responde** o la **denuncia**, y el administrador la **oculta** (resolviendo la denuncia con "Ocultar la reseña" o por su cuenta desde Gestión › Reseñas). El detalle de backend está en su CLAUDE.md, sección del mismo nombre.

Qué cambió en cada pantalla:

- **`alumno/MisResenas.tsx`**: sin "Editar", sin "Eliminar" y sin el chip "En moderación". El modal "Dejar reseña" avisa antes de publicar: *"La reseña se publica en el momento y después no se puede editar ni eliminar."* — es el único momento en que todavía se puede corregir. El botón dice "Publicar". La que ocultó un administrador lleva el chip **"Oculta por un administrador"** (antes "Oculta por moderación"). Lo cubre `MisResenas.test.tsx`.
- **`instructor/Resenas.tsx`**: sin el badge "Pendiente de moderación"; quedan "Denunciada · en revisión", "Oculta" y "Respondida". "Responder" sólo se deshabilita en una reseña oculta. **La cantidad, el promedio y las barras cuentan sólo las no ocultas** (`estadisticas()`, mismo criterio que `recalcularRating` del backend y que el detalle público); las ocultas se siguen listando y el resumen avisa "1 oculta, no cuenta en la calificación". Antes promediaba todas, y ocultar una reseña no cambiaba nada de lo que veía el instructor. Lo cubre `Resenas.test.tsx`.
- **`instructor/Panel.tsx`**: la alerta "Tenés N reseñas en revisión" contaba las que esperaban moderación; hoy cuenta las **denunciadas que la administración todavía no resolvió** ("Tenés N reseña(s) denunciada(s) en revisión.").
- **`admin/Gestion.tsx`**, pestaña Reseñas: ver "Reseñas del admin" más abajo.
- **Tipos**: `enModeracion` salió de `MiResenia`, `ReseniaInstructor` y `Resenia` (`lib/types.ts`); `ReseniaPendiente` dejó de existir y `ReseniaPublicada` es una interfaz propia. Del `DataContext` salieron `listarResenasPendientes`, `aprobarResenia`, `rechazarResenia`, `actualizarResenia` y `eliminarResenia` (de los dos lugares del `useMemo`).
- **Manual** (`lib/manual.ts` y su copia del backend, idénticas): 2.10, 3.6, 3.10, 4.5 (ahora "Reseñas publicadas") y la tabla de estados.

**La respuesta del instructor se ve en el detalle de la actividad.** Se guardaba desde hacía rato, pero `GET /api/actividades/{id}/resenas` no la devolvía y `alumno/Detalle.tsx` no la renderizaba: el instructor respondía, lo veía en su propia pantalla y el destinatario —el alumno— no la veía nunca. Hoy `ReseniaActividad` trae `respuestaInstructor` / `respuestaInstructorAt` y cada reseña la muestra en un bloque citado debajo del comentario, con el nombre del instructor y la fecha.

Responder y denunciar **pegan a la API** (`responderResenia` / `denunciarResenia`); antes eran `useState` locales y se perdían al recargar. No se puede responder una reseña oculta (el backend rechaza), así que el botón se deshabilita con el motivo en el `title`.

## Perfil público del instructor: `alumno/PerfilInstructor.tsx` (2026-10-23)

"Ver perfil" de la tarjeta del instructor en `alumno/Detalle.tsx` era un botón sin acción. Ahora es un `Link` a **`/alumno/instructor/:id`**, en el mismo grupo de rutas que el detalle de la actividad (área alumno, sin permiso propio: es catálogo). No va en `lib/areas.ts` porque no es un ítem de menú.

- **Sólo con lo que el frontend ya tiene (decisión del usuario: sin endpoint nuevo).** Nombre (`instructorNombre`), foto (`Avatar`, `/api/fotos/**` es público) y lo que se calcula del catálogo: sus actividades, las categorías que dicta, la calificación promedio (sólo de las actividades **ya calificadas**: una sin reseñas no es un 0) y su próxima clase. `PerfilInstructor` tiene `especialidad`, `aniosExperiencia` y `descripcion`, pero hoy sólo los devuelve `GET /api/admin/instructores/{id}` (permiso `instructores.validar`, y trae correo, teléfono y fecha de nacimiento): **no usarlo acá**. Si algún día se quieren mostrar, el camino es un endpoint público propio que devuelva sólo esos campos.
- **"Instructor verificado" es cierto por construcción**: el catálogo sólo trae oferta de instructores `APROBADO` (RN-16). Por lo mismo, un instructor sin actividades publicadas (o no verificado) no tiene perfil: se muestra "Este instructor no tiene actividades publicadas en este momento." y un acceso a Explorar.
- **Actividades: 9 por página** (`usePaginado` + `Paginacion`), buscador sin tildes (`incluye`), filtros por categoría y nivel (sólo los que tiene ese instructor, y sólo si hay más de uno) y "Ordenar por" (por defecto próxima clase, con las que no tienen clases al final). Cualquier cambio de filtro vuelve a la página 1, y cambiar de página scrollea al título de la sección.
- La "próxima clase" usa `useAhora()`, no `Date.now()` en el render (`react-hooks/purity`).
- Lo cubre `PerfilInstructor.test.tsx`.

## Paginación y filtros en Explorar, Favoritos y Mis clases (2026-10-24)

Pedido del usuario. Todo en el cliente (sin backend), con `usePaginado` + `Paginacion`:

- **`usePaginado(items, porPagina, claveReinicio?, paginaPreferida?)`**: los dos parámetros nuevos son opcionales y se DERIVAN, sin efectos. `claveReinicio` es una firma de los filtros: si cambia, se vuelve a la página 1, así una pantalla con muchos filtros no tiene que reiniciar en cada handler. `paginaPreferida` es la que se muestra mientras el usuario no eligió ninguna; en cuanto navega, manda lo que eligió.
- **Explorar**: 12 por página (grilla de 3). La clave son los ids de la lista filtrada, así cualquier filtro u orden reinicia. Cambiar de página scrollea al contenedor de resultados.
- **Favoritos**: 12 por página (grilla de 4), buscador por actividad o instructor (`incluye`), chips de categoría y nivel (sólo los de sus favoritas y sólo si hay más de uno), "Ordenar por" y contador "N favoritas de M". **La clave son los filtros, no la lista**: quitar un favorito no tiene que mandar a la página 1.
- **Mis clases**: un solo juego de filtros para todas las pestañas (actividad, "Desde"/"Hasta" contra el día LOCAL de la clase, "Ordenar por"), aplicado **antes** de repartir en pestañas, así los contadores cuentan lo que se ve. 10 por página; la clave incluye la pestaña. La `paginaPreferida` sale del índice de la fila que busca la notificación (`?inscripcion=` / `?clase=`): sin eso, el resaltado podía quedar en otra página. "Calificar mis clases" sigue mirando todas las inscripciones, para que un filtro no lo esconda.
- Lo cubren `lib/paginado.test.ts`, `Explorar.test.tsx`, `Favoritos.test.tsx` y `MisClases.test.tsx`.

## Detalle de la actividad: sin "Preguntas frecuentes" fijas (2026-10-24)

`alumno/Detalle.tsx` cerraba con una sección "Preguntas frecuentes": tres preguntas **escritas en el código** (`const FAQS`), iguales para toda actividad, con respuestas que contradecían al sistema — una "política de cancelación de la clase" que no existe, "¿Necesito experiencia previa? No" también en actividades de exigencia alta, y "elementos adicionales que se informan al confirmar tu lugar" sin mecanismo que lo haga. Se retiró (decisión del usuario). Las dudas generales las cubren la burbuja "¿Dudas?" (en la misma pantalla), `/ayuda` (`lib/faqs.ts`, que **no** se tocó) y `/manual`. **No volver a agregar texto genérico en una pantalla de una actividad concreta**: se lee como información de esa actividad. Si algún día se quieren preguntas por actividad, tienen que salir de datos (las escribe el instructor, con backend). Lo fija `Detalle.test.tsx`, que también cubre el link "Ver perfil".

## Opiniones del detalle: todas, con scroll propio, filtro por estrellas y orden (2026-10-24)

La sección "Opiniones de alumnos" de `alumno/Detalle.tsx` mostraba sólo las **primeras 5** (`slice(0, 5)`) y las demás no se podían ver de ninguna forma. Hoy:

- **Muestra todas**, dentro de un contenedor con scroll propio: `max-height:620px` + `overflow-y:auto` y la clase **`.ah-scroll`** de `index.css` (barra fina siempre visible cuando hay más contenido, `scrollbar-gutter: stable` para que el contenido no salte de ancho, `overscroll-behavior: contain` para que la rueda no arrastre la página al llegar al final). Reutilizable para cualquier lista con scroll interno.
- **Filtro "Calificación"**: "Todas" o de 5 a 1 estrella, cada chip con su cantidad. Con un filtro aplicado la leyenda dice "Mostrando N de M opiniones"; sin filtro, "M opiniones". Un filtro sin resultados dice "No hay opiniones con N estrellas.".
- **"Ordenar por"**: "Más recientes" (por defecto), "Más antiguas", "Mejor calificación", "Peor calificación" (a igual puntaje, la más reciente primero). El usuario pidió "más reciente"; se sumaron las otras tres porque un selector con una sola opción no ordena.
- **Cambiar un filtro devuelve la lista al inicio** (`scrollTop = 0`): si no, quedaba scrolleada a mitad de una lista distinta.
- La lógica está en **`lib/opiniones.ts`** (`opinionesVisibles`, `ORDENES_OPINIONES`), no en la pantalla: una pantalla que exporta funciones rompe el fast refresh (`react-refresh/only-export-components`). Los estados del filtro se declaran **antes** del `return` temprano de "actividad no encontrada", como todo hook de esa pantalla.
- Lo cubren `lib/opiniones.test.ts` y `Detalle.test.tsx`.

## Galería de imágenes de la actividad

`actividad.imagenes` (ids) viene **solo del detalle** (`cargarDetalleActividad`), no del listado. Se sirven por `${BASE_URL}/api/fotos/actividad/imagen/{id}` — endpoint público, como el resto del catálogo. La portada sigue siendo `subirFotoActividad` + el componente `ActivityPhoto`; la galería usa `agregarImagenActividad` / `eliminarImagenActividad`, con tope de 6. La primera imagen que se sube cuando no hay portada pasa a serlo (lo hace el backend).

## Mapas y distancias: OpenStreetMap, no Google Maps

Se descartó Google Maps Platform porque exige una cuenta de facturación con tarjeta incluso dentro de sus topes gratuitos. El reemplazo es **Leaflet + tiles de OpenStreetMap + Nominatim**, sin clave de API y sin cuota facturable. Son tres piezas y conviene no confundirlas:

- **`components/LeafletMap.tsx` — mostrar un punto.** Único componente de mapa del proyecto; lo usan `alumno/Detalle.tsx` (ubicación de la actividad) e `instructor/CrearActividad.tsx` (confirmar la ubicación al publicar). Dos cosas que hay que respetar si se toca:
  - **Los íconos por defecto de Leaflet se reasignan a nivel de módulo.** Leaflet arma las URL de sus marcadores asumiendo rutas relativas al HTML, no al build, así que con cualquier bundler salen rotas. El `mergeOptions` con los assets ya resueltos por Vite corre **una sola vez, fuera del componente**: no lo muevas adentro.
  - **El mapa se crea una sola vez y después se actualiza.** `lat`/`lng` quedan fuera de las dependencias del efecto de creación a propósito (la última posición conocida vive en un ref); un segundo efecto mueve la vista y el marcador. Meter las coordenadas en las deps del primer efecto re-crea el mapa entero en cada cambio.
  - Sin coordenadas no renderiza el mapa sino el `placeholderText`. Una actividad sin ubicación cargada es un caso normal, no un error.

- **`lib/nominatim.ts` — buscar una dirección.** `searchAddress(query)` devuelve hasta cinco resultados con sus coordenadas. **La política de uso de Nominatim pide explícitamente no autocompletar mientras se tipea**, así que se llama sólo al click del botón "Buscar" (o Enter en el campo), nunca en el `onChange`. No agregar debounce y llamar por tecla: no es un problema de performance, es un término de uso.

- **`lib/geo.ts` — calcular distancias.** `haversineKm` + `formatDistanciaKm` + el hook `useGeolocation`. Todo el cálculo de cercanía ocurre **en el cliente**, contra la geolocalización del navegador: no hay consulta espacial en el backend ni PostGIS, y no hace falta (es la misma convención de "el backend devuelve todo sin paginar y el frontend agrega/filtra/ordena"). Alimenta tres cosas:
  - "Cerca de tu ubicación" del Home,
  - el orden "Cercanas" y el **filtro por distancia** de Explorar: desde el 2026-10-23 es una **barra de rango con dos manijas** (`components/RangoDoble.tsx` + `lib/distancia.ts`), de 0 a `DISTANCIA_MAX_KM` (30) km, con la leyenda "De X km hasta Y km". La manija máxima en el tope es "sin límite" ("30+ km") y la barra completa no filtra ni pide la ubicación. Reemplazó a los chips `RADIOS` (cualquier distancia · menos de 2 km · 2 · 5 · 8 · 10 · más de 10 km). El Home le manda `distanciaMaxKm` (número) por `location.state`, no un texto: con los chips, su "A menos de 25 km" no coincidía con ninguna opción y se ignoraba en silencio. `RangoDoble` son dos `<input type="range">` superpuestos (teclado y lector de pantalla incluidos); las manijas se estilan en `index.css` (`.ah-rango`) porque los pseudo-elementos no van en línea, y es reutilizable para otros rangos.
  - la línea "A X de tu ubicación" del detalle y el `distanceKm` de `ActivityCard`.

  `useGeolocation` es **a demanda y no automático**: arranca en `idle` y sólo pide el permiso cuando la pantalla llama a `request()`. Distingue `denied` de `unsupported` porque son dos mensajes distintos para el usuario.
  - **`reintentar()` y `bloqueado` (2026-10-16), para el botón "Activar ubicación"** (`components/ActivarUbicacion.tsx`, en el Home, Explorar y el detalle). `request()` no insiste después de un "no"; `reintentar()` sí, y si la persona sólo había cerrado el cartel, el navegador lo vuelve a mostrar. **Si el permiso quedó BLOQUEADO para el sitio, ningún código puede volver a mostrar el cartel ni abrir el panel de permisos de la barra de direcciones** (no existe esa API). El componente muestra igual el botón (pedido del usuario: botón, no instrucciones) y una sola línea: "Tu navegador la tiene bloqueada: habilitala desde el ícono junto a la dirección de la página." Mientras `bloqueado`, `useGeolocation` escucha `PermissionStatus.onchange` y, si lo habilitan desde la barra, pide las coordenadas sin recargar. **No usar el elemento nativo `<geolocation>`** (Chrome 144+): se probó el 2026-10-17, abre un cuadro distinto centrado en la pantalla y en Brave confirmar desde él cierra el navegador entero, incluso excluyendo Brave por `navigator.brave`/`userAgentData`. Se retiró. **Sin coordenadas propias, la distancia es `undefined` y el filtro de distancia no afirma nada**: `dentroDelRangoDistancia` devuelve false para una actividad sin distancia calculable, porque no se puede sostener que esté dentro de un radio que no se pudo medir.

## Sesión: se renueva sola mientras usás la app

`AuthContext` escucha `click`/`keydown`/`scroll`/`focus` y llama a `POST /api/auth/refresh` como mucho cada 5 minutos (`INTERVALO_RENOVACION_MS`). El TTL del token en el backend es de 30 min y **esa es la ventana de inactividad** (E1A-HU02 criterio 3). Si tocás uno de los dos números, mirá el otro: el intervalo del cliente tiene que quedar bastante por debajo del TTL para que una sesión activa nunca venza entre dos renovaciones. Si el refresh falla no se fuerza el logout — la próxima llamada real de la pantalla da 401 y muestra el error que corresponde.

## Estados de carga: `components/Cargando.tsx`, y son DOS

Tercer estado, además de "hay datos" y "falló". Reportado: *"entro a Mis clases siendo alumno y veo todo en 0, creo que no tengo nada"* — la consulta seguía en vuelo. **Un cero y un vacío son afirmaciones, y mientras los datos no llegaron son falsas.** Es la misma regla que ya obligaba a que el error reemplace al estado vacío, extendida a la carga.

- **`<CargandoAccion activo mensaje="…" />` — el usuario apretó algo y hay que esperar.** Overlay que tapa la pantalla con fondo gris y un cartel centrado. Va en **portal a `document.body`** por la misma razón que `Modal` (`.ah-screen` anima `transform` y captura los `position:fixed`), bloquea el scroll del body y **z-index 120, por encima del modal**, porque varias de estas acciones se disparan desde adentro de uno. El mensaje va en gerundio y sin punto: "Procesando tu pago".
  - Va en **inscripciones, reseñas, pagos y el alta de cuenta** (`auth/Registro.tsx`, "Creando tu cuenta", los dos roles: entre "Crear cuenta" y la pantalla del código no se veía nada): preinscribirse, inscribirse/pagar, cancelar inscripción, confirmar cobro en efectivo, publicar/editar/eliminar reseña, responder una reseña, enviar una denuncia. Ahí el doble click cuesta una inscripción o un cobro de más, así que **no alcanza con deshabilitar el botón**: el overlay no deja llegar ni el segundo click ni un Enter perdido. Para el resto de las mutaciones (crear una clase, editar una actividad) sigue alcanzando con el botón deshabilitado.
- **`<CargandoSeccion seccion="clases" />` — la pantalla todavía no tiene los datos.** Cartel "Cargando {sección}, por favor espere" que **reemplaza al contenido**, no lo acompaña. `seccion` va en minúscula y en plural cuando corresponde.

Tres reglas al aplicarlo:

1. **Se oculta TODO lo que se derive de esos datos, no sólo la lista.** Las pestañas de "Mis clases" con sus contadores, los KPI de Mis pagos, los filtros del historial del instructor, los gráficos del panel. Un contador en `(0)` al lado de un cartel de carga es la misma mentira que la lista vacía.
2. **Con varias consultas en paralelo se espera a la última.** Media pantalla es exactamente el problema que esto viene a resolver.
3. **El flag arranca en `true` y baja en un `.finally()`.** Nunca con un `setState` síncrono dentro del efecto que dispara la carga — es `react-hooks/set-state-in-effect`. Cuando el estado tiene que "volver a prenderse" (las pestañas de `admin/Gestion.tsx`, que cargan al cambiar de tab) **se deriva en vez de sincronizarse**: ahí se guarda el `Set` de pestañas ya cargadas y `cargandoTab` sale de `!tabsCargados.has(tab)`.

Lo que cuelga del catálogo del Context (`cargandoCatalogo`) usa ese flag y no uno propio: Landing, Home, Explorar, Favoritos, la pestaña Actividades de Gestión y Taxonomía.

## Estados de error: usar `components/ErrorReintentar.tsx`, no `.catch(() => {})`

`.catch(() => {})` estaba repetido en 16 pantallas. El error se tragaba y quedaba el estado vacío, así que **un backend caído se veía exactamente igual que una plataforma sin datos** — y la spec pide "Reintentar" como criterio de error en casi todas las HU.

El componente compartido tiene dos variantes: `bloque` (recuadro, cuando la pantalla no tiene nada que mostrar) y `banner` (franja fina, cuando ya hay contenido). El patrón es siempre el mismo: un `cargar` con `useCallback`, un `useEffect` que lo llama, y `errorCarga` en el render.

Dos reglas que salieron de este barrido:
- **El estado de error reemplaza al estado vacío, no convive con él.** "No tenés clases", "No tenés notificaciones" o "Actividad no encontrada" son afirmaciones falsas cuando la carga falló. Donde había un ternario `length === 0 ? vacío : lista`, ahora va `errorCarga ? <ErrorReintentar/> : length === 0 ? vacío : lista`.
- **Si la pantalla hace varias consultas que alimentan los mismos números, van juntas en un `Promise.all`.** El Dashboard y Reportes del admin, el Panel del instructor y el Perfil del alumno mostraban KPIs en cero cuando una sola de sus cuatro consultas fallaba.

## Verificación de correo y "Continuar con Google"

El alta manda un código de 6 dígitos por mail y **el registro ya no aterriza en el panel**: va a `/verificar-email` (`pages/auth/VerificarEmail.tsx`), que es la misma pantalla para el alta y para un cambio de correo — el backend sabe cuál es el código pendiente, el cliente no elige.

- **Seis inputs, no uno.** Pegar el código del mail funciona (se reparte solo desde la casilla donde se pega), el foco avanza al tipear y retrocede con Backspace, y al completar el sexto dígito se envía sin buscar el botón.
- **Sin confirmar no se navega a ningún lado.** `RequireEmailVerificado` envuelve a las **tres** áreas (`RequireArea` queda adentro): registrarse y volver a `/alumno`, escribir la URL a mano o usar el botón "atrás" devuelven a `/verificar-email`. El backend hace lo mismo por su cuenta (`EmailVerificadoFilter`, 403 `EMAIL_SIN_VERIFICAR`); **esta guarda es la experiencia, no la seguridad** — sin ella el usuario vería pantallas llenándose de 403.
- **`verificarEmail` guarda el token nuevo que devuelve el backend.** El anterior lleva el claim `emailVerificado: false` y seguiría bloqueado hasta vencer. También completa la sesión con `/api/auth/me`: el alta no lo pide (no hay permisos que mostrar en la pantalla del código), así que sin eso "Continuar" aterrizaba en el catálogo público en vez de en su área.
- **Sólo bloquea con `emailVerificado === false`.** `undefined` son los usuarios mock, que no traen el campo: tratarlo como "sin verificar" los encerraría a todos.

### El correo salió del formulario de datos personales

Editar el nombre es editar un dato; cambiar el correo es **cambiar la credencial de acceso**, y arrastra dos consecuencias que ese formulario no podía expresar: hay que confirmarlo con un código, y al confirmarse el correo anterior **queda libre para otra persona**. Vive en `components/CambiarEmailCard.tsx`, compartido por los perfiles de alumno, instructor y admin (la misma acción escrita tres veces se iba a desincronizar), pide la contraseña actual y explica las dos cosas.

**El campo Email se sacó de los tres formularios de perfil**: el backend ahora rechaza un `PUT /api/usuarios/me` que traiga otro correo, así que dejarlo editable era ofrecer un error.

### "¿Olvidaste tu contraseña?": `pages/auth/RecuperarPassword.tsx`

El enlace del Login dejó de ser un `span` muerto: lleva a `/recuperar-password`, pantalla **pública** (ruta fuera de todas las guardas, al lado de `/login` y `/registro`) con los dos endpoints nuevos del backend, vía `solicitarRecuperacionPassword` y `restablecerPassword` de `AuthContext`.

- **Tres pasos en UNA pantalla** (`correo` → `codigo` → `listo`), no tres rutas. El código vive minutos en el backend; una ruta propia invitaría a recargarla o compartirla cuando ya no sirve.
- **La pantalla NO afirma que la cuenta exista.** El backend responde igual exista o no el correo (es a propósito, ver su CLAUDE.md), así que el texto va en condicional: *"Si hay una cuenta registrada con X, le enviamos un código de 6 dígitos"*. Decir "te enviamos un código a X" sería afirmar algo que el cliente no sabe. **No cambiar ese copy por uno afirmativo.**
- **Las seis casillas son las mismas de `VerificarEmail`** (pegar reparte, el foco avanza y retrocede), con una diferencia: completar el sexto dígito **no envía solo**, porque falta la contraseña nueva.
- Valida con `passwordStrength` (RN-20, espejo del backend) y que las dos contraseñas coincidan, antes de gastar el código en un request que va a fallar.
- **Al fallar se limpia el código pero NO la contraseña ya elegida**: el error más probable es el código, y reescribir lo otro es castigo gratis.
- **Avisa que una cuenta de Google no tiene contraseña propia** y manda al botón de Google, en vez de dejar a la persona esperando un mail que no va a llegar.
- **Restablecer no inicia sesión**: termina en "Contraseña actualizada" + "Ir a iniciar sesión". Es lo que devuelve el backend (no manda token).

### "Terminá tu registro": lo que Google no da

Google devuelve nombre, apellido y correo, y nada más. Una cuenta creada así queda **sin teléfono, sin fecha de nacimiento y sin DNI**, y el usuario aterriza en la aplicación sin enterarse — hasta que algo se los pide. Peor: el teléfono es obligatorio en `PUT /api/usuarios/me`, así que su propio Perfil no se podía guardar sin completarlo primero.

`pages/auth/CompletarRegistro.tsx` es la segunda mitad del formulario de registro para el camino que se la saltea. Pide teléfono y fecha de nacimiento (obligatorios), DNI (opcional, y **es la única forma de cargarlo después del alta**) y, sólo para alumnos, los intereses. Sirve igual para los dos roles.

- **`RequirePerfilCompleto` manda acá y no deja salir.** Un cartel que se puede ignorar deja cuentas a medio llenar para siempre, que es justo lo que esto viene a evitar; por eso tampoco hay botón de "después", sólo cerrar sesión. Va **después** de `RequireEmailVerificado`: primero se confirma quién es el correo, después se completan los datos.
- **La condición vive en `lib/perfil.ts` (`perfilIncompleto`) y mira `authProveedor === "GOOGLE"`.** Mirar sólo los campos vacíos encerraría a cuentas que nunca pasaron por Google — el administrador sembrado por `app.admin-seed` nace sin teléfono y quedaría atrapado en una pantalla que no le corresponde. Está en `lib/` y no junto al guardián porque también la usan Login y Registro para navegar directo, y un archivo que exporta un componente **y** una función rompe el fast refresh.
- Login y Registro navegan a `/completar-registro` por su cuenta cuando corresponde. El guardián es la red de seguridad; navegar directo evita el parpadeo de entrar y salir de la home.

### El botón de Google: en el registro, y DESPUÉS de elegir el rol

`components/BotonGoogle.tsx` carga Google Identity Services y usa `renderButton`. No se maqueta uno propio: el botón de GIS es el único que Google garantiza que cumple sus *branding guidelines* (un requisito de sus términos) y el que resuelve solo el popup y los bloqueos de terceros.

Está en **dos lugares, y hacen cosas distintas**:

- **`Login.tsx`** — sólo para **entrar** a una cuenta que ya existe. Va **sin rol**, así que el backend responde `SIN_CUENTA` en vez de crear una: quien aprieta "Iniciar sesión con Google" espera entrar a su cuenta, no que le aparezca una nueva a medio llenar. La pantalla le dice que se registre primero y elija si es alumno o instructor.
- **`Registro.tsx`, debajo del selector de rol** — para darse de alta. La ubicación no es estética: **qué hace el botón depende del rol elegido**, así que ofrecerlo antes de elegir sería ofrecer una acción ambigua.

En el registro, según el rol:

- **Alumno**: el backend crea la cuenta y entra. Se saltea el código, porque Google ya verificó el correo; de ahí va a "Terminá tu registro".
- **Instructor**: **no crea nada**. El alta de instructor exige documentación (RN-12), así que vuelve `modo: "COMPLETAR_INSTRUCTOR"` con la identidad y el formulario se precarga: nombre y apellido de Google, el **correo de sólo lectura** (lo fija Google y el backend rechaza cualquier otro) y **sin campos de contraseña** (esa cuenta no va a tener una utilizable). El `idToken` viaja con el alta y el backend lo vuelve a verificar.

Otras dos cosas del componente:

- **El client id se pide a `GET /api/auth/google/config`, no a un `VITE_` propio.** Así no hay forma de ofrecer el botón contra un backend que no puede validar el token. Sin client id el componente **no renderiza nada**: mejor no ofrecer el camino que ofrecer uno que falla.
- **El callback va en un ref, asignado dentro de un `useEffect`.** GIS se inicializa una sola vez y se queda con la función que le pasamos; tocar el ref durante el render rompe `react-hooks/refs`.

## Buscar ignora tildes: `lib/texto.ts` en TODOS los filtros

`normalizar(texto)` baja a minúsculas y descompone (NFD) para borrar los diacríticos; `incluye(texto, termino)` es el helper que usan las pantallas. **No volver a escribir `.toLowerCase().includes(...)` en un filtro**: compara code points, así que `ó` y `o` son distintos y buscar "inscripcion" no encontraba "Inscripción". Ya aplicado en Gestión (usuarios y actividades), Trazabilidad, Validar instructor, Explorar, el buscador del Home, las FAQ de Ayuda y el chatbot (`lib/faqs.ts`, que tenía su propia copia de `normalizar` y ahora importa ésta). El espejo del lado del servidor es `ActividadSpecifications.conTexto`, con `translate()` en SQL.

Un término vacío en `incluye` matchea todo, así que el caso "sin búsqueda" no necesita un `if` en cada pantalla.

## La Landing muestra el catálogo real

Era la última pantalla que leía `lib/mockData.ts`, y de ahí salían los tres síntomas que se reportaron juntos: **actividades que no existen** (ids de demo, así que el click llevaba a un detalle inexistente), **sin fotos** (`ActivityPhoto` las pide por id contra la API y esos ids no están, así que siempre caía al placeholder "FOTO · nombre") y **cantidades falsas** — el contador decía `actividades.length * 20`, ocho actividades de demo multiplicadas por veinte para que la maqueta se viera poblada, más un "48 instructores" y un "4.8★" escritos a mano.

Hoy sale todo de `useData()`, el mismo catálogo público que Home y Explorar, y **los números son cuentas sobre esos datos**: actividades publicadas, instructores con al menos una actividad, y el promedio de las actividades **ya calificadas**. Si no hay ninguna calificada la tarjeta de calificación no se muestra — un promedio inventado es peor que no tener promedio. Las destacadas son las seis mejor calificadas.

Dos cosas a respetar si se toca:
- **Los íconos de categoría se buscan por NOMBRE normalizado, no por id.** Las categorías son un ABM y sus ids son UUID de la base; el `Record` por id (`"cat-bienestar"`) no podía funcionar contra datos reales. Lo que no está en la lista usa el ícono neutro, misma regla que `lib/nivelStyle.ts`.
- De paso se cablearon los links muertos del menú y del footer ("Cómo funciona", "Explorar", "Categorías"). **"Instructores" pasó a ser "Ser instructor" → `/registro`**: no existe un directorio público de instructores, así que no había a dónde llevarlo.

## El ícono de la pestaña: `public/favicon.svg`

`index.html` apuntaba a `/favicon.svg` y **el archivo no existía** — el navegador recibía un 404 y la pestaña salía sin ícono. Es la "A" del header: mismo gradiente y mismo radio proporcional que el cuadrado de `components/Logo.tsx`. **La letra va como `<path>`, no como `<text>`**: un favicon se dibuja fuera de la página, sin las fuentes de Google cargadas, así que "Space Grotesk" caería a cualquier fuente del sistema y el ícono cambiaría de forma según la máquina.

## Chatbot flotante (`components/ChatbotWidget.tsx`)

Burbuja flotante abajo a la derecha, **colapsada por defecto**, con la etiqueta "¿Dudas?". **Solo se ve en las pantallas del alumno** (criterio 1 de E3A-HU01/02/03/06/08/12): el soporte es para quien usa la plataforma como cliente, no para quien la opera. Instructor y admin lo tenían montado desde `DashLayout` y además tenían un ítem "Ayuda"/"Soporte" en el sidebar hacia `/ayuda`; ambas cosas se sacaron. `/ayuda` sigue siendo pública y accesible desde la Landing.

Se monta **una sola vez** en `AlumnoNav`, no pantalla por pantalla, para que ninguna se lo olvide al agregarse.

**Va en un portal a `document.body`, igual que `Modal`, y no es opcional.** El widget quedaba clavado al **final de la página** en vez de seguir al viewport: había que scrollear hasta el fondo de todo para encontrarlo. Es la misma trampa del `containing block` ya documentada para los modales: `.ah-screen` tiene `animation: ahFade`, esa animación anima `transform`, y **un elemento con una animación de `transform` crea un containing block para sus descendientes `position:fixed`** — así que `bottom:24px` dejaba de medirse contra la ventana y pasaba a medirse contra el alto completo del documento. Sacarlo del `<header>` (que tiene `backdrop-filter`, el mismo efecto) era necesario pero **no alcanzaba**: el `.ah-screen` de la pantalla lo capturaba un nivel más arriba. Con el portal no le queda ningún ancestro de la pantalla y acompaña el scroll hasta el pie.

**Arranca colapsado a propósito.** Desplegado ocupa 340px de ancho por casi media pantalla de alto, justo encima de la grilla de actividades — que es lo que el alumno vino a mirar. Colapsado es una burbuja angosta pegada al borde derecho (`right:0`, con la esquina redondeada sólo del lado interno); el cuadro completo aparece al hacer click, y ahí el botón pasa a ser sólo la cruz de cerrar.

**Las respuestas las da un modelo de lenguaje, y SÓLO con el manual de usuario.** Cada consulta va a `POST /api/asistente/consultas` vía `lib/ia.ts` (`preguntarAlAsistente`). El backend busca las secciones del manual relacionadas y se las pasa al modelo como única fuente, así que una pregunta que no es sobre ActiveHub —o que intenta sacarle datos del sistema— se contesta "Esa información no se encuentra disponible." y no con lo que el modelo sepa del mundo. Debajo de cada respuesta la burbuja muestra de qué secciones salió: **una respuesta que no se puede rastrear al manual se lee como inventada**, y acá el valor es justamente que no lo sea.

- **`lib/faqs.ts` sigue existiendo, y no es código muerto:** es el respaldo. Si el backend devuelve **503 `IA_NO_DISPONIBLE`** (sin credenciales, proveedor caído) o hay error de red, el chat responde por coincidencia de palabras como antes y **lo aclara en el mensaje** ("Respuesta de las preguntas frecuentes: el asistente no está disponible ahora."). `esIaNoDisponible(error)` de `lib/ia.ts` es quien decide eso.
- **El 429 `IA_SIN_CUOTA` es otra cosa y se trata distinto** (`esSinCuota`). Ahí la IA existe pero se agotó su cuota, así que **no se responde una FAQ en su lugar**: se muestra el mensaje del backend tal cual —dice cuánto falta para volver— con estilo propio y la etiqueta "El asistente necesita descansar". Contestar una FAQ sería darle algo que no preguntó y ocultarle que puede volver en un rato; quedarse en blanco es peor todavía.
  - Mientras está en ese estado (`sinCuota`) **vuelven a aparecer los accesos rápidos a las FAQ**, y ahí **responden localmente** (`responderConFaq`) sin pegarle al backend: gastar un pedido para recibir el mismo aviso no le sirve a nadie. El flag se apaga en cuanto una consulta vuelve a funcionar.
- El cliente vive en `lib/ia.ts` y **no** en `DataContext` a propósito: el chat es público (la burbuja también está en `/ayuda`, sin sesión), así que no es "datos del usuario logueado". El informe de beneficios, que sí es del alumno, sí está en el Context.
- **El historial lo manda el cliente**, recortado a los últimos 6 turnos: el chat no tiene estado en el servidor y no se guarda ninguna conversación. El saludo inicial no viaja — no lo dijo nadie, lo escribió la pantalla.
- `lib/faqs.ts` es además la misma fuente que usa la pantalla pública de Ayuda: estaban duplicadas y se iban a desincronizar.

**Se puede usar suelto o controlado.** Sin props se abre y cierra solo (así lo monta `AlumnoNav`); con `abierto` + `onAbiertoChange` lo maneja la pantalla. Lo segundo existe para el botón "Iniciar chat" de Ayuda, que necesita abrir un widget que ya está montado.

## Soporte: toda la sección andaba en falso

Reportado: *"toda la sección de Soporte no funciona"*. Era literal — **siete controles muertos** entre el pie de página (entonces sólo en la Landing; hoy en todas, ver `components/Footer.tsx`) y `/ayuda`:

| Dónde | Qué pasaba |
|---|---|
| Footer Landing | "Preguntas frecuentes" y "Contacto" sin `onClick` |
| Ayuda | Botón "Buscar" sin handler |
| Ayuda | Los tres "Ver guía →" sin handler |
| Ayuda | "Iniciar chat" sin handler |
| Ayuda | Mail y teléfono en texto plano, sin `mailto:`/`tel:` |
| Ayuda | **"Reportar un problema" era una maqueta**: `setReportSent(true)` y a otra cosa |

Cómo quedó cada uno:

- **El formulario es real**: `crearReporteSoporte()` → `POST /api/soporte/reportes`, con su estado de envío y el mensaje de error del backend. Ganó un campo **Email** (antes sólo pedía asunto y detalle, así que no había forma de responder) que se precarga con el de la sesión si hay. Ver el CLAUDE.md del backend para por qué el endpoint es público.
- **El email se deriva, no se sincroniza**: `emailEditado ?? currentUser?.email ?? ""`. Con un `useEffect` que llamara al setter se pisaría lo que la persona ya tipeó cuando `currentUser` termina de llegar — y además rompe `react-hooks/set-state-in-effect`.
- **Las "Guías rápidas" abren su FAQ.** No existen páginas de guía y la respuesta ya está escrita abajo, así que cada guía declara un `faqId` y el click despliega y scrollea esa pregunta. Para eso `Faq` ganó un **`id` slug estable** en `lib/faqs.ts`; el `<details>` pasó a ser controlado (`open={faqAbierta === f.id}`).

### El `onToggle` de dos `<details>` compite, y por eso las guías "no hacían nada"

Reportado después: *"hago click en las guías rápidas y no hacen nada, no me llevan a ningún lugar"*. El cableado estaba bien y la causa era una carrera.

Abrir una FAQ **cierra la que estaba abierta**, así que el navegador encola **dos** eventos `toggle` — el de la que se abre y el de la que se cierra — y los dispara en **orden de documento**, no en el orden que importa. El handler era `setFaqAbierta(open ? f.id : null)`: si la que se cerraba estaba más abajo en la lista, su `toggle` corría último y el `null` pisaba el id que la guía acababa de poner. La FAQ se abría y se cerraba en el mismo frame. Por eso el primer click parecía funcionar y **el bug sólo aparecía al alternar entre guías**.

El arreglo es una actualización **funcional** que sólo limpia si esa FAQ seguía siendo la anotada: `setFaqAbierta((actual) => (abierto ? f.id : actual === f.id ? null : actual))`. **La misma trampa aplica a cualquier acordeón controlado de un solo panel abierto.**

De yapa, `abrirFaq` resalta la respuesta unos segundos (`ESTILO_RESALTE` de `lib/resaltado.ts`): dos de las tres guías responden con el mismo texto, así que sin feedback la segunda seguía pareciendo muerta aunque ya funcionara.
- **"Buscar" baja a los resultados.** El filtrado ya ocurría al tipear, pero en pantallas chicas la lista quedaba abajo del pliegue y parecía que el botón no hacía nada.
- **"Iniciar chat" abre el `ChatbotWidget`**, que ahora se monta también en Ayuda (es un portal, funciona en cualquier pantalla) en modo controlado.
- **Los links del footer llegan con `state.seccion`** (`faqs` / `contacto`) y la pantalla scrollea a la sección. El efecto sólo hace `scrollIntoView`, no toca estado.
- **La bandeja del admin es la pestaña "Soporte" de `admin/Gestion.tsx`**, detrás de `soporte.gestionar`. Muestra quién escribió (o **"Sin cuenta"** cuando `autorNombre` viene en null: la etiqueta la pone la pantalla), el detalle, el estado y la respuesta; el modal de cierre pide una respuesta opcional. La clave nueva está en `lib/areas.ts` **en los dos lugares**: en `requiere` del área admin y en el de la pantalla `gestionadmin` — sin lo segundo, alguien con sólo ese permiso abriría el área sin poder entrar a la única pantalla que lo usa.

## Manual de usuario: pantalla propia (`/manual`), y el texto NO vive en el JSX

El manual existía sólo como el **Anexo 8** del informe (`Manual de usuario Activehub.txt`, en la raíz del proyecto): un archivo de texto que quien usa el sistema no tiene ni va a buscar. `/ayuda` respondía dudas sueltas (FAQ, guías, chat) pero nadie podía leer el recorrido completo de su rol desde adentro de la app. `pages/public/Manual.tsx` es ese documento.

- **Ruta pública**, igual que `/ayuda` y por la misma razón: crear la cuenta, verificar el correo e iniciar sesión son justo lo que hace falta cuando todavía no se pudo entrar. Está fuera de `RequireEmailVerificado`.
- **El contenido está en `lib/manual.ts`, no en la pantalla.** Mismo criterio que `lib/faqs.ts`: el manual lo corrige quien redacta la documentación, y una corrección de redacción no tiene que obligar a leer 400 líneas de `style={s(...)}`. La pantalla sólo sabe cómo se ve cada **tipo de bloque** (`p`, `sub`, `pasos`, `lista`, `tabla`). **Si cambia un texto de la interfaz, se transcribe literal entre comillas acá también**, igual que en el anexo.
- **Desde el 2026-10-17 el contenido es el del manual vigente** (PARTE B de `MANUAL-ACTIVEHUB-TEXTO-VIGENTE.txt`, raíz del proyecto), idéntico palabra por palabra a la copia del asistente (`activehub-backend/src/main/resources/manual/manual-usuario-activehub.txt`). Se generó desde ese texto plano con un conversor: `- ` → `lista`, `N. ` → `pasos`, línea corta suelta → `sub`, listas "Columna: valor — Columna: valor" → `tabla`. **`pasos` y `lista` aceptan `sub`** (`sub[i]` = viñetas anidadas del ítem i, `null` si no tiene): el manual vigente cuelga opciones y mensajes de un paso (los tres resultados de inscribirse en 2.6) y la pantalla los muestra con `SubItems`. El título de la sección 1 pasó a "Primeros pasos (común a los tres roles)", como en el manual.
- **El único marcado es `**término**` → negrita** (`conNegritas`). No se renderiza HTML del texto, justamente para que una corrección de redacción no pueda inyectar nada.
- **El buscador usa `incluye` de `lib/texto.ts`** (sin tildes, como todo el resto) y filtra **apartados**, que es la unidad que ofrece el índice; una sección sin apartados que coincidan desaparece del índice y del cuerpo.
- **El índice se resalta por scroll**, no con `IntersectionObserver`: alcanza con "cuál fue el último título que pasó el pliegue" (los `<h3>` llevan `data-apartado`). El listener se registra en un efecto y **nunca se ejecuta de forma síncrona ahí**, así que no cae en `react-hooks/set-state-in-effect`.
- **El scroll a un apartado se hace a mano** (`- 96 px`), porque el ancla nativa queda tapada por el encabezado pegajoso. Se llega por `state.apartado` (desde Ayuda) o por el hash de la URL (`/manual#a-2-6`), que es lo que queda al compartir un enlace.
- **`window.print()` y `.ah-no-print`**: el botón "Imprimir / PDF" imprime sólo el cuerpo; encabezado, buscador, índice y botones se ocultan con esa clase (`index.css`, bloque `@media print`). Es el mismo camino que ya usan las exportaciones a PDF del instructor y del admin: el diálogo del navegador, sin dependencias.
- Los accesos: la tarjeta oscura "Manual de usuario" arriba de las preguntas frecuentes en `/ayuda`, y "Manual de usuario" / "Manual" en las dos variantes de `components/Footer.tsx`. Las figuras del anexo (capturas) **no** se trasladaron: quien lee el manual ya está mirando el sistema.

## "Asistente de beneficios y prevenciones": el informe lo escribe el modelo

La sección del detalle de actividad (`alumno/Detalle.tsx`) ya no arma el texto con plantillas: llama a `generarInformeActividad(actividadId, claseId)` del `DataContext` (`POST /api/alumno/actividades/{id}/informe`), que devuelve `InformeActividad` — `resumen`, `afinidad` (`Alta`/`Media`/`Baja`), `beneficios`, `prevenciones` y `generadoEn`.

- **El resumen y la afinidad son lo nuevo y lo que el alumno vino a leer**: si esta actividad le va a gustar. Los beneficios y prevenciones son el detalle. La afinidad sale de cruzar la actividad con sus intereses y con lo que ya hizo en la plataforma; es una etiqueta, no un puntaje, y **no condiciona ni bloquea la inscripción**.
- **`BENEFICIOS_POR_NIVEL` / `PREVENCIONES_POR_NIVEL` siguen en el archivo como respaldo, no como fuente.** Con 503 `IA_NO_DISPONIBLE` (o error de red) el informe se muestra igual con esos textos y un aviso de que es general para el nivel y no considera el perfil. **Hay que decirlo**: el encabezado promete que usa el perfil del alumno, y en ese caso no lo usó. Siguen keyed por nombre de nivel, con su versión genérica (el admin puede crear niveles).
- **El 429 `IA_SIN_CUOTA` también muestra el informe general, no un cartel de error**, y el aviso es el mensaje del backend (`aiAviso`), que dice cuánto falta. El motivo es literal: ese mensaje termina con "podés ver los beneficios y prevenciones generales de la actividad más abajo", así que **esa promesa tiene que ser verdadera en la pantalla**. Si en cambio se mostrara un estado de error vacío, el texto estaría mandando a algo que no está.
- **`AiState` tiene un cuarto valor, `"error"`**, para lo que sí es una falla (un 4xx que no es cuota): ahí va el cartel con "Reintentar".
- **La clase seleccionada viaja** (`selectedClase?.id`) para que el informe pueda hablar de esa fecha y ese horario. **Nada del perfil se manda desde el cliente**: sale del token y de la base, para que nadie pueda pedir un informe con datos de salud inventados.
- El aviso legal al pie **no se toca**: "Informe orientativo generado por IA. **No es un diagnóstico médico** ni una indicación clínica, y **no condiciona ni bloquea tu inscripción**…". El prompt del backend está escrito para que eso siga siendo verdad; si cambiás uno, mirá el otro.
- Sigue sin persistirse ("Informe guardado para esta sesión"): ver el CLAUDE.md del backend para por qué.

## `components/Footer.tsx`: el pie va en TODAS las pantallas, montado una sola vez

Estaba escrito dentro de `pages/public/Landing.tsx` y se veía nada más que ahí: el resto de la aplicación —incluida `/ayuda`, el login y el registro— terminaba en el aire, sin los accesos a Ayuda, preguntas frecuentes y contacto, que es justo lo que alguien busca al final de una pantalla en la que se quedó trabado.

**Se monta en `App.tsx`, después de `<Routes>` y fuera de ellas.** Es el mismo criterio que `ChatbotWidget`: si cada pantalla tuviera que acordarse de ponerlo, la próxima que se agregue se lo olvida. **No hay que agregarlo a ninguna pantalla nueva** — ya está.

- **Dos variantes, y las elige la ruta, no un prop.** Completo (las cuatro columnas de la landing) en el área pública y la del alumno; **compacto** (logo + los tres enlaces de soporte + copyright) en `/instructor` y `/admin`: son herramientas de trabajo, y un pie con "Ser instructor" y "Registrarse" abajo del panel de administración no le sirve a nadie. La decisión se toma dentro del componente por el `pathname`, así no hay que tocar `App.tsx` ni los dos layouts cuando cambie.
- **El pie se adapta a la sesión.** Sin sesión: "Iniciar sesión" y "Registrarse". Con sesión: "Mi perfil", y **cuál perfil lo deciden los permisos** (`puedeEntrarA` de `lib/areas.ts`), no el rol ni la ruta — un instructor mirando `/ayuda` tiene que ir al suyo, y mandarlo a `/alumno/perfil` lo rebota en `RequireArea`. "Ser instructor" desaparece con sesión abierta: el registro pide crear otra cuenta.
- **"Categorías" depende de dónde estás.** La sección vive en la landing: ahí scrollea, y desde cualquier otra pantalla navega a `/` con `state.seccion = "categorias"` y **la landing hace el scroll** (un `useEffect` que sólo scrollea, con un `setTimeout` corto porque recién montada las tarjetas del catálogo todavía están moviendo la sección de lugar). Es el mismo mecanismo que ya usaba `/ayuda` para "Preguntas frecuentes" y "Contacto".
- **La barra inferior reserva 150px a la derecha** para la burbuja "¿Dudas?", que es `position:fixed` en esa esquina: sin ese espacio le queda encima al "Hecho en Mendoza".
- Sigue valiendo la regla de la sección de Soporte: **los enlaces navegan, no decoran**. Nada de texto con cursor de mano sin `onClick`.

## El chip de usuario del `AlumnoNav` es un menú, no un link

Hacer click en el nombre navegaba directo a `/alumno/perfil`. Ahora despliega un menú con **Mi perfil**, **Mis reseñas** y **Cerrar sesión**: las dos últimas eran acciones de un click que obligaban a entrar al Perfil —una pantalla entera— para llegar a ellas.

- **"Mis reseñas" se muestra sólo con `resenias.escribir`**, el mismo permiso con el que `App.tsx` gatea esa ruta. Es la regla de siempre: un atajo a un 403 es peor que no tener el atajo.
- Cierra al hacer click afuera (`mousedown` en `document`) y con Escape. Sin eso quedaba abierto tapando contenido mientras el usuario seguía navegando.
- `logout()` viene de `AuthContext` y después se navega a `/`, la landing pública.

## Resolver una denuncia: el modal de Suspender está en las DOS pantallas

`resolverDenuncia` con `SUSPENDER` exige `diasSuspension` (mínimo 15) y acepta `montoMulta`. `admin/Gestion.tsx` ya pedía las dos cosas en un modal, pero **`admin/Auditoria.tsx` mandaba la acción pelada**: el botón "Suspender instructor denunciado" devolvía *"Indicá cuántos días dura la suspensión."* sin que hubiera ningún lado donde indicarlo. Estaba roto de punta a punta.

Hoy `Auditoria.tsx` tiene el mismo formulario (días + multa). **Los topes viven en `lib/limites.ts`** (15 a 365 días, multa de $1.000 a $500.000 o 0 = sin multa), espejo de `VentanaPenalizacion` del backend: si cambian, son dos lugares (ese archivo y la constante del backend), ya no tres. Las otras resoluciones siguen siendo un click directo.

## Baja de categoría: cascada, con confirmación que dice qué se lleva puesto

La pantalla bloqueaba con un `window.alert` apenas la categoría tenía **un** tipo, así que borrar una categoría con tipos vacíos significaba borrarlos a mano uno por uno. El backend cambió la regla (ver su CLAUDE.md) y `admin/Taxonomia.tsx` la acompaña con un `Modal` en vez de `alert`/`confirm`:

- **Con actividades publicadas detrás** (`c.n > 0`, el conteo que ya calculaba `catStats`): el modal explica cuántas son y sólo ofrece "Entendido". No se manda el request.
- **Sin actividades**: pide confirmación diciendo **cuántos tipos se van a eliminar junto con la categoría**. Una cascada silenciosa es lo peor de los dos mundos.
- **`DataContext.eliminarCategoria` también saca los tipos del estado local.** El backend los da de baja en cascada; si el cliente sólo quitaba la categoría, quedaban tipos huérfanos en la tabla mostrando categoría "—".
- El mensaje de error del 409 lo escribe el backend (nombra los tipos en uso) y la pantalla lo muestra tal cual.

## Roles y permisos ya no es maqueta

`admin/Roles.tsx` consume `listarRolesPermisos()` (GET `/api/admin/roles`), `actualizarPermisosRol(rolId, claves)` y `crearRol(nombre, descripcion?)`. La matriz de checkboxes sale de `ConfiguracionRol` en la base (RN-19) — antes vivía en una constante del componente y "Guardar cambios" solo pintaba un cartel.

**Un rol por vez, elegido en un combo.** La pantalla era una matriz de N columnas (una por rol) con la lista de roles fija a la izquierda: con los tres del sistema entraba justo, pero en cuanto el admin crea roles propios —que es el punto de la pantalla— la grilla se vuelve ilegible y hay que scrollear en horizontal para saber qué columna es cuál. Hoy el rol se elige en un `<select>` arriba, la lista de permisos ocupa todo el ancho y el borrador sigue siendo **por rol**, así que se puede cambiar de rol sin perder lo tocado y "Guardar cambios" manda todos los roles que cambiaron.

Cosas a respetar:
- **Se guarda la foto completa del rol**: se manda la lista de claves marcadas y el backend apaga todo lo que no venga. Por eso el botón solo se habilita si hay diferencias contra lo cargado.
- **Los permisos implícitos no se muestran.** `PermisoAdmin.configurable` viene del backend (`Permiso.IMPLICITOS`); hoy el único implícito es `catalogo.explorar`. Se conserva en la base y en las guardas — explorar el catálogo lo hace cualquiera y la única guarda que usa esa clave son los favoritos —, pero como checkbox sólo servía para romper un rol sin querer. **Filtrar por `configurable`, no por una lista de claves escrita en el componente.**
- **Al Administrador no se le pueden sacar los permisos críticos**: el backend rechaza con 400 y la pantalla recarga desde el servidor, así los checkboxes vuelven a su estado previo (criterios 6 y 8) en vez de quedar mintiendo.
- Un rol creado acá **nace sin permisos**, y sí se le puede asignar a una cuenta (desde el modal de edición de `admin/Gestion.tsx`). Con permisos de más de un área, el usuario ve el botón "Ir a …" para cambiar de panel.

## Nivel de intensidad: es un ABM, no una lista de tres

Desde la V21 del backend (E4Ad-HU05) los niveles son una entidad que el admin crea, edita y elimina desde **Tipos y niveles › Niveles de intensidad**. Lo que rompía si se seguía asumiendo la lista fija:

- **`NivelIntensidad` en `lib/types.ts` pasó de ser una unión de tres literales a una interfaz** (`{id, nombre, descripcion, actividades}`). El nombre es `string` abierto.
- **`Actividad` tiene ahora `nivelIntensidadId` y `nivelIntensidad`** (el nombre, desnormalizado para no buscarlo en cada tarjeta).
- **Los colores del badge salen de `lib/nivelStyle.ts`**, con un neutro para los niveles que cree el admin. Ese mapa estaba duplicado en `ActivityCard`, `MisActividades` y `Taxonomia`, y ya se había desincronizado una vez. **No volver a escribir un `Record` de tres claves fijas**: un nivel nuevo se renderiza sin badge o rompe.
- Lo mismo vale para los textos de `alumno/Detalle.tsx` (`BENEFICIOS_POR_NIVEL` / `PREVENCIONES_POR_NIVEL`): están keyed por nombre y tienen su versión genérica de fallback.
- **El alta de actividad manda `nivelIntensidadId`**, y preselecciona el primer nivel del catálogo con un `useEffect` — en el primer render `data.nivelesIntensidad` todavía está vacío.
- Los chips de nivel de Explorar y del Home salen de `data.nivelesIntensidad` / del catálogo, no de una constante.

## Reseña: el comentario es opcional

E3A-HU10 criterio 3: la calificación es obligatoria, el comentario no. En `MisResenas.tsx` el botón se habilita con solo elegir estrellas, el placeholder dice "(opcional)" y las tarjetas muestran "Sin comentario" en itálica cuando no hay texto. En los tipos, `comentario` es `string | null` — cualquier pantalla que lo renderice tiene que contemplarlo.

## Asistencia: no existe, y no hay que volver a agregarla

La spec la retiró del alcance ("el registro de asistencia manual fue retirado de esta vista", E2I-HU07; "la asistencia no se considera como métrica", E2I-HU10). Se sacaron la columna "Asistencia" de `GestionClase.tsx`, `marcarAsistencia` del `DataContext`, el campo `presente` del roster y todo el slice del backend.

## Permisos en el frontend: a dónde entrás lo deciden tus permisos, no tu rol

`AuthContext` expone `permisos` (las claves del rol, que vienen en `GET /api/auth/me`) y `puede(clave)`.

**`src/lib/areas.ts` es la fuente de verdad**: define las tres áreas (`alumno`, `instructor`, `admin`), qué permisos habilitan cada una (alcanza con **uno**) y, en `pantallas`, la lista ordenada de pantallas de cada área con el permiso que pide cada una. Antes esto estaba repartido entre `RequireRole`, una constante privada de `DashSidebar`, dos mapas `HOME_BY_ROL` y un `PERMISO_POR_ITEM` escrito a mano.

De esa única lista salen las tres respuestas: qué áreas ve alguien (`areasDisponibles`), qué ítems de menú ve dentro (`puedeVerItem`) y **a dónde aterriza** (`homeDe`, `homeDeArea`). **No hay N menús para N combinaciones de permisos**: hay 3 menús y un filtro. Agregar una pantalla = una entrada en `pantallas` + su grupo de ruta en `App.tsx`.

Tres reglas de ese archivo que no son obvias:

- **`requiere` puede ser una lista, y significa "alcanza con uno".** Es el caso de Gestión, que tiene una pestaña por módulo: exigirle `usuarios.gestionar` a alguien que sólo tiene `denuncias.resolver` lo dejaba afuera de la pantalla que contiene su pestaña de Reclamos. Adentro, `admin/Gestion.tsx` filtra qué pestañas se ven y cae en la primera permitida si la URL pide una que no.
- **El aterrizaje es la primera pantalla que los permisos habilitan, no la raíz del área.** Los paneles de inicio van primeros y declaran los permisos de su **contenido**, así que un administrador completo cae en su Dashboard y uno con sólo `taxonomia.gestionar` lo saltea y va directo al ABM (antes caía en `/admin` y veía el cartel de error, porque las cuatro consultas del panel son de otros módulos).
- **Invariante: un permiso que abre un área tiene que habilitar alguna pantalla de esa área.** `cobros.confirmar` la violaba: abría el área de instructor pero no es un módulo con menú propio, es una acción dentro del roster de la clase (`clases.gestionar`). Quien lo tuviera solo entraba a un área sin ni una pantalla que ver. Salió de `requiere`. Si agregás un permiso ahí, fijate que alguna `pantalla` lo liste.

Cómo se aplica todo eso, pantalla por pantalla:

- **`RequireArea` reemplazó a `RequireRole`.** La guarda vieja comparaba `currentUser.rol` contra un nombre fijo, así que un rol con permisos de instructor no llegaba nunca a `/instructor` — era el bug reportado ("si le asigno los permisos del instructor al alumno no aparecen los menús"). Ahora la puerta la abre el permiso, igual que en el backend.
  - Mientras `initializing` está en true no decide nada: con `permisos` todavía vacío, cualquier redirección es un falso 403 y el usuario rebotaba al catálogo público al recargar.
- **`RequirePermiso` (`components/RequirePermiso.tsx`) guarda cada PANTALLA; `RequireArea` sólo guarda el área.** Es una distinción que costó un bug: el área se abre con **alguno** de sus permisos, así que a un alumno al que le sacaron `inscripciones.gestionar` le seguían quedando `resenias.escribir` y `denuncias.crear` — entraba a `/alumno` y desde ahí a `/alumno/inscripcion/:id`, que el backend rechaza con 403. Ése era el "le quité el permiso y me sigo pudiendo inscribir". Hoy en `App.tsx` cada grupo de rutas va detrás del permiso que exige el `@PreAuthorize` del endpoint que consume, en las tres áreas. **Al agregar una pantalla, ponela dentro del grupo que le corresponde.**
- **Ocultar el ítem de menú no alcanza.** Un permiso que gatea un endpoint tiene que gatear también el **botón** que lo llama: los CTA de inscripción de `alumno/Detalle.tsx` (`puedeInscribirse`), el "Reportar inasistencia" de `alumno/MisClases.tsx` (`denuncias.crear`) y los tres atajos de `alumno/Perfil.tsx`. Cuando el botón desaparece, dejá en su lugar un cartel que explique por qué — un panel que se queda mudo se lee como si estuviera roto.
- **Los tres menús filtran por permiso**, no sólo el del admin: `AlumnoNav` y el sidebar de instructor también. Nadie ve un ítem que el backend le va a rechazar con 403.
- **El Administrador no tiene permisos de las otras áreas** (V22 del backend): nacía con todos menos `inscripciones.gestionar`, y por eso le aparecían los botones "Ir a Instructor" e "Ir a Alumno". El admin gobierna la plataforma; no publica actividades ni se inscribe.
- **Los botones "Ir a …" llevan a `homeDeArea(area, permisos)`**, no a la raíz del área: si no, el cambio de panel aterrizaba en una pantalla que el usuario no podía usar, exactamente igual que el login.
- **Botón "Ir a …" cuando alguien tiene más de un área.** Sin eso, un usuario con permisos mixtos quedaba encerrado en el área a la que entró. Está en `AlumnoNav` y en el pie de `DashSidebar`.
- **El login redirige con `homeDe(user.permisos)`**, no con un mapa por rol — un rol creado por el admin no tiene entrada en ningún mapa fijo. Por eso `login()` devuelve los permisos dentro de la sesión: si no, habría que esperar al render siguiente del contexto.
- **El perfil de instructor se pide por permiso.** `fetchPerfilInstructorSiCorresponde` miraba `rol !== "INSTRUCTOR"`; ahora mira `puedeEntrarA("instructor", permisos)`. Por eso en `login()` la llamada a `/api/auth/me` va **antes** que la del perfil.
- El rol de una cuenta se cambia desde el modal de edición de `admin/Gestion.tsx` (`asignarRolUsuario`, endpoint propio). El selector lista los roles reales, marcando cuáles creó el admin.
- `UsuarioAdmin.rol` es `string`, no la unión de los tres nombres: puede ser un rol nuevo.

## Dashboard, Reportes y Trazabilidad del admin: lo que decía la pantalla vs. lo que hacía

Tres pantallas tenían controles que no controlaban nada. El patrón se repite, así que vale como regla general: **un control que no hace nada es peor que no tenerlo**, porque el número que está al lado parece filtrado y no lo está.

- **`admin/Dashboard.tsx` — el período ahora existe.** "Últimos 30 días" era un `div` de texto fijo y, encima, los KPIs y los dos gráficos se calculaban sobre todo el histórico. Hoy es un `<select>` (`PERIODOS`, los mismos rangos que Reportes) y filtra de verdad. **El período recorta flujos, no estados:** "Usuarios activos" y "Actividades publicadas" son una foto del ahora y no se recortan (recortarlos daría "2 usuarios activos" en una plataforma con 17); lo que se recorta son las inscripciones y el conteo de altas nuevas, y la leyenda de la tarjeta lo aclara.
- **Las tarjetas del Dashboard son links.** Cada KPI lleva `path` + `destino` y navega a su sección (`/admin/gestion/usuarios`, `/instructores`, `/actividades`, `/reclamos`). La grilla "Accesos rápidos" de abajo se eliminó: repetía esos mismos cuatro destinos, así que el número y el lugar donde se resuelve eran dos tarjetas distintas.
- **`admin/Reportes.tsx` — las pestañas mandan en la PANTALLA, no sólo en el PDF.** Desempeño / Financiero / Actividades / Reclamos ya decidían el contenido del modal de impresión, pero la pantalla mostraba siempre lo mismo (KPIs fijos + detalle por categoría): hacer click no cambiaba nada visible. Hoy la pestaña elige los KPIs (`dKpis`), la tabla de detalle (`detalle`) y lo que baja el CSV.
- **El gráfico tiene eje Y y fechas reales.** Eran ocho barras `S1`…`S8`: ocho semanas hacia atrás fijas, sin relación con el período elegido ni con el calendario — de ahí las dos preguntas que nadie podía responder mirándolo ("¿qué semana es S1?", "¿qué es una semana 7 si el mes tiene cuatro?"). Y sin eje Y, una barra más alta que otra no decía cuántas inscripciones más eran. Ahora la granularidad sale del período (7 días → días; 30 → semanas; 90/año/histórico → meses), cada tramo lleva su fecha y su valor, y el eje Y se redondea a cuatro marcas enteras. Lo mismo en el gráfico del Dashboard.
- **`admin/Trazabilidad.tsx` — "Exportar" exporta.** No tenía `onClick`. Ahora baja un PDF con **lo filtrado**, no la tabla entera: un registro de auditoría que exporta algo distinto de lo que se está mirando no sirve como respaldo. La grilla también dejó de pisarse: la columna "Acción" era de 124px sin `gap` y sin límite de ancho, así que una acción larga (`PERMISOS_ACTUALIZADOS`) se montaba sobre "Entidad".

## `lib/cargaParcial.ts`: un 403 de un módulo no puede tirar la pantalla entera

Consecuencia de RN-19 que no es obvia: un permiso habilita un **módulo**, no un área, así que cualquier combinación existe. Varias pantallas cargan con un `Promise.all` de tres a cinco consultas de módulos distintos, y **`Promise.all` se rechaza entero si una sola falla** — un 403 de una consulta secundaria dejaba toda la pantalla en estado de error aunque el módulo que el usuario sí tiene hubiera respondido bien. (Es la misma trampa que ya había costado la landing pública con `/api/niveles-intensidad`.)

**La regla: en un `Promise.all` que cruza módulos, cada consulta va envuelta en `siPuede(puede("clave"), fn, vacío)`** con el permiso que exige su `@PreAuthorize`. Lo que no se pudo pedir queda vacío y la pantalla **oculta** esa sección — nunca la muestra en cero, que se lee como "no hay datos" en vez de "no tenés permiso". Ya aplicado en `admin/Dashboard`, `admin/Reportes`, `admin/Penalizaciones`, `instructor/Panel`, `alumno/Perfil`, `alumno/MisResenas` y `alumno/MisDenuncias`.

Lo que cada pantalla oculta cuando falta el permiso: las tarjetas KPI del Dashboard (cada una declara su `requiere`) y sus dos gráficos; la pestaña "Reclamos y penalizaciones" de Reportes; el botón "Nueva penalización"; y las listas de clases calificables / reportables de Mis reseñas y Mis denuncias — el historial se sigue viendo, lo que no se puede es dar de alta.

## Trazabilidad: paginada, ordenable, exportable y legible

- **15 eventos por página** (`POR_PAGINA`). La auditoría es de sólo-append y crece para siempre: con miles de filas la pantalla tardaba en pintar y "Exportar" generaba un PDF de cientos de hojas.
- **Dos botones de exportación**: "Exportar esta página" y "Exportar todo (N)". El segundo abre **siempre** un modal con un selector de **Período** (todo el registro · últimos 7 días · un mes calendario, sólo los meses que tienen eventos en lo filtrado), dice cuántos eventos salen y deshabilita "Exportar" si son cero. El período se aplica **encima** de los filtros y respeta el orden de la tabla; "últimos 7 días" se mide con `Date.now()` en el handler (el contador del modal usa `useAhora()`).
- **`entidadId` es `string | null`** (`audit_log.entidad_id` es nullable). Tiparlo como `string` fue lo que dejaba la pestaña de exportación en blanco: ver "exportación sin dependencias".
- **La columna "Detalle" muestra `descripcion`**, la frase en castellano que arma el backend (`DescripcionAuditoria`). Antes concatenaba `entidadId + metadata`, o sea un UUID y una clave técnica.
- Cualquier cambio de filtro vuelve a la página 1; si un filtro deja menos páginas que la actual, se cae a la última válida en vez de mostrar una página vacía.

### "Exportar todo" no andaba: `window.confirm` consume la activación de usuario

Es la trampa que explica por qué "Exportar esta página" funcionaba perfecto y el de al lado no hacía **nada**, sin error ni ventana. `exportarPdf` abre una pestaña con `window.open`, y el navegador sólo lo permite mientras dura la **activación de usuario** (*transient user activation*) del click. "Exportar todo" pasaba antes por un `window.confirm`: ese diálogo es modal del navegador y al cerrarlo la activación ya se consumió, así que el `window.open` de después salía bloqueado en silencio.

La confirmación ahora es un **modal de la app** (`components/Modal.tsx`) y el PDF lo dispara el click en su botón "Exportar", que es un gesto de usuario nuevo. **Regla general: entre el click y un `window.open` no puede haber un `alert`/`confirm`/`prompt` ni un `await`.** Por eso `exportar()` (decide) y `generarPdf()` (abre la ventana) están separadas.

### Ordenar por columna: sólo al hacer click

Los cinco encabezados de la tabla son botones. El primer click ordena **Fecha y hora** de más reciente a más antiguo y las columnas de texto de la A a la Z; a partir del segundo, alterna. Al cargar la pantalla **no se ordena nada** (`orden === null`): se respeta el orden que devuelve el backend.

Tres cosas a respetar si se toca:
- Se ordena `filtered` y recién después se pagina (`ordenados` → `visibles`). Ordenar la página visible daría un orden distinto en cada página.
- El texto se compara con `Intl.Collator("es-AR")`, no con `<`: por códigos UTF-16, "Ñandú" y "álvarez" caen después de "Zapata".
- `COLUMNAS` y `GRID_COLUMNAS` son constantes del módulo: el encabezado y las filas comparten la misma definición de grilla, que antes estaba escrita dos veces y ya se había desincronizado.

"Exportar todo" exporta **en el orden elegido** (usa `ordenados`), no el del backend.

### Paginación: primera, última y número editable

A la izquierda de "Anterior" hay un botón que va a la **primera** página y a la derecha de "Siguiente" uno que va a la **última**, y el número del medio es un **botón que se convierte en input**: se hace click, se escribe la página y se confirma con Enter (Escape cancela, el blur también confirma). Con 200 páginas, llegar a la 137 a fuerza de "Siguiente" no es navegación. `irAPagina` clampea a `[1, totalPaginas]`, así que un número fuera de rango no rompe nada.

## Correcciones de cierre (2026-10-16)

Pedidas por el usuario con el sistema ya terminado. Lo que hay que saber si se toca alguna:

- **Nombres del menú del admin**: la sección de denuncias (`admin/Auditoria.tsx`, key `auditoria`, ruta `/admin/auditoria`) se llama **"Gestión de denuncias"**, y la de registro de operaciones (`admin/Trazabilidad.tsx`, key `trazabilidad`, ruta `/admin/trazabilidad`) se llama **"Auditoría"**. Cambiaron sólo las etiquetas y los títulos: keys, rutas y nombres de archivo quedaron como estaban para no romper permisos ni enlaces. En este archivo, "Trazabilidad" sigue nombrando a la pantalla `Trazabilidad.tsx`.
- **"Gestión de denuncias" filtra las acciones por tipo** (`ACCIONES_POR_TIPO` de `lib/denuncias.ts`): sobre una reseña sólo "Ocultar la reseña" y "Desestimar"; antes ofrecía las cuatro de una clase, que el backend rechaza con 400. Ganó la columna "Tipo", "Denunciado" muestra al autor de la reseña cuando corresponde y el panel cita el comentario denunciado.
- **Paginación** en Reclamos y en las dos sub-pestañas de Reseñas de `Gestion.tsx`, y en "Gestión de denuncias": 10 por página, con `usePaginado` (`lib/paginado.ts`) + `<Paginacion>` (los mismos controles que Trazabilidad: primera, anterior, número editable, siguiente, última). La página efectiva se **deriva** (recortada a las que existen), no se sincroniza con un efecto.
- **Topes** (`lib/limites.ts`): suspensión 15–365 días, multa $1.000–$500.000 (0 = sin multa en la suspensión), precio de actividad hasta $1.000.000, cupo de clase hasta 500. Validados también en el backend.
- **"Inasistencia" en Mis clases del alumno** sólo aparece mientras la denuncia es posible (espejo de `creardenuncia`): clase Finalizada, desde 1 h y hasta 24 h (`HORAS_PARA_DENUNCIAR`) después del inicio. Antes aparecía en toda clase pasada, también en las finalizadas hace días, donde el backend la rechaza. El aviso gris dice "disponible al finalizar la clase" y sólo se ve con la clase ya empezada. Las clases ya denunciadas se marcan con "Reporte enviado" también después de recargar (se cruza con `listarMisDenuncias`).
- **Historial del instructor clickeable** (modo consulta de `GestionClase`), **filtro por actividad** en Historial y Próximas clases, **botón "Activar ubicación"** y **buscador del Home**: ver sus secciones.
- **Notificaciones por correo**: las importantes también llegan por mail. Es todo del backend (`TipoNotificacion.porCorreo`); el frontend no cambió.

## `components/Modal.tsx`: los modales van en un portal, siempre

**Nunca escribas un `position:fixed;inset:0` suelto dentro de una pantalla.** Los modales se abrían "en el medio de la página" en vez de en el medio de la pantalla: con la página scrolleada quedaban arriba de todo y había que subir para encontrarlos. Pasaba en Mis reseñas del alumno, en Tipos y niveles del admin y en todos los demás.

La causa no estaba en los modales —todos eran `position:fixed;inset:0`, que es correcto— sino en su ancestro: `.ah-screen`, la clase del contenedor raíz de cada pantalla, tiene `animation: ahFade .28s ease both`, y esa animación anima `transform`. **Un elemento con una animación de `transform` aplicada crea un containing block para sus descendientes `position:fixed`**, así que `inset:0` dejaba de resolverse contra el viewport y pasaba a hacerlo contra el alto completo de la página. Es primo del caso de `backdrop-filter` en `AlumnoNav` que ya está documentado más abajo.

`Modal` lo resuelve con un **portal a `document.body`**: sin ancestros de la pantalla, ninguna propiedad futura (un `transform`, un `filter`, un `contain`) puede volver a capturarlo. De paso trae bloqueo de scroll del body, cierre con Escape y cierre al hacer click en el fondo. Bajarle el `fill-mode` a la animación también lo arreglaría hoy, pero dejaría la trampa armada para el próximo efecto que se le agregue al contenedor.

## `components/GraficoBarras.tsx`: el gráfico de barras, uno solo

El mismo gráfico estaba escrito cuatro veces (Dashboard y Reportes del admin, Panel y Métricas del instructor) y las cuatro copias compartían el defecto: **barras sin eje Y y sin valores**, que no se pueden leer. Hoy las cuatro usan este componente, que pone eje Y con marcas enteras (el tope se redondea a un múltiplo de 4), el valor debajo de cada barra, tooltip con el detalle, y deja un hilo visible en las barras en cero. **Las etiquetas tienen que significar algo** — una fecha, un mes, un día —, nunca un índice: `S1`…`S8` en Reportes era justamente eso.

## `lib/exportCsv.ts` y `lib/exportPdf.ts`: exportación sin dependencias

`exportarPdf({titulo, subtitulo, meta, columnas, filas, pie})` abre una ventana nueva con un documento HTML propio y dispara el diálogo de impresión, donde "Guardar como PDF" es el destino por defecto. Por qué así:

- **No una librería (jsPDF / pdfmake):** lo que se exporta son tablas largas que hay que paginar, con encabezado repetido por hoja y acentos. El motor de impresión del navegador hace las tres cosas gratis.
- **No `window.print()` sobre la pantalla:** imprimiría el sidebar, los filtros y los botones, y obligaría a mantener una hoja `@media print` en paralelo al diseño.
- **El `window.open` va dentro del handler del click.** Disparado desde un `setTimeout` o un `.then()` lo corta el bloqueador de pop-ups; la función devuelve `false` en ese caso y la pantalla muestra el aviso.
- **El documento se entrega como Blob, NO con `document.write`.** Con `window.open("")` + `document.write` la ventana se queda en `about:blank` y su evento `load` **ya se disparó** antes de que escribiéramos nada, así que el `onload` que llamaba a `print()` no corría nunca: ventana en blanco y sin diálogo de impresión. Con un Blob la ventana carga un documento real y la llamada a `print()` viaja **dentro** del HTML.
- **El gráfico se puede incluir** (`grafico`): se dibuja con divs y CSS, no como imagen. Un `<canvas>` rasterizado sale borroso al imprimir; con barras de CSS el PDF queda vectorial. Lleva el valor escrito sobre cada barra y escala a la izquierda, porque un gráfico impreso no tiene tooltip. Lo usan Reportes y Métricas; el CSV, que no puede llevar imagen, incluye la serie como filas.
- **Los fondos hay que pedirlos: `print-color-adjust: exact`.** Los navegadores imprimen sin fondos por defecto, así que del gráfico del PDF de Reportes se veían los ejes, las líneas y las etiquetas (texto y bordes) pero **las barras del centro salían en blanco**, igual que el encabezado gris de la tabla. La declaración va en el selector `*` de la hoja del documento —Chrome la aplica por elemento, no se hereda— y las barras además llevan `border` como plan B por si alguien imprime con "Gráficos de fondo" desactivado a mano.
- Todo el texto se escapa antes de interpolarse: el contenido viene de datos que escribieron usuarios. **`escapar` acepta `null`/`undefined`**: un `null.replace` tiraba una excepción y la pestaña quedaba en blanco sin error visible (Trazabilidad, filas sin `entidadId`).
- **El HTML se arma ANTES del `window.open`.** Si el armado falla, la excepción sale sin dejar una ventana colgada; sigue siendo síncrono dentro del click, así que la activación de usuario no se pierde. La pantalla que llama envuelve `exportarPdf` en `try/catch` y muestra el error. Prueba: `lib/exportPdf.test.ts`.

## `admin/Perfil.tsx`: el administrador también tiene cuenta propia

`/admin/perfil`, ítem "Mi perfil" al final del sidebar de admin (key `perfilAdmin` en `lib/areas.ts`, **sin `requiere`**: son los datos de la propia cuenta, no un módulo, y va último para que nunca sea el aterrizaje de nadie).

Antes el administrador era el único de los tres roles sin pantalla de cuenta propia: podía editar el nombre, el correo y el teléfono de **cualquier otro** usuario desde Gestión, pero no los suyos. Usa `actualizarMiPerfil` / `cambiarMiContrasenia` de `AuthContext` —no `actualizarUsuarioAdmin`, que apunta a un id ajeno—, que son las que refrescan `currentUser`, así que el nombre y el avatar del sidebar se actualizan solos al guardar.

**No tiene "dar de baja mi cuenta"**, a diferencia del alumno: un administrador que se borra a sí mismo puede dejar la plataforma sin nadie que la administre. Esas bajas se hacen desde Gestión, con otra cuenta.

## Pantallas del instructor: lo que cambió en este tramo

- **`instructor/Perfil.tsx` es nuevo** (`/instructor/perfil`, ítem "Mi perfil" en el sidebar). El instructor no tenía dónde cambiar su nombre, su teléfono ni su contraseña: "Mis datos" (`Solicitud.tsx`) es otra cosa —el estado de su verificación y la documentación— y su formulario sólo aparecía mientras la solicitud estaba en revisión.
- **La foto se sube sólo desde ahí.** El `Avatar` del `DashSidebar` perdió su `onUpload`: un avatar es identidad, no un control, y estando en todas las pantallas se abría el explorador de archivos sin querer. Es la regla que ya seguía el alumno.
- **Métricas exporta** a PDF y a CSV, con los helpers compartidos. Antes la única forma de sacar esos números era copiarlos a mano.
- **El Historial vuelve a ser clickeable (2026-10-16), pero en modo consulta.** Cada fila abre `/instructor/clases/:id?desde=historial`, la MISMA pantalla `GestionClase` de "Mis actividades": quiénes se inscribieron, qué pagó cada uno y qué pasó con ese pago. Con la clase Finalizada o Cancelada la pantalla es de **sólo lectura** (`soloLectura`): sin "Editar", "Cancelar clase", "Notificar ausencia" ni "Confirmar cobro", con un cartel que lo explica, y "Volver al historial". Cada fila sigue mostrando la **ganancia** (precio de la clase × inscriptos; `$0` si se canceló), que sale de `MiClaseInstructor.precio`.
  - **`GestionClase` ya no depende sólo de `data.clases`.** Esa caché excluye Finalizadas y Canceladas y sólo se llena visitando el detalle de la actividad, así que la pantalla rebotaba a "Mis actividades". Si la clase no está ahí, la busca en `listarMisClases()`. Lo mismo arregla entrar desde Próximas clases o el Panel sin haber pasado por la actividad.
  - El roster de una clase **Cancelada** trae también las inscripciones canceladas (cambio del backend en `listarrosterclase`): si no, se veía vacío.
- **El formulario de clase pide sólo fecha y hora de inicio.** La hora de fin se calcula con `actividad.duracionMin` y se muestra como texto al lado. El backend hace lo mismo: `horaFin` ya no viaja en el request.
- **Una clase congelada no ofrece "Editar"**, muestra un chip "Congelada" con el motivo. Espejo de `VentanaInscripcion.estaCongelada`; el backend es quien lo hace cumplir.
- **Se sacó la pasarela de 4 pasos** del alta/edición de actividad. No es un asistente: es un formulario de una página con todos los campos visibles, y los números marcaban un avance que nunca avanzaba.

## Reseñas del admin: un solo listado, y qué significa "Ocultar"

La pestaña Reseñas de `admin/Gestion.tsx` es **un solo listado, "Reseñas publicadas"**, con "Ocultar" por fila. La sub-pestaña "Pendientes de moderación" (Aprobar / Rechazar) se retiró con V33: las reseñas se publican al crearse. Un texto bajo el título lo dice: *"Las reseñas se publican en el momento en que el alumno las crea. Las que denuncia un instructor se resuelven en la pestaña "Reclamos"."*

- **"Ocultar" no borra.** Pide motivo obligatorio y baja la reseña del detalle público y del promedio, pero la fila queda con su autor y su texto — si el contenido llega a ser algo en lo que deba intervenir la justicia, esa es justamente la evidencia. Las ya ocultas se siguen listando, en gris y tachadas, con un chip "Oculta".
- **Se mantiene a propósito** aunque exista el camino de la denuncia (decisión del usuario): si se publica algo impropio y el instructor no lo denuncia, el admin que lo ve no tendría ningún botón.

## Resolver una denuncia: las cuatro opciones están descritas en pantalla

`ETIQUETA_ACCION`, `DESCRIPCION_ACCION` y `ACCIONES_POR_TIPO` viven en **`lib/denuncias.ts`** (antes estaban sólo en `admin/Gestion.tsx`) y los usan las dos pantallas que resuelven. **Describen lo que el backend hace**, no lo que uno supondría. Aparecen en el panel plegable "¿Qué hace cada resolución?" de Reclamos, el `title` de cada botón (en las dos pantallas) y el modal de Suspender. La descripción de "Reintegrar" decía "alcanza sólo a esa persona", que era falso desde que el backend reintegra a toda la clase: se corrigió al moverla.

- **Reintegrar el pago** — cancela la inscripción y devuelve el pago a **todos los inscriptos de la clase**, no sólo a quien denunció.
- **Suspender al instructor** — lo inhabilita N días (mín. 15) + multa opcional, cancela sus clases del período y reintegra a esos inscriptos.
- **Aplicar penalización económica** — sólo multa + historial. No inhabilita, no cancela clases, no devuelve pagos. (Se llamaba "Penalizar al instructor", que no distinguía de Suspender.)
- **Desestimar** — cierra el caso sin consecuencias.
- **Ocultar la reseña** — sólo para denuncias de tipo `RESENIA`.

Si cambia el comportamiento del backend, cambian estos textos.

## "Roles y permisos" son dos preguntas, y ahora dos secciones

`admin/Roles.tsx` tiene dos pestañas:

- **Roles y permisos** — "qué puede hacer este ROL". Se edita el rol y el cambio alcanza a todos los que lo tengan.
- **Roles de los usuarios** — "qué rol tiene esta PERSONA". Se elige un usuario, se ve su rol actual y se le asigna otro; no se toca ningún permiso.

Lo segundo ya existía pero **sólo escondido en el modal de edición de `admin/Gestion.tsx`**, que es la pantalla de datos personales: para cambiarle el rol a alguien había que entrar a editar su nombre y su teléfono. Sigue ahí (es parte del flujo "editar usuario"), pero ahora también está donde uno lo busca.

Dos detalles: la pestaña de usuarios **sólo aparece con `usuarios.gestionar`** (el listado de personas es de ese módulo, y alguien puede tener `roles.configurar` sin él), y **no te podés cambiar el rol a vos mismo** — el selector se deshabilita con el motivo, espejo de la guarda del backend.

## "Recomendado para vos": lo calcula el BACKEND, no la pantalla

El bloque del Home dejó de ser un `useMemo` sobre el catálogo y pasa por `GET /api/alumno/recomendaciones` (`listarRecomendaciones` del `DataContext`). Lo que había antes y por qué se fue:

```ts
// ANTES — no puntuaba, no ordenaba, y rellenaba hasta tres con cualquier cosa
const matched = actividades.filter((a) => tiposElegidos.has(a.tipoActividadId));
return [...matched, ...rest].slice(0, 3);
```

Tres reglas al tocar esta sección:

- **No reordenar ni recortar del lado del cliente.** La lista viene ya ordenada por puntaje; el `limite` va como parámetro. Ordenar acá rompe el trabajo del motor y desincroniza el orden de los motivos.
- **`sinSenales` es un estado propio y no "lista vacía".** Significa que el alumno no declaró intereses y no tiene historial: se muestra la invitación a cargar intereses (botón **"Cargar mis intereses"** → `/alumno/perfil`), no actividades cualquiera. Son **cuatro** estados en total: cargando, error con Reintentar, `sinSenales`, y lista vacía con señales (nada encaja).
- **Los motivos se muestran, y salen del backend.** Cada tarjeta lleva debajo hasta dos chips ("Coincide con tu interés en Yoga", "A 1,2 km tuyo"). No escribirlos acá: el motor los arma mientras puntúa, así que son la explicación real del orden.

Se vuelve a pedir cuando llegan las coordenadas de `useGeolocation`, porque la cercanía es parte del puntaje; sin permiso de ubicación simplemente no participa. Y ojo con el patrón de carga: `cargarRecomendaciones` **no** hace `setCargando(true)` de forma síncrona (es `react-hooks/set-state-in-effect`) — el flag arranca en `true` y sólo el botón "Reintentar", que es un evento, lo vuelve a prender.

### Las dos señales que manda el cliente

`registrarInteraccion(tipo, datos)` (`POST /api/alumno/interacciones`) alimenta al motor con lo que el backend no puede deducir solo. **Nunca lanza**: se traga el error, porque es telemetría de producto y no puede romper una navegación.

- **`VISTA_ACTIVIDAD`** en `alumno/Detalle.tsx`, sólo con sesión (esa pantalla también la ve el público).
- **`BUSQUEDA`** en `alumno/Explorar.tsx`, **con un retardo de 1 segundo**. El filtrado de esa pantalla es instantáneo y no tiene botón de buscar: sin esperar se registrarían "y", "yo", "yog", "yoga" como cuatro búsquedas. El backend además ignora términos de menos de 3 caracteres y deduplica lo repetido dentro de 10 minutos.

El resto de las señales (inscripciones, favoritos, reseñas, intereses) ya están en la base y el backend las lee solo: **no hay que registrarlas desde el cliente**.

**La Landing pública no cambió** y no debe cambiar: sin sesión no hay a quién recomendarle nada. Sigue mostrando el catálogo y las seis mejor calificadas.

## Home del alumno (E3A-HU01)

**Fondo del buscador (2026-10-24):** el recuadro del saludo y el buscador tiene una foto de fondo, `public/home-hero.webp` (2000×668, 117 KB, provista por el usuario), anclada a la derecha (las personas y el sol), con `#0E2A47` mientras carga. Encima va un velo con los azules de la marca, **`.ah-home-hero-velo` en `index.css`**: denso a la izquierda, donde está el texto, y casi transparente a la derecha; por debajo de 820 px pasa a ser parejo, porque ahí el texto ocupa todo el ancho. Va como fondo CSS y no como `<img>` porque es decorativa. Si se cambia la foto, mantener el peso bajo (es lo primero que ve el alumno) y revisar la legibilidad en los dos anchos. Se sacaron las dos manchas de color decorativas que tenía el degradé anterior. La fecha del saludo sale de `fechaSaludo()` (`lib/mockData.ts`): sólo la primera letra en mayúscula ("Sábado, 24 de octubre"); con `text-transform:capitalize` salía "24 De Octubre".

**Buscador en celular (2026-10-24):** por debajo de 560 px la barra se reacomoda en dos filas — el campo de texto arriba, a todo el ancho, y "Cerca tuyo · 5 km" con "Buscar" abajo — y el recuadro baja su relleno de 34/38 px a 24/18 px. En una sola fila el campo quedaba reducido a una letra y "Buscar" se salía del recuadro blanco. Las reglas están en `index.css` (`.ah-home-hero`, `.ah-buscador`, `.ah-buscador-texto`, `.ah-buscador-separador`) con `!important` para pisar los estilos en línea, como el resto de ese archivo. Los hijos de la barra llevan `min-width:0` para poder achicarse dentro del flex. jsdom no aplica media queries: si se toca, verificarlo en el navegador a 375 px.

**Filtros rápidos: quedan tres (2026-10-24).** `FILTROS_RAPIDOS` tenía siete (criterio 1 de E3A-HU01): quedan **Categoría, Nivel y Precio** (decisión del usuario). Se sacaron Tipo (se superponía con Categoría y era una lista larga), Ubicación (duplicaba "Cerca tuyo · 5 km" del buscador y la sección "Cerca de tu ubicación"), y Fecha y Horario (sólo miran la próxima clase de cada actividad: prometían más de lo que hacían). Siguen todos en Explorar. **Precio** ofrece montos redondos de una escala fija, sólo los que separan el catálogo (incluyen alguna actividad y dejan afuera otra), hasta tres: `cortesDePrecio` en `lib/precios.ts`. Antes eran cortes al 25/50/75 % del precio máximo, que salían como "Hasta $9.500". Lo cubren `lib/precios.test.ts` y `Home.test.tsx`. Es un cambio al criterio 1 de E3A-HU01: está registrado en las bitácoras para el informe.

**Secciones de actividades: hasta 6 en una fila deslizable (2026-10-24).** "Recomendado para vos", "Cerca de tu ubicación" y "Próximas clases disponibles" muestran hasta `POR_SECCION` (6) actividades —antes 3— en `components/Carrusel.tsx`: 3 visibles en escritorio y flechas que avanzan de a una "página" (`scrollBy` del ancho visible), cada una visible sólo si hay algo hacia ese lado (se mide en el `onScroll` y con un `ResizeObserver`, nunca de forma síncrona en el efecto). Por debajo de 820 px no hay flechas: se desliza con el dedo y se asoma la tarjeta siguiente (78 % de ancho). El desplazamiento es nativo (`overflow-x` + `scroll-snap`), así que anda con trackpad y teclado (la fila es una región con nombre y `tabIndex`). Estilos en `index.css` (`.ah-carrusel`, `.ah-carrusel-item`, `.ah-carrusel-flecha`). Las recomendaciones se piden con `limite=6` (el backend acepta hasta 20). Lo cubren `Carrusel.test.tsx` (simula las medidas, que jsdom no calcula) y `Home.test.tsx`.

**Banner de Explorar con foto (2026-10-24):** el mismo criterio para `alumno/Explorar.tsx`: `public/explorar-hero.webp` (1024×434, 70 KB, provista por el usuario) como fondo CSS a todo el ancho, encuadrada con `background-position:center 65%` para que se vean el grupo y las pesas, y el velo `.ah-explorar-hero-velo` de `index.css` (denso a la izquierda, parejo por debajo de 820 px). Como el banner ocupa todo el ancho de la pantalla, en monitores grandes la foto se estira casi al doble; si se ve blanda, conseguir una versión de ~2000 px.

**El desplegable del buscador se cortaba** (2026-10-16): la tarjeta del saludo tenía `overflow:hidden` para recortar sus dos círculos de fondo, y eso recortaba también los resultados, que caen por debajo de la tarjeta — se veía el primero y el resto quedaba "debajo" de lo que sigue. El recorte pasó a una capa propia de los círculos (`inset:0;overflow:hidden;pointer-events:none`), la tarjeta lleva `z-index:5` y el desplegable tiene `max-height` con scroll. **No vuelvas a poner `overflow:hidden` en un contenedor que tenga un desplegable adentro.**

Ya cubre los criterios que faltaban: **fila de 7 filtros rápidos** (Categoría · Tipo · Nivel · Ubicación · Fecha · Horario · Precio) que no filtran en el Home sino que navegan a Explorar con la intención ya elegida (`location.state`); **buscador con resultados desplegables** debajo del campo, con "Ingresá al menos 2 caracteres" y "No se encontraron actividades con esos criterios"; **estado vacío** de "Recomendado para vos" con botón "Explorar actividades"; y **banner "No se pudo cargar el inicio" con Reintentar**, alimentado por `errorCatalogo`/`refrescarCatalogo` del `DataContext` (antes el catálogo fallaba en silencio y se veía igual que una plataforma sin actividades).

Para que Fecha y Horario existan de verdad, `Explorar.tsx` ganó esos dos filtros (sobre la próxima clase de cada actividad, en hora local) y su nav-state acepta `tipoActividadId`, `nivel`, `maxPrecio`, `fecha` y `franja`.

## Intereses del alumno: son tipos de actividad, no texto

Desde la migración V19 del backend, un interés **es** un `TipoActividad` del catálogo: el tipo `InteresAlumno` es `{tipoActividadId, nombre, categoriaId, categoria}`.

- El selector del Perfil se arma con `data.tiposActividad` **agrupado por categoría** (`<optgroup>`), no con una lista fija. La constante `INTERESES` de `mockData.ts` se borró.
- Los chips muestran "Trekking · Aventura", así se ve la relación.
- El registro (`Registro.tsx`) elige los mismos tipos y manda **ids**.
- **"Recomendado para vos" cruza por id**, no por texto: `tiposElegidos.has(a.tipoActividadId)`. Antes comparaba el interés contra el nombre de la actividad, lo que daba falsos positivos y se perdía las que no repetían la palabra.
- Los `perfilesAlumno` de `mockData.ts` quedaron con `intereses: []`: ese archivo no puede inventar ids que existan en la base.

## Intereses del alumno: cómo se guardan

`AuthContext.actualizarMisIntereses(intereses)` pega a `PUT /api/usuarios/me/intereses` y refleja el resultado en `currentUser`. `Perfil.tsx` los edita contra la API (con su propio mensaje de error) y `Home.tsx` los usa para "Recomendado para vos". El `updateUsuario` mock ya no participa.

## Ya no queda dataset mock en `DataContext`

Se borraron `inscripciones`, `pagos`, `penalizaciones` y `aplicarPenalizacion` (con su persistencia en `localStorage`), y también los arrays correspondientes de `lib/mockData.ts`. Las dos pantallas que los leían pasaron a la API: el "Historial de actividades" de `Perfil.tsx` usa `listarMisInscripciones()` y el KPI de penalizaciones de `Reportes.tsx` usa `listarPenalizaciones()`. De `mockData.ts` quedan el catálogo de demo, el directorio de usuarios que usa `AuthContext` y **los helpers de formato de fecha/hora**, que se siguen usando en todas las pantallas.

## Typecheck: `tsc -b`, nunca `tsc --noEmit` a secas

El `tsconfig.json` de la raíz es sólo un archivo de referencias (`"files": []`), así que **`npx tsc --noEmit` no chequea nada y sale en verde con el proyecto roto**. Usar `npx tsc -b` (o `npm run build`, que lo corre), o apuntar explícitamente: `npx tsc -p tsconfig.app.json --noEmit`.

## Lint: cero errores, y cómo mantenerlo

El repo estaba con 38 errores de base; hoy `npx eslint src` da **0 errores y 12 warnings**. Los 12 son: 11 de `react-hooks/exhaustive-deps` por dependencias omitidas a propósito (casi todas el objeto `data` del context, que cambia de identidad en cada render y volvería a disparar la carga en bucle) y 1 directiva `eslint-disable` sobrante. **Ninguno es un error de comportamiento**; si agregás una dependencia omitida, verificá que no reintroduzcas el bucle de recarga. Dos patrones que hay que respetar para que no vuelvan los errores:

- **`react-hooks/set-state-in-effect`:** la función `cargar` de una pantalla **no toca estado de forma síncrona**. El "limpiar el error" va dentro del `.then(...)` y el "prender el spinner" arranca en `useState(true)` o lo hace el handler del botón "Reintentar" (un evento sí puede). Ojo: con `async/await` la regla igual se queja — el setState tiene que estar dentro de un callback (`.then`/`.catch`/`.finally`), por eso `refrescarCatalogo` y el `cargar` de Roles están escritos como cadena de promesas.
  - **Un valor por defecto que sale de otro estado se DERIVA, no se sincroniza con un efecto.** `CrearActividad.tsx` preseleccionaba el primer nivel de intensidad con un `useEffect` que llamaba al setter cuando el catálogo terminaba de llegar: era el único error de esta regla que quedaba en el repo. El catálogo no es un sistema externo que haya que espejar —es estado de React que ya está a mano—, así que hoy el estado guarda **sólo la elección explícita** del usuario (`nivelElegido`) y el valor efectivo es una expresión: `nivelElegido || data.nivelesIntensidad[0]?.id || ""`. De paso se cerró un hueco real: con el efecto, si el catálogo ya estaba cargado, el formulario se pintaba una vez **sin ningún nivel marcado** antes de que el efecto corriera. **El `eslint-disable` es para sincronizar con algo externo de verdad (la geolocalización, el mapa), no para un default que se puede calcular.**
- **`react-hooks/purity`:** nada de `Date.now()` durante el render. Para "faltan X días" / "ya pasó" se usa el hook `lib/ahora.ts` (`useAhora()`), que congela el reloj al montar. En un handler (submit, click) `Date.now()` está bien.
- **`react-hooks/preserve-manual-memoization`:** el error dice "Compilation Skipped" y apunta a un `useMemo` que en realidad está bien — el culpable suele ser **otro**. Dos causas vistas en `admin/Reportes.tsx`: un `useMemo` leído desde un closure declarado **antes** que él (mover la función abajo lo arregla), y un segundo `useMemo` que devuelve objetos literales desde un `switch` (si el cálculo es barato, sacarle el `useMemo` y dejarlo como `const x = (() => { … })()`: el compilador memoiza solo).

Donde el efecto sincroniza con algo externo de verdad (la navegación en Explorar, la geolocalización en CrearActividad, el mapa de Leaflet, la actividad por defecto en Reseñas del instructor) va un `eslint-disable` **de bloque** con el motivo escrito.

### El workflow de CI existe pero NO está en la rama de integración

`.github/workflows/eslint.yml` corre `npm ci` + `npm run lint` en cada push y PR contra `main` y `develop`, sube el reporte como artefacto y **falla el job si hay errores**. Se escribió y se verificó corriendo en GitHub Actions (commits `1d9a723` y `75eebe2`), pero vive sólo en `origin/FabriVersion2`: **no está ni en `main` ni en `integracion`**, así que hoy no se ejecuta sobre nada.

Consecuencia práctica: **no asumas que el lint lo valida el CI.** Corré `npx eslint src` y `npx tsc -b` a mano antes de dar un cambio por terminado. Antes del cierre de la etapa hay que recuperar ese archivo en la rama de integración (y ajustar los nombres de rama del `on:` si el modelo de ramas queda como está — ver la nota de versionado del informe).

## Foto de perfil: solo desde Perfil, y en modo edición

El avatar de `AlumnoNav` **no** sube foto: es identidad, no un control. El único punto de subida para el alumno es el avatar de `alumno/Perfil.tsx`, y solo cuando está en modo edición (`onUpload` se pasa condicionado a `editando`). El `Avatar` de `DashSidebar` **ya no sube foto** (perdió su `onUpload`): instructor y admin tienen ahora su propia pantalla de perfil (`instructor/Perfil.tsx`, `admin/Perfil.tsx`) y ése es el único punto de subida de los tres roles.

## Penalizaciones: los dos tipos son combinables y la suspensión pide plazo

- El formulario de `admin/Penalizaciones.tsx` pasó de un `select` excluyente a **dos checkboxes**: se puede multar y suspender en la misma sanción. Se manda `tipos: [...]` y el backend guarda una penalización por cada tipo.
- **Entre 15 y 365 días** de suspensión y **multa entre $1.000 y $500.000**, validado en el cliente (`lib/limites.ts`: `errorDiasSuspension`, `errorMulta`) y en el servidor (`VentanaPenalizacion`). El `<input type="date">` de "Fecha fin" lleva `min`/`max` calculados desde "Fecha inicio", así el calendario ni ofrece una fecha fuera de rango.
- El listado muestra monto, vigencia y **cuántos días dura**, y viene ordenado de la más antigua a la más reciente.
- **"Suspender al instructor" ya no se resuelve con un `prompt`**: abre un modal que pide días (mínimo 15) y monto de multa (puede ser 0 = solo suspensión). Eso viaja como `resolverDenuncia(id, "SUSPENDER", detalle, { montoMulta, diasSuspension })`.

## El precio es de la CLASE, no de la actividad

`Clase.precio` (V23 del backend) existía en la base y en un solo endpoint; ahora viaja en **todos** los DTO de clase y las pantallas lo usan. La regla, que vale para cualquier pantalla nueva:

> **`actividad.precio` es el precio de lista del catálogo. En cuanto hay una clase concreta en pantalla, el importe es `clase.precio`.**

Por qué importa: una clase con al menos un inscripto queda **congelada** y un cambio de precio de la actividad no la alcanza (`actualizaractividad` sólo propaga a las no congeladas). Mientras las pantallas leían `actividad.precio`, el resumen de inscripción prometía un importe y `inscribirse` cobraba otro — y el que aparecía después en "Mis pagos" era el tercero en discordia.

Dónde quedó aplicado:
- **Alumno** — `Detalle.tsx` (el panel de reserva usa `selectedClase?.precio`, y cae al de la actividad sólo cuando todavía no hay fecha elegida), `Inscripcion.tsx` (botón de pago, instrucciones de efectivo, subtotal y total), `PreInscripcion.tsx` (sigue diciendo "estimado": una clase sin inscriptos no está congelada y todavía puede cambiar), `Calendario.tsx` (muestra **`item.pago.monto`**, lo que esa persona pagó de verdad; el precio de lista sólo cuando es una preinscripción que no cobró nada).
- **Instructor** — `ActividadDetalle.tsx` tiene ahora una columna **Precio** por clase en la grilla (en ámbar, con `title`, cuando difiere del de la actividad: es la señal visible de que esa clase quedó congelada), y `GestionClase.tsx` muestra el de la clase aclarando a cuánto figura hoy la actividad si no coinciden. `HistorialClases.tsx` ya lo hacía.
- **Admin** — `ClaseAdmin` y `ClaseInstructorAdmin` lo traen. El listado de actividades de `Gestion.tsx` sigue mostrando `act.precio`, que ahí es lo correcto: es el precio de lista de la actividad, no el de una clase.

`lib/types.ts` → `Clase.precio` es obligatorio, así que cualquier objeto `Clase` que se construya (incluido el catálogo de demo de `mockData.ts`) tiene que setearlo.

## Convención de lenguaje: nunca "Reserva"

La spec: *«Se dice "PreInscripción", nunca "Reserva"»*. El barrido dejó **cero ocurrencias** de la raíz `reserv` en `src/`. Lo que cambió y hay que respetar:
- `pages/alumno/Reserva.tsx` → **`PreInscripcion.tsx`**, ruta `/alumno/preinscripcion/:id` (antes `/alumno/reserva/:id`).
- La key de nav `misreservas` → **`misclases`** (`AlumnoNav` + las 4 pantallas que la usan).
- En métricas y reportes, "Reservas" era el conteo de inscripciones: ahora dice **"Inscripciones"**, y los identificadores acompañan (`totalInscripciones`, `inscripcionesPorActividad`).

## Política de contraseña: mayúscula obligatoria

`passwordStrength` de `AuthContext` exige 8 caracteres, una **mayúscula** y un número, igual que la regex del backend (`^(?=.*[A-Z])(?=.*\d).{8,}$`). Antes alcanzaba con "una letra", así que `password1` pasaba las dos validaciones. Si tocás una de las dos, tocá la otra: el criterio está duplicado a propósito para dar feedback inmediato en el formulario.

## Borrar actividad: NO borres las clases primero

`ActividadDetalle.eliminarActividad` llama **sólo** a `eliminarActividad(id)`. El backend hace toda la cascada en una transacción: cancela las clases, cancela las inscripciones, reintegra los pagos `Retenido` y notifica a cada alumno.

Antes esa función recorría las clases llamando a `eliminarClase` una por una y recién después borraba la actividad. Como `eliminarClase` es una baja lógica pelada y `Clase` tiene `@SQLRestriction("deleted = false")`, para cuando corría la cascada la consulta de clases ya devolvía vacío: **no se reintegraba ni un peso**. Y el mismo botón desde "Mis actividades", que nunca tuvo el loop, sí funcionaba bien — la misma acción daba resultados opuestos según la pantalla.

El botón "Eliminar" de cada clase de la grilla ahora sólo se muestra si `cuposOcupados === 0`; el backend igual rechaza con 409 `CLASE_CON_INSCRIPTOS` si hay alguien anotado.

## Pantallas del instructor: usar `listarMisClases` / `listarInscripcionesMisClases`

Existen dos funciones del `DataContext` que pegan a endpoints propios del instructor:

- `listarMisClases()` → `GET /api/instructor/clases`. Devuelve **todas** sus clases, incluidas Finalizadas y Canceladas, con `actividadNombre` y `actividadUbicacion` ya resueltos.
- `listarInscripcionesMisClases()` → `GET /api/instructor/inscripciones`. Devuelve las inscripciones a sus clases con alumno, estado, `createdAt` y datos del pago.

**Panel, Próximas clases, Métricas e Historial ya usan estas dos.** Ninguna pantalla del instructor debería volver a derivar sus datos de `DataContext.clases` (caché parcial) ni de `DataContext.inscripciones`/`pagos` (mock): esa combinación hacía que el panel y las métricas mostraran cero al entrar por login, porque además los ids del mock (`act-running-c0`) nunca podían cruzarse con los UUID reales.

Cada una de esas pantallas tiene ahora su estado de error con botón "Reintentar"; seguí ese patrón al agregar otra.

## Pantalla de Historial de clases (instructor)

`pages/instructor/HistorialClases.tsx`, ruta `/instructor/historial`, ítem "Historial" en el sidebar. Muestra las clases Finalizadas y Canceladas, más recientes primero, con filtro por estado y **por actividad** (`components/FiltroActividad`; los contadores de estado se calculan sobre la actividad elegida). "Próximas clases" tiene el mismo selector. Las opciones salen de las clases cargadas, no del catálogo: una actividad eliminada no está en el catálogo pero sí en el historial.

Existe porque el instructor no tenía dónde ver sus clases pasadas: "Próximas clases" sólo lista futuras y el detalle de actividad las excluye a propósito (`ObtenerActividadService.ESTADOS_EXCLUIDOS`), así que una clase dictada desaparecía de su vista.

## Trampa recurrente: `DataContext.clases` NO es una lista completa
`clases: Clase[]` en el Context se llena **solo cuando se visita el detalle de una actividad** (`cargarDetalleActividad`), es una caché parcial por navegación, no un `GET /api/clases` global (ese endpoint no existe para el catálogo del alumno). Usarla como si fuera la lista completa de clases de la plataforma es un bug real que ya pasó dos veces (el donut de categorías del Dashboard, y estuvo cerca de repetirse en Reportes). Si necesitás **todas** las clases de la plataforma, es `listarClasesAdmin()` (admin) — no `clases` del Context.

## Trampa recurrente: dependencias de `useMemo`/`useCallback` incompletas

**Caso real (2026-10-23):** la lista filtrada de `alumno/Explorar.tsx` no tenía `fecha` ni `franja` en sus dependencias, así que elegir una fecha o un horario no volvía a filtrar hasta tocar otro filtro; además "Limpiar" no los reseteaba. Lo fija `Explorar.test.tsx`. Ojo al probar algo así: si el mock del contexto devuelve funciones nuevas en cada render, las dependencias cambian siempre y la prueba pasa aunque el bug siga ahí — el mock tiene que dar valores estables, como el `DataContext` real.
Ya pasó dos veces en este repo (el donut del Dashboard y las tarjetas de categoría en `Taxonomia.tsx`): un `useMemo` usa una variable de estado dentro del cuerpo pero no la lista en el array de dependencias, entonces React no recalcula cuando esa variable cambia — la llamada a la API funciona pero la pantalla se queda con datos viejos hasta que *otra* dependencia fuerce un recálculo. Si agregás un campo a un `useMemo`/`useCallback` ya existente, revisá el array de deps de una.

## Registro de instructor: los documentos van en el MISMO request

`registerInstructor(input, documentos)` de `AuthContext` manda un **multipart** (`api.postForm`) con la parte `datos` (Blob JSON) y una parte `documentos` por archivo. No existe más el flujo viejo de "creo la cuenta y después subo los archivos de a uno": ese flujo dejaba la cuenta creada aunque fallaran las subidas, que es justo lo que E1A-HU04 criterio 9 (RN-12) prohíbe.

Consecuencias al tocar `Registro.tsx`:
- La documentación es **obligatoria** para el rol INSTRUCTOR: `validate()` agrega el error `documentos` si `archivos.length === 0`.
- Si el backend rechaza el alta (formato, tamaño, disco), **no se creó ninguna cuenta** y el mensaje llega por `ApiError`. No hay que "compensar" nada del lado del cliente.
- El límite por archivo es 5 MB y ahora el backend lo acompaña (antes el server cortaba en 1 MB por el default de Spring y la pantalla prometía 5).

## Métricas del instructor: ingresos acreditados

El KPI de ingresos cuenta **solo** pagos `Liberado` o `Efectivo` (E2I-HU10 criterio 6), y muestra aparte cuánto queda `Retenido` pendiente de acreditación. Antes sumaba todo lo que no estuviera `Cancelado`, lo que inflaba el número e — sin querer — tapaba que en el backend ningún pago pasaba nunca a `Liberado`. Los dos arreglos van juntos: si tocás uno solo, el instructor pasa de ver ingresos inflados a ver cero.

Los datos ya son reales: la pantalla se alimenta de `listarMisClases()` y `listarInscripcionesMisClases()`, no de la sección mock del contexto.

## Sistema de notificaciones (campana)
`NotificationBell.tsx` es compartido por los 3 roles — ya está insertado en `AlumnoNav` (reemplazó un ícono decorativo que no hacía nada) y en `DashSidebar` (instructor/admin, con `variant="dark" align="left"` para que quede bien en el sidebar oscuro y no se salga de pantalla). Hace polling on-mount vía `listarNotificaciones()` y se re-lee al abrir el dropdown. Lleva un prop **`area`** obligatorio (`AlumnoNav` pasa `"alumno"`, `DashSidebar` pasa su `role`): sólo desempata a dónde lleva el click.

**El desplegable va en un portal a `document.body`** (2026-10-17), con `position:fixed` calculada contra el botón (`calcularPosicion`, recortada a la ventana, recalculada en scroll/resize) y z-index 1100/1101. Reportado: un gráfico quedaba por encima del menú. La campana del instructor y del admin vive en `DashSidebar`, que es `position:sticky` y crea su propio contexto de apilamiento: el z-index del menú sólo competía dentro del sidebar y el contenido de la derecha se pintaba encima. Es la misma trampa de los modales y del chatbot. **1100 y no 100** porque los controles de los mapas de Leaflet llegan a 1000. Se cierra con click afuera y con Escape. Prueba: `components/NotificationBell.test.tsx`.

### Cada notificación es clickeable y lleva al asunto

Antes eran texto muerto: "Nueva inscripción en la clase de Yoga del 12/03" y andá a buscarla. Hoy el backend guarda **el destino ya resuelto** (`destinoTipo` + `destinoId`, ver su CLAUDE.md) y acá se decide **la ruta**, que es lo único que el backend no puede saber: depende de con qué permisos mira quien recibió el aviso. El mismo `CLASE` es "Mis clases" para el alumno y el roster para el instructor.

**`lib/notificaciones.ts` — `rutaNotificacion(n, areaActual, permisos)`** es la única fuente de ese mapeo. Reglas, todas heredadas de `lib/areas.ts`:

- **Se elige por permiso, no por rol** (RN-19). Cada candidata declara el suyo y se toma la primera habilitada.
- **Hay que pasar las DOS guardas de ruta de `App.tsx`**: `puedeEntrarA(area)` *y* `cumple(requiere)`. Con sólo la segunda, un administrador que no es alumno clickeaba una notificación de actividad y `RequireArea` lo rebotaba al home.
- **El área desde la que se abrió la campana sólo ordena los candidatos, no los limita.** Un usuario con permisos de alumno y de instructor recibe notificaciones de las dos en la misma campana.
- **Sin destino (o sin ninguna pantalla a su alcance) la fila se muestra igual, pero sin link** — sin cursor, sin flecha. Un click que rebota al home es peor que ninguno. Eso cubre `NINGUNO` (una penalización, una actividad ya eliminada) y los casos de permisos parciales.

**`lib/resaltado.ts` — `useResaltado(parametro)`** es la otra mitad. Llevar a una lista de treinta filas sin decir cuál es no es haber llegado, así que las rutas de lista viajan con un parámetro (`?clase=`, `?inscripcion=`, `?resenia=`, `?denuncia=`) y la pantalla de destino marca y centra esa fila. El patrón en cada fila es siempre el mismo:

```tsx
const resaltado = useResaltado("resenia");
…
<div ref={resaltado.ref(r.id)} style={s("…" + (resaltado.activo(r.id) ? ESTILO_RESALTE : ""))}>
```

El resaltado **se apaga solo a los 4 s**: sirve para encontrar la fila al llegar, no para dejarla marcada mientras la persona sigue trabajando. Ya está aplicado en `alumno/MisClases` (por inscripción y por clase), `alumno/MisResenas`, `alumno/MisDenuncias` e `instructor/Resenas`. Esta última además **selecciona la actividad dueña de la reseña**: las reseñas cuelgan de una actividad y la pantalla muestra una sola por vez, así que el resaltado por sí solo no alcanzaba.

**Si agregás un disparador de notificación nuevo en el backend, ahora sí puede hacer falta tocar UI**: si su destino es un tipo nuevo, va una entrada en `CANDIDATAS`; si es una lista, la pantalla tiene que leer su parámetro con `useResaltado`.

De paso, `alumno/MisResenas.tsx` muestra ahora **la respuesta del instructor** y el chip "Oculta por un administrador" (se llamaba "Oculta por moderación" hasta V33). Ninguna de las dos se veía del lado del alumno (la respuesta sólo aparecía en la página pública de la actividad), así que las notificaciones `RESENIA_RESPONDIDA` y la de reseña ocultada aterrizaban en una fila idéntica al resto.

## Verificación E2E — patrón de instancia aislada
Para probar un cambio real contra el backend (no solo `tsc`), el patrón usado en toda la sesión es levantar una instancia aislada, **nunca tocar los procesos del usuario** en 8080/5173:
```bash
# backend aislado en 8091
PORT=8091 ADMIN_SEED_EMAIL=admin-e2e@activehub.test ADMIN_SEED_PASSWORD=AdminE2E123! \
  CORS_ALLOWED_ORIGINS="http://localhost:5173,http://localhost:5180" \
  ./mvnw spring-boot:run

# frontend aislado en 5180, apuntando al backend aislado
echo "VITE_API_URL=http://localhost:8091" > .env.local
npx vite --port 5180
```
Si el cambio es puramente de frontend (no tocaste backend), se puede ahorrar el paso de levantar un backend aislado y apuntar el Vite aislado directo al backend real del usuario en 8080 — **pero solo si ese backend ya tiene `5180` en su `CORS_ALLOWED_ORIGINS`**, si no vas a pegar contra un CORS bloqueado (ya pasó, perdés tiempo diagnosticando un error que no es el tuyo). Ante la duda, levantar el par aislado completo es más lento pero no falla nunca por esto.

Al terminar, siempre: `rm .env.local`, matar los procesos aislados por PID exacto (`netstat -ano | grep :8091`/`:5180`), y confirmar que los PIDs de 8080/5173 del usuario siguen siendo los mismos que al principio.

## Estado actual del roadmap (mismos ítems que `activehub-backend/CLAUDE.md`)

Ítems 2 a 7 completos (Denuncias, Gestión de usuarios, Auditoría consultable, Dashboard y Reportes reales, Notificar ausencia de profesor + sistema de notificaciones + favoritos reales, ABM de Categoría).

**Ítem 9 (geolocalización): HECHO**, con OpenStreetMap en lugar de Google Maps — ver la sección propia más abajo. **Ítem 10 (imágenes): la galería y las fotos funcionan**, y el backend ya puede guardar en Supabase Storage en lugar del disco. **No tocó ninguna pantalla**: el bucket es privado y los archivos se siguen sirviendo por `/api/fotos/...`, así que las URLs del frontend no cambian. Queda pendiente la optimización de imágenes (redimensionado/compresión).

Pendientes de verdad:
**Ítem 8 (recomendaciones): HECHO** — ver "Recomendado para vos" más arriba. El filtrado de Explorar sigue siendo tradicional a propósito (texto sin tildes, categoría, tipo en cascada, nivel, precio, fecha, franja horaria, rango de distancia, orden; el filtro "Solo con cupos" se retiró el 2026-10-23 porque sólo miraba la próxima clase de cada actividad): ahí el alumno busca algo concreto. Lo que se recomienda es el Home.
**Ítem 11 (IA real): HECHO y verificado contra Groq por API.** El chatbot responde con un modelo usando el manual de usuario como única fuente (`lib/ia.ts`) y el "Asistente de beneficios" pide su informe al backend. **El copy ahora sí promete IA** (etiqueta "IA" en el encabezado de la burbuja, "Responde según el manual de usuario"), y eso es correcto porque hay modelo detrás — con dos condiciones que hay que mantener: **cuando no está, las dos pantallas lo dicen** y vuelven a su comportamiento anterior; **cuando se agotó la cuota, avisan cuánto falta** en vez de quedarse en blanco. Lo único que falta del ítem es probarlo en el navegador (la clave ya está cargada en el backend del usuario).
- **12 — Mercado Pago real: HECHO.** Integrado y funcionando según el usuario (la integración y su prueba se hicieron en otra PC; ver "Pagos con Mercado Pago" y la matriz `docs/PRUEBAS-SANDBOX-MERCADOPAGO.md` del backend).
- **Deploy** (Vercel) — el build de producción sale limpio y la URL del backend es `VITE_API_URL`, pero no se desplegó.
**Recuperar contraseña: HECHO.** El enlace de `Login.tsx` lleva a `/recuperar-password` (`pages/auth/RecuperarPassword.tsx`) — ver la sección propia más arriba.

Redis quedó **descartado** (no diferido): el control de cupos se resolvió en la base.

### Qué sigue siendo mock (queda poco, y está acotado)
Los tres dashboards, los intereses del alumno, las listas de inscripciones/pagos/penalizaciones **y la Landing** ya son reales. Lo único mock que queda:
- `AuthContext.users` / `updateUsuario`: el "directorio" de usuarios en `localStorage`, que sobrevive porque la API no expone un listado público de personas. Las pantallas admin ya usan `listarUsuariosAdmin()`.
- El catálogo de demo de `lib/mockData.ts` (`actividades`, `clases`, `usuarios`, `perfiles*`), que alimenta ese directorio. Sus **helpers de formato** (`formatFecha`, `formatHora`, `disponibilidad`, `tipoIngreso`…) no son mock y se usan en todas las pantallas.

El "Asistente de beneficios" de `Detalle.tsx` **dejó de ser simulado**: ya no hay `setTimeout`, pide el informe al backend. Sus textos por nivel de intensidad quedaron como respaldo para cuando la IA no está disponible, y la pantalla avisa cuando está mostrando eso.

## Verificación visual
Para cualquier cambio de UI, levantar el preview (instancia aislada de arriba) y probarlo en el navegador — un `tsc` en verde no prueba que la pantalla funcione. Ver `<preview_tools>`/`<verification_workflow>` del sistema para el flujo completo (console errors, network requests, screenshot final).
