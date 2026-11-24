"use client";

export type Attachment = { id: number; kind: string; name: string | null; mimeType: string | null; size: number | null; duration: number | null; latitude: number | null; longitude: number | null; contactName: string | null; contactPhone: string | null };
const linkPattern = /(https?:\/\/[^\s<]+)/g;
function linkedText(text: string) {
  return text.split(linkPattern).map((part, index) => /^https?:\/\//.test(part) ? <a key={index} href={part} target="_blank" rel="noopener noreferrer">{part}</a> : part);
}
function sizeLabel(size: number | null) { return size ? `${(size / 1_000_000).toFixed(size > 10_000_000 ? 0 : 1)} Mo` : ""; }

export default function MessageContent({ messageId, body, attachments }: { messageId: number; body: string; attachments: Attachment[] }) {
  return <>
    {!!body && <p className="qj-message-text">{linkedText(body)}</p>}
    {attachments.map(item => {
      const url = `/api/messages/${messageId}/attachments/${item.id}`;
      if (item.kind === "IMAGE") return <a className="qj-media-card" href={url} target="_blank" rel="noopener noreferrer" key={item.id}><img src={url} alt={item.name || "Photo partagée"}/></a>;
      if (item.kind === "VIDEO") return <video className="qj-media-card" key={item.id} src={url} controls preload="metadata" playsInline/>;
      if (item.kind === "AUDIO") return <div className="qj-audio-card" key={item.id}><span>🎙️</span><audio src={url} controls preload="metadata"/><small>{item.duration ? `${item.duration} s` : "Message vocal"}</small></div>;
      if (item.kind === "DOCUMENT") return <a className="qj-document-card" href={url} download key={item.id}><span>{item.mimeType === "application/pdf" ? "PDF" : item.name?.toLowerCase().endsWith("xlsx") || item.name?.toLowerCase().endsWith("xls") ? "XLS" : "DOC"}</span><div><strong>{item.name}</strong><small>{sizeLabel(item.size)} · Télécharger</small></div></a>;
      if (item.kind === "LOCATION" && item.latitude !== null && item.longitude !== null) return <a className="qj-share-card" href={`https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=16/${item.latitude}/${item.longitude}`} target="_blank" rel="noopener noreferrer" key={item.id}><span>📍</span><div><strong>Localisation partagée</strong><small>Ouvrir dans la carte</small></div></a>;
      if (item.kind === "CONTACT") return <a className="qj-share-card" href={`tel:${encodeURIComponent(item.contactPhone || "")}`} key={item.id}><span>👤</span><div><strong>{item.contactName}</strong><small>{item.contactPhone}</small></div></a>;
      return null;
    })}
  </>;
}
