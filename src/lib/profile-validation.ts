import { z } from "zod";

export const profileImageSchema = z.string().trim().max(350000).refine(value => {
  if (!value) return true;
  if (/^\/images\/[a-zA-Z0-9/_ .-]+\.(png|jpe?g|webp)$/i.test(value) && !value.includes("..")) return true;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  const bytes = atob(match[2]);
  if (bytes.length > 262144) return false;
  return match[1] === "png" ? bytes.startsWith("\x89PNG\r\n\x1a\n") : match[1] === "jpeg" ? bytes.startsWith("\xff\xd8\xff") : bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
}, "Choisissez une image PNG, JPEG ou WebP de 256 Ko maximum");
