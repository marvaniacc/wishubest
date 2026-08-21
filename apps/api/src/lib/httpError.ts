export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function httpError(statusCode: number, code: string, message: string, details?: unknown): HttpError {
  return new HttpError(statusCode, code, message, details);
}

export function isHttpError(e: unknown): e is HttpError {
  return e instanceof HttpError;
}
