import vm from 'node:vm';

export function executeJS(code) {
  try {
    vm.runInThisContext(code, { filename: 'transpiled.js' });
  } catch (err) {
    console.error('Ошибка исполнения в node runtime:', err);
  }
}