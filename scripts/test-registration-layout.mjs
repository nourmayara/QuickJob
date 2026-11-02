import assert from "node:assert/strict";
import { openWorkerBrowser } from "./worker-browser-session.mjs";

const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const b = await openWorkerBrowser(base);
async function layout(label) {
  const result = await b.evaluate(`(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const panel = document.querySelector('.auth-exp-register');
    const visible = [...panel.querySelectorAll('input, select, button, h1, .auth-steps, .auth-switch, .auth-footer, [role=alert]')].filter(e => e.getClientRects().length && !e.closest('[hidden]') && e.type !== 'radio');
    return { width:innerWidth, height:innerHeight, pageWidth:document.documentElement.scrollWidth, pageHeight:document.documentElement.scrollHeight, panelHeight:panel.clientHeight, panelScroll:panel.scrollHeight,
      clipped:visible.filter(e => {const r=e.getBoundingClientRect();return r.top<0 || r.bottom>innerHeight+1 || r.left<0 || r.right>innerWidth+1;}).map(e=>e.name || e.className)};
  })()`);
  assert.ok(result.pageWidth <= result.width, `${label}: horizontal overflow ${JSON.stringify(result)}`);
  if (result.width > 850) {
    assert.ok(result.pageHeight <= result.height + 1 && result.panelScroll <= result.panelHeight + 1, `${label}: scrolling ${JSON.stringify(result)}`);
    assert.deepEqual(result.clipped, [], `${label}: clipped controls`);
  }
}
async function hoverButton() {
  const point = await b.evaluate("(() => { const r=document.querySelector('.auth-exp-register .auth-submit').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}; })()");
  await b.cdp("Input.dispatchMouseEvent", {type:"mouseMoved", ...point});
  const style = await b.evaluate("(async () => { await new Promise(r=>setTimeout(r,260));const s=getComputedStyle(document.querySelector('.auth-exp-register .auth-submit'));return {color:s.color,background:s.backgroundImage};})()");
  assert.equal(style.color, "rgb(255, 255, 255)");
  assert.ok(style.background.includes("rgb(27, 59, 101)"), `Deep blue hover: ${style.background}`);
  await b.cdp("Input.dispatchMouseEvent", {type:"mouseMoved", x:1, y:1});
}
try {
  await b.cdp("Page.navigate", {url:`${base}/register`});
  await b.until("document.readyState === 'complete' && document.querySelector('.auth-experience')?.dataset.registerStep === '1'");
  await b.cdp("Emulation.setDeviceMetricsOverride", {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await hoverButton();
  for (const role of ["TRAVAILLEUR", "RECRUTEUR"]) {
    await b.evaluate(`document.querySelector('[data-role=${role}] .auth-role-arrow').click()`);
    await b.until("document.querySelector('.auth-experience').dataset.registerStep === '2'");
    if (role === "RECRUTEUR") await b.evaluate("(() => {const e=document.querySelector('[name=recruiterType]');e.value='COMPANY';e.dispatchEvent(new Event('change',{bubbles:true}));})()");
    await b.until("!!document.querySelector('.auth-exp-register .auth-steps [data-state=complete] svg')");
    for (const [width,height] of [[1920,1080],[1440,900],[1366,768],[1280,625],[1024,600],[900,625],[390,844],[320,568]]) {
      await b.cdp("Emulation.setDeviceMetricsOverride", {width,height,deviceScaleFactor:1,mobile:false});
      await layout(`${role} ${width}×${height}`);
      if (width === 1440 || width === 390) await b.screenshot(`registration-polish-${role}-${width}.png`);
      console.log(`PASS ${role} ${width}×${height}`);
    }
    await b.cdp("Emulation.setDeviceMetricsOverride", {width:1280,height:625,deviceScaleFactor:1,mobile:false});
    await hoverButton();
    await b.evaluate(`(() => {const f=document.querySelector('[data-auth-form=register]');for(const [name,value] of Object.entries({name:'Test',firstName:'Layout',email:'layout@example.com',phone:'+216 12345678',companyName:'Test company',password:'Layout123!',confirmPassword:'Different123!'})){const e=f.querySelector('[name='+name+']');if(e)e.value=value;}f.querySelector('[name=acceptTerms]').checked=true;f.querySelector('.auth-submit').click();})()`);
    await b.until("document.querySelector('.auth-exp-register [role=alert]')?.textContent.includes('ne correspondent pas')");
    await layout(`${role} validation error`);
    await b.evaluate("document.querySelector('[data-auth-form=register] .auth-back').click()");
    await b.until("document.querySelector('.auth-experience').dataset.registerStep === '1'");
  }
  console.log("PASS blue hover contrast, completed step, company fields and password validation");
} finally { await b.close(); }
