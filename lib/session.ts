// Anonymous session management helpers.
// AngleCraft uses a custom `sessions` table (no Supabase Auth). A UUID token is
// stored in an HTTP-only cookie (`session_token`) with a 7-day maxAge.

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Session, SessionStatus } from "@/lib/types";

export const SESSION_COOKIE_NAME = "session_token";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
}

export function sessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function createSession(): Promise<Session> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({})
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message ?? "unknown"}`);
  }

  return data as Session;
}

export async function getSessionByToken(
  token: string | undefined
): Promise<Session | null> {
  if (!token) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select()
    .eq("token", token)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch session: ${error.message}`);
  }

  if (!data) return null;

  if (isSessionExpired(data as Session)) {
    return null;
  }

  return data as Session;
}

export async function getSessionFromCookie(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return getSessionByToken(token);
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ status })
    .eq("id", sessionId);

  if (error) {
    throw new Error(`Failed to update session status: ${error.message}`);
  }
}

export function isSessionExpired(session: Session): boolean {
  return new Date(session.expires_at).getTime() < Date.now();
}

export async function checkSessionExpiry(
  session: Session
): Promise<boolean> {
  return isSessionExpired(session);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}
