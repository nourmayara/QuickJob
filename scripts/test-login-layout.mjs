import assert from "node:assert/strict";
import { openWorkerBrowser } from "./worker-browser-session.mjs";

const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const browser = await openWorkerBrowser(base);
try {
  await browser.cdp("Page.navigate", { url: `${base}/login?intent=travailleur` });
  await browser.until("document.readyState === 'complete' && !!document.querySelector('.auth-login-brand')");
  for (const [width, height] of [[1920, 1080], [1440, 900], [1366, 768], [1280, 625], [1024, 600], [820, 600], [390, 844], [375, 667], [320, 568]]) {
    await browser.cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    const result = await browser.evaluate(`(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const essential = [...document.querySelectorAll('.auth-exp-login input, .auth-exp-login button, .auth-exp-login .auth-switch, .auth-login-brand, .auth-exp-worker')].filter(e => e.getClientRects().length);
      return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
        clipped: essential.filter(e => { const r = e.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth + 1 || r.top < 0 || r.bottom > innerHeight + 1; }).map(e => e.className || e.name) };
    })()`);
    assert.ok(result.scrollWidth <= width, `Horizontal overflow: ${JSON.stringify(result)}`);
    if (width > 700) {
      assert.ok(result.scrollHeight <= height + 1, `Desktop scrolling: ${JSON.stringify(result)}`);
      assert.deepEqual(result.clipped, [], `Clipped desktop content at ${width}×${height}`);
    }
    console.log(`PASS layout ${width}×${height}`);
    if (width === 1440 || width === 390) await browser.screenshot(`login-design-${width}.png`);
  }
  await browser.evaluate("document.querySelector('.auth-exp-login .auth-password button').click()");
  await browser.until("document.querySelector('#login-password').type === 'text'");
  await browser.evaluate("document.querySelector('.auth-exp-login .auth-password button').click()");
  await browser.until("document.querySelector('#login-password').type === 'password'");
  assert.ok(await browser.evaluate("document.querySelector('.auth-exp-login .auth-switch a').href.includes('intent=travailleur')"), "Registration preserves journey");
  // Exercise the existing submit/error flow without using real credentials or changing data.
  await browser.evaluate(`(() => {
    window.fetch = async (url, options) => {
      window.__loginRequest = {url: String(url), data: JSON.parse(options.body)};
      return new Response(JSON.stringify({error: 'Identifiants de test invalides'}), {status: 401, headers: {'Content-Type': 'application/json'}});
    };
    const form = document.querySelector('[data-auth-form=login]');
    form.querySelector('[name=email]').value = 'layout@example.com';
    form.querySelector('[name=password]').value = 'Layout123!';
    form.querySelector('.auth-submit').click();
  })()`);
  await browser.until("document.querySelector('.auth-exp-login [role=alert]')?.textContent === 'Identifiants de test invalides'");
  const request = await browser.evaluate("window.__loginRequest");
  assert.equal(request.url, "/api/auth/login");
  assert.equal(request.data.email, "layout@example.com");
  await browser.cdp("Emulation.setDeviceMetricsOverride", { width: 1280, height: 625, deviceScaleFactor: 1, mobile: false });
  assert.ok(await browser.evaluate(`(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const elements = [...document.querySelectorAll('.auth-exp-login input, .auth-exp-login button, .auth-exp-login [role=alert], .auth-exp-login .auth-switch')];
    return document.documentElement.scrollHeight <= innerHeight + 1 && elements.every(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; });
  })()`), "Error message and controls remain visible on compact desktop");
  console.log("PASS password visibility, journey link, login submit and error handling");
} finally {
  await browser.close();
}
