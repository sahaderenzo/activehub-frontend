import { useMemo } from "react";
import AlumnoNav from "../../components/AlumnoNav";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { formatFecha } from "../../lib/mockData";
import { pagoStatusType } from "../../lib/status";
import type { Actividad, Inscripcion, Pago } from "../../lib/types";

interface PagoRow {
  inscripcion: Inscripcion;
  pago: Pago;
  actividad: Actividad;
}

export default function AlumnoMisPagos() {
  const { currentUser } = useAuth();
  const { inscripciones, pagos, clases, actividades } = useData();

  const filas = useMemo(() => {
    if (!currentUser) return [] as PagoRow[];
    const rows: PagoRow[] = [];
    for (const i of inscripciones) {
      if (i.alumnoId !== currentUser.id || !i.pagoId) continue;
      const pago = pagos.find((p) => p.id === i.pagoId);
      if (!pago) continue;
      const clase = clases.find((c) => c.id === i.claseId);
      const actividad = clase ? actividades.find((a) => a.id === clase.actividadId) : undefined;
      if (!actividad) continue;
      rows.push({ inscripcion: i, pago, actividad });
    }
    rows.sort((a, b) => b.inscripcion.createdAt.localeCompare(a.inscripcion.createdAt));
    return rows;
  }, [inscripciones, pagos, clases, actividades, currentUser]);

  const totalPagado = filas.filter((f) => f.pago.estado === "Liberado" || f.pago.estado === "Efectivo").reduce((s2, f) => s2 + f.pago.monto, 0);
  const totalRetenido = filas.filter((f) => f.pago.estado === "Retenido").reduce((s2, f) => s2 + f.pago.monto, 0);

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <AlumnoNav active="misreservas" />
      <div style={s("max-width:1080px;margin:0 auto;padding:30px 28px 60px;")}>
        <h1 style={s("font:700 30px Space Grotesk,sans-serif;letter-spacing:-.7px;margin:0 0 4px;")}>Mis pagos</h1>
        <p style={s("font-size:14.5px;color:#7A8C9E;margin:0 0 24px;")}>
          Historial de pagos por tus inscripciones, con su estado y comprobante.
        </p>
        <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:26px;")}>
          <SummaryTile label="Total pagado" value={`$${totalPagado.toLocaleString("es-AR")}`} color="#0C8576" />
          <SummaryTile label="Retenido (Mercado Pago)" value={`$${totalRetenido.toLocaleString("es-AR")}`} color="#B9741A" />
          <SummaryTile label="Cantidad de pagos" value={`${filas.length}`} color="#0E2A47" />
        </div>

        {filas.length === 0 ? (
          <div
            style={s(
              "background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:50px 20px;text-align:center;color:#7A8C9E;font-weight:600;",
            )}
          >
            Todavía no tenés pagos registrados.
          </div>
        ) : (
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
            <div
              className="ah-grid-5"
              style={s(
                "display:grid;grid-template-columns:2fr 1.3fr 1.1fr 1fr 130px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
              )}
            >
              <span>Actividad</span>
              <span>Fecha</span>
              <span>Método</span>
              <span>Monto</span>
              <span>Estado pago</span>
            </div>
            {filas.map(({ inscripcion, pago, actividad }) => (
              <div
                key={pago.id}
                className="ah-grid-5"
                style={s("display:grid;grid-template-columns:2fr 1.3fr 1.1fr 1fr 130px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}
              >
                <div>
                  <div style={s("font:700 14px Manrope,sans-serif;color:#0E2A47;")}>{actividad.nombre}</div>
                  <div style={s("font-size:12px;color:#9AAABA;font-weight:600;font-family:ui-monospace,Menlo,monospace;")}>{pago.id}</div>
                </div>
                <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{formatFecha(inscripcion.createdAt)}</span>
                <span style={s("display:flex;align-items:center;gap:6px;font-size:13px;color:#41566B;font-weight:700;")}>
                  {pago.metodo === "Mercado Pago" && (
                    <span style={s("width:18px;height:18px;border-radius:5px;background:#009EE3;display:flex;align-items:center;justify-content:center;flex:none;")}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4}>
                        <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" />
                      </svg>
                    </span>
                  )}
                  {pago.metodo}
                </span>
                <span style={s("font:700 14px Space Grotesk,sans-serif;color:#0E2A47;")}>${pago.monto.toLocaleString("es-AR")}</span>
                <StatusBadge type={pagoStatusType(pago.estado)} />
              </div>
            ))}
          </div>
        )}

        <div style={s("display:flex;gap:11px;background:#EAF1FE;border:1px solid #D5E2FB;border-radius:13px;padding:13px 16px;margin-top:18px;max-width:620px;")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D5BC8" strokeWidth={2} style={s("flex:none;margin-top:1px;")}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span style={s("font-size:13px;line-height:1.5;color:#2D5BC8;font-weight:600;")}>
            En Mercado Pago el dinero queda <strong>Retenido</strong> hasta que la clase se dicta; luego pasa a <strong>Liberado</strong>.
            Si la clase se cancela, se reintegra.
          </span>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:20px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
      <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;margin-bottom:8px;")}>{label}</div>
      <div style={s(`font:700 26px Space Grotesk,sans-serif;color:${color};`)}>{value}</div>
    </div>
  );
}
