import assert from 'node:assert/strict';
import { openWorkerBrowser } from './worker-browser-session.mjs';
const base=process.env.TEST_BASE_URL;
assert.ok(base,'TEST_BASE_URL required');
const browser=await openWorkerBrowser(base);
try {
  for(const [route,selector] of [['/','.city-home'],['/login','.auth-form'],['/register','.auth-form']]) {
    const response=await fetch(base+route);assert.equal(response.status,200);await response.text();
    await browser.cdp('Page.navigate',{url:base+route});
    await browser.until(`document.readyState==='complete' && !!document.querySelector(${JSON.stringify(selector)})`);
    for(const width of [1440,390,320]) {
      await browser.cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      await browser.evaluate('document.fonts.ready');
      assert.ok(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),`${route} overflow ${width}`);
      assert.ok(await browser.evaluate("document.querySelectorAll('.qj-outline-icon,.qj-soft-icon').length>0"));
      const invalid=await browser.evaluate(`(()=>{
        const svg=[...document.querySelectorAll('.qj-soft-icon svg')];
        const ids=svg.flatMap(s=>[...s.querySelectorAll('[id]')].map(n=>n.id));
        return {duplicates:ids.filter((v,i)=>ids.indexOf(v)!==i),badPaint:svg.flatMap(s=>[...s.querySelectorAll('[fill^="url"]')]).filter(n=>!document.getElementById(n.getAttribute('fill').slice(5,-1))).length,accessible:svg.every(s=>s.closest('[aria-hidden="true"]'))};
      })()`);
      assert.deepEqual(invalid.duplicates,[]);assert.equal(invalid.badPaint,0);assert.equal(invalid.accessible,true);
      await browser.screenshot(`icon-system-${route==='/'?'home':route.slice(1)}-${width}.png`);
    }
  }
  await browser.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.ok(await browser.evaluate("[...document.querySelectorAll('.qj-soft-icon')].every(n=>getComputedStyle(n).transitionDuration.split(',').every(v=>parseFloat(v)===0))"));
  assert.deepEqual(browser.errors,[]);
  console.log('PASS icon system: Home/Login/Register, responsive 1440/390/320, unique SVG paint IDs, decorative accessibility, reduced motion, no browser errors');
} finally { await browser.close(); }
