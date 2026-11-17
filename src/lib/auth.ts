import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const AUTH_COOKIE = "de_auth";

async function hmacHex(secret: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function env() {
  return (await getCloudflareContext({ async: true })).env;
}

/** Token changes if you change the PIN, which logs out every device. */
export async function expectedToken(): Promise<string> {
  const e = await env();
  if (!e.APP_PIN || !e.AUTH_SECRET) throw new Error("APP_PIN and AUTH_SECRET must be set");
  return hmacHex(e.AUTH_SECRET, `driver-earnings:${e.APP_PIN}`);
}

export async function checkPin(pin: string): Promise<boolean> {
  const e = await env();
  if (!e.APP_PIN) return false;
  // constant-time-ish compare via HMAC of both
  const a = await hmacHex(e.AUTH_SECRET, pin);
  const b = await hmacHex(e.AUTH_SECRET, e.APP_PIN);
  return a === b;
}

export async function isAuthed(): Promise<boolean> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return false;
  return token === (await expectedToken());
}

/** Wrap a route handler so it returns 401 unless logged in. */
export function withAuth<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    if (!(await isAuthed())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
    try {
      return await handler(...args);
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: "server error" }, { status: 500 });
    }
  };
}
