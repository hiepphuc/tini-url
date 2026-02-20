class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;

        // Giữ lại stack trace để dễ debug
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;