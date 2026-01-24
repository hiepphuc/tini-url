const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema(
{
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        unique: false,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
},
{
    timestamps: true
});

UserSchema.pre('save', async function () {
    const user = this;

    // Trường hợp user không thay đổi mật khẩu thì kết thúc và đi tiếp luôn (return)
    if (!user.isModified('password')) return;
    
    // Trường hợp user đổi mật khẩu hoặc tạo tài khoản lần đầu (tạo mật khẩu lần đầu)
    const salt = await bcrypt.genSalt(10); // Salt độ phức tạp 10 vòng
    const hash = await bcrypt.hash(user.password, salt);
    user.password = hash;
});

UserSchema.methods.matchPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);