/**
 * Runs user code inside a Web Worker so that:
 *  - an infinite loop can be killed (Stop button / timeout),
 *  - the page itself is never touched by user code.
 *
 * `workerMain` is stringified into a Blob, so it must be fully self contained.
 */

export interface TestCase {
  label: string;
  /** Function body. Receives the user's function as a parameter named after `fn`. */
  run: string;
  expect: unknown;
}
export interface TestSpec {
  fn: string;
  cases: TestCase[];
}
export interface TestResult {
  label: string;
  pass: boolean;
  got: string;
  expected: string;
}

export type WorkerMsg =
  | { type: "out"; kind: "log" | "info" | "warn" | "error"; text: string; indent: number }
  | { type: "table"; head: string[]; rows: string[][]; indent: number }
  | { type: "clear" }
  | { type: "result"; value: string }
  | { type: "error"; name: string; message: string; line?: number }
  | { type: "tests"; results: TestResult[] }
  | { type: "finished" };

/* eslint-disable @typescript-eslint/no-explicit-any */
function workerMain() {
  const ctx: any = self;
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const send = (m: any) => ctx.postMessage(m);
  // A runaway loop must not be able to flood (or freeze) the page with output.
  const MAX_MESSAGES = 3000;
  const MAX_CHARS = 400000;
  const MAX_LINE = 20000;
  let sentMessages = 0;
  let sentChars = 0;
  let capped = false;
  const sendOutput = (m: any) => {
    if (capped) return;
    sentMessages++;
    sentChars += m.text ? m.text.length : 200;
    if (sentMessages > MAX_MESSAGES || sentChars > MAX_CHARS) {
      capped = true;
      ctx.postMessage({ type: "out", kind: "warn", text: "Output limit reached. Further output is not shown.", indent: 0 });
      return;
    }
    ctx.postMessage(m);
  };
  let depth = 0;
  const counts: Record<string, number> = {};
  const timersMap: Record<string, number> = {};

  function inspect(v: any, lvl: number, seen: any[], top: boolean): string {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    const t = typeof v;
    if (t === "string") return top ? v : "'" + v.replace(/'/g, "\\'") + "'";
    if (t === "number" || t === "boolean") return String(v);
    if (t === "bigint") return v + "n";
    if (t === "symbol") return v.toString();
    if (t === "function") {
      const s = Function.prototype.toString.call(v);
      return /^class[\s{]/.test(s) ? "class " + (v.name || "(anonymous)") : "ƒ " + (v.name || "(anonymous)") + "()";
    }
    if (seen.indexOf(v) !== -1) return "[Circular]";
    if (v instanceof Error) return v.name + ": " + v.message;
    if (v instanceof Date) return isNaN(+v) ? "Invalid Date" : v.toISOString();
    if (v instanceof RegExp) return String(v);
    if (v instanceof Promise) return "Promise {<pending>}";
    const isArr = Array.isArray(v);
    const isMap = v instanceof Map;
    const isSet = v instanceof Set;
    const ctor = v.constructor && v.constructor.name;
    if (lvl > 3) return isArr ? "[Array]" : "[" + (ctor || "Object") + "]";
    seen = seen.concat([v]);
    let items: string[] = [];
    let open = "{";
    let close = "}";
    let prefix = "";
    if (isArr) {
      open = "[";
      close = "]";
      items = v.slice(0, 100).map((x: any) => inspect(x, lvl + 1, seen, false));
      if (v.length > 100) items.push("... " + (v.length - 100) + " more items");
    } else if (isMap) {
      prefix = "Map(" + v.size + ") ";
      items = Array.from(v).map(
        (kv: any) => inspect(kv[0], lvl + 1, seen, false) + " => " + inspect(kv[1], lvl + 1, seen, false)
      );
    } else if (isSet) {
      prefix = "Set(" + v.size + ") ";
      items = Array.from(v).map((x: any) => inspect(x, lvl + 1, seen, false));
    } else {
      if (ctor && ctor !== "Object") prefix = ctor + " ";
      items = Object.keys(v).map(
        (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : "'" + k + "'") + ": " + inspect(v[k], lvl + 1, seen, false)
      );
    }
    if (!items.length) return prefix + open + close;
    const one = prefix + open + " " + items.join(", ") + " " + close;
    if (one.length <= 72 && one.indexOf("\n") === -1) return one;
    const pad = "  ".repeat(lvl + 1);
    return prefix + open + "\n" + items.map((s) => pad + s).join(",\n") + "\n" + "  ".repeat(lvl) + close;
  }

  function format(args: any[]): string {
    let a = args.slice();
    if (typeof a[0] === "string" && /%[sdifoOjc]/.test(a[0])) {
      let i = 1;
      const s = a[0].replace(/%([sdifoOjc%])/g, (m: string, c: string) => {
        if (c === "%") return "%";
        if (i >= a.length) return m;
        const x = a[i++];
        if (c === "s") return typeof x === "string" ? x : inspect(x, 1, [], false);
        if (c === "d") return String(Number(x));
        if (c === "i") return String(parseInt(x));
        if (c === "f") return String(parseFloat(x));
        if (c === "c") return "";
        return inspect(x, 0, [], false);
      });
      a = [s].concat(a.slice(i));
    }
    return a.map((x) => inspect(x, 0, [], true)).join(" ");
  }

  const clip = (t: string) => (t.length > MAX_LINE ? t.slice(0, MAX_LINE) + " ... (truncated)" : t);

  const out =
    (kind: string) =>
    (...a: any[]) =>
      sendOutput({ type: "out", kind, text: clip(format(a)), indent: depth });

  const cons: any = {
    log: out("log"),
    info: out("info"),
    debug: out("log"),
    dir: out("log"),
    trace: out("log"),
    warn: out("warn"),
    error: out("error"),
    group: (...a: any[]) => {
      if (a.length) out("log")(...a);
      depth++;
    },
    groupEnd: () => {
      depth = Math.max(0, depth - 1);
    },
    time: (l: string = "default") => {
      timersMap[l] = performance.now();
    },
    timeEnd: (l: string = "default") => {
      if (timersMap[l] == null) return;
      out("log")(l + ": " + (performance.now() - timersMap[l]).toFixed(2) + "ms");
      delete timersMap[l];
    },
    timeLog: (l: string = "default") => {
      if (timersMap[l] == null) return;
      out("log")(l + ": " + (performance.now() - timersMap[l]).toFixed(2) + "ms");
    },
    count: (l: string = "default") => {
      counts[l] = (counts[l] || 0) + 1;
      out("log")(l + ": " + counts[l]);
    },
    countReset: (l: string = "default") => {
      counts[l] = 0;
    },
    assert: (c: any, ...a: any[]) => {
      if (!c) out("error")("Assertion failed" + (a.length ? ":" : ""), ...a);
    },
    clear: () => send({ type: "clear" }),
    table: (data: any) => {
      if (data === null || typeof data !== "object") return out("log")(data);
      const entries: any[] = Array.isArray(data) ? data.map((v: any, i: number) => [String(i), v]) : Object.entries(data);
      const cols: string[] = [];
      let hasValues = false;
      const rows = entries.map((e: any) => {
        const r: any = { "(index)": e[0] };
        const v = e[1];
        if (v !== null && typeof v === "object") {
          for (const c of Object.keys(v)) {
            if (cols.indexOf(c) === -1) cols.push(c);
            r[c] = inspect(v[c], 1, [], false);
          }
        } else {
          hasValues = true;
          r["Values"] = inspect(v, 1, [], false);
        }
        return r;
      });
      const head = ["(index)"].concat(cols, hasValues ? ["Values"] : []);
      sendOutput({
        type: "table",
        head,
        rows: rows.map((r: any) => head.map((h) => (r[h] === undefined ? "" : r[h]))),
        indent: depth,
      });
    },
  };

  function report(e: any) {
    let line: number | undefined;
    const stack = e && e.stack ? String(e.stack) : "";
    const m = /<anonymous>:(\d+):(\d+)/.exec(stack);
    if (m) line = Math.max(1, parseInt(m[1], 10) - 2);
    send({
      type: "error",
      name: (e && e.name) || "Error",
      message: e && e.message !== undefined ? e.message : String(e),
      line,
    });
  }

  // --- timers: tracked so we know when the program is really finished ---
  const t0 = ctx.setTimeout.bind(ctx);
  const c0 = ctx.clearTimeout.bind(ctx);
  const i0 = ctx.setInterval.bind(ctx);
  const ci0 = ctx.clearInterval.bind(ctx);
  const live = new Set<any>();
  let mainDone = false;
  let finished = false;
  let test: any = null;

  async function runTests(t: any) {
    const results: any[] = [];
    const fnRef = ctx.__pgFn;
    for (const c of t.cases) {
      try {
        if (typeof fnRef !== "function") throw new Error("function " + t.fn + " is not defined");
        const tf = new AsyncFunction(t.fn, c.run);
        const got = await Promise.race([
          tf(fnRef),
          new Promise((_, rej) => t0(() => rej(new Error("timed out")), 1500)),
        ]);
        results.push({ label: c.label, pass: deepEqual(got, c.expect), got: inspect(got, 0, [], false), expected: inspect(c.expect, 0, [], false) });
      } catch (e: any) {
        results.push({ label: c.label, pass: false, got: "Error: " + (e && e.message), expected: inspect(c.expect, 0, [], false) });
      }
    }
    send({ type: "tests", results });
  }

  function deepEqual(a: any, b: any): boolean {
    if (Object.is(a, b)) return true;
    if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }

  async function finish() {
    if (finished) return;
    finished = true;
    if (test) await runTests(test);
    send({ type: "finished" });
  }
  function check() {
    if (mainDone && live.size === 0) finish();
  }

  ctx.setTimeout = (fn: any, ms: any, ...a: any[]) => {
    const id = t0(() => {
      live.delete(id);
      try {
        if (typeof fn === "function") {
          const r = fn(...a);
          if (r && typeof r.catch === "function") r.catch(report);
        }
      } catch (e) {
        report(e);
      }
      check();
    }, ms);
    live.add(id);
    return id;
  };
  ctx.clearTimeout = (id: any) => {
    live.delete(id);
    c0(id);
    check();
  };
  ctx.setInterval = (fn: any, ms: any, ...a: any[]) => {
    const id = i0(() => {
      try {
        fn(...a);
      } catch (e) {
        report(e);
      }
    }, ms);
    live.add(id);
    return id;
  };
  ctx.clearInterval = (id: any) => {
    live.delete(id);
    ci0(id);
    check();
  };

  ctx.addEventListener("unhandledrejection", (e: any) => {
    report(e.reason);
    e.preventDefault();
  });
  ctx.addEventListener("error", (e: any) => {
    send({ type: "error", name: "Error", message: e.message });
    e.preventDefault();
  });

  ctx.onmessage = async (ev: any) => {
    const code: string = ev.data.code;
    test = ev.data.test || null;
    // intervals can run forever; stop waiting for them after a grace period
    t0(() => {
      live.clear();
      mainDone = true;
      finish();
    }, ev.data.grace || 3000);
    try {
      const fn = new AsyncFunction("console", code);
      const r = await fn(cons);
      if (r !== undefined) send({ type: "result", value: inspect(r, 0, [], true) });
    } catch (e) {
      report(e);
    }
    mainDone = true;
    check();
  };
}

export interface RunOptions {
  code: string;
  test?: TestSpec;
  timeoutMs?: number;
  onMsg: (m: WorkerMsg) => void;
  onEnd: (reason: "finished" | "timeout" | "stopped") => void;
}

export function runInWorker(opts: RunOptions) {
  const { code, test, timeoutMs = 8000, onMsg, onEnd } = opts;
  const url = URL.createObjectURL(new Blob(["(" + workerMain.toString() + ")()"], { type: "text/javascript" }));
  const w = new Worker(url);
  let ended = false;

  const end = (reason: "finished" | "timeout" | "stopped") => {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    w.terminate();
    URL.revokeObjectURL(url);
    onEnd(reason);
  };

  w.onmessage = (e: MessageEvent<WorkerMsg>) => {
    if (ended) return;
    if (e.data.type === "finished") end("finished");
    else onMsg(e.data);
  };
  w.onerror = (e) => {
    onMsg({ type: "error", name: "Error", message: e.message || "Worker error" });
    end("finished");
  };
  const timer = setTimeout(() => {
    onMsg({
      type: "error",
      name: "Timeout",
      message: `Stopped after ${timeoutMs / 1000}s. Is there an infinite loop?`,
    });
    end("timeout");
  }, timeoutMs);

  const suffix = test ? `\n;globalThis.__pgFn = typeof ${test.fn} === "function" ? ${test.fn} : undefined;` : "";
  w.postMessage({ code: code + suffix, test });

  return { stop: () => end("stopped") };
}
