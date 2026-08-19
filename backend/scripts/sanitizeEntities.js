// Giải mã HTML entity bị lưu nhầm vào DB (vd "Axl &amp; Arth") -> hiển thị đẹp.
// Chạy: npm run sanitize   (idempotent — chỉ update dòng thay đổi, có thể chạy lại)
const { PrismaClient } = require("@prisma/client");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const prisma = new PrismaClient();

const ENTITIES = {
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
};

function decodeEntities(s) {
  if (!s || typeof s !== "string" || !s.includes("&")) return s;
  let out = s;
  for (let pass = 0; pass < 3; pass += 1) {
    const before = out;
    out = out.replace(/&(amp|quot|apos|lt|gt|nbsp|#39|#0*39);/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
    if (out === before) break;
  }
  return out;
}

function changed(a, b) {
  return a !== b;
}

async function main() {
  let total = 0;

  // Song
  const songs = await prisma.song.findMany({ select: { id: true, title: true, artist: true, genre: true } });
  for (const s of songs) {
    const title = decodeEntities(s.title);
    const artist = decodeEntities(s.artist);
    const genre = s.genre ? decodeEntities(s.genre) : null;
    if (!changed(title, s.title) && !changed(artist, s.artist) && !changed(genre, s.genre)) continue;
    await prisma.song.update({
      where: { id: s.id },
      data: { title, artist, genre },
    });
    total += 1;
    console.log(`  Song #${s.id} "${s.title}" -> "${title}"`);
  }

  // Album
  const albums = await prisma.album.findMany({ select: { id: true, title: true, artist: true } });
  for (const a of albums) {
    const title = decodeEntities(a.title);
    const artist = decodeEntities(a.artist);
    if (!changed(title, a.title) && !changed(artist, a.artist)) continue;
    await prisma.album.update({ where: { id: a.id }, data: { title, artist } });
    total += 1;
    console.log(`  Album #${a.id} "${a.title}" -> "${title}"`);
  }

  // ArtistProfile (name là PK — dùng raw UPDATE để đổi được PK)
  const profiles = await prisma.artistProfile.findMany({ select: { name: true } });
  for (const p of profiles) {
    const name = decodeEntities(p.name);
    if (!changed(name, p.name)) continue;
    await prisma.$executeRaw`UPDATE "ArtistProfile" SET "name" = ${name} WHERE "name" = ${p.name}`;
    total += 1;
    console.log(`  Profile "${p.name}" -> "${name}"`);
  }

  // ArtistMeta (name + aliases)
  const metas = await prisma.artistMeta.findMany({ select: { artistMbid: true, name: true, aliases: true } });
  for (const m of metas) {
    const name = decodeEntities(m.name);
    const aliases = m.aliases.map(decodeEntities);
    if (!changed(name, m.name) && JSON.stringify(aliases) === JSON.stringify(m.aliases)) continue;
    await prisma.artistMeta.update({ where: { artistMbid: m.artistMbid }, data: { name, aliases } });
    total += 1;
    console.log(`  Meta "${m.name}" -> "${name}"`);
  }

  console.log(`\n✅ Xong: đã sửa ${total} dòng.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
