const mongoose = require('mongoose')
const { nanoid } = require('nanoid') 

// 1. Định nghĩa Schema (Khuôn mẫu)
const UrlSchema = new mongoose.Schema({
    originalUrl: {
        type: String,
        required: true,
        unique: false,
    },
    shortUrlId: {
        type: String,
        required: true,
        unique: true,
        default: () => nanoid(8) // Tự động sinh mã 8 ký tự nếu không gửi lên
    }
})

// 2. Tạo Model từ Schema và Export
// 'Url' ở đây sẽ là tên của Collection trong Database (Mongoose sẽ tự đổi thành số nhiều: urls)
module.exports = mongoose.model('Url', UrlSchema)