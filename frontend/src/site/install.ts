// Set at build time. Without a Play URL the site shows the WhatsApp waitlist instead.
const PLAY_URL: string | undefined = import.meta.env.VITE_PLAY_STORE_URL;
const WHATSAPP: string | undefined = import.meta.env.VITE_WHATSAPP_NUMBER; // digits with country code, e.g. 91XXXXXXXXXX

export const isAndroid = () => /Android/i.test(navigator.userAgent);
export const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

export function playUrl(source = "website"): string | null {
  if (!PLAY_URL) return null;
  const url = new URL(PLAY_URL);
  url.searchParams.set("referrer", `utm_source=${source}`);
  return url.toString();
}

export function whatsappUrl(text: string): string | null {
  return WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}` : null;
}
