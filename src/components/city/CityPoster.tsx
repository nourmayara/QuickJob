import Image from "next/image";

// Captured from CityWorld at the opening camera position, without any UI overlay.
// Present in the server HTML so the real city is visible before the WebGL bundle loads.
export default function CityPoster() {
 return <picture className="city-poster">
  <source media="(max-width: 700px)" srcSet="/images/quickjob-city-mobile.webp" />
  <Image src="/images/quickjob-city-desktop.webp" alt="" width={1905} height={1080} unoptimized loading="eager" fetchPriority="high" />
 </picture>;
}
