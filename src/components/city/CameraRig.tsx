"use client";
/* eslint-disable react-hooks/immutability -- R3F cameras and the shared GSAP timeline are intentionally mutable outside React rendering. */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, type RefObject } from "react";
import { CatmullRomCurve3, MathUtils, PerspectiveCamera, Vector3 } from "three";
import { cameraStops, cityMissions, type TourState } from "./data";

export default function CameraRig({ tour, mobile, labels }: { tour: RefObject<TourState>; mobile: boolean; labels: RefObject<(HTMLButtonElement | null)[]> }) {
 const { camera, invalidate, size } = useThree();
 const paths = useMemo(() => ({
  position: new CatmullRomCurve3(cameraStops.map(s => new Vector3(...s.position)), false, "catmullrom", .22),
  target: new CatmullRomCurve3(cameraStops.map(s => new Vector3(...s.target)), false, "catmullrom", .22),
  point: new Vector3(), targetPoint: new Vector3(), projected: new Vector3(),
 }), []);
 useEffect(() => { const state = tour.current; state.invalidate = invalidate; invalidate(); return () => { state.invalidate = null; }; }, [tour, invalidate]);
 useEffect(() => {
  const c = camera as PerspectiveCamera;
  c.fov = mobile ? 54 : 43;
  if (mobile) c.setViewOffset(size.width, size.height, 0, size.height * .12, size.width, size.height);
  else c.setViewOffset(size.width, size.height, -size.width * .15, 0, size.width, size.height);
  c.updateProjectionMatrix(); invalidate();
 }, [camera, mobile, size.width, size.height, invalidate]);
 useFrame(() => {
  const p = tour.current.progress;
  let index = cameraStops.findIndex((s, i) => i < cameraStops.length - 1 && p >= s.at && p <= cameraStops[i+1].at);
  if (index < 0) index = cameraStops.length - 2;
  const fraction = Math.min(1, Math.max(0, (p - cameraStops[index].at) / (cameraStops[index+1].at - cameraStops[index].at)));
  const t = (index + fraction) / (cameraStops.length - 1);
  paths.position.getPoint(t, paths.point);
  paths.target.getPoint(t, paths.targetPoint);
  const streetWeight = MathUtils.smoothstep(p, .14, .22) * (1 - MathUtils.smoothstep(p, .8, .94));
  const perspective = camera as PerspectiveCamera;
  const fov = MathUtils.lerp(mobile ? 54 : 43, mobile ? 72 : 64, streetWeight);
  if (Math.abs(perspective.fov - fov) > .001) { perspective.fov = fov; perspective.updateProjectionMatrix(); }
  camera.position.copy(paths.point);
  camera.lookAt(paths.targetPoint);
  camera.updateMatrixWorld();
  const ranges = [[.2,.3],[.3,.365],[.365,.4]];
  cityMissions.forEach((mission,i) => {
   const label = labels.current[i];
   if (!label || !ranges[i]) return;
   paths.projected.set(...mission.anchor).project(camera);
   const visible = p >= ranges[i][0] && p < ranges[i][1] && paths.projected.z < 1 && paths.projected.z > -1;
   label.style.display = visible ? "grid" : "none";
   if (visible) {
    // Keep projected details inside the usable stage, clear of the fixed header
    // and the chapter controls even when their building moves out of frame.
    const width = label.offsetWidth;
    const height = label.offsetHeight;
    const inset = mobile ? 16 : 24;
    const minX = mobile ? inset + width / 2 : Math.max(inset + width / 2, size.width * .46 + width / 2);
    const maxX = Math.max(minX, size.width - inset - width / 2);
    const minY = (mobile ? 116 : 140) + height;
    const maxY = Math.max(minY, mobile ? size.height * .43 : size.height - 170);
    const x = Math.min(maxX, Math.max(minX, (paths.projected.x * .5 + .5) * size.width));
    const y = Math.min(maxY, Math.max(minY, (-paths.projected.y * .5 + .5) * size.height));
    label.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-100%)`;
   }
  });
  // Read-only diagnostics also make the camera trajectory verifiable in browser QA.
  camera.userData.tourProgress = p;
 });
 return null;
}
