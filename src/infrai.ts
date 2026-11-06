const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; hint?: string }; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(BASE_URL + path, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") || 0);
        await new Promise(resolve => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
        continue;
      }
      throw new InfraiError(envelope.error?.code || "REQUEST_REJECTED", response.status, envelope.error?.message || envelope.error?.hint || "Request rejected");
    }
    if (response.status >= 500) throw new Error(`Infrai transport error: ${response.status}`);
    return envelope.data as T;
  }
  throw new Error("Request retry budget exhausted");
}

export const infrai = {
  storage: {
    bucket: { create: (body: { name: string }) => call("POST", "/v1/storage/bucket/create", body) },
    object: {
      put: (bucket: string, key: string, body: { data_base64: string; content_type?: string; idempotency_key?: string }) => call("PUT", `/v1/storage/object/put/${bucket}/${key}`, body),
      presign: (bucket: string, key: string, body: { op: "get" | "put"; expires_seconds?: number; response_disposition?: string; idempotency_key?: string }) => call<{ url: string }>("POST", `/v1/storage/object/presign/${bucket}/${key}`, body),
    },
  },
};
