import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { formatFecha, formatHora } from "../../lib/mockData";
import { claseStatusType } from "../../lib/status";
import type { EstadoClase } from "../../lib/types";

const ESTADO_DOT: Record<EstadoClase, string> = {
  Programada: "#3A6FF0",
  Habilitada: "#12B5A5",
  Cancelada: "#E5484D",
  Finalizada: "#6B7B8C",
};

export default function InstructorProximasClases() {
  const { currentUser } = useAuth();
  const data = useData();
  const navigate = useNavigate();

  const aprobado = currentUser?.perfilInstructor?.estadoVerificacion === "APROBADO";
  useEffect(() => {
    if (currentUser && !aprobado) navigate("/instructor/solicitud", { replace: true });
  }, [currentUser, aprobado, navigate]);

  const grupos = useMemo(() => {
    if (!currentUser) return [];
    const misActividadIds = new Set(
      data.actividades.filter((a) => a.instructorId === currentUser.id).map((a) => a.id),
    );
    const now = new Date();
    const upcoming = data.clases
      .filter(
        (c) =>
          misActividadIds.has(c.actividadId) &&
          (c.estado === "Programada" || c.estado === "Habilitada") &&
          new Date(c.fechaHora) >= now,
      )
      .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const groupsMap = new Map<string, { dia: string; clases: typeof upcoming }>();
    for (const c of upcoming) {
      const d = new Date(c.fechaHora);
      const dayKey = d.toDateString();
      let dia: string;
      if (dayKey === today.toDateString()) dia = "Hoy";
      else if (dayKey === tomorrow.toDateString()) dia = "Mañana";
      else dia = formatFecha(c.fechaHora);
      if (!groupsMap.has(dayKey)) groupsMap.set(dayKey, { dia, clases: [] });
      groupsMap.get(dayKey)!.clases.push(c);
    }

    return Array.from(groupsMap.values()).map((g) => ({
      dia: g.dia,
      clases: g.clases.map((c) => {
        const act = data.actividades.find((a) => a.id === c.actividadId);
        return {
          id: c.id,
          hora: formatHora(c.fechaHora),
          name: act?.nombre ?? "Actividad",
          lugar: act?.ubicacion ?? "—",
          cupos: `${c.cuposOcupados}/${c.cuposMax}`,
          estado: c.estado,
          dot: ESTADO_DOT[c.estado],
        };
      }),
    }));
  }, [currentUser, data.actividades, data.clases]);

  if (!currentUser || !aprobado) return null;

  return (
    <DashLayout role="instructor" active="proximasclases">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;")}>
        <h1 style={s("font:700 22px Space Grotesk;margin:0;")}>Próximas clases</h1>
        <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>
          Tus clases en orden cronológico — qué se viene primero.
        </p>
      </div>
      <div style={s("max-width:820px;padding:26px 32px 50px;")}>
        {grupos.length === 0 && (
          <div style={s("background:#fff;border:1px dashed #D6DEE7;border-radius:18px;padding:40px;text-align:center;color:#7A8C9E;font-weight:600;")}>
            No tenés clases programadas próximamente.
          </div>
        )}
        {grupos.map((g) => (
          <div key={g.dia} style={s("margin-bottom:24px;")}>
            <div style={s("font:700 12px Manrope;color:#FF6A2B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;")}>
              {g.dia}
            </div>
            <div style={s("display:flex;flex-direction:column;gap:11px;")}>
              {g.clases.map((c) => (
                <div
                  key={c.id}
                  className="ah-hov"
                  onClick={() => navigate(`/instructor/clases/${c.id}`)}
                  style={s(
                    `cursor:pointer;background:#fff;border:1px solid #E7EDF3;border-left:4px solid ${c.dot};border-radius:14px;padding:16px 18px;display:flex;align-items:center;gap:16px;box-shadow:0 1px 2px rgba(14,42,71,.04);flex-wrap:wrap;`,
                  )}
                >
                  <div style={s("text-align:center;flex:none;width:62px;")}>
                    <div style={s("font:700 19px Space Grotesk;color:#0E2A47;")}>{c.hora}</div>
                    <div style={s("font-size:11px;color:#90A1B2;font-weight:700;")}>hs</div>
                  </div>
                  <div style={s("width:1px;height:40px;background:#EEF2F6;flex:none;")} />
                  <div style={s("flex:1;min-width:160px;")}>
                    <div style={s("font:700 16px Manrope;color:#0E2A47;margin-bottom:3px;")}>{c.name}</div>
                    <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;display:flex;align-items:center;gap:6px;")}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {c.lugar}
                    </div>
                  </div>
                  <div style={s("display:flex;align-items:center;gap:14px;flex:none;")}>
                    <span style={s("font-size:13px;color:#41566B;font-weight:700;display:flex;align-items:center;gap:5px;")}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      {c.cupos}
                    </span>
                    <StatusBadge type={claseStatusType(c.estado)} />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C2CCD6" strokeWidth={2}>
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashLayout>
  );
}
