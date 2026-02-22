require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const app = express();
const PORT = parseInt(process.env.PORT) || 3000;
const path = require('path');
const connectDB = require('./config/db');

//Import routes & controllers
const authRoutes = require('./routes/auth.routes');
const urlRoutes = require('./routes/url.routes');
const { redirectToUrl } = require('./controllers/url.controller');

//Import middlewares
const errorHandler = require('./middlewares/errorHandler');


// Ket noi DB
connectDB();

// Kích hoạt helmet thiết lập các http header bảo mật
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Cho phép mã JS viết trực tiếp trong thẻ <script>
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"], // Cho phép load CSS từ Bootstrap CDN
            connectSrc: ["'self'", "https://cdn.jsdelivr.net"] // Cho phép trình duyệt tải file map của Bootstrap
        }
    }
}));

// Middlewares chung (JSON và FORM)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/url', urlRoutes);

// Bỏ qua request xin favicon của trình duyệt
app.get('/favicon.ico', (req, res) => res.status(204).end());

// API dùng để redirect khi user dùng link rút gọn
app.get('/:shortUrlId', redirectToUrl);

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});