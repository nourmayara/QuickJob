import { useId } from "react";
import { cityPalette as palette, cityRoad } from "./cityArt";

const project = (x: number, y: number, z: number) => [400 + (x - z) * 11.5, 290 + (x + z) * 5.75 - y * 14];
const polygon = (points: number[][]) => points.map(([x, y, z]) => project(x, y, z).join(",")).join(" ");

function Cube({ x, z, width: w, depth: d, y, height: h, front = palette.white, side = "#d0c7e8", roof = "#fefcff" }: { x: number; z: number; width: number; depth: number; y: number; height: number; front?: string; side?: string; roof?: string }) {
 return <>
  <polygon points={polygon([[x-w/2,y,z+d/2],[x+w/2,y,z+d/2],[x+w/2,y+h,z+d/2],[x-w/2,y+h,z+d/2]])} fill={front} />
  <polygon points={polygon([[x+w/2,y,z+d/2],[x+w/2,y,z-d/2],[x+w/2,y+h,z-d/2],[x+w/2,y+h,z+d/2]])} fill={side} />
  <polygon points={polygon([[x-w/2,y+h,z-d/2],[x+w/2,y+h,z-d/2],[x+w/2,y+h,z+d/2],[x-w/2,y+h,z+d/2]])} fill={roof} />
 </>;
}
const buildings = [
 { id: "warehouse", x: -7, z: -8.3, width: 5.6, depth: 4.4, floors: 2, lavender: true, crown: false },
 { id: "workspace", x: 3.5, z: -9, width: 4.4, depth: 3.6, floors: 5, lavender: false, crown: true },
 { id: "annex", x: -1.5, z: -1.7, width: 2.1, depth: 2.3, floors: 2, lavender: false, crown: false },
 { id: "north", x: 10.6, z: -9, width: 2.8, depth: 3, floors: 3, lavender: true, crown: true },
 { id: "west", x: -11.3, z: 5.3, width: 2.1, depth: 2.5, floors: 2, lavender: true, crown: false },
 { id: "restaurant", x: -7, z: 4, width: 4.1, depth: 3.15, floors: 3, lavender: false, crown: true },
 { id: "boutique", x: 0, z: 5, width: 4, depth: 3.15, floors: 3, lavender: true, crown: false },
 { id: "event", x: 7, z: 2, width: 5.2, depth: 4, floors: 3, lavender: true, crown: true },
].sort((a,b) => a.x + a.z - b.x - b.z);

export default function CityFallback({ activePlace, loading = false }: { activePlace?: string | null; loading?: boolean }) {
 const gradient = useId();
 const road = cityRoad.map(([x,,z]) => project(x, .45, z));
 const street = road.reduce((path, [x,y], i) => {
  if (!i) return `M${x},${y}`;
  const previous = road[i-1];
  return `${path} Q${previous[0]},${previous[1]} ${(previous[0]+x)/2},${(previous[1]+y)/2}`;
 }, "") + ` L${road.at(-1)!.join(",")}`;
 return <div className="city-fallback" aria-label={loading ? "La ville se prépare" : "Vue illustrée de QuickJob City"}>
  <svg viewBox="50 85 700 400" role="img" aria-label="La ville QuickJob : restauration, commerce, événementiel, logistique et bureaux.">
   <defs><linearGradient id={gradient} x2="1" y2="1"><stop stopColor="#f5f0ff" /><stop offset="1" stopColor="#d7ceee" /></linearGradient></defs>
   <Cube x={0} z={-.4} width={29} depth={26} y={-.1} height={.5} front="#d1c6e6" side="#b6a9d3" roof={`url(#${gradient})`} />
   <path d={street} fill="none" stroke="#faf7ff" strokeWidth="23" strokeLinejoin="round" strokeLinecap="round" />
   <path d={street} fill="none" stroke={palette.blue} strokeWidth="18" strokeLinejoin="round" strokeLinecap="round" />
   <path d={street} fill="none" stroke="#c9b9ff" strokeWidth="1" />
   {buildings.map(({id,x,z,width:w,depth:d,floors,lavender,crown}) => {
    const h = floors * 1.25 + .45;
    const active = id === activePlace;
    return <g key={id}>
     <polygon points={polygon([[x-w/2,.42,z-d/2],[x+w/2+1.1,.42,z-d/2+.8],[x+w/2+1.1,.42,z+d/2+1],[x-w/2,.42,z+d/2]])} fill="#8374ae" opacity=".13" />
     <Cube x={x} z={z} width={w+.9} depth={d+.9} y={.4} height={.18} front="#eee8fa" side="#d6cde8" />
     <Cube x={x} z={z} width={w} depth={d} y={.6} height={h} front={active ? "#d7c4ff" : lavender ? palette.lavender : palette.white} side={active ? "#b29ae8" : lavender ? "#c2b3e2" : "#d8d0e8"} />
     {Array.from({length:floors}, (_,row) => <g key={row}>
      {[0,1,2].map(column => {
       const a = x + (column-1)*w/3, y = 1.05+row*1.25;
       return <polygon key={column} points={polygon([[a-w*.1,y,z+d/2+.02],[a+w*.1,y,z+d/2+.02],[a+w*.1,y+.72,z+d/2+.02],[a-w*.1,y+.72,z+d/2+.02]])} fill={palette.glass} />;
      })}
      {[0,1].map(column => {
       const a = z + (column-.5)*d/2, y = 1.05+row*1.25;
       return <polygon key={column} points={polygon([[x+w/2+.02,y,a-d*.15],[x+w/2+.02,y,a+d*.15],[x+w/2+.02,y+.72,a+d*.15],[x+w/2+.02,y+.72,a-d*.15]])} fill="#8170bd" />;
      })}
      <Cube x={x} z={z} width={w+.15} depth={d+.15} y={2.05+row*1.25} height={.12} front="#f9f6ff" side="#e2d9f3" />
     </g>)}
     <Cube x={x} z={z} width={w+.38} depth={d+.38} y={h+.62} height={.2} />
     <Cube x={x} z={z} width={w-.45} depth={d-.45} y={h+.83} height={.08} roof={palette.trim} />
     {crown && <><Cube x={x} z={z-.15} width={w*.62} depth={d*.6} y={h+.85} height={.65} front={palette.lavender} /><Cube x={x} z={z-.15} width={w*.72} depth={d*.7} y={h+1.5} height={.12} /></>}
     {["restaurant","boutique","event"].includes(id) && <Cube x={x} z={z+d/2+.18} width={w+.25} depth={.6} y={2.05} height={.17} front={palette.blue} side="#8c72ed" roof="#8b73f5" />}
    </g>;
   })}
   {[[12,8],[8,9],[3,10.5],[-5.6,8.8],[-9.5,8],[-12.2,-2.5],[8,-8]].map(([x,z]) => {
    const [a,b] = project(x,.5,z);
    return <g key={`${x}-${z}`}><ellipse cx={a+5} cy={b+2} rx="12" ry="5" fill="#8b7aa6" opacity=".12" /><path d={`M${a} ${b}v-18`} stroke="#b39eae" strokeWidth="3" /><ellipse cx={a} cy={b-23} rx="8" ry="12" fill={palette.mint} /><ellipse cx={a-1} cy={b-29} rx="6" ry="9" fill="#cedec9" /></g>;
   })}
  </svg>
 </div>;
}
