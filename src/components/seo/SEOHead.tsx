import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "course";
  siteName?: string;
  locale?: string;
  noIndex?: boolean;
}

export const SEOHead = ({
  title,
  description,
  image,
  url,
  type = "website",
  siteName = "ABO Goiás",
  locale = "pt_BR",
  noIndex = false,
}: SEOHeadProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper to update or create meta tag
    const setMetaTag = (property: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${property}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, property);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    // Standard meta tags
    setMetaTag("description", description);
    if (noIndex) {
      setMetaTag("robots", "noindex, nofollow");
    } else {
      setMetaTag("robots", "index, follow");
    }

    // Open Graph tags
    setMetaTag("og:title", title, true);
    setMetaTag("og:description", description, true);
    setMetaTag("og:type", type, true);
    setMetaTag("og:site_name", siteName, true);
    setMetaTag("og:locale", locale, true);
    if (url) {
      setMetaTag("og:url", url, true);
    }
    if (image) {
      setMetaTag("og:image", image, true);
      setMetaTag("og:image:width", "1200", true);
      setMetaTag("og:image:height", "630", true);
    }

    // Twitter Card tags
    setMetaTag("twitter:card", image ? "summary_large_image" : "summary");
    setMetaTag("twitter:title", title);
    setMetaTag("twitter:description", description);
    if (image) {
      setMetaTag("twitter:image", image);
    }

    // Canonical URL
    if (url) {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", url);
    }

    // Cleanup function to reset title on unmount
    return () => {
      document.title = "Central SDR | Atendimento Inteligente";
    };
  }, [title, description, image, url, type, siteName, locale, noIndex]);

  return null;
};
