import type { ApiErrorBody } from '@baby-ricardito/contracts';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }

  toBody(): ApiErrorBody {
    return { code: this.code, message: this.message };
  }
}

export const badRequest = (code: string, message: string): ApiError => new ApiError(400, code, message);

export const notFound = (code: string, message: string): ApiError => new ApiError(404, code, message);

export const conflict = (code: string, message: string): ApiError => new ApiError(409, code, message);

export const unprocessableEntity = (code: string, message: string): ApiError =>
  new ApiError(422, code, message);
