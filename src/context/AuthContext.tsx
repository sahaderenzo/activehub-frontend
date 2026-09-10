/* eslint-disable react-refresh/only-export-components -- el provider y su hook viven
   juntos a propósito: separarlos obligaría a tocar los imports de todas las pantallas y solo
   afecta al fast refresh en desarrollo. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { InteresAlumno, PerfilAlumno, PerfilInstructor, RolNombre, Usuario } from "../lib/types";
import { perfilesAlumno, perfilesInstructor, usuarios as seedUsuarios } from "../lib/mockData";
import { api, ApiError, clearToken, getToken, setToken } from "../lib/api";
import { puedeEntrarA } from "../lib/areas";

/**
 * Auth real contra activehub-api (JWT). `users`/`updateUsuario` se mantienen
 * como una lista mock local aparte: la usan pantallas que todavía no tienen
 * backend (Roles, Reportes, denuncias) y necesitan un "directorio" de
 * usuarios que la API real no expone por privacidad.
 */

export { ApiError };

export interface StoredUsuario extends Usuario {
  passwordMock: string;
  perfilAlumno?: PerfilAlumno;
  perfilInstructor?: PerfilInstructor;
}

export interface ActualizarMiPerfilInput {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fechaNacimiento?: string;
}

interface PerfilActualizado {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  fechaNacimiento?: string;
}

export interface SesionUsuario extends Usuario {
  perfilAlumno?: PerfilAlumno;
  perfilInstructor?: PerfilInstructor;
  /**
   * Claves habilitadas para su rol (RN-19). Viaja en la sesión — además de vivir en el
   * estado del contexto — para que el login pueda elegir a qué área mandar al usuario sin
   * esperar al render siguiente.
   */
  permisos?: string[];
}

export interface RegistrarAlumnoInput {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  /** Opcional; si viene, es clave de unicidad junto al email y sirve para login. */
  dni?: string;
  password: string;
  fechaNacimiento: string;
  /** Ids de TipoActividad elegidos como intereses. */
  intereses: string[];
  condicionSalud?: string;
  aceptaTerminos: boolean;
}

export interface RegistrarInstructorInput {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  dni?: string;
  password: string;
  fechaNacimiento?: string;
  especialidad: string;
  aniosExperiencia?: number;
  descripcion?: string;
  aceptaTerminos: boolean;
}

export interface RegistrarAdminInput {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  password: string;
}

const USERS_KEY = "ah_users";

/**
 * Cada cuánto, como mucho, se renueva el token mientras el usuario está activo. Tiene que ser
 * bastante menor que `app.jwt.expiration-min` del backend (30 min) para que una sesión activa
 * nunca llegue a vencer entre dos renovaciones.
 */
const INTERVALO_RENOVACION_MS = 5 * 60 * 1000;

function seedStore(): StoredUsuario[] {
  return seedUsuarios.map((u) => ({
    ...u,
    passwordMock: "Activehub2026",
    perfilAlumno: perfilesAlumno[u.id],
    perfilInstructor: perfilesInstructor[u.id],
  }));
}

