import { useCallback, useEffect, useMemo, useState } from "react";
import DashLayout from "../../components/DashLayout";
import ErrorReintentar from "../../components/ErrorReintentar";
import { CargandoSeccion } from "../../components/Cargando";
import { s } from "../../lib/style";
import { useData, type PermisoAdmin, type RolAdmin, type UsuarioAdmin } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";

/**
 * E4Ad-HU08 · Configurar Roles y Permisos.
 *
 * Los checkboxes salen de `ConfiguracionRol` (RN-19) y el guardado manda la foto completa
 * del rol: lo que no viaja queda deshabilitado.
 *
 * <p><b>Un rol por vez, elegido en un combo.</b> Antes la pantalla era una matriz de N
 * columnas (una por rol) con la lista de roles fija a la izquierda. Con los tres roles del
 * sistema entraba justo; en cuanto el admin crea roles propios —que es el punto de la
 * pantalla— la grilla se vuelve ilegible y hay que scrollear en horizontal para saber qué
 * columna es cuál. Con el combo, la lista de permisos ocupa todo el ancho y se lee de
 * corrido; el borrador sigue siendo por rol, así que se puede cambiar de rol sin perder lo
 * tocado y "Guardar cambios" manda todos los roles que cambiaron.
 *
 * <p>Dos cosas que la pantalla NO deja hacer, y por qué:
 * <ul>
 *   <li>Los permisos <b>implícitos</b> (`configurable: false`) no aparecen. Los tiene todo rol
 *       y no se pueden apagar — como checkbox solo servían para romper un rol sin querer.</li>
 *   <li>Los permisos <b>críticos</b> del rol Administrador salen bloqueados. El backend los
 *       rechaza igual (criterio 6), pero enterarse recién al guardar es peor que no poder
 *       tocarlos: sin `usuarios.gestionar` ni `roles.configurar` no habría forma de volver
 *       atrás desde la propia pantalla y el sistema quedaría sin gobierno hasta tocar la base
 *       a mano.</li>
 * </ul>
 */

const ETIQUETAS: Record<string, string> = {
  ALUMNO: "Alumno",
  INSTRUCTOR: "Instructor",
  ADMIN: "Administrador",
};

/** El rol del sistema al que no se le pueden sacar los permisos críticos. */
const ROL_ADMIN = "ADMIN";

/**
 * Las dos mitades de E4Ad-HU08, que son preguntas distintas y estaban mezcladas en una sola
 * pantalla:
 *
 * <ul>
 *   <li><b>Roles y permisos</b> — "qué puede hacer este ROL". Se edita el rol y el cambio
 *       alcanza a todos los que lo tengan.</li>
 *   <li><b>Roles de los usuarios</b> — "qué rol tiene esta PERSONA". Se cambia una cuenta y no
 *       se toca ningún permiso.</li>
 * </ul>
 *
 * <p>Lo segundo existía sólo escondido en el modal de edición de `admin/Gestion.tsx`, que es
 * la pantalla de datos personales: para cambiarle el rol a alguien había que entrar a editar
 * su nombre y su teléfono. Sigue estando ahí (no se sacó, es el flujo de "editar usuario"),
 * pero ahora también vive donde uno lo busca.
 */
type Seccion = "permisos" | "usuarios";

function Switch({ on, disabled }: { on: boolean; disabled: boolean }) {
  const fondo = disabled ? (on ? "#CBE7E3" : "#E7EDF3") : on ? "#0FB8A9" : "#D6DEE7";
  return (
    <span
      style={s(
        `width:40px;height:23px;border-radius:99px;background:${fondo};position:relative;flex:none;display:inline-block;transition:background .15s;`,
      )}
    >
      <span
        style={s(
          `position:absolute;top:3px;left:${on ? "20px" : "3px"};width:17px;height:17px;border-radius:99px;background:#fff;box-shadow:0 1px 2px rgba(14,42,71,.3);transition:left .15s;`,
        )}
      />
    </span>
  );
}

