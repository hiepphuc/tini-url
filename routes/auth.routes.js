const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/auth.controller');
const verifyToken = require('../middlewares/auth.middleware.js');
const { authLimiter } = require('../middlewares/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', verifyToken, getMe);

module.exports = router;