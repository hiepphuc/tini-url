const Url = require("../models/Url");
const AppError = require('../utils/AppError');

async function getUrlHistory(req, res) {
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
        throw new AppError('Invalid URL', 400);
    }

    const customId = req.body['custom-id-input'];
    // Nếu người dùng nhập custom ID (custom name)
    if (customId) {
        // Nếu custom id (alias) không hợp lệ thì thông báo lỗi cho user
        if (!/^[A-Za-z0-9-]+$/.test(customId)) {
            throw new AppError('Custom alias can only contain letters, numbers, and dashes', 400);
        }

        // Nếu id chưa có người chọn thì tạo, nếu đã có người chọn thì mongodb sẽ throw error
        await Url.create({ originalUrl: originalUrl, shortUrlId: customId, userId: req.user._id });
        return res.json({ shortUrl: `${req.hostname}/${customId}` });
    }

    // Nếu chạy xuống đây túc là người dùng không nhập custom id
    // Tạo một doc trong db
    const newUrl = await Url.create({ originalUrl: originalUrl, userId: req.user._id });
    res.json({ shortUrl: `${req.hostname}/${newUrl.shortUrlId}` });
};

async function deleteUrl(req, res) {
    const shortUrlId = req.query.shortUrlId;

    const url = await Url.findOneAndDelete({ shortUrlId: shortUrlId, userId: req.user._id }).exec();

    if (url) {
        console.log(req.method, req.url, url.originalUrl);
        res.json('Deleted successfully');
    } else {
        throw new AppError('Invalid URL, please check again or create a new one.', 400);
    }
};

async function updateUrl(req, res) {
    const shortUrlId = req.query.shortUrlId;
    const originalUrl = req.body['url-input'];
    const customId = req.body['custom-id-input'];

    const updatedUrl = {};
    if (originalUrl) updatedUrl.originalUrl = originalUrl;
    if (customId) updatedUrl.shortUrlId = customId;

    const url = await Url.findOneAndUpdate({ shortUrlId: shortUrlId, userId: req.user._id }, updatedUrl, { new: true }).exec();

    if (url) {
        console.log(req.method, req.url, url.originalUrl);
        res.json('Updated successfully');
    } else {
        throw new AppError('Invalid URL, please check again or create a new one.', 400);
    }
};

async function redirectToUrl(req, res) {
    const shortUrlId = req.params.shortUrlId;

    const url = await Url.findOneAndUpdate({ shortUrlId: shortUrlId }, { $inc: { visitCount: 1 } }, { new: true }).exec();

    if (url) {
        console.log(req.url, url.originalUrl);
        res.redirect(url.originalUrl);
    } else {
        throw new AppError('Invalid URL, please check again or create a new one.', 400);
    }
};

module.exports = { getUrlHistory, shortenUrl, deleteUrl, updateUrl, redirectToUrl };