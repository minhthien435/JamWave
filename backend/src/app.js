// backend/src/app.js
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client'); // 1. Khởi tạo Prisma Client
require('dotenv').config();

const app = express();
const prisma = new PrismaClient(); // 2. Khai báo instance Prisma

app.use(cors());
app.use(express.json());

// Giữ lại route kiểm tra server cũ của bạn
app.get('/', (req, res) => {
    res.send('Itunes API is running....');
});

// 3. THÊM ROUTE MỚI: API lấy toàn bộ danh sách bài hát từ Database
app.get('/api/songs', async (req, res) => {
    try {
        const songs = await prisma.song.findMany();
        res.json(songs);
    } catch (error) {
        console.error('Error to fetch song data:', error);
        res.status(500).json({ error: 'Error to fetch song data' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});