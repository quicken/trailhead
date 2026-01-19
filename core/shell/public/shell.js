(function() {
  const e = document.createElement("link").relList;
  if (e && e.supports && e.supports("modulepreload")) return;
  for (const n of document.querySelectorAll('link[rel="modulepreload"]')) r(n);
  new MutationObserver((n) => {
    for (const o of n)
      if (o.type === "childList")
        for (const i of o.addedNodes) i.tagName === "LINK" && i.rel === "modulepreload" && r(i);
  }).observe(document, {
    childList: !0,
    subtree: !0
  });
  function t(n) {
    const o = {};
    return n.integrity && (o.integrity = n.integrity), n.referrerPolicy && (o.referrerPolicy = n.referrerPolicy), n.crossOrigin === "use-credentials" ? o.credentials = "include" : n.crossOrigin === "anonymous" ? o.credentials = "omit" : o.credentials = "same-origin", o;
  }
  function r(n) {
    if (n.ep) return;
    n.ep = !0;
    const o = t(n);
    fetch(n.href, o);
  }
})();
let f = null, p = null;
function j(s) {
  f || (f = document.createElement("div"), f.id = "shell-busy-overlay", f.innerHTML = `
      <div class="shell-busy-content">
        <div class="shell-spinner"></div>
        <div class="shell-busy-message"></div>
      </div>
    `, document.body.appendChild(f));
  const e = f.querySelector(".shell-busy-message");
  e && (e.textContent = s), f.style.display = "flex";
}
function N() {
  f && (f.style.display = "none");
}
function g(s, e = "info", t = 3e3) {
  p || (p = document.createElement("div"), p.id = "shell-toast-container", document.body.appendChild(p));
  const r = document.createElement("div");
  r.className = `shell-toast shell-toast-${e}`, r.textContent = s, p.appendChild(r), setTimeout(() => r.classList.add("shell-toast-show"), 10), setTimeout(() => {
    r.classList.remove("shell-toast-show"), setTimeout(() => r.remove(), 300);
  }, t);
}
function U(s, e) {
  g(s, "success", e);
}
function I(s, e) {
  g(s, "error", e || 5e3);
}
function W(s, e) {
  g(s, "warning", e || 4e3);
}
function Y(s, e) {
  g(s, "info", e);
}
function b(s, e, t) {
  return new Promise((r) => {
    const n = document.createElement("div");
    n.className = "shell-dialog-overlay", n.innerHTML = `
      <div class="shell-dialog">
        <div class="shell-dialog-title">${e}</div>
        <div class="shell-dialog-message">${s}</div>
        <div class="shell-dialog-buttons">
          ${t.map(
      (o) => `<button class="shell-btn shell-btn-${o.variant || "default"}" data-value="${o.value}">${o.label}</button>`
    ).join("")}
        </div>
      </div>
    `, n.querySelectorAll("button").forEach((o) => {
      o.onclick = () => {
        const i = o.getAttribute("data-value");
        n.remove(), r(i);
      };
    }), n.onclick = (o) => {
      o.target === n && (n.remove(), r(null));
    }, document.body.appendChild(n);
  });
}
function G(s, e = "Confirm") {
  return b(s, e, [
    { label: "Cancel", value: "cancel", variant: "secondary" },
    { label: "Confirm", value: "confirm", variant: "primary" }
  ]).then((t) => t === "confirm");
}
function X(s, e = "Information") {
  return b(s, e, [
    { label: "OK", value: "ok", variant: "primary" }
  ]).then(() => {
  });
}
function K(s, e = "Confirm") {
  return b(s, e, [
    { label: "No", value: "no", variant: "secondary" },
    { label: "Yes", value: "yes", variant: "primary" }
  ]).then((t) => t === "yes");
}
function Q(s, e = "Confirm") {
  return b(s, e, [
    { label: "Cancel", value: "cancel", variant: "secondary" },
    { label: "No", value: "no", variant: "secondary" },
    { label: "Yes", value: "yes", variant: "primary" }
  ]).then((t) => t || "cancel");
}
class S extends Error {
  response;
  request;
  options;
  constructor(e, t, r) {
    const n = e.status || e.status === 0 ? e.status : "", o = e.statusText ?? "", i = `${n} ${o}`.trim(), u = i ? `status code ${i}` : "an unknown error";
    super(`Request failed with ${u}: ${t.method} ${t.url}`), this.name = "HTTPError", this.response = e, this.request = t, this.options = r;
  }
}
class $ extends Error {
  name = "NonError";
  value;
  constructor(e) {
    let t = "Non-error value was thrown";
    try {
      typeof e == "string" ? t = e : e && typeof e == "object" && "message" in e && typeof e.message == "string" && (t = e.message);
    } catch {
    }
    super(t), this.value = e;
  }
}
class E extends Error {
  name = "ForceRetryError";
  customDelay;
  code;
  customRequest;
  constructor(e) {
    const t = e?.cause ? e.cause instanceof Error ? e.cause : new $(e.cause) : void 0;
    super(e?.code ? `Forced retry: ${e.code}` : "Forced retry", t ? { cause: t } : void 0), this.customDelay = e?.delay, this.code = e?.code, this.customRequest = e?.request;
  }
}
const A = (() => {
  let s = !1, e = !1;
  const t = typeof globalThis.ReadableStream == "function", r = typeof globalThis.Request == "function";
  if (t && r)
    try {
      e = new globalThis.Request("https://empty.invalid", {
        body: new globalThis.ReadableStream(),
        method: "POST",
        // @ts-expect-error - Types are outdated.
        get duplex() {
          return s = !0, "half";
        }
      }).headers.has("Content-Type");
    } catch (n) {
      if (n instanceof Error && n.message === "unsupported BodyInit type")
        return !1;
      throw n;
    }
  return s && !e;
})(), Z = typeof globalThis.AbortController == "function", H = typeof globalThis.AbortSignal == "function" && typeof globalThis.AbortSignal.any == "function", ee = typeof globalThis.ReadableStream == "function", te = typeof globalThis.FormData == "function", M = ["get", "post", "put", "patch", "head", "delete"], se = {
  json: "application/json",
  text: "text/*",
  formData: "multipart/form-data",
  arrayBuffer: "*/*",
  blob: "*/*",
  // Supported in modern Fetch implementations (for example, browsers and recent Node.js/undici).
  // We still feature-check at runtime before exposing the shortcut.
  bytes: "*/*"
}, P = 2147483647, re = new TextEncoder().encode("------WebKitFormBoundaryaxpyiPgbbPti10Rw").length, D = /* @__PURE__ */ Symbol("stop");
class F {
  options;
  constructor(e) {
    this.options = e;
  }
}
const ne = (s) => new F(s), oe = {
  json: !0,
  parseJson: !0,
  stringifyJson: !0,
  searchParams: !0,
  prefixUrl: !0,
  retry: !0,
  timeout: !0,
  hooks: !0,
  throwHttpErrors: !0,
  onDownloadProgress: !0,
  onUploadProgress: !0,
  fetch: !0,
  context: !0
}, ie = {
  next: !0
  // Next.js cache revalidation (revalidate, tags)
}, ae = {
  method: !0,
  headers: !0,
  body: !0,
  mode: !0,
  credentials: !0,
  cache: !0,
  redirect: !0,
  referrer: !0,
  referrerPolicy: !0,
  integrity: !0,
  keepalive: !0,
  signal: !0,
  window: !0,
  duplex: !0
}, ue = (s) => {
  if (!s)
    return 0;
  if (s instanceof FormData) {
    let e = 0;
    for (const [t, r] of s)
      e += re, e += new TextEncoder().encode(`Content-Disposition: form-data; name="${t}"`).length, e += typeof r == "string" ? new TextEncoder().encode(r).length : r.size;
    return e;
  }
  if (s instanceof Blob)
    return s.size;
  if (s instanceof ArrayBuffer)
    return s.byteLength;
  if (typeof s == "string")
    return new TextEncoder().encode(s).length;
  if (s instanceof URLSearchParams)
    return new TextEncoder().encode(s.toString()).length;
  if ("byteLength" in s)
    return s.byteLength;
  if (typeof s == "object" && s !== null)
    try {
      const e = JSON.stringify(s);
      return new TextEncoder().encode(e).length;
    } catch {
      return 0;
    }
  return 0;
}, B = (s, e, t) => {
  let r, n = 0;
  return s.pipeThrough(new TransformStream({
    transform(o, i) {
      if (i.enqueue(o), r) {
        n += r.byteLength;
        let u = e === 0 ? 0 : n / e;
        u >= 1 && (u = 1 - Number.EPSILON), t?.({ percent: u, totalBytes: Math.max(e, n), transferredBytes: n }, r);
      }
      r = o;
    },
    flush() {
      r && (n += r.byteLength, t?.({ percent: 1, totalBytes: Math.max(e, n), transferredBytes: n }, r));
    }
  }));
}, le = (s, e) => {
  if (!s.body)
    return s;
  if (s.status === 204)
    return new Response(null, {
      status: s.status,
      statusText: s.statusText,
      headers: s.headers
    });
  const t = Math.max(0, Number(s.headers.get("content-length")) || 0);
  return new Response(B(s.body, t, e), {
    status: s.status,
    statusText: s.statusText,
    headers: s.headers
  });
}, ce = (s, e, t) => {
  if (!s.body)
    return s;
  const r = ue(t ?? s.body);
  return new Request(s, {
    // @ts-expect-error - Types are outdated.
    duplex: "half",
    body: B(s.body, r, e)
  });
}, d = (s) => s !== null && typeof s == "object", v = (...s) => {
  for (const e of s)
    if ((!d(e) || Array.isArray(e)) && e !== void 0)
      throw new TypeError("The `options` argument must be an object");
  return C({}, ...s);
}, z = (s = {}, e = {}) => {
  const t = new globalThis.Headers(s), r = e instanceof globalThis.Headers, n = new globalThis.Headers(e);
  for (const [o, i] of n.entries())
    r && i === "undefined" || i === void 0 ? t.delete(o) : t.set(o, i);
  return t;
};
function R(s, e, t) {
  return Object.hasOwn(e, t) && e[t] === void 0 ? [] : C(s[t] ?? [], e[t] ?? []);
}
const J = (s = {}, e = {}) => ({
  beforeRequest: R(s, e, "beforeRequest"),
  beforeRetry: R(s, e, "beforeRetry"),
  afterResponse: R(s, e, "afterResponse"),
  beforeError: R(s, e, "beforeError")
}), he = (s, e) => {
  const t = new URLSearchParams();
  for (const r of [s, e])
    if (r !== void 0)
      if (r instanceof URLSearchParams)
        for (const [n, o] of r.entries())
          t.append(n, o);
      else if (Array.isArray(r))
        for (const n of r) {
          if (!Array.isArray(n) || n.length !== 2)
            throw new TypeError("Array search parameters must be provided in [[key, value], ...] format");
          t.append(String(n[0]), String(n[1]));
        }
      else if (d(r))
        for (const [n, o] of Object.entries(r))
          o !== void 0 && t.append(n, String(o));
      else {
        const n = new URLSearchParams(r);
        for (const [o, i] of n.entries())
          t.append(o, i);
      }
  return t;
}, C = (...s) => {
  let e = {}, t = {}, r = {}, n;
  const o = [];
  for (const i of s)
    if (Array.isArray(i))
      Array.isArray(e) || (e = []), e = [...e, ...i];
    else if (d(i)) {
      for (let [u, a] of Object.entries(i)) {
        if (u === "signal" && a instanceof globalThis.AbortSignal) {
          o.push(a);
          continue;
        }
        if (u === "context") {
          if (a != null && (!d(a) || Array.isArray(a)))
            throw new TypeError("The `context` option must be an object");
          e = {
            ...e,
            context: a == null ? {} : { ...e.context, ...a }
          };
          continue;
        }
        if (u === "searchParams") {
          a == null ? n = void 0 : n = n === void 0 ? a : he(n, a);
          continue;
        }
        d(a) && u in e && (a = C(e[u], a)), e = { ...e, [u]: a };
      }
      d(i.hooks) && (r = J(r, i.hooks), e.hooks = r), d(i.headers) && (t = z(t, i.headers), e.headers = t);
    }
  return n !== void 0 && (e.searchParams = n), o.length > 0 && (o.length === 1 ? e.signal = o[0] : H ? e.signal = AbortSignal.any(o) : e.signal = o.at(-1)), e.context === void 0 && (e.context = {}), e;
}, fe = (s) => M.includes(s) ? s.toUpperCase() : s, de = ["get", "put", "head", "delete", "options", "trace"], pe = [408, 413, 429, 500, 502, 503, 504], ye = [413, 429, 503], L = {
  limit: 2,
  methods: de,
  statusCodes: pe,
  afterStatusCodes: ye,
  maxRetryAfter: Number.POSITIVE_INFINITY,
  backoffLimit: Number.POSITIVE_INFINITY,
  delay: (s) => 0.3 * 2 ** (s - 1) * 1e3,
  jitter: void 0,
  retryOnTimeout: !1
}, me = (s = {}) => {
  if (typeof s == "number")
    return {
      ...L,
      limit: s
    };
  if (s.methods && !Array.isArray(s.methods))
    throw new Error("retry.methods must be an array");
  if (s.methods &&= s.methods.map((t) => t.toLowerCase()), s.statusCodes && !Array.isArray(s.statusCodes))
    throw new Error("retry.statusCodes must be an array");
  const e = Object.fromEntries(Object.entries(s).filter(([, t]) => t !== void 0));
  return {
    ...L,
    ...e
  };
};
class q extends Error {
  request;
  constructor(e) {
    super(`Request timed out: ${e.method} ${e.url}`), this.name = "TimeoutError", this.request = e;
  }
}
async function ge(s, e, t, r) {
  return new Promise((n, o) => {
    const i = setTimeout(() => {
      t && t.abort(), o(new q(s));
    }, r.timeout);
    r.fetch(s, e).then(n).catch(o).then(() => {
      clearTimeout(i);
    });
  });
}
async function be(s, { signal: e }) {
  return new Promise((t, r) => {
    e && (e.throwIfAborted(), e.addEventListener("abort", n, { once: !0 }));
    function n() {
      clearTimeout(o), r(e.reason);
    }
    const o = setTimeout(() => {
      e?.removeEventListener("abort", n), t();
    }, s);
  });
}
const we = (s, e) => {
  const t = {};
  for (const r in e)
    Object.hasOwn(e, r) && !(r in ae) && !(r in oe) && (!(r in s) || r in ie) && (t[r] = e[r]);
  return t;
}, ve = (s) => s === void 0 ? !1 : Array.isArray(s) ? s.length > 0 : s instanceof URLSearchParams ? s.size > 0 : typeof s == "object" ? Object.keys(s).length > 0 : typeof s == "string" ? s.trim().length > 0 : !!s;
function Re(s) {
  return s instanceof S || s?.name === S.name;
}
function Te(s) {
  return s instanceof q || s?.name === q.name;
}
class m {
  static create(e, t) {
    const r = new m(e, t), n = async () => {
      if (typeof r.#e.timeout == "number" && r.#e.timeout > P)
        throw new RangeError(`The \`timeout\` option cannot be greater than ${P}`);
      await Promise.resolve();
      let i = await r.#g();
      for (const u of r.#e.hooks.afterResponse) {
        const a = r.#f(i.clone());
        let c;
        try {
          c = await u(r.request, r.#u(), a, { retryCount: r.#s });
        } catch (h) {
          throw r.#o(a), r.#o(i), h;
        }
        if (c instanceof F)
          throw r.#o(a), r.#o(i), new E(c.options);
        const l = c instanceof globalThis.Response ? c : i;
        a !== l && r.#o(a), i !== l && r.#o(i), i = l;
      }
      if (r.#f(i), !i.ok && (typeof r.#e.throwHttpErrors == "function" ? r.#e.throwHttpErrors(i.status) : r.#e.throwHttpErrors)) {
        let u = new S(i, r.request, r.#u());
        for (const a of r.#e.hooks.beforeError)
          u = await a(u, { retryCount: r.#s });
        throw u;
      }
      if (r.#e.onDownloadProgress) {
        if (typeof r.#e.onDownloadProgress != "function")
          throw new TypeError("The `onDownloadProgress` option must be a function");
        if (!ee)
          throw new Error("Streams are not supported in your environment. `ReadableStream` is missing.");
        const u = i.clone();
        return r.#o(i), le(u, r.#e.onDownloadProgress);
      }
      return i;
    }, o = r.#d(n).finally(() => {
      const i = r.#i;
      r.#c(i?.body ?? void 0), r.#c(r.request.body ?? void 0);
    });
    for (const [i, u] of Object.entries(se))
      i === "bytes" && typeof globalThis.Response?.prototype?.bytes != "function" || (o[i] = async () => {
        r.request.headers.set("accept", r.request.headers.get("accept") || u);
        const a = await o;
        if (i === "json") {
          if (a.status === 204)
            return "";
          const c = await a.text();
          return c === "" ? "" : t.parseJson ? t.parseJson(c) : JSON.parse(c);
        }
        return a[i]();
      });
    return o;
  }
  // eslint-disable-next-line unicorn/prevent-abbreviations
  static #y(e) {
    return e && typeof e == "object" && !Array.isArray(e) && !(e instanceof URLSearchParams) ? Object.fromEntries(Object.entries(e).filter(([, t]) => t !== void 0)) : e;
  }
  request;
  #r;
  #s = 0;
  // eslint-disable-next-line @typescript-eslint/prefer-readonly -- False positive: #input is reassigned on line 202
  #t;
  #e;
  #i;
  #n;
  #a;
  // eslint-disable-next-line complexity
  constructor(e, t = {}) {
    if (this.#t = e, this.#e = {
      ...t,
      headers: z(this.#t.headers, t.headers),
      hooks: J({
        beforeRequest: [],
        beforeRetry: [],
        beforeError: [],
        afterResponse: []
      }, t.hooks),
      method: fe(t.method ?? this.#t.method ?? "GET"),
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      prefixUrl: String(t.prefixUrl || ""),
      retry: me(t.retry),
      throwHttpErrors: t.throwHttpErrors ?? !0,
      timeout: t.timeout ?? 1e4,
      fetch: t.fetch ?? globalThis.fetch.bind(globalThis),
      context: t.context ?? {}
    }, typeof this.#t != "string" && !(this.#t instanceof URL || this.#t instanceof globalThis.Request))
      throw new TypeError("`input` must be a string, URL, or Request");
    if (this.#e.prefixUrl && typeof this.#t == "string") {
      if (this.#t.startsWith("/"))
        throw new Error("`input` must not begin with a slash when using `prefixUrl`");
      this.#e.prefixUrl.endsWith("/") || (this.#e.prefixUrl += "/"), this.#t = this.#e.prefixUrl + this.#t;
    }
    Z && H && (this.#n = this.#e.signal ?? this.#t.signal, this.#r = new globalThis.AbortController(), this.#e.signal = this.#n ? AbortSignal.any([this.#n, this.#r.signal]) : this.#r.signal), A && (this.#e.duplex = "half"), this.#e.json !== void 0 && (this.#e.body = this.#e.stringifyJson?.(this.#e.json) ?? JSON.stringify(this.#e.json), this.#e.headers.set("content-type", this.#e.headers.get("content-type") ?? "application/json"));
    const r = t.headers && new globalThis.Headers(t.headers).has("content-type");
    if (this.#t instanceof globalThis.Request && (te && this.#e.body instanceof globalThis.FormData || this.#e.body instanceof URLSearchParams) && !r && this.#e.headers.delete("content-type"), this.request = new globalThis.Request(this.#t, this.#e), ve(this.#e.searchParams)) {
      const o = "?" + (typeof this.#e.searchParams == "string" ? this.#e.searchParams.replace(/^\?/, "") : new URLSearchParams(m.#y(this.#e.searchParams)).toString()), i = this.request.url.replace(/(?:\?.*?)?(?=#|$)/, o);
      this.request = new globalThis.Request(i, this.#e);
    }
    if (this.#e.onUploadProgress) {
      if (typeof this.#e.onUploadProgress != "function")
        throw new TypeError("The `onUploadProgress` option must be a function");
      if (!A)
        throw new Error("Request streams are not supported in your environment. The `duplex` option for `Request` is not available.");
      this.request = this.#p(this.request, this.#e.body ?? void 0);
    }
  }
  #l() {
    const e = this.#e.retry.delay(this.#s);
    let t = e;
    this.#e.retry.jitter === !0 ? t = Math.random() * e : typeof this.#e.retry.jitter == "function" && (t = this.#e.retry.jitter(e), (!Number.isFinite(t) || t < 0) && (t = e));
    const r = this.#e.retry.backoffLimit ?? Number.POSITIVE_INFINITY;
    return Math.min(r, t);
  }
  async #m(e) {
    if (this.#s++, this.#s > this.#e.retry.limit)
      throw e;
    const t = e instanceof Error ? e : new $(e);
    if (t instanceof E)
      return t.customDelay ?? this.#l();
    if (!this.#e.retry.methods.includes(this.request.method.toLowerCase()))
      throw e;
    if (this.#e.retry.shouldRetry !== void 0) {
      const r = await this.#e.retry.shouldRetry({ error: t, retryCount: this.#s });
      if (r === !1)
        throw e;
      if (r === !0)
        return this.#l();
    }
    if (Te(e) && !this.#e.retry.retryOnTimeout)
      throw e;
    if (Re(e)) {
      if (!this.#e.retry.statusCodes.includes(e.response.status))
        throw e;
      const r = e.response.headers.get("Retry-After") ?? e.response.headers.get("RateLimit-Reset") ?? e.response.headers.get("X-RateLimit-Retry-After") ?? e.response.headers.get("X-RateLimit-Reset") ?? e.response.headers.get("X-Rate-Limit-Reset");
      if (r && this.#e.retry.afterStatusCodes.includes(e.response.status)) {
        let n = Number(r) * 1e3;
        Number.isNaN(n) ? n = Date.parse(r) - Date.now() : n >= Date.parse("2024-01-01") && (n -= Date.now());
        const o = this.#e.retry.maxRetryAfter ?? n;
        return n < o ? n : o;
      }
      if (e.response.status === 413)
        throw e;
    }
    return this.#l();
  }
  #f(e) {
    return this.#e.parseJson && (e.json = async () => this.#e.parseJson(await e.text())), e;
  }
  #c(e) {
    e && e.cancel().catch(() => {
    });
  }
  #o(e) {
    this.#c(e.body ?? void 0);
  }
  async #d(e) {
    try {
      return await e();
    } catch (t) {
      const r = Math.min(await this.#m(t), P);
      if (this.#s < 1)
        throw t;
      if (await be(r, this.#n ? { signal: this.#n } : {}), t instanceof E && t.customRequest) {
        const n = this.#e.signal ? new globalThis.Request(t.customRequest, { signal: this.#e.signal }) : new globalThis.Request(t.customRequest);
        this.#h(n);
      }
      for (const n of this.#e.hooks.beforeRetry) {
        const o = await n({
          request: this.request,
          options: this.#u(),
          error: t,
          retryCount: this.#s
        });
        if (o instanceof globalThis.Request) {
          this.#h(o);
          break;
        }
        if (o instanceof globalThis.Response)
          return o;
        if (o === D)
          return;
      }
      return this.#d(e);
    }
  }
  async #g() {
    this.#r?.signal.aborted && (this.#r = new globalThis.AbortController(), this.#e.signal = this.#n ? AbortSignal.any([this.#n, this.#r.signal]) : this.#r.signal, this.request = new globalThis.Request(this.request, { signal: this.#e.signal }));
    for (const t of this.#e.hooks.beforeRequest) {
      const r = await t(this.request, this.#u(), { retryCount: this.#s });
      if (r instanceof Response)
        return r;
      if (r instanceof globalThis.Request) {
        this.#h(r);
        break;
      }
    }
    const e = we(this.request, this.#e);
    return this.#i = this.request, this.request = this.#i.clone(), this.#e.timeout === !1 ? this.#e.fetch(this.#i, e) : ge(this.#i, e, this.#r, this.#e);
  }
  #u() {
    if (!this.#a) {
      const { hooks: e, ...t } = this.#e;
      this.#a = Object.freeze(t);
    }
    return this.#a;
  }
  #h(e) {
    this.#a = void 0, this.request = this.#p(e);
  }
  #p(e, t) {
    return !this.#e.onUploadProgress || !e.body ? e : ce(e, this.#e.onUploadProgress, t ?? this.#e.body ?? void 0);
  }
}
const x = (s) => {
  const e = (t, r) => m.create(t, v(s, r));
  for (const t of M)
    e[t] = (r, n) => m.create(r, v(s, n, { method: t }));
  return e.create = (t) => x(v(t)), e.extend = (t) => (typeof t == "function" && (t = t(s ?? {})), x(v(s, t))), e.stop = D, e.retry = ne, e;
}, Ee = x();
let T = 0;
const y = /* @__PURE__ */ new Map();
function Pe(s, e, t) {
  if (!t) {
    if (s) {
      const r = y.get(s) || 0;
      y.set(s, r + 1);
    }
    T++, T === 1 && j(e || "Loading...");
  }
}
function O(s, e) {
  if (!e) {
    if (s) {
      const t = y.get(s) || 0;
      t > 1 ? y.set(s, t - 1) : y.delete(s);
    }
    T--, T === 0 && N();
  }
}
function Se(s) {
  U(s);
}
function qe(s) {
  I(s);
}
let _;
function xe(s = "") {
  _ = Ee.create({
    prefixUrl: s,
    timeout: 3e4,
    retry: 0
  });
}
async function w(s, e, t, r = {}) {
  const {
    requestKey: n,
    busyMessage: o,
    successMessage: i,
    showSuccess: u = !1,
    noFeedback: a = !1,
    headers: c = {}
  } = r;
  try {
    Pe(n, o, a);
    const l = {
      method: s,
      headers: c
    };
    t && (s === "POST" || s === "PUT" || s === "PATCH") && (l.json = t);
    const V = await (await _(e, l)).json();
    return O(n, a), !a && u && i && Se(i), {
      success: !0,
      data: V,
      requestKey: n
    };
  } catch (l) {
    O(n, a);
    const h = {
      name: l.name || "HttpError",
      message: l.message || "Request failed",
      status: l.response?.status
    };
    if (l.response)
      try {
        h.data = await l.response.json(), h.message = h.data.message || h.message;
      } catch {
      }
    return a || qe(h.message), {
      success: !1,
      error: h,
      requestKey: n
    };
  }
}
function Ce(s, e) {
  return w("GET", s, void 0, e);
}
function Ae(s, e, t) {
  return w("POST", s, e, t);
}
function Le(s, e, t) {
  return w("PUT", s, e, t);
}
function Oe(s, e, t) {
  return w("PATCH", s, e, t);
}
function ke(s, e) {
  return w("DELETE", s, void 0, e);
}
class k {
  currentPlugin = null;
  navigation = [];
  routeChangeCallbacks = [];
  constructor() {
    this.init();
  }
  /**
   * Initialize shell
   */
  async init() {
    const e = window.APP_CONFIG?.apiUrl || "";
    xe(e), window.shell = this.createAPI(), await this.loadNavigation(), this.setupRouting(), this.renderNavigation(), this.handleRoute();
  }
  /**
   * Create shell API
   */
  createAPI() {
    return {
      feedback: {
        busy: j,
        clear: N,
        success: U,
        error: I,
        warning: W,
        info: Y,
        alert: g,
        confirm: G,
        ok: X,
        yesNo: K,
        yesNoCancel: Q,
        custom: b
      },
      http: {
        get: Ce,
        post: Ae,
        put: Le,
        patch: Oe,
        delete: ke
      },
      navigation: {
        navigate: (e) => this.navigate(e),
        getCurrentPath: () => window.location.pathname,
        onRouteChange: (e) => (this.routeChangeCallbacks.push(e), () => {
          const t = this.routeChangeCallbacks.indexOf(e);
          t > -1 && this.routeChangeCallbacks.splice(t, 1);
        })
      }
    };
  }
  /**
   * Load navigation configuration
   */
  async loadNavigation() {
    try {
      const t = await fetch("/navigation.json");
      this.navigation = await t.json();
    } catch (e) {
      console.error("Failed to load navigation:", e), this.navigation = [];
    }
  }
  /**
   * Render navigation menu
   */
  renderNavigation() {
    const e = document.getElementById("shell-navigation");
    e && (e.innerHTML = this.navigation.map(
      (t) => `
      <a href="${t.path}" 
         class="shell-nav-item" 
         data-path="${t.path}"
         data-app="${t.app}">
        <i class="shell-icon shell-icon-${t.icon}"></i>
        <span class="shell-nav-label">${t.label}</span>
      </a>
    `
    ).join(""), e.querySelectorAll("a").forEach((t) => {
      t.addEventListener("click", (r) => {
        r.preventDefault();
        const n = t.getAttribute("data-path");
        n && this.navigate(n);
      });
    }));
  }
  /**
   * Setup routing
   */
  setupRouting() {
    window.addEventListener("popstate", () => {
      this.handleRoute();
    });
  }
  /**
   * Navigate to path
   */
  navigate(e) {
    history.pushState({}, "", e), this.handleRoute(), this.notifyRouteChange(e);
  }
  /**
   * Handle route change
   */
  handleRoute() {
    const e = window.location.pathname, t = this.navigation.find((r) => e.startsWith(r.path));
    t && (this.loadPlugin(t.app), this.updateActiveNav(t.path));
  }
  /**
   * Update active navigation item
   */
  updateActiveNav(e) {
    const t = document.getElementById("shell-navigation");
    t && t.querySelectorAll("a").forEach((r) => {
      r.getAttribute("data-path") === e ? r.classList.add("shell-nav-item-active") : r.classList.remove("shell-nav-item-active");
    });
  }
  /**
   * Load plugin application
   */
  async loadPlugin(e) {
    this.currentPlugin && (this.currentPlugin.unmount(), this.currentPlugin = null);
    const t = document.getElementById("shell-content");
    if (t) {
      t.innerHTML = '<div class="shell-loading">Loading...</div>';
      try {
        const r = this.getPluginUrl(e), n = document.createElement("script");
        n.src = r, n.type = "module", n.onload = () => {
          window.AppMount && (this.currentPlugin = window.AppMount(t), t.querySelector(".shell-loading")?.remove());
        }, n.onerror = () => {
          t.innerHTML = `<div class="shell-error">Failed to load application: ${e}</div>`;
        }, document.body.appendChild(n);
      } catch (r) {
        console.error("Failed to load plugin:", r), t.innerHTML = '<div class="shell-error">Failed to load application</div>';
      }
    }
  }
  /**
   * Get plugin URL based on environment
   */
  getPluginUrl(e) {
    const t = `/apps/${e}/app.js`;
    return console.log(`[Shell] Loading plugin "${e}" from:`, t), t;
  }
  /**
   * Notify route change callbacks
   */
  notifyRouteChange(e) {
    this.routeChangeCallbacks.forEach((t) => t(e));
  }
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => new k()) : new k();
