import type { CSSProperties } from "react";

const paths = {
  grid: "M4 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M15 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M4 14h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z M15 14h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z",
  briefcase: "M8 6V4h8v2 M3 7h18v14H3z M3 12c6 4 12 4 18 0 M10 13h4",
  plus: "M12 5v14 M5 12h14", people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-3.87",
  check: "M5 12l4 4L19 6", mail: "M3 5h18v14H3z M3 5l9 8 9-8",
  user: "M20 21v-2a7 7 0 0 0-14 0v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z",
  arrow: "M5 12h14 M13 6l6 6-6 6", calendar: "M3 5h18v16H3z M3 10h18 M7 3v4 M17 3v4",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0 M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  menu: "M4 6h16 M4 12h16 M4 18h16", close: "M6 6l12 12 M6 18L18 6",
  clock: "M12 8v5l3 2 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
  shield: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6",
  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z",
  chart: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
  handshake: "m11 17 2 2a2 2 0 0 0 3-3l-5-5 M7 14l4 4a2 2 0 0 0 3-3 M16 16l3-3-4-7-3-1-5 4 2 2 3-2 5 5 M3 7l4-2 3 2 M2 8l4 8 3-1 M22 8l-4 8",
  layers: "m12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5",
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z",
  document: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h6",
  message: "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  headset: "M3 14v-3a9 9 0 0 1 18 0v7a3 3 0 0 1-3 3h-4 M3 12h3v7H3z M18 12h3v7h-3z",
  utensils: "M4 3v6a2 2 0 0 0 4 0V3 M6 3v18 M19 3c-4 3-5 9-1 9h1 M19 3v18",
  truck: "M1 3h14v13H1z M15 8h4l3 5v3h-7 M4 16a3 3 0 1 0 6 0 M16 16a3 3 0 1 0 6 0",
  store: "M3 10v11h18V10 M2 10l2-7h16l2 7 M2 10a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 M9 21v-7h6v7",
  monitor: "M4 3h16a2 2 0 0 1 2 2v11H2V5a2 2 0 0 1 2-2z M8 21h8 M12 16v5",
  megaphone: "m3 9 18-6v16L3 13z M7 14l2 7h4l-3-6",
  edit: "m16 3 5 5-12 12-6 1 1-6z M13 6l5 5",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  eyeOff: "m3 3 18 18 M10.6 10.6a2 2 0 0 0 2.8 2.8 M9.9 5.2A11 11 0 0 1 22 12a16 16 0 0 1-3 3.8 M6.2 6.2A16 16 0 0 0 2 12s4 7 10 7a11 11 0 0 0 4.2-.9",
  logout: "M9 21H4V3h5 M9 12h13 m-5-5 5 5-5 5",
  lock: "M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4",
  send: "m22 2-7 20-4-9-9-4z M22 2 11 13",
  chevronDown: "m6 9 6 6 6-6",
};
export type IconName = keyof typeof paths;
export default function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg className="qj-outline-icon" data-icon={name} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={style}><path d={paths[name]} /></svg>;
}
