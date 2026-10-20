"use client";
/* eslint-disable react-hooks/immutability -- Renderer lifecycle configures Three.js' imperative shadow-map API. */
import { Canvas, useThree } from "@react-three/fiber";
import { Component, useEffect, type ReactNode, type RefObject } from "react";
import CameraRig from "./CameraRig";
import CityWorld from "./CityWorld";
import CityFallback from "./CityFallback";
import type { TourState } from "./data";
import type { CityView } from "./hybrid";

class CanvasBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
 state = { failed: false };
 static getDerivedStateFromError() { return { failed: true }; }
 componentDidCatch() { this.props.onFailure(); }
 render() { return this.state.failed ? <CityFallback /> : this.props.children; }
}
function RendererLifecycle({ onReady, onFailure }: { onReady: () => void; onFailure: () => void }) {
 const { gl, scene, camera } = useThree();
 useEffect(() => {
  const canvas = gl.domElement;
  const lost = (event: Event) => { event.preventDefault(); onFailure(); };
  canvas.addEventListener("webglcontextlost", lost);
  // An initial frame ensures the scene is ready before dismissing the loading state.
  gl.shadowMap.autoUpdate = true;
  gl.render(scene, camera);
  gl.shadowMap.autoUpdate = false;
  const frame = requestAnimationFrame(onReady);
  return () => { cancelAnimationFrame(frame); canvas.removeEventListener("webglcontextlost", lost); };
 }, [gl, scene, camera, onReady, onFailure]);
 return null;
}
export default function CityCanvas({ tour, mobile, view, onReady, onFailure, labels }: {
 tour: RefObject<TourState>; mobile: boolean; view: CityView; onReady: () => void; onFailure: () => void; labels: RefObject<(HTMLButtonElement | null)[]>;
}) {
 return <CanvasBoundary onFailure={onFailure}><Canvas
  orthographic frameloop="demand" dpr={mobile ? [1,1.25] : [1,1.6]} shadows={mobile ? false : "percentage"}
  gl={{ antialias: !mobile, alpha: true, powerPreference: mobile ? "low-power" : "default" }}
  camera={{ position: [24,24.4,24], zoom: 14, near: .1, far: 120 }}
  fallback={<CityFallback />} aria-label="Ville miniature QuickJob en trois dimensions"
 ><CameraRig tour={tour} view={view} labels={labels} /><CityWorld tour={tour} mobile={mobile} /><RendererLifecycle onReady={onReady} onFailure={onFailure} /></Canvas></CanvasBoundary>;
}
