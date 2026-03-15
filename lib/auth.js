import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthors, verifyUserPassword } from "@/lib/db";

const AUTH_COOKIE = "ffo_session";

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSessionSecret() {
  return process.env.SESSION_SECRET || "dev-session-secret-change-me";
}

function sign(value) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function getAllowedAuthors() {
  return getAuthors();
}

export async function getSession() {
  const store = await cookies();
  const raw = store.get(AUTH_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  const [payloadPart, signaturePart] = raw.split(".");
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const expected = sign(payloadPart);
  const expectedBuffer = Buffer.from(expected);
  const givenBuffer = Buffer.from(signaturePart);

  if (expectedBuffer.length !== givenBuffer.length || !timingSafeEqual(expectedBuffer, givenBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadPart));
    if (!payload?.slug || !payload?.name || !payload?.exp) {
      return null;
    }

    if (Date.now() > payload.exp) {
      return null;
    }

    return {
      slug: payload.slug,
      author: payload.name
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function createSession(user) {
  const store = await cookies();
  const payload = {
    slug: user.slug,
    name: user.name,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signed = `${encoded}.${sign(encoded)}`;

  store.set(AUTH_COOKIE, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(AUTH_COOKIE);
}

export function authenticateUser(slug, password) {
  return verifyUserPassword(slug, password);
}
