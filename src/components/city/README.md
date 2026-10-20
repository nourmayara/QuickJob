# QuickJob City — Hybrid experience

The Home reuses the original Three.js city, local geometry, logo, fonts, GSAP and HTML components. No dependency, external model, HDR or texture service was added.

One parent owns the selected journey, the remembered step for each journey, the selected sector and the overview state. The guide, points of interest, camera, visible copy and action links all follow that state. Free exploration and the guide are two ways to navigate the same experience.

- `CityExperience.tsx`: capabilities, shared state, native scrolling and the illustrated/WebGL switch.
- `CityNavigation.tsx`: header, contextual authentication links and the accessible responsive menu.
- `TourContent.tsx`: selected step, immediate real action and explicit authentication note.
- `JourneyRail.tsx`: three directly accessible steps, active state and the QuickJob thread.
- `hybrid.ts`: content, sectors and bounded camera views.
- `CameraRig.tsx`: interrupted transitions resume from the current position; HTML sector controls follow their anchors and are placed without overlapping.
- `CityCanvas.tsx`: demand rendering, first-frame readiness, shadow lifecycle and context-loss handling.
- `CityWorld.tsx`: modern white/lavender architecture, stepped roof terraces, indigo glazing, a continuous purple street and stable soft lighting. Window panes are instanced per building.
- `cityArt.ts`: shared palette and street layout for the live city and illustration.
- `CityFallback.tsx`: local isometric SVG city with the same visual identity, highlighted sector and HTML controls.
- `city.css`: scoped composition, dark theme, touch targets, responsive order and reduced motion.
- `src/lib/journey.ts`: two allowed intentions and role-compatible destinations. Intent never grants permissions.

Desktop loads the city after capability detection. Tablet/mobile starts with an illustration; 3D is optional. Reduced motion uses the illustration and all journey controls without animation. No WebGL or a lost context retains the current journey and real action. There is no pinned scroll or nested scrolling area.

The geometry viewport is separate from the reading area, so a building cannot pass behind the text. An orthographic camera maintains the architectural isometric view without perspective zoom; its scale fits the viewport. Rendering stops when transitions settle. The art direction uses local geometry and SVG, with no raster illustration or downloaded model.

The Home presents sectors, not fictional job availability. The previous mission/candidate demonstration components are no longer mounted. Real jobs, applications and publication remain in the existing protected pages.

The server supplies the authenticated role. The existing authentication form can receive a public journey intention; actual server roles still determine the permitted post-login destination. The default authentication flow and its persistent form transitions are preserved.

Run `npm run test:home:browser` against a local server (`TEST_BASE_URL`, default port 3100). The browser recipe covers nine resolutions, keyboard, both journeys, free exploration, rendering at rest, mobile 3D opt-in, reduced motion, no/lost WebGL, real temporary signups/logins and permission boundaries. Fixtures are removed in `finally`.

See [HYBRID_CITY.md](../../../HYBRID_CITY.md) for the full French implementation notes, file list, validation and limits.
