# PythonScript

Toy transpiler/interpreter that flips a tiny Python-like dialect (`.pjs`) into JavaScript and can sketch the reverse direction. Comes with a CLI and minimal browser/Node runtimes for demo purposes.

> ⚠️ Safety: generated code is executed with no sandbox. Only run sources you trust.

## What you can do
- Transpile `.pjs` → `.js` or `.js` → `.pjs` for a small subset of each language.
- Run the generated JavaScript in Node (`--mode=node`) or through a lightweight browser wrapper (`--mode=browser`).
- Peek under the hood of lexers/parsers/transpilers without heavy dependencies.

## Install
Use it directly with `npx` or install globally:
```bash
npm install -g shanja-glinka/pythonscript
```
or locally in a project:
```bash
npm install shanja-glinka/pythonscript
```

## CLI usage
```bash
pythonscript --help
pythonscript tokenize input.pjs               # debug: tokens as JSON
pythonscript ast input.pjs                    # debug: AST as JSON
pythonscript lint input.pjs                   # syntax check for the supported subset
pythonscript build input.pjs -o dist/output.js   # transpile
pythonscript build input.js  -o dist/output.pjs  # reverse demo
pythonscript run dist/output.js --mode=node --unsafe               # execute in Node
pythonscript run dist/output.js --mode=node --unsafe --sandbox     # execute in vm sandbox (best-effort)
pythonscript run dist/output.js --mode=browser --unsafe            # execute with browser shim
```

### Quick demo
```bash
pythonscript build test/pjs/test_scalars.pjs -o dist/scalars.js
pythonscript run dist/scalars.js --mode=node
```

## Limitations
- This is a playful, incomplete subset — many language features are stubbed or simplified.
- Execution is unsandboxed by default; treat outputs like any other JS file you run. Node mode supports an optional best-effort `--sandbox`.
- Browser mode is a thin wrapper around `new Function`; there is no DOM emulation.
- A tiny stdlib (`print`, `len`, `range`) is injected before generated code for convenience; it is not a full Python runtime.

## Project layout (short)
```
bin/pythonscript      # CLI entrypoint
src/core              # lexers, parsers, errors, tokens
src/transpilers       # python2js and js2python visitors
src/runtime           # node/browser runners
test                  # sample inputs + simple runner
```

## Tests
```bash
npm test
```

## Links
- Русский README: [README.ru.md](README.ru.md)
- Supported subset: [SUPPORTED.md](SUPPORTED.md)
- Issues: https://github.com/shanja-glinka/pythonscript/issues
