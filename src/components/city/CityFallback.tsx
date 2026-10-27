import { chapters } from "./data";
export default function CityFallback() {
 return <div className="city-fallback" aria-label="Illustration de QuickJob City">
  <svg viewBox="0 0 800 600" role="img" aria-label="Plan illustré : restaurant, boutique, espace événementiel, logistique et bureaux reliés par un chemin violet">
   <defs><linearGradient id="city-floor" x2="1" y2="1"><stop stopColor="#e2e8f9" /><stop offset="1" stopColor="#b9c7e5" /></linearGradient></defs>
   <path d="M70 340 410 170 750 340 410 520Z" fill="#a4b5d9" /><path d="M70 320 410 150 750 320 410 500Z" fill="url(#city-floor)" />
   <path d="m170 330 150-75 100 50 120-60 90 45-140 70-80-40-100 50" fill="none" stroke="#b99bff" strokeWidth="5" strokeLinejoin="round" />
   {[[210,260,80,65],[365,330,80,55],[540,280,90,65],[350,180,90,80],[480,200,75,125]].map(([x,y,w,h],i) => <g key={i}><path d={`M${x} ${y}v${-h}l${w/2} ${-w/4} ${w/2} ${w/4}v${h}l${-w/2} ${w/4}Z`} fill={i===4 ? "#aaa3c5" : "#d2cce1"} /><path d={`M${x+w/2} ${y+w/4}v${-h}l${w/2} ${-w/4}v${h}Z`} fill="#817397" /><path d={`M${x} ${y-h}l${w/2} ${-w/4} ${w/2} ${w/4} ${-w/2} ${w/4}Z`} fill="#ece4ff" /><path d={`M${x+8} ${y-h+25}l${w/2-15} ${(w/2-15)/2}v20l${-(w/2-15)} ${-(w/2-15)/2}Z`} fill="#554f83" /></g>)}
   <circle cx="170" cy="380" r="7" fill="#c6e7bf" /><circle cx="615" cy="355" r="7" fill="#c6e7bf" />
  </svg>
  <span>QuickJob City · aperçu illustré</span>
  <noscript><p>{chapters.map(c => c.title).join(" ")}</p></noscript>
 </div>;
}
