/**
 * Central application error class with HTTP status code, machine-readable code,
 * and optional field-level validation errors.
 * Never exposes internal stack traces or database errors to clients.
 */
export class AppError extends Error {
  constructor(statusCode, code, message, fieldErrors = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  static badRequest(message = 'Invalid request parameters', fieldErrors = null, code = 'VALIDATION_ERROR') {
    return new AppError(400, code, message, fieldErrors);
  }

  static unauthorized(message = 'Authentication is required to access this resource', code = 'UNAUTHORIZED') {
    return new AppError(401, code, message);
  }

  static forbidden(message = 'You do not have permission to perform this action', code = 'FORBIDDEN') {
    return new AppError(403, code, message);
  }

  static notFound(message = 'The requested resource was not found', code = 'NOT_FOUND') {
    return new AppError(404, code, message);
  }

  static conflict(message = 'The resource was modified or conflicts with existing state', code = 'CONFLICT', fieldErrors = null) {
    return new AppError(409, code, message, fieldErrors);
  }

  static unprocessable(message = 'The request could not be processed due to business rule violations', fieldErrors = null, code = 'UNPROCESSABLE_ENTITY') {
    return new AppError(422, code, message, fieldErrors);
  }

  static tooManyRequests(message = 'Too many requests. Please wait before trying again.', code = 'RATE_LIMITED') {
    return new AppError(429, code, message);
  }

  static internal(message = 'An unexpected server error occurred', code = 'INTERNAL_ERROR') {
    return new AppError(500, code, message);
  }
}
