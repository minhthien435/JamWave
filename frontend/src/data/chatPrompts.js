import { Coffee, Playlist, SlidersHorizontal, Compass } from "@phosphor-icons/react";

// Nguồn duy nhất cho các câu gợi ý nhanh trong AI chat (dùng chung giữa ChatBox và DocsPage)
export const CATEGORY_TABS = [
  {
    id: "mood",
    name: "Tâm trạng",
    icon: Coffee,
    prompts: [
      "Tìm nhạc indie chill cho việc học",
      "Gợi ý nhạc lofi thư giãn",
      "Nhạc acoustic cho ngày mưa",
      "Nhạc sôi động tập gym",
    ],
  },
  {
    id: "playlist",
    name: "Tạo Playlist",
    icon: Playlist,
    prompts: [
      "Tạo playlist nhạc lofi 10 bài",
      "Tạo playlist acoustic chill 5 bài",
      "Tạo playlist nhạc ngủ 8 bài",
      "Tạo playlist làm việc tập trung",
    ],
  },
  {
    id: "control",
    name: "Điều khiển",
    icon: SlidersHorizontal,
    prompts: [
      "Đang phát bài gì?",
      "Phát nhạc ngẫu nhiên",
      "Tăng âm lượng lên 80%",
      "Chuyển sang bài tiếp theo",
    ],
  },
  {
    id: "explore",
    name: "Khám phá",
    icon: Compass,
    prompts: [
      "Bài hát đang hot nhất",
      "Alexander Blu có bao nhiêu bài?",
      "Gợi ý các nghệ sĩ acoustic",
      "Bài tôi nghe nhiều nhất",
    ],
  },
];
