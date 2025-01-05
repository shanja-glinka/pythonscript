```sh
pythonscript/
├── bin/
│   └── pythonscript       # CLI-скрипт (исполняемый файл для запуска из терминала)
├── src/
│   ├── core/
│   │   ├── lexer.js       # Лексический анализатор Python/JS
│   │   ├── parser.js      # Парсер, строящий AST
│   │   ├── ast.js         # Доп. структуры для описания/манипуляции AST
│   │   └── errors.js      # Классы и функции для ошибок с инфой о файле/строке
│   ├── transpilers/
│   │   ├── python2js.js   # Транспилер Python -> JS
│   │   ├── js2python.js   # Транспилер JS -> Python
│   │   └── ...
│   ├── runtime/
│   │   ├── browser.js     # Обработчик "браузерного" режима
│   │   ├── node.js        # Обработчик "node"-режима
│   │   ├── ...
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


## How it start?

#### Linux

Установите зависимости (если нужны) и сделайте
```sh
chmod +x bin/pythonscript
```

Запустите, например:

```sh
./bin/pythonscript build test/pjs/test_scalars.pjs -o out_scalars.js
./bin/pythonscript run out_scalars.js --mode=node
```

Аналогично для .js -> .pjs:

```sh
./bin/pythonscript build test/js/test_scalars.js -o out_scalars.pjs
cat out_scalars.pjs
```

#### Windows
1. Запустите:
   ```powershell
   node .\bin\pythonscript --help
   ```
   или
   ```powershell
   node .\bin\pythonscript build test\pjs\test_scalars.pjs -o dist\test_scalars.out.js
   ```
   Если все пути прописаны верно и нет ошибок, увидите вывод либо справку, либо сообщение об успешной транспиляции.

## Testing
#### 1. Проверка работы на примере

Допустим, у нас есть файл `test_scalars.pjs` в папке `test\pjs\`. Запустим:

1. **Транспиляция** `test_scalars.pjs` в JavaScript:

   ```powershell
   node .\bin\pythonscript build .\test\pjs\test_scalars.pjs -o .\dist\test_scalars.out.js
   ```

   - При первом запуске возможно, что папки `dist` не существует. Создайте её, если нужно:
     ```powershell
     mkdir dist
     ```
   - Если всё успешно, в `dist\test_scalars.out.js` появится сгенерированный JS-код.

2. **Запуск** полученного `.js`:

   ```powershell
   node .\bin\pythonscript run .\dist\test_scalars.out.js --mode=node
   ```
   - Скрипт прочитает `.js` файл, определит, что это JavaScript, и выполнит `executeNode(jsCode)`, то есть фактически запустит его в Node-среде.  
   - Если всё ок, увидите вывод (`console.log(...)`) от кода, который был в `test_scalars.pjs`.

**Пример** в командной строке PowerShell:

```powershell
PS C:\myProjects\pythonscript> node .\bin\pythonscript build .\test\pjs\test_scalars.pjs -o .\dist\test_scalars.out.js
Файл успешно транспилирован: .\test\pjs\test_scalars.pjs -> .\dist\test_scalars.out.js

PS C:\myProjects\pythonscript> node .\bin\pythonscript run .\dist\test_scalars.out.js --mode=node
13
7
30
3.3333...
3 1
Done!
```

> Если вывод совпал с ожидаемым (например, 13, 7, 30...), значит всё работает.

---

#### 2. Аналогично для `.js` -> `.pjs`

Попробуйте транспилировать JavaScript-файл из папки `test\js`. Предположим, `test_scalars.js`:

```powershell
node .\bin\pythonscript build .\test\js\test_scalars.js -o .\dist\test_scalars_js.out.pjs
```

Проверить содержимое (можно вывести на экран или открыть любым текстовым редактором):

```powershell
type .\dist\test_scalars_js.out.pjs
```

Будет что-то вроде Python-кода (упрощённого, в зависимости от того, что вы реализовали в транспилере).

---

#### 3. Запуск тест-раннера

Если в `package.json` есть скрипт `"test": "node test/runner.test.js"` и файл `test\runner.test.js` реально существует и умеет вызывать `build`, `run` и проверять результаты, то в PowerShell:

```powershell
npm run test
```

В зависимости от реализации в `runner.test.js`, вы увидите логи по тестам, успешное или неуспешное завершение.
