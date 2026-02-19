const jwt = require('jsonwebtoken');

// Middleware xác thực token gửi từ client
function verifyToken(req, res, next) {
    const authHeader = req.header('Authorization');

    // 1. Kiểm tra: Nếu không có authHeader (authorization header) thì chặn luôn
    if (!authHeader) return res.status(401).json('Unauthorized');

    // 2. Lấy token (bỏ chữ 'Bearer ')
    const token = authHeader.replace('Bearer ', '');
    if (!token) return res.status(401).json('Unauthorized');

    // 3. Kiểm tra tính hợp lệ
    try {
        // Thử xác thực
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // Nếu ok, gán thông tin user vào request để các route sau dùng được
        req.user = verified; 
        
        // Cho đi tiếp
        next();
    } catch (err) {
        // Nếu lỗi (token đểu, hết hạn...) thì báo lỗi 400 hoặc 401
        res.status(400).send('Invalid Token');
    }
};

module.exports = verifyToken;