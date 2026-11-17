"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Attachment } from "./MessageContent";

type Message = { id: number; senderId: number; body: string; createdAt: string; readAt: string | null; attachments: Attachment[] };
type Share = { kind: "LOCATION"; latitude: number; longitude: number } | { kind: "CONTACT"; contactName: string; contactPhone: string };
const emojis = ["😀","😂","😍","👍","🙏","🎉","❤️","🔥","👏","😊","🤝","✅","📍","💼","⭐","💪"];
const accepted = "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,application/pdf,.doc,.docx,.xls,.xlsx,audio/webm,audio/ogg,audio/mpeg,audio/mp4,audio/wav";

export default function MessageComposer({ endpoint, onSent, onError }: { endpoint: string; onSent: (message: Message) => void; onError: (message: string) => void }) {
  const textRef = useRef<HTMLTextAreaElement>(null), inputRef = useRef<HTMLInputElement>(null), recorderRef = useRef<MediaRecorder | null>(null), timerRef = useRef<number | null>(null);
  const [files, setFiles] = useState<File[]>([]), [share, setShare] = useState<Share | null>(null), [menu, setMenu] = useState(false), [emoji, setEmoji] = useState(false), [pending, setPending] = useState(false), [progress, setProgress] = useState(0), [recording, setRecording] = useState(false), [duration, setDuration] = useState(0);
  const previews = files.map(file => ({ file, url: URL.createObjectURL(file) }));
  useEffect(() => () => previews.forEach(item => URL.revokeObjectURL(item.url)));

  function choose(accept = accepted) { if (inputRef.current) { inputRef.current.accept = accept; inputRef.current.click(); } setMenu(false); }
  function addEmoji(value: string) { const field = textRef.current; if (!field) return; const start = field.selectionStart, end = field.selectionEnd; field.value = field.value.slice(0, start) + value + field.value.slice(end); field.focus(); field.setSelectionRange(start + value.length, start + value.length); }
  function location() { setMenu(false); if (!navigator.geolocation) return onError("La géolocalisation n’est pas disponible"); navigator.geolocation.getCurrentPosition(position => setShare({ kind: "LOCATION", latitude: position.coords.latitude, longitude: position.coords.longitude }), () => onError("Impossible d’obtenir votre localisation"), { enableHighAccuracy: true, timeout: 10_000 }); }
  function contact() { setMenu(false); const contactName = window.prompt("Nom du contact")?.trim(), contactPhone = contactName ? window.prompt("Numéro de téléphone")?.trim() : ""; if (contactName && contactPhone) setShare({ kind: "CONTACT", contactName, contactPhone }); }
  async function toggleRecording() {
    if (recording) { recorderRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const chunks: Blob[] = []; const recorder = new MediaRecorder(stream); recorderRef.current = recorder; setDuration(0);
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => { const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" }); setFiles([new File([blob], `vocal-${Date.now()}.webm`, { type: blob.type })]); stream.getTracks().forEach(track => track.stop()); setRecording(false); if (timerRef.current) window.clearInterval(timerRef.current); };
      recorder.start(); setRecording(true); timerRef.current = window.setInterval(() => setDuration(value => value + 1), 1000);
    } catch { onError("Autorisez le microphone pour enregistrer un message vocal"); }
  }
  function send() {
    if (pending) return; const body = textRef.current?.value.trim() || ""; if (!body && !files.length && !share) return;
    const data = new FormData(); data.set("body", body); files.forEach(file => data.append("files", file)); if (share) data.set("share", JSON.stringify(share)); if (duration) data.set("duration", String(duration));
    const xhr = new XMLHttpRequest(); setPending(true); setProgress(0); onError(""); xhr.open("POST", endpoint); xhr.upload.onprogress = event => { if (event.lengthComputable) setProgress(Math.round(event.loaded * 100 / event.total)); };
    xhr.onload = () => { setPending(false); if (xhr.status !== 201) { try { onError(JSON.parse(xhr.responseText).error || "Envoi impossible"); } catch { onError("Envoi impossible"); } return; } onSent(JSON.parse(xhr.responseText)); if (textRef.current) { textRef.current.value = ""; textRef.current.style.height = "auto"; } setFiles([]); setShare(null); setDuration(0); setProgress(0); };
    xhr.onerror = () => { setPending(false); onError("Connexion au serveur impossible"); }; xhr.send(data);
  }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }

  return <div className="qj-composer-wrap">
    {(files.length > 0 || share) && <div className="qj-attachment-preview">
      {previews.map(({ file, url }, index) => <div key={`${file.name}-${index}`}>{file.type.startsWith("image/") ? <img src={url} alt="Aperçu"/> : file.type.startsWith("video/") ? <video src={url}/> : file.type.startsWith("audio/") ? <audio src={url} controls/> : <span>📄</span>}<strong>{file.name}</strong><button type="button" onClick={() => setFiles(values => values.filter((_, position) => position !== index))} aria-label="Retirer le fichier">×</button></div>)}
      {share && <div><span>{share.kind === "LOCATION" ? "📍" : "👤"}</span><strong>{share.kind === "LOCATION" ? "Localisation" : share.contactName}</strong><button type="button" onClick={() => setShare(null)} aria-label="Annuler le partage">×</button></div>}
      {pending && <progress value={progress} max="100" aria-label={`Téléversement ${progress} %`}/>} 
    </div>}
    <div className="qj-message-form" aria-busy={pending}>
      <input ref={inputRef} hidden type="file" multiple onChange={event => setFiles(Array.from(event.target.files || []).slice(0, 5))}/>
      <div className="qj-composer-popover"><button type="button" className="qj-composer-icon qj-add" aria-label="Partager" aria-expanded={menu} onClick={() => { setMenu(value => !value); setEmoji(false); }}>+</button>{menu && <div className="qj-share-menu"><button type="button" onClick={() => choose("image/*")}><span>🖼️</span>Photo</button><button type="button" onClick={() => choose("video/*")}><span>🎬</span>Vidéo</button><button type="button" onClick={() => choose(".pdf,.doc,.docx,.xls,.xlsx")}><span>📄</span>Document</button><button type="button" onClick={location}><span>📍</span>Localisation</button><button type="button" onClick={contact}><span>👤</span>Contact</button></div>}</div>
      <label><span className="sr-only">Votre message</span><textarea ref={textRef} maxLength={4000} rows={1} disabled={pending || recording} placeholder={recording ? `Enregistrement… ${duration} s` : "Écrivez un message…"} onKeyDown={keyDown} onInput={event => { const field = event.currentTarget; field.style.height = "auto"; field.style.height = `${Math.min(field.scrollHeight, 104)}px`; }}/></label>
      <div className="qj-composer-popover"><button type="button" className="qj-composer-icon" aria-label="Choisir un emoji" onClick={() => { setEmoji(value => !value); setMenu(false); }}>☺</button>{emoji && <div className="qj-emoji-menu">{emojis.map(value => <button type="button" key={value} onClick={() => addEmoji(value)}>{value}</button>)}</div>}</div>
      <button type="button" className={`qj-composer-icon qj-mic ${recording ? "is-recording" : ""}`} onClick={() => void toggleRecording()} aria-label={recording ? "Arrêter l’enregistrement" : "Enregistrer un vocal"}>{recording ? "■" : "🎙"}</button>
      <button type="button" className="qj-send-button" onClick={send} disabled={pending || recording} aria-label={pending ? "Envoi en cours" : "Envoyer le message"}>➤</button>
    </div>
  </div>;
}
