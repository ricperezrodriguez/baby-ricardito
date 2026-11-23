import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError, badRequest, notFound } from '../errors';

/** Last route: any unmatched URL answers with the same error body as the rest of the API. */
export const routeNotFoundHandler: RequestHandler = (req, _res, next) => {
  next(notFound('ROUTE_NOT_FOUND', `No route for ${req.method} ${req.originalUrl}.`));
};

/** Errors raised by Express itself (e.g. a malformed JSON body) carry a 4xx `status`. */
function isClientError(error: unknown): error is { status: number; type?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500
  );
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json(error.toBody());
    return;
  }

  if (isClientError(error)) {
    const apiError =
      error.status === 413
        ? new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.')
        : badRequest('INVALID_BODY', 'The request body is not valid JSON.');
    res.status(apiError.status).json(apiError.toBody());
    return;
  }

  console.error(error);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Unexpected server error.' });
};
