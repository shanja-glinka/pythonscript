export function executeJS(code) {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(code);
      fn();
    } catch (err) {
      console.error('Ошибка исполнения в browser runtime:', err);
    }
  }