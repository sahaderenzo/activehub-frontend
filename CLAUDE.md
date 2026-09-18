# CLAUDE.md — ActiveHub Frontend (Vite + React)

Convenciones de este repositorio. Leer **antes** de escribir código. Repo hermano `activehub-backend` (Spring Boot) es el único backend — su propio `CLAUDE.md` tiene el detalle de endpoints y reglas de negocio.

## Qué es
SPA de ActiveHub para los 3 roles (Alumno, Instructor, Administrador). React 19 + TypeScript + Vite, **sin librería de UI** (ni Tailwind ni Material, etc.) — todo con estilos inline vía el helper `s()` de `src/lib/style.ts`, que parsea un string CSS literal (`"display:flex;gap:10px;"`) a un objeto de React, cacheado. Se sigue así en todo el proyecto, no introducir una librería de estilos nueva a mitad de camino.

## Estructura
- `src/pages/<rol>/Pantalla.tsx` — una pantalla por archivo, sin sub-carpetas de componentes por pantalla.
- `src/components/` — compartidos entre pantallas. Navegación y sesión: `DashLayout`/`DashSidebar` (instructor/admin), `AlumnoNav` (alumno), `NotificationBell`, `Logo`, `Avatar`, `BotonGoogle`, `CambiarEmailCard`. Guardas: `RequireArea`, `RequirePermiso`, `RequireEmailVerificado`, `RequirePerfilCompleto`. Piezas de UI: `ActivityCard`, `ActivityPhoto`, `StatusBadge`, `Modal`, `Cargando`, `ErrorReintentar`, `GraficoBarras`, `LeafletMap`, `ChatbotWidget`.
- `src/context/AuthContext.tsx` — sesión real (JWT en `localStorage`, login/logout/registro, permisos, perfil propio).
- `src/context/DataContext.tsx` — el context grande: catálogo + todas las funciones que llaman a la API real. **Ya no tiene sección mock**: los arrays `inscripciones`/`pagos`/`penalizaciones` que vivían acá se borraron y las pantallas que los leían pasaron a la API.
- `src/lib/api.ts` — cliente HTTP (`api.get/post/put/delete<T>(path, body?)` + `api.postForm` para multipart), lanza `ApiError(code, message, status, fieldErrors)` en no-2xx.
- `src/lib/types.ts` — tipos de dominio compartidos.
- `src/lib/areas.ts` — **fuente de verdad de la navegación**: áreas, pantallas y el permiso que exige cada una. Ver "Permisos en el frontend".
- `src/lib/mockData.ts` — catálogo de demostración + helpers de formato de fecha/hora (`formatFecha`, `formatHora`, `diasHastaClase`, `disponibilidad`, `tipoIngreso`…). **Los helpers son de formato, no de datos**, y se usan en todas las pantallas aunque ya sean 100% reales.
- Resto de `src/lib/`: `texto.ts` (búsqueda sin tildes), `geo.ts` + `nominatim.ts` (distancias y direcciones), `photos.ts`, `nivelStyle.ts`, `status.ts`, `notificaciones.ts`, `resaltado.ts`, `cargaParcial.ts`, `perfil.ts`, `faqs.ts`, `ahora.ts`, `exportCsv.ts`, `exportPdf.ts`, `style.ts`.

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

**La respuesta del instructor se ve en el detalle de la actividad.** Se guardaba desde hacía rato, pero `GET /api/actividades/{id}/resenas` no la devolvía y `alumno/Detalle.tsx` no la renderizaba: el instructor respondía, lo veía en su propia pantalla y el destinatario —el alumno— no la veía nunca. Hoy `ReseniaActividad` trae `respuestaInstructor` / `respuestaInstructorAt` y cada reseña la muestra en un bloque citado debajo del comentario, con el nombre del instructor y la fecha.

Responder y denunciar **pegan a la API** (`responderResenia` / `denunciarResenia`); antes eran `useState` locales y se perdían al recargar. No se puede responder una reseña en moderación ni una oculta (el backend rechaza), así que el botón se deshabilita con el motivo en el `title`.

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
  - el orden "Cercanas" y el **filtro por radio** de Explorar (`RADIOS`: cualquier distancia · menos de 2 km · 2 · 5 · 8 · 10 · más de 10 km),
  - la línea "A X de tu ubicación" del detalle y el `distanceKm` de `ActivityCard`.

  `useGeolocation` es **a demanda y no automático**: arranca en `idle` y sólo pide el permiso cuando la pantalla llama a `request()`. Distingue `denied` de `unsupported` porque son dos mensajes distintos para el usuario. **Sin coordenadas propias, la distancia es `undefined` y el filtro de radio no afirma nada**: `dentroDelRadio` devuelve false para una actividad sin distancia calculable, porque no se puede sostener que esté dentro de un radio que no se pudo medir.

