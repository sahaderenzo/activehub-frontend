import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import { CargandoSeccion } from "../../components/Cargando";
import StatusBadge from "../../components/StatusBadge";
import FiltroActividad, { TODAS_LAS_ACTIVIDADES } from "../../components/FiltroActividad";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import type { MiClaseInstructor } from "../../context/DataContext";
import { formatFecha, formatHora } from "../../lib/mockData";
import { claseStatusType } from "../../lib/status";

type Filtro = "todas" | "Finalizada" | "Cancelada";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "Finalizada", label: "Finalizadas" },
  { key: "Cancelada", label: "Canceladas" },
];

/**
 * Historial de clases dictadas y canceladas.
 *
 * Existe porque el instructor no tenía ninguna pantalla donde ver sus clases pasadas:
 * "Próximas clases" sólo lista futuras y el detalle de actividad excluye Finalizada y
 * Cancelada (ObtenerActividadService.ESTADOS_EXCLUIDOS), así que una vez dictada, una
 * clase desaparecía de la vista del instructor.
 */
export default function InstructorHistorialClases() {
  const { currentUser } = useAuth();
  const data = useData();
  const navigate = useNavigate();

  const aprobado = currentUser?.perfilInstructor?.estadoVerificacion === "APROBADO";
  useEffect(() => {
    if (currentUser && !aprobado) navigate("/instructor/solicitud", { replace: true });
  }, [currentUser, aprobado, navigate]);

  const [misClases, setMisClases] = useState<MiClaseInstructor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [actividadId, setActividadId] = useState<string>(TODAS_LAS_ACTIVIDADES);

  const cargar = useCallback(() => {
    if (!aprobado) return;
    data
      .listarMisClases()
      .then((clases) => {
        setMisClases(clases);
        setErrorCarga(false);
      })
      .catch(() => setErrorCarga(true))
      .finally(() => setCargando(false));
  }, [aprobado, data.listarMisClases]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const pasadas = useMemo(
    () =>
      misClases
        .filter((c) => c.estado === "Finalizada" || c.estado === "Cancelada")
        // Más recientes primero: es un historial, no una agenda.
        .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()),
    [misClases],
  );

  // El filtro de actividad va primero y los conteos de estado se calculan sobre lo que deja:
  // "Finalizadas (3)" tiene que ser de la actividad elegida, no del historial entero.
  const deLaActividad = useMemo(
    () => (actividadId === TODAS_LAS_ACTIVIDADES ? pasadas : pasadas.filter((c) => c.actividadId === actividadId)),
    [pasadas, actividadId],
  );

  const visibles = useMemo(
    () => (filtro === "todas" ? deLaActividad : deLaActividad.filter((c) => c.estado === filtro)),
    [deLaActividad, filtro],
  );

  const conteos = useMemo(
    () => ({
      todas: deLaActividad.length,
      Finalizada: deLaActividad.filter((c) => c.estado === "Finalizada").length,
      Cancelada: deLaActividad.filter((c) => c.estado === "Cancelada").length,
    }),
    [deLaActividad],
  );

  if (!currentUser || !aprobado) return null;

  return (
    <DashLayout role="instructor" active="historial">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;")}>
        <h1 style={s("font:700 22px Space Grotesk;margin:0;")}>Historial de clases</h1>
        <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>
          Tus clases ya dictadas y las que cancelaste, de la más reciente a la más vieja.
        </p>
      </div>

      <div style={s("max-width:900px;padding:26px 32px 50px;")}>
        {/* Los filtros aparecen con sus conteos ya calculados, no en (0). */}
        {!cargando && !errorCarga && pasadas.length > 0 && (
          <div style={s("margin-bottom:14px;")}>
            <FiltroActividad clases={pasadas} valor={actividadId} onChange={setActividadId} />
          </div>
        )}
        <div style={s("display:flex;gap:9px;margin-bottom:20px;flex-wrap:wrap;")}>
          {(cargando ? [] : FILTROS).map((f) => {
            const on = filtro === f.key;
            return (
              <button
                key={f.key}
                className="ah-btn"
                onClick={() => setFiltro(f.key)}
                style={s(
                  `background:${on ? "#0E2A47" : "#fff"};color:${on ? "#fff" : "#41566B"};border:1px solid ${
                    on ? "#0E2A47" : "#D6DEE7"
                  };border-radius:999px;padding:8px 16px;font:700 13px Manrope;cursor:pointer;`,
                )}
              >
                {f.label} ({conteos[f.key]})
              </button>
            );
          })}
        </div>

        {errorCarga && (
          <div style={s("background:#FBEAEB;border:1px solid #F3D2D3;border-radius:18px;padding:24px;text-align:center;")}>
            <div style={s("color:#BE3A3E;font-weight:700;font-size:14px;margin-bottom:12px;")}>
              No se pudo cargar el historial de clases.
            </div>
            <button
              className="ah-btn"
              onClick={() => { setCargando(true); cargar(); }}
              style={s(
                "background:#fff;border:1px solid #D6DEE7;border-radius:10px;padding:9px 16px;font:700 13px Manrope;color:#41566B;cursor:pointer;",
              )}
            >
              Reintentar
            </button>
          </div>
        )}

        {!errorCarga && cargando && <CargandoSeccion seccion="el historial" />}

        {!errorCarga && !cargando && visibles.length === 0 && (
          <div
            style={s(
              "background:#fff;border:1px dashed #D6DEE7;border-radius:18px;padding:40px;text-align:center;color:#7A8C9E;font-weight:600;",
            )}
          >
            {pasadas.length === 0
              ? "Todavía no tenés clases dictadas ni canceladas."
              : "No hay clases con esos filtros."}
          </div>
        )}

        {!errorCarga && visibles.length > 0 && (
          <div style={s("display:flex;flex-direction:column;gap:11px;")}>
            {visibles.map((c) => (
              // El click abre la misma pantalla de la clase que usa "Mis actividades", en modo
              // consulta (sin editar, cancelar ni cobrar): quiénes se inscribieron, qué pagó cada
              // uno y qué pasó con ese pago. `desde=historial` hace que "Volver" regrese acá.
              <div
                key={c.claseId}
                className="ah-hov"
                role="button"
                tabIndex={0}
                title="Ver el detalle de la clase"
                onClick={() => navigate(`/instructor/clases/${c.claseId}?desde=historial`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate(`/instructor/clases/${c.claseId}?desde=historial`);
                }}
                style={s(
                  `cursor:pointer;background:#fff;border:1px solid #E7EDF3;border-left:4px solid ${
                    c.estado === "Cancelada" ? "#E5484D" : "#6B7B8C"
                  };border-radius:14px;padding:16px 18px;display:flex;align-items:center;gap:16px;box-shadow:0 1px 2px rgba(14,42,71,.04);`,
                )}
              >
                <div style={s("min-width:96px;")}>
                  <div style={s("font:700 15px Space Grotesk;color:#0E2A47;")}>{formatHora(c.fechaHora)}</div>
                  <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;")}>{formatFecha(c.fechaHora)}</div>
                </div>
                <div style={s("width:1px;align-self:stretch;background:#EEF2F6;")} />
                <div style={s("flex:1;min-width:0;")}>
                  <div
                    style={s(
                      "font:700 14.5px Manrope;color:#0E2A47;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
                    )}
                  >
                    {c.actividadNombre}
                  </div>
                  <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:600;")}>📍 {c.actividadUbicacion}</div>
                </div>
                <span style={s("font-size:12.5px;color:#41566B;font-weight:700;flex:none;text-align:right;")}>
                  {c.cuposOcupados}/{c.cuposMax} inscriptos
                  <br />
                  <span
                    title={
                      c.estado === 'Cancelada'
                        ? 'La clase se canceló: los pagos se reintegraron.'
                        : `${c.cuposOcupados} inscriptos × $${c.precio.toLocaleString('es-AR')}`
                    }
                    style={s(
                      `font:700 13px Space Grotesk;color:${c.estado === 'Cancelada' ? '#A6B3C0' : '#0C8576'};`,
                    )}
                  >
                    {c.estado === 'Cancelada' ? '$0' : `$${(c.precio * c.cuposOcupados).toLocaleString('es-AR')}`}
                  </span>
                </span>
                <StatusBadge type={claseStatusType(c.estado)} />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C2CCD6" strokeWidth={2} style={{ flex: "none" }}>
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashLayout>
  );
}
