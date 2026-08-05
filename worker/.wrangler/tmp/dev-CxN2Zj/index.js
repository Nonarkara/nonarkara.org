var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// src/index.js
var ACTIVE = [
  "nonarkara.org",
  "ninja.nonarkara.org",
  "axiom.nonarkara.org",
  "slic.nonarkara.org",
  "sciti.nonarkara.org",
  "tkc.nonarkara.org",
  "tkcx.nonarkara.org",
  "monitor.nonarkara.org",
  "bangkok-ioc.pages.dev",
  "conflict.nonarkara.org",
  "mem.nonarkara.org",
  "geo.nonarkara.org",
  "cdp.nonarkara.org",
  "phuket.nonarkara.org",
  "phuket-dashboard.nonarkara.org/war-room",
  "mean.nonarkara.org",
  "bus.nonarkara.org",
  "kuching.nonarkara.org",
  "solomon.nonarkara.org",
  "slowdown.nonarkara.org",
  "ascn.nonarkara.org",
  "asean.nonarkara.org",
  "scl.nonarkara.org",
  "dao.nonarkara.org",
  "solitude.nonarkara.org"
];
var PARKED = [
  "oil.nonarkara.org",
  "bot.nonarkara.org",
  "brain.nonarkara.org",
  "tkc-digital-twin.fly.dev"
];
var DOMAINS = [...ACTIVE, ...PARKED];
var FLEET_KEY = "fleet:v1";
var HISTORY_LEN = 288;
var INCIDENT_LEN = 50;
var ROLLUP_DAYS = 90;
var FAIL_STRIKES = 2;
var isUp = /* @__PURE__ */ __name((c) => c >= 200 && c < 400, "isUp");
async function probe(d) {
  const start = Date.now();
  try {
    const r = await fetch(`https://${d}`, {
      method: "GET",
      // Don't follow — Workers' fetch can't always traverse a redirect
      // that lands on another Cloudflare Worker route (loop guard). The
      // page treats 200/301/302 all as healthy, so storing the original
      // 302 is correct + cheaper.
      redirect: "manual",
      cf: { cacheTtl: 0, cacheEverything: false },
      signal: AbortSignal.timeout(1e4)
    });
    return { code: r.status, ms: Date.now() - start };
  } catch (_) {
    return { code: 0, ms: Date.now() - start };
  }
}
__name(probe, "probe");
async function snapshot() {
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  const sites = {};
  const results = await Promise.all(
    DOMAINS.map(async (d) => [d, await probe(d)])
  );
  for (const [d, v] of results) sites[d] = v;
  return { ts, sites };
}
__name(snapshot, "snapshot");
var emptyFleet = /* @__PURE__ */ __name(() => ({
  ts: null,
  sites: {},
  history: {},
  state: {},
  incidents: [],
  rollups: {}
}), "emptyFleet");
async function loadFleet(env2) {
  const f = await env2.STATUS.get(FLEET_KEY, "json");
  return f ? { ...emptyFleet(), ...f } : emptyFleet();
}
__name(loadFleet, "loadFleet");
function foldRound(fleet, sites, now = /* @__PURE__ */ new Date()) {
  const minute = Math.floor(now.getTime() / 6e4);
  const day = now.toISOString().slice(0, 10);
  const alerts = [];
  fleet.ts = now.toISOString();
  fleet.sites = sites;
  fleet.rollups[day] = fleet.rollups[day] || {};
  for (const [d, v] of Object.entries(sites)) {
    const up = isUp(v.code);
    const hist = fleet.history[d] || (fleet.history[d] = []);
    hist.push([minute, v.code, v.ms]);
    if (hist.length > HISTORY_LEN) hist.splice(0, hist.length - HISTORY_LEN);
    const r = fleet.rollups[day][d] || (fleet.rollups[day][d] = [0, 0, 0]);
    r[0]++;
    if (up) r[1]++;
    r[2] += v.ms;
    if (PARKED.includes(d)) continue;
    const s = fleet.state[d] || (fleet.state[d] = { up: true, failStreak: 0, since: fleet.ts, alerted: false });
    if (up) {
      if (s.alerted) {
        alerts.push({ kind: "up", domain: d, code: v.code, since: s.since });
        const inc = fleet.incidents.find((i) => i.domain === d && !i.upAt);
        if (inc) inc.upAt = fleet.ts;
      }
      if (!s.up) s.since = fleet.ts;
      s.up = true;
      s.failStreak = 0;
      s.alerted = false;
    } else {
      if (s.up) s.since = fleet.ts;
      s.up = false;
      s.failStreak++;
      if (s.failStreak === FAIL_STRIKES && !s.alerted) {
        s.alerted = true;
        alerts.push({ kind: "down", domain: d, code: v.code, since: s.since });
        fleet.incidents.unshift({ domain: d, downAt: s.since, upAt: null, lastCode: v.code });
        if (fleet.incidents.length > INCIDENT_LEN) fleet.incidents.length = INCIDENT_LEN;
      }
    }
  }
  const cutoff = new Date(now.getTime() - ROLLUP_DAYS * 864e5).toISOString().slice(0, 10);
  for (const k of Object.keys(fleet.rollups)) if (k < cutoff) delete fleet.rollups[k];
  return alerts;
}
__name(foldRound, "foldRound");
async function sendAlerts(env2, alerts) {
  if (!alerts.length || !env2.TG_BOT_TOKEN || !env2.TG_CHAT_ID) return;
  const mins = /* @__PURE__ */ __name((since) => Math.max(1, Math.round((Date.now() - Date.parse(since)) / 6e4)), "mins");
  const lines = alerts.map((a) => a.kind === "down" ? `\u{1F534} DOWN \xB7 ${a.domain} \xB7 code ${a.code} \xB7 ${mins(a.since)}m` : `\u{1F7E2} RECOVERED \xB7 ${a.domain} \xB7 was down ${mins(a.since)}m`);
  await tg(env2, lines.join("\n"));
}
__name(sendAlerts, "sendAlerts");
async function tg(env2, text) {
  return fetch(`https://api.telegram.org/bot${env2.TG_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env2.TG_CHAT_ID, text, disable_notification: false })
  });
}
__name(tg, "tg");
function uptimeFor(fleet, domain2) {
  const hist = fleet.history[domain2] || [];
  const pct = /* @__PURE__ */ __name((ok, n) => n ? Math.round(ok / n * 1e3) / 10 : null, "pct");
  const day24 = pct(hist.filter((h) => isUp(h[1])).length, hist.length);
  const rollupPct = /* @__PURE__ */ __name((days) => {
    const cutoff = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    let checks = 0, ok = 0;
    for (const [d, byDomain] of Object.entries(fleet.rollups)) {
      if (d < cutoff) continue;
      const r = byDomain[domain2];
      if (r) {
        checks += r[0];
        ok += r[1];
      }
    }
    return pct(ok, checks);
  }, "rollupPct");
  return { d1: day24, d7: rollupPct(7), d30: rollupPct(30) };
}
__name(uptimeFor, "uptimeFor");
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=30"
};
var src_default = {
  // ── Scheduled handler (cron */5) ────────────────────────────
  async scheduled(_event, env2, ctx) {
    const { sites } = await snapshot();
    const fleet = await loadFleet(env2);
    const alerts = foldRound(fleet, sites);
    ctx.waitUntil(Promise.all([
      env2.STATUS.put(FLEET_KEY, JSON.stringify(fleet)),
      sendAlerts(env2, alerts)
    ]));
  },
  // ── HTTP handler ───────────────────────────────────────────
  async fetch(req, env2) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (url.pathname === "/now") {
      const now = /* @__PURE__ */ new Date();
      const bkk = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Bangkok",
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(now);
      return new Response(
        JSON.stringify({ utc: now.toISOString(), bangkok: bkk }, null, 2),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (url.pathname === "/daily-brief") {
      const BRIEF_KEY = "brief:v1";
      const BRIEF_TTL = 300;
      const cached = await env2.STATUS.get(BRIEF_KEY, "json");
      if (cached && Date.now() - cached._ts < BRIEF_TTL * 1e3) {
        return new Response(JSON.stringify(cached), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": `max-age=${BRIEF_TTL}`
          }
        });
      }
      const SYMBOLS = [
        ["USDTHB=X", "usdthb"],
        ["SGDTHB=X", "sgdthb"],
        ["BTC-USD", "btc"],
        ["%5ESET.BK", "set"],
        ["%5EDJI", "dji"],
        ["%5EIXIC", "nasdaq"],
        ["NVDA", "nvda"],
        ["TSLA", "tsla"],
        ["GOOGL", "googl"],
        ["GC%3DF", "gold"],
        ["BZ%3DF", "brent"],
        ["PTT.BK", "ptt"]
      ];
      const fetchQuote = /* @__PURE__ */ __name(async ([sym, key]) => {
        try {
          const r = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`,
            { headers: { "User-Agent": "Mozilla/5.0" } }
          );
          const d = await r.json();
          const meta = d?.chart?.result?.[0]?.meta || {};
          const price = meta.regularMarketPrice ?? null;
          const prev = meta.chartPreviousClose ?? null;
          const change = price && prev ? (price - prev) / prev * 100 : null;
          return [key, { price, prev, change }];
        } catch (_) {
          return [key, null];
        }
      }, "fetchQuote");
      const fetchPm25 = /* @__PURE__ */ __name(async (lat, lng) => {
        try {
          const r = await fetch(
            `https://pm25.gistda.or.th/rest/getPm25byLocation?lat=${lat}&lng=${lng}`,
            { signal: AbortSignal.timeout(5e3) }
          );
          const d = await r.json();
          return d?.data?.pm25 ?? null;
        } catch (_) {
          return null;
        }
      }, "fetchPm25");
      const [results, bkkPm25, phuketPm25] = await Promise.all([
        Promise.all(SYMBOLS.map(fetchQuote)),
        fetchPm25(13.7563, 100.5018),
        // Bangkok
        fetchPm25(7.8804, 98.3923)
        // Phuket town
      ]);
      const brief = Object.fromEntries(results);
      brief.pm25_bkk = bkkPm25;
      brief.pm25_phuket = phuketPm25;
      brief._ts = Date.now();
      await env2.STATUS.put(BRIEF_KEY, JSON.stringify(brief), { expirationTtl: BRIEF_TTL });
      return new Response(JSON.stringify(brief), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": `max-age=${BRIEF_TTL}`
        }
      });
    }
    if (url.pathname.startsWith("/quote/")) {
      const sym = decodeURIComponent(url.pathname.slice(7));
      if (!/^[A-Z0-9.^=-]{1,12}$/i.test(sym)) {
        return new Response('{"error":"bad symbol"}', {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      try {
        const r = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
        const d = await r.json();
        const result = d?.chart?.result?.[0];
        const meta = result?.meta || {};
        const price = meta.regularMarketPrice ?? null;
        const prev = meta.chartPreviousClose ?? null;
        const change = price && prev ? (price - prev) / prev * 100 : null;
        return new Response(
          JSON.stringify({ symbol: sym, price, prev, change, ts: Date.now() }, null, 2),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    if (url.pathname === "/capture" && req.method === "POST") {
      try {
        const body = await req.json();
        if (!body?.text?.trim()) {
          return new Response(JSON.stringify({ error: "text required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        const id = crypto.randomUUID();
        const ts = (/* @__PURE__ */ new Date()).toISOString();
        const record = {
          id,
          created_at: ts,
          text: body.text.trim(),
          source: body.source || "note",
          session_id: body.session_id || null,
          tags: body.tags || [],
          metadata: body.metadata || {}
        };
        const tasks = [];
        if (env2.SB_URL && env2.SB_SERVICE_KEY) {
          tasks.push(
            fetch(`${env2.SB_URL}/rest/v1/captures`, {
              method: "POST",
              headers: {
                "apikey": env2.SB_SERVICE_KEY,
                "Authorization": `Bearer ${env2.SB_SERVICE_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
              },
              body: JSON.stringify(record)
            }).catch(() => {
            })
          );
        }
        if (env2.BRAIN_SHEET_URL) {
          tasks.push(
            fetch(env2.BRAIN_SHEET_URL, {
              method: "POST",
              headers: { "Content-Type": "text/plain" },
              redirect: "follow",
              body: JSON.stringify({ action: "capture", ...record })
            }).catch(() => {
            })
          );
        }
        if (env2.OPENAI_KEY && env2.SB_URL && env2.SB_SERVICE_KEY) {
          tasks.push((async () => {
            try {
              const embRes = await fetch("https://api.openai.com/v1/embeddings", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${env2.OPENAI_KEY}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ model: "text-embedding-3-small", input: record.text })
              });
              const embData = await embRes.json();
              const vector = embData?.data?.[0]?.embedding;
              if (vector) {
                await fetch(`${env2.SB_URL}/rest/v1/captures?id=eq.${id}`, {
                  method: "PATCH",
                  headers: {
                    "apikey": env2.SB_SERVICE_KEY,
                    "Authorization": `Bearer ${env2.SB_SERVICE_KEY}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({ embedding: vector })
                });
              }
            } catch (_) {
            }
          })());
        }
        await Promise.allSettled(tasks);
        return new Response(JSON.stringify({ ok: true, id, ts }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    if (url.pathname === "/council" || url.pathname === "/council.json") {
      try {
        const [countResp, commitResp] = await Promise.all([
          fetch("https://raw.githubusercontent.com/Nonarkara/council-watch/main/.state/fail-count", { cf: { cacheTtl: 30 } }),
          fetch("https://api.github.com/repos/Nonarkara/council-watch/commits?path=.state/fail-count&per_page=1", {
            headers: { "User-Agent": "nonarkara-status-worker", "Accept": "application/vnd.github+json" },
            cf: { cacheTtl: 30 }
          })
        ]);
        const countText = (await countResp.text()).trim();
        const count3 = /^\d+$/.test(countText) ? parseInt(countText, 10) : null;
        const commits = await commitResp.json();
        const ts = commits?.[0]?.commit?.committer?.date || null;
        const status = count3 === null ? "unknown" : count3 === 0 ? "healthy" : count3 < 3 ? "degraded" : "down";
        return new Response(JSON.stringify({ count: count3, status, ts }, null, 2), {
          headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "max-age=60" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    const json = /* @__PURE__ */ __name((obj, extra = {}) => new Response(JSON.stringify(obj, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json", ...extra }
    }), "json");
    if (url.pathname === "/history") {
      const f = await loadFleet(env2);
      const d = url.searchParams.get("domain");
      return json({ ts: f.ts, history: d ? { [d]: f.history[d] || [] } : f.history });
    }
    if (url.pathname === "/uptime") {
      const f = await loadFleet(env2);
      const uptime2 = {};
      for (const d of DOMAINS) uptime2[d] = uptimeFor(f, d);
      return json({ ts: f.ts, parked: PARKED, uptime: uptime2 });
    }
    if (url.pathname === "/incidents") {
      const f = await loadFleet(env2);
      return json({ ts: f.ts, incidents: f.incidents });
    }
    if (url.pathname === "/alert-test") {
      if (!env2.ALERT_TEST_SECRET || url.searchParams.get("key") !== env2.ALERT_TEST_SECRET) {
        return json({ error: "forbidden" }, { status: 403 });
      }
      const r = await tg(env2, "\u{1F7E1} TEST \xB7 nonarkara-status alerting is wired up.");
      return json({ ok: r.ok, telegram: await r.json() });
    }
    if (url.pathname === "/" || url.pathname === "/status" || url.pathname === "/status.json") {
      const f = await loadFleet(env2);
      if (!f.ts) {
        const data = await snapshot();
        const fresh = emptyFleet();
        foldRound(fresh, data.sites);
        env2.STATUS.put(FLEET_KEY, JSON.stringify(fresh)).catch(() => {
        });
        return json({ ...data, parked: PARKED });
      }
      return json({ ts: f.ts, sites: f.sites, parked: PARKED });
    }
    return new Response(
      "nonarkara-status \xB7 /status \xB7 /now \xB7 /history \xB7 /uptime \xB7 /incidents",
      { headers: { ...corsHeaders, "Content-Type": "text/plain" } }
    );
  }
};

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-GEsWOp/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-GEsWOp/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  ACTIVE,
  PARKED,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default,
  emptyFleet,
  foldRound,
  isUp,
  uptimeFor
};
//# sourceMappingURL=index.js.map
