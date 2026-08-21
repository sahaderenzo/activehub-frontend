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
