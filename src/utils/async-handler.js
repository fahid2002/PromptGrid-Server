// Wraps async route handlers and sends errors to Express error handler
export const asyncHandler = (handler) => (request, response, next) =>
  Promise
    .resolve(handler(request, response, next))
    .catch(next);