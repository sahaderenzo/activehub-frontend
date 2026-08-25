# ActiveHub Frontend

Frontend de ActiveHub: React 19 + TypeScript + Vite, sin librerías de UI externas (estilos inline con un helper propio en `lib/style.ts`).

## Requisitos previos

- **Node.js 20 o superior** (con npm)
- El backend (`activehub-api`) corriendo — ver su propio README. Sin la API levantada, la app carga pero ninguna pantalla trae datos.

## 1. Clonar el repositorio

```bash
git clone https://github.com/sahaderenzo/activehub-frontend.git activehub-frontend
cd activehub-frontend
```

## 2. Instalar dependencias

```bash
npm install
```

## 3. Configurar la URL de la API

Crear un archivo `.env` en la raíz del proyecto (al lado de `package.json`):

```
VITE_API_URL=http://localhost:8080
```

Si no se crea este archivo, el cliente HTTP (`src/lib/api.ts`) usa `http://localhost:8080` por defecto — que es el puerto por defecto del backend, así que en el caso más común (todo corriendo en la misma máquina) este paso es opcional.

## 4. Ejecutar en modo desarrollo

```bash
npm run dev
```

Por defecto queda disponible en `http://localhost:5173`. Si el backend no tiene ese origen habilitado en `CORS_ALLOWED_ORIGINS`, las llamadas a la API van a fallar por CORS — es el valor por defecto del backend, así que en el caso más común no hace falta tocar nada ahí tampoco.

## 5. Compilar para producción

```bash
npm run build
```

Corre primero el chequeo de tipos (`tsc -b`) y después genera el build en `dist/`. Para previsualizar ese build localmente:

```bash
npm run preview
```

## Notas

- No hay usuarios de prueba precargados: hay que registrarse desde `/registro` (como alumno o instructor) o, para entrar como administrador, pedirle a quien levante el backend que configure `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` antes de arrancarlo por primera vez.
- Un instructor recién registrado no puede operar hasta que un admin apruebe su verificación desde el panel de administración.
- `npm run lint` corre ESLint sobre todo el proyecto.

## Funcionalidades implementadas

Todas las pantallas de los 3 roles existen; lo que cambió en las últimas semanas es cuánto de eso quedó conectado a datos reales del backend (`activehub-api`) en vez de mock:

- **Denuncias**: el alumno reporta la inasistencia de un instructor desde "Mis clases"; el admin las resuelve (reintegro, suspensión, penalización o desestimar) desde el panel de auditoría.
- **Gestión de usuarios**: listado real de usuarios del admin, con activar/suspender.
- **Auditoría y trazabilidad**: pantalla `Trazabilidad` conectada al registro real del backend (filtro por rol/acción/búsqueda libre).
- **Dashboard y Reportes (admin)**: métricas reales, ya no mockeadas (instructor y alumno siguen con dashboard mock, fuera de alcance por ahora).
- **Notificaciones**: campana con datos reales, incluida la notificación de ausencia de profesor.
- **Taxonomía**: ABM real de categorías desde el panel de admin.
- **Explorar actividades**: filtro de "Tipo de actividad" ahora aparece en cascada según la(s) categoría(s) seleccionada(s), en vez de mostrar siempre todos los tipos.
- **Registro de alumno**: nuevo campo opcional para describir una condición de salud o lesión.
- **Registro (alumno e instructor)**: confirmación de contraseña + botón para mostrar/ocultar la contraseña en ambos formularios.
- **Registro de instructor**: carga de documentación/certificaciones (PDF, JPG o PNG); el admin las ve desde "Validar instructor".
- **Login**: se sacaron los accesos rápidos de demo ("entrar como Alumno/Instructor/Admin") — ahora solo se ingresa con credenciales reales.

Ver la matriz de trazabilidad abajo para el estado módulo por módulo, y `CLAUDE.md` para los detalles de implementación (patrón de cableado a datos reales, trampas conocidas, qué sigue siendo mock a propósito).

## Matriz de trazabilidad

| # | Módulo / requisito | Estado | Pantalla(s) | Fuente de datos |
|---|---|---|---|---|
| 1 | Auth, catálogo, actividades, inscripciones, reseñas, validación de instructor | ✅ Hecho | `auth/*`, `alumno/Explorar`, `alumno/MisClases`, `admin/ValidarInstructor` | API real |
| 2 | Denuncias | ✅ Hecho | `alumno/MisClases` (reportar), `admin/Auditoria` (resolver) | API real |
| 3 | Gestión de usuarios (admin) | ✅ Hecho | `admin/GestionUsuarios` | API real |
| 4 | Auditoría consultable | ✅ Hecho | `admin/Trazabilidad` | API real |
| 5 | Dashboard y reportes (admin) | ✅ Hecho | `admin/Dashboard`, `admin/Reportes` | API real |
| 6 | Notificar ausencia de profesor + notificaciones | ✅ Hecho | `components/NotificationBell` | API real |
| 7 | ABM de Categoría | ✅ Hecho | `admin/Taxonomia` | API real |
| — | Condición de salud del alumno + confirmar/mostrar contraseña | ✅ Hecho | `auth/Registro` | API real |
| — | Documentación de instructores (subir/ver) | ✅ Hecho | `auth/Registro`, `admin/ValidarInstructor` | API real |
| — | Login sin accesos de demo | ✅ Hecho | `auth/Login` | — |
| 8 | Motor de recomendaciones en Búsqueda | 🟡 Parcial | `alumno/Explorar` | Filtro tradicional (categoría → tipo en cascada), sin recomendación |
| 9 | Geolocalización real | ⏳ Pendiente | — | — |
| 10 | Imágenes reales de actividades | ⏳ Pendiente | — | `photoTint` (color placeholder) |
| 11 | Asistente de IA / chatbot | ⏳ Pendiente | — | Simulado con `setTimeout` |
| 12 | Integración real de Mercado Pago | ⏳ Pendiente | — | Flujo de pago simulado (mock backend) |
| — | Dashboards de instructor y alumno | ⏳ Pendiente (fuera de alcance por ahora) | `instructor/Dashboard`, `alumno/Dashboard` | Mock |
| — | Inscripciones/pagos/penalizaciones de alcance amplio (analítica histórica) | ⏳ Pendiente | — | Mock (`DataContext.tsx`, sección "fuera de alcance") |

*Última actualización: 25/08/2026.*