export default function AdminRoles() {
  const data = useData();
  const { currentUser, puede } = useAuth();

  const [seccion, setSeccion] = useState<Seccion>("permisos");
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("");
  const [rolElegido, setRolElegido] = useState("");
  const [guardandoRol, setGuardandoRol] = useState(false);

  const [roles, setRoles] = useState<RolAdmin[]>([]);
  const [permisos, setPermisos] = useState<PermisoAdmin[]>([]);
  // Borrador: rolId -> claves marcadas. Se compara contra lo guardado para saber si hay cambios.
  const [borrador, setBorrador] = useState<Record<string, string[]>>({});
  const [rolSeleccionado, setRolSeleccionado] = useState<string>("");
  const [errorCarga, setErrorCarga] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [nuevoRol, setNuevoRol] = useState<{ nombre: string; descripcion: string } | null>(null);

  const cargar = useCallback(() => {
    return data
      .listarRolesPermisos()
      .then((resp) => {
        setErrorCarga(false);
        setRoles(resp.roles);
        setPermisos(resp.permisos);
        setBorrador(Object.fromEntries(resp.roles.map((r) => [r.id, [...r.permisos]])));
        // Se respeta la selección si el rol sigue existiendo; si no, el primero de la lista.
        setRolSeleccionado((actual) =>
          resp.roles.some((r) => r.id === actual) ? actual : resp.roles[0]?.id ?? "",
        );
      })
      .catch(() => setErrorCarga(true))
      .finally(() => setCargando(false));
  }, [data]);

  /**
   * El listado de usuarios es de otro módulo (`usuarios.gestionar`): quien tenga sólo
   * `roles.configurar` configura permisos pero no ve la lista de personas. En ese caso la
   * sección no se ofrece, en vez de mostrar un selector vacío o romper la pantalla.
   */
  const puedeVerUsuarios = puede("usuarios.gestionar");

  const cargarUsuarios = useCallback(() => {
    if (!puedeVerUsuarios) return Promise.resolve();
    return data
      .listarUsuariosAdmin()
      .then(setUsuarios)
      .catch(() => setError("No pudimos cargar el listado de usuarios."));
  }, [data, puedeVerUsuarios]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const cambio = useCallback(
    (rol: RolAdmin) => {
      const marcados = borrador[rol.id] ?? [];
      return marcados.length !== rol.permisos.length || marcados.some((c) => !rol.permisos.includes(c));
    },
    [borrador],
  );

  const rolesCambiados = useMemo(() => roles.filter(cambio), [roles, cambio]);

  const rol = roles.find((r) => r.id === rolSeleccionado) ?? null;
  const marcados = rolSeleccionado ? borrador[rolSeleccionado] ?? [] : [];
  const esAdmin = rol?.nombre === ROL_ADMIN;

  /**
   * Los implícitos quedan fuera de la lista: se conservan en la base y en las guardas del
   * backend, pero no son una decisión del administrador.
   */
  const configurables = useMemo(() => permisos.filter((p) => p.configurable), [permisos]);

  const porModulo = useMemo(() => {
    const grupos = new Map<string, PermisoAdmin[]>();
    for (const permiso of configurables) {
      const actual = grupos.get(permiso.modulo);
      if (actual) actual.push(permiso);
      else grupos.set(permiso.modulo, [permiso]);
    }
    return [...grupos.entries()];
  }, [configurables]);

  /** Un permiso crítico del rol Administrador no se puede tocar (ver el comentario de arriba). */
  const bloqueado = (permiso: PermisoAdmin) => !!esAdmin && permiso.critico;

  const toggle = (permiso: PermisoAdmin) => {
    if (!rolSeleccionado || bloqueado(permiso)) return;
    setError(null);
    setOk(null);
    setBorrador((prev) => {
      const actuales = prev[rolSeleccionado] ?? [];
      return {
        ...prev,
        [rolSeleccionado]: actuales.includes(permiso.clave)
          ? actuales.filter((c) => c !== permiso.clave)
          : [...actuales, permiso.clave],
      };
    });
  };

  const guardar = async () => {
    setError(null);
    setOk(null);
    setGuardando(true);
    // Solo se mandan los roles que cambiaron; el backend valida cada uno por separado
    // (criterio 6: al Administrador no se le pueden sacar los permisos críticos).
    try {
      for (const cambiado of rolesCambiados) {
        await data.actualizarPermisosRol(cambiado.id, borrador[cambiado.id] ?? []);
      }
      await cargar();
      setOk("Permisos actualizados correctamente");
      window.setTimeout(() => setOk(null), 3000);
    } catch (err) {
      // Criterio 8: los checkboxes vuelven a su estado previo y nada quedó a medias.
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la configuración. Intentá de nuevo.");
      await cargar();
    } finally {
      setGuardando(false);
    }
  };

  const crearRol = async () => {
    if (!nuevoRol || !nuevoRol.nombre.trim()) {
      setError("Este campo es obligatorio");
      return;
    }
    setError(null);
    try {
      const creado = await data.crearRol(nuevoRol.nombre.trim(), nuevoRol.descripcion.trim() || undefined);
      setNuevoRol(null);
      // Se salta al rol recién creado: es lo que el admin va a querer configurar ahora.
      setRolSeleccionado(creado.id);
      await cargar();
      setOk("Rol creado. Todavía no tiene permisos asignados.");
      window.setTimeout(() => setOk(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el rol. Intentá de nuevo.");
    }
  };

  const usuario = usuarios.find((u) => u.id === usuarioSeleccionado) ?? null;
  const rolActualDelUsuario = usuario ? roles.find((r) => r.nombre === usuario.rol) ?? null : null;

  const asignarRol = async () => {
    if (!usuario || !rolElegido) return;
    setError(null);
    setOk(null);
    setGuardandoRol(true);
    try {
      await data.asignarRolUsuario(usuario.id, rolElegido);
      await Promise.all([cargarUsuarios(), cargar()]);
      const nombreRol = roles.find((r) => r.id === rolElegido)?.nombre ?? "";
      setOk(`${usuario.nombre} ${usuario.apellido} ahora tiene el rol ${ETIQUETAS[nombreRol] ?? nombreRol}.`);
      window.setTimeout(() => setOk(null), 4000);
    } catch (err) {
      // El backend tiene dos guardas propias acá: no podés cambiarte el rol a vos mismo y no
      // se puede dejar la plataforma sin su último ADMIN. Los dos mensajes llegan como ApiError.
      setError(err instanceof ApiError ? err.message : "No pudimos cambiar el rol. Intentá de nuevo.");
    } finally {
      setGuardandoRol(false);
    }
  };

  const esUnoMismo = !!usuario && usuario.id === currentUser?.id;
  const puedeAsignar = !!usuario && !!rolElegido && rolElegido !== rolActualDelUsuario?.id && !esUnoMismo && !guardandoRol;

  const puedeGuardar = rolesCambiados.length > 0 && !guardando;

  return (
    <DashLayout role="admin" active="roles">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px 0;")}>
        <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Roles y permisos</h1>
        <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 14px;")}>
          {seccion === "permisos"
            ? "Elegí un rol y configurá qué puede hacer. El cambio alcanza a todos los usuarios que tengan ese rol."
            : "Elegí un usuario y cambiale el rol. Acá no se tocan permisos: sólo qué rol tiene esa persona."}
        </p>
        {/*
          Dos preguntas distintas, dos secciones: "qué puede hacer este ROL" y "qué rol tiene
          esta PERSONA". Antes lo segundo sólo existía dentro del modal de edición de usuario
          de Gestión, o sea que para cambiar un rol había que entrar a editar el nombre y el
          teléfono de alguien.
        */}
        <div style={s("display:flex;gap:4px;")}>
          {([
            { key: "permisos", label: "Roles y permisos" },
            { key: "usuarios", label: "Roles de los usuarios" },
          ] as const)
            .filter((t) => t.key === "permisos" || puedeVerUsuarios)
            .map((t) => {
              const on = seccion === t.key;
              return (
                <span
                  key={t.key}
                  onClick={() => {
                    setSeccion(t.key);
                    setError(null);
                    setOk(null);
                  }}
                  className="ah-btn"
                  style={s(
                    `padding:11px 16px;cursor:pointer;font:700 14px Manrope,sans-serif;color:${on ? "#0E2A47" : "#90A1B2"};border-bottom:2.5px solid ${on ? "#FF6A2B" : "transparent"};margin-bottom:-1px;`,
                  )}
                >
                  {t.label}
                </span>
              );
            })}
        </div>
      </div>

      <div style={s("padding:20px 32px 0;")}>
        {cargando && <CargandoSeccion seccion="roles y permisos" />}
        {!cargando && errorCarga && <ErrorReintentar variant="bloque" onReintentar={cargar} />}
        {error && (
          <div style={s("background:#FBEAEB;border:1px solid #F3D2D3;border-radius:11px;padding:11px 14px;font:600 13px Manrope,sans-serif;color:#BE3A3E;margin-bottom:12px;")}>
            {error}
          </div>
        )}
        {ok && (
          <div style={s("background:#E7F8F5;border:1px solid #CBEDE7;border-radius:11px;padding:11px 14px;font:600 13px Manrope,sans-serif;color:#0C8576;margin-bottom:12px;")}>
            {ok}
          </div>
        )}
      </div>

      {!cargando && !errorCarga && seccion === "usuarios" && (
        <div style={s("padding:6px 32px 50px;max-width:680px;")}>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
            <label
              htmlFor="usuario-rol"
              style={s("display:block;font:700 12px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;")}
            >
              Usuario
            </label>
            <select
              id="usuario-rol"
              value={usuarioSeleccionado}
              onChange={(e) => {
                setUsuarioSeleccionado(e.target.value);
                const elegido = usuarios.find((u) => u.id === e.target.value);
                // Se precarga el rol actual: el selector de abajo arranca mostrando lo que la
                // persona tiene hoy, no un valor vacío.
                setRolElegido(roles.find((r) => r.nombre === elegido?.rol)?.id ?? "");
                setError(null);
                setOk(null);
              }}
              style={s("width:100%;border:1.5px solid #E2E9F0;border-radius:11px;padding:11px 13px;font:700 14.5px Manrope,sans-serif;color:#0E2A47;background:#fff;cursor:pointer;margin-bottom:18px;")}
            >
              <option value="">Elegí un usuario…</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido} · {u.email}
                </option>
              ))}
            </select>

            {usuario && (
              <>
                <div style={s("display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#F6F9FC;border:1px solid #EAF0F6;border-radius:12px;padding:13px 15px;margin-bottom:18px;")}>
                  <span style={s("font:700 12.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;")}>
                    Rol actual
                  </span>
                  <span style={s("font:700 14px Space Grotesk,sans-serif;color:#0E2A47;")}>
                    {ETIQUETAS[usuario.rol] ?? usuario.rol}
                  </span>
                  {rolActualDelUsuario && (
                    <span style={s("font:700 12px Manrope,sans-serif;color:#90A1B2;")}>
                      {rolActualDelUsuario.permisos.length} permisos
                    </span>
                  )}
                </div>

                <label
                  htmlFor="rol-nuevo"
                  style={s("display:block;font:700 12px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;")}
                >
                  Rol nuevo
                </label>
                <select
                  id="rol-nuevo"
                  value={rolElegido}
                  onChange={(e) => setRolElegido(e.target.value)}
                  disabled={esUnoMismo}
                  style={s(`width:100%;border:1.5px solid #E2E9F0;border-radius:11px;padding:11px 13px;font:700 14.5px Manrope,sans-serif;color:#0E2A47;background:${esUnoMismo ? "#F4F7FA" : "#fff"};cursor:${esUnoMismo ? "not-allowed" : "pointer"};margin-bottom:14px;`)}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {ETIQUETAS[r.nombre] ?? r.nombre}
                      {r.sistema ? "" : " (rol nuevo)"}
                    </option>
                  ))}
                </select>

                {esUnoMismo && (
                  <div style={s("background:#FFF9EF;border:1px solid #F6E2C0;border-radius:11px;padding:11px 14px;font:600 12.5px Manrope,sans-serif;color:#8A5A12;margin-bottom:14px;line-height:1.5;")}>
                    No podés cambiarte el rol a vos mismo: si te quitaras la administración, no
                    habría forma de volver a esta pantalla. Pedíselo a otro administrador.
                  </div>
                )}

                <button
                  className="ah-btn"
                  onClick={asignarRol}
                  disabled={!puedeAsignar}
                  style={s(
                    `background:${puedeAsignar ? "#0FB8A9" : "#BFE4E0"};color:#fff;border:none;border-radius:11px;padding:11px 18px;font:700 13.5px Manrope,sans-serif;cursor:${puedeAsignar ? "pointer" : "default"};`,
                  )}
                >
                  {guardandoRol ? "Guardando…" : "Asignar rol"}
                </button>
              </>
            )}

            {!usuario && (
              <div style={s("color:#90A1B2;font-weight:600;font-size:13.5px;")}>
                Elegí un usuario para ver y cambiar su rol.
              </div>
            )}
          </div>
        </div>
      )}

      {!cargando && !errorCarga && seccion === "permisos" && (
        <div style={s("padding:6px 32px 50px;max-width:920px;")}>
          {/* Selector de rol + su ficha. Reemplaza a la columna fija de tarjetas. */}
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:18px 22px;box-shadow:0 1px 2px rgba(14,42,71,.04);margin-bottom:18px;")}>
            <div style={s("display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;")}>
              <div style={s("flex:1;min-width:230px;")}>
                <label
                  htmlFor="rol-seleccionado"
                  style={s("display:block;font:700 12px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;")}
                >
                  Rol
                </label>
                <select
                  id="rol-seleccionado"
                  value={rolSeleccionado}
                  onChange={(e) => setRolSeleccionado(e.target.value)}
                  style={s("width:100%;border:1.5px solid #E2E9F0;border-radius:11px;padding:11px 13px;font:700 14.5px Manrope,sans-serif;color:#0E2A47;background:#fff;cursor:pointer;")}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {ETIQUETAS[r.nombre] ?? r.nombre} · {r.usuarios} {r.usuarios === 1 ? "usuario" : "usuarios"}
                      {cambio(r) ? " · sin guardar" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="ah-btn"
                onClick={() => setNuevoRol({ nombre: "", descripcion: "" })}
                style={s(
                  "background:#fff;border:1px dashed #C9D5E1;border-radius:11px;padding:11px 15px;font:700 13.5px Manrope,sans-serif;color:#41566B;cursor:pointer;display:flex;align-items:center;gap:7px;",
                )}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2.4}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Nuevo rol
              </button>
              <button
                className="ah-btn"
                onClick={guardar}
                disabled={!puedeGuardar}
                style={s(
                  `background:${puedeGuardar ? "#0FB8A9" : "#BFE4E0"};color:#fff;border:none;border-radius:11px;padding:11px 18px;font:700 13.5px Manrope,sans-serif;cursor:${puedeGuardar ? "pointer" : "default"};`,
                )}
              >
                {guardando
                  ? "Guardando…"
                  : rolesCambiados.length > 1
                    ? `Guardar cambios (${rolesCambiados.length} roles)`
                    : "Guardar cambios"}
              </button>
            </div>

            {rol && (
              <div style={s("margin-top:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;")}>
                <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>
                  {rol.descripcion ?? "Sin descripción."}
                </span>
                <span
                  style={s(
                    rol.sistema
                      ? "font:700 10.5px Manrope,sans-serif;background:#EEF4FB;color:#2D5BC8;border-radius:99px;padding:3px 9px;"
                      : "font:700 10.5px Manrope,sans-serif;background:#F1F4F8;color:#65788C;border-radius:99px;padding:3px 9px;",
                  )}
                >
                  {rol.sistema ? "Rol del sistema" : "Rol nuevo"}
                </span>
                <span style={s("font:700 12px Manrope,sans-serif;color:#90A1B2;")}>
                  {configurables.filter((p) => marcados.includes(p.clave)).length} de {configurables.length} permisos
                </span>
              </div>
            )}
          </div>

          {nuevoRol && (
            <div style={s("background:#fff;border:1.5px solid #12B5A5;border-radius:16px;padding:18px 22px;display:flex;flex-direction:column;gap:9px;margin-bottom:18px;max-width:420px;")}>
              <div style={s("font:700 13.5px Manrope,sans-serif;color:#0E2A47;")}>Nuevo rol</div>
              <input
                autoFocus
                value={nuevoRol.nombre}
                onChange={(e) => setNuevoRol({ ...nuevoRol, nombre: e.target.value })}
                placeholder="Nombre del rol*"
                style={s("border:1px solid #E2E9F0;border-radius:9px;padding:9px 11px;font:600 13px Manrope,sans-serif;color:#0E2A47;")}
              />
              <input
                value={nuevoRol.descripcion}
                onChange={(e) => setNuevoRol({ ...nuevoRol, descripcion: e.target.value })}
                placeholder="Descripción (opcional)"
                style={s("border:1px solid #E2E9F0;border-radius:9px;padding:9px 11px;font:600 13px Manrope,sans-serif;color:#0E2A47;")}
              />
              <div style={s("display:flex;gap:8px;")}>
                <button
                  className="ah-btn"
                  onClick={() => {
                    setNuevoRol(null);
                    setError(null);
                  }}
                  style={s("flex:1;background:#fff;border:1px solid #D6DEE7;border-radius:9px;padding:9px;font:700 12.5px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
                >
                  Cancelar
                </button>
                <button
                  className="ah-btn"
                  onClick={crearRol}
                  style={s("flex:1;background:#0FB8A9;border:none;border-radius:9px;padding:9px;font:700 12.5px Manrope,sans-serif;color:#fff;cursor:pointer;")}
                >
                  Crear rol
                </button>
              </div>
            </div>
          )}

          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
            <div style={s("padding:18px 22px;border-bottom:1px solid #EEF2F6;")}>
              <div style={s("font:700 16px Space Grotesk,sans-serif;")}>Permisos por módulo</div>
              <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;margin-top:2px;")}>
                {rol
                  ? `Lo que puede hacer ${ETIQUETAS[rol.nombre] ?? rol.nombre} en la plataforma`
                  : "Elegí un rol para configurarlo"}
              </div>
            </div>

            {esAdmin && (
              <div style={s("background:#FFF9EF;border-bottom:1px solid #F6E2C0;padding:12px 22px;font:600 12.5px Manrope,sans-serif;color:#8A5A12;")}>
                Los permisos críticos no se le pueden quitar al rol Administrador: sin ellos nadie podría volver a
                esta pantalla y la plataforma quedaría sin gobierno hasta tocar la base de datos a mano.
              </div>
            )}

            {porModulo.length === 0 && (
              <div style={s("padding:26px 22px;color:#90A1B2;font-weight:600;font-size:13.5px;")}>
                No hay permisos configurables.
              </div>
            )}

            {porModulo.map(([modulo, delModulo]) => (
              <div key={modulo}>
                <div style={s("padding:11px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;")}>
                  {modulo}
                </div>
                {delModulo.map((permiso) => {
                  const on = marcados.includes(permiso.clave);
                  const off = bloqueado(permiso);
                  return (
                    <div
                      key={permiso.id}
                      className={off ? undefined : "ah-btn"}
                      onClick={() => toggle(permiso)}
                      title={
                        off
                          ? "Crítico para el Administrador: no se puede quitar."
                          : `${on ? "Quitar" : "Dar"} "${permiso.accion}" a ${
                              (rol && (ETIQUETAS[rol.nombre] ?? rol.nombre)) ?? "este rol"
                            }`
                      }
                      style={s(
                        `display:flex;align-items:center;gap:14px;padding:13px 22px;border-bottom:1px solid #F1F4F8;cursor:${off ? "not-allowed" : "pointer"};`,
                      )}
                    >
                      <Switch on={on} disabled={off} />
                      <span style={s("flex:1;min-width:0;")}>
                        <span style={s(`font:700 13.5px Manrope,sans-serif;color:${off ? "#7A8C9E" : "#0E2A47"};display:block;`)}>
                          {permiso.accion}
                        </span>
                        <span style={s("font:600 12px Manrope,sans-serif;color:#A3B1C0;")}>{permiso.clave}</span>
                      </span>
                      {permiso.critico && (
                        <span style={s("font:700 10.5px Manrope,sans-serif;color:#B9741A;background:#FFF3E0;border-radius:99px;padding:3px 9px;flex:none;")}>
                          {off ? "Bloqueado · crítico" : "Crítico para el Administrador"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </DashLayout>
  );
}
