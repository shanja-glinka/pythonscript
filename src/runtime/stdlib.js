const STD_LIB = `
// --- PythonScript stdlib (minimal) ---
function print(...args) { console.log(...args); }
function len(x) { return x?.length ?? 0; }
function range(start, end, step = 1) {
  if (end === undefined) {
    end = start;
    start = 0;
  }
  const res = [];
  for (let i = start; step > 0 ? i < end : i > end; i += step) {
    res.push(i);
  }
  return res;
}
`.trim();

export function stdlibHeader() {
  return STD_LIB + "\n";
}
