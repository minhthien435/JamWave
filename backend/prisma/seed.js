// Seed dữ liệu từ Jamendo API + Audius API (Creative Commons & Decentralized Indie Music)
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const prisma = new PrismaClient();

const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID;
const JAMENDO_API_BASE = 'https://api.jamendo.com/v3.0/tracks/';
const AUDIUS_API_BASE = 'https://discoveryprovider.audius.co/v1/tracks';

const MAX_SONGS_JAMENDO = 1500;
const MAX_SONGS_AUDIUS = 1000;
const LIMIT = 200;

// Jamendo genre groups
const GENRE_GROUPS = [
  ['lounge', 'chillout'],
  ['electronic', 'dance'],
  ['hip-hop', 'rap'],
  ['pop', 'singer-songwriter'],
  ['rock', 'metal'],
  ['jazz', 'blues'],
  ['relaxation', 'ambient'],
  ['classical', 'instrumental'],
  ['world', 'reggae'],
  ['soundtrack', 'cinematic'],
  ['acoustic', 'guitar'],
];

const SEARCH_TERMS = [
  'lofi', 'phonk', 'chill', 'synthwave', 'vietnamese',
  'piano', 'sleep', 'deep house', 'meditation', 'workout',
  'rap', 'rock', 'acoustic', 'house', 'funk',
];

// Audius Genres & Query terms
const AUDIUS_GENRES = [
  'Electronic', 'Hip-Hop/Rap', 'Alternative', 'Pop',
  'Rock', 'Lofi', 'Ambient', 'Acoustic', 'House', 'Chill',
];

const AUDIUS_QUERIES = [
  'lofi', 'synthwave', 'chill', 'phonk', 'remix',
  'edm', 'piano', 'beats', 'ambient', 'trap',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- JAMENDO FETCH ---
async function fetchJamendoTracks(params) {
  const query = new URLSearchParams({
    client_id: JAMENDO_CLIENT_ID,
    format: 'json',
    limit: String(LIMIT),
    order: 'popularity_total',
    include: 'musicinfo',
    audioformat: 'mp32',
    imagesize: '500',
    ...params,
  });
  const url = `${JAMENDO_API_BASE}?${query}`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await axios.get(url, { timeout: 30000 });
      const results = response.data?.results || [];
      if (results.length > 0) return results;
    } catch (error) {
      if (attempt === 3) throw error;
    }
    await sleep(800);
  }
  return [];
}

// --- AUDIUS FETCH ---
async function fetchAudiusTracks(endpoint, params = {}) {
  const query = new URLSearchParams({
    app_name: 'JAMWAVE',
    ...params,
  });
  const url = `${AUDIUS_API_BASE}${endpoint}?${query}`;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await axios.get(url, { timeout: 20000 });
      const results = response.data?.data || [];
      if (results.length > 0) return results;
    } catch (error) {
      if (attempt === 3) console.error(`Audius fetch error (${url}):`, error.message);
    }
    await sleep(600);
  }
  return [];
}

