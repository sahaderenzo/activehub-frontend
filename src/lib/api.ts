// Cliente HTTP para la API real de ActiveHub (activehub-api). Centraliza base URL,
// token JWT y el parseo del shape de error del backend (ApiError de GlobalExceptionHandler).

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const TOKEN_KEY = "ah_token";

export class ApiError extends Error {
  code: string;
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(code: string, message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("ERROR_RED", "No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.", 0);
  }

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
  const data = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const message = data?.message ?? "Ocurrió un error inesperado. Intentá de nuevo más tarde.";
    const code = data?.code ?? "ERROR_INTERNO";
    throw new ApiError(code, message, res.status, data?.fieldErrors ?? undefined);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string): Promise<T> => request<T>(path, { method: "DELETE" }),
};
