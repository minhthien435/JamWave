// Chia sẻ thẻ <audio> duy nhất của PlayerBar để NowPlayingModal truy cập
// (visualizer WebAudio + seek + theo dõi thời gian)
let audioElement = null;

export const setAudioElement = (el) => {
  audioElement = el;
};

export const getAudioElement = () => audioElement;
