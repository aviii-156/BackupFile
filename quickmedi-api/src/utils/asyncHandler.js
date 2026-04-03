/**
 * Async handler wrapper to catch errors in async route handlers
 * Eliminates the need for try-catch blocks in controllers
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