## Sesión: se renueva sola mientras usás la app

`AuthContext` escucha `click`/`keydown`/`scroll`/`focus` y llama a `POST /api/auth/refresh` como mucho cada 5 minutos (`INTERVALO_RENOVACION_MS`). El TTL del token en el backend es de 30 min y **esa es la ventana de inactividad** (E1A-HU02 criterio 3). Si tocás uno de los dos números, mirá el otro: el intervalo del cliente tiene que quedar bastante por debajo del TTL para que una sesión activa nunca venza entre dos renovaciones. Si el refresh falla no se fuerza el logout — la próxima llamada real de la pantalla da 401 y muestra el error que corresponde.

## Estados de carga: `components/Cargando.tsx`, y son DOS

Tercer estado, además de "hay datos" y "falló". Reportado: *"entro a Mis clases siendo alumno y veo todo en 0, creo que no tengo nada"* — la consulta seguía en vuelo. **Un cero y un vacío son afirmaciones, y mientras los datos no llegaron son falsas.** Es la misma regla que ya obligaba a que el error reemplace al estado vacío, extendida a la carga.

- **`<CargandoAccion activo mensaje="…" />` — el usuario apretó algo y hay que esperar.** Overlay que tapa la pantalla con fondo gris y un cartel centrado. Va en **portal a `document.body`** por la misma razón que `Modal` (`.ah-screen` anima `transform` y captura los `position:fixed`), bloquea el scroll del body y **z-index 120, por encima del modal**, porque varias de estas acciones se disparan desde adentro de uno. El mensaje va en gerundio y sin punto: "Procesando tu pago".
  - Va en **inscripciones, reseñas y pagos**: preinscribirse, inscribirse/pagar, cancelar inscripción, confirmar cobro en efectivo, publicar/editar/eliminar reseña, responder una reseña, enviar una denuncia. Ahí el doble click cuesta una inscripción o un cobro de más, así que **no alcanza con deshabilitar el botón**: el overlay no deja llegar ni el segundo click ni un Enter perdido. Para el resto de las mutaciones (crear una clase, editar una actividad) sigue alcanzando con el botón deshabilitado.
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

Las respuestas salen de `lib/faqs.ts` por coincidencia de palabras, **no de un modelo**: el chatbot con Groq es el ítem 11 del roadmap y depende de credenciales. El copy no promete IA en ningún lado. `lib/faqs.ts` es la misma fuente que usa la pantalla pública de Ayuda: estaban duplicadas y se iban a desincronizar.

**Se puede usar suelto o controlado.** Sin props se abre y cierra solo (así lo monta `AlumnoNav`); con `abierto` + `onAbiertoChange` lo maneja la pantalla. Lo segundo existe para el botón "Iniciar chat" de Ayuda, que necesita abrir un widget que ya está montado.

## Soporte: toda la sección andaba en falso

Reportado: *"toda la sección de Soporte no funciona"*. Era literal — **siete controles muertos** entre el footer de la Landing y `/ayuda`:

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

## El chip de usuario del `AlumnoNav` es un menú, no un link

Hacer click en el nombre navegaba directo a `/alumno/perfil`. Ahora despliega un menú con **Mi perfil**, **Mis reseñas** y **Cerrar sesión**: las dos últimas eran acciones de un click que obligaban a entrar al Perfil —una pantalla entera— para llegar a ellas.

- **"Mis reseñas" se muestra sólo con `resenias.escribir`**, el mismo permiso con el que `App.tsx` gatea esa ruta. Es la regla de siempre: un atajo a un 403 es peor que no tener el atajo.
- Cierra al hacer click afuera (`mousedown` en `document`) y con Escape. Sin eso quedaba abierto tapando contenido mientras el usuario seguía navegando.
- `logout()` viene de `AuthContext` y después se navega a `/`, la landing pública.

## Resolver una denuncia: el modal de Suspender está en las DOS pantallas

`resolverDenuncia` con `SUSPENDER` exige `diasSuspension` (mínimo 15) y acepta `montoMulta`. `admin/Gestion.tsx` ya pedía las dos cosas en un modal, pero **`admin/Auditoria.tsx` mandaba la acción pelada**: el botón "Suspender instructor denunciado" devolvía *"Indicá cuántos días dura la suspensión."* sin que hubiera ningún lado donde indicarlo. Estaba roto de punta a punta.

