// utils/debugControl.js
// Early console control for content scripts. Must be loaded BEFORE other scripts.
(function () {
  function applyDebugMode(enabled) {
    const flag = !!enabled;
    if (!globalThis.__origConsole) {
      globalThis.__origConsole = {
        log: console.log,
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error,
      };
    }
    const o = globalThis.__origConsole;
    if (flag) {
      console.log = o.log;
      console.debug = o.debug;
      console.info = o.info;
      console.warn = o.warn;
      console.error = o.error;
    } else {
      console.log = () => {};
      console.debug = () => {};
      console.info = () => {};
      console.warn = o.warn;
      console.error = o.error;
    }
  }

  try {
    // Default to suppressed until storage responds
    applyDebugMode(false);
    chrome.storage.local.get(['debugMode'], ({ debugMode }) => {
      applyDebugMode(!!debugMode);
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.debugMode) {
        applyDebugMode(changes.debugMode.newValue);
      }
    });
  } catch (e) {
    // If chrome.* not ready, leave console as-is
  }
})();
