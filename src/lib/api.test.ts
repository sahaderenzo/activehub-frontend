import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, BASE_URL, api, clearToken, getToken, setToken } from "./api";

/**
 * El cliente HTTP. Lo que se prueba acá es el **contrato con el backend**: cómo se traduce
 * cada respuesta a un `ApiError` y cuándo viaja el token. Es lo que hace que una pantalla
 * pueda mostrar el mensaje del backend en vez de "algo salió mal".
 */

/** Respuesta mínima con la forma que `request` consulta (`ok`, `status`, `headers`, `json`). */
function respuesta(status: number, body?: unknown, contentType = "application/json") {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(body === undefined && status === 204 ? {} : { "content-type": contentType }),
    json: async () => body,
    blob: async () => new Blob(["x"]),
  } as unknown as Response;
}

/**
 * Espera a que la petición falle y devuelve el error ya tipado como `ApiError`, verificando
 * de paso que lo sea. Sin esto, cada prueba de error arranca con un `unknown` al que hay que
 * hacerle `as` antes de mirarle el código.
 */
async function apiErrorDe(peticion: Promise<unknown>): Promise<ApiError> {
  let capturado: unknown;
  try {
    await peticion;
  } catch (error) {
    capturado = error;
  }
  expect(capturado).toBeInstanceOf(ApiError);
  return capturado as ApiError;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("token", () => {
  it("se guarda, se lee y se borra del localStorage", () => {
    expect(getToken()).toBeNull();
    setToken("jwt-123");
    expect(getToken()).toBe("jwt-123");
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("viaja como Bearer cuando hay sesión, y no se manda nada cuando no la hay", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { ok: true }));

    await api.get("/api/actividades");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();

    setToken("jwt-123");
    await api.get("/api/actividades");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer jwt-123");
  });
});

describe("peticiones correctas", () => {
  it("arma la URL con la base y devuelve el JSON", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { id: "7", nombre: "Yoga" }));

    const data = await api.get<{ id: string; nombre: string }>("/api/actividades/7");

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/actividades/7`, expect.objectContaining({ method: "GET" }));
    expect(data).toEqual({ id: "7", nombre: "Yoga" });
  });

  it("un POST serializa el cuerpo y declara el Content-Type", async () => {
    fetchMock.mockResolvedValue(respuesta(200, {}));

    await api.post("/api/soporte/reportes", { asunto: "No puedo entrar" });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ asunto: "No puedo entrar" });
  });

  it("un 204 no intenta parsear cuerpo", async () => {
    fetchMock.mockResolvedValue(respuesta(204));
    await expect(api.delete("/api/favoritos/7")).resolves.toBeUndefined();
  });
});

describe("errores", () => {
  it("un error del backend conserva su código, su mensaje y sus errores por campo", async () => {
    fetchMock.mockResolvedValue(
      respuesta(400, {
        code: "VALIDACION",
        message: "Ingresá un correo electrónico válido",
        fieldErrors: { email: "formato inválido" },
      }),
    );

    const error = await apiErrorDe(api.post("/api/usuarios", {}));

    expect(error.code).toBe("VALIDACION");
    expect(error.message).toBe("Ingresá un correo electrónico válido");
    expect(error.status).toBe(400);
    expect(error.fieldErrors).toEqual({ email: "formato inválido" });
  });

  it("una respuesta de error sin JSON cae al mensaje genérico", async () => {
    fetchMock.mockResolvedValue(respuesta(500, undefined, "text/html"));

    const error = await apiErrorDe(api.get("/api/actividades"));

    expect(error.code).toBe("ERROR_INTERNO");
    expect(error.message).toBe("Ocurrió un error inesperado. Intentá de nuevo más tarde.");
    expect(error.status).toBe(500);
  });

  it("el backend caído es ERROR_RED con status 0, no una excepción cualquiera", async () => {
    // Es la señal que usan las pantallas para ofrecer "Reintentar" y `esIaNoDisponible`
    // para caer al comportamiento sin IA.
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await apiErrorDe(api.get("/api/actividades"));

    expect(error.code).toBe("ERROR_RED");
    expect(error.status).toBe(0);
  });

  it("una descarga fallida no devuelve un blob roto", async () => {
    fetchMock.mockResolvedValue(respuesta(403, undefined, "application/pdf"));

    const error = await apiErrorDe(api.getBlob("/api/instructores/documentos/9"));

    expect(error.message).toBe("No pudimos descargar el archivo.");
    expect(error.status).toBe(403);
  });
});

describe("multipart", () => {
  it("no pone Content-Type: el boundary lo arma el navegador", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { url: "/uploads/1.png" }));
    const form = new FormData();
    form.append("archivo", new Blob(["x"]), "foto.png");

    await api.postForm("/api/actividades/1/fotos", form);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Content-Type"]).toBeUndefined();
    expect(init.body).toBe(form);
  });
});
