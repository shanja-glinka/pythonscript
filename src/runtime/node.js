import vm from "node:vm";

export function executeJS(code, { sandbox = false, timeoutMs = 1000 } = {}) {
  if (!sandbox) {
    vm.runInThisContext(code, { filename: "transpiled.js" });
    return;
  }

  const sandboxGlobal = Object.create(null);

  // Whitelist базовых API
  sandboxGlobal.console = console;
  sandboxGlobal.Math = Math;
  sandboxGlobal.Date = Date;
  sandboxGlobal.setTimeout = setTimeout;
  sandboxGlobal.clearTimeout = clearTimeout;

  // Явно убираем потенциально опасные ссылки
  Object.defineProperty(sandboxGlobal, "require", {
    value: undefined,
    writable: false,
    configurable: false,
  });

  const context = vm.createContext(sandboxGlobal);
  const script = new vm.Script(code, { filename: "transpiled.js" });
  script.runInContext(context, { timeout: timeoutMs });
}