Hoy `Auditoria.tsx` tiene el mismo formulario (días + multa, con `MIN_DIAS_SUSPENSION = 15`, espejo de `VentanaPenalizacion` del backend). **Si el mínimo cambia, son tres lugares**: las dos pantallas y la constante del backend. Las otras tres resoluciones siguen siendo un click directo.

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
- **Dos botones de exportación**: "Exportar esta página" y "Exportar todo (N)". El segundo **avisa cuántos son y pide confirmación** antes de generar el documento.
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
- Todo el texto se escapa antes de interpolarse: el contenido viene de datos que escribieron usuarios.

## `admin/Perfil.tsx`: el administrador también tiene cuenta propia

`/admin/perfil`, ítem "Mi perfil" al final del sidebar de admin (key `perfilAdmin` en `lib/areas.ts`, **sin `requiere`**: son los datos de la propia cuenta, no un módulo, y va último para que nunca sea el aterrizaje de nadie).

Antes el administrador era el único de los tres roles sin pantalla de cuenta propia: podía editar el nombre, el correo y el teléfono de **cualquier otro** usuario desde Gestión, pero no los suyos. Usa `actualizarMiPerfil` / `cambiarMiContrasenia` de `AuthContext` —no `actualizarUsuarioAdmin`, que apunta a un id ajeno—, que son las que refrescan `currentUser`, así que el nombre y el avatar del sidebar se actualizan solos al guardar.

**No tiene "dar de baja mi cuenta"**, a diferencia del alumno: un administrador que se borra a sí mismo puede dejar la plataforma sin nadie que la administre. Esas bajas se hacen desde Gestión, con otra cuenta.

## Pantallas del instructor: lo que cambió en este tramo

- **`instructor/Perfil.tsx` es nuevo** (`/instructor/perfil`, ítem "Mi perfil" en el sidebar). El instructor no tenía dónde cambiar su nombre, su teléfono ni su contraseña: "Mis datos" (`Solicitud.tsx`) es otra cosa —el estado de su verificación y la documentación— y su formulario sólo aparecía mientras la solicitud estaba en revisión.
- **La foto se sube sólo desde ahí.** El `Avatar` del `DashSidebar` perdió su `onUpload`: un avatar es identidad, no un control, y estando en todas las pantallas se abría el explorador de archivos sin querer. Es la regla que ya seguía el alumno.
- **Métricas exporta** a PDF y a CSV, con los helpers compartidos. Antes la única forma de sacar esos números era copiarlos a mano.
- **El Historial no es clickeable.** Una clase Finalizada o Cancelada no tiene nada que gestionar, y el click llevaba a una pantalla de acciones que ahí no aplican. En su lugar, cada fila muestra la **ganancia** (precio de la clase × inscriptos; `$0` si se canceló), que sale de `MiClaseInstructor.precio` — el precio congelado de esa clase, no el actual de la actividad.
- **El formulario de clase pide sólo fecha y hora de inicio.** La hora de fin se calcula con `actividad.duracionMin` y se muestra como texto al lado. El backend hace lo mismo: `horaFin` ya no viaja en el request.
- **Una clase congelada no ofrece "Editar"**, muestra un chip "Congelada" con el motivo. Espejo de `VentanaInscripcion.estaCongelada`; el backend es quien lo hace cumplir.
- **Se sacó la pasarela de 4 pasos** del alta/edición de actividad. No es un asistente: es un formulario de una página con todos los campos visibles, y los números marcaban un avance que nunca avanzaba.

## Reseñas del admin: dos sub-pestañas, y qué significa "Ocultar"

La pestaña Reseñas de `admin/Gestion.tsx` tiene **Pendientes de moderación** (la cola de siempre: Aprobar / Rechazar) y **Publicadas** (lo nuevo: Ocultar).

- **"Ocultar" no borra.** Pide motivo obligatorio y baja la reseña del detalle público y del promedio, pero la fila queda con su autor y su texto — si el contenido llega a ser algo en lo que deba intervenir la justicia, esa es justamente la evidencia. Las ya ocultas se siguen listando, en gris y tachadas, con un chip "Oculta".
- **Existe porque faltaba el camino.** Una reseña impropia que se filtraba en la moderación sólo se podía bajar si el instructor la denunciaba; el admin que la veía después no tenía ningún botón. Ver la tabla de los tres caminos en el CLAUDE.md del backend.
- **No confundir con `enModeracion`**: esa es "todavía no se aprobó" y se resuelve en la otra sub-pestaña.

