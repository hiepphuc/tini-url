require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = 3000;
const Url = require('./models/Url');

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB! 🍃'))
    .catch(err => console.error('Could not connect to MongoDB:', err));

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/:shortUrlId', async (req, res) => {
    const shortUrlId = req.params.shortUrlId;
    try {
        const url = await Url.findOne( {shortUrlId: shortUrlId} ).exec()
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

app.post('/shorten', (req, res) => {
    let originalUrl = req.body.originalUrl
    // Sanitize (lam sach chuoi) để url đúng chuẩn http(s)://...
    if (!originalUrl.startsWith('http')) {
        originalUrl = `http://${originalUrl}`
    }
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