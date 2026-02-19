// controllers/auth.controller.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

async function register(req, res) {
    const { username, password, email } = req.body;

    try {
        // Nếu username|email đã tồn tại (tìm thấy user trong db) thì báo lỗi username|email đã tồn tại
        let temp_user = await User.findOne({ $or: [{ username: username }, { email: email }] }).exec();
        if (temp_user) return res.status(400).json({ error: 'Username or email existent' });

        // Trường hợp tạo tài khoản cho người dùng
        await User.create({ username, password, email });
        res.json('Account registration successful')
    } catch (err) {
        console.error(err);
        res.status(500).json('Server Error');
    }
};

async function login(req, res) {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username }).exec();
    // Nếu username không đúng (không tìm thấy user trong db) thì báo lỗi username không tồn tại
    if (!user) return res.status(400).send({ error: 'Username nonexistent' });
    // Nếu username đúng, password không đúng thì báo lỗi password không đúng
    if (! await user.matchPassword(password)) return res.status(400).send('Password incorrect');

    // Trường hợp login thành công (username và password đúng)
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.json({ token: token });
};

function getMe (req, res) {
    res.json(req.user);
};

module.exports = { register, login, getMe };