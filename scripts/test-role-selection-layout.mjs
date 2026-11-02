import assert from "node:assert/strict";
import { openWorkerBrowser } from "./worker-browser-session.mjs";

const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const browser = await openWorkerBrowser(base);
try {
  await browser.cdp("Page.navigate", { url: `${base}/register?intent=travailleur` });
  await browser.until("document.readyState === 'complete' && document.querySelector('.auth-experience')?.dataset.registerStep === '1'");
  for (const [width, height] of [[1920, 1080], [1440, 900], [1366, 768], [1280, 625], [1024, 600], [820, 600], [600, 700], [390, 844], [375, 667], [320, 568]]) {
    await browser.cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    const layout = await browser.evaluate(`(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const panel = document.querySelector('.auth-exp-register');
      const essentials = [...panel.querySelectorAll('.auth-header, h1, .auth-description, .auth-role, .auth-role-visual, .auth-role-arrow, .auth-submit, .auth-switch, .auth-footer')];
      const cards = [...panel.querySelectorAll('.auth-role')].map(e => { const r = e.getBoundingClientRect(); return {top:r.top, height:r.height}; });
      return {width:innerWidth, height:innerHeight, scrollWidth:document.documentElement.scrollWidth, scrollHeight:document.documentElement.scrollHeight, cards,
        clipped:essentials.filter(e => {const r=e.getBoundingClientRect(); return r.width===0 || r.height===0 || r.top<0 || r.bottom>innerHeight+1 || r.left<0 || r.right>innerWidth+1;}).map(e=>e.className)};
    })()`);
    assert.ok(layout.scrollWidth <= width, `Horizontal overflow: ${JSON.stringify(layout)}`);
    assert.equal(layout.cards[0].height, layout.cards[1].height, "Equal card heights");
    assert.equal(layout.cards[0].top, layout.cards[1].top, "Aligned cards");
    if (width > 540) {
      assert.ok(layout.scrollHeight <= height + 1, `Desktop scroll: ${JSON.stringify(layout)}`);
      assert.deepEqual(layout.clipped, [], `Clipped content ${width}×${height}`);
    }
    if (width === 1440 || width === 390 || width === 820) await browser.screenshot(`role-selection-${width}.png`);
    console.log(`PASS layout ${width}×${height}`);
  }
  await browser.cdp("Emulation.setDeviceMetricsOverride", { width:1280, height:720, deviceScaleFactor:1, mobile:false });
  await browser.evaluate("document.querySelector('#register-role-TRAVAILLEUR').focus()");
  await browser.cdp("Input.dispatchKeyEvent", {type:"keyDown", key:"ArrowRight", code:"ArrowRight", windowsVirtualKeyCode:39});
  await browser.cdp("Input.dispatchKeyEvent", {type:"keyUp", key:"ArrowRight", code:"ArrowRight", windowsVirtualKeyCode:39});
  await browser.until("document.querySelector('#register-role-RECRUTEUR').checked");
  await browser.evaluate("document.querySelector('[data-role=RECRUTEUR] .auth-role-arrow').click()");
  await browser.until("document.querySelector('.auth-experience').dataset.registerStep === '2'");
  assert.equal(await browser.evaluate("document.querySelector('[data-auth-form=register] [name=recruiterType]').disabled"), false);
  assert.equal(await browser.evaluate("document.querySelector('[data-auth-form=register] [name=city]').disabled"), true);
  await browser.evaluate("document.querySelector('[data-auth-form=register] .auth-back').click()");
  await browser.until("document.querySelector('.auth-experience').dataset.registerStep === '1'");
  assert.equal(await browser.evaluate("document.querySelector('#register-role-RECRUTEUR').checked"), true);
  await browser.evaluate("document.querySelector('[data-role=TRAVAILLEUR] .auth-role-arrow').click()");
  await browser.until("document.querySelector('.auth-experience').dataset.registerStep === '2'");
  assert.equal(await browser.evaluate("document.querySelector('[data-auth-form=register] [name=city]').disabled"), false);
  await browser.evaluate("document.querySelector('[data-auth-form=register] .auth-back').click()");
  await browser.until("document.querySelector('.auth-experience').dataset.registerStep === '1'");
  await browser.evaluate("document.querySelector('[data-auth-form=register] .auth-submit').click()");
  await browser.until("document.querySelector('.auth-experience').dataset.registerStep === '2'");
  console.log("PASS keyboard selection, both role arrows, role-specific fields, back and Continue");
} finally {
  await browser.close();
}
