require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path')
const app = express();
const PORT = 3000;
const Url = require('./models/Url');

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB! 🍃'))
    .catch(err => console.error('Could not connect to MongoDB:', err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

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
})

app.post('/shorten', async (req, res) => {
    let originalUrl = req.body['url-input'];

    // Sanitize (làm sạch chuỗi) để url đúng chuẩn http(s)://...
    if (!originalUrl.startsWith('http')) {
        originalUrl = `http://${originalUrl}`;
    }

    // Kiểm tra URL, nếu không hợp lệ thì thông báo cho user
    async function isValidUrl(url) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                // Một số web chặn bot, nên giả vờ là trình duyệt
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            return response.ok; // Trả về true nếu status code là 2xx
        } catch (error) {
            console.log("Check URL error:", error.message);
            return false;
        }
    }
    const isLive = await isValidUrl(originalUrl);
    if (!isLive) {
        res.status(400).send('Invalid URL or Website is down!');
        return; // Kết thức ngay lập tức nếu link chết hoặc website hiện không hoạt động
    }

    // Rút gọn URL
    Url.findOne({ originalUrl: originalUrl }).exec()
        .then(url => {
            if (url) {
                // TRƯỜNG HỢP 1: Đã tìm thấy
                res.send(`localhost:${PORT}/${url.shortUrlId}`)
            } else {
                // TRƯỜNG HỢP 2: Không tìm thấy (url là null)
                Url.create({ originalUrl: originalUrl })
                    .then(newUrl => {
                        res.send(`localhost:${PORT}/${newUrl.shortUrlId}`);
                    })
                    .catch(err => {
                        console.error(err);
                        res.status(500).json('Server Error');
                    })
            }
        })
        .catch(err => {
            // TRƯỜNG HỢP 3: Lỗi hệ thống (DB chết, mạng lỗi...)
            console.error(err);
            res.status(500).json('Server Error');
        })
})

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
})