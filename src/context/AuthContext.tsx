import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { PerfilAlumno, PerfilInstructor, RolNombre, Usuario } from "../lib/types";
import { perfilesAlumno, perfilesInstructor, usuarios as seedUsuarios } from "../lib/mockData";

/**
 * Mock/local auth store (no backend in this repo yet). Mirrors the request /
 * response shapes from design_handoff_activehub/03-CASOS-DE-USO-AUTH.md so a
 * real API can be swapped in later without touching the pages that call
 * useAuth(). Persisted to localStorage so a refresh keeps the session and any
 * accounts created at runtime.
 */

export interface StoredUsuario extends Usuario {
  passwordMock: string;
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
}

export interface RegistrarAdminInput {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  password: string;
}

export type ApiErrorCode =
  | "VALIDACION"
  | "CREDENCIALES_INVALIDAS"
  | "SIN_PERMISO"
  | "NO_ENCONTRADO"
  | "EMAIL_EN_USO"
  | "USUARIO_SUSPENDIDO";

export class ApiError extends Error {
  code: ApiErrorCode;
  fieldErrors?: Record<string, string>;
  constructor(code: ApiErrorCode, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

const USERS_KEY = "ah_users";
const SESSION_KEY = "ah_session_user_id";

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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

interface AuthContextValue {
  currentUser: StoredUsuario | null;
  users: StoredUsuario[];
  registerAlumno: (input: RegistrarAlumnoInput) => StoredUsuario;
  registerInstructor: (input: RegistrarInstructorInput) => StoredUsuario;
  login: (email: string, password: string) => StoredUsuario;
  loginAsDemo: (rol: RolNombre) => StoredUsuario;
  logout: () => void;
  createAdmin: (input: RegistrarAdminInput) => StoredUsuario;
  updateUsuario: (id: string, patch: Partial<StoredUsuario>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<StoredUsuario[]>(() => loadUsers());
  const [currentUserId, setCurrentUserId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(SESSION_KEY),
  );

  useEffect(() => {
    saveUsers(users);
  }, [users]);

  useEffect(() => {
    if (currentUserId) localStorage.setItem(SESSION_KEY, currentUserId);
    else localStorage.removeItem(SESSION_KEY);
  }, [currentUserId]);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? null,
    [users, currentUserId],
  );

  const assertEmailFree = useCallback(
    (email: string) => {
      const exists = users.some((u) => normalizeEmail(u.email) === normalizeEmail(email));
      if (exists) {
        throw new ApiError("EMAIL_EN_USO", "Ese correo ya está registrado.", {
          email: "Ese correo ya está registrado.",
        });
      }
    },
    [users],
  );

  const registerAlumno = useCallback(
    (input: RegistrarAlumnoInput) => {
      assertEmailFree(input.email);
      const id = `u-${Date.now()}`;
      const nuevo: StoredUsuario = {
        id,
        nombre: input.nombre,
        apellido: input.apellido,
        email: normalizeEmail(input.email),
        telefono: input.telefono,
        fechaNacimiento: input.fechaNacimiento,
        rol: "ALUMNO",
        estado: "ACTIVO",
        cantidadPenalizaciones: 0,
        createdAt: new Date().toISOString(),
        passwordMock: input.password,
        perfilAlumno: { usuarioId: id, intereses: input.intereses },
      };
      setUsers((prev) => [...prev, nuevo]);
      setCurrentUserId(id);
      return nuevo;
    },
    [assertEmailFree],
  );

  const registerInstructor = useCallback(
    (input: RegistrarInstructorInput) => {
      assertEmailFree(input.email);
      const id = `u-${Date.now()}`;
      const nuevo: StoredUsuario = {
        id,
        nombre: input.nombre,
        apellido: input.apellido,
        email: normalizeEmail(input.email),
        telefono: input.telefono,
        fechaNacimiento: input.fechaNacimiento,
        rol: "INSTRUCTOR",
        estado: "ACTIVO",
        cantidadPenalizaciones: 0,
        createdAt: new Date().toISOString(),
        passwordMock: input.password,
        perfilInstructor: {
          usuarioId: id,
          especialidad: input.especialidad,
          aniosExperiencia: input.aniosExperiencia,
          descripcion: input.descripcion,
          estadoVerificacion: "PENDIENTE",
        },
      };
      setUsers((prev) => [...prev, nuevo]);
      setCurrentUserId(id);
      return nuevo;
    },
    [assertEmailFree],
  );

  const login = useCallback(
    (email: string, password: string) => {
      const user = users.find((u) => normalizeEmail(u.email) === normalizeEmail(email));
      if (!user || user.passwordMock !== password) {
        throw new ApiError("CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos. Verificá tus datos e intentá de nuevo.");
      }
      if (user.estado === "SUSPENDIDO") {
        throw new ApiError("USUARIO_SUSPENDIDO", "Tu cuenta está suspendida. Contactá a soporte.");
      }
      setCurrentUserId(user.id);
      return user;
    },
    [users],
  );

  const loginAsDemo = useCallback(
    (rol: RolNombre) => {
      const emailByRol: Record<RolNombre, string> = {
        ALUMNO: "martina@email.com",
        INSTRUCTOR: "mateo@email.com",
        ADMIN: "roberto.admin@activehub.com",
      };
      const user = users.find((u) => u.email === emailByRol[rol]);
      if (!user) throw new ApiError("NO_ENCONTRADO", "Usuario demo no encontrado.");
      setCurrentUserId(user.id);
      return user;
    },
    [users],
  );

  const logout = useCallback(() => setCurrentUserId(null), []);

  const createAdmin = useCallback(
    (input: RegistrarAdminInput) => {
      if (!currentUser || currentUser.rol !== "ADMIN") {
        throw new ApiError("SIN_PERMISO", "Solo un administrador puede crear otro administrador.");
      }
      assertEmailFree(input.email);
      const id = `u-${Date.now()}`;
      const nuevo: StoredUsuario = {
        id,
        nombre: input.nombre,
        apellido: input.apellido,
        email: normalizeEmail(input.email),
        telefono: input.telefono,
        rol: "ADMIN",
        estado: "ACTIVO",
        cantidadPenalizaciones: 0,
        createdAt: new Date().toISOString(),
        passwordMock: input.password,
      };
      setUsers((prev) => [...prev, nuevo]);
      return nuevo;
    },
    [assertEmailFree, currentUser],
  );

  const updateUsuario = useCallback((id: string, patch: Partial<StoredUsuario>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const value: AuthContextValue = {
    currentUser,
    users,
    registerAlumno,
    registerInstructor,
    login,
    loginAsDemo,
    logout,
    createAdmin,
    updateUsuario,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
