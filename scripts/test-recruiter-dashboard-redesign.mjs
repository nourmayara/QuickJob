import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { openWorkerBrowser } from "./worker-browser-session.mjs";

const base = process.env.TEST_BASE_URL;
const database = process.env.DASHBOARD_UI_DATABASE_URL;
assert.ok(base, "TEST_BASE_URL is required");
assert.ok(database?.includes("/.artifacts/"), "Use the isolated dashboard database");
const prisma = new PrismaClient({ datasourceUrl: database });
const browser = await openWorkerBrowser(base);

try {
  const recruiter = await prisma.user.findFirstOrThrow({ where: { role: "RECRUTEUR", email: { startsWith: "dashboard-ui-" }, recruiterVerification: { is: { status: "APPROUVE" } } }, orderBy: { id: "desc" } });
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: recruiter.email, password: "Dashboard-ui123!" }) });
  assert.equal(response.status, 200);
  const session = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(session);
  await browser.cookie(session);
  const warmup = await fetch(`${base}/recruteur/dashboard`, { headers: { Cookie: session } });
  assert.equal(warmup.status, 200);
  assert.ok(!(await warmup.text()).includes('id="__next_error__"'));

  for (const viewport of [{ width: 1440, height: 1000, name: "desktop" }, { width: 900, height: 900, name: "tablet" }, { width: 390, height: 844, name: "mobile" }]) {
    await browser.cdp("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 500 });
    await browser.go("/recruteur/dashboard");
    await new Promise(resolve => setTimeout(resolve, 250));
    const state = await browser.evaluate(`(() => {
      const root = document.querySelector('.rq-app');
      const primary = document.querySelector('.rqd-page .rq-primary');
      const sidebar = document.querySelector('.rq-sidebar');
      return {
        routeClass: root?.classList.contains('rq-recruiter-dashboard'),
        horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
        kpis: document.querySelectorAll('.rqd-kpi').length,
        sections: document.querySelectorAll('.rqd-glass').length,
        primaryColor: primary ? getComputedStyle(primary).color : '',
        primaryBackground: primary ? getComputedStyle(primary).backgroundImage : '',
        sidebarRight: sidebar?.getBoundingClientRect().right
      };
    })()`);
    assert.equal(state.routeClass, true);
    assert.equal(state.horizontalOverflow <= 1, true, JSON.stringify(state));
    assert.equal(state.kpis, 4);
    assert.equal(state.sections >= 5, true);
    assert.equal(state.primaryColor, "rgb(255, 255, 255)");
    assert.match(state.primaryBackground, /linear-gradient/);
    if (viewport.width < 761) assert.equal(state.sidebarRight <= 1, true, JSON.stringify(state));
    await browser.screenshot(`recruiter-dashboard-${viewport.name}.png`);
  }
  assert.deepEqual(browser.errors, []);
  console.log("PASS recruiter dashboard redesign — desktop/tablet/mobile");
} finally {
  await browser.close();
  await prisma.$disconnect();
}
