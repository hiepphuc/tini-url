const express = require('express');
const router = express.Router();
const { shortenUrl, getUrlHistory, redirectToUrl, deleteUrl, updateUrl } = require('../controllers/url.controller');
const verifyToken = require('../middlewares/auth.middleware.js');


// Route để test method populate của mongoose
router.get('/history', verifyToken, getUrlHistory);

// API dùng để redirect user khi user dùng link rút gọn
router.get('/:shortUrlId', redirectToUrl);

// API dùng để xóa url (link rút gọn) (ví dụ user muốn xóa link rút gọn đã tạo)
router.delete('/delete', verifyToken, deleteUrl);

// API dùng để cập nhật url (link rút gọn) (ví dụ user muốn sửa lại link gốc hoặc alias (custom-id))
router.patch('/update', verifyToken, updateUrl);

router.post('/shorten', verifyToken, shortenUrl);

module.exports = router;