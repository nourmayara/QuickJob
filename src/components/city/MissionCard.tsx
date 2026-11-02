import type { CityMission } from "./data";
import SoftIcon from "@/components/SoftIcon";
import Icon from "@/components/recruiter/Icon";
import { categoryIcon } from "@/components/category-icon";

/** The same semantic content is used in the world overlay and the mobile view. */
export function MissionCardContent({ mission }: { mission: CityMission }) {
 return <>
  <span className="city-card-copy">
   <small><SoftIcon name={categoryIcon(mission.category)} size={17} /> MISSION FICTIVE · {mission.category}</small>
   <strong>{mission.title}</strong>
   <span>{mission.city}</span>
   <span>{mission.date} · {mission.duration}</span>
  </span>
  <b>{mission.pay}<small> DT</small></b>
  <span className="city-card-action">Voir la mission <Icon name="arrow" size={17} /></span>
 </>;
}

export default function MissionCard({ mission, onSelect }: { mission: CityMission; onSelect: (mission: CityMission) => void }) {
 return <button className="city-world-label city-inline-mission" onClick={() => onSelect(mission)} aria-label={`Voir la mission : ${mission.title}, ${mission.city}`}><MissionCardContent mission={mission} /></button>;
}
