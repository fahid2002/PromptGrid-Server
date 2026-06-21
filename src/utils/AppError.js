// Custom error class for API errors
export class AppError extends Error {
  constructor(status, message, details) {
    super(message);

    this.status = status;
    this.details = details;
  }
}