"use client";
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { BufferGeometry, CanvasTexture, CatmullRomCurve3, Float32BufferAttribute, Group, InstancedMesh, Object3D, SRGBColorSpace, Vector3 } from "three";
import { recruiterLocations, type TourState, type Vec3 } from "./data";
import { cityPalette as palette, cityRoad } from "./cityArt";

function Block({ position, size, color = palette.white, glow = false }: { position: Vec3; size: Vec3; color?: string; glow?: boolean }) {
 return <mesh position={position} castShadow={!glow} receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={.78} metalness={0} emissive={glow ? color : "#000"} emissiveIntensity={glow ? .35 : 0} /></mesh>;
}
function Sign({ text, position, width = 3 }: { text: string; position: Vec3; width?: number }) {
 const texture = useMemo(() => {
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#6355f5"; ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = "#ffffff"; ctx.font = "600 34px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, 256, 48);
  const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace; return t;
 }, [text]);
 useEffect(() => () => texture.dispose(), [texture]);
 return <mesh position={position}><planeGeometry args={[width, width * .1875]} /><meshBasicMaterial map={texture} /></mesh>;
}
function Plinth({ size = [5.5, .18, 5] }: { size?: Vec3 }) {
 return <RoundedBox args={size} radius={.07} smoothness={2} position={[0, .1, 0]} receiveShadow><meshStandardMaterial color="#eeebf8" roughness={.9} /></RoundedBox>;
}

// Identical window panes share one draw call per building, including the side facade.
function Windows({ width, depth, floors, columns = 3, floorHeight = 1.25, start = .95 }: { width: number; depth: number; floors: number; columns?: number; floorHeight?: number; start?: number }) {
 const panes = useRef<InstancedMesh>(null);
 const count = floors * (columns + 2);
 useLayoutEffect(() => {
  const mesh = panes.current;
  if (!mesh) return;
  const object = new Object3D();
  let index = 0;
  for (let floor = 0; floor < floors; floor++) {
   const y = start + floor * floorHeight;
   for (let column = 0; column < columns; column++) {
    object.position.set((column - (columns - 1) / 2) * width / columns, y, depth / 2 + .025);
    object.rotation.set(0, 0, 0); object.scale.set(width / columns * .64, .72, .055); object.updateMatrix();
    mesh.setMatrixAt(index++, object.matrix);
   }
   for (let column = 0; column < 2; column++) {
    object.position.set(width / 2 + .025, y, (column - .5) * depth / 2);
    object.rotation.set(0, Math.PI / 2, 0); object.scale.set(depth * .31, .72, .055); object.updateMatrix();
    mesh.setMatrixAt(index++, object.matrix);
   }
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
 }, [width, depth, floors, columns, floorHeight, start]);
 return <instancedMesh ref={panes} args={[undefined, undefined, count]}><boxGeometry /><meshStandardMaterial color={palette.glass} roughness={.34} metalness={.12} /></instancedMesh>;
}
function Architecture({ width = 3.8, depth = 3, floors = 3, lavender = false, crown = false }: { width?: number; depth?: number; floors?: number; lavender?: boolean; crown?: boolean }) {
 const height = floors * 1.25 + .45;
 return <>
  <RoundedBox args={[width, height, depth]} radius={.055} smoothness={2} position={[0, height / 2 + .2, 0]} castShadow receiveShadow><meshStandardMaterial color={lavender ? palette.lavender : palette.white} roughness={.86} /></RoundedBox>
  <Windows width={width} depth={depth} floors={floors} />
  {Array.from({ length: floors }, (_, i) => <Block key={i} position={[0, 1.57 + i * 1.25, 0]} size={[width + .14, .12, depth + .14]} color={i === 0 && lavender ? "#a18ae0" : "#eeebf9"} />)}
  <Block position={[0, height + .28, 0]} size={[width + .38, .2, depth + .38]} />
  <Block position={[0, height + .41, 0]} size={[width - .38, .08, depth - .38]} color={palette.trim} />
  {[-1, 1].map(side => <Block key={side} position={[side * (width / 2 - .05), height + .54, 0]} size={[.13, .28, depth]} />)}
  {[-1, 1].map(side => <Block key={side} position={[0, height + .54, side * (depth / 2 - .05)]} size={[width, .28, .13]} />)}
  {crown && <><Block position={[0, height + .82, -.15]} size={[width * .62, .68, depth * .6]} color={palette.lavender} /><Block position={[0, height + 1.2, -.15]} size={[width * .7, .12, depth * .68]} /><Block position={[0, height + 1.28, -.15]} size={[width * .48, .05, depth * .46]} color={palette.trim} /></>}
 </>;
}
function Restaurant() {
 return <group position={[-7, .4, 4]}>
  <Plinth size={[5.6, .18, 5.2]} /><Architecture width={4.1} depth={3.15} floors={3} crown />
  <Block position={[0, .85, 1.61]} size={[3.65, 1.15, .09]} color={palette.glass} />
  {[-1.22, 0, 1.22].map(x => <Block key={x} position={[x, .85, 1.68]} size={[.07, 1.2, .08]} />)}
  <Sign text="QUICK CAFÉ" position={[0, 1.75, 1.65]} width={3.5} />
  <Block position={[0, 1.42, 1.94]} size={[4.35, .13, .85]} color={palette.blue} />
  {[-1.8, -.9, 0, .9, 1.8].map(x => <Block key={x} position={[x, 1.495, 1.94]} size={[.27, .025, .85]} color="#e4dbff" />)}
  {[-1.5, 1.5].map(x => <group key={x} position={[x, 0, 2.2]}><mesh position={[0, .64, 0]} castShadow><cylinderGeometry args={[.38, .38, .08, 12]} /><meshStandardMaterial color="#ded3ee" /></mesh><Block position={[0, .38, 0]} size={[.065, .5, .065]} color={palette.trim} />{[-.48, .48].map(s => <Block key={s} position={[s, .34, 0]} size={[.28, .1, .28]} color={palette.lavender} />)}</group>)}
 </group>;
}
function Boutique() {
 return <group position={[0, .4, 5]}><Plinth size={[5.2, .18, 4.8]} />
  <Architecture width={4} depth={3.15} floors={3} lavender />
  <Block position={[0, .85, 1.61]} size={[3.6, 1.15, .07]} color="#a49cdb" />
  <Block position={[0, .85, 1.67]} size={[.08, 1.2, .08]} />
  <Sign text="LA BOUTIQUE" position={[0, 1.75, 1.66]} width={3.45} />
  <Block position={[0, 1.45, 1.86]} size={[4.3, .12, .6]} color={palette.blue} />
  <Block position={[-1.3, 5.1, -.75]} size={[.65, .48, .65]} color={palette.lavender} />
 </group>;
}
function EventHall() {
 return <group position={[7, .4, 2]}><Plinth size={[6.2, .18, 5.4]} />
  <RoundedBox args={[5.2, 2.7, 4]} radius={.09} smoothness={2} position={[0, 1.55, 0]} castShadow receiveShadow><meshStandardMaterial color={palette.lavender} roughness={.8} /></RoundedBox>
  <Block position={[0, 1.3, 2.04]} size={[4.65, 1.9, .06]} color={palette.glass} />
  {[-2.1, -.7, .7, 2.1].map(x => <Block key={x} position={[x, 1.3, 2.1]} size={[.17, 2.25, .23]} />)}
  <Block position={[0, 2.98, 0]} size={[5.65, .25, 4.45]} color={palette.blue} />
  <Block position={[0, 3.16, -.25]} size={[4.9, .12, 3.5]} />
  <group position={[.3, 3.2, -.4]}><Architecture width={3.4} depth={2.7} floors={1} crown /></group>
  <Sign text="QUICKJOB / EVENTS" position={[0, 2.62, 2.12]} width={4.1} />
  <Block position={[0, .3, 2.45]} size={[4, .18, .7]} color="#ddd4f4" />
 </group>;
}
function Warehouse() {
 return <group position={[-7, .4, recruiterLocations.warehouseZ]}><Plinth size={[6.6, .18, 5.7]} />
  <Block position={[0, 1.65, 0]} size={[5.6, 2.9, 4.4]} color={palette.lavender} />
  <Block position={[0, 3.2, 0]} size={[5.95, .2, 4.75]} />
  <Block position={[0, 3.35, 0]} size={[5.3, .1, 4.1]} color={palette.trim} />
  {[-1.5, 1.5].map(x => <group key={x}><Block position={[x, 1.2, 2.24]} size={[1.85, 1.9, .08]} color="#a194d1" />{[.6, .9, 1.2, 1.5, 1.8].map(y => <Block key={y} position={[x, y, 2.3]} size={[1.8, .035, .05]} color="#e4ddf5" />)}</group>)}
  <Sign text="QUICK / LOGISTICS" position={[0, 2.7, 2.24]} width={4} />
  {[-1, 1].map(x => <Block key={x} position={[x, 3.47, -.2]} size={[1.4, .08, 2.6]} color="#8f84bd" />)}
  <DeliveryVan />
 </group>;
}
function DeliveryVan() {
 return <group position={[3.6, .18, 2.3]}>
  <Block position={[0, .63, -.35]} size={[1.15, .95, 1.45]} />
  <Block position={[0, .54, .68]} size={[1.1, .8, .7]} color={palette.blue} />
  <Block position={[0, .77, 1.04]} size={[.84, .35, .035]} color="#d7d2ed" />
  {[-.58, .58].flatMap(x => [-.7, .7].map(z => <mesh key={`${x}-${z}`} position={[x, .23, z]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[.23, .23, .15, 10]} /><meshStandardMaterial color={palette.dark} roughness={.9} /></mesh>))}
 </group>;
}
function Workspace() {
 return <group position={[3.5, .4, recruiterLocations.workspaceZ]}><Plinth size={[6.2, .18, 5.2]} />
  <Architecture width={4.4} depth={3.6} floors={5} crown />
  <Block position={[0, 1.7, 1.85]} size={[4.6, .36, .12]} color={palette.blue} />
  <Sign text="QUICKJOB / WORKSPACE" position={[0, 1.7, 1.93]} width={4.1} />
  <Block position={[0, .85, 1.89]} size={[1.2, 1.15, .12]} color="#a79ccf" />
 </group>;
}
function Tree({ position, scale = 1 }: { position: Vec3; scale?: number }) {
 return <group position={position} scale={scale}><Block position={[0, .06, 0]} size={[.95, .12, .95]} color="#e1dfee" /><mesh position={[0, .56, 0]} castShadow><cylinderGeometry args={[.065, .09, 1.05, 7]} /><meshStandardMaterial color="#b29ca9" /></mesh><mesh position={[0, 1.4, 0]} castShadow><sphereGeometry args={[.56, 9, 7]} /><meshStandardMaterial color={palette.mint} roughness={.95} /></mesh><mesh position={[.1, 1.8, 0]} castShadow><sphereGeometry args={[.38, 9, 7]} /><meshStandardMaterial color="#cee0c8" roughness={.95} /></mesh></group>;
}

// A flat ribbon gives the path the width and soft bends of a real street.
function Street({ curve, width, y, color }: { curve: CatmullRomCurve3; width: number; y: number; color: string }) {
 const geometry = useMemo(() => {
  const points: number[] = [], indices: number[] = [];
  const segments = 220;
  for (let i = 0; i <= segments; i++) {
   const point = curve.getPoint(i / segments), tangent = curve.getTangent(i / segments);
   const normal = new Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2);
   points.push(point.x + normal.x, y, point.z + normal.z, point.x - normal.x, y, point.z - normal.z);
   if (i < segments) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const mesh = new BufferGeometry(); mesh.setAttribute("position", new Float32BufferAttribute(points, 3)); mesh.setIndex(indices); mesh.computeVertexNormals(); return mesh;
 }, [curve, width, y]);
 useEffect(() => () => geometry.dispose(), [geometry]);
 return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color={color} roughness={.82} /></mesh>;
}
function LightPath({ tour }: { tour: RefObject<TourState> }) {
 const marker = useRef<Group>(null);
 const curve = useMemo(() => new CatmullRomCurve3(cityRoad.map(p => new Vector3(...p)), false, "centripetal"), []);
 useFrame(() => { if (marker.current) { marker.current.position.copy(curve.getPoint(Math.max(0, Math.min(1, tour.current.progress)))); marker.current.position.y += .55; } });
 return <>
  <Street curve={curve} width={1.95} y={.41} color="#faf7ff" />
  <Street curve={curve} width={1.6} y={.425} color={palette.blue} />
  <Street curve={curve} width={.055} y={.44} color="#c8b8ff" />
  <group ref={marker}><mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.24, .34, 24]} /><meshBasicMaterial color="#eae3ff" /></mesh><mesh position={[0, .25, 0]}><sphereGeometry args={[.14, 12, 8]} /><meshBasicMaterial color="#ffffff" /></mesh></group>
 </>;
}
function CityAtmosphere({ mobile }: { mobile: boolean }) {
 return <>
  <fog attach="fog" args={["#ddd7f2", 65, 115]} />
  <ambientLight intensity={.85} />
  <hemisphereLight args={["#fffaff", "#b9abd6", 1.65]} />
  <directionalLight position={[-7, 20, 9]} intensity={2.1} color="#fff8f3" castShadow={!mobile} shadow-mapSize={[1024, 1024]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-bias={-.0005} shadow-normalBias={.035} shadow-radius={6} />
  <directionalLight position={[12, 9, -8]} intensity={1.3} color="#c7b9ff" />
 </>;
}
export default function CityWorld({ tour, mobile }: { tour: RefObject<TourState>; mobile: boolean }) {
 return <>
  <CityAtmosphere mobile={mobile} />
  <RoundedBox args={[29, .5, 26]} radius={.18} smoothness={3} position={[0, .06, -.4]} receiveShadow><meshStandardMaterial color="#c8bde4" roughness={.95} /></RoundedBox>
  <Block position={[0, .335, -.4]} size={[28.2, .05, 25.2]} color="#e4dff1" />
  {/* Quiet paving seams keep the ground architectural rather than busy. */}
  {[-10, -5, 0, 5, 10].map(x => <Block key={x} position={[x, .367, -.4]} size={[.025, .012, 24.8]} color="#d7cfe8" />)}
  {[-10, -5, 0, 5, 10].map(z => <Block key={z} position={[0, .367, z]} size={[27.8, .012, .025]} color="#d7cfe8" />)}
  <LightPath tour={tour} /><Restaurant /><Boutique /><EventHall /><Warehouse /><Workspace />
  <group position={[10.6, .4, -9]}><Plinth size={[4.1, .18, 4.4]} /><Architecture width={2.8} depth={3} floors={3} lavender crown /></group>
  <group position={[-1.5, .4, -1.7]}><Architecture width={2.1} depth={2.3} floors={2} /></group>
  <group position={[-11.3, .4, 5.3]}><Architecture width={2.1} depth={2.5} floors={2} lavender /></group>
  {[[12, .4, 8], [8, .4, 9], [3, .4, 10.5], [-5.6, .4, 8.8], [-9.5, .4, 8], [-12.2, .4, -2.5], [-4.5, .4, -7], [8, .4, -8], [.5, .4, -1.6]].slice(0, mobile ? 6 : 9).map((p, i) => <Tree key={i} position={p as Vec3} scale={i % 3 === 0 ? 1.1 : .85} />)}
  {[-9, -4, 2, 7].map(x => <group key={x}><Block position={[x, 1.15, -2.5]} size={[.065, 1.5, .065]} color="#b5a8ce" /><Block position={[x, 1.94, -2.5]} size={[.4, .08, .18]} color="#f5eeff" /></group>)}
 </>;
}
