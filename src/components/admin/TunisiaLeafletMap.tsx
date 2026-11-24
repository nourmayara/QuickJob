"use client";

import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, useMap } from "react-leaflet";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import { geoJSON as leafletGeoJSON } from "leaflet";
import type { Layer, LeafletMouseEvent, PathOptions } from "leaflet";
import type { GovernorateMissionPoint } from "@/lib/tunisia-geography";
import "leaflet/dist/leaflet.css";

type GovernorateProperties = GeoJsonProperties & { id?: string; iso_3166_2?: string; name_fr?: string };
type GovernorateFeature = Feature<Geometry, GovernorateProperties>;

const levels = [
  { label: "0 mission", color: "#D8DFEB" },
  { label: "1–9", color: "#38BCE5" },
  { label: "10–14", color: "#FFCC29" },
  { label: "15–19", color: "#168BFF" },
  { label: "20 et plus", color: "#082CC4" },
];

function FitTunisia({ data }: { data: FeatureCollection<Geometry, GovernorateProperties> }) {
  const map = useMap();
  useEffect(() => {
    const bounds = leafletGeoJSON(data).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [6, 6], animate: false, maxZoom: 7 });
  }, [data, map]);
  return null;
}

export function missionColor(value: number) {
  if (value >= 20) return levels[4].color;
  if (value >= 15) return levels[3].color;
  if (value >= 10) return levels[2].color;
  if (value >= 1) return levels[1].color;
  return levels[0].color;
}

export default function TunisiaLeafletMap({ points, total, unmatched }: { points: GovernorateMissionPoint[]; total: number; unmatched: number }) {
  const [geojson, setGeojson] = useState<FeatureCollection<Geometry, GovernorateProperties> | null>(null);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const byId = useMemo(() => new Map(points.map(point => [point.id, point])), [points]);
  const ordered = useMemo(() => [...points].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "fr")), [points]);
  const maxValue = Math.max(1, ...points.map(point => point.value));

  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/tunisia-governorates.geojson", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("GeoJSON indisponible");
        return response.json() as Promise<FeatureCollection<Geometry, GovernorateProperties>>;
      })
      .then(data => {
        if (data.type !== "FeatureCollection" || data.features.length !== 24) throw new Error("GeoJSON invalide");
        setGeojson(data);
      })
      .catch(cause => { if ((cause as Error).name !== "AbortError") setError(true); });
    return () => controller.abort();
  }, []);

  const featureId = (feature?: GovernorateFeature) => String(feature?.properties?.iso_3166_2 ?? feature?.properties?.id ?? feature?.id ?? "");
  const style = (feature?: GovernorateFeature): PathOptions => {
    const id = featureId(feature);
    const highlighted = active === id;
    return { color: highlighted ? "#ffffff" : "rgba(255,255,255,.92)", weight: highlighted ? 3 : 1.5, fillColor: missionColor(byId.get(id)?.value ?? 0), fillOpacity: highlighted ? 1 : .88 };
  };
  const onEachFeature = (feature: GovernorateFeature, layer: Layer) => {
    const id = featureId(feature);
    const point = byId.get(id);
    if (point) layer.bindTooltip(`<strong>${point.name}</strong><span>${point.value} mission${point.value > 1 ? "s" : ""} · ${total ? Math.round(point.value / total * 100) : 0} %</span>`, { sticky: true, direction: "top", opacity: 1 });
    layer.on({ mouseover: (event: LeafletMouseEvent) => { setActive(id); event.target.bringToFront?.(); }, mouseout: () => setActive(null) });
  };

  return <figure className="ad-choropleth">
    <div className="ad-choropleth-visual">
      <div className="ad-choropleth-map" aria-label="Carte des missions par gouvernorat tunisien">
        {error && <p className="ad-geo-error" role="alert">La carte locale n’a pas pu être chargée.</p>}
        {!geojson && !error && <div className="ad-geo-loading" role="status">Chargement de la carte…</div>}
        {geojson && <MapContainer center={[34.1, 9.55]} zoom={5.75} minZoom={5} maxZoom={8} zoomSnap={.25} zoomControl={false} scrollWheelZoom={false} attributionControl={false} className="ad-leaflet-map">
          <FitTunisia data={geojson} />
          <GeoJSON data={geojson} style={style} onEachFeature={onEachFeature} />
        </MapContainer>}
      </div>
      <ul className="ad-map-legend" aria-label="Légende des volumes de missions">{levels.map(level => <li key={level.label}><i style={{ background: level.color }} />{level.label}</li>)}</ul>
    </div>
    <figcaption>
      <ul className="ad-governorate-list">{ordered.map(point => <li key={point.id} className={active === point.id ? "is-active" : ""} onMouseEnter={() => setActive(point.id)} onMouseLeave={() => setActive(null)}><div><span><i style={{ background: missionColor(point.value) }} />{point.name}</span><strong>{point.value} <small>({total ? Math.round(point.value / total * 100) : 0} %)</small></strong></div><span className="ad-governorate-progress" aria-hidden="true"><i style={{ background: missionColor(point.value), width: `${point.value / maxValue * 100}%` }} /></span></li>)}</ul>
      <p className="ad-map-note">Pourcentages calculés sur les {total.toLocaleString("fr-FR")} missions réelles.{unmatched > 0 && <> {unmatched.toLocaleString("fr-FR")} mission{unmatched > 1 ? "s" : ""} sans ville reconnue.</>}</p>
      <p className="ad-map-source">Données cartographiques © OpenStreetMap contributors · Map Tunisia, ODbL 1.0.</p>
    </figcaption>
  </figure>;
}
