"use client";

import dynamic from "next/dynamic";
import type { GovernorateMissionPoint } from "@/lib/tunisia-geography";

const TunisiaLeafletMap = dynamic(() => import("./TunisiaLeafletMap"), {
  ssr: false,
  loading: () => <div className="ad-geo-loading" role="status">Chargement de la carte…</div>,
});

export default function TunisiaMap(props: { points: GovernorateMissionPoint[]; total: number; unmatched: number }) {
  return <TunisiaLeafletMap {...props} />;
}
