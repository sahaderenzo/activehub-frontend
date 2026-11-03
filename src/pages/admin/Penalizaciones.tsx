import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import Modal from "../../components/Modal";
import { CargandoSeccion } from "../../components/Cargando";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import type { PenalizacionAdmin, UsuarioAdmin } from "../../context/DataContext";
import { ApiError } from "../../lib/api";
import { formatFecha } from "../../lib/mockData";
import { MAX_DIAS_SUSPENSION, MIN_DIAS_SUSPENSION, MULTA_MAXIMA, MULTA_MINIMA, errorDiasSuspension, errorMulta } from "../../lib/limites";
import type { TipoPenalizacion } from "../../lib/types";
import { ESTILO_RESALTE, useResaltado } from "../../lib/resaltado";
import { agruparPenalizaciones, fechaCorta } from "../../lib/sanciones";
import {
  FILTRO_VACIO,
  OPCIONES_ESTADO,
  OPCIONES_ORIGEN,
  OPCIONES_TIPO,
  ORDENES_PENALIZACIONES,
  estadoDeParte,
  filtrarSanciones,
  hayFiltro,
  ordenarSanciones,
  type EstadoParte,
  type FiltroPenalizaciones,
} from "../../lib/filtrosPenalizaciones";
import { usePaginado } from "../../lib/paginado";
import Paginacion from "../../components/Paginacion";
import BuscadorLupa from "../../components/BuscadorLupa";

const TIPO_STYLE: Record<TipoPenalizacion, [string, string, string]> = {
  Económica: ["#FFF3E0", "#B9741A", "#F6E2C0"],
  "Suspensión temporal": ["#FBEAEB", "#BE3A3E", "#F3D2D3"],
};

const GRID_FILAS = "1.5fr 1.1fr 2fr 0.9fr 0.6fr 200px";

const CHIP = "font:700 12px Manrope,sans-serif;padding:5px 11px;border-radius:99px;width:fit-content;";
const CHIP_ROJO = CHIP + "background:#FBEAEB;color:#BE3A3E;border:1px solid #F3D2D3;";
const CHIP_GRIS = CHIP + "background:#F2F5F9;color:#65788C;border:1px solid #E2E9F0;";
const CHIP_AMBAR = CHIP + "background:#FFF3E0;color:#B9741A;border:1px solid #F6E2C0;";
const CHIP_AZUL = CHIP + "background:#EAF1FE;color:#3A6FF0;border:1px solid #D3E0FB;";
const CHIP_VERDE = CHIP + "background:#E7F6EE;color:#1F8A55;border:1px solid #C9EBD8;";

const BOTON_FILA = "background:#fff;border:1px solid #D6DEE7;border-radius:9px;padding:6px 10px;font:700 12px Manrope,sans-serif;color:#41566B;cursor:pointer;text-align:left;";

/**
 * V36. El estado de cada fila: una multa se lee por su pago (las anteriores a V36 no se pagan
 * por la plataforma y siguen como "Aplicada"); una suspensión, por si sigue en curso o un
 * administrador la levantó.
 */
const CHIP_DE_ESTADO: Record<EstadoParte, string> = {
  "Pendiente de pago": CHIP_AMBAR,
  "En revisión": CHIP_AZUL,
  Pagada: CHIP_VERDE,
  Aplicada: CHIP_GRIS,
  Vigente: CHIP_ROJO,
  Levantada: CHIP_GRIS,
};

function estadoFila(p: PenalizacionAdmin): [string, string] {
  const estado = estadoDeParte(p);
  return [estado, CHIP_DE_ESTADO[estado]];
}

const POR_PAGINA = 10;
const SELECT =
  "background:#fff;border:1px solid #D6DEE7;border-radius:12px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;cursor:pointer;";

function Selector({
  etiqueta,
  valor,
  opciones,
  onChange,
}: {
  etiqueta: string;
  valor: string;
  opciones: { valor: string; etiqueta: string }[];
  onChange: (valor: string) => void;
}) {
  return (
    <label style={s("display:flex;align-items:center;gap:7px;font:700 12.5px Manrope,sans-serif;color:#65788C;")}>
      {etiqueta}
      <select aria-label={etiqueta} value={valor} onChange={(e) => onChange(e.target.value)} style={s(SELECT)}>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}

type TipoAccion = "desbloquear" | "invalidar" | "levantar";

interface AccionPendiente {
  tipo: TipoAccion;
  p: PenalizacionAdmin;
}

/** El estado de una parte de la sanción (la multa o la suspensión) y sus acciones. */
function EstadoParte({
  p,
  rotulo,
  onVerComprobante,
  onAccion,
}: {
  p: PenalizacionAdmin;
  /** "Multa" / "Suspensión" cuando la fila tiene las dos partes; null si es una sola. */
  rotulo: string | null;
  onVerComprobante: (comprobanteId: string) => void;
  onAccion: (tipo: TipoAccion, p: PenalizacionAdmin) => void;
}) {
  const [etiqueta, estilo] = estadoFila(p);
  const comprobante = p.comprobantes[0];
  const enRevision = p.estadoPago === "EN_REVISION" && comprobante?.estado === "EN_REVISION";
  const puedeLevantar = p.tipo === "Suspensión temporal" && p.vigente && !p.levantadaAt;
  return (
    <div style={s("display:flex;flex-direction:column;gap:6px;")}>
      {rotulo && (
        <span style={s("font:700 10.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;")}>{rotulo}</span>
      )}
      <span style={s(estilo)}>{etiqueta}</span>
      {enRevision && (
        <>
          <button className="ah-btn" onClick={() => onVerComprobante(comprobante.id)} style={s(BOTON_FILA)}>
            Ver comprobante
          </button>
          <button
            className="ah-btn"
            onClick={() => onAccion("desbloquear", p)}
            style={s(BOTON_FILA + "background:#1F8A55;border-color:#1F8A55;color:#fff;")}
          >
            Desbloquear instructor
          </button>
          <button className="ah-btn" onClick={() => onAccion("invalidar", p)} style={s(BOTON_FILA + "color:#BE3A3E;border-color:#F3D2D3;")}>
            Notificar invalidez
          </button>
        </>
      )}
      {puedeLevantar && (
        <button className="ah-btn" onClick={() => onAccion("levantar", p)} style={s(BOTON_FILA)}>
          Desbloquear
        </button>
      )}
    </div>
  );
}


interface FormState {
  usuarioId: string;
  /** Los dos tipos se pueden aplicar juntos; el backend guarda una penalización por cada uno. */
  economica: boolean;
  suspension: boolean;
  motivo: string;
  monto: string;
  fechaInicio: string;
  fechaFin: string;
}

const FORM_VACIO: FormState = {
  usuarioId: "",
  economica: true,
  suspension: false,
  motivo: "",
  monto: "",
  fechaInicio: "",
  fechaFin: "",
};

/** Días enteros entre dos fechas `YYYY-MM-DD`. */
function diasEntre(desde: string, hasta: string): number {
  return Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000);
}

/** `yyyy-mm-dd` + n días, en UTC para que el cambio de horario no corra la fecha. */
function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default function AdminPenalizaciones() {
  const { puede } = useAuth();
  const {
    listarPenalizaciones,
    crearPenalizacion,
    listarUsuariosAdmin,
    verComprobantePenalizacion,
    desbloquearInstructorPenalizacion,
    invalidarComprobantePenalizacion,
    levantarSuspension,
  } = useData();
  const resaltado = useResaltado("penalizacion");
  // El listado de usuarios es `usuarios.gestionar`, un módulo distinto del de esta pantalla:
  // un rol puede tener penalizaciones sin gestión de usuarios. En ese caso el listado no se
  // pide y el alta queda deshabilitada con su explicación, en vez de un select vacío o una
  // pantalla en error (ver lib/cargaParcial.ts).
  const puedeElegirUsuario = puede("usuarios.gestionar");

  const [penalizaciones, setPenalizaciones] = useState<PenalizacionAdmin[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [showForm, setShowForm] = useState(false);
  /** La penalización es irreversible: se pide una confirmación explícita antes de aplicarla. */
  const [confirmado, setConfirmado] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  /** V36: desbloquear al instructor, notificar un comprobante inválido o levantar una suspensión. */
  const [accion, setAccion] = useState<AccionPendiente | null>(null);
  const [motivoAccion, setMotivoAccion] = useState("");
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  /** Lo que pasó con la última acción, arriba de la tabla. */
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorFila, setErrorFila] = useState<string | null>(null);

  // Datos reales: antes la pantalla leía el dataset mock del DataContext, así que lo que el
  // admin "aplicaba" no se guardaba y las penalizaciones que sí creaba `resolverdenuncia`
  // no aparecían nunca.
  const cargar = useCallback(() => {
    listarPenalizaciones()
      .then((lista) => {
        setPenalizaciones(lista);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No pudimos cargar las penalizaciones."))
      .finally(() => setCargando(false));
    // Sin el listado de usuarios el formulario no tiene a quién penalizar, así que un fallo
    // acá también es un error de pantalla y no un select vacío sin explicación.
    //
    // Solo instructores (`puedeDarClases`): la penalización existe por la inasistencia del
    // profesor (E4Ad-HU06 / RN-13), así que multar o suspender a un alumno o a un
    // administrador no significa nada. El backend rechaza igual el resto — acá se evita
    // ofrecerlo. El flag viene calculado por permiso, no por nombre de rol (RN-19).
    if (puedeElegirUsuario) {
      listarUsuariosAdmin()
        .then((lista) => setUsuarios(lista.filter((u) => u.puedeDarClases)))
        .catch(() => setError("No pudimos cargar el listado de usuarios."));
    }
  }, [listarPenalizaciones, listarUsuariosAdmin, puedeElegirUsuario]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const kpis = useMemo(() => {
    const usuariosPenalizados = new Set(penalizaciones.map((p) => p.usuarioId)).size;
    const suspensionesVigentes = penalizaciones.filter((p) => p.vigente).length;
    return [
      { l: "Total penalizaciones", v: penalizaciones.length, c: "#0E2A47" },
      { l: "Usuarios sancionados", v: usuariosPenalizados, c: "#B9741A" },
      { l: "Suspensiones vigentes", v: suspensionesVigentes, c: "#BE3A3E" },
    ];
  }, [penalizaciones]);

  const rows = penalizaciones;
  const grupos = useMemo(() => agruparPenalizaciones(rows), [rows]);

  // Buscador, filtros y orden: sobre las sanciones (filas), no sobre cada parte.
  const [filtro, setFiltro] = useState<FiltroPenalizaciones>(FILTRO_VACIO);
  const [orden, setOrden] = useState(ORDENES_PENALIZACIONES[0].valor);
  const ordenadas = useMemo(() => ordenarSanciones(filtrarSanciones(grupos, filtro), orden), [grupos, filtro, orden]);
  // La notificación de un comprobante trae `?penalizacion=`: se abre en la página de esa fila.
  const indiceResaltado = ordenadas.findIndex((g) => g.some((x) => x.id === resaltado.id));
  const pag = usePaginado(
    ordenadas,
    POR_PAGINA,
    JSON.stringify(filtro) + orden,
    indiceResaltado >= 0 ? Math.floor(indiceResaltado / POR_PAGINA) + 1 : undefined,
  );
  const listaRef = useRef<HTMLDivElement>(null);
  const irAPagina = (n: number) => {
    pag.irAPagina(n);
    if (listaRef.current) listaRef.current.scrollTop = 0;
  };

  const submit = async () => {
    setFormError(null);
    if (!form.usuarioId) return setFormError("Elegí a qué usuario penalizar.");
    if (!form.motivo.trim()) return setFormError("El motivo es obligatorio.");
    if (!form.economica && !form.suspension) {
      return setFormError("Elegí al menos un tipo de penalización.");
    }
    if (form.economica && (!form.monto || Number(form.monto) <= 0)) {
      return setFormError("Ingresá el monto de la penalización económica.");
    }
    if (form.economica) {
      const errorMonto = errorMulta(Number(form.monto), false);
      if (errorMonto) return setFormError(errorMonto);
    }
    if (form.suspension) {
      if (!form.fechaInicio || !form.fechaFin) {
        return setFormError("Indicá la fecha de inicio y de fin de la suspensión.");
      }
      const errorDias = errorDiasSuspension(diasEntre(form.fechaInicio, form.fechaFin));
      if (errorDias) return setFormError(errorDias);
    }

    setGuardando(true);
    try {
      const tipos: TipoPenalizacion[] = [];
      if (form.economica) tipos.push("Económica");
      if (form.suspension) tipos.push("Suspensión temporal");

      await crearPenalizacion({
        usuarioId: form.usuarioId,
        tipos,
        motivo: form.motivo.trim(),
        monto: form.economica ? Number(form.monto) : undefined,
        fechaInicio: form.suspension ? form.fechaInicio : undefined,
        fechaFin: form.suspension ? form.fechaFin : undefined,
      });
      setShowForm(false);
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo aplicar la penalización. Intentá de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  /** La suspensión en curso de ese instructor, sin contar la que se está por levantar. */
  const suspensionVigenteDe = (usuarioId: string, salvo?: string) =>
    penalizaciones.find((x) => x.usuarioId === usuarioId && x.id !== salvo && x.tipo === "Suspensión temporal" && x.vigente);
  /** Una multa que lo sigue bloqueando, sin contar la que se está por aprobar. */
  const multaPendienteDe = (usuarioId: string, salvo?: string) =>
    penalizaciones.some(
      (x) => x.usuarioId === usuarioId && x.id !== salvo && (x.estadoPago === "PENDIENTE_PAGO" || x.estadoPago === "EN_REVISION"),
    );

  const abrirAccion = (tipo: TipoAccion, p: PenalizacionAdmin) => {
    setAccion({ tipo, p });
    setMotivoAccion("");
    setErrorAccion(null);
  };

  const verComprobante = (comprobanteId: string) => {
    setErrorFila(null);
    verComprobantePenalizacion(comprobanteId).catch((err) =>
      setErrorFila(err instanceof ApiError ? err.message : "No pudimos abrir el comprobante."),
    );
  };

  const confirmarAccion = async () => {
    if (!accion) return;
    const motivo = motivoAccion.trim();
    if (accion.tipo !== "desbloquear" && !motivo) return setErrorAccion("El motivo es obligatorio.");
    setErrorAccion(null);
    setProcesando(true);
    try {
      const nombre = accion.p.usuarioNombre;
      if (accion.tipo === "desbloquear") {
        const r = await desbloquearInstructorPenalizacion(accion.p.id);
        setAviso(
          r.suspendidoHasta
            ? `Pago aprobado. ${nombre} sigue suspendido hasta el ${fechaCorta(r.suspendidoHasta)}.`
            : `Pago aprobado. ${nombre} ya puede volver a operar.`,
        );
      } else if (accion.tipo === "invalidar") {
        await invalidarComprobantePenalizacion(accion.p.id, motivo);
        setAviso(`Le avisamos a ${nombre} que el comprobante no es válido. Puede cargar uno nuevo.`);
      } else {
        const r = await levantarSuspension(accion.p.id, motivo);
        setAviso(
          r.multaPendiente
            ? `Suspensión levantada. ${nombre} sigue bloqueado hasta que se apruebe el pago de su multa.`
            : `Suspensión levantada. ${nombre} ya puede volver a operar.`,
        );
      }
      setAccion(null);
      cargar();
    } catch (err) {
      setErrorAccion(err instanceof ApiError ? err.message : "No se pudo completar la acción. Intentá de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <DashLayout role="admin" active="penalizaciones">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;display:flex;align-items:center;")}>
        <div>
          <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Penalizaciones</h1>
          <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>
            Sanciones a instructores: económicas o suspensión temporal. Cada instructor acumula su cantidad.
          </p>
        </div>
        {/* Sin `usuarios.gestionar` no hay a quién elegir: el alta se oculta y queda el
            listado, que es lo que sí habilita `penalizaciones.gestionar`. */}
        {puedeElegirUsuario ? (
          <button
            className="ah-btn"
            onClick={() => {
              setConfirmado(false);
              setShowForm(true);
            }}
            style={s(
              "margin-left:auto;background:#E5484D;color:#fff;border:none;border-radius:12px;padding:12px 20px;font:700 14px Manrope,sans-serif;cursor:pointer;display:flex;align-items:center;gap:8px;",
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva penalización
          </button>
        ) : (
          <span
            style={s(
              "margin-left:auto;max-width:300px;font:600 12.5px Manrope,sans-serif;color:#90A1B2;line-height:1.5;text-align:right;",
            )}
          >
            Para aplicar una penalización hace falta también el permiso de gestión de usuarios.
          </span>
        )}
      </div>

      <div style={s("padding:26px 32px 50px;")}>
        <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:24px;")}>
          {kpis.map((k) => (
            <div key={k.l} style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:20px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;margin-bottom:8px;")}>{k.l}</div>
              <div style={s(`font:700 26px Space Grotesk,sans-serif;color:${k.c};`)}>{k.v}</div>
            </div>
          ))}
        </div>

        {aviso && (
          <div
            role="status"
            style={s("display:flex;gap:12px;align-items:center;background:#E7F6EE;border:1px solid #C9EBD8;color:#1F6B44;border-radius:12px;padding:11px 16px;margin-bottom:16px;font:600 13.5px Manrope,sans-serif;")}
          >
            <span style={s("flex:1;")}>{aviso}</span>
            <button
              className="ah-btn"
              onClick={() => setAviso(null)}
              aria-label="Cerrar aviso"
              style={s("background:none;border:none;color:#1F6B44;font:700 16px Manrope,sans-serif;cursor:pointer;")}
            >
              ×
            </button>
          </div>
        )}
        {errorFila && (
          <div role="alert" style={s("background:#FBEAEB;border:1px solid #F3D2D3;color:#BE3A3E;border-radius:12px;padding:11px 16px;margin-bottom:16px;font:700 13px Manrope,sans-serif;")}>
            {errorFila}
          </div>
        )}

        {!cargando && !error && rows.length > 0 && (
          <div style={s("display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;")}>
            <BuscadorLupa
              valor={filtro.texto}
              onChange={(texto) => setFiltro({ ...filtro, texto })}
              placeholder="Buscar por instructor (nombre o correo)"
              etiqueta="Buscar por instructor"
            />
            <Selector etiqueta="Tipo" valor={filtro.tipo} opciones={OPCIONES_TIPO} onChange={(tipo) => setFiltro({ ...filtro, tipo })} />
            <Selector
              etiqueta="Estado"
              valor={filtro.estado}
              opciones={OPCIONES_ESTADO}
              onChange={(estado) => setFiltro({ ...filtro, estado })}
            />
            <Selector
              etiqueta="Origen"
              valor={filtro.origen}
              opciones={OPCIONES_ORIGEN}
              onChange={(origen) => setFiltro({ ...filtro, origen })}
            />
            <Selector etiqueta="Ordenar por" valor={orden} opciones={ORDENES_PENALIZACIONES} onChange={setOrden} />
            <span style={s("font-size:13px;color:#65788C;font-weight:600;display:flex;align-items:center;gap:12px;")}>
              {hayFiltro(filtro) ? `${ordenadas.length} de ${grupos.length}` : `${grupos.length} en total`}
              {hayFiltro(filtro) && (
                <span
                  className="ah-link"
                  role="button"
                  onClick={() => setFiltro(FILTRO_VACIO)}
                  style={s("color:#12B5A5;font-weight:700;cursor:pointer;")}
                >
                  Limpiar filtros
                </span>
              )}
            </span>
          </div>
        )}

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("overflow-x:auto;")}>
            <div style={s("min-width:900px;")}>
              <div
                style={s(
                  `display:grid;grid-template-columns:${GRID_FILAS};gap:12px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;`,
                )}
              >
                <span>Usuario</span>
                <span>Tipo</span>
                <span>Motivo</span>
                <span>Fecha</span>
                <span>Acum.</span>
                <span>Estado</span>
              </div>
              <div ref={listaRef} className="ah-scroll" data-testid="lista-penalizaciones" style={s("max-height:620px;overflow-y:auto;")}>
              {pag.visibles.map((grupo) => {
                // Multa + suspensión aplicadas juntas van en UNA fila, pero cada parte conserva
                // su estado y sus botones: se resuelven por separado y el instructor sigue
                // bloqueado mientras quede alguna (ver agruparPenalizaciones).
                const primera = grupo[0];
                const multa = grupo.find((x) => x.tipo === "Económica");
                const suspension = grupo.find((x) => x.tipo === "Suspensión temporal");
                const motivos = [...new Set(grupo.map((x) => x.motivo))];
                const conRotulo = grupo.length > 1;
                const resaltada = grupo.some((x) => resaltado.activo(x.id));
                return (
                  <div
                    key={grupo.map((x) => x.id).join("+")}
                    ref={grupo.map((x) => resaltado.ref(x.id)).find(Boolean)}
                    style={s(
                      `display:grid;grid-template-columns:${GRID_FILAS};gap:12px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;` +
                        (resaltada ? ESTILO_RESALTE : ""),
                    )}
                  >
                    <div style={s("display:flex;align-items:center;gap:10px;")}>
                      <span
                        style={s(
                          "width:34px;height:34px;border-radius:99px;background:#FBEAEB;color:#BE3A3E;display:flex;align-items:center;justify-content:center;font:700 13px Space Grotesk,sans-serif;flex:none;",
                        )}
                      >
                        {primera.usuarioNombre.charAt(0).toUpperCase()}
                      </span>
                      <span style={s("font:700 14px Manrope,sans-serif;color:#0E2A47;")}>{primera.usuarioNombre}</span>
                    </div>
                    <div style={s("display:flex;flex-direction:column;gap:5px;")}>
                      {grupo.map((x) => {
                        const [tipoBg, tipoFg, tipoBd] = TIPO_STYLE[x.tipo];
                        return (
                          <span
                            key={x.id}
                            style={s(
                              `font:700 11.5px Manrope,sans-serif;padding:4px 10px;border-radius:99px;background:${tipoBg};color:${tipoFg};border:1px solid ${tipoBd};width:fit-content;`,
                            )}
                          >
                            {x.tipo}
                          </span>
                        );
                      })}
                    </div>
                    <div>
                      {motivos.map((m) => (
                        <div key={m} style={s("font-size:13px;color:#65788C;font-weight:600;")}>
                          {m}
                        </div>
                      ))}
                      {multa?.monto != null && (
                        <div style={s("font:700 12.5px Manrope,sans-serif;color:#B9741A;margin-top:2px;")}>
                          Monto: ${multa.monto.toLocaleString("es-AR")}
                        </div>
                      )}
                      {suspension?.fechaInicio && suspension.fechaFin && (
                        <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:600;margin-top:2px;")}>
                          Vigencia: {formatFecha(suspension.fechaInicio)} → {formatFecha(suspension.fechaFin)}{" "}
                          <span style={s("color:#BE3A3E;")}>({diasEntre(suspension.fechaInicio, suspension.fechaFin)} días)</span>
                        </div>
                      )}
                      {primera.denunciaId && (
                        <div style={s("font-size:12.5px;color:#3A6FF0;font-weight:700;margin-top:2px;")}>
                          Originada en una denuncia
                        </div>
                      )}
                      {multa?.estadoPago === "PENDIENTE_PAGO" && multa.comprobantes[0]?.estado === "INVALIDO" && (
                        <div style={s("font-size:12.5px;color:#BE3A3E;font-weight:600;margin-top:2px;")}>
                          Comprobante inválido: {multa.comprobantes[0].motivoInvalidez}
                        </div>
                      )}
                      {suspension?.levantadaAt && (
                        <div style={s("font-size:12.5px;color:#65788C;font-weight:600;margin-top:2px;")}>
                          Levantada el {formatFecha(suspension.levantadaAt)}: {suspension.motivoLevantamiento}
                        </div>
                      )}
                    </div>
                    <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{formatFecha(primera.createdAt)}</span>
                    <span style={s("font:700 15px Space Grotesk,sans-serif;color:#BE3A3E;")}>
                      {primera.cantidadPenalizacionesUsuario}
                    </span>
                    <div style={s("display:flex;flex-direction:column;gap:12px;")}>
                      {grupo.map((x) => (
                        <EstadoParte
                          key={x.id}
                          p={x}
                          rotulo={conRotulo ? (x.tipo === "Económica" ? "Multa" : "Suspensión") : null}
                          onVerComprobante={verComprobante}
                          onAccion={abrirAccion}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {!cargando && !error && rows.length > 0 && ordenadas.length === 0 && (
                <div style={s("padding:40px 22px;text-align:center;color:#90A1B2;font:600 13.5px Manrope,sans-serif;")}>
                  No hay penalizaciones con esos filtros.
                </div>
              )}
              </div>
              {error && (
                <div style={s("padding:30px 22px;text-align:center;")}>
                  <div style={s("color:#BE3A3E;font:700 13.5px Manrope,sans-serif;margin-bottom:12px;")}>{error}</div>
                  <button
                    className="ah-btn"
                    onClick={cargar}
                    style={s(
                      "background:#fff;border:1px solid #D6DEE7;border-radius:10px;padding:9px 16px;font:700 13px Manrope,sans-serif;color:#41566B;cursor:pointer;",
                    )}
                  >
                    Reintentar
                  </button>
                </div>
              )}
              {cargando && (
                <div style={s("padding:22px;")}>
                  <CargandoSeccion seccion="penalizaciones" />
                </div>
              )}
              {!cargando && !error && rows.length === 0 && (
                <div style={s("padding:40px 22px;text-align:center;color:#90A1B2;font:600 13.5px Manrope,sans-serif;")}>No hay penalizaciones aplicadas.</div>
              )}
              {!cargando && !error && pag.totalPaginas > 1 && (
                <div style={s("padding:14px 22px;border-top:1px solid #EEF2F6;")}>
                  <Paginacion paginaActual={pag.paginaActual} totalPaginas={pag.totalPaginas} irAPagina={irAPagina} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {accion && (
        <Modal onClose={() => !procesando && setAccion(null)}>
          <div style={s("width:100%;max-width:440px;background:#fff;border-radius:16px;padding:22px;box-shadow:0 26px 64px rgba(0,0,0,.3);")}>
            <div style={s("font:700 16px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:10px;")}>
              {accion.tipo === "desbloquear"
                ? "Desbloquear instructor"
                : accion.tipo === "invalidar"
                  ? "Notificar comprobante inválido"
                  : "Levantar la suspensión"}
            </div>
            <p style={s("font:600 13.5px Manrope,sans-serif;color:#41566B;line-height:1.55;margin:0 0 14px;")}>
              {accion.tipo === "desbloquear" && (
                <>
                  Vas a aprobar el pago de la multa de <b>{accion.p.usuarioNombre}</b>
                  {accion.p.monto != null && <> (${accion.p.monto.toLocaleString("es-AR")})</>}. Revisá el comprobante antes de confirmar.{" "}
                  {(() => {
                    const susp = suspensionVigenteDe(accion.p.usuarioId);
                    if (susp) return <>Sigue suspendido hasta el {formatFecha(susp.fechaFin ?? "")}: vuelve a operar cuando termine la suspensión.</>;
                    if (multaPendienteDe(accion.p.usuarioId, accion.p.id)) return <>Tiene otra multa sin pagar: sigue bloqueado hasta que se apruebe.</>;
                    return <>Vuelve a operar en cuanto confirmes.</>;
                  })()}
                </>
              )}
              {accion.tipo === "invalidar" && (
                <>
                  Le avisamos a <b>{accion.p.usuarioNombre}</b> que el comprobante no es válido, con el motivo que escribas, y
                  va a poder cargar otro. Sigue bloqueado hasta que se apruebe un pago.
                </>
              )}
              {accion.tipo === "levantar" && (
                <>
                  La suspensión de <b>{accion.p.usuarioNombre}</b> termina hoy en vez del{" "}
                  {formatFecha(accion.p.fechaFin ?? "")}. Las clases que ya se cancelaron no se recuperan.{" "}
                  {multaPendienteDe(accion.p.usuarioId) && <>Tiene una multa sin pagar: sigue bloqueado hasta que se apruebe.</>}
                </>
              )}
            </p>

            {accion.tipo !== "desbloquear" && (
              <>
                <label
                  htmlFor="motivo-accion"
                  style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}
                >
                  Motivo *
                </label>
                <textarea
                  id="motivo-accion"
                  value={motivoAccion}
                  onChange={(e) => setMotivoAccion(e.target.value)}
                  rows={3}
                  placeholder={
                    accion.tipo === "invalidar" ? "Ej.: el monto no coincide con el de la multa" : "Por qué se levanta antes de tiempo"
                  }
                  style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:12px;resize:vertical;")}
                />
              </>
            )}

            {errorAccion && (
              <div role="alert" style={s("font:700 12.5px Manrope,sans-serif;color:#BE3A3E;margin-bottom:12px;")}>
                {errorAccion}
              </div>
            )}

            <div style={s("display:flex;gap:10px;")}>
              <button
                className="ah-btn"
                onClick={() => setAccion(null)}
                disabled={procesando}
                style={s("flex:1;background:#F4F7FA;color:#41566B;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:pointer;")}
              >
                Cancelar
              </button>
              <button
                className="ah-btn"
                onClick={confirmarAccion}
                disabled={procesando}
                style={s(
                  `flex:1;background:${accion.tipo === "invalidar" ? "#E5484D" : "#1F8A55"};color:#fff;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:${
                    procesando ? "not-allowed" : "pointer"
                  };opacity:${procesando ? ".6" : "1"};`,
                )}
              >
                {procesando
                  ? "Procesando…"
                  : accion.tipo === "desbloquear"
                    ? "Aprobar y desbloquear"
                    : accion.tipo === "invalidar"
                      ? "Notificar invalidez"
                      : "Levantar suspensión"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div style={s("width:100%;max-width:420px;background:#fff;border-radius:16px;padding:22px;box-shadow:0 26px 64px rgba(0,0,0,.3);")}>
            <div style={s("font:700 16px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:14px;")}>Nueva penalización</div>

            <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>Instructor</label>
            <select
              value={form.usuarioId}
              onChange={(e) => setForm({ ...form, usuarioId: e.target.value })}
              style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:14px;")}
            >
              <option value="">Elegí un instructor…</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido} · {u.rol} · {u.email}
                </option>
              ))}
            </select>

            {/* Los dos tipos son combinables: se puede multar y suspender en la misma sanción.
                El backend guarda una Penalización por cada tipo tildado. */}
            <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>Tipo</label>
            <div style={s("display:flex;flex-direction:column;gap:8px;margin-bottom:14px;")}>
              {[
                { key: "economica" as const, label: "Económica" },
                { key: "suspension" as const, label: "Suspensión temporal" },
              ].map((opt) => (
                <label
                  key={opt.key}
                  style={s("display:flex;align-items:center;gap:9px;font:600 13.5px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
                >
                  <input
                    type="checkbox"
                    checked={form[opt.key]}
                    onChange={(e) => setForm({ ...form, [opt.key]: e.target.checked })}
                    style={s("width:16px;height:16px;accent-color:#E5484D;cursor:pointer;")}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {/* Campos condicionales (criterios 4 y 5): monto para Económica, vigencia para Suspensión. */}
            {form.economica && (
              <>
                <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>
                  Monto ($) · entre {MULTA_MINIMA.toLocaleString("es-AR")} y {MULTA_MAXIMA.toLocaleString("es-AR")}
                </label>
                <input
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value.replace(/[^\d]/g, "") })}
                  inputMode="numeric"
                  placeholder="5000"
                  style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:14px;")}
                />
              </>
            )}
            {form.suspension && (
              <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;")}>
                <div>
                  <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>
                    Fecha inicio
                  </label>
                  <input
                    type="date"
                    value={form.fechaInicio}
                    onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                    style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;")}
                  />
                </div>
                <div>
                  <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>
                    Fecha fin
                  </label>
                  {/* El calendario no deja elegir fuera del rango: mínimo y máximo de la suspensión. */}
                  <input
                    type="date"
                    min={form.fechaInicio ? sumarDias(form.fechaInicio, MIN_DIAS_SUSPENSION) : undefined}
                    max={form.fechaInicio ? sumarDias(form.fechaInicio, MAX_DIAS_SUSPENSION) : undefined}
                    value={form.fechaFin}
                    onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                    style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;")}
                  />
                </div>
              </div>
            )}
            {form.suspension && (
              <div style={s("font-size:11.5px;color:#9AAABA;font-weight:600;margin:-6px 0 14px;")}>
                La suspensión dura entre {MIN_DIAS_SUSPENSION} y {MAX_DIAS_SUSPENSION} días.
              </div>
            )}

            <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>Motivo</label>
            <textarea
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              rows={3}
              placeholder="Describí el motivo de la sanción"
              style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:12px;resize:vertical;")}
            />

            {formError && (
              <div style={s("font:700 12.5px Manrope,sans-serif;color:#BE3A3E;margin-bottom:12px;")}>{formError}</div>
            )}

            {/*
              Una penalización NO se puede deshacer: no hay endpoint para borrarla ni para
              acortarla, a propósito — es un acto sancionatorio con constancia en auditoría. Y
              una suspensión, además, cancela las clases del período y reintegra a los
              inscriptos. Eso hay que decirlo ANTES de confirmar, no después.
            */}
            <div
              style={s(
                "display:flex;gap:9px;background:#FFF3E0;border:1px solid #F6E2C0;border-radius:11px;padding:11px 13px;margin-bottom:12px;",
              )}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B9741A" strokeWidth={2.2} style={{ flex: "none", marginTop: "1px" }}>
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
              <span style={s("font:600 12.5px Manrope,sans-serif;color:#8A5A12;line-height:1.5;")}>
                <b>Esta acción no se puede deshacer.</b> Una penalización aplicada no se cancela
                ni se acorta: queda registrada en la auditoría.
                {form.suspension && (
                  <>
                    {" "}
                    Además, se <b>cancelarán todas las clases</b> del instructor dentro del
                    período y se reintegrará el pago a cada inscripto.
                  </>
                )}
              </span>
            </div>

            <label
              style={s(
                "display:flex;align-items:flex-start;gap:9px;margin-bottom:14px;cursor:pointer;font:600 12.5px Manrope,sans-serif;color:#41566B;line-height:1.5;",
              )}
            >
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(e) => setConfirmado(e.target.checked)}
                style={{ marginTop: "2px" }}
              />
              Entiendo que la penalización es definitiva.
            </label>

            <div style={s("display:flex;gap:10px;")}>
              <button
                className="ah-btn"
                onClick={() => setShowForm(false)}
                style={s("flex:1;background:#F4F7FA;color:#41566B;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:pointer;")}
              >
                Cancelar
              </button>
              <button
                className="ah-btn"
                onClick={submit}
                disabled={guardando || !confirmado}
                style={s(
                  `flex:1;background:#E5484D;color:#fff;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:${
                    guardando || !confirmado ? "not-allowed" : "pointer"
                  };opacity:${guardando || !confirmado ? ".6" : "1"};`,
                )}
              >
                {guardando ? "Aplicando…" : "Aplicar penalización"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </DashLayout>
  );
}
