const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/auth.controller');
const verifyToken = require('../middlewares/auth.middleware.js');

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getMe);

module.exports = router;