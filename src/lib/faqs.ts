/**
 * Base de conocimiento de la Ayuda. Vive acá y no dentro de `pages/public/Ayuda.tsx` porque
 * la comparte con el chatbot flotante (`components/ChatbotWidget.tsx`): son las mismas
 * respuestas, y tenerlas duplicadas garantizaba que se desincronizaran.
 */
export interface Faq {
  q: string;
  a: string;
  /** Palabras que dispararon la coincidencia en el chatbot, además de las del propio texto. */
  claves: string[];
}

export const FAQS: Faq[] = [
  {
    q: "¿Cuál es la diferencia entre PreInscripción e Inscripción?",
    a: "Si faltan más de 4 días para la clase, solo podés PreInscribirte (registra tu interés, no ocupa cupo ni genera pago). A 4 días o menos, la inscripción es definitiva y ocupa un cupo hasta 1 hora antes del inicio.",
    claves: ["preinscripcion", "inscripcion", "diferencia", "cupo", "anotarme"],
  },
  {
    q: "¿Cómo pago mi inscripción?",
    a: "Con Mercado Pago (el pago queda Retenido y se Libera al confirmarse la clase) o en efectivo directamente con tu instructor, quien confirma el cobro manualmente.",
    claves: ["pago", "pagar", "efectivo", "mercado", "precio", "cobro", "plata"],
  },
  {
    q: "¿Puedo cancelar una clase ya inscripta?",
    a: "Sí, desde 'Mis clases' podés cancelar tu inscripción. Una vez cancelada, no puede volver a un estado anterior.",
    claves: ["cancelar", "cancelacion", "baja", "arrepenti"],
  },
  {
    q: "¿Cómo dejo una reseña?",
    a: "Después de que una clase en la que estuviste Inscripto finalice, vas a poder calificarla desde 'Mis reseñas'.",
    claves: ["resena", "resenia", "calificar", "opinion", "estrellas", "puntaje"],
  },
  {
    q: "¿Cómo denuncio una clase o un instructor?",
    a: "Desde 'Mis denuncias' podés reportar una clase finalizada en la que estuviste inscripto, a partir de 1 hora después del inicio. El equipo la audita y vas a ver la resolución en esa misma pantalla.",
    claves: ["denuncia", "denunciar", "reclamo", "reportar", "problema"],
  },
  {
    q: "Soy instructor, ¿cuándo puedo publicar actividades?",
    a: "Un administrador valida tu cuenta después del registro. Mientras esté en revisión podés ingresar, pero no publicar actividades.",
    claves: ["instructor", "publicar", "validar", "verificar", "aprobar", "actividad"],
  },
  {
    q: "¿Cómo creo una clase que se repita todas las semanas?",
    a: "Al crear la clase, tildá \"Repetir cada semana\". Cada clase siguiente se genera automáticamente una semana antes de dictarse, así podés darla de baja con anticipación.",
    claves: ["repetir", "semanal", "recurrente", "agenda", "clase"],
  },
  {
    q: "Olvidé mi contraseña o quiero cambiarla",
    a: "Podés cambiarla desde tu Perfil, en la tarjeta 'Seguridad de la cuenta'. Necesita al menos 8 caracteres, una mayúscula y un número.",
    claves: ["contrasena", "password", "clave", "olvide", "cambiar"],
  },
];

/** Normaliza para comparar sin tildes ni mayúsculas. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Búsqueda por palabras, no IA: el chatbot con Groq es el ítem 11 del roadmap y todavía no
 * tiene credenciales. Se puntúa cada FAQ por cuántos términos de la consulta aparecen en su
 * pregunta, su respuesta o sus claves, y se devuelve la mejor si supera el umbral.
 */
export function buscarFaq(consulta: string): Faq | null {
  const terminos = normalizar(consulta)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4);
  if (terminos.length === 0) return null;

  let mejor: Faq | null = null;
  let mejorPuntaje = 0;
  for (const faq of FAQS) {
    const texto = normalizar(`${faq.q} ${faq.a} ${faq.claves.join(" ")}`);
    const puntaje = terminos.filter((t) => texto.includes(t)).length;
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejor = faq;
    }
  }
  return mejorPuntaje > 0 ? mejor : null;
}
