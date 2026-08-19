// Fast-path local player intents: xử lý tức thì ở client, không gọi API
// (Lệnh điều khiển player chậm 1-3s qua LLM là không chấp nhận được)

const clampVolume = (v) => Math.min(1, Math.max(0, Math.round(v * 100) / 100));

const VI_DIACRITIC = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;
const VI_HINTS = /(mình|bạn|nhé|bài|nhạc|âm lượng|tiếp theo|trước|sau|phát|dừng|tạm|tăng|giảm|bật|tắt|nghe)/i;

export function detectLanguage(text) {
  const t = (text || "").trim();
  if (!t) return "vi";
  if (/in english|english please|speak english/i.test(t)) return "en";
  if (/tiếng anh/i.test(t)) return "en";
  if (VI_DIACRITIC.test(t) || VI_HINTS.test(t)) return "vi";
  return "en";
}

const T = {
  pause: { vi: "Đã tạm dừng nhạc ⏸️", en: "Music paused ⏸️" },
  resume: { vi: "Đã tiếp tục phát nhạc ▶️", en: "Resumed playing ▶️" },
  next: { vi: "Đã chuyển sang bài tiếp theo ⏭️", en: "Playing the next track ⏭️" },
  previous: { vi: "Đã quay về bài trước ⏮️", en: "Going back to the previous track ⏮️" },
  volume: { vi: "Đã chỉnh âm lượng lên {v}% 🔊", en: "Volume set to {v}% 🔊" },
  volumeUp: { vi: "Đã tăng âm lượng lên {v}% 🔊", en: "Volume up to {v}% 🔊" },
  volumeDown: { vi: "Đã giảm âm lượng xuống {v}% 🔊", en: "Volume down to {v}% 🔊" },
  mute: { vi: "Đã tắt tiếng 🔇", en: "Muted 🔇" },
  unmute: { vi: "Đã bật tiếng 🔊", en: "Unmuted 🔊" },
  shuffle: { vi: "Đã bật phát ngẫu nhiên 🔀", en: "Shuffle on 🔀" },
  shuffleOff: { vi: "Đã tắt phát ngẫu nhiên 🔁", en: "Shuffle off 🔁" },
  noSong: { vi: "Hiện chưa có bài hát nào đang phát. Hãy phát một bài trước nhé! 🎵", en: "Nothing is playing right now. Play a song first! 🎵" },
  nowPlaying: { vi: "Đang phát: **{title}** — **{artist}** 🎶", en: "Now playing: **{title}** by **{artist}** 🎶" },
};

// Nhận diện lệnh điều khiển player
export function detectPlayerIntent(text) {
  const t = (text || "").trim().toLowerCase();
  if (!t) return null;

  if (/(đang phát bài gì|bài gì đang phát|bài đang phát là gì|bài đang phát tên gì|now playing|what'?s playing|what is playing|nhạc gì đang phát|đang nghe bài gì)/i.test(t)) {
    return { type: "now_playing" };
  }

  if (/(tạm dừng|dừng nhạc|dừng phát|pause|pausa|stop the music|stop music)/i.test(t)) {
    return { type: "pause" };
  }

  if (/(tiếp tục phát|phát tiếp|resume|unpause|bật lại nhạc|bắt đầu phát)/i.test(t)) {
    return { type: "resume" };
  }

  if (/(bài tiếp theo|bài kế tiếp|bài tiếp|bài kế|chuyển bài|phát bài tiếp theo|next song|next track|next\b|skip\b|chơi tiếp)/i.test(t)) {
    return { type: "next" };
  }

  if (/(bài trước|bài trước đó|quay lại bài|previous|back song|bài phía trước)/i.test(t)) {
    return { type: "previous" };
  }

  const volMatch = t.match(/(?:âm lượng|volume)[^\d]{0,12}(\d{1,3})\s*(?:%|percent)?/i);
  if (volMatch) {
    const value = Math.min(100, Math.max(0, parseInt(volMatch[1], 10)));
    return { type: "set_volume", value: value / 100, percent: value };
  }

  if (/(tăng âm lượng|bật to|volume up|lớn hơn|to hơn|âm lượng lên)/i.test(t)) {
    return { type: "volume_up" };
  }

  if (/(giảm âm lượng|bật nhỏ|volume down|nhỏ hơn|âm lượng xuống)/i.test(t)) {
    return { type: "volume_down" };
  }

  if (/(tắt tiếng|mute\b|im lặng|muted)/i.test(t)) {
    return { type: "mute" };
  }

  if (/(bật tiếng|unmute|bỏ tắt tiếng)/i.test(t)) {
    return { type: "unmute" };
  }

  if (/(trộn bài|shuffle|tráo bài|phát ngẫu nhiên chế độ|bật phát ngẫu nhiên|bật ngẫu nhiên|shuffle on)/i.test(t)) {
    return { type: "shuffle" };
  }

  return null;
}

// Thực thi lệnh trên player store, trả về reply text (null nếu không làm được)
export function executePlayerIntent(intent, lang, player) {
  const { currentSong, isPlaying, setIsPlaying, playNext, playPrevious, setVolume, toggleShuffle, volume } = player;

  const t = (obj) => obj[lang] || obj.vi || obj.en;

  switch (intent.type) {
    case "now_playing": {
      if (!currentSong) return t(T.noSong);
      return t(T.nowPlaying).replace("{title}", currentSong.title).replace("{artist}", currentSong.artist);
    }
    case "pause": {
      if (!currentSong) return t(T.noSong);
      if (isPlaying) setIsPlaying(false);
      return t(T.pause);
    }
    case "resume": {
      if (!currentSong) return t(T.noSong);
      if (!isPlaying) setIsPlaying(true);
      return t(T.resume);
    }
    case "next": {
      if (!currentSong) return t(T.noSong);
      playNext();
      return t(T.next);
    }
    case "previous": {
      if (!currentSong) return t(T.noSong);
      playPrevious();
      return t(T.previous);
    }
    case "set_volume": {
      setVolume(intent.value);
      return t(T.volume).replace("{v}", intent.percent);
    }
    case "volume_up": {
      const next = clampVolume(volume + 0.1);
      setVolume(next);
      return t(T.volumeUp).replace("{v}", Math.round(next * 100));
    }
    case "volume_down": {
      const next = clampVolume(volume - 0.1);
      setVolume(next);
      return t(T.volumeDown).replace("{v}", Math.round(next * 100));
    }
    case "mute": {
      setVolume(0);
      return t(T.mute);
    }
    case "unmute": {
      setVolume(volume === 0 ? 0.8 : volume);
      return t(T.unmute);
    }
    case "shuffle": {
      toggleShuffle();
      return t(T.shuffle);
    }
    default:
      return null;
  }
}