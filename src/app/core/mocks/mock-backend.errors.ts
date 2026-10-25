export interface ApiErrorBody {
  code: string;
  message: string;
}

export class MockApiError extends Error {
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

export const badRequest = (code: string, message: string): MockApiError =>
  new MockApiError(400, code, message);

export const notFound = (code: string, message: string): MockApiError =>
  new MockApiError(404, code, message);

export const conflict = (code: string, message: string): MockApiError =>
  new MockApiError(409, code, message);

export const unprocessableEntity = (code: string, message: string): MockApiError =>
  new MockApiError(422, code, message);
