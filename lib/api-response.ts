import { NextResponse } from "next/server";
import { headers } from "next/headers";

export type ErrorCode =
  | "VALIDATION"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "STOCK"
  | "INTERNAL";

export function ok<T>(data: T, status = 200, message?: string) {
  let requestId: string | undefined;
  try {
    requestId = headers().get("x-request-id") ?? undefined;
  } catch {
    requestId = undefined;
  }
  const response = NextResponse.json(message ? { ...data, message } : data, { status });
  if (requestId) response.headers.set("x-request-id", requestId);
  return response;
}

export function fail(error: string, code: ErrorCode, status: number) {
  let requestId: string | undefined;
  try {
    requestId = headers().get("x-request-id") ?? undefined;
  } catch {
    requestId = undefined;
  }
  const response = NextResponse.json({ error, code, requestId }, { status });
  if (requestId) response.headers.set("x-request-id", requestId);
  return response;
}
