import { useEffect, useRef } from "react";

// Nút "Đăng nhập bằng Google" (Google Identity Services, popup flow).
// Gọi onCredential(credential) với JWT id token khi thành công.
export default function GoogleButton({ clientId, onCredential }) {
  const buttonRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
    let cancelled = false;

    const init = () => {
      if (cancelled || !window.google?.accounts || initializedRef.current) return;
      initializedRef.current = true;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (!cancelled && response?.credential) {
            onCredential(response.credential);
          }
        },
      });
      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          width: 320,
          text: "continue_with",
        });
      }
    };

    if (window.google?.accounts) {
      init();
    } else {
      const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
      const script = existing || document.createElement("script");
      if (!existing) {
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", init);
    }

    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential]);

  return <div ref={buttonRef} className="flex justify-center" />;
}