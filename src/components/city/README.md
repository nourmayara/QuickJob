# QuickJob City

The Home is a single persistent WebGL world. No external models, HDRs, fonts, or texture requests are made by the scene. Buildings are original Three.js geometry, and signs are generated with local canvas textures.

- `CityExperience.tsx`: lazy Canvas loading, capability detection, GSAP timeline (`pin`, `scrub`), chapter navigation, simplified mode and mission dialog. The GSAP context is reverted on cleanup.
- `CityWorld.tsx`: architecture, furniture, landscaping, lighting and the luminous route. One static desktop shadow map; mobile shadows are disabled.
- `CameraRig.tsx`: continuous camera and look-at curves, sampled from scroll progress. Mission coordinates are projected into regular HTML buttons without separate React roots.
- `TourContent.tsx` / `CityNavigation.tsx`: accessible HTML content and navigation, independent of WebGL.
- `MissionCard.tsx`: shared mission content including date, duration, location and pay. Desktop cards follow projected building anchors; mobile and simplified views use an inline card.
- `RecruiterDemo.tsx`: a scroll-driven illustration of publishing a mission, receiving three fictional applications and selecting a worker. Its step buttons provide direct access, including with reduced motion or no WebGL. Profile dialogs preserve the chosen candidate. No real publication or selection is performed.
- `data.ts`: fictional missions and candidate profiles, five narrative chapters grouped into four navigation steps, and camera waypoints. Adjust `cameraStops` to edit the journey. Recruiter phase boundaries are defined in `getRecruitMoment` (.648 publication, .672 applications, .738 acceptance, .758 confirmation).
- `CityFallback.tsx`: original SVG illustration, shown only when the visitor explicitly selects the simplified view.
- `CityPoster.tsx`: lightweight WebP captures of the actual opening scene, rendered in the initial server HTML. Desktop and mobile use their corresponding camera framing. The poster remains visible while the Canvas bundle initializes and when WebGL is unavailable; the SVG is only shown after explicitly selecting the simplified view.

The renderer uses `frameloop="demand"`: GSAP invalidates frames while its scrub tween changes progress. No continuous render loop runs while the scene is idle. Device pixel ratio is capped at 1.6 desktop / 1.25 mobile. Context loss switches to the actual-city poster. Reduced motion disables pinning and animated travel; chapter buttons select static views instead.

The live canvas remains invisible, with its layout preserved, until CameraRig and CityWorld have prepared and rendered the first complete frame. The poster is then replaced by the interactive scene without briefly displaying the schematic SVG. Returning from simplified mode resets readiness before mounting a new Canvas.

`public/images/quickjob-city-desktop.webp` (about 50 KB) and `quickjob-city-mobile.webp` (about 32 KB) contain only the Three.js scene, without text, buttons or navigation. They are eager-loaded with high fetch priority and need to be recaptured when the opening geometry or camera changes. Capture the canvas at progress 0 with `preserveDrawingBuffer` enabled only in the capture browser; the production renderer keeps its default buffer behavior.

Loading verification: production build, TypeScript and scoped ESLint passed. A Chrome session passed 59 checks at 1920×1080, 1440×900, 1366×768, 768×1024 and 390×844: server HTML with JavaScript disabled, decoded responsive poster, first complete WebGL frame, no automatic SVG flash, renderer idle, simplified-view round trip, reduced motion, chapter navigation, lost/unavailable WebGL and cold-cache slow-network loading. No accounts or database fixtures were created. Evidence is in `.artifacts/city-loading-checks.json` and the `city-loading-*.png` captures. This does not claim a rerun of the older hybrid Home recipe, whose selectors belong to a different Home composition.

The Home uses a light premium palette (#F8FAFF / #18244A / #4F46E5 / #8B5CF6). Only the application journey enters a cinematic atmosphere (#11152C); lighting and background changes follow scroll progress in both directions. Existing camera positions and building locations are retained.

Run `npm run dev` and open `/`. Scroll forward and backward or use the chapter navigation. Existing login/register routes are retained; the Home does not create real offers or accept real applications.
