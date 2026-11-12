import { NextRequest, NextResponse } from "next/server";

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const cookieName = projectId ? `a_session_${projectId}` : "a_session";

function config() {
  if (!endpoint || !projectId) throw new Error("Appwrite authentication is not configured.");
  return { endpoint: endpoint.replace(/\/$/, ""), projectId };
}

async function appwrite(path: string, init: RequestInit = {}, secret?: string) {
  const { endpoint, projectId } = config();
  const headers = new Headers(init.headers);
  headers.set("X-Appwrite-Project", projectId);
  headers.set("Content-Type", "application/json");
  if (secret) headers.set("Cookie", `${cookieName}=${secret}`);
  const response = await fetch(`${endpoint}/${path.replace(/^\//, "")}`, {
    ...init, headers, cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof data.message === "string" ? data.message : "Appwrite authentication failed.") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return { data, response };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password || password.length > 256) {
      return NextResponse.json({ error: "Enter your email address and password." }, { status: 400 });
    }

    const { data } = await appwrite("account/sessions/email", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (typeof data.secret !== "string" || typeof data.userId !== "string") {
      return NextResponse.json({ error: "Appwrite did not return a valid session." }, { status: 502 });
    }

    const result = NextResponse.json({ ok: true, userId: data.userId });
    result.cookies.set(cookieName, data.secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: typeof data.expire === "string"
        ? Math.max(0, Math.floor((new Date(data.expire).getTime() - Date.now()) / 1000))
        : 60 * 60 * 24 * 30,
    });
    return result;
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    return NextResponse.json({
      error: status === 401 ? "Email or password is incorrect." : "Unable to sign in. Please try again.",
    }, { status: status === 401 ? 401 : 503 });
  }
}

export async function GET(request: NextRequest) {
  const secret = request.cookies.get(cookieName)?.value;
  if (!secret) return NextResponse.json({ authenticated: false }, { status: 401 });
  try {
    const { data } = await appwrite("account", { method: "GET" }, secret);
    return NextResponse.json({
      authenticated: true,
      user: { id: data.$id, email: data.email, name: data.name, emailVerification: data.emailVerification },
    });
  } catch {
    const result = NextResponse.json({ authenticated: false }, { status: 401 });
    result.cookies.delete(cookieName);
    return result;
  }
}

export async function DELETE() {
  const result = NextResponse.json({ ok: true });
  result.cookies.delete(cookieName);
  return result;
}
