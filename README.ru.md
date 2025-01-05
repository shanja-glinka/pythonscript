# PythonScript

**PythonScript** — это упрощённый интерпретатор-транспилер, позволяющий:

- **транслировать** код на Python (подмножество) в JavaScript,
- **обратно** транспилировать JS (подмножество) в Python,
- **запускать** полученный код в различных режимах (Node, Browser).

Он **не** является полноценной реализацией всего стандарта Python или JS, но даёт представление об архитектуре лексера, парсера и генератора кода.

## Структура проекта

```bash
pythonscript/
├── bin/
│   └── pythonscript       # CLI-скрипт (исполняемый файл для запуска из терминала)
├── dist/
│   └── ...                # Билды
├── src/
│   ├── core/
│   │   ├── js/
│   │   │   ├── lexer.js   # Лексический анализатор JS
│   │   │   └── parser.js  # Парсер, строящий AST
│   │   ├── python/
│   │   │   ├── lexer.js   # Лексический анализатор Python
│   │   │   └── parser.js  # Парсер, строящий AST
│   │   ├── ast.js         # Доп. структуры для описания/манипуляции AST
│   │   ├── errors.js      # Классы и функции для ошибок с инфой о файле/строке
│   │   ├── token-lexer.js
│   │   ├── token-stream.js
│   │   └── utils.js
│   ├── transpilers/
│   │   ├── python2js.js   # Транспилер Python -> JS
│   │   ├── js2python.js   # Транспилер JS -> Python
│   │   └── ...
│   ├── runtime/
│   │   ├── browser.js     # Обработчик "браузерного" режима
│   │   ├── node.js        # Обработчик "node"-режима
│   │   └── ...
│   ├── index.js           # Точка входа для импорта из src (например для CLI)
│   └── ...
├── test/
│   ├── pjs/
│   │   ├── test_scalars.pjs      # Тест: простые операции, try/except/finally
│   │   ├── test_complex.pjs      # Тест: циклы, условия, комментарии
│   │   ├── test_imports.pjs      # Тест: работа с импортами
│   │   └── test_files.pjs        # Тест: чтение/запись/удаление файлов
│   ├── js/
│   │   ├── test_scalars.js       # Аналогичные тесты, но на JS, чтобы проверить js->pjs
│   │   └── ...
│   ├── runner.test.js            # Тест-раннер (Mocha/Jest/etc.)
│   └── ...
├── package.json
└── README.md
```

## Краткое описание работы алгоритма

1. **Лексер (lexer.js)**: разбивает исходный код (Python или JS) на токены (идентификаторы, числа, операторы, ключевые слова и т.д.).  
2. **Парсер (parser.js)**: преобразует токены в AST (абстрактное синтаксическое дерево), учитывая базовый синтаксис и операторы.  
3. **Транспилер (python2js.js/js2python.js)**: обходит AST и генерирует код на целевом языке (JS или Python).  
4. **Runtime**: при необходимости может **запускать** полученный JS-код в Node или «виртуальном браузерном» окружении.

## Установка и запуск

### Linux / macOS

1. Установить зависимости (если нужны) и сделать скрипт исполняемым:
   ```bash
   chmod +x bin/pythonscript
   ```
2. Транспиляция из Python в JS:
   ```bash
   ./bin/pythonscript build test/pjs/test_scalars.pjs -o dist/test_scalars.out.js
   ```
3. Запуск сгенерированного кода:
   ```bash
   ./bin/pythonscript run dist/test_scalars.out.js --mode=node
   ```
   или, при необходимости, `--mode=browser`.

Аналогично для `.js -> .pjs`:
```bash
./bin/pythonscript build test/js/test_scalars.js -o dist/test_scalars_js.out.pjs
cat dist/test_scalars_js.out.pjs
```

### Windows

1. В PowerShell или cmd:
   ```powershell
   node .\bin\pythonscript --help
   ```
   Вы увидите справку.
2. Транспилировать Python->JS:
   ```powershell
   node .\bin\pythonscript build test\pjs\test_scalars.pjs -o dist\test_scalars.out.js
   ```
3. Запустить транспилированный JS:
   ```powershell
   node .\bin\pythonscript run dist\test_scalars.out.js --mode=node
   ```
4. Аналогично для `.js -> .pjs`:
   ```powershell
   node .\bin\pythonscript build test\js\test_scalars.js -o dist\test_scalars_js.out.pjs
   type .\dist\test_scalars_js.out.pjs
   ```

## Примеры работы

- **`test_scalars.pjs`**: простые операции, try/except/finally.  
  - Транспилируется в JS-код, при запуске выводит базовые арифметические результаты.  
- **`test_complex.pjs`**: циклы, условия, комментарии.  
  - Проверяет `if/else`, `for`, `while`.  
- **`test_files.pjs`**: проверяет чтение/запись файлов (в node-режиме).  
- **`test_imports.pjs`**: простая проверка импорта.

## Запуск тестов

Если в `test/runner.test.js` реализован тест-раннер (Mocha, Jest или любой другой):

```bash
npm run test
```

Внутри `runner.test.js` можно автоматически вызывать:
1. `build(...)` для `.pjs` -> `.js`.  
2. `run(...)` для проверки, что код запускается в node-среде без ошибок и даёт корректный вывод.  
3. Аналогично для `.js` -> `.pjs`.

Если всё **выполняется без ошибок**, считается, что тесты пройдены успешно.

---

### Краткая демонстрация

```bash
$ node ./bin/pythonscript build test/pjs/test_scalars.pjs -o dist/scalars.js
Файл успешно транспилирован!

$ node ./bin/pythonscript run dist/scalars.js --mode=node
13
7
30
3.3333...
3 1
Done!
# ...
```
(Вывод совпадает с ожидаемым для `test_scalars.pjs`.)

Таким образом, **PythonScript** позволяет быстро проверить логику парсинга и трансформации простого Python-кода в JS-код и обратно.

### Примеры
 * Python to JS - from [Python code](/test/pjs/test_scalars.pjs) to [JS code](/dist/test_scalars.out.js)
 * JS to Python - from [JS code](/test/js/test_scalars.js) to [Python code](/dist/test_scalars_js.out.pjs)

### Языки

* [Русский README](README.ru.md)
* [English README](README.md)
