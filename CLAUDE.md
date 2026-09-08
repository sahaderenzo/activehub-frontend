# CLAUDE.md — ActiveHub Frontend (Vite + React)

Convenciones de este repositorio. Leer **antes** de escribir código. Repo hermano `activehub-api` (Spring Boot) es el único backend — su propio `CLAUDE.md` tiene el detalle de endpoints y reglas de negocio.

## Qué es
SPA de ActiveHub para los 3 roles (Alumno, Instructor, Administrador). React 19 + TypeScript + Vite, **sin librería de UI** (ni Tailwind ni Material, etc.) — todo con estilos inline vía el helper `s()` de `src/lib/style.ts`, que parsea un string CSS literal (`"display:flex;gap:10px;"`) a un objeto de React, cacheado. Se sigue así en todo el proyecto, no introducir una librería de estilos nueva a mitad de camino.

## Estructura
- `src/pages/<rol>/Pantalla.tsx` — una pantalla por archivo, sin sub-carpetas de componentes por pantalla.
- `src/components/` — compartidos entre pantallas (`DashLayout`/`DashSidebar` para instructor/admin, `AlumnoNav` para alumno, `NotificationBell`, `ActivityCard`, `StatusBadge`, `RequireRole`, `Logo`).
- `src/context/AuthContext.tsx` — sesión real (JWT en `localStorage`, login/logout/registro).
- `src/context/DataContext.tsx` — el context grande: catálogo + todas las funciones que llaman a la API real, más una sección explícita al final ("fuera de alcance: mock puro, sin tocar") para lo que sigue simulado. **Leer el comentario de esa sección antes de asumir que algo es mock o real** — se mantiene actualizado a mano.
- `src/lib/api.ts` — cliente HTTP (`api.get/post/put/delete<T>(path, body?)`), lanza `ApiError(code, message, status, fieldErrors)` en no-2xx.
- `src/lib/types.ts` — tipos de dominio compartidos.
- `src/lib/mockData.ts` — dataset mock (Mendoza-flavored) + helpers de formato de fecha/hora (`formatFecha`, `formatHora`, `diasHastaClase`, etc. — estos helpers son de formato, no de datos, y se siguen usando aunque la pantalla ya sea 100% real).

## Patrón establecido para cablear una pantalla a datos reales
1. En `DataContext.tsx`: agregar la interfaz de respuesta (`XxxResp`/`Xxx`), la función (`useCallback`) que llama a `api.get/post/put/delete`, agregarla a `DataContextValue` y a **los dos lugares** del `useMemo` final (el objeto `value` y su array de deps — es fácil olvidar el segundo).
2. Si es una lista de alcance amplio para una pantalla admin (no un recurso propio del usuario logueado), el patrón es: el backend hace `JOIN FETCH` y devuelve todo sin paginar, el frontend agrega/filtra/ordena client-side. **No hay paginación ni agregación server-side en ningún lado de este proyecto** — no la introduzcas para "una pantalla más".
3. Si la pantalla necesita el dato solo para sí misma (no compartido), fetchealo en un `useEffect` local de esa pantalla con estado propio (`useState` + `.then(setEstado).catch(() => {})`), en vez de guardarlo en el Context — así hace la mayoría de las pantallas admin (Reportes, Auditoria, Trazabilidad, GestionClase, etc.).
4. Escribí el test de backend correspondiente antes de dar el cableado por terminado, y corré `npx tsc -b --noEmit` — un `tsc` limpio es la señal mínima de que no rompiste nada, no reemplaza probarlo en el navegador.

## Penalizaciones y Reportes ya no son maqueta

**Penalizaciones** (`admin/Penalizaciones.tsx`) usa `listarPenalizaciones()` y `crearPenalizacion()` contra `/api/admin/penalizaciones`. El formulario tiene campos condicionales por tipo — monto si es Económica, vigencia si es Suspensión temporal — y el selector de usuario sale de `listarUsuariosAdmin()`, no del directorio mock de `AuthContext`. La columna de estado distingue **Vigente** (suspensión en curso, la calcula el backend contra la fecha de hoy) de **Aplicada**.

**Reportes** (`admin/Reportes.tsx`): los filtros de período y categoría son reales y se aplican con el botón "Aplicar" (patrón borrador → aplicado). El encabezado y la vista previa muestran el período y el alcance **efectivamente aplicados**, no un texto fijo. La exportación descarga un CSV real (`descargarCsv`, con BOM y separador `;` para que Excel lo abra bien en es-AR); el botón PDF abre la vista previa para imprimir.

Dos cálculos que estaban mal y quedaron alineados: la columna "Ingresos" de la tabla por categoría ahora cuenta **solo** pagos `Liberado`/`Efectivo`, igual que el KPI de arriba (antes sumaba también Cancelado y Retenido, así que la tabla no cerraba con el KPI), y "Top instructor" se calcula por **reservas**, no por cantidad de actividades publicadas.

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
Ítems 2 a 7 completos (Denuncias, Gestión de usuarios, Auditoría consultable, Dashboard y Reportes reales, Notificar ausencia de profesor + sistema de notificaciones + favoritos reales, ABM de Categoría). Pendientes: 8 (recomendaciones en Explorar — hoy el filtrado es tradicional, incluye el filtro cascada Categoría→Tipo de actividad), 9 (geolocalización, necesita API key de Google Maps), 10 (imágenes reales, necesita cuenta de Supabase), 11 (IA/chatbot, necesita credenciales de Groq — hoy simulado con `setTimeout`), 12 (Mercado Pago real, al final). Sin Redis ni deploy todavía.

### Qué sigue siendo mock a propósito (no es un olvido)
- `inscripciones`/`pagos`/`penalizaciones` de alcance amplio en `DataContext.tsx` (comentario "fuera de alcance" explícito ahí mismo) — analítica histórica sin endpoint dedicado más allá de `listarInscripcionesAdmin`.
- Dashboards de **instructor** y **alumno** (el de admin ya es 100% real desde el ítem 5).
- Perfil del alumno/instructor: editar los propios datos no tiene endpoint de actualización todavía (solo lectura).
- ABM de Rol/Permiso: no aplica, los roles son un enum fijo del backend, no una tabla.

## Verificación visual
Para cualquier cambio de UI, levantar el preview (instancia aislada de arriba) y probarlo en el navegador — un `tsc` en verde no prueba que la pantalla funcione. Ver `<preview_tools>`/`<verification_workflow>` del sistema para el flujo completo (console errors, network requests, screenshot final).