function loadUsers(): StoredUsuario[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw) as StoredUsuario[];
  } catch {
    /* ignore corrupt storage */
  }
  const seeded = seedStore();
  localStorage.setItem(USERS_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveUsers(users: StoredUsuario[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * RN-20: mínimo 8 caracteres, al menos una MAYÚSCULA y al menos un número.
 * Tiene que coincidir con la regex del backend (`^(?=.*[A-Z])(?=.*\d).{8,}$` en los tres
 * Request de registro): antes acá alcanzaba con "una letra", así que `password1` pasaba
 * la validación del cliente y también la del servidor.
 */
function passwordStrength(password: string): { ok: boolean; label: string; color: string } {
  if (password.length < 8) return { ok: false, label: "Contraseña muy débil (mínimo 8 caracteres)", color: "#E5484D" };
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasUpper || !hasNumber) {
    return { ok: false, label: "Necesitás al menos una mayúscula y un número", color: "#E5484D" };
  }
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  if (password.length >= 10 && hasSpecial) return { ok: true, label: "Contraseña fuerte", color: "#0C8576" };
  if (password.length >= 9) return { ok: true, label: "Contraseña buena", color: "#0C8576" };
  return { ok: true, label: "Contraseña aceptable", color: "#B9741A" };
}

export { passwordStrength };

interface UsuarioRespuesta {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  dni?: string;
  telefono?: string;
  fechaNacimiento?: string;
  rol: RolNombre;
  estado: "ACTIVO" | "SUSPENDIDO";
  cantidadPenalizaciones: number;
  createdAt: string;
  /** Solo alumnos; para los otros roles viene vacía. Son TipoActividad, no texto (V19). */
  intereses?: InteresAlumno[];
  /** Claves habilitadas para su rol (RN-19). El menú y las rutas se arman con esto. */
  permisos?: string[];
}

interface AuthRespuesta {
  token: string;
  usuario: UsuarioRespuesta;
}

interface MiPerfilInstructorRespuesta {
  especialidad: string;
  aniosExperiencia?: number;
  descripcion?: string;
  estadoVerificacion: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  motivoRechazo?: string;
}

/**
 * RN-19: se pide por permiso, no por nombre de rol. `/api/instructor/perfil` es "Mis datos"
 * y responde a cualquiera que tenga un PerfilInstructor; con el filtro viejo
 * (`rol !== "INSTRUCTOR"`), un rol creado por el admin con permisos de instructor se quedaba
 * sin perfil y las pantallas que dependen de `estadoVerificacion` no sabían qué mostrar.
 */
async function fetchPerfilInstructorSiCorresponde(
  usuario: UsuarioRespuesta,
  permisos: string[],
): Promise<PerfilInstructor | undefined> {
  if (!puedeEntrarA("instructor", permisos)) return undefined;
  try {
    const perfil = await api.get<MiPerfilInstructorRespuesta>("/api/instructor/perfil");
    return {
      usuarioId: usuario.id,
      especialidad: perfil.especialidad,
      aniosExperiencia: perfil.aniosExperiencia,
      descripcion: perfil.descripcion,
      estadoVerificacion: perfil.estadoVerificacion,
      motivoRechazo: perfil.motivoRechazo,
    };
  } catch {
    return undefined;
  }
}

interface AuthContextValue {
  currentUser: SesionUsuario | null;
  /** Claves que su rol tiene habilitadas (RN-19). Vacío mientras no haya sesión. */
  permisos: string[];
  /** ¿El rol del usuario tiene este permiso? Es la misma pregunta que hace el backend. */
  puede: (clave: string) => boolean;
  initializing: boolean;
  users: StoredUsuario[];
  registerAlumno: (input: RegistrarAlumnoInput) => Promise<SesionUsuario>;
  registerInstructor: (input: RegistrarInstructorInput, documentos: File[]) => Promise<SesionUsuario>;
  /** `identificador` puede ser el correo o el DNI. */
  login: (identificador: string, password: string) => Promise<SesionUsuario>;
  logout: () => void;
  createAdmin: (input: RegistrarAdminInput) => Promise<Usuario>;
  updateUsuario: (id: string, patch: Partial<StoredUsuario>) => void;
  actualizarMiPerfil: (input: ActualizarMiPerfilInput) => Promise<void>;
  /** Reemplaza la lista completa de intereses (ids de TipoActividad). */
  actualizarMisIntereses: (tiposActividadId: string[]) => Promise<void>;
  cambiarMiContrasenia: (contraseniaActual: string, contraseniaNueva: string) => Promise<void>;
  darDeBajaMiCuenta: () => Promise<void>;
  reabrirSolicitud: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<StoredUsuario[]>(() => loadUsers());
  const [currentUser, setCurrentUser] = useState<SesionUsuario | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    saveUsers(users);
  }, [users]);

  useEffect(() => {
    let cancelado = false;
    async function restaurarSesion() {
      const token = getToken();
      if (!token) {
        setInitializing(false);
        return;
      }
      try {
        const usuario = await api.get<UsuarioRespuesta>("/api/auth/me");
        const perfilInstructor = await fetchPerfilInstructorSiCorresponde(usuario, usuario.permisos ?? []);
        // Los intereses ya son reales (PUT /api/usuarios/me/intereses): antes salían del
        // store mock local y se perdían al cambiar de navegador.
        const perfilAlumno =
          usuario.rol === "ALUMNO" ? { usuarioId: usuario.id, intereses: usuario.intereses ?? [] } : undefined;
        if (!cancelado) {
          setCurrentUser({ ...usuario, perfilAlumno, perfilInstructor });
          setPermisos(usuario.permisos ?? []);
        }
      } catch {
        clearToken();
        if (!cancelado) setCurrentUser(null);
      } finally {
        if (!cancelado) setInitializing(false);
      }
    }
    restaurarSesion();
    return () => {
      cancelado = true;
    };
  }, []);

  const registerAlumno = useCallback(async (input: RegistrarAlumnoInput) => {
    const { usuario, token } = await api.post<AuthRespuesta>("/api/auth/registro/alumno", input);
    setToken(token);
    const sesion: SesionUsuario = {
      ...usuario,
      // El alta manda ids; los intereses completos (con categoría) llegan en el próximo
      // /api/auth/me, así que acá se arranca vacío en vez de inventar objetos a medias.
      perfilAlumno: { usuarioId: usuario.id, intereses: [], condicionSalud: input.condicionSalud },
    };
    setCurrentUser(sesion);
    return sesion;
  }, []);

  // La documentación viaja en el MISMO request que los datos: la cuenta no puede crearse
  // sin ella (E1A-HU04 criterio 9, RN-12). Si el backend rechaza los archivos, no se creó
  // ningún Usuario y la excepción llega tal cual a la pantalla de registro.
  const registerInstructor = useCallback(async (input: RegistrarInstructorInput, documentos: File[]) => {
    const fd = new FormData();
    fd.append("datos", new Blob([JSON.stringify(input)], { type: "application/json" }));
    documentos.forEach((archivo) => fd.append("documentos", archivo));

    const { usuario, token } = await api.postForm<AuthRespuesta>("/api/auth/registro/instructor", fd);
    setToken(token);
    const sesion: SesionUsuario = {
      ...usuario,
      perfilInstructor: {
        usuarioId: usuario.id,
        especialidad: input.especialidad,
        aniosExperiencia: input.aniosExperiencia,
        descripcion: input.descripcion,
        estadoVerificacion: "PENDIENTE",
      },
    };
    setCurrentUser(sesion);
    return sesion;
  }, []);

  // `identificador`, no `email`: el backend acepta también el DNI como credencial
  // (nota de la épica E1A). Si mandás `email` el request se rechaza por validación.
  const login = useCallback(async (identificador: string, password: string) => {
    const { usuario, token } = await api.post<AuthRespuesta>("/api/auth/login", { identificador, password });
    setToken(token);
    // La respuesta del login no trae permisos ni intereses: se piden a /api/auth/me, que es
    // la misma consulta que hace el arranque de la app. Va PRIMERO porque de los permisos
    // depende si corresponde pedir el perfil de instructor. Si fallara, la sesión igual
    // queda abierta y el menú se arma en la primera recarga.
    const completo = await api.get<UsuarioRespuesta>("/api/auth/me").catch(() => null);
    const permisosDelRol = completo?.permisos ?? [];
    const perfilInstructor = await fetchPerfilInstructorSiCorresponde(usuario, permisosDelRol);
    const perfilAlumno =
      usuario.rol === "ALUMNO" ? { usuarioId: usuario.id, intereses: completo?.intereses ?? [] } : undefined;
    // `permisos` viaja en la sesión devuelta para que quien llame (el login) pueda decidir
    // a qué área mandar al usuario sin esperar al próximo render del contexto.
    const sesion: SesionUsuario = { ...usuario, permisos: permisosDelRol, perfilAlumno, perfilInstructor };
    setCurrentUser(sesion);
    setPermisos(permisosDelRol);
    return sesion;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setCurrentUser(null);
    setPermisos([]);
  }, []);

  const puede = useCallback((clave: string) => permisos.includes(clave), [permisos]);

  /**
   * E1A-HU02 criterio 3: la sesión expira por inactividad.
   *
   * El TTL del JWT (30 min) ES la ventana de inactividad. Mientras el usuario interactúa se
   * renueva el token contra `/api/auth/refresh`, con un throttle para no pegarle a la API en
   * cada click; si deja de usar la app, el último token vence solo y la próxima request cae
   * en 401. Antes el token duraba 2 horas fijas y no se renovaba: la sesión moría por
   * antigüedad aunque el usuario estuviera trabajando, y sobrevivía a la inactividad.
   */
  useEffect(() => {
    if (!currentUser) return;

    let ultimaRenovacion = Date.now();
    let renovando = false;

    const renovarSiCorresponde = async () => {
      if (renovando || Date.now() - ultimaRenovacion < INTERVALO_RENOVACION_MS) return;
      renovando = true;
      try {
        const { token } = await api.post<{ token: string; expiraEnMinutos: number }>("/api/auth/refresh");
        setToken(token);
        ultimaRenovacion = Date.now();
      } catch {
        // Si falla (token vencido, cuenta suspendida) no se fuerza el logout acá: la próxima
        // llamada real de la pantalla va a dar 401 y ahí se muestra el error que corresponde.
      } finally {
        renovando = false;
      }
    };

    const eventos: (keyof WindowEventMap)[] = ["click", "keydown", "scroll", "focus"];
    eventos.forEach((e) => window.addEventListener(e, renovarSiCorresponde, { passive: true }));
    return () => eventos.forEach((e) => window.removeEventListener(e, renovarSiCorresponde));
  }, [currentUser]);

  const createAdmin = useCallback(async (input: RegistrarAdminInput) => {
    return api.post<Usuario>("/api/admin/usuarios/admin", input);
  }, []);

  // Cuenta propia. Viven acá y no en DataContext porque el resultado tiene que reflejarse
  // en `currentUser`, que es de donde leen todas las pantallas.
  const actualizarMiPerfil = useCallback(async (input: ActualizarMiPerfilInput) => {
    const actualizado = await api.put<PerfilActualizado>("/api/usuarios/me", input);
    setCurrentUser((prev) => (prev ? { ...prev, ...actualizado } : prev));
  }, []);

  // Vive acá y no en DataContext porque el resultado tiene que reflejarse en currentUser,
  // que es de donde leen Perfil y el "Recomendado para vos" del Home.
  const actualizarMisIntereses = useCallback(async (tiposActividadId: string[]) => {
    const r = await api.put<{ usuarioId: string; intereses: InteresAlumno[] }>("/api/usuarios/me/intereses", {
      tiposActividadId,
    });
    setCurrentUser((prev) =>
      prev ? { ...prev, perfilAlumno: { ...(prev.perfilAlumno ?? { usuarioId: prev.id }), intereses: r.intereses } } : prev,
    );
  }, []);

  const cambiarMiContrasenia = useCallback(async (contraseniaActual: string, contraseniaNueva: string) => {
    await api.post("/api/usuarios/me/password", { contraseniaActual, contraseniaNueva });
  }, []);

  const darDeBajaMiCuenta = useCallback(async () => {
    await api.delete("/api/usuarios/me");
    // La cuenta quedó dada de baja: la sesión ya no sirve.
    clearToken();
    setCurrentUser(null);
  }, []);

  const reabrirSolicitud = useCallback(async () => {
    const r = await api.post<{ usuarioId: string; estadoVerificacion: "PENDIENTE" | "APROBADO" | "RECHAZADO" }>(
      "/api/instructor/solicitud/reabrir",
    );
    setCurrentUser((prev) =>
      prev && prev.perfilInstructor
        ? {
            ...prev,
            perfilInstructor: {
              ...prev.perfilInstructor,
              estadoVerificacion: r.estadoVerificacion,
              motivoRechazo: undefined,
            },
          }
        : prev,
    );
  }, []);

  const updateUsuario = useCallback((id: string, patch: Partial<StoredUsuario>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      currentUser,
      permisos,
      puede,
      initializing,
      users,
      registerAlumno,
      registerInstructor,
      login,
      logout,
      createAdmin,
      updateUsuario,
      actualizarMiPerfil,
      actualizarMisIntereses,
      cambiarMiContrasenia,
      darDeBajaMiCuenta,
      reabrirSolicitud,
    }),
    // `permisos`/`puede` tienen que estar sí o sí: sin ellos el menú se queda con los
    // permisos del render anterior (la trampa de deps incompletas que ya pasó dos veces
    // en este repo). El resto son useCallback estables, pero listarlos no cuesta nada.
    [
      currentUser,
      permisos,
      puede,
      initializing,
      users,
      registerAlumno,
      registerInstructor,
      login,
      logout,
      createAdmin,
      updateUsuario,
      actualizarMiPerfil,
      actualizarMisIntereses,
      cambiarMiContrasenia,
      darDeBajaMiCuenta,
      reabrirSolicitud,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