## Resolver una denuncia: las cuatro opciones están descritas en pantalla

`ETIQUETA_ACCION` y `DESCRIPCION_ACCION` en `admin/Gestion.tsx` son la fuente de esos textos, y **describen lo que el backend hace**, no lo que uno supondría. Aparecen en tres lugares: el panel plegable "¿Qué hace cada resolución?" arriba de la tabla de Reclamos, el `title` de cada botón y el modal de Suspender.

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
- **Mínimo 15 días** de suspensión, validado en el cliente y en el servidor (`MIN_DIAS_SUSPENSION`, espejo de `VentanaPenalizacion` del backend).
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
`NotificationBell.tsx` es compartido por los 3 roles — ya está insertado en `AlumnoNav` (reemplazó un ícono decorativo que no hacía nada) y en `DashSidebar` (instructor/admin, con `variant="dark" align="left"` para que quede bien en el sidebar oscuro y no se salga de pantalla). Hace polling on-mount vía `listarNotificaciones()` y se re-lee al abrir el dropdown. Lleva un prop **`area`** obligatorio (`AlumnoNav` pasa `"alumno"`, `DashSidebar` pasa su `role`): sólo desempata a dónde lleva el click.

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

De paso, `alumno/MisResenas.tsx` muestra ahora **la respuesta del instructor** y el chip "Oculta por moderación". Ninguna de las dos se veía del lado del alumno (la respuesta sólo aparecía en la página pública de la actividad), así que las notificaciones `RESENIA_RESPONDIDA` y la de reseña ocultada aterrizaban en una fila idéntica al resto.

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

**Ítem 9 (geolocalización): HECHO**, con OpenStreetMap en lugar de Google Maps — ver la sección propia más abajo. **Ítem 10 (imágenes): la galería y las fotos funcionan** contra el disco del backend; lo pendiente es sólo mudar el almacenamiento a Supabase Storage, que no toca ninguna pantalla.

Pendientes de verdad:
- **8** — recomendaciones en Explorar. Hoy el filtrado es tradicional (texto sin tildes, categoría, tipo en cascada, nivel, precio, cupos, fecha, franja horaria, radio de cercanía, orden) y el "Recomendado para vos" del Home cruza los intereses declarados contra el `tipoActividadId`, pero nada aprende del comportamiento.
- **11** — IA real, necesita credenciales de Groq. El chatbot flotante ya existe y responde por coincidencia de palabras contra `lib/faqs.ts`, y el "Asistente de beneficios" de `Detalle.tsx` genera el texto con plantillas por nivel. **El copy no promete IA en ningún lado**; si se enchufa el modelo, revisar que eso siga siendo cierto hasta que funcione.
- **12** — Mercado Pago real, al final.
- **Deploy** (Vercel) — el build de producción sale limpio y la URL del backend es `VITE_API_URL`, pero no se desplegó.
- **Recuperar contraseña** — el enlace "¿Olvidaste tu contraseña?" de `Login.tsx` es un `span` sin `onClick`: no hay flujo detrás y nunca tuvo HU. Si se implementa, es pantalla nueva; el cambio de contraseña y el de correo del usuario autenticado sí existen.

Redis quedó **descartado** (no diferido): el control de cupos se resolvió en la base.

### Qué sigue siendo mock (queda poco, y está acotado)
Los tres dashboards, los intereses del alumno, las listas de inscripciones/pagos/penalizaciones **y la Landing** ya son reales. Lo único mock que queda:
- `AuthContext.users` / `updateUsuario`: el "directorio" de usuarios en `localStorage`, que sobrevive porque la API no expone un listado público de personas. Las pantallas admin ya usan `listarUsuariosAdmin()`.
- El catálogo de demo de `lib/mockData.ts` (`actividades`, `clases`, `usuarios`, `perfiles*`), que alimenta ese directorio. Sus **helpers de formato** (`formatFecha`, `formatHora`, `disponibilidad`, `tipoIngreso`…) no son mock y se usan en todas las pantallas.
- El "Asistente de beneficios" de `Detalle.tsx`, simulado con `setTimeout` hasta que exista el ítem 11 (IA real).

## Verificación visual
Para cualquier cambio de UI, levantar el preview (instancia aislada de arriba) y probarlo en el navegador — un `tsc` en verde no prueba que la pantalla funcione. Ver `<preview_tools>`/`<verification_workflow>` del sistema para el flujo completo (console errors, network requests, screenshot final).
