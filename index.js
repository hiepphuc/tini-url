require('dotenv').config();
const express = require('express');
const app = express();
const PORT = parseInt(process.env.PORT) || 3000;
const path = require('path');
const connectDB = require('./config/db');

//Import routes
const authRoutes = require('./routes/auth.routes');
const urlRoutes = require('./routes/url.routes');

// Ket noi DB
connectDB();

// Middlewares chung (JSON và FORM)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API routes
app.use('/api/auth', authRoutes);
app.use('api/url', urlRoutes);

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});