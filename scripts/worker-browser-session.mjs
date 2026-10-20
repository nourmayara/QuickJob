import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function openWorkerBrowser(base) {
  const directory = await mkdtemp(path.join(tmpdir(), "quickjob-worker-browser-"));
  const browser = spawn(process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${directory}`, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  let failure, debugUrl = "", socket, counter = 0;
  const pending = new Map(), errors = [];
  browser.on("error", error => { failure = error; });
  browser.stderr.on("data", data => { debugUrl ||= String(data).match(/DevTools listening on (ws:\/\/\S+)/)?.[1] || ""; });
  function cdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++counter;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
      pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function close() {
    socket?.close(); browser.kill(); browser.stderr.destroy(); browser.unref();
    await delay(500);
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
    assert.ok(path.basename(resolved).startsWith("quickjob-worker-browser-"));
    await rm(resolved, { recursive: true, force: true }).catch(() => {});
  }
  try {
    for (let i = 0; i < 100 && !debugUrl; i++) { if (failure) throw failure; await delay(100); }
    assert.ok(debugUrl, "Chrome debugging endpoint unavailable");
    const targets = await (await fetch(`http://127.0.0.1:${new URL(debugUrl).port}/json/list`)).json();
    socket = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (pending.has(message.id)) { const p = pending.get(message.id); pending.delete(message.id); message.error ? p.reject(new Error(message.error.message)) : p.resolve(message.result); }
      if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
    };
    await cdp("Page.enable"); await cdp("Runtime.enable"); await cdp("Network.enable");
  } catch (error) { await close(); throw error; }
  async function evaluate(expression) {
    const r = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result?.value;
  }
  async function until(expression) {
    for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await delay(100); }
    const diagnostic = await evaluate("JSON.stringify({path:location.pathname,heading:document.querySelector('h1')?.textContent,alerts:[...document.querySelectorAll('[role=alert]')].map(e=>e.textContent),invalid:[...document.querySelectorAll('form input,form textarea,form select')].filter(e=>!e.validity.valid).map(e=>e.name)})");
    throw new Error(`Browser condition failed: ${expression}; ${diagnostic}`);
  }
  async function go(route) {
    await cdp("Page.navigate", { url: base + route });
    await until(`location.pathname === ${JSON.stringify(route.split("?")[0])} && document.readyState === 'complete' && !!document.querySelector('.rq-app')`);
    await delay(350);
  }
  async function cookie(value) { const separator = value.indexOf("="); await cdp("Network.setCookie", { name: value.slice(0, separator), value: value.slice(separator + 1), url: base, httpOnly: true }); }
  async function screenshot(name) {
    await mkdir(".artifacts", { recursive: true });
    const result = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(path.join(process.cwd(), ".artifacts", name), Buffer.from(result.data, "base64"));
  }
  return { cdp, evaluate, until, go, cookie, screenshot, close, errors };
}
