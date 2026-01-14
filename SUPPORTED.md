# PythonScript Supported Subset

This document describes the **current** supported subset of `.pjs` and `.js`, plus runtime notes. This is not full Python/JavaScript.

## `.pjs` (Python-like subset)
- **Basic types**: numbers, strings, booleans (`True/False`), `None`, lists, dicts, indexing.
- **Statements**: `if/elif/else`, `for range(...)`, `while`, `try/except/finally`, `def`, `class`, `return`.
- **Operators**: `+ - * / // % **`, comparisons `< > <= >= == !=`, boolean `and/or/not`, ternary `x if cond else y`, augmented assign `+= -= *= /= //= %= **=`, membership `in / not in`.
- **Slicing**: `arr[start:stop(:step)]` (step is parsed; JS output currently uses `slice(start, stop)`).
- **Calls/attributes**: `obj.attr`, `obj[idx]`, `obj.method(...)`, `len(x)` → `.length`, `list.append`, `list.pop`.
- **Strings**: plain strings and simplified f-strings (`f"Hello {name}"`). No `{{}}` escaping, no multiline strings.
- **Functions**: default arguments, `*args` (rest). `**kwargs` is parsed but not supported in codegen.
- **Classes**: simple classes, methods, `__init__`; no inheritance.
- **Not supported**: generators/async, decorators, comprehensions, context managers, set/tuple, pattern matching, real modules.

## `.js` (subset used for js→pjs)
- **Basics**: `let/const/var`, number/string/true/false/null literals, arrays, objects.
- **Expressions**: unary `! + -`, binary/logical `+ - * / % ** && || == === != !== < > <= >=`.
- **Member/calls**: `obj.prop`, `obj[idx]`, calls with arguments.
- **Mappings to `.pjs`**:
  - `console.log(...)` → `print(...)`
  - `arr.slice(a, b)` → `arr[a:b]`
  - `arr.includes(x)` → `x in arr`
  - `arr.push(x)` / `arr.pop()` → `append` / `pop`
- **Not supported**: import/export, proper parsing of `if/for/while/try/...` (skipped as blocks), template literals, destructuring, spread/rest in literals, optional chaining, async/await.

## Runtime & stdlib
- **Node**: execution is unsafe by default; best-effort sandbox via `--sandbox` + `--timeout`.
- **Browser**: runs via `new Function` or Web Worker (if available); no DOM emulation.
- **Injected stdlib**: `print`, `len`, `range` are prepended to generated JS. Not a real Python runtime.

## Known limitations
- Unsupported syntax may become `UnknownExpression` / `IgnoredStatement`.
- Negative indices/slices are not normalized like CPython.
- Codegen is not idempotent and does not preserve formatting/comments.
