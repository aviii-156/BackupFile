/**
 * Custom API Error class with status code
 */
export class ApiError extends Error {
  constructor(statusCode, message, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
