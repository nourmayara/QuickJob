"use client";
import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { AmbientLight, CanvasTexture, CatmullRomCurve3, Color, DirectionalLight, Fog, Group, HemisphereLight, MathUtils, MeshStandardMaterial, SRGBColorSpace, Vector3 } from "three";
import { recruiterLocations, type TourState, type Vec3 } from "./data";

const palette = { white: "#f4f5ff", trim: "#c7d1e8", glass: "#738caf", blue: "#4f46e5", dark: "#18244a", mint: "#c8e1d4" };
function Block({ position, size, color = palette.white, glow = false }: { position: Vec3; size: Vec3; color?: string; glow?: boolean }) {
 return <mesh position={position} castShadow={!glow} receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={.7} metalness={.05} emissive={glow ? color : "#000"} emissiveIntensity={glow ? .8 : 0} /></mesh>;
}
function Sign({ text, position, width = 3, color = "#e9e5ff" }: { text: string; position: Vec3; width?: number; color?: string }) {
 const texture = useMemo(() => {
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#18244a"; ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = color; ctx.font = "500 34px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, 256, 48);
  const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace; return t;
 }, [text, color]);
 useEffect(() => () => texture.dispose(), [texture]);
 return <mesh position={position}><planeGeometry args={[width, width * .1875]} /><meshBasicMaterial map={texture} /></mesh>;
}
function WindowRow({ y, width, z, count = 4 }: { y: number; width: number; z: number; count?: number }) {
 return <>{Array.from({ length: count }, (_, i) => <Block key={i} position={[(i - (count-1)/2) * (width/count), y, z]} size={[width/count - .12, .9, .06]} color={palette.glass} />)}</>;
}
function Plinth({ size = [5.5, .18, 5] }: { size?: Vec3 }) {
 return <RoundedBox args={size} radius={.15} smoothness={2} position={[0, .1, 0]} receiveShadow><meshStandardMaterial color="#e0e6f5" roughness={.85} /></RoundedBox>;
}
function Restaurant() {
 return <group position={[-7, .4, 4]}>
  <Plinth />
  <RoundedBox args={[4.4, 2.6, 3.3]} radius={.08} smoothness={2} position={[0, 1.5, 0]} castShadow receiveShadow><meshStandardMaterial color="#fff0df" roughness={.8} /></RoundedBox>
  <Block position={[0, 2.95, 0]} size={[4.65, .22, 3.6]} color="#b9c9df" />
  <Block position={[0, 1.2, 1.68]} size={[3.8, 1.75, .06]} color={palette.glass} />
  {[-1.3,0,1.3].map(x => <Block key={x} position={[x,1.2,1.74]} size={[.055,1.8,.08]} color="#bdb4a8" />)}
  <Sign text="QUICK CAFÉ" position={[0, 2.55, 1.72]} color="#e7d9b3" />
  <Block position={[0, 2.2, 2.05]} size={[4.5, .12, 1.1]} color={palette.blue} />
  {[-1.8,-.9,0,.9,1.8].map(x => <Block key={x} position={[x,2.27,2.05]} size={[.24,.035,1.1]} color="#e1dcff" />)}
  {[-1.5,1.5].map(x => <group key={x} position={[x,0,2.25]}><mesh position={[0,.72,0]} castShadow><cylinderGeometry args={[.45,.45,.09,16]} /><meshStandardMaterial color="#e6dbc7" /></mesh><Block position={[0,.42,0]} size={[.08,.55,.08]} color={palette.dark} />{[-.55,.55].map(s => <Block key={s} position={[s,.4,0]} size={[.35,.12,.35]} color="#b9a5d5" />)}</group>)}
  <Block position={[-2.05,3.12,0]} size={[.07,.07,3.45]} color="#ad9afa" glow />
  <group position={[0,.2,2.7]} scale={.72}><Person position={[0,0,0]} color="#f8faff" /><Block position={[0,.58,.155]} size={[.32,.35,.04]} color={palette.blue} /><mesh position={[.35,.91,0]} castShadow><cylinderGeometry args={[.3,.3,.035,12]} /><meshStandardMaterial color="#c4cfdf" metalness={.3} roughness={.4} /></mesh></group>
 </group>;
}
function Boutique() {
 return <group position={[0,.4,5]}><Plinth size={[5.2,.18,4.6]} />
  <Block position={[0,1.55,0]} size={[4.2,2.7,3.1]} />
  <Block position={[0,3.1,0]} size={[4.6,.35,3.5]} color="#a48aee" />
  <mesh position={[0,1.3,1.59]}><boxGeometry args={[3.8,1.9,.07]} /><meshStandardMaterial color="#b6d7e9" transparent opacity={.2} roughness={.15} depthWrite={false} /></mesh>
  <Sign text="THE EDIT / BOUTIQUE" position={[0,2.65,1.61]} />
  {[-1.2,1.2].map(x => <group key={x}><Block position={[x,.85,1.32]} size={[.8,.12,.45]} color="#e0d5ef" /><Block position={[x,1.3,1.3]} size={[.25,.8,.2]} color={x<0 ? "#9d9fe9" : "#d4bc98"} /></group>)}
  <Block position={[0,1.25,1.64]} size={[.07,2,.07]} color={palette.white} />
  <Block position={[0,3.31,0]} size={[3.6,.04,2.5]} color="#d2c6ef" />
  <Block position={[0,2.95,1.78]} size={[4.5,.04,.04]} color="#c6a7ff" glow />
 </group>;
}
function EventHall() {
 return <group position={[7,.4,2]}><Plinth size={[6.5,.18,6]} />
  <Block position={[0,.35,0]} size={[5.7,.5,4.8]} color="#ddd4ef" />
  <Block position={[0,1.9,-1.6]} size={[5.4,2.7,.3]} color="#5c4a91" />
  {[-2.5,2.5].map(x => <Block key={x} position={[x,1.9,.2]} size={[.22,2.8,4.5]} />)}
  <Block position={[0,3.45,0]} size={[6,.25,5.4]} color={palette.white} />
  <Block position={[0,3.6,.3]} size={[5,.07,4.4]} color="#c4b6f0" />
  <Block position={[0,1,-.85]} size={[3.2,.55,1.3]} color="#443378" />
  <Block position={[0,2,-1.39]} size={[2.6,1.25,.04]} color="#8b5cf6" glow />
  <Sign text="QUICKJOB / LIVE" position={[0,3.04,2.75]} width={4} />
  {[-1.6,-.55,.55,1.6].flatMap(x => [0,.85].map(z => <Block key={`${x}-${z}`} position={[x,.8,z]} size={[.6,.45,.5]} color="#b8a3cf" />))}
  {[-1.6,-.55,.55,1.6].map((x,i) => <group key={x} position={[x,.59,1.65]} scale={.62}><Person position={[0,0,0]} color={i%2 ? "#8b5cf6" : "#4f46e5"} /></group>)}
  <Block position={[0,.65,2.4]} size={[5.5,.06,.05]} color="#8b79ff" glow />
  {[-1.8,1.8].map(x => <group key={x}><Block position={[x,1.1,-1]} size={[.35,1.1,.35]} color="#171526" /><mesh position={[x,2.7,-1]} rotation={[Math.PI/3,0,0]}><cylinderGeometry args={[.18,.25,.35,8]} /><meshStandardMaterial color="#c9b9fb" emissive="#8b79ff" emissiveIntensity={.6} /></mesh></group>)}
 </group>;
}
function Warehouse() {
 return <group position={[-7,.4,recruiterLocations.warehouseZ]}><Plinth size={[6.6,.18,5.7]} />
  <Block position={[0,1.8,0]} size={[5.6,3.2,4.4]} color="#e0e7f4" />
  <Block position={[0,3.5,0]} size={[6,.2,4.8]} color="#8ca4c4" />
  {[-1.6,1.6].map(x => <group key={x}><Block position={[x,1.25,2.24]} size={[1.8,1.9,.08]} color="#647a9c" />{[.6,.9,1.2,1.5,1.8].map(y => <Block key={y} position={[x,y,2.3]} size={[1.75,.035,.05]} color="#c4cfdf" />)}</group>)}
  <Sign text="QUICK / LOGISTICS" position={[0,2.92,2.23]} width={4} />
  <Block position={[3.5,.7,1.1]} size={[1.25,.9,2]} color="#6953a4" />
  <Block position={[3.5,.7,-1.1]} size={[1.25,.9,1.5]} color="#c1b1d9" />
  {[-1,0,1].map((x,i) => <group key={x} position={[x,.2,3]}><Block position={[0,.35,0]} size={[.7,.65,.65]} color="#bda889" /><Block position={[0,.69,0]} size={[.12,.025,.65]} color="#eee3cf" />{i===1 && <Block position={[0,.9,0]} size={[.5,.45,.5]} color="#cfb994" />}</group>)}
  {[-1,1].map(x => <Block key={x} position={[x,3.65,-.5]} size={[1.4,.08,2.7]} color="#353f6a" />)}
  <DeliveryVan />
 </group>;
}
function DeliveryVan() {
 return <group position={[3.5,.18,3.2]}>
  <Block position={[0,.63,-.35]} size={[1.15,.95,1.45]} color="#f8faff" />
  <Block position={[0,.54,.68]} size={[1.1,.8,.7]} color={palette.blue} />
  <Block position={[0,.77,1.04]} size={[.84,.35,.035]} color="#c1e0ed" />
  <Block position={[0,.57,-1.1]} size={[.9,.3,.035]} color="#8b5cf6" />
  {[-.58,.58].flatMap(x => [-.7,.7].map(z => <mesh key={`${x}-${z}`} position={[x,.23,z]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.23,.23,.15,10]} /><meshStandardMaterial color={palette.dark} roughness={.9} /></mesh>))}
 </group>;
}
function RecruitmentDesk() {
 // An open forecourt makes the hiring activity visible from street-level views.
 return <group position={[.4,.1,3.15]}>
  <Plinth size={[4,.12,2]} />
  <Block position={[0,.83,0]} size={[2.65,.13,.85]} color="#d7c7b1" />
  {[-1.05,1.05].map(x => <Block key={x} position={[x,.43,0]} size={[.09,.75,.65]} color={palette.blue} />)}
  <Block position={[-.7,1.25,0]} size={[.95,.7,.09]} color={palette.dark} />
  <Block position={[-.7,1.25,.055]} size={[.8,.56,.015]} color="#f8faff" />
  {[-.13,0,.13].map(y => <Block key={y} position={[-.74,1.25+y,.07]} size={[.48,.045,.014]} color={y === -.13 ? palette.blue : "#c7d1e8"} />)}
  <Block position={[-.7,.98,0]} size={[.08,.2,.1]} color={palette.dark} />
  <Block position={[-.7,.92,0]} size={[.5,.035,.3]} color={palette.dark} />
  {[-.05,.53,1.11].map((x,i) => <group key={x} position={[x,.91,.2]} rotation={[-Math.PI/2,0,0]}><Block position={[0,0,0]} size={[.4,.55,.025]} color="#f8faff" /><mesh position={[0,.12,.025]}><circleGeometry args={[.07,10]} /><meshBasicMaterial color={i%2 ? "#8b5cf6" : palette.blue} /></mesh><Block position={[0,-.08,.025]} size={[.23,.03,.015]} color="#9aa8c4" /></group>)}
  <group position={[0,.2,-.78]} scale={.7}><Person position={[0,0,0]} color={palette.blue} /></group>
  <Sign text="VOTRE MISSION / VOTRE EQUIPE" position={[0,1.95,-.25]} width={3.4} />
 </group>;
}
function Workspace() {
 return <group position={[3.5,.4,recruiterLocations.workspaceZ]}><Plinth size={[6.5,.18,5.2]} />
  <Block position={[0,2.5,0]} size={[5.2,4.6,3.7]} color="#f4f5ff" />
  {[1.2,2.6,4].map(y => <WindowRow key={y} y={y} width={4.6} z={1.89} />)}
  {[1.2,2.6,4].map(y => <Block key={y} position={[2.63,y,0]} size={[.06,.9,3.2]} color={palette.glass} />)}
  <Block position={[0,4.95,0]} size={[5.7,.25,4.2]} color="#b6c4e1" />
  <Block position={[0,5.16,0]} size={[4.7,.15,3.2]} color="#b59cee" />
  <Sign text="QUICKJOB / WORKSPACE" position={[0,4.65,1.92]} width={4.7} />
  <Block position={[0,3.38,1.98]} size={[5.4,.05,.08]} color="#9c82ff" glow />
  <Block position={[0,1.98,1.98]} size={[5.4,.05,.08]} color="#9c82ff" glow />
  <Block position={[0,.8,2.1]} size={[1,1.2,.3]} color="#625d84" />
  <RecruitmentDesk />
 </group>;
}
function Tree({ position, scale = 1 }: { position: Vec3; scale?: number }) {
 return <group position={position} scale={scale}><mesh position={[0,.5,0]} castShadow><cylinderGeometry args={[.07,.1,1,6]} /><meshStandardMaterial color="#9c806f" /></mesh><mesh position={[0,1.2,0]} castShadow><sphereGeometry args={[.55,8,6]} /><meshStandardMaterial color="#8cbca4" roughness={.9} /></mesh><mesh position={[.22,1.6,0]} castShadow><sphereGeometry args={[.4,8,6]} /><meshStandardMaterial color="#c4dcc1" roughness={.9} /></mesh></group>;
}
function Person({ position, color }: { position: Vec3; color: string }) {
 return <group position={position}><mesh position={[0,1.12,0]}><sphereGeometry args={[.18,8,6]} /><meshStandardMaterial color="#dfcfc3" /></mesh><Block position={[0,.7,0]} size={[.43,.55,.27]} color={color} />{[-.13,.13].map(x => <Block key={x} position={[x,.28,0]} size={[.14,.4,.18]} color="#262239" />)}</group>;
}
function LightPath({ tour }: { tour: RefObject<TourState> }) {
 const marker = useRef<Group>(null);
 const curve = useMemo(() => new CatmullRomCurve3([[-11,.5,1],[-5,.5,1],[-3,.5,1.5],[3,.5,1.5],[5,.5,-1],[0,.5,-2.4],[-7,.5,-4.5],[-4,.5,-5],[-1,.5,-5.5],[5,.5,-5.5],[9,.5,-5],[3.5,.5,-6]].map(p => new Vector3(...p))), []);
 useFrame(() => { if (marker.current) { marker.current.position.copy(curve.getPoint(Math.max(0,Math.min(1,(tour.current.progress-.4)/.4)))); marker.current.position.y += .65; } });
 return <><mesh><tubeGeometry args={[curve,100,.2,6,false]} /><meshStandardMaterial color="#4f46e5" roughness={.7} /></mesh><mesh position={[0,.18,0]}><tubeGeometry args={[curve,100,.055,6,false]} /><meshBasicMaterial color="#bca3ff" /></mesh><group ref={marker}><Block position={[0,0,0]} size={[.6,.45,.08]} color="#f2f7ff" glow /><Block position={[0,.04,.05]} size={[.4,.035,.025]} color="#4f46e5" /><Block position={[0,-.08,.05]} size={[.28,.035,.025]} color="#4f46e5" /></group>{[0,.22,.45,.65,.85,1].map(t => <mesh key={t} position={curve.getPoint(t)} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.32,.38,24]} /><meshBasicMaterial color="#8b5cf6" /></mesh>)}</>;
}
function CityAtmosphere({ tour, mobile }: { tour: RefObject<TourState>; mobile: boolean }) {
 const { scene } = useThree();
 const fog = useRef<Fog>(null);
 const floor = useRef<MeshStandardMaterial>(null);
 const ambient = useRef<AmbientLight>(null);
 const hemisphere = useRef<HemisphereLight>(null);
 const sun = useRef<DirectionalLight>(null);
 const fill = useRef<DirectionalLight>(null);
 const colors = useMemo(() => ({ day: new Color("#f8faff"), night: new Color("#11152c"), floor: new Color("#edf1fa"), nightFloor: new Color("#151b36"), sky: new Color("#f5f8ff"), nightSky: new Color("#c8c8ff"), ground: new Color("#b9c7df"), nightGround: new Color("#625470") }), []);
 useFrame(() => {
  const progress = tour.current.progress;
  // Only the application journey enters a cinematic mood; the camera stays unchanged.
  const cinematic = MathUtils.smoothstep(progress,.405,.44) * (1-MathUtils.smoothstep(progress,.565,.6));
  if (scene.background instanceof Color) scene.background.lerpColors(colors.day,colors.night,cinematic);
  fog.current?.color.lerpColors(colors.day,colors.night,cinematic);
  floor.current?.color.lerpColors(colors.floor,colors.nightFloor,cinematic);
  if (ambient.current) ambient.current.intensity = MathUtils.lerp(1.05,.7,cinematic);
  if (hemisphere.current) { hemisphere.current.color.lerpColors(colors.sky,colors.nightSky,cinematic); hemisphere.current.groundColor.lerpColors(colors.ground,colors.nightGround,cinematic); }
  if (sun.current) sun.current.intensity = MathUtils.lerp(2.5,2.8,cinematic);
  if (fill.current) fill.current.intensity = MathUtils.lerp(.9,1.8,cinematic);
 });
 return <>
  <color attach="background" args={["#f8faff"]} />
  <fog ref={fog} attach="fog" args={["#f8faff",38,95]} />
  <ambientLight ref={ambient} intensity={1.05} />
  <hemisphereLight ref={hemisphere} args={["#f5f8ff","#b9c7df",1.2]} />
  <directionalLight ref={sun} position={[-8,18,10]} intensity={2.5} color="#fff6eb" castShadow={!mobile} shadow-mapSize={[1024,1024]} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-bias={-.001} shadow-normalBias={.035} />
  <directionalLight ref={fill} position={[10,8,-10]} intensity={.9} color="#b9adff" />
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.7,0]} receiveShadow><planeGeometry args={[200,200]} /><meshStandardMaterial ref={floor} color="#edf1fa" roughness={1} /></mesh>
 </>;
}
export default function CityWorld({ tour, mobile }: { tour: RefObject<TourState>; mobile: boolean }) {
 return <>
  <CityAtmosphere tour={tour} mobile={mobile} />
  <RoundedBox args={[28,.8,23]} radius={.45} smoothness={3} position={[0,-.05,0]} receiveShadow castShadow><meshStandardMaterial color="#bdcae1" roughness={.9} metalness={0} /></RoundedBox>
  <Block position={[0,.37,0]} size={[26.8,.05,21.8]} color="#e3e9f4" />
  <Block position={[0,.4,.5]} size={[26,.035,2.4]} color="#b4c1d9" />
  <Block position={[-3.5,.4,-4]} size={[2,.035,12]} color="#b4c1d9" />
  <Block position={[9.7,.4,-3]} size={[1.8,.035,12]} color="#b4c1d9" />
  <Block position={[0,.405,-8]} size={[24,.04,1.8]} color="#b4c1d9" />
  <LightPath tour={tour} /><Restaurant /><Boutique /><EventHall /><Warehouse /><Workspace />
  <Person position={[-11,.4,1.8]} color="#d2e8b8" /><Sign text="VOTRE PROFIL" position={[-11,2.2,1.8]} width={2} />
  <Person position={[3.5,.4,-6.3]} color="#a58bff" /><Sign text="RECRUTEUR" position={[3.5,2.2,-6.3]} width={2} />
  {[-11,-5,1,7,11].map((x,i) => <Tree key={x} position={[x,.4,9.2]} scale={i%2 ? .85 : 1.1} />)}
  {[[-11,.4,-8],[-11,.4,-2],[-3,.4,8],[10.5,.4,6],[8,.4,-8],[.2,.4,-3]].slice(0,mobile?3:6).map((p,i) => <Tree key={i} position={p as Vec3} />)}
  {[-10,-4,2,8].map(x => <group key={x}><Block position={[x,1.2,-.4]} size={[.06,1.6,.06]} color="#b1a4c0" /><Block position={[x,2.02,-.4]} size={[.45,.08,.2]} color="#e1d2ff" glow /></group>)}
  <group position={[-10,.5,6]}><Block position={[0,.65,0]} size={[.18,1.3,.18]} color="#a69eb2" /><Sign text="QUICKJOB CITY" position={[0,1.4,.1]} width={3.6} /></group>
 </>;
}
