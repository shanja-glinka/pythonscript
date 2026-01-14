# PythonScript

Игровой транспилятор/интерпретатор, который преобразует небольшой Python-подобный диалект (`.pjs`) в JavaScript и может демонстрационно выполнять обратное преобразование. В комплекте CLI и минимальные рантаймы для браузера и Node.js.

Важно: сгенерированный код выполняется без песочницы. Запускайте только доверенные источники.

## Что умеет
- Транспилировать `.pjs` → `.js` или `.js` → `.pjs` для ограниченного подмножества каждого языка.
- Запускать полученный JavaScript в Node (`--mode=node`) или через лёгкую обёртку браузера (`--mode=browser`).
- Показать базовую архитектуру лексера, парсера и генератора кода без тяжёлых зависимостей.

## Установка
Можно использовать через `npx` или установить глобально:
```bash
npm install -g pythonscript
```
или локально в проект:
```bash
npm install pythonscript
```

## Использование CLI
```bash
pythonscript --help
pythonscript tokenize input.pjs               # отладка: токены в JSON
pythonscript ast input.pjs                    # отладка: AST в JSON
pythonscript lint input.pjs                   # синтаксическая проверка поддерживаемого подмножества
pythonscript build input.pjs -o dist/output.js   # транспиляция
pythonscript build input.js  -o dist/output.pjs  # обратная демонстрация
pythonscript run dist/output.js --mode=node --unsafe               # запуск в Node
pythonscript run dist/output.js --mode=node --unsafe --sandbox     # запуск в vm-песочнице (best-effort)
pythonscript run dist/output.js --mode=browser --unsafe            # запуск в браузерной обёртке
```

### Быстрая демонстрация
```bash
pythonscript build test/pjs/test_scalars.pjs -o dist/scalars.js
pythonscript run dist/scalars.js --mode=node
```

## Ограничения
- Это игровое, неполное подмножество — многие конструкции упрощены или заглушены.
- Исполнение без песочницы по умолчанию; относитесь к выходному JS как к любому исполняемому файлу. В Node есть опциональный best-effort `--sandbox`.
- Режим браузера — тонкая обёртка над `new Function`, DOM не эмулируется.
- Перед сгенерированным кодом подключается небольшой stdlib (`print`, `len`, `range`) — это не полноценный Python runtime.

## Структура проекта (кратко)
```
bin/pythonscript      # CLI вход
src/core              # лексеры, парсеры, ошибки, токены
src/transpilers       # python2js и js2python
src/runtime           # node/browser рантаймы
test                  # примеры и простой раннер
```

## Тесты
```bash
npm test
```

## Ссылки
- English README: [README.md](README.md)
- Issues: https://github.com/shanja-glinka/pythonscript/issues
