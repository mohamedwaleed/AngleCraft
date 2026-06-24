// Edge Function invocation helper.
// Next.js route handlers call Supabase Edge Functions (AI-only) via fetch with
// the anon key Authorization header. Edge Functions return parsed JSON results.

import { z } from "zod";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function assertEnv(): { baseUrl: string; anonKey: string } {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  }
  return { baseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export interface InvokeEdgeFunctionOptions {
  /** Abort signal for timeout control. */
  signal?: AbortSignal;
}

/**
 * Invoke a Supabase Edge Function by name with a JSON payload.
 * Returns the parsed JSON response or throws on non-2xx / invalid JSON.
 */
export async function invokeEdgeFunction<T>(
  name: string,
  payload: unknown,
  options: InvokeEdgeFunctionOptions = {}
): Promise<T> {
  const { baseUrl, anonKey } = assertEnv();
  const url = `${baseUrl}/functions/v1/${name}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Edge Function "${name}" returned ${response.status}: ${text}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Invoke an Edge Function and validate the result against a Zod schema.
 */
export async function invokeEdgeFunctionWithSchema<T>(
  name: string,
  payload: unknown,
  schema: z.ZodType<T>,
  options: InvokeEdgeFunctionOptions = {}
): Promise<T> {
  const data = await invokeEdgeFunction<unknown>(name, payload, options);
  return schema.parse(data);
}
