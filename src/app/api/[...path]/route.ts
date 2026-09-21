import { type NextRequest } from "next/server";

/*
 * Proxy API same-origin (dev + self-hosted).
 *
 * Trình duyệt gọi /api/* trên CHÍNH origin của nó (không CORS), handler này
 * chuyển tiếp sang backend NestJS (BACKEND_URL) như một lời gọi server-to-server
 * sạch — bỏ `Origin`/`Referer`/`Host` của trình duyệt. Header Authorization
 * (JWT), X-Request-Id, Idempotency-Key và body (kể cả multipart upload) đi
 * nguyên vẹn. Soi gương cấu hình nginx same-origin khi go-live.
 *
 * Backend eco_backend không dùng cookie (token trong body) nên không cần
 * chuyển tiếp Set-Cookie.
 */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

/* Header hop-by-hop / origin KHÔNG được chuyển lên upstream. */
const STRIP_HEADERS = new Set([
  "host",
  "origin",
  "referer",
  "connection",
  "content-length",
  "accept-encoding",
]);

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const target = `${BACKEND_URL}/api/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);
  const requestId = upstream.headers.get("x-request-id");
  if (requestId) responseHeaders.set("x-request-id", requestId);

  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
