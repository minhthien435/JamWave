const prisma = require("../lib/prisma");
const { getArtistImage } = require("../services/artistImageService");
const { ensureArtistMeta } = require("../services/aiTools");

// Danh sách nghệ sĩ kèm số bài hát (xếp theo nhiều bài nhất)
const getArtists = async (req, res) => {
  try {
    const groups = await prisma.song.groupBy({
      by: ["artist"],
      _count: { _all: true },
      _max: { albumCover: true },
      orderBy: { _count: { artist: "desc" } },
    });

    const formatted = await Promise.all(
      groups.map(async (group) => ({
        name: group.artist,
        songCount: group._count._all,
        coverImg: group._max.albumCover,
        image: await getArtistImage(group.artist),
      }))
    );

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("Lỗi lấy danh sách nghệ sĩ:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy danh sách nghệ sĩ" });
  }
};

// Bài hát của một nghệ sĩ
const getArtistSongs = async (req, res) => {
  try {
    const name = req.params.name;

    if (!name) {
      return res.status(400).json({ error: "Tên nghệ sĩ không hợp lệ" });
    }

    const songs = await prisma.song.findMany({
      where: { artist: { equals: name, mode: "insensitive" }, duplicateOf: null },
      orderBy: { id: "asc" },
    });

    // Metadata nghệ sĩ từ MusicBrainz (on-demand enrich nếu chưa có)
    const dbName = songs[0]?.artist || name;
    const meta = await ensureArtistMeta(dbName);
    const albums = await prisma.album.findMany({
      where: { artist: { equals: dbName, mode: "insensitive" } },
      take: 6,
    });

    const songCount = songs.length;
    const coverImg = songs[0]?.albumCover || null;
    const image = songs[0] ? await getArtistImage(songs[0].artist, songs[0].source || null) : null;

    const artistInfo = {
      name: dbName,
      songCount,
      coverImg,
      image,
      genres: meta?.genres || [],
      country: meta?.country || null,
      yearRange: meta?.yearRange || null,
      aliases: meta?.aliases || [],
      albums: albums.map((a) => ({
        id: a.id,
        title: a.title,
        coverImg: a.coverImg,
        songCount: a.songs?.length || 0,
      })),
    };

    return res.status(200).json({ artist: artistInfo, songs });
  } catch (error) {
    console.error("Lỗi lấy bài hát của nghệ sĩ:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy bài hát của nghệ sĩ" });
  }
};

// Nghệ sĩ đang theo dõi của người dùng (kèm số bài hát)
const getFollowedArtists = async (req, res) => {
  try {
    const userId = req.user.userId;

    const followed = await prisma.userArtist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (followed.length === 0) {
      return res.status(200).json([]);
    }

    const groups = await prisma.song.groupBy({
      by: ["artist"],
      _count: { _all: true },
      _max: { albumCover: true },
      where: { artist: { in: followed.map((f) => f.artistName), mode: "insensitive" } },
    });

    const groupMap = new Map(
      groups.map((g) => [g.artist.toLowerCase(), { name: g.artist, songCount: g._count._all, coverImg: g._max.albumCover }])
    );

    const result = followed.map((f) => ({
      name: f.artistName,
      songCount: groupMap.get(f.artistName.toLowerCase())?.songCount || 0,
      coverImg: groupMap.get(f.artistName.toLowerCase())?.coverImg || null,
      followedAt: f.createdAt,
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi lấy nghệ sĩ đang theo dõi:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy nghệ sĩ đang theo dõi" });
  }
};

// Follow một nghệ sĩ
const followArtist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const name = req.params.name;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Tên nghệ sĩ không hợp lệ" });
    }

    const existing = await prisma.userArtist.findUnique({
      where: { userId_artistName: { userId, artistName: name } },
    });
    if (existing) {
      return res.status(200).json({ message: "Bạn đã theo dõi nghệ sĩ này" });
    }

    await prisma.userArtist.create({
      data: { userId, artistName: name },
    });

    return res.status(201).json({ message: `Đã theo dõi ${name}` });
  } catch (error) {
    console.error("Lỗi follow nghệ sĩ:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi follow nghệ sĩ" });
  }
};

// Bỏ follow nghệ sĩ
const unfollowArtist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const name = req.params.name;

    await prisma.userArtist.delete({
      where: { userId_artistName: { userId, artistName: name } },
    });

    return res.status(200).json({ message: `Đã bỏ theo dõi ${name}` });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Bạn chưa theo dõi nghệ sĩ này" });
    }
    console.error("Lỗi unfollow nghệ sĩ:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi bỏ follow nghệ sĩ" });
  }
};

module.exports = {
  getArtists,
  getArtistSongs,
  getFollowedArtists,
  followArtist,
  unfollowArtist,
};
