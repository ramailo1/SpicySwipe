// utils/antiDetection.js
// Anti-detection measures for Tinder AI Automator

window.antiDetection = (() => {
  // --- Configurable Parameters ---
  const stealth = {
    enabled: false,
    typingDelay: [80, 220],    // Slower, more variable typing
    mouseMoveDelay: [15, 50], // Slower mouse movements
    scrollDelay: [400, 1000],   // Slower scrolls
  };

  const rateLimit = {
    maxSessionSwipes: 100, // Safety cap for a session
    sessionSwipes: 0,
    lastActionTimestamp: 0,
    minActionInterval: 800, // Minimum ms between actions
  };

  const diagnosticLog = [];

  // --- Core Functions ---

  /**
   * Adds a timestamped event to the diagnostic log.
   * @param {string} message - The diagnostic message.
   */
  const addDiagnosticEvent = (message) => {
    const event = { timestamp: Date.now(), message };
    diagnosticLog.unshift(event); // Add to the beginning
    if (diagnosticLog.length > 50) {
      diagnosticLog.pop(); // Keep log size manageable
    }
    // Dispatch a custom event so the UI can update if it's open
    window.dispatchEvent(new CustomEvent('antiDetectionDiagnostic', { detail: event }));
  };

  /**
   * Returns a random delay within a specified range.
   * @param {number} min - Minimum delay in ms.
   * @param {number} max - Maximum delay in ms.
   * @returns {number} The calculated delay.
   */
  const getRandomDelay = (min, max) => {
    const baseDelay = Math.random() * (max - min) + min;
    // If stealth mode is on, add a bit more random delay
    return stealth.enabled ? baseDelay * (1 + Math.random() * 0.5) : baseDelay;
  };

  /**
   * Simulates realistic human-like mouse movements towards a target element.
   * @param {HTMLElement} element - The target element.
   */
  const simulateHumanMouse = async (element) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + (rect.width / 2);
    const y = rect.top + (rect.height / 2);

    // Create a fake mouse event to simulate movement
    const mouseMove = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: x + (Math.random() - 0.5) * 10, // Add slight inaccuracy
      clientY: y + (Math.random() - 0.5) * 10,
    });

    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await new Promise(r => setTimeout(r, getRandomDelay(...stealth.mouseMoveDelay)));
    element.dispatchEvent(mouseMove);
    await new Promise(r => setTimeout(r, getRandomDelay(...stealth.mouseMoveDelay)));
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await new Promise(r => setTimeout(r, getRandomDelay(40, 90)));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    element.click();

    addDiagnosticEvent(`Simulated human-like click on: ${element.tagName}`);
  };

  /**
   * Simulates natural-looking page scrolling.
   */
  const simulateNaturalScroll = () => {
    return new Promise(resolve => {
        const scrollAmount = (Math.random() - 0.5) * 400; // Scroll up or down
        const startY = window.scrollY;
        const endY = startY + scrollAmount;
        const distance = Math.abs(scrollAmount);
        const duration = getRandomDelay(300, 800);
        let startTime = null;

        function scrollStep(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = (timestamp - startTime) / duration;
            const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI); // Ease-in-out
            window.scrollTo(0, startY + scrollAmount * ease);
            if (progress < 1) {
                window.requestAnimationFrame(scrollStep);
            } else {
                addDiagnosticEvent(`Simulated natural scroll by ${Math.round(scrollAmount)}px.`);
                resolve();
            }
        }
        window.requestAnimationFrame(scrollStep);
    });
  };

  /**
   * Checks if an action is allowed based on rate limiting.
   * @returns {Promise<boolean>} True if the action is allowed.
   */
  const checkRateLimit = async () => {
    const now = Date.now();
    if (now - rateLimit.lastActionTimestamp < rateLimit.minActionInterval) {
      const delay = rateLimit.minActionInterval - (now - rateLimit.lastActionTimestamp);
      addDiagnosticEvent(`Rate limit check: Throttling action for ${delay}ms.`);
      await new Promise(r => setTimeout(r, delay));
    }
    if (rateLimit.sessionSwipes >= rateLimit.maxSessionSwipes) {
      addDiagnosticEvent('Rate limit check: Max session swipes reached.');
      return false;
    }
    rateLimit.lastActionTimestamp = Date.now();
    return true;
  };

  /**
   * Randomizes viewport size within a sensible range.
   * @returns {{width: number, height: number}}
   */
  const randomizeViewport = () => {
    // This can't directly change the window size from a content script.
    // It signals the background script to do it.
    const width = 1200 + Math.floor(Math.random() * 400);
    const height = 800 + Math.floor(Math.random() * 200);
    addDiagnosticEvent(`Requesting new viewport size: ${width}x${height}`);
    return { width, height }; // The content script can use this info if needed
  };

  /**
   * Simple CAPTCHA detection based on keywords in the DOM.
   * @returns {boolean} True if a CAPTCHA is suspected.
   */
  const detectCAPTCHA = () => {
    const bodyText = document.body.innerText.toLowerCase();
    const captchaKeywords = ['captcha', 'verify you are human', 'challenge', 'are you a robot'];
    if (captchaKeywords.some(keyword => bodyText.includes(keyword))) {
      addDiagnosticEvent('CAPTCHA detected via keyword search.');
      return true;
    }
    return false;
  };

  /**
   * Resets session-specific counters.
   */
  const resetSession = () => {
    rateLimit.sessionSwipes = 0;
    addDiagnosticEvent('Anti-detection session counters reset.');
  };

  /**
   * Watches for significant DOM changes that might indicate anti-bot measures.
   * This version is less aggressive and focuses on logging.
   * @param {string} targetSelector - The primary selector to watch for.
   * @param {number} timeout - How long to observe before resolving.
   * @returns {Promise<void>} Resolves after timeout, logs suspicious changes.
   */
  const detectDOMChanges = (targetSelector, timeout = 2000) => {
    return new Promise((resolve) => {
      const observer = new MutationObserver((mutations, obs) => {
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.textContent && (node.textContent.toLowerCase().includes('captcha') || node.textContent.toLowerCase().includes('challenge'))) {
                addDiagnosticEvent('Suspicious DOM change: CAPTCHA or challenge text detected.');
                // Don't reject, just log. Let the main logic handle it.
              }
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      // Always resolve after a timeout, letting the main logic proceed.
      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, timeout);
    });
  };

  /**
   * Toggles stealth mode.
   * @param {boolean} isEnabled - Whether to enable or disable stealth mode.
   */
  const toggleStealthMode = (isEnabled) => {
    stealth.enabled = isEnabled;
    addDiagnosticEvent(`Stealth mode ${isEnabled ? 'enabled' : 'disabled'}.`);
  };

  // --- Public API ---
  return {
    stealth,
    rateLimit,
    getRandomDelay,
    simulateHumanEvents: simulateHumanMouse, // Alias for clarity
    simulateNaturalScroll,
    checkRateLimit,
    randomizeViewport,
    getDiagnosticLog: () => diagnosticLog,
    addDiagnosticEvent,
    toggleStealthMode,
    detectCAPTCHA,
    detectDOMChanges,
    resetSession // Expose the new function
  };
})();