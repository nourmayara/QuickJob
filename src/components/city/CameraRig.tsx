"use client";
/* eslint-disable react-hooks/immutability -- Three.js cameras and GSAP targets are mutable renderer objects. */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";
import { OrthographicCamera, Vector3 } from "three";
import type { TourState } from "./data";
import { cityPlaces, type CityView } from "./hybrid";

export default function CameraRig({ tour, view, labels }: { tour: RefObject<TourState>; view: CityView; labels: RefObject<(HTMLButtonElement | null)[]> }) {
  const { camera, invalidate, size } = useThree();
  const motion = useRef({ x: 24, y: 24.4, z: 24, tx: 0, ty: .4, tz: 0 });
  const point = useRef(new Vector3());
  const projected = useRef(new Vector3());
  useEffect(() => {
    const state = tour.current;
    state.invalidate = invalidate;
    return () => { state.invalidate = null; };
  }, [tour, invalidate]);
  useEffect(() => {
    const isometric = camera as OrthographicCamera;
    isometric.zoom = Math.min(size.width / 43, size.height / 29) * .96;
    isometric.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => {
    const animation = gsap.to(motion.current, { x: view.position[0], y: view.position[1], z: view.position[2], tx: view.target[0], ty: view.target[1], tz: view.target[2], duration: .95, ease: "power3.inOut", overwrite: "auto", onUpdate: invalidate });
    const path = gsap.to(tour.current, { progress: view.progress, duration: .95, ease: "power3.inOut", overwrite: "auto", onUpdate: invalidate });
    invalidate();
    return () => { animation.kill(); path.kill(); };
  }, [view, tour, invalidate]);
  useFrame(() => {
    const current = motion.current;
    camera.position.set(current.x, current.y, current.z);
    camera.lookAt(point.current.set(current.tx, current.ty, current.tz));
    camera.updateMatrixWorld();
    const occupied: { x: number; y: number; width: number; height: number }[] = [];
    cityPlaces.forEach((place, index) => {
      const label = labels.current[index];
      if (!label || label.hidden) return;
      projected.current.set(...place.anchor).project(camera);
      const width = label.offsetWidth || 140;
      const height = label.offsetHeight || 44;
      const minX = width / 2 + 12, maxX = Math.max(minX, size.width - width / 2 - 12);
      const maxY = Math.max(16, size.height - height - 16);
      const originX = Math.max(minX, Math.min(maxX, (projected.current.x * .5 + .5) * size.width));
      const originY = Math.max(16, Math.min(maxY, (-projected.current.y * .5 + .5) * size.height - 28));
      const xs = [originX, minX, maxX], ys = [originY, Math.max(16, originY-height-12), Math.min(maxY, originY+height+12)];
      for (let x = minX; x <= maxX; x += width + 12) xs.push(x);
      for (let y = 16; y <= maxY; y += height + 12) ys.push(y);
      const candidates = xs.flatMap(x => ys.map(y => ({ x, y, distance: (x-originX)**2 + (y-originY)**2 * (y > originY ? 1.15 : 1) })));
      candidates.sort((a,b) => a.distance-b.distance);
      const position = candidates.find(candidate => occupied.every(previous =>
        Math.abs(candidate.x-previous.x) >= (width+previous.width)/2+8 || candidate.y >= previous.y+previous.height+9 || previous.y >= candidate.y+height+9
      )) ?? { x: originX, y: originY };
      const { x, y } = position;
      occupied.push({ x, y, width, height });
      label.style.transform = `translate3d(${x}px,${y}px,0) translateX(-50%)`;
    });
    camera.userData.journeyProgress = tour.current.progress;
  });
  return null;
}
