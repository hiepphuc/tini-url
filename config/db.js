const mongoose = require('mongoose');

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB! 🍃');
    } catch (err) {
        console.error('Could not connect to MongoDB:', err);
        process.exit(1); // Dừng app nếu không kết nối được DB
    }
}

module.exports = connectDB; 