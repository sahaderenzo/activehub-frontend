# CLAUDE.md — ActiveHub Frontend (Vite + React)

Convenciones de este repositorio. Leer **antes** de escribir código. Repo hermano `activehub-api` (Spring Boot) es el único backend — su propio `CLAUDE.md` tiene el detalle de endpoints y reglas de negocio.

## Qué es
SPA de ActiveHub para los 3 roles (Alumno, Instructor, Administrador). React 19 + TypeScript + Vite, **sin librería de UI** (ni Tailwind ni Material, etc.) — todo con estilos inline vía el helper `s()` de `src/lib/style.ts`, que parsea un string CSS literal (`"display:flex;gap:10px;"`) a un objeto de React, cacheado. Se sigue así en todo el proyecto, no introducir una librería de estilos nueva a mitad de camino.

## Estructura
- `src/pages/<rol>/Pantalla.tsx` — una pantalla por archivo, sin sub-carpetas de componentes por pantalla.
- `src/components/` — compartidos entre pantallas (`DashLayout`/`DashSidebar` para instructor/admin, `AlumnoNav` para alumno, `NotificationBell`, `ActivityCard`, `StatusBadge`, `RequireArea`, `Logo`).
- `src/context/AuthContext.tsx` — sesión real (JWT en `localStorage`, login/logout/registro).
- `src/context/DataContext.tsx` — el context grande: catálogo + todas las funciones que llaman a la API real, más una sección explícita al final ("fuera de alcance: mock puro, sin tocar") para lo que sigue simulado. **Leer el comentario de esa sección antes de asumir que algo es mock o real** — se mantiene actualizado a mano.
- `src/lib/api.ts` — cliente HTTP (`api.get/post/put/delete<T>(path, body?)`), lanza `ApiError(code, message, status, fieldErrors)` en no-2xx.
- `src/lib/types.ts` — tipos de dominio compartidos.
- `src/lib/mockData.ts` — dataset mock (Mendoza-flavored) + helpers de formato de fecha/hora (`formatFecha`, `formatHora`, `diasHastaClase`, etc. — estos helpers son de formato, no de datos, y se siguen usando aunque la pantalla ya sea 100% real).

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

Estas cuatro funciones viven en **`AuthContext`** (no en `DataContext`) porque el resultado tiene que reflejarse en `currentUser`, que es de donde leen todas las pantallas: `actualizarMiPerfil(input)`, `cambiarMiContrasenia(actual, nueva)`, `darDeBajaMiCuenta()` (limpia el token y la sesión) y `reabrirSolicitud()`. Las otras tres son de `DataContext`: `listarMisPagos()`, `actualizarResenia(id, puntaje, comentario)` y `actualizarUsuarioAdmin(id, input)`.

Quién usa qué:
- `alumno/Perfil.tsx` — edición real de los datos (incluye el campo **Email**, que antes ni se mostraba en modo edición) + tarjeta "Seguridad de la cuenta" con cambio de contraseña y baja.
- `alumno/MisPagos.tsx` — ahora usa `listarMisPagos()` (`GET /api/alumno/pagos`) en vez de derivarlo de `listarMisInscripciones`: **un pago sobrevive a su inscripción** (reintegro por cancelación, liberación post-clase) y esa lista lo perdía. Suma un KPI "Reintegrado" y el botón "Reintentar".
- `alumno/MisResenas.tsx` — editar es un `PUT`, no un borrar+crear. Antes, si la creación fallaba después del borrado, la reseña original quedaba perdida sin nada que la reemplazara. El modal avisa que al editar vuelve a moderación, y eliminar pide confirmación.
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

## Reseñas del instructor: "en moderación" y "denunciada" no son lo mismo

`enModeracion` = el admin todavía no la aprobó. `denunciada` = el instructor la reportó. La pantalla pintaba **toda reseña nueva** con un cartel rojo "Reportada · en revisión", así que al instructor le parecía que cada reseña que recibía venía denunciada. Ahora son dos badges distintos (ámbar "Pendiente de moderación" / rojo "Denunciada · en revisión") más "Oculta" y "Respondida".

Responder y denunciar **pegan a la API** (`responderResenia` / `denunciarResenia`); antes eran `useState` locales y se perdían al recargar. No se puede responder una reseña en moderación ni una oculta (el backend rechaza), así que el botón se deshabilita con el motivo en el `title`.

## Galería de imágenes de la actividad

`actividad.imagenes` (ids) viene **solo del detalle** (`cargarDetalleActividad`), no del listado. Se sirven por `${BASE_URL}/api/fotos/actividad/imagen/{id}` — endpoint público, como el resto del catálogo. La portada sigue siendo `subirFotoActividad` + el componente `ActivityPhoto`; la galería usa `agregarImagenActividad` / `eliminarImagenActividad`, con tope de 6. La primera imagen que se sube cuando no hay portada pasa a serlo (lo hace el backend).

## Sesión: se renueva sola mientras usás la app

`AuthContext` escucha `click`/`keydown`/`scroll`/`focus` y llama a `POST /api/auth/refresh` como mucho cada 5 minutos (`INTERVALO_RENOVACION_MS`). El TTL del token en el backend es de 30 min y **esa es la ventana de inactividad** (E1A-HU02 criterio 3). Si tocás uno de los dos números, mirá el otro: el intervalo del cliente tiene que quedar bastante por debajo del TTL para que una sesión activa nunca venza entre dos renovaciones. Si el refresh falla no se fuerza el logout — la próxima llamada real de la pantalla da 401 y muestra el error que corresponde.

## Estados de error: usar `components/ErrorReintentar.tsx`, no `.catch(() => {})`

`.catch(() => {})` estaba repetido en 16 pantallas. El error se tragaba y quedaba el estado vacío, así que **un backend caído se veía exactamente igual que una plataforma sin datos** — y la spec pide "Reintentar" como criterio de error en casi todas las HU.

El componente compartido tiene dos variantes: `bloque` (recuadro, cuando la pantalla no tiene nada que mostrar) y `banner` (franja fina, cuando ya hay contenido). El patrón es siempre el mismo: un `cargar` con `useCallback`, un `useEffect` que lo llama, y `errorCarga` en el render.

Dos reglas que salieron de este barrido:
- **El estado de error reemplaza al estado vacío, no convive con él.** "No tenés clases", "No tenés notificaciones" o "Actividad no encontrada" son afirmaciones falsas cuando la carga falló. Donde había un ternario `length === 0 ? vacío : lista`, ahora va `errorCarga ? <ErrorReintentar/> : length === 0 ? vacío : lista`.
- **Si la pantalla hace varias consultas que alimentan los mismos números, van juntas en un `Promise.all`.** El Dashboard y Reportes del admin, el Panel del instructor y el Perfil del alumno mostraban KPIs en cero cuando una sola de sus cuatro consultas fallaba.

## Chatbot flotante (`components/ChatbotWidget.tsx`)

Botón flotante abajo a la derecha con la etiqueta "¿Dudas? Chateá". **Solo se ve en las pantallas del alumno** (criterio 1 de E3A-HU01/02/03/06/08/12): el soporte es para quien usa la plataforma como cliente, no para quien la opera. Instructor y admin lo tenían montado desde `DashLayout` y además tenían un ítem "Ayuda"/"Soporte" en el sidebar hacia `/ayuda`; ambas cosas se sacaron. `/ayuda` sigue siendo pública y accesible desde la Landing.

Se monta **una sola vez** en `AlumnoNav`, no pantalla por pantalla, para que ninguna se lo olvide al agregarse. En `AlumnoNav` va **fuera** del `<header>`: ese header tiene `backdrop-filter`, que crea un containing block para `position:fixed` — adentro, el widget se posicionaría contra el header en vez de contra el viewport.

Las respuestas salen de `lib/faqs.ts` por coincidencia de palabras, **no de un modelo**: el chatbot con Groq es el ítem 11 del roadmap y depende de credenciales. El copy no promete IA en ningún lado. `lib/faqs.ts` es la misma fuente que usa la pantalla pública de Ayuda: estaban duplicadas y se iban a desincronizar.

## Roles y permisos ya no es maqueta

`admin/Roles.tsx` consume `listarRolesPermisos()` (GET `/api/admin/roles`), `actualizarPermisosRol(rolId, claves)` y `crearRol(nombre, descripcion?)`. La matriz de checkboxes sale de `ConfiguracionRol` en la base (RN-19) — antes vivía en una constante del componente y "Guardar cambios" solo pintaba un cartel.

Cosas a respetar:
- **Se guarda la foto completa del rol**: se manda la lista de claves marcadas y el backend apaga todo lo que no venga. Por eso el botón solo se habilita si hay diferencias contra lo cargado.
- **Las columnas son dinámicas**: hay tantas como roles devuelva la API (el admin puede crear roles nuevos), no tres fijas.
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

**`src/lib/areas.ts` es la fuente de verdad**: define las tres áreas (`alumno`, `instructor`, `admin`), qué permisos habilitan cada una (alcanza con **uno**) y qué permiso pide cada ítem de menú (`PERMISO_POR_ITEM`, compartido por los tres menús). Antes esto estaba repartido entre `RequireRole`, una constante privada de `DashSidebar` y dos mapas `HOME_BY_ROL`.

- **`RequireArea` reemplazó a `RequireRole`.** La guarda vieja comparaba `currentUser.rol` contra un nombre fijo, así que un rol con permisos de instructor no llegaba nunca a `/instructor` — era el bug reportado ("si le asigno los permisos del instructor al alumno no aparecen los menús"). Ahora la puerta la abre el permiso, igual que en el backend.
  - Mientras `initializing` está en true no decide nada: con `permisos` todavía vacío, cualquier redirección es un falso 403 y el usuario rebotaba al catálogo público al recargar.
- **Los tres menús filtran por permiso**, no sólo el del admin: `AlumnoNav` y el sidebar de instructor también. Nadie ve un ítem que el backend le va a rechazar con 403.
- **Botón "Ir a …" cuando alguien tiene más de un área.** Sin eso, un usuario con permisos mixtos quedaba encerrado en el área a la que entró. Está en `AlumnoNav` y en el pie de `DashSidebar`.
- **El login redirige con `homeDe(user.permisos)`**, no con un mapa por rol — un rol creado por el admin no tiene entrada en ningún mapa fijo. Por eso `login()` devuelve los permisos dentro de la sesión: si no, habría que esperar al render siguiente del contexto.
- **El perfil de instructor se pide por permiso.** `fetchPerfilInstructorSiCorresponde` miraba `rol !== "INSTRUCTOR"`; ahora mira `puedeEntrarA("instructor", permisos)`. Por eso en `login()` la llamada a `/api/auth/me` va **antes** que la del perfil.
- El rol de una cuenta se cambia desde el modal de edición de `admin/Gestion.tsx` (`asignarRolUsuario`, endpoint propio). El selector lista los roles reales, marcando cuáles creó el admin.
- `UsuarioAdmin.rol` es `string`, no la unión de los tres nombres: puede ser un rol nuevo.

## Home del alumno (E3A-HU01)

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

El repo estaba con 38 errores de base; hoy `npx eslint src` da **0 errores** (quedan warnings de directivas `eslint-disable` sobrantes, preexistentes). Dos patrones que hay que respetar para que no vuelvan:

- **`react-hooks/set-state-in-effect`:** la función `cargar` de una pantalla **no toca estado de forma síncrona**. El "limpiar el error" va dentro del `.then(...)` y el "prender el spinner" arranca en `useState(true)` o lo hace el handler del botón "Reintentar" (un evento sí puede). Ojo: con `async/await` la regla igual se queja — el setState tiene que estar dentro de un callback (`.then`/`.catch`/`.finally`), por eso `refrescarCatalogo` y el `cargar` de Roles están escritos como cadena de promesas.
- **`react-hooks/purity`:** nada de `Date.now()` durante el render. Para "faltan X días" / "ya pasó" se usa el hook `lib/ahora.ts` (`useAhora()`), que congela el reloj al montar. En un handler (submit, click) `Date.now()` está bien.

Donde el efecto sincroniza con algo externo de verdad (la navegación en Explorar, la geolocalización en CrearActividad, el mapa de Leaflet, la actividad por defecto en Reseñas del instructor) va un `eslint-disable` **de bloque** con el motivo escrito.

## Foto de perfil: solo desde Perfil, y en modo edición

El avatar de `AlumnoNav` **no** sube foto: es identidad, no un control. El único punto de subida para el alumno es el avatar de `alumno/Perfil.tsx`, y solo cuando está en modo edición (`onUpload` se pasa condicionado a `editando`). Ojo: `DashSidebar` (instructor/admin) todavía deja subir desde el sidebar, porque esos roles no tienen otra pantalla donde hacerlo — es una decisión pendiente, no un olvido.

## Penalizaciones: los dos tipos son combinables y la suspensión pide plazo

- El formulario de `admin/Penalizaciones.tsx` pasó de un `select` excluyente a **dos checkboxes**: se puede multar y suspender en la misma sanción. Se manda `tipos: [...]` y el backend guarda una penalización por cada tipo.
- **Mínimo 15 días** de suspensión, validado en el cliente y en el servidor (`MIN_DIAS_SUSPENSION`, espejo de `VentanaPenalizacion` del backend).
- El listado muestra monto, vigencia y **cuántos días dura**, y viene ordenado de la más antigua a la más reciente.
- **"Suspender al instructor" ya no se resuelve con un `prompt`**: abre un modal que pide días (mínimo 15) y monto de multa (puede ser 0 = solo suspensión). Eso viaja como `resolverDenuncia(id, "SUSPENDER", detalle, { montoMulta, diasSuspension })`.

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

`pages/instructor/HistorialClases.tsx`, ruta `/instructor/historial`, ítem "Historial" en el sidebar. Muestra las clases Finalizadas y Canceladas, más recientes primero, con filtro por estado.

Existe porque el instructor no tenía dónde ver sus clases pasadas: "Próximas clases" sólo lista futuras y el detalle de actividad las excluye a propósito (`ObtenerActividadService.ESTADOS_EXCLUIDOS`), así que una clase dictada desaparecía de su vista.

## Trampa recurrente: `DataContext.clases` NO es una lista completa
`clases: Clase[]` en el Context se llena **solo cuando se visita el detalle de una actividad** (`cargarDetalleActividad`), es una caché parcial por navegación, no un `GET /api/clases` global (ese endpoint no existe para el catálogo del alumno). Usarla como si fuera la lista completa de clases de la plataforma es un bug real que ya pasó dos veces (el donut de categorías del Dashboard, y estuvo cerca de repetirse en Reportes). Si necesitás **todas** las clases de la plataforma, es `listarClasesAdmin()` (admin) — no `clases` del Context.

## Trampa recurrente: dependencias de `useMemo`/`useCallback` incompletas
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
`NotificationBell.tsx` es compartido por los 3 roles — ya está insertado en `AlumnoNav` (reemplazó un ícono decorativo que no hacía nada) y en `DashSidebar` (instructor/admin, con `variant="dark" align="left"` para que quede bien en el sidebar oscuro y no se salga de pantalla). Si agregás un disparador de notificación nuevo en el backend, del lado frontend no hace falta tocar nada de UI — la campana ya hace polling on-mount vía `listarNotificaciones()` y se re-lee al abrir el dropdown.

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

## Estado actual del roadmap (mismos ítems que `activehub-api/CLAUDE.md`)
Ítems 2 a 7 completos (Denuncias, Gestión de usuarios, Auditoría consultable, Dashboard y Reportes reales, Notificar ausencia de profesor + sistema de notificaciones + favoritos reales, ABM de Categoría). Pendientes: 8 (recomendaciones en Explorar — hoy el filtrado es tradicional, incluye el filtro cascada Categoría→Tipo de actividad), 9 (geolocalización, necesita API key de Google Maps), 10 (imágenes en la nube, necesita cuenta de Supabase — la galería local ya funciona contra el disco del backend), 11 (IA real, necesita credenciales de Groq — el chatbot flotante ya existe y responde por coincidencia de palabras, y el "Asistente de beneficios" de `Detalle.tsx` sigue simulado con `setTimeout`), 12 (Mercado Pago real, al final). Sin Redis ni deploy todavía.

### Qué sigue siendo mock (queda poco, y está acotado)
Los tres dashboards, los intereses del alumno y las listas de inscripciones/pagos/penalizaciones **ya son reales**. Lo único mock que queda:
- `AuthContext.users` / `updateUsuario`: el "directorio" de usuarios en `localStorage`, que sobrevive porque la API no expone un listado público de personas. Las pantallas admin ya usan `listarUsuariosAdmin()`.
- El catálogo de demo de `lib/mockData.ts` (`actividades`, `clases`, `usuarios`, `perfiles*`), que alimenta ese directorio. Sus **helpers de formato** (`formatFecha`, `formatHora`, `disponibilidad`, `tipoIngreso`…) no son mock y se usan en todas las pantallas.
- El "Asistente de beneficios" de `Detalle.tsx`, simulado con `setTimeout` hasta que exista el ítem 11 (IA real).

## Verificación visual
Para cualquier cambio de UI, levantar el preview (instancia aislada de arriba) y probarlo en el navegador — un `tsc` en verde no prueba que la pantalla funcione. Ver `<preview_tools>`/`<verification_workflow>` del sistema para el flujo completo (console errors, network requests, screenshot final).
