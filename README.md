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
npm install -g pythonscript
```
or locally in a project:
```bash
npm install pythonscript
```

## CLI usage
```bash
pythonscript --help
pythonscript build input.pjs -o dist/output.js   # transpile
pythonscript build input.js  -o dist/output.pjs  # reverse demo
pythonscript run dist/output.js --mode=node      # execute in Node
pythonscript run dist/output.js --mode=browser   # execute with browser shim
```

### Quick demo
```bash
pythonscript build test/pjs/test_scalars.pjs -o dist/scalars.js
pythonscript run dist/scalars.js --mode=node
```

## Limitations
- This is a playful, incomplete subset — many language features are stubbed or simplified.
- Execution is unsandboxed; treat outputs like any other JS file you run.
- Browser mode is a thin wrapper around `new Function`; there is no DOM emulation.

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
- Issues: https://github.com/shanja-glinka/pythonscript/issues
