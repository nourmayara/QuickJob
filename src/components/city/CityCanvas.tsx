"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useRef, type ReactNode, type RefObject } from "react";
import CameraRig from "./CameraRig";
import CityWorld from "./CityWorld";
import type { TourState } from "./data";

class CanvasBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
 state = { failed: false };
 static getDerivedStateFromError() { return { failed: true }; }
 componentDidCatch() { this.props.onFailure(); }
 render() { return this.state.failed ? null : this.props.children; }
}
function RendererLifecycle({ onReady, onFailure }: { onReady: () => void; onFailure: () => void }) {
 const { gl } = useThree();
 const firstFrame = useRef(false);
 const revealFrame = useRef(0);
 useEffect(() => {
  const canvas = gl.domElement;
  const lost = (event: Event) => { event.preventDefault(); onFailure(); };
  canvas.addEventListener("webglcontextlost", lost);
  return () => { cancelAnimationFrame(revealFrame.current); canvas.removeEventListener("webglcontextlost", lost); };
 }, [gl, onFailure]);
 useFrame(() => {
  if (firstFrame.current) return;
  firstFrame.current = true;
  // CameraRig and CityWorld have now prepared the opening view. R3F renders it
  // after this callback; reveal on the next frame, with its shadow map ready.
  revealFrame.current = requestAnimationFrame(() => {
   gl.shadowMap.autoUpdate = false;
   onReady();
  });
 });
 return null;
}
export default function CityCanvas({ tour, mobile, onReady, onFailure, labels }: {
 tour: RefObject<TourState>; mobile: boolean; onReady: () => void; onFailure: () => void; labels: RefObject<(HTMLButtonElement | null)[]>;
}) {
 return <CanvasBoundary onFailure={onFailure}><Canvas
  frameloop="demand" dpr={mobile ? [1,1.25] : [1,1.6]} shadows={mobile ? false : "percentage"}
  gl={{ antialias: !mobile, alpha: false, powerPreference: "high-performance" }}
  camera={{ position: [26,27,33], fov: 43, near: .1, far: 120 }}
  fallback={null} aria-label="Ville miniature QuickJob en trois dimensions"
 ><CameraRig tour={tour} mobile={mobile} labels={labels} /><CityWorld tour={tour} mobile={mobile} /><RendererLifecycle onReady={onReady} onFailure={onFailure} /></Canvas></CanvasBoundary>;
}
