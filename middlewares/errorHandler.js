function errorHandler(err, req, res, next) {
    // Log lỗi ra console (hoặc sau này ghi ra file log)
    console.error('🔥 Error:', err.message);

    // 1. Xử lý lỗi Mongoose: Trùng lặp dữ liệu E11000
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({ error: `Duplicate value for field: ${field}. Please choose another one.` });
    }

    // 2. Xử lý lỗi xác thực Token của JWT (nếu có)
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    }

    //3. Xử lý các lỗi chủ động ném ra bằng AppError
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({ error: message });

}

module.exports = errorHandler;