# Pruebas automatizadas del frontend

Hasta esta incorporación el frontend no tenía ninguna prueba automatizada: todo se verificaba
con el compilador de tipos, ESLint y la revisión manual en el navegador. Este documento dice
qué hay, cómo se corre y con qué criterio se agrega lo que falta.

## Cómo se corre

```bash
npm test             # corre toda la suite una vez (es lo que corre CI)
npm run test:watch   # se queda mirando los archivos mientras se programa
npm run test:coverage# igual que `npm test`, con el informe de cobertura
npm run lint         # ESLint
npm run typecheck    # tsc -b
```

## Con qué está hecho

- **Vitest** como motor. Se eligió sobre Jest porque el proyecto ya usa Vite: comparte la
  configuración, la resolución de módulos y las transformaciones de TypeScript y JSX, así que
  no hay un segundo pipeline de compilación que mantener ni que desincronizar.
- **jsdom** como entorno: da un DOM sin abrir un navegador.
- **Testing Library** (`@testing-library/react` y `@testing-library/user-event`) para las
  pruebas de pantalla. Consulta por lo que ve la persona —el texto del botón, el del campo—
  y no por clases CSS ni por estructura interna, así que un cambio de maquetado no rompe una
  prueba que sigue siendo cierta.
- La configuración vive en el bloque `test` de `vite.config.ts`, y lo común a todas las
  pruebas en `src/test/setup.ts` (los stubs de `scrollTo`, `scrollIntoView` y `matchMedia`,
  que jsdom no implementa, y la limpieza del DOM entre pruebas).

## Qué se prueba

Las pruebas viven al lado del archivo que prueban, con la extensión `.test.ts` / `.test.tsx`.

| Archivo | Qué fija |
|---|---|
| `lib/texto.test.ts` | La búsqueda ignora tildes, mayúsculas y la ñ en **todos** los filtros. |
| `lib/areas.test.ts` | RN-19: a dónde entra y dónde aterriza cada persona según sus permisos, con los casos que ya se rompieron una vez (`catalogo.explorar`, `cobros.confirmar`, `soporte.gestionar`, el admin parcial). |
| `lib/api.test.ts` | El contrato con el backend: el token como Bearer, el 204 sin cuerpo, y cada respuesta de error traducida a `ApiError` con su código, su mensaje y sus errores por campo. |
| `lib/faqs.test.ts` | La búsqueda de FAQs, que es el camino **sin IA** del chatbot. |
| `lib/ia.test.ts` | La distinción entre "la IA no está disponible" y "se acabó la cuota", que se tratan distinto, y el recorte del historial a 6 turnos. |
| `lib/exportCsv.test.ts` | El BOM y el separador `;`, sin los cuales el CSV no abre bien en Excel en es-AR. |
| `lib/exportPdf.test.ts` | Regresión: una celda `null` dejaba la pestaña del PDF en blanco (Trazabilidad). También que un armado fallido no abra ventana y que devuelva `false` con el pop-up bloqueado. |
| `lib/geo.test.ts` | Distancias y su formato (metros debajo del kilómetro). |
| `lib/style.test.ts` | El parseo de las declaraciones CSS y su caché por cadena. |
| `lib/mockData.test.ts` | La regla de los 4 días (`tipoIngreso`), la disponibilidad de cupos y el formato de fecha y hora. |
| `lib/manual.test.ts` | Las invariantes del Manual de usuario: ids únicos, ningún apartado vacío, negritas balanceadas, nada de HTML en el texto. |
| `lib/perfil.test.ts` | "Terminá tu registro" alcanza sólo a las cuentas de Google. |
| `lib/cargaParcial.test.ts` | Un 403 de un módulo secundario no tira la pantalla entera. |
| `lib/status.test.ts`, `lib/nivelStyle.test.ts` | Los estados del dominio y los colores de nivel, incluido el neutro para los niveles que crea el admin. |
| `pages/public/Ayuda.test.tsx` | Los controles que alguna vez estuvieron muertos: el buscador, las guías rápidas (con la regresión del `onToggle`), el reporte de soporte real (éxito, error del backend, error inesperado, con y sin sesión) y los enlaces `mailto:`/`tel:`. |
| `pages/public/Manual.test.tsx` | El índice, el buscador sin tildes, el glosario como tabla, las negritas, el ancla de la URL y la impresión. |

## Criterio para agregar pruebas

1. **Una regresión reportada se cubre con una prueba.** Varias de las de arriba son
   exactamente eso; el comentario de cada una dice qué se rompió.
2. **Se prueba el comportamiento, no la implementación.** Nada de consultar por clases CSS,
   por el nombre de un estado interno ni por la cantidad de renders.
3. **Los contextos se reemplazan por dobles cuando no son el objeto de la prueba.** Las
   pruebas de pantalla mockean `AuthContext` y `DataContext`: montarlos de verdad arrastraría
   la sesión y la API, que tienen sus propias pruebas.
4. **Nada de pruebas que dependan de la hora actual sin controlarla.** Las que miran fechas
   construyen sus datos a partir de `Date.now()`.

## Lo que todavía no se prueba

- Las pantallas del Alumno, del Instructor y del Administrador: hoy la cobertura de pantallas
  son las dos públicas. Es el frente más grande que queda.
- El flujo de inscripción y pago. Se dejó a propósito para cuando esté la integración real
  con Mercado Pago: hoy la pantalla habla con `MockPaymentGateway` y la prueba habría que
  reescribirla enseguida.
- Los contextos `AuthContext` y `DataContext` de punta a punta.

## Integración continua

`.github/workflows/ci.yml` corre en cada push y en cada Pull Request sobre `integracion` y
`main`: ESLint, verificación de tipos, pruebas y compilación de producción, en ese orden y
los cuatro bloqueantes. Las advertencias de ESLint no hacen fallar el trabajo; los errores sí.
