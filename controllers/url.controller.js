const { PORT } = require("..");
const Url = require("../models/Url");

async function getUrlHistory() {
    const urls = await Url.find({ userId: req.user._id }).populate('userId', '_id username email').exec();
    res.json(urls);
};

async function shortenUrl(req, res) {
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
        return res.status(400).json({ error: 'Invalid URL' });
    }

    const customId = req.body['custom-id-input'];
    // Nếu người dùng nhập custom ID (custom name)
    if (customId) {
        // Nếu custom id (alias) không hợp lệ thì thông báo lỗi cho user
        if (!/^[A-Za-z0-9-]+$/.test(customId)) {
            return res.status(400).json({ error: 'Custom alias can only contain letters, numbers, and dashes' })
        }
        try {
            // Nếu id chưa có người chọn thì tạo, nếu đã có người chọn thì mongodb sẽ throw error
            await Url.create({ originalUrl: originalUrl, shortUrlId: customId, userId: req.user._id });
            return res.json({ shortUrl: `${req.hostname}:${PORT}/${customId}` });
        }
        catch (err) {
            // Lỗi E11000 Duplicate Error (field unique bị trùng giá trị)
            if (err.code === 11000) {
                return res.status(400).json({ error: 'This name is already taken, please choose a another one.' });
            }
            // Lỗi khác
            console.error(err);
            return res.status(500).json({ error: 'Server Error' });
        }
    }

    // Nếu chạy xuống đây túc là người dùng không nhập custom id
    try {
        // Tọa một doc trong db
        const newUrl = await Url.create({ originalUrl: originalUrl, userId: req.user._id });
        res.json({ shortUrl: `${req.hostname}:${PORT}/${newUrl.shortUrlId}` });

    } catch (err) {
        // TRƯỜNG HỢP2 : Lỗi hệ thống (DB chết, mạng lỗi...)
        console.error(err);
        res.status(500).json('Server Error');
    }
};

async function deleteUrl(req, res) {
    const shortUrlId = req.query.shortUrlId;
    try {
        const url = await Url.findOneAndDelete({ shortUrlId: shortUrlId, userId: req.user._id }).exec();
        if (url) {
            console.log(req.method, req.url, url.originalUrl);
            res.json('Deleted successfully');
        } else {
            res.send('Invalid URL, please check again or create a new one.')
        }
    } catch (err) {
        console.error(err);
        res.status(500).json('Server Error');
    }
};

async function updateUrl(req, res) {
    const shortUrlId = req.query.shortUrlId;
    const originalUrl = req.body['url-input'];
    const customId = req.body['custom-id-input'];

    try {
        const updatedUrl = {};
        if (originalUrl) updatedUrl.originalUrl = originalUrl;
        if (customId) updatedUrl.shortUrlId = customId;

        const url = await Url.findOneAndUpdate({ shortUrlId: shortUrlId, userId: req.user._id }, updatedUrl, { new: true }).exec();

        if (url) {
            console.log(req.method, req.url, url.originalUrl);
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
};

async function redirectToUrl(req, res) {
    const shortUrlId = req.params.shortUrlId;
    try {
        const url = await Url.findOneAndUpdate({ shortUrlId: shortUrlId }, { $inc: { visitCount: 1 } }, { new: true }).exec();
        if (url) {
            console.log(req.url, url.originalUrl);
            res.redirect(url.originalUrl);
        } else {
            res.send('Invalid URL, please check again or create a new one.')
        }
    } catch (err) {
        console.error(err);
        res.status(500).json('Server Error');
    }
};

module.exports = {getUrlHistory, shortenUrl, deleteUrl, updateUrl, redirectToUrl};