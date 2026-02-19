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

// Route để test middle verifyToken
app.get('/api/me', verifyToken, (req, res) => {
    res.json(req.user);
})
// Route để test method populate của mongoose
app.get('/api/history', verifyToken, async (req, res) => {
    const urls = await Url.find({userId: req.user._id}).populate('userId', '_id username email').exec();
    res.json(urls);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API dùng để redirect user khi user dùng link rút gọn
app.get('/:shortUrlId', async (req, res) => {
    const shortUrlId = req.params.shortUrlId;
    try {
        const url = await Url.findOneAndUpdate({ shortUrlId: shortUrlId }, {$inc: {visitCount: 1}}, {new: true}).exec();
        if (url) {
            console.log(req.url ,url.originalUrl);
            res.redirect(url.originalUrl);
        } else {
            res.send('Invalid URL, please check again or create a new one.')
        }
    } catch (err) {
        console.error(err);
        res.status(500).json('Server Error');
    }
});

// API dùng để xóa url (link rút gọn) (ví dụ user muốn xóa link rút gọn đã tạo)
app.delete('/api/delete', verifyToken, async (req, res) => {
    const shortUrlId = req.query.shortUrlId;
    try {
        const url = await Url.findOneAndDelete({ shortUrlId: shortUrlId, userId: req.user._id }).exec();
        if (url) {
            console.log(req.method, req.url ,url.originalUrl);
            res.json('Deleted successfully');
        } else {
            res.send('Invalid URL, please check again or create a new one.')
        }
    } catch (err) {
        console.error(err);
        res.status(500).json('Server Error');
    }
});

// API dùng để cập nhật url (link rút gọn) (ví dụ user muốn sửa lại link gốc hoặc alias (custom-id))
app.patch('/api/update', verifyToken, async (req, res) => {
    const shortUrlId = req.query.shortUrlId;
    const originalUrl = req.body['url-input'];
    const customId = req.body['custom-id-input'];

    try {
        const updatedUrl = {};
        if (originalUrl) updatedUrl.originalUrl = originalUrl;
        if (customId) updatedUrl.shortUrlId = customId;

        const url = await Url.findOneAndUpdate( { shortUrlId: shortUrlId, userId: req.user._id }, updatedUrl, { new: true } ).exec();

        if (url) {
            console.log(req.method, req.url ,url.originalUrl);
            res.json('Updated successfully');
        } else {
            res.send('Invalid URL, please check again or create a new one.')
        }
    } catch (err) {
        console.error(err);
        // Lỗi E11000 Duplicate Error (field unique bị trùng giá trị)
        if (err.code === 11000) {
            res.status(400).json('This name is already taken, please choose a another one.');    
        } else {
            res.status(500).json('Server Error');
        }
    }
});

app.post('/api/shorten', verifyToken, async (req, res) => {
    let originalUrl = req.body['url-input'];

    // Sanitize (làm sạch chuỗi) để url đúng chuẩn http(s)://...
    if (!originalUrl.startsWith('http')) {
        originalUrl = `http://${originalUrl}`;
    }

    // Kiểm tra URL, nếu không hợp lệ thì thông báo cho user
    function isValidUrl(url) {
        try {
            // Nếu url hợp lệ, không thì sẽ báo lỗi (chạy xuống catch trả về false)
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }
    if (!isValidUrl(originalUrl)) {
        // Kết thức ngay lập tức nếu url không hợp lệ
        return res.status(400).json({error: 'Invalid URL'});
    }

    const customId = req.body['custom-id-input'];
    // Nếu người dùng nhập custom ID (custom name)
    if (customId) {
        // Nếu custom id (alias) không hợp lệ thì thông báo lỗi cho user
        if (!/^[A-Za-z0-9-]+$/.test(customId)) {
            return res.status(400).json({error: 'Custom alias can only contain letters, numbers, and dashes'})
        }
        try {
            // Nếu id chưa có người chọn thì tạo, nếu đã có người chọn thì mongodb sẽ throw error
            await Url.create({ originalUrl: originalUrl, shortUrlId: customId, userId: req.user._id });
            return res.json({shortUrl: `${req.hostname}:${PORT}/${customId}`});
        }
        catch (err) {
            // Lỗi E11000 Duplicate Error (field unique bị trùng giá trị)
            if (err.code === 11000) {
                return res.status(400).json({error: 'This name is already taken, please choose a another one.'});    
            }
            // Lỗi khác
            console.error(err);
            return res.status(500).json({error: 'Server Error'});
        }
    }

    // Nếu chạy xuống đây túc là người dùng không nhập custom id
    try {
        // Tọa một doc trong db
        const newUrl = await Url.create({ originalUrl: originalUrl, userId: req.user._id });
        res.json({shortUrl: `${req.hostname}:${PORT}/${newUrl.shortUrlId}`});

    } catch (err) {
        // TRƯỜNG HỢP2 : Lỗi hệ thống (DB chết, mạng lỗi...)
        console.error(err);
        res.status(500).json('Server Error');
    }
});

app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;

    try {
        // Nếu username|email đã tồn tại (tìm thấy user trong db) thì báo lỗi username|email đã tồn tại
        let temp_user = await User.findOne({ $or: [{ username: username }, { email: email }] }).exec();
        if (temp_user) return res.status(400).json({error: 'Username or email existent'});

        // Trường hợp tạo tài khoản cho người dùng
        await User.create({ username, password, email });
        res.json('Account registration successful')
    } catch (err) {
        console.error(err);
        res.status(500).json('Server Error');
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username }).exec();
    // Nếu username không đúng (không tìm thấy user trong db) thì báo lỗi username không tồn tại
    if (!user) return res.status(400).send({error: 'Username nonexistent'});
    // Nếu username đúng, password không đúng thì báo lỗi password không đúng
    if (! await user.matchPassword(password)) return res.status(400).send('Password incorrect');

    // Trường hợp login thành công (username và password đúng)
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.json({ token: token });
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});