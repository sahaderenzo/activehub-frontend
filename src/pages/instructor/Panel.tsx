import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { formatFecha, formatHora, disponibilidad } from "../../lib/mockData";
import { claseStatusType } from "../../lib/status";

const WEEKDAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];

export default function InstructorPanel() {
  const { currentUser } = useAuth();
  const data = useData();
  const navigate = useNavigate();

  const aprobado = currentUser?.perfilInstructor?.estadoVerificacion === "APROBADO";

  useEffect(() => {
    if (currentUser && !aprobado) navigate("/instructor/solicitud", { replace: true });
  }, [currentUser, aprobado, navigate]);

  const misActividades = useMemo(
    () => (currentUser ? data.actividades.filter((a) => a.instructorId === currentUser.id) : []),
    [data.actividades, currentUser],
  );
  const misActividadIds = useMemo(() => new Set(misActividades.map((a) => a.id)), [misActividades]);
  const misClases = useMemo(
    () => data.clases.filter((c) => misActividadIds.has(c.actividadId)),
    [data.clases, misActividadIds],
  );

  const { bars, weekDays, deltaLabel } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const countFor = (d: Date) =>
      data.inscripciones.filter((insc) => {
        if (insc.estado === "Cancelada") return false;
        const clase = data.clases.find((c) => c.id === insc.claseId);
        if (!clase || !misActividadIds.has(clase.actividadId)) return false;
        return new Date(insc.createdAt).toDateString() === d.toDateString();
      }).length;
    const counts = days.map(countFor);
    const max = Math.max(1, ...counts);
    const bars = counts.map((c) => `${Math.max(8, Math.round((c / max) * 100))}%`);
    const weekDays = days.map((d) => WEEKDAY_LETTERS[d.getDay()]);

    const prevDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (13 - i));
      return d;
    });
    const lastSum = counts.reduce((a, b) => a + b, 0);
    const prevSum = prevDays.map(countFor).reduce((a, b) => a + b, 0);
    const delta = prevSum === 0 ? (lastSum > 0 ? 100 : 0) : Math.round(((lastSum - prevSum) / prevSum) * 100);
    const deltaLabel = `${delta >= 0 ? "+" : ""}${delta}%`;

    return { bars, weekDays, deltaLabel };
  }, [data.inscripciones, data.clases, misActividadIds]);

  const alertas = useMemo(() => {
    const list: { dot: string; text: string }[] = [];

    const pendientes = data.inscripciones.filter((insc) => {
      if (insc.estado !== "PagoPendiente") return false;
      const clase = data.clases.find((c) => c.id === insc.claseId);
      return !!clase && misActividadIds.has(clase.actividadId);
    });
    if (pendientes.length > 0) {
      list.push({
        dot: "#F5A623",
        text: `Tenés ${pendientes.length} pago${pendientes.length > 1 ? "s" : ""} en efectivo pendiente${
          pendientes.length > 1 ? "s" : ""
        } de confirmar.`,
      });
    }

    const now = new Date();
    const clasePocosCupos = misClases
      .filter((c) => (c.estado === "Programada" || c.estado === "Habilitada") && new Date(c.fechaHora) >= now)
      .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime())
      .find((c) => disponibilidad(c).type !== "disponible");
    if (clasePocosCupos) {
      const act = data.actividades.find((a) => a.id === clasePocosCupos.actividadId);
      list.push({
        dot: disponibilidad(clasePocosCupos).type === "sincupos" ? "#E5484D" : "#F5A623",
        text: `"${act?.nombre ?? "Tu clase"}" del ${formatFecha(clasePocosCupos.fechaHora)} tiene ${disponibilidad(
          clasePocosCupos,
        ).label.toLowerCase()}.`,
      });
    }

    const misClaseIds = new Set(misClases.map((c) => c.id));
    const enModeracion = data.resenias.filter((r) => misClaseIds.has(r.claseId) && r.enModeracion).length;
    if (enModeracion > 0) {
      list.push({
        dot: "#3A6FF0",
        text: `Tenés ${enModeracion} reseña${enModeracion > 1 ? "s" : ""} en revisión.`,
      });
    }

    if (list.length === 0) {
      list.push({ dot: "#9AAABA", text: "No tenés alertas nuevas por el momento." });
    }
    return list.slice(0, 3);
  }, [data.inscripciones, data.clases, data.actividades, data.resenias, misActividadIds, misClases]);

  const proximas = useMemo(() => {
    const now = new Date();
    return misClases
      .filter((c) => (c.estado === "Programada" || c.estado === "Habilitada") && new Date(c.fechaHora) >= now)
      .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime())
      .slice(0, 3)
      .map((c) => {
        const act = data.actividades.find((a) => a.id === c.actividadId);
        return {
          id: c.id,
          name: act?.nombre ?? "Actividad",
          time: `${formatFecha(c.fechaHora)} · ${formatHora(c.fechaHora)}`,
          cupos: `${c.cuposOcupados}/${c.cuposMax}`,
          type: claseStatusType(c.estado),
        };
      });
  }, [misClases, data.actividades]);

  if (!currentUser || !aprobado) return null;

  return (
    <DashLayout role="instructor" active="instructor">
      <div
        style={s(
          "background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;display:flex;align-items:center;",
        )}
      >
        <div>
          <h1 style={s("font:700 22px Space Grotesk;margin:0;")}>Panel del instructor</h1>
          <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>
            Bienvenido de nuevo, {currentUser.nombre} 👋
          </p>
        </div>
        <button
          className="ah-btn"
          onClick={() => navigate("/instructor/actividades/nueva")}
          style={s(
            "margin-left:auto;background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:12px 20px;font:700 14px Manrope;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 8px 18px rgba(255,106,43,.26);",
          )}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Crear actividad
        </button>
      </div>
      <div style={s("padding:26px 32px 50px;")}>
        <div className="ah-grid-2" style={s("display:grid;grid-template-columns:1.5fr 1fr;gap:18px;")}>
          <div
            style={s(
              "background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);",
            )}
          >
            <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;")}>
              <div style={s("font:700 16px Space Grotesk;")}>Reservas últimos 7 días</div>
              <span
                style={s(
                  "font:700 12px Manrope;color:#0C8576;background:#E7F8F5;border:1px solid #CBEDE7;padding:4px 10px;border-radius:99px;",
                )}
              >
                {deltaLabel}
              </span>
            </div>
            <div style={s("display:flex;align-items:flex-end;gap:14px;height:160px;")}>
              {bars.map((h, i) => (
                <div
                  key={i}
                  style={s(
                    "flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;justify-content:flex-end;height:100%;",
                  )}
                >
                  <div style={s(`width:100%;border-radius:8px 8px 4px 4px;background:linear-gradient(180deg,#12B5A5,#0FB8A9);height:${h};`)} />
                </div>
              ))}
            </div>
            <div style={s("display:flex;gap:14px;margin-top:10px;")}>
              {weekDays.map((w, i) => (
                <div key={i} style={s("flex:1;text-align:center;font-size:11.5px;color:#90A1B2;font-weight:600;")}>
                  {w}
                </div>
              ))}
            </div>
          </div>
          <div
            style={s(
              "background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);",
            )}
          >
            <div style={s("font:700 16px Space Grotesk;margin-bottom:18px;")}>Alertas y solicitudes</div>
            <div style={s("display:flex;flex-direction:column;gap:14px;")}>
              {alertas.map((a, i) => (
                <div key={i} style={s("display:flex;gap:11px;align-items:flex-start;")}>
                  <span style={s(`width:9px;height:9px;border-radius:99px;background:${a.dot};flex:none;margin-top:5px;`)} />
                  <span style={s("font-size:13.5px;color:#41566B;font-weight:600;line-height:1.45;")}>{a.text}</span>
                </div>
              ))}
            </div>
            <div style={s("height:1px;background:#EEF2F6;margin:18px 0;")} />
            <div style={s("font:700 14px Space Grotesk;margin-bottom:14px;")}>Próximas clases</div>
            <div style={s("display:flex;flex-direction:column;gap:11px;")}>
              {proximas.length === 0 && (
                <span style={s("font-size:13px;color:#90A1B2;font-weight:600;")}>No tenés clases próximas.</span>
              )}
              {proximas.map((p) => (
                <div key={p.id} style={s("display:flex;align-items:center;gap:10px;")}>
                  <div style={s("flex:1;min-width:0;")}>
                    <div
                      style={s(
                        "font:700 13.5px Manrope;color:#0E2A47;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
                      )}
                    >
                      {p.name}
                    </div>
                    <div style={s("font-size:12px;color:#90A1B2;font-weight:600;")}>
                      {p.time} · {p.cupos}
                    </div>
                  </div>
                  <StatusBadge type={p.type} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashLayout>
  );
}