async function main() {
  if (!JAMENDO_CLIENT_ID) {
    throw new Error('Thiếu JAMENDO_CLIENT_ID trong backend/.env');
  }

  console.log('🚀 Seeding data from Jamendo API + Audius API...');
  console.log(`Targets: Jamendo (${MAX_SONGS_JAMENDO} songs), Audius (${MAX_SONGS_AUDIUS} songs)`);

  // Xóa dữ liệu cũ để gán lại sạch sẽ
  await prisma.userSong.deleteMany();
  await prisma.playlistSong.deleteMany();
  await prisma.song.deleteMany();
  await prisma.album.deleteMany();

  const seenJamendo = new Set();
  const seenAudius = new Set();
  const albums = new Map(); // key: album:<id> -> album info
  const songsToCreate = [];

  // 1. ADD JAMENDO TRACKS
  const addJamendoTracks = (tracks) => {
    let added = 0;
    for (const track of tracks) {
      if (songsToCreate.filter((s) => s.source === 'jamendo').length >= MAX_SONGS_JAMENDO) break;
      if (!track.audio || !track.name || !track.artist_name || !track.image) continue;
      if (!track.duration || track.duration < 45) continue;
      if (seenJamendo.has(track.id)) continue;
      seenJamendo.add(track.id);

      let albumKey = null;
      if (track.album_id && track.album_name) {
        albumKey = `album:jamendo:${track.album_id}`;
        if (!albums.has(albumKey)) {
          albums.set(albumKey, {
            title: track.album_name,
            artist: track.artist_name,
            coverImg: track.album_image || track.image,
          });
        }
      }

      songsToCreate.push({
        title: track.name,
        artist: track.artist_name,
        albumCover: track.image,
        audioURL: track.audio,
        duration: Math.round(track.duration),
        releaseYear: track.releasedate ? new Date(track.releasedate).getFullYear() : null,
        genre: track.musicinfo?.tags?.genres?.slice(0, 3).join(', ') || 'Jamendo Indie',
        source: 'jamendo',
        albumKey,
      });
      added += 1;
    }
    return added;
  };

  // 2. ADD AUDIUS TRACKS
  const addAudiusTracks = (tracks) => {
    let added = 0;
    for (const track of tracks) {
      if (songsToCreate.filter((s) => s.source === 'audius').length >= MAX_SONGS_AUDIUS) break;
      if (!track.id || !track.title || !track.user?.name) continue;

      const duration = Math.round(track.duration || 180);
      if (duration < 45) continue; // skip overly short clips

      if (seenAudius.has(track.id)) continue;
      seenAudius.add(track.id);

      const albumCover =
        track.artwork?.['480x480'] ||
        track.artwork?.['1000x1000'] ||
        track.artwork?.['150x150'] ||
        track.user?.profile_picture?.['480x480'] ||
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500';

      const streamURL = `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream?app_name=JAMWAVE`;

      let albumKey = null;
      if (track.user?.name) {
        albumKey = `album:audius:${track.user.handle || track.user.name}`;
        if (!albums.has(albumKey)) {
          albums.set(albumKey, {
            title: `${track.user.name} Essentials`,
            artist: track.user.name,
            coverImg: albumCover,
          });
        }
      }

      songsToCreate.push({
        title: track.title,
        artist: track.user.name,
        albumCover,
        audioURL: streamURL,
        duration,
        releaseYear: track.release_date ? new Date(track.release_date).getFullYear() : 2026,
        genre: track.genre ? `Audius ${track.genre}` : 'Audius Indie',
        source: 'audius',
        albumKey,
      });
      added += 1;
    }
    return added;
  };

  // === SEED JAMENDO ===
  console.log('--- Fetching Jamendo Tracks ---');
  for (const tags of GENRE_GROUPS) {
    if (songsToCreate.filter((s) => s.source === 'jamendo').length >= MAX_SONGS_JAMENDO) break;
    try {
      const tracks = await fetchJamendoTracks({ fuzzytags: tags.join('+') });
      const added = addJamendoTracks(tracks);
      console.log(`  Jamendo tags "${tags.join('+')}": +${added}`);
    } catch (err) {
      console.error(`  Error Jamendo tags:`, err.message);
    }
    await sleep(150);
  }

  for (const term of SEARCH_TERMS) {
    if (songsToCreate.filter((s) => s.source === 'jamendo').length >= MAX_SONGS_JAMENDO) break;
    try {
      const tracks = await fetchJamendoTracks({ search: term });
      const added = addJamendoTracks(tracks);
      console.log(`  Jamendo search "${term}": +${added}`);
    } catch (err) {
      console.error(`  Error Jamendo search:`, err.message);
    }
    await sleep(150);
  }

  // === SEED AUDIUS ===
  console.log('--- Fetching Audius Tracks ---');
  try {
    const trending = await fetchAudiusTracks('/trending', { limit: '100' });
    const added = addAudiusTracks(trending);
    console.log(`  Audius trending: +${added}`);
  } catch (err) {
    console.error('  Error Audius trending:', err.message);
  }

  for (const genre of AUDIUS_GENRES) {
    if (songsToCreate.filter((s) => s.source === 'audius').length >= MAX_SONGS_AUDIUS) break;
    try {
      const tracks = await fetchAudiusTracks('/trending', { genre, limit: '50' });
      const added = addAudiusTracks(tracks);
      console.log(`  Audius genre "${genre}": +${added}`);
    } catch (err) {
      console.error(`  Error Audius genre ${genre}:`, err.message);
    }
    await sleep(150);
  }

  for (const query of AUDIUS_QUERIES) {
    if (songsToCreate.filter((s) => s.source === 'audius').length >= MAX_SONGS_AUDIUS) break;
    try {
      const tracks = await fetchAudiusTracks('/search', { query, limit: '50' });
      const added = addAudiusTracks(tracks);
      console.log(`  Audius query "${query}": +${added}`);
    } catch (err) {
      console.error(`  Error Audius query ${query}:`, err.message);
    }
    await sleep(150);
  }

  console.log(`Total collected: ${songsToCreate.length} songs (Jamendo: ${songsToCreate.filter(s=>s.source==='jamendo').length}, Audius: ${songsToCreate.filter(s=>s.source==='audius').length})`);

  // CREATE ALBUMS
  const albumEntries = [...albums.values()];
  await prisma.album.createMany({ data: albumEntries, skipDuplicates: true });
  console.log(`Albums created: ${albumEntries.length}`);

  const albumRows = await prisma.album.findMany({ select: { id: true, title: true, artist: true } });
  const albumIdByTitleArtist = new Map();
  for (const album of albumRows) {
    albumIdByTitleArtist.set(`${album.title}|||${album.artist}`, album.id);
  }

  for (const [key, albumInfo] of albums) {
    void key;
    const id = albumIdByTitleArtist.get(`${albumInfo.title}|||${albumInfo.artist}`);
    if (id) albumInfo.id = id;
  }

  // CREATE SONGS
  for (let i = 0; i < songsToCreate.length; i += 100) {
    const batch = songsToCreate.slice(i, i + 100).map(({ albumKey, ...song }) => ({
      ...song,
      albumId: albumKey ? albums.get(albumKey)?.id ?? null : null,
    }));
    await prisma.song.createMany({ data: batch });
  }

  console.log(`✅ Seed finished successfully! Total: ${songsToCreate.length} songs created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
