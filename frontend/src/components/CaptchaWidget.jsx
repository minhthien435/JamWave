import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

// Cloudflare Turnstile widget
const CaptchaWidget = forwardRef(function CaptchaWidget({ siteKey, onToken }, ref) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onTokenRef = useRef(onToken);

  // Luôn cập nhật ref tới hàm onToken mới nhất
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const reset = () => {
    if (widgetIdRef.current !== null && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
        if (onTokenRef.current) onTokenRef.current(null);
      } catch (e) {
        console.warn("Turnstile reset error:", e);
      }
    }
  };

  useImperativeHandle(ref, () => ({
    reset,
  }));

  useEffect(() => {
    if (!siteKey) return;

    const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      // Nếu đã có widget đang hiển thị trong container thì xóa trước để render sạch
      if (widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "dark",
          "refresh-expired": "auto",
          "refresh-timeout": "auto",
          callback: (token) => {
            if (onTokenRef.current) {
              onTokenRef.current(token);
            }
          },
          "expired-callback": () => {
            if (onTokenRef.current) {
              onTokenRef.current(null);
            }
          },
          "error-callback": () => {
            if (onTokenRef.current) {
              onTokenRef.current(null);
            }
          },
        });
      } catch (err) {
        console.error("Turnstile render error:", err);
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      let script = document.querySelector(`script[src*="turnstile/v0/api.js"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", renderWidget);
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  return <div ref={containerRef} className="flex justify-center my-1" />;
});

export default CaptchaWidget;