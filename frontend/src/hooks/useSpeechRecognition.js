import { useEffect, useRef, useState } from "react";

export function useSpeechRecognition({ lang = "vi-VN", onResult, onEnd } = {}) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(
    () => typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const recRef = useRef(null);

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  const start = () => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(" ").trim();
      rec.stop();
      if (transcript) onResult?.(transcript);
    };
    rec.onerror = () => {
      setListening(false);
      onEnd?.();
    };
    rec.onend = () => {
      setListening(false);
      onEnd?.();
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  useEffect(() => () => recRef.current?.stop(), []);

  return { listening, start, stop, supported };
}