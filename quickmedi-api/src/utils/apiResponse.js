/**
 * Standard API response formatter
 * Ensures consistent response structure across all endpoints
 */
export class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.success = statusCode >= 200 && statusCode < 300;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}

// Also export as function for backward compatibility
export const apiResponse = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export default ApiResponse;
