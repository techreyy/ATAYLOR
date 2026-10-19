/**
 * HTTP client ke Laravel API (`API-ATAYLOR`). Token Sanctum disimpan per browser.
 * Pesan error aturan bisnis dari server (kode BR-xx) diteruskan apa adanya ke UI.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001/api/v1";

export const TOKEN_KEY = "ataylor_api_token";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage tidak tersedia */
    }
  },
};

type Query = Record<string, string | number | undefined | null>;

function buildUrl(path: string, query?: Query) {
  const url = new URL(API_BASE_URL + path);
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  return url.toString();
}

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Query; raw?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.query), { method: options.method ?? "GET", headers, body });
  } catch {
    throw new ApiError(
      "Tidak dapat terhubung ke server API. Pastikan backend Laravel berjalan (php artisan serve).",
      0,
      "NETWORK",
    );
  }

  if (options.raw && res.ok) return res as unknown as T;

  const text = await res.text();
  const json = text ? safeParse(text) : null;

  if (!res.ok) {
    if (res.status === 401) tokenStore.set(null);
    const message =
      (json?.message as string) ||
      (res.status === 403 ? "Akses ditolak untuk peran ini." : `Permintaan gagal (HTTP ${res.status}).`);
    throw new ApiError(message, res.status, json?.code, json?.errors);
  }

  return json as T;
}

function safeParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Unduh file dari endpoint terautentikasi (mis. CSV) lewat Blob. */
export async function apiDownload(path: string, filename: string, query?: Query) {
  const res = await apiFetch<Response>(path, { query, raw: true });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
