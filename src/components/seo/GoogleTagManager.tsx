import { useEffect } from "react";

interface GoogleTagManagerProps {
  gtmId?: string;
}

const GoogleTagManager = ({ gtmId = "GTM-N2GJP4D8" }: GoogleTagManagerProps) => {
  useEffect(() => {
    // Check if GTM is already loaded
    if (document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${gtmId}"]`)) {
      return;
    }

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js'
    });

    // Create and inject the GTM script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
    
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }, [gtmId]);

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  );
};

// Extend Window interface for dataLayer
declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

export default GoogleTagManager;
