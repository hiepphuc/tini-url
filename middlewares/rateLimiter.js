const { rateLimit } = require('express-rate-limit');
const AppError = require('../utils/AppError');

// Middleware giới hạn tạo Link rút gọn
const shortenUrlLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Thời gian: 15 phút (tính bằng milliseconds)
    limit: 20, // Giới hạn: Mỗi IP chỉ được gọi tối đa 20 lần trong 15 phút đó
    // Khi vượt quá giới hạn thì tự động ném ra lỗi để Global Error Handler bắt
    handler: (req, res, next) => {
        next(new AppError('Too many short URLs created from this IP. Please try again after 15 minutes.', 429));
    }
});

// Middleware giới hạn tạo Link rút gọn
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // Thời gian: 1 tiếng
    limit: 10, // Giới hạn: 10 lần đăng nhập/đăng ký
    handler: (req, res, next) => {
        next(new AppError('Too many sign-in/sign-up requests from this IP. Please try again after an hour.', 429));
    }
});

module.exports = { shortenUrlLimiter, authLimiter };