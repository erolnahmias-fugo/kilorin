/** Shared client helper for backend mutations. Matches the { ok, data|error } envelope. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function postApi<T = unknown>(path: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as ApiResult<T>;
    return json;
  } catch {
    return { ok: false, error: 'Bağlantı hatası. Tekrar dene.' };
  }
}

export async function getApi<T = unknown>(path: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, { headers: { Accept: 'application/json' } });
    const json = (await res.json()) as ApiResult<T>;
    return json;
  } catch {
    return { ok: false, error: 'Bağlantı hatası. Tekrar dene.' };
  }
}
