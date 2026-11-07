/* Local audit only: use isolated fixtures/Chrome CDP prepared by backend live audit.
   Never prints credentials/tokens, and closes only contexts created here. */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class CDP {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.serial = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.onopen = resolve;
      this.socket.onerror = reject;
    });
    this.socket.onmessage = (event) => {
      const value = JSON.parse(String(event.data));
      const waiter = this.pending.get(value.id);
      if (!waiter) return;
      this.pending.delete(value.id);
      if (value.error) waiter.reject(new Error(value.error.message));
      else waiter.resolve(value.result);
    };
  }
  async call(method, params = {}) {
    await this.ready;
    const id = ++this.serial;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const result = await this.call("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description ||
          result.exceptionDetails.text,
      );
    return result.result?.value;
  }
  close() {
    this.socket.close();
  }
}
async function main() {
  const fixture = JSON.parse(
    await fs.readFile(
      path.join(os.tmpdir(), "fitly-live-fixtures.json"),
      "utf8",
    ),
  );
  const origin = "http://localhost:3416",
    api = "http://127.0.0.1:4006/api/v1";
  const version = await (
    await fetch("http://127.0.0.1:9229/json/version")
  ).json();
  const browser = new CDP(version.webSocketDebuggerUrl),
    contexts = [],
    clients = [],
    proof = [];
  async function request(route, method, token, body) {
    const r = await fetch(api + route, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: "Bearer " + token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const value = await r.json();
    if (!r.ok)
      throw new Error(
        route + ": " + r.status + " " + (value.error?.code || value.message),
      );
    return value.data;
  }
  async function wait(page, expression) {
    for (let i = 0; i < 240; i++) {
      if (await page.evaluate(expression)) return;
      await delay(350);
    }
    throw new Error("UI wait failed: " + expression);
  }
  async function pageFor(role) {
    const user = fixture.users[role];
    const pair = await request("/auth/login", "POST", null, {
      email: user.email,
      password: user.password,
      deviceName: "FITLY local admin UI audit",
    });
    const context = await browser.call("Target.createBrowserContext");
    contexts.push(context.browserContextId);
    await browser.call("Browser.grantPermissions", {
      origin,
      browserContextId: context.browserContextId,
      permissions: ["audioCapture", "videoCapture"],
    });
    const target = await browser.call("Target.createTarget", {
      url: "about:blank",
      browserContextId: context.browserContextId,
    });
    const tabs = await (await fetch("http://127.0.0.1:9229/json/list")).json();
    const page = new CDP(
      tabs.find((t) => t.id === target.targetId).webSocketDebuggerUrl,
    );
    clients.push(page);
    await page.call("Page.enable");
    await page.call("Page.addScriptToEvaluateOnNewDocument", {
      source: `if(location.origin===${JSON.stringify(origin)}&&!localStorage.getItem('fitly-admin-auth'))localStorage.setItem('fitly-admin-auth',JSON.stringify({state:{refreshToken:${JSON.stringify(pair.refreshToken)}},version:0}));`,
    });
    return { page, token: pair.accessToken };
  }
  async function navigate(page, route, expected) {
    await page.call("Page.navigate", { url: origin + route });
    await wait(
      page,
      `location.pathname === ${JSON.stringify(route)} && document.body?.innerText.includes(${JSON.stringify(expected)})`,
    );
    await delay(500);
  }
  async function snapshot(page, name) {
    const data = await page.evaluate(
      `({width:innerWidth,scroll:document.documentElement.scrollWidth,text:document.body.innerText.slice(0,1400)})`,
    );
    if (data.scroll > data.width + 1)
      throw new Error(
        name + ": horizontal overflow " + data.scroll + "/" + data.width,
      );
    proof.push({ name, width: data.width, overflow: false });
  }
  try {
    const owner = await pageFor("owner");
    const draft = await request("/shop/livestreams", "POST", owner.token, {
      title: "Admin UI audit — chuẩn bị thiết bị",
      productIds: [fixture.productId],
    });
    await navigate(owner.page, "/vendor/livestreams", "Phiên livestream");
    await owner.page.call("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await snapshot(owner.page, "vendor-list-390");
    await navigate(
      owner.page,
      "/vendor/livestreams/" + draft.id + "/edit",
      "Sửa phiên livestream",
    );
    await snapshot(owner.page, "vendor-editor-390");
    await navigate(
      owner.page,
      "/vendor/livestreams/" + draft.id + "/studio",
      draft.title,
    );
    await wait(
      owner.page,
      `Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Mở camera để xem thử'))`,
    );
    await owner.page.evaluate(
      `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Mở camera để xem thử')).click()`,
    );
    await wait(owner.page, `document.querySelector('video')?.videoWidth > 0`);
    const media = await owner.page.evaluate(
      `({width:document.querySelector('video').videoWidth,tracks:document.querySelector('video').srcObject?.getTracks().map(t=>({kind:t.kind,state:t.readyState}))})`,
    );
    proof.push({ name: "host-preview-real-browser-fake-device", ...media });
    await snapshot(owner.page, "vendor-studio-390");
    const shot = await owner.page.call("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await fs.writeFile(
      path.join(os.tmpdir(), "fitly-live-admin-390.png"),
      Buffer.from(shot.data, "base64"),
    );
    await navigate(
      owner.page,
      "/vendor/livestreams/" + draft.id + "/report",
      "Lượt vào xem",
    );
    await snapshot(owner.page, "vendor-report-390");
    const admin = await pageFor("admin");
    await admin.page.call("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await navigate(admin.page, "/livestream/sessions", "Phiên livestream");
    await snapshot(admin.page, "platform-list-390");
    await navigate(admin.page, "/livestream/sessions/" + draft.id, draft.title);
    await snapshot(admin.page, "platform-detail-390");
    await navigate(
      admin.page,
      "/livestream/reports",
      "Báo cáo nội dung livestream",
    );
    await snapshot(admin.page, "platform-reports-390");
    await request(
      "/shop/livestreams/" + draft.id + "/cancel",
      "POST",
      owner.token,
      { version: draft.version },
    );
    console.log(JSON.stringify({ passed: true, proof }));
  } finally {
    for (const context of contexts)
      await browser
        .call("Target.disposeBrowserContext", { browserContextId: context })
        .catch(() => undefined);
    for (const client of clients) client.close();
    browser.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
