import { useEffect } from "react";

interface FacebookPixelProps {
  pixelId?: string;
}

const FacebookPixel = ({ pixelId = "863086442771786" }: FacebookPixelProps) => {
  useEffect(() => {
    // Remove any competing pixels (e.g. 9151671744940732) injected externally
    const removeCompetingPixels = () => {
      // Remove scripts from competing pixel
      document.querySelectorAll('script[src*="fbevents.js"]').forEach(el => el.remove());
      document.querySelectorAll('noscript').forEach(el => {
        if (el.innerHTML.includes('9151671744940732')) {
          el.remove();
        }
      });
    };

    removeCompetingPixels();

    // Reset fbq to ensure our pixel takes control
    (window as any).fbq = undefined;
    (window as any)._fbq = undefined;

    // Initialize Facebook Pixel fresh
    const initPixel = () => {
      window.fbq = function() {
        window.fbq.callMethod
          ? window.fbq.callMethod.apply(window.fbq, arguments)
          : window.fbq.queue.push(arguments);
      };
      
      if (!window._fbq) {
        window._fbq = window.fbq;
      }
      
      window.fbq.push = window.fbq;
      window.fbq.loaded = true;
      window.fbq.version = '2.0';
      window.fbq.queue = [];
      
      // Initialize ONLY our pixel and track PageView
      window.fbq('init', pixelId);
      window.fbq('track', 'PageView');
    };

    initPixel();

    // Load the Facebook Pixel script fresh
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);

    // Observe and block any competing pixel that gets injected later
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLScriptElement && node.textContent?.includes('9151671744940732')) {
            node.remove();
          }
          if (node instanceof HTMLElement && node.tagName === 'NOSCRIPT' && node.innerHTML?.includes('9151671744940732')) {
            node.remove();
          }
        });
      });
    });

    observer.observe(document.head, { childList: true });
    observer.observe(document.body, { childList: true });

    return () => observer.disconnect();
  }, [pixelId]);

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
};

// Extend Window interface for Facebook Pixel
declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export default FacebookPixel;
