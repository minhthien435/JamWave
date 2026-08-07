// backend/src/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const prisma = require('./lib/prisma');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Spotify Clone API is running');
});

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
