require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const app = express();
const PORT = 3000;
const Url = require('./models/Url');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB! 🍃'))
    .catch(err => console.error('Could not connect to MongoDB:', err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
        const verified = jwt.verify(token, 'secret_123');
        
        // Nếu ok, gán thông tin user vào request để các route sau dùng được
        req.user = verified; 
        
        // Cho đi tiếp
        next();
    } catch (err) {
        // Nếu lỗi (token đểu, hết hạn...) thì báo lỗi 400 hoặc 401
        res.status(400).send('Invalid Token');
    }
};

// Route để test middle verifyToken
app.get('/me', verifyToken, (req, res) => {
    res.json(req.user);
})
// Route để test method populate của mongoose
app.get('/history', verifyToken, async (req, res) => {
    const urls = await Url.find({userId: req.user._id}).populate('userId', '_id username email').exec();
    res.json(urls);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
});

app.get('/:shortUrlId', async (req, res) => {
    const shortUrlId = req.params.shortUrlId;
    try {
        const url = await Url.findOne({ shortUrlId: shortUrlId }).exec()
        if (url) {
            console.log(url.originalUrl);
            res.redirect(url.originalUrl)
        } else {
            res.send('Invalid URL, please check again or create a new one.')
        }
    } catch (err) {
        console.error(err);
        res.status(500).json('Server Error');
    }
});

app.post('/shorten', verifyToken, async (req, res) => {
    let originalUrl = req.body['url-input'];

    // Sanitize (làm sạch chuỗi) để url đúng chuẩn http(s)://...
    if (!originalUrl.startsWith('http')) {
        originalUrl = `http://${originalUrl}`;
    }

    // Kiểm tra URL, nếu không hợp lệ thì thông báo cho user
    async function isValidUrl(url) {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
            abortController.abort();
        }, 3000);

        try {
            const response = await fetch(url, {
                method: 'GET',
                // Một số web chặn bot, nên giả vờ là trình duyệt
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: abortController.signal
            });

            clearTimeout(timeoutId);

            return response.ok; // Trả về true nếu status code là 2xx
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request bị hủy do quá hạn (Timeout)!');
            } else {
                console.log('Lỗi khác:', error);
            }
            return false;
        }
    }
    const isLive = await isValidUrl(originalUrl);
    if (!isLive) {
        res.status(400).send('Invalid URL or Website is down!');
        return; // Kết thức ngay lập tức nếu link chết hoặc website hiện không hoạt động
    }

    const customId = req.body['custom-id-input'];
    // Nếu người dùng nhập custom ID (custom name)
    if (customId) {
        try {
            const url = await Url.findOne({ shortUrlId: customId }).exec();

            // Nếu id chưa có người chọn (trong db chưa có id này thì tạo link rút gọn với id này)
            if (!url) {
                const newUrl = await Url.create({ originalUrl: originalUrl, shortUrlId: customId, userId: req.user._id });
                res.send(`localhost:${PORT}/${customId}`);
            }
            // Nếu có người chọn rồi thì báo lỗi id (name) đã được chọn bởi người khác 
            else {
                res.status(400).json('Duplicate name: The name you chose has already been chosen by someone else.');
            }
            return;
        }
        catch (err) {
            console.error(err);
            return res.status(500).json('Server Error');
        }
    }

    // Nếu chạy xuống đây túc là người dùng không nhập custom id
    try {
        const url = await Url.findOne({ originalUrl: originalUrl }).exec();

        // TRƯỜNG HỢP 1: Đã tìm thấy url trong database, gửi phản hồi và DỪNG hàm luôn
        if (url) {
            return res.send(`localhost:${PORT}/${url.shortUrlId}`);
        }

        // TRƯỜNG HỢP 2: Nếu code chạy đến đây nghĩa là không tìm thấy (url là null)
        const newUrl = await Url.create({ originalUrl: originalUrl, userId: req.user._id });
        res.send(`localhost:${PORT}/${newUrl.shortUrlId}`);

    } catch (err) {
        // TRƯỜNG HỢP 3: Lỗi hệ thống (DB chết, mạng lỗi...)
        console.error(err);
        res.status(500).json('Server Error');
    }
});

app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;

    try {
        // Nếu username|email đã tồn tại (tìm thấy user trong db) thì báo lỗi username|email đã tồn tại
        let temp_user = await User.findOne({ $or: [{ username: username }, { email: email }] }).exec();
        if (temp_user) return res.status(400).send('Username or email existent');

        // Trường hợp tạo tài khoản cho người dùng
        await User.create({ username, password, email });
        res.json('Account registration successful')
    } catch (err) {
        console.error(err);
        res.status(500).json('Server Error');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username }).exec();
    // Nếu username không đúng (không tìm thấy user trong db) thì báo lỗi username không tồn tại
    if (!user) return res.status(400).send('Username nonexistent');
    // Nếu username đúng, password không đúng thì báo lỗi password không đúng
    if (! await user.matchPassword(password)) return res.status(400).send('Password incorrect');

    // Trường hợp login thành công (username và password đúng)
    const token = jwt.sign({ _id: user._id }, 'secret_123');
    res.json({ token: token });
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});