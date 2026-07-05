// frontend/src/app/api/proxy/[...path]/route.ts
//
// SECURITY PROXY — Server-Side API Key Injection + User Identity Forwarding
// ─────────────────────────────────────────────────────────────────────────────
// Two jobs:
//   1. Attach LEXA_SECRET_API_KEY before forwarding to FastAPI (hidden from browser).
//   2. Read the authenticated user's email from the NextAuth JWT session and
//      forward it as X-User-Email so FastAPI can scope queries per-user.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_API_URL;  // e.g. http://127.0.0.1:8000/api/v1
const SECRET_KEY       = process.env.LEXA_SECRET_API_KEY;  // SERVER-SIDE ONLY

if (!FASTAPI_BASE_URL) console.error("[Proxy] NEXT_PUBLIC_API_URL is not set");
if (!SECRET_KEY)       console.error("[Proxy] LEXA_SECRET_API_KEY is not set");

/**
 * Core proxy handler — works for every HTTP method.
 *
 * Request flow:
 *   Browser → /api/proxy/<path>?<query> → FastAPI/<path>?<query>
 *
 * Security headers injected at this layer:
 *   X-API-Key    — authenticates the backend request
 *   X-User-Email — identifies the signed-in user for per-user data isolation
 */
async function proxyRequest(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;

  // 1. Build the target FastAPI URL, preserving the original query string
  const pathSegment  = path.join("/");
  const searchParams = req.nextUrl.searchParams.toString();
  const targetUrl    = `${FASTAPI_BASE_URL}/${pathSegment}${searchParams ? `?${searchParams}` : ""}`;

  // 2. Read the authenticated session from the JWT cookie (server-side only)
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email ?? null;

  // 3. Build the forwarding headers
  const forwardHeaders = new Headers();

  // Forward Content-Type (needed for JSON + multipart uploads)
  const contentType = req.headers.get("content-type");
  if (contentType) forwardHeaders.set("content-type", contentType);

  // Inject the secret API key — authenticates the request to FastAPI
  forwardHeaders.set("x-api-key", SECRET_KEY ?? "");

  // Inject the user's email — FastAPI uses this to scope document queries
  if (userEmail) {
    forwardHeaders.set("x-user-email", userEmail);
    console.log(`[Proxy] Authenticated as: ${userEmail}`);
  } else {
    console.log("[Proxy] Unauthenticated request — no user email forwarded");
  }

  // 4. Read the request body for non-GET/HEAD requests
  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  try {
    // 5. Forward to FastAPI
    const fastapiResponse = await fetch(targetUrl, {
      method:  req.method,
      headers: forwardHeaders,
      body,
      cache: "no-store",
    });

    const responseBody        = await fastapiResponse.arrayBuffer();
    const responseContentType = fastapiResponse.headers.get("content-type") ?? "application/json";

    console.log(`[Proxy] ${req.method} /${pathSegment} → ${fastapiResponse.status}`);

    return new NextResponse(responseBody, {
      status:  fastapiResponse.status,
      headers: { "content-type": responseContentType },
    });

  } catch (error) {
    console.error("[Proxy] Network error forwarding to FastAPI:", error);
    return NextResponse.json(
      { error: "Could not reach the Lexa backend. Is FastAPI running?" },
      { status: 502 }
    );
  }
}

// Export a named handler for every HTTP method Next.js supports
export const GET     = proxyRequest;
export const POST    = proxyRequest;
export const PUT     = proxyRequest;
export const PATCH   = proxyRequest;
export const DELETE  = proxyRequest;
export const OPTIONS = proxyRequest;
