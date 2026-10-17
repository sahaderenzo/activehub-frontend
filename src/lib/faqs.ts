/**
 * Base de conocimiento de la Ayuda. Vive acá y no dentro de `pages/public/Ayuda.tsx` porque
 * la comparte con el chatbot flotante (`components/ChatbotWidget.tsx`): son las mismas
 * respuestas, y tenerlas duplicadas garantizaba que se desincronizaran.
 */
import { normalizar } from "./texto";

export interface Faq {
  /**
   * Slug estable. Lo usan las "Guías rápidas" de la pantalla de Ayuda para abrir y scrollear
   * hasta la respuesta que les corresponde: antes el botón "Ver guía →" no tenía `onClick` y
   * las guías no llevaban a ningún lado, porque no existen páginas de guía y la respuesta ya
   * estaba escrita acá abajo.
   */
  id: string;
  q: string;
  a: string;
  /** Palabras que dispararon la coincidencia en el chatbot, además de las del propio texto. */
  claves: string[];
}

export const FAQS: Faq[] = [
  {
    id: "preinscripcion-vs-inscripcion",
    q: "¿Cuál es la diferencia entre PreInscripción e Inscripción?",
    a: "Si faltan más de 4 días para la clase, solo podés PreInscribirte (registra tu interés, no ocupa cupo ni genera pago). A 4 días o menos, la inscripción es definitiva y ocupa un cupo hasta 1 hora antes del inicio.",
    claves: ["preinscripcion", "inscripcion", "diferencia", "cupo", "anotarme"],
  },
  {
    id: "medios-de-pago",
    q: "¿Cómo pago mi inscripción?",
    a: "Con tarjeta de crédito dentro de la plataforma, por Mercado Pago, o en efectivo abonado directamente al instructor, que confirma el cobro. No se aceptan tarjetas de débito ni prepagas.",
    claves: ["pago", "pagar", "efectivo", "mercado", "precio", "cobro", "plata", "medios", "debito", "tarjeta"],
  },
  // Las cinco que siguen salen del documento del manual vigente (2026-10-16, A.6): la de
  // arriba decía que el pago "se Libera al confirmarse la clase", que dejó de ser cierto con
  // Mercado Pago real.
  {
    id: "cuando-se-cobra",
    q: "¿Cuándo se me cobra la clase que pagué con tarjeta?",
    a: "El monto queda reservado en tu tarjeta al inscribirte y se cobra cuando la clase se dicta. Si la clase se cancela antes, la reserva se libera y no se te cobra nada.",
    claves: ["cobran", "cobra", "cuando", "reservado", "tarjeta", "reserva"],
  },
  {
    id: "solo-efectivo",
    q: "¿Por qué una clase solo me deja pagar en efectivo?",
    a: "Porque el instructor de esa clase todavía no habilitó los cobros con tarjeta.",
    claves: ["solo", "efectivo", "habilito", "tarjeta"],
  },
  {
    id: "pago-en-revision",
    q: "Mi pago figura \"En revisión\", ¿perdí el lugar?",
    a: "No. Tu lugar queda reservado mientras Mercado Pago revisa el pago, y te avisamos con una notificación apenas se resuelva.",
    claves: ["revision", "pendiente", "perdi", "lugar"],
  },
  {
    id: "clase-cancelada-reintegro",
    q: "Si cancelan la clase, ¿cómo recupero mi dinero?",
    a: "Si todavía no se te había cobrado, se libera la reserva de tu tarjeta. Si ya se te había cobrado, se te reembolsa por Mercado Pago y, según tu banco, puede tardar unos días en verse.",
    claves: ["cancelaron", "reembolso", "reintegro", "devolucion", "devuelven", "recupero", "dinero"],
  },
  {
    id: "instructor-cobrar-tarjeta",
    q: "Soy instructor, ¿qué necesito para cobrar con tarjeta?",
    a: "Vincular tu cuenta de Mercado Pago desde la tarjeta \"Cobros con Mercado Pago\" de tu Panel. Sin la cuenta vinculada, tus clases solo aceptan efectivo.",
    claves: ["vincular", "cobrar", "instructor", "cuenta", "mercado"],
  },
  {
    id: "cancelar-inscripcion",
    q: "¿Puedo cancelar una clase ya inscripta?",
    a: "Sí, desde 'Mis clases' podés cancelar tu inscripción. Una vez cancelada, no puede volver a un estado anterior. Si pagaste con tarjeta y todavía no se te cobró, se libera la reserva; un pago ya cobrado o el efectivo no se devuelven.",
    claves: ["cancelar", "cancelacion", "baja", "arrepenti"],
  },
  {
    id: "dejar-resena",
    q: "¿Cómo dejo una reseña?",
    a: "Después de que una clase en la que estuviste Inscripto finalice, vas a poder calificarla desde 'Mis reseñas'.",
    claves: ["resena", "resenia", "calificar", "opinion", "estrellas", "puntaje"],
  },
  {
    id: "denunciar",
    q: "¿Cómo denuncio una clase o un instructor?",
    a: "Desde 'Mis denuncias' podés reportar una clase finalizada en la que estuviste inscripto, a partir de 1 hora después del inicio. El equipo la audita y vas a ver la resolución en esa misma pantalla.",
    claves: ["denuncia", "denunciar", "reclamo", "reportar", "problema"],
  },
  {
    id: "instructor-validacion",
    q: "Soy instructor, ¿cuándo puedo publicar actividades?",
    a: "Un administrador valida tu cuenta después del registro. Mientras esté en revisión podés ingresar, pero no publicar actividades.",
    claves: ["instructor", "publicar", "validar", "verificar", "aprobar", "actividad"],
  },
  {
    id: "clase-semanal",
    q: "¿Cómo creo una clase que se repita todas las semanas?",
    a: "Al crear la clase, tildá \"Repetir cada semana\". Cada clase siguiente se genera automáticamente una semana antes de dictarse, así podés darla de baja con anticipación.",
    claves: ["repetir", "semanal", "recurrente", "agenda", "clase"],
  },
  {
    id: "cambiar-contrasena",
    q: "Olvidé mi contraseña o quiero cambiarla",
    a: "Podés cambiarla desde tu Perfil, en la tarjeta 'Seguridad de la cuenta'. Necesita al menos 8 caracteres, una mayúscula y un número.",
    claves: ["contrasena", "password", "clave", "olvide", "cambiar"],
  },
];

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
