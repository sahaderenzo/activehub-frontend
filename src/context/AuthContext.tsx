import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { PerfilAlumno, PerfilInstructor, RolNombre, Usuario } from "../lib/types";
import { perfilesAlumno, perfilesInstructor, usuarios as seedUsuarios } from "../lib/mockData";
import { api, ApiError, clearToken, getToken, setToken } from "../lib/api";

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

export interface SesionUsuario extends Usuario {
  perfilAlumno?: PerfilAlumno;
  perfilInstructor?: PerfilInstructor;
}

export interface RegistrarAlumnoInput {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  password: string;
  fechaNacimiento: string;
  intereses: string[];
  aceptaTerminos: boolean;
}

export interface RegistrarInstructorInput {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
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

function passwordStrength(password: string): { ok: boolean; label: string; color: string } {
  if (password.length < 8) return { ok: false, label: "Contraseña muy débil (mínimo 8 caracteres)", color: "#E5484D" };
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) return { ok: false, label: "Necesitás al menos una letra y un número", color: "#E5484D" };
  const hasUpper = /[A-Z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  if (password.length >= 10 && hasUpper && hasSpecial) return { ok: true, label: "Contraseña fuerte", color: "#0C8576" };
  if (password.length >= 9 && hasUpper) return { ok: true, label: "Contraseña buena", color: "#0C8576" };
  return { ok: true, label: "Contraseña aceptable", color: "#B9741A" };
}

export { passwordStrength };

interface UsuarioRespuesta {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  fechaNacimiento?: string;
  rol: RolNombre;
  estado: "ACTIVO" | "SUSPENDIDO";
  cantidadPenalizaciones: number;
  createdAt: string;
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

async function fetchPerfilInstructorSiCorresponde(usuario: UsuarioRespuesta): Promise<PerfilInstructor | undefined> {
  if (usuario.rol !== "INSTRUCTOR") return undefined;
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
  initializing: boolean;
  users: StoredUsuario[];
  registerAlumno: (input: RegistrarAlumnoInput) => Promise<SesionUsuario>;
  registerInstructor: (input: RegistrarInstructorInput) => Promise<SesionUsuario>;
  login: (email: string, password: string) => Promise<SesionUsuario>;
  loginAsDemo: (rol: RolNombre) => Promise<SesionUsuario>;
  logout: () => void;
  createAdmin: (input: RegistrarAdminInput) => Promise<Usuario>;
  updateUsuario: (id: string, patch: Partial<StoredUsuario>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<StoredUsuario[]>(() => loadUsers());
  const [currentUser, setCurrentUser] = useState<SesionUsuario | null>(null);
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
        const perfilInstructor = await fetchPerfilInstructorSiCorresponde(usuario);
        if (!cancelado) setCurrentUser({ ...usuario, perfilInstructor });
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
      perfilAlumno: { usuarioId: usuario.id, intereses: input.intereses },
    };
    setCurrentUser(sesion);
    return sesion;
  }, []);

  const registerInstructor = useCallback(async (input: RegistrarInstructorInput) => {
    const { usuario, token } = await api.post<AuthRespuesta>("/api/auth/registro/instructor", input);
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

  const login = useCallback(async (email: string, password: string) => {
    const { usuario, token } = await api.post<AuthRespuesta>("/api/auth/login", { email, password });
    setToken(token);
    const perfilInstructor = await fetchPerfilInstructorSiCorresponde(usuario);
    const sesion: SesionUsuario = { ...usuario, perfilInstructor };
    setCurrentUser(sesion);
    return sesion;
  }, []);

  const loginAsDemo = useCallback(
    (rol: RolNombre) => {
      const credencialesPorRol: Record<RolNombre, { email: string; password: string }> = {
        ALUMNO: { email: "martina@email.com", password: "Activehub2026" },
        INSTRUCTOR: { email: "mateo@email.com", password: "Activehub2026" },
        ADMIN: { email: "roberto.admin@activehub.com", password: "Activehub2026" },
      };
      const { email, password } = credencialesPorRol[rol];
      return login(email, password);
    },
    [login],
  );

  const logout = useCallback(() => {
    clearToken();
    setCurrentUser(null);
  }, []);

  const createAdmin = useCallback(async (input: RegistrarAdminInput) => {
    return api.post<Usuario>("/api/admin/usuarios/admin", input);
  }, []);

  const updateUsuario = useCallback((id: string, patch: Partial<StoredUsuario>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      currentUser,
      initializing,
      users,
      registerAlumno,
      registerInstructor,
      login,
      loginAsDemo,
      logout,
      createAdmin,
      updateUsuario,
    }),
    [currentUser, initializing, users, registerAlumno, registerInstructor, login, loginAsDemo, logout, createAdmin, updateUsuario],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
