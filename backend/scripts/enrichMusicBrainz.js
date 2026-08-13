// Enrich metadata từ MusicBrainz (CC0) vào DB.
// Chạy thủ công: npm run mb-enrich
// - Bước 1: enrich nghệ sĩ (ArtistMeta): mbid, aliases, genres, country, yearRange
// - Bước 2: enrich bài hát (Song): mbid, isrc, artistMbid
// Resumable: bỏ qua nghệ sĩ/bài đã có mbid.
const { PrismaClient } = require("@prisma/client");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { searchArtist, searchRecording } = require("../src/services/musicBrainz");

const prisma = new PrismaClient();

// Giới hạn tùy chọn để test nhanh (0 = tất cả)
const ARTIST_LIMIT = Number(process.env.MB_ARTIST_LIMIT || 0);
const SONG_LIMIT = Number(process.env.MB_SONG_LIMIT || 0);

async function enrichArtists() {
  console.log("\n=== Bước 1: Enrich nghệ sĩ ===");
  const artists = await prisma.song.groupBy({ by: ["artist"] });
  let done = 0;
  let matched = 0;
  let skipped = 0;

  for (const { artist } of artists) {
    if (ARTIST_LIMIT && done >= ARTIST_LIMIT) {
      console.log(`  (Dừng do MB_ARTIST_LIMIT=${ARTIST_LIMIT})`);
      break;
    }
    done += 1;

    const existing = await prisma.artistMeta.findUnique({ where: { name: artist } });
    if (existing) {
      skipped += 1;
      continue;
    }

    const result = await searchArtist(artist);
    if (result) {
      await prisma.artistMeta.create({
        data: {
          artistMbid: result.mbid,
          name: result.name,
          aliases: result.aliases,
          genres: result.genres,
          country: result.country,
          yearRange: result.yearRange,
        },
      });
      matched += 1;
    }

    if (done % 25 === 0 || done === artists.length) {
      console.log(`  Nghệ sĩ đã xử lý: ${done}/${artists.length} (match: ${matched}, skip: ${skipped})`);
    }
  }

  console.log(`\nKết thúc nghệ sĩ: ${done} xử lý, ${matched} match, ${skipped} đã có sẵn.`);
}

async function enrichSongs() {
  console.log("\n=== Bước 2: Enrich bài hát ===");
  const songs = await prisma.song.findMany({
    where: { mbid: null },
    select: { id: true, title: true, artist: true },
    orderBy: { id: "asc" },
  });
  let done = 0;
  let matched = 0;
  let skipped = 0;

  for (const song of songs) {
    if (SONG_LIMIT && done >= SONG_LIMIT) {
      console.log(`  (Dừng do MB_SONG_LIMIT=${SONG_LIMIT})`);
      break;
    }
    done += 1;

    // Lấy artistMbid từ cache ArtistMeta nếu có
    const meta = await prisma.artistMeta.findUnique({ where: { name: song.artist } });
    const result = await searchRecording(song.artist, song.title);

    if (result) {
      await prisma.song.update({
        where: { id: song.id },
        data: {
          mbid: result.mbid,
          isrc: result.isrc,
          artistMbid: meta?.artistMbid || null,
        },
      });
      matched += 1;
    } else {
      skipped += 1;
    }

    if (done % 50 === 0 || done === songs.length) {
      console.log(`  Bài đã xử lý: ${done}/${songs.length} (match: ${matched}, no-match: ${skipped})`);
    }
  }

  console.log(`\nKết thúc bài hát: ${done} xử lý, ${matched} match, ${skipped} không tìm thấy.`);
}

async function main() {
  console.log("🛰️  Bắt đầu enrich MusicBrainz...");
  await enrichArtists();
  await enrichSongs();
  console.log("\n✅ Hoàn tất enrich MusicBrainz!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });