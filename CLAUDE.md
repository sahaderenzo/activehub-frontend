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

## Trampa recurrente: `DataContext.clases` NO es una lista completa
`clases: Clase[]` en el Context se llena **solo cuando se visita el detalle de una actividad** (`cargarDetalleActividad`), es una caché parcial por navegación, no un `GET /api/clases` global (ese endpoint no existe para el catálogo del alumno). Usarla como si fuera la lista completa de clases de la plataforma es un bug real que ya pasó dos veces (el donut de categorías del Dashboard, y estuvo cerca de repetirse en Reportes). Si necesitás **todas** las clases de la plataforma, es `listarClasesAdmin()` (admin) — no `clases` del Context.

## Trampa recurrente: dependencias de `useMemo`/`useCallback` incompletas
Ya pasó dos veces en este repo (el donut del Dashboard y las tarjetas de categoría en `Taxonomia.tsx`): un `useMemo` usa una variable de estado dentro del cuerpo pero no la lista en el array de dependencias, entonces React no recalcula cuando esa variable cambia — la llamada a la API funciona pero la pantalla se queda con datos viejos hasta que *otra* dependencia fuerce un recálculo. Si agregás un campo a un `useMemo`/`useCallback` ya existente, revisá el array de deps de una.

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
