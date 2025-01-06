# PythonScript

**PythonScript** is a simplified interpreter-transpiler that allows you to:

- **Translate** Python code (a subset) into JavaScript,
- **Reverse transpile** JS (a subset) back into Python,
- **Run** the resulting code in various modes (Node, Browser).

It is **not** a complete implementation of the entire Python or JS standard, but it provides insights into the architecture of a lexer, parser, and code generator.

> [!IMPORTANT]
> This project is created solely for entertainment purposes and does not claim to be serious or innovative. The features and materials provided are intended to create a light and casual experience. The project is not a professional tool or recommendation, and its use is at the discretion of the users.

## Project Structure

```bash
pythonscript/
├── bin/
│   └── pythonscript       # CLI script (executable for terminal use)
├── dist/
│   └── ...                # Builds
├── src/
│   ├── core/
│   │   ├── js/
│   │   │   ├── lexer.js   # JS lexical analyzer
│   │   │   └── parser.js  # Parser that builds the AST
│   │   ├── python/
│   │   │   ├── lexer.js   # Python lexical analyzer
│   │   │   └── parser.js  # Parser that builds the AST
│   │   ├── ast.js         # Additional structures for describing/manipulating the AST
│   │   ├── errors.js      # Classes and functions for errors with file/line info
│   │   ├── token-lexer.js
│   │   ├── token-stream.js
│   │   └── utils.js
│   ├── transpilers/
│   │   ├── python2js.js   # Transpiler Python -> JS
│   │   ├── js2python.js   # Transpiler JS -> Python
│   │   └── ...
│   ├── runtime/
│   │   ├── browser.js     # Handler for "browser" mode
│   │   ├── node.js        # Handler for "node" mode
│   │   └── ...
│   ├── index.js           # Entry point for importing from src (e.g., for CLI)
│   └── ...
├── test/
│   ├── pjs/
│   │   ├── test_scalars.pjs      # Test: basic operations, try/except/finally
│   │   ├── test_complex.pjs      # Test: loops, conditions, comments
│   │   ├── test_imports.pjs      # Test: imports functionality
│   │   └── test_files.pjs        # Test: file read/write/delete
│   ├── js/
│   │   ├── test_scalars.js       # Equivalent JS tests for js->pjs transpilation
│   │   └── ...
│   ├── runner.test.js            # Test runner (Mocha/Jest/etc.)
│   └── ...
├── package.json
└── README.md
```

## Algorithm Overview

1. **Lexer (lexer.js)**: breaks source code (Python or JS) into tokens (identifiers, numbers, operators, keywords, etc.).  
2. **Parser (parser.js)**: converts tokens into an AST (abstract syntax tree), respecting basic syntax and operators.  
3. **Transpiler (python2js.js/js2python.js)**: traverses the AST and generates code in the target language (JS or Python).  
4. **Runtime**: optionally **runs** the resulting JS code in Node or a "virtual browser" environment.

## Installation and Usage

### Linux / macOS

1. Install dependencies (if required) and make the script executable:
   ```bash
   chmod +x bin/pythonscript
   ```
2. Transpile from Python to JS:
   ```bash
   ./bin/pythonscript build test/pjs/test_scalars.pjs -o dist/test_scalars.out.js
   ```
3. Run the generated code:
   ```bash
   ./bin/pythonscript run dist/test_scalars.out.js --mode=node
   ```
   Or, if necessary, `--mode=browser`.

Similarly for `.js -> .pjs`:
```bash
./bin/pythonscript build test/js/test_scalars.js -o dist/test_scalars_js.out.pjs
cat dist/test_scalars_js.out.pjs
```

### Windows

1. In PowerShell or cmd:
   ```powershell
   node .\bin\pythonscript --help
   ```
   You will see the help menu.
2. Transpile Python->JS:
   ```powershell
   node .\bin\pythonscript build test\pjs\test_scalars.pjs -o dist\test_scalars.out.js
   ```
3. Run the transpiled JS:
   ```powershell
   node .\bin\pythonscript run dist\test_scalars.out.js --mode=node
   ```
4. Similarly for `.js -> .pjs`:
   ```powershell
   node .\bin\pythonscript build test\js\test_scalars.js -o dist\test_scalars_js.out.pjs
   type .\dist\test_scalars_js.out.pjs
   ```

## Examples

- **`test_scalars.pjs`**: Basic operations, try/except/finally.  
  - Transpiles into JS code and outputs basic arithmetic results when run.  
- **`test_complex.pjs`**: Loops, conditions, comments.  
  - Tests `if/else`, `for`, `while`.  
- **`test_files.pjs`**: Reads/writes files (in node mode).  
- **`test_imports.pjs`**: Simple import functionality.

## Running Tests

If `test/runner.test.js` includes a test runner (Mocha, Jest, or any other framework):

```bash
npm run test
```

Inside `runner.test.js`, you can automatically invoke:
1. `build(...)` for `.pjs` -> `.js`.  
2. `run(...)` to ensure the code runs in Node without errors and produces the correct output.  
3. Similarly for `.js` -> `.pjs`.

If everything **executes without errors**, the tests are considered successful.

---

### Quick Demonstration

```bash
$ node ./bin/pythonscript build test/pjs/test_scalars.pjs -o dist/scalars.js
File successfully transpiled!

$ node ./bin/pythonscript run dist/scalars.js --mode=node
13
7
30
3.3333...
3 1
Done!
# ...
```
(Output matches the expected result for `test_scalars.pjs`.)

Thus, **PythonScript** allows you to quickly test the parsing and transformation logic of simple Python code into JS code and vice versa.

### Examples

 * Python to JS - from [Python code](/test/pjs/test_scalars.pjs) to [JS code](/dist/test_scalars.out.js)
 * JS to Python - from [JS code](/test/js/test_scalars.js) to [Python code](/dist/test_scalars_js.out.pjs)

### Languages

* [Русский README](README.ru.md)
* [English README](README.md)
