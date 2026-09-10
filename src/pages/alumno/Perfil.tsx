import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import AlumnoNav from "../../components/AlumnoNav";
import StatusBadge from "../../components/StatusBadge";
import Avatar from "../../components/Avatar";
import ErrorReintentar from "../../components/ErrorReintentar";
import ActivityPhoto from "../../components/ActivityPhoto";
import { s } from "../../lib/style";
import { useAuth, passwordStrength } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";
import { useData } from "../../context/DataContext";
import type { MiDenuncia, MiResenia, MiInscripcion } from "../../context/DataContext";
import { formatFecha } from "../../lib/mockData";
import { inscripcionStatusType } from "../../lib/status";



const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatMesAnio(iso: string): string {
  const d = new Date(iso);
  return `${MESES[d.getMonth()]}. ${d.getFullYear()}`;
}

function formatDDMMYYYY(iso?: string): string {
  if (!iso) return "No especificada";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AlumnoPerfil() {
  const navigate = useNavigate();
  const {
    currentUser,
    logout,
    actualizarMiPerfil,
    actualizarMisIntereses,
    cambiarMiContrasenia,
    darDeBajaMiCuenta,
  } = useAuth();
  const data = useData();

  const [misResenias, setMisResenias] = useState<MiResenia[]>([]);
  const [claseIdsInscriptoFinalizada, setClaseIdsInscriptoFinalizada] = useState<string[]>([]);
  const [misDenuncias, setMisDenuncias] = useState<MiDenuncia[]>([]);
  const [errorResumen, setErrorResumen] = useState(false);
  const [misInscripciones, setMisInscripciones] = useState<MiInscripcion[]>([]);

  // Los tres accesos rápidos muestran contadores; si la carga falla, decían "0 hechas ·
  // 0 pendientes", que es información falsa, no un estado vacío.
  const cargarResumen = useCallback(() => {
    if (!currentUser) return;
    // Sin filtro de estado: la misma consulta alimenta el historial (todas) y el contador de
    // reseñas pendientes (solo las Inscripto ya finalizadas).
    Promise.all([data.listarMisResenas(), data.listarMisInscripciones(), data.listarMisDenuncias()])
      .then(([resenias, inscripcionesAlumno, denuncias]) => {
        setMisResenias(resenias);
        setMisInscripciones(inscripcionesAlumno);
        setClaseIdsInscriptoFinalizada(
          inscripcionesAlumno
            .filter((i) => i.estado === "Inscripto" && i.claseEstado === "Finalizada")
            .map((i) => i.claseId),
        );
        setMisDenuncias(denuncias);
        setErrorResumen(false);
      })
      .catch(() => setErrorResumen(true));
  }, [currentUser, data.listarMisResenas, data.listarMisInscripciones, data.listarMisDenuncias]);

  useEffect(() => {
    cargarResumen();
  }, [cargarResumen]);

  const [fotoVersion, setFotoVersion] = useState(0);
  const [fotoAmpliada, setFotoAmpliada] = useState(false);

  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(currentUser?.nombre ?? "");
  const [apellido, setApellido] = useState(currentUser?.apellido ?? "");
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [telefono, setTelefono] = useState(currentUser?.telefono ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(currentUser?.fechaNacimiento ?? "");
  const [guardando, setGuardando] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [errorIntereses, setErrorIntereses] = useState<string | null>(null);
  const [okPerfil, setOkPerfil] = useState<string | null>(null);

  // Cambio de contraseña (E3A-HU12 criterio 6).
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [passRepetir, setPassRepetir] = useState("");
  const [errorPass, setErrorPass] = useState<string | null>(null);
  const [okPass, setOkPass] = useState<string | null>(null);
  const [notifs, setNotifs] = useState([
    { label: "Nuevas clases disponibles", on: true },
    { label: "Recordatorios antes de la clase", on: true },
    { label: "Promociones y novedades", on: false },
    { label: "Respuestas a tus reseñas", on: true },
  ]);

  const intereses = currentUser?.perfilAlumno?.intereses ?? [];
  const idsElegidos = new Set(intereses.map((i) => i.tipoActividadId));

  // El catálogo de intereses es la taxonomía real: los tipos de actividad agrupados por su
  // categoría. Antes era una lista fija en el frontend, sin relación con nada.
  const disponiblesPorCategoria = useMemo(() => {
    const grupos = new Map<string, { categoria: string; tipos: { id: string; nombre: string }[] }>();
    for (const tipo of data.tiposActividad) {
      if (idsElegidos.has(tipo.id)) continue;
      const categoria = data.getCategoria(tipo.categoriaId);
      const clave = categoria?.id ?? "otros";
      if (!grupos.has(clave)) grupos.set(clave, { categoria: categoria?.nombre ?? "Otros", tipos: [] });
      grupos.get(clave)!.tipos.push({ id: tipo.id, nombre: tipo.nombre });
    }
    return [...grupos.values()].sort((a, b) => a.categoria.localeCompare(b.categoria));
  }, [data.tiposActividad, data.getCategoria, idsElegidos]);

  // Las 4 últimas inscripciones del alumno, reales. Antes esto cruzaba el dataset mock
  // (`data.inscripciones`) con la caché parcial `data.clases`, así que para una cuenta real
  // el bloque estaba siempre vacío.
  const historial = useMemo(
    () => [...misInscripciones].sort((a, b) => b.claseFechaHora.localeCompare(a.claseFechaHora)).slice(0, 4),
    [misInscripciones],
  );

  const reseniasPendientes = useMemo(() => {
    const claseIdsReseñadas = new Set(misResenias.map((r) => r.claseId));
    return claseIdsInscriptoFinalizada.filter((id) => !claseIdsReseñadas.has(id)).length;
  }, [claseIdsInscriptoFinalizada, misResenias]);

  const denunciasPendientes = misDenuncias.filter((d) => d.estado === "Pendiente").length;
  const denunciasAuditoria = misDenuncias.filter((d) => d.estado === "En Auditoría").length;

  if (!currentUser) return null;

  const guardarEdicion = async () => {
    setErrorPerfil(null);
    setOkPerfil(null);
    if (!nombre.trim() || !apellido.trim()) return setErrorPerfil("Este campo es obligatorio.");
    if (!EMAIL_RE.test(email)) return setErrorPerfil("Ingresá un correo electrónico válido.");
    // @NotBlank en ActualizarMiPerfilRequest: vacío también es inválido.
    if (!/^\+?[0-9 ]+$/.test(telefono)) return setErrorPerfil("El teléfono es obligatorio y debe contener solo números.");

    setGuardando(true);
    try {
      await actualizarMiPerfil({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        fechaNacimiento: fechaNacimiento || undefined,
      });
      setOkPerfil("Tus datos fueron actualizados correctamente.");
      setEditando(false);
    } catch (err) {
      setErrorPerfil(err instanceof ApiError ? err.message : "No pudimos guardar los cambios. Intentá de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPassword = async () => {
    setErrorPass(null);
    setOkPass(null);
    if (passNueva !== passRepetir) return setErrorPass("Las contraseñas nuevas no coinciden.");
    if (!passwordStrength(passNueva).ok) {
      return setErrorPass("La contraseña necesita al menos 8 caracteres, una mayúscula y un número.");
    }
    try {
      await cambiarMiContrasenia(passActual, passNueva);
      setOkPass("Contraseña actualizada correctamente.");
      setPassActual("");
      setPassNueva("");
      setPassRepetir("");
      setMostrarPassword(false);
    } catch (err) {
      setErrorPass(err instanceof ApiError ? err.message : "No pudimos cambiar la contraseña.");
    }
  };

  const darDeBaja = async () => {
    if (!window.confirm("¿Estás seguro? Esta acción desactivará tu cuenta.")) return;
    try {
      await darDeBajaMiCuenta();
      navigate("/");
    } catch (err) {
      setErrorPerfil(err instanceof ApiError ? err.message : "No pudimos dar de baja tu cuenta.");
    }
  };

  const cancelarEdicion = () => {
    setNombre(currentUser.nombre);
    setApellido(currentUser.apellido);
    setEmail(currentUser.email);
    setTelefono(currentUser.telefono ?? "");
    setFechaNacimiento(currentUser.fechaNacimiento ?? "");
    setErrorPerfil(null);
    setEditando(false);
  };

  // Ya no es el store mock: se guardan contra la API y sobreviven al recargar.
  const guardarIntereses = async (siguientes: string[]) => {
    setErrorIntereses(null);
    try {
      await actualizarMisIntereses(siguientes);
    } catch (err) {
      setErrorIntereses(err instanceof ApiError ? err.message : "No pudimos guardar tus intereses.");
    }
  };

  const quitarInteres = (tipoId: string) =>
    guardarIntereses(intereses.filter((x) => x.tipoActividadId !== tipoId).map((x) => x.tipoActividadId));
  const agregarInteres = (tipoId: string) => guardarIntereses([...idsElegidos, tipoId]);

  const cerrarSesion = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <AlumnoNav active="home" />
      <div style={s("max-width:1000px;margin:0 auto;padding:30px 28px 60px;")}>
        <div
          style={s(
            "background:linear-gradient(135deg,#0E2A47,#143A5E);border-radius:22px;padding:28px 32px;display:flex;align-items:center;gap:22px;margin-bottom:26px;position:relative;overflow:hidden;flex-wrap:wrap;",
          )}
        >
          <div style={s("position:absolute;top:-60px;right:-20px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(18,181,165,.26),transparent 70%);")} />
          <Avatar
            usuarioId={currentUser.id}
            nombre={currentUser.nombre}
            size={84}
            fontSize={34}
            gradient="linear-gradient(140deg,#12B5A5,#FF6A2B)"
            version={fotoVersion}
            onUpload={
              editando
                ? async (archivo) => {
                    await data.subirFotoPerfil(archivo);
                    setFotoVersion((v) => v + 1);
                  }
                : undefined
            }
            onClick={editando ? undefined : () => setFotoAmpliada(true)}
          />
          <div style={s("position:relative;flex:1;min-width:200px;")}>
            <h1 style={s("font:700 26px Space Grotesk,sans-serif;color:#fff;margin:0 0 5px;")}>
              {currentUser.nombre} {currentUser.apellido}
            </h1>
            <div style={s("display:flex;flex-wrap:wrap;gap:16px;font-size:13.5px;color:#9DB3C9;font-weight:600;")}>
              <span style={s("display:flex;align-items:center;gap:6px;")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#12B5A5" strokeWidth={2}>
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 5L2 7" />
                </svg>
                {currentUser.email}
              </span>
              <span style={s("display:flex;align-items:center;gap:6px;")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#12B5A5" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Miembro desde {formatMesAnio(currentUser.createdAt)}
              </span>
            </div>
          </div>
          <div style={s("position:relative;display:flex;gap:10px;")}>
            <button
              className="ah-btn"
              onClick={cerrarSesion}
              style={s(
                "background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:12px;padding:12px 18px;font:700 14px Manrope,sans-serif;cursor:pointer;",
              )}
            >
              Cerrar sesión
            </button>
            <button
              className="ah-btn"
              onClick={() => (editando ? cancelarEdicion() : setEditando(true))}
              style={s(
                "background:#fff;color:#0E2A47;border:none;border-radius:12px;padding:12px 20px;font:700 14px Manrope,sans-serif;cursor:pointer;display:flex;align-items:center;gap:8px;",
              )}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0E2A47" strokeWidth={2}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
              </svg>
              {editando ? "Cancelar edición" : "Editar perfil"}
            </button>
          </div>
        </div>

        {errorResumen && (
          <div style={s("margin-bottom:16px;")}>
            <ErrorReintentar
              mensaje="No pudimos cargar tus reseñas, denuncias y clases. Los contadores de abajo pueden no ser exactos."
              onReintentar={cargarResumen}
              variant="banner"
            />
          </div>
        )}

        <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;")}>
          <QuickLink
            onClick={() => navigate("/alumno/mis-pagos")}
            bg="#FFF3E0"
            stroke="#B9741A"
            title="Mis pagos"
            caption="Historial y comprobantes"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </QuickLink>
          <QuickLink
            onClick={() => navigate("/alumno/mis-resenas")}
            bg="#FFF4EE"
            stroke="#FF6A2B"
            title="Mis reseñas"
            caption={`${misResenias.length} hechas · ${reseniasPendientes} pendientes`}
          >
            <path d="M11.5 3.5 13.8 8l5 .7-3.6 3.5.9 5L11.5 15l-4.5 2.4.9-5L4.3 8.7l5-.7z" />
          </QuickLink>
          <QuickLink
            onClick={() => navigate("/alumno/mis-denuncias")}
            bg="#FBEAEB"
            stroke="#BE3A3E"
            title="Mis denuncias"
            caption={`${denunciasPendientes} pendiente · ${denunciasAuditoria} en auditoría`}
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </QuickLink>
        </div>

        <div className="ah-grid-2" style={s("display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;")}>
          <div style={s("display:flex;flex-direction:column;gap:20px;")}>
            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:18px;")}>Datos personales</div>
              {okPerfil && !editando && <Aviso tono="ok" texto={okPerfil} />}
              {!editando ? (
                <div style={s("display:flex;flex-direction:column;gap:14px;")}>
                  <DataRow label="Nombre completo" value={`${currentUser.nombre} ${currentUser.apellido}`} />
                  <div style={s("height:1px;background:#EEF2F6;")} />
                  <DataRow label="Teléfono" value={currentUser.telefono || "No especificado"} />
                  <div style={s("height:1px;background:#EEF2F6;")} />
                  <DataRow label="Fecha de nacimiento" value={formatDDMMYYYY(currentUser.fechaNacimiento)} />
                  <div style={s("height:1px;background:#EEF2F6;")} />
                  <DataRow label="DNI" value={currentUser.dni || "No especificado"} />
                  <div style={s("height:1px;background:#EEF2F6;")} />
                  <DataRow label="Email" value={currentUser.email} />
                </div>
              ) : (
                <div style={s("display:flex;flex-direction:column;gap:12px;")}>
                  <Field label="Nombre" value={nombre} onChange={setNombre} />
                  <Field label="Apellido" value={apellido} onChange={setApellido} />
                  <Field label="Email" value={email} onChange={setEmail} type="email" />
                  <Field label="Teléfono" value={telefono} onChange={setTelefono} />
                  <Field label="Fecha de nacimiento" value={fechaNacimiento} onChange={setFechaNacimiento} type="date" />
                  {errorPerfil && <Aviso tono="error" texto={errorPerfil} />}
                  <div style={s("display:flex;gap:10px;margin-top:6px;")}>
                    <button
                      className="ah-btn"
                      onClick={cancelarEdicion}
                      disabled={guardando}
                      style={s("flex:1;background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:11px;font:700 13.5px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
                    >
                      Cancelar
                    </button>
                    <button
                      className="ah-btn"
                      onClick={guardarEdicion}
                      disabled={guardando}
                      style={s(
                        `flex:1;background:${guardando ? "#F0B392" : "#FF6A2B"};border:none;border-radius:11px;padding:11px;font:700 13.5px Manrope,sans-serif;color:#fff;cursor:${guardando ? "wait" : "pointer"};`,
                      )}
                    >
                      {guardando ? "Guardando…" : "Guardar cambios"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:6px;")}>Intereses deportivos</div>
              <p style={s("font-size:13px;color:#8194A8;margin:0 0 14px;")}>Usamos esto para tus recomendaciones.</p>
              {errorIntereses && (
                <div style={s("background:#FBEAEB;border:1px solid #F3D2D3;border-radius:10px;padding:9px 12px;font:600 12.5px Manrope,sans-serif;color:#BE3A3E;margin-bottom:12px;")}>
                  {errorIntereses}
                </div>
              )}
              <div style={s("display:flex;flex-wrap:wrap;gap:9px;")}>
                {intereses.map((i) => (
                  <span
                    key={i.tipoActividadId}
                    onClick={() => quitarInteres(i.tipoActividadId)}
                    className="ah-btn"
                    style={s(
                      "cursor:pointer;padding:8px 15px;border-radius:999px;font:700 13.5px Manrope,sans-serif;background:#E7F8F5;color:#0C8576;border:1px solid #CBEDE7;display:flex;align-items:center;gap:6px;",
                    )}
                    title={`Quitar "${i.nombre}" (${i.categoria})`}
                  >
                    {i.nombre}
                    <span style={s("font:600 10.5px Manrope,sans-serif;color:#5FA79B;")}>· {i.categoria}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={3}>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </span>
                ))}
                {disponiblesPorCategoria.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => e.target.value && agregarInteres(e.target.value)}
                    style={s(
                      "padding:8px 12px;border-radius:999px;font:700 13px Manrope,sans-serif;background:#fff;color:#65788C;border:1px dashed #C9D5E1;cursor:pointer;",
                    )}
                  >
                    <option value="">+ Agregar interés</option>
                    {/* Agrupados por categoría: es la taxonomía real, no una lista suelta. */}
                    {disponiblesPorCategoria.map((grupo) => (
                      <optgroup key={grupo.categoria} label={grupo.categoria}>
                        {grupo.tipos.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nombre}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div style={s("display:flex;flex-direction:column;gap:20px;")}>
            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:16px;")}>Historial de actividades</div>
              {historial.length === 0 ? (
                <p style={s("font-size:13.5px;color:#9AAABA;font-weight:600;margin:0;")}>Todavía no tenés clases registradas.</p>
              ) : (
                <div style={s("display:flex;flex-direction:column;gap:13px;")}>
                  {historial.map((i) => (
                    <div key={i.id} style={s("display:flex;align-items:center;gap:12px;")}>
                      <span style={s("width:36px;height:36px;border-radius:10px;background:#EEF4FB;flex:none;position:relative;overflow:hidden;display:block;")}>
                        <ActivityPhoto actividadId={i.actividadId} />
                      </span>
                      <div style={s("flex:1;")}>
                        <div style={s("font:700 14px Manrope,sans-serif;color:#0E2A47;")}>{i.actividadNombre}</div>
                        <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;")}>{formatFecha(i.claseFechaHora)}</div>
                      </div>
                      <StatusBadge type={inscripcionStatusType(i.estado)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:6px;")}>Notificaciones</div>
              <p style={s("font-size:13px;color:#8194A8;margin:0 0 16px;")}>Elegí sobre qué querés que te avisemos.</p>
              <div style={s("display:flex;flex-direction:column;gap:15px;")}>
                {notifs.map((n, idx) => (
                  <div key={n.label} style={s("display:flex;align-items:center;justify-content:space-between;gap:12px;")}>
                    <span style={s("font-size:14px;color:#41566B;font-weight:600;")}>{n.label}</span>
                    <span
                      onClick={() => setNotifs((prev) => prev.map((x, i) => (i === idx ? { ...x, on: !x.on } : x)))}
                      style={s(
                        `width:42px;height:24px;border-radius:99px;background:${n.on ? "#12B5A5" : "#D8E0E7"};position:relative;flex:none;cursor:pointer;transition:background .2s;`,
                      )}
                    >
                      <span
                        style={s(
                          `position:absolute;top:3px;left:${n.on ? "21px" : "3px"};width:18px;height:18px;border-radius:99px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:left .2s;`,
                        )}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:6px;")}>Seguridad de la cuenta</div>
              <p style={s("font-size:13px;color:#8194A8;margin:0 0 16px;")}>Cambiá tu contraseña o cerrá tu cuenta.</p>

              {okPass && <Aviso tono="ok" texto={okPass} />}

              {!mostrarPassword ? (
                <button
                  className="ah-btn"
                  onClick={() => {
                    setOkPass(null);
                    setErrorPass(null);
                    setMostrarPassword(true);
                  }}
                  style={s("width:100%;background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:11px;font:700 13.5px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
                >
                  Cambiar contraseña
                </button>
              ) : (
                <div style={s("display:flex;flex-direction:column;gap:12px;")}>
                  <Field label="Contraseña actual" value={passActual} onChange={setPassActual} type="password" />
                  <Field label="Contraseña nueva" value={passNueva} onChange={setPassNueva} type="password" />
                  {passNueva.length > 0 && (
                    <span style={s(`font-size:12.5px;font-weight:700;color:${passwordStrength(passNueva).color};`)}>
                      {passwordStrength(passNueva).label}
                    </span>
                  )}
                  <Field label="Repetir contraseña nueva" value={passRepetir} onChange={setPassRepetir} type="password" />
                  {errorPass && <Aviso tono="error" texto={errorPass} />}
                  <div style={s("display:flex;gap:10px;")}>
                    <button
                      className="ah-btn"
                      onClick={() => {
                        setMostrarPassword(false);
                        setPassActual("");
                        setPassNueva("");
                        setPassRepetir("");
                        setErrorPass(null);
                      }}
                      style={s("flex:1;background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:11px;font:700 13.5px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
                    >
                      Cancelar
                    </button>
                    <button
                      className="ah-btn"
                      onClick={cambiarPassword}
                      style={s("flex:1;background:#FF6A2B;border:none;border-radius:11px;padding:11px;font:700 13.5px Manrope,sans-serif;color:#fff;cursor:pointer;")}
                    >
                      Guardar contraseña
                    </button>
                  </div>
                </div>
              )}

              <div style={s("height:1px;background:#EEF2F6;margin:18px 0;")} />
              <div style={s("font-size:13px;color:#8194A8;margin-bottom:10px;")}>
                Al darte de baja perdés el acceso a la plataforma. Tus clases futuras quedan canceladas.
              </div>
              <button
                className="ah-btn"
                onClick={darDeBaja}
                style={s("width:100%;background:#fff;border:1px solid #F3C6C7;border-radius:11px;padding:11px;font:700 13.5px Manrope,sans-serif;color:#BE3A3E;cursor:pointer;")}
              >
                Dar de baja mi cuenta
              </button>
              {errorPerfil && !editando && <Aviso tono="error" texto={errorPerfil} />}
            </div>
          </div>
        </div>
      </div>

      {fotoAmpliada && (
        <div
          onClick={() => setFotoAmpliada(false)}
          style={s(
            "position:fixed;inset:0;z-index:80;background:rgba(8,22,38,.72);display:flex;align-items:center;justify-content:center;",
          )}
        >
          <div style={s("position:relative;")} onClick={(e) => e.stopPropagation()}>
            <Avatar
              usuarioId={currentUser.id}
              nombre={currentUser.nombre}
              size={280}
              fontSize={100}
              gradient="linear-gradient(140deg,#12B5A5,#FF6A2B)"
              version={fotoVersion}
            />
            <span
              onClick={() => setFotoAmpliada(false)}
              className="ah-btn"
              style={s(
                "position:absolute;top:-6px;right:-6px;width:34px;height:34px;border-radius:99px;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);",
              )}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0E2A47" strokeWidth={2.5}>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickLink({
  onClick,
  bg,
  stroke,
  title,
  caption,
  children,
}: {
  onClick: () => void;
  bg: string;
  stroke: string;
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className="ah-hov"
      style={s(
        "cursor:pointer;background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:18px 20px;display:flex;align-items:center;gap:14px;box-shadow:0 1px 2px rgba(14,42,71,.04);",
      )}
    >
      <span style={s(`width:44px;height:44px;border-radius:12px;background:${bg};display:flex;align-items:center;justify-content:center;flex:none;`)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2}>
          {children}
        </svg>
      </span>
      <div style={s("flex:1;")}>
        <div style={s("font:700 15px Manrope,sans-serif;color:#0E2A47;")}>{title}</div>
        <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;")}>{caption}</div>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C2CCD6" strokeWidth={2}>
        <path d="m9 18 6-6-6-6" />
      </svg>
    </div>
  );
}

function Aviso({ tono, texto }: { tono: "ok" | "error"; texto: string }) {
  const c =
    tono === "ok"
      ? "background:#E7F8F5;border:1px solid #CBEDE7;color:#0C8576;"
      : "background:#FBEAEB;border:1px solid #F3C6C7;color:#BE3A3E;";
  return (
    <div style={s(`${c}border-radius:10px;padding:10px 12px;font:600 13px Manrope,sans-serif;margin:10px 0 0;`)} role="alert">
      {texto}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={s("display:flex;justify-content:space-between;align-items:center;")}>
      <span style={s("font-size:13.5px;color:#7A8C9E;font-weight:600;")}>{label}</span>
      <span style={s("font:700 14px Manrope,sans-serif;color:#0E2A47;")}>{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label style={s("display:flex;flex-direction:column;gap:6px;")}>
      <span style={s("font-size:12.5px;color:#7A8C9E;font-weight:700;")}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={s("border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 14px Manrope,sans-serif;color:#0E2A47;")}
      />
    </label>
  );
}
