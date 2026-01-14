export function executeJS(code) {
  // В реальном браузере пробуем запустить в Worker для изоляции.
  if (typeof Worker !== "undefined") {
    const blob = new Blob([code], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    // Мини-обработчик ошибок
    worker.onerror = (e) => {
      console.error("Browser worker error:", e.message || e);
    };
    return;
  }

  // Fallback: прямое выполнение (Node или среда без Worker)
  // eslint-disable-next-line no-new-func
  const fn = new Function(code);
  fn();
}
