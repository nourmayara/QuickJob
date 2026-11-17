import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const STORE = path.join(process.cwd(), ".data", "message-uploads");
const allowed = new Map<string, { kind: string; max: number }>([
  ["image/jpeg", { kind: "IMAGE", max: 15_000_000 }], ["image/png", { kind: "IMAGE", max: 15_000_000 }], ["image/gif", { kind: "IMAGE", max: 15_000_000 }], ["image/webp", { kind: "IMAGE", max: 15_000_000 }],
  ["video/mp4", { kind: "VIDEO", max: 50_000_000 }], ["video/webm", { kind: "VIDEO", max: 50_000_000 }], ["video/quicktime", { kind: "VIDEO", max: 50_000_000 }],
  ["application/pdf", { kind: "DOCUMENT", max: 15_000_000 }], ["application/msword", { kind: "DOCUMENT", max: 15_000_000 }], ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", { kind: "DOCUMENT", max: 15_000_000 }], ["application/vnd.ms-excel", { kind: "DOCUMENT", max: 15_000_000 }], ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", { kind: "DOCUMENT", max: 15_000_000 }],
  ["audio/webm", { kind: "AUDIO", max: 15_000_000 }], ["audio/ogg", { kind: "AUDIO", max: 15_000_000 }], ["audio/mpeg", { kind: "AUDIO", max: 15_000_000 }], ["audio/mp4", { kind: "AUDIO", max: 15_000_000 }], ["audio/wav", { kind: "AUDIO", max: 15_000_000 }],
]);
const ext = new Map<string, string[]>([["application/pdf", ["pdf"]], ["application/msword", ["doc"]], ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ["docx"]], ["application/vnd.ms-excel", ["xls"]], ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ["xlsx"]]]);

function signatureOkay(mime: string, bytes: Uint8Array) {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (mime === "application/pdf") return String.fromCharCode(...bytes.slice(0, 4)) === "%PDF";
  if (mime === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50;
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (mime === "image/gif") return String.fromCharCode(...bytes.slice(0, 3)) === "GIF";
  if (mime === "image/webp") return String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (mime === "application/msword" || mime === "application/vnd.ms-excel") return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  if (mime.includes("openxmlformats-officedocument")) return bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (mime === "video/mp4" || mime === "video/quicktime" || mime === "audio/mp4") return ascii(4, 8) === "ftyp";
  if (mime === "video/webm") return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (mime === "audio/ogg") return ascii(0, 4) === "OggS";
  if (mime === "audio/wav") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE";
  if (mime === "audio/mpeg") return ascii(0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  return true;
}
export type StoredUpload = { kind: string; name: string; mimeType: string; size: number; storageKey: string; duration?: number };
export async function storeUpload(file: File, duration?: number): Promise<StoredUpload> {
  const rule = allowed.get(file.type);
  if (!rule) throw new Error("TYPE");
  if (!file.size || file.size > rule.max) throw new Error("SIZE");
  const suffix = file.name.split(".").pop()?.toLowerCase() || "";
  if (ext.has(file.type) && !ext.get(file.type)!.includes(suffix)) throw new Error("TYPE");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!signatureOkay(file.type, bytes)) throw new Error("TYPE");
  await mkdir(STORE, { recursive: true });
  const storageKey = randomUUID();
  await writeFile(path.join(STORE, storageKey), bytes, { flag: "wx" });
  return { kind: rule.kind, name: path.basename(file.name).slice(0, 180), mimeType: file.type, size: file.size, storageKey, ...(duration && duration > 0 ? { duration: Math.min(Math.round(duration), 86_400) } : {}) };
}
export const shareSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("LOCATION"), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict(),
  z.object({ kind: z.literal("CONTACT"), contactName: z.string().trim().min(1).max(100), contactPhone: z.string().trim().min(3).max(40) }).strict(),
]);
export async function storedFile(key: string) { return readFile(path.join(STORE, path.basename(key))); }
export async function removeStored(key: string) { await unlink(path.join(STORE, path.basename(key))).catch(() => undefined); }
