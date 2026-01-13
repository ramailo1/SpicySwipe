// background.js
// Handles geolocation spoofing, AI fallback, tab control, analytics, and message passing

// Common mobile and desktop user agents
const USER_AGENTS = [
  // Desktop - Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/122.0',
  // Desktop - Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  // Mobile - iOS
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/121.0.6167.66 Mobile/15E148 Safari/604.1',
  // Mobile - Android
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.66 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36'
];

// --- Debug Mode Controller (Background) ---
function applyBGDebugMode(enabled) {
  const flag = !!enabled;
  if (!globalThis.__origConsoleBG) {
    globalThis.__origConsoleBG = {
      log: console.log,
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };
  }
  const o = globalThis.__origConsoleBG;
  if (flag) {
    console.log = o.log;
    console.debug = o.debug;
    console.info = o.info;
    console.warn = o.warn;
    console.error = o.error;
  } else {
    console.log = () => { };
    console.debug = () => { };
    console.info = () => { };
    console.warn = o.warn;
    console.error = o.error;
  }
}

// Initialize from storage and listen for changes
chrome.storage.local.get(['debugMode'], ({ debugMode }) => applyBGDebugMode(!!debugMode));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.debugMode) {
    applyBGDebugMode(changes.debugMode.newValue);
  }
});

// Session management for rate limiting
const SESSION_MANAGER = {
  activeSessions: new Map(),
  failureHistory: new Map(),
  // Reset session data after 6 hours
  SESSION_RESET_TIME: 6 * 60 * 60 * 1000,

  startSession(tabId) {
    this.activeSessions.set(tabId, {
      startTime: Date.now(),
      swipeCount: 0,
      failures: 0,
      lastPauseTime: null
    });
  },

  endSession(tabId) {
    this.activeSessions.delete(tabId);
  },

  getSession(tabId) {
    return this.activeSessions.get(tabId);
  },

  recordFailure(tabId, type) {
    const session = this.getSession(tabId);
    if (session) {
      session.failures++;
      this.failureHistory.set(tabId, {
        lastFailure: Date.now(),
        type: type,
        count: (this.failureHistory.get(tabId)?.count || 0) + 1
      });
    }
  },

  shouldResetSession(tabId) {
    const session = this.getSession(tabId);
    return session && (Date.now() - session.startTime) > this.SESSION_RESET_TIME;
  },

  getFailureCount(tabId, timeWindow = 3600000) { // 1 hour window
    const history = this.failureHistory.get(tabId);
    if (!history) return 0;
    if (Date.now() - history.lastFailure > timeWindow) {
      this.failureHistory.delete(tabId);
      return 0;
    }
    return history.count;
  }
};

// --- AI Tab Relay Logic ---
let aiTabId = null;

chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings, cities, etc.
  chrome.storage.local.set({
    activeAI: 'chatgpt',
    swipeConfig: { likeRatio: 0.7, maxSwipes: 30 },
    cities: [],
    consentGiven: false,
    analytics: { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0 },
    debugMode: false
  });
});

// --- Extension Context Recovery ---
let contextRecoveryAttempts = 0;
const MAX_RECOVERY_ATTEMPTS = 3;

function attemptContextRecovery() {
  if (contextRecoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
    console.error('[Tinder AI][BG] Max context recovery attempts reached');
    return false;
  }

  contextRecoveryAttempts++;
  console.log(`[Tinder AI][BG] Attempting context recovery (attempt ${contextRecoveryAttempts}/${MAX_RECOVERY_ATTEMPTS})`);

  // Try to reinitialize the extension context
  try {
    // Check if runtime is still available
    if (chrome.runtime && chrome.runtime.id) {
      console.log('[Tinder AI][BG] Extension context recovered successfully');
      contextRecoveryAttempts = 0; // Reset counter on success
      return true;
    } else {
      console.warn('[Tinder AI][BG] Extension context still invalid');
      return false;
    }
  } catch (error) {
    console.error('[Tinder AI][BG] Context recovery failed:', error);
    return false;
  }
}

// --- Unified Message Listener ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Check if extension context is valid
  if (!chrome.runtime?.id) {
    console.warn('[Tinder AI][BG] Extension context invalidated, attempting recovery...');
    if (attemptContextRecovery()) {
      // Context recovered, continue with message processing
      console.log('[Tinder AI][BG] Context recovered, processing message');
    } else {
      console.error('[Tinder AI][BG] Context recovery failed, cannot process message');
      sendResponse({ error: 'Extension context invalidated' });
      return true;
    }
  }

  // --- Window Size Management ---
  if (msg.type === 'getRandomViewport') {
    const width = 800 + Math.floor(Math.random() * 400);
    const height = 600 + Math.floor(Math.random() * 300);
    sendResponse({ width, height });
    return true;
  }

  // --- Session Failure Handling ---
  if (msg.type === 'sessionFailure') {
    const { tabId, failureType } = msg;
    SESSION_MANAGER.recordFailure(tabId, failureType);

    // Check failure count and suggest actions
    const failureCount = SESSION_MANAGER.getFailureCount(tabId);
    let action = '';

    if (failureCount >= 5) {
      action = 'stop'; // Too many failures, stop automation
    } else if (failureCount >= 3) {
      action = 'stealth'; // Enable stealth mode
    } else {
      action = 'pause'; // Short pause
    }

    sendResponse({ action, failureCount });
    return true;
  }

  // --- Geolocation Spoofing ---
  if (msg.type === 'spoofGeolocation') {
    spoofGeolocation(msg.city);
    sendResponse({ success: true });
    return true;
  }

  // --- AI Fallback ---
  if (msg.type === 'aiFallback') {
    chrome.storage.local.get('activeAI', ({ activeAI }) => {
      const nextAI = aiFallback(activeAI);
      chrome.storage.local.set({ activeAI: nextAI });
      sendResponse({ success: true, nextAI });
    });
    return true; // Required for async response
  }

  // --- Analytics Update ---
  if (msg.type === 'swipeSessionComplete') {
    updateAnalytics(msg.analytics);
    sendResponse({ success: true });
    return true;
  }

  // --- Swiping Schedule Check ---
  if (msg.type === 'isSwipingAllowed') {
    chrome.storage.local.get('swipeSchedule', ({ swipeSchedule }) => {
      if (!swipeSchedule) {
        sendResponse({ allowed: true });
      } else {
        sendResponse({ allowed: isSwipingAllowedNow(swipeSchedule) });
      }
    });
    return true; // Required for async response
  }

  if (msg.type === 'getGeminiAPIResponse') {
    (async () => {
      try {
        // Determine which key to use based on the model
        let model = msg.model || 'gemini-2.0-flash';
        let apiKeyKey = 'geminiFreeApiKey';
        if (model === 'gemini-1.5-pro' || model === 'gemini-1.5-pro-latest') {
          apiKeyKey = 'geminiProApiKey';
          model = 'gemini-1.5-pro';
        } else if (model === 'gemini-2.0-flash-exp') {
          apiKeyKey = 'geminiFreeApiKey'; // Uses same key structure usually
        } else {
          apiKeyKey = 'geminiFreeApiKey';
          model = 'gemini-2.0-flash';
        }
        const storageResult = await new Promise(resolve => chrome.storage.local.get(apiKeyKey, resolve));
        const geminiApiKey = storageResult[apiKeyKey];

        if (!geminiApiKey) {
          sendResponse({ error: `Gemini API key (${apiKeyKey}) not set in settings.` });
          return;
        }

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

        console.log('[Tinder AI][BG] Calling Gemini API...');
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: msg.prompt
              }]
            }]
          })
        });
        const data = await response.json();

        if (data.error) {
          console.error('[Tinder AI][BG] Gemini API Error:', data.error.message);
          sendResponse({ error: `API Error: ${data.error.message}` });
        } else {
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          console.log('[Tinder AI][BG] Gemini API Response:', responseText);
          sendResponse({ response: responseText });
        }
      } catch (error) {
        console.error('[Tinder AI][BG] Gemini Fetch Error:', error);
        sendResponse({ error: `Fetch Error: ${error.message}` });
      }
    })();
    return true; // Indicates an async response.
  }

  if (msg.type === 'getOpenAIAPIResponse') {
    (async () => {
      try {
        console.log('[Tinder AI][BG] OpenAI API request received:', msg);
        const { openaiApiKey } = await new Promise(resolve => chrome.storage.local.get('openaiApiKey', resolve));
        if (!openaiApiKey) {
          console.error('[Tinder AI][BG] No OpenAI API key found in storage');
          sendResponse({ error: 'OpenAI API key not set in settings.' });
          return;
        }
        console.log('[Tinder AI][BG] OpenAI API key found, making request');
        const API_URL = 'https://api.openai.com/v1/chat/completions';
        const requestBody = {
          model: msg.model || 'gpt-4o-mini',
          messages: msg.messages,
          temperature: msg.temperature || 0.9
        };
        console.log('[Tinder AI][BG] Request body:', requestBody);
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify(requestBody)
        });
        console.log('[Tinder AI][BG] Response status:', response.status);
        const data = await response.json();
        console.log('[Tinder AI][BG] Response data:', data);
        if (data.error) {
          console.error('[Tinder AI][BG] OpenAI API error:', data.error);
          sendResponse({ error: data.error.message });
        } else {
          console.log('[Tinder AI][BG] OpenAI API success, sending response');
          sendResponse({ response: data.choices?.[0]?.message?.content });
        }
      } catch (error) {
        console.error('[Tinder AI][BG] OpenAI API exception:', error);
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }

  if (msg.type === 'getDeepSeekAPIResponse') {
    (async () => {
      try {
        const { deepseekApiKey } = await new Promise(resolve => chrome.storage.local.get('deepseekApiKey', resolve));
        if (!deepseekApiKey) {
          sendResponse({ error: 'DeepSeek API key not set in settings.' });
          return;
        }
        const API_URL = 'https://api.deepseek.com/v1/chat/completions';
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekApiKey}`
          },
          body: JSON.stringify({
            model: msg.model || 'deepseek-chat',
            messages: msg.messages,
            temperature: msg.temperature || 0.9
          })
        });
        const data = await response.json();
        if (data.error) {
          sendResponse({ error: data.error.message });
        } else {
          sendResponse({ response: data.choices?.[0]?.message?.content });
        }
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }

  if (msg.type === 'getAnthropicAPIResponse') {
    (async () => {
      try {
        const { anthropicApiKey } = await new Promise(resolve => chrome.storage.local.get('anthropicApiKey', resolve));
        if (!anthropicApiKey) {
          sendResponse({ error: 'Anthropic API key not set in settings.' });
          return;
        }
        const API_URL = 'https://api.anthropic.com/v1/messages';
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: msg.model || 'claude-haiku-4-5',
            max_tokens: msg.max_tokens || 100,
            temperature: msg.temperature || 0.9,
            messages: msg.messages
          })
        });
        const data = await response.json();
        if (data.error) {
          sendResponse({ error: data.error.message });
        } else {
          sendResponse({ response: data.content?.[0]?.text });
        }
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }

  if (msg.type === 'getCurrentTabId') {
    // Return the sender's tab ID
    sendResponse({ tabId: sender.tab && sender.tab.id });
    return true;
  }

  if (msg.type === 'focusTab' && msg.tabId) {
    console.log('[Tinder AI][BG] Received focusTab message. Focusing tab:', msg.tabId);
    chrome.tabs.update(msg.tabId, { active: true }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Tinder AI][BG] focusTab error:', chrome.runtime.lastError);
        sendResponse({ focused: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[Tinder AI][BG] Tab focused successfully:', msg.tabId);
        sendResponse({ focused: true });
      }
    });
    return true;
  }
});

// --- CAPTCHA & Rate Limit Detection ---
if (chrome.webRequest && chrome.webRequest.onCompleted) {
  chrome.webRequest.onCompleted.addListener(
    (details) => {
      try {
        // Check response status
        if (details.statusCode === 429) { // Too Many Requests
          SESSION_MANAGER.recordFailure(details.tabId, 'RATE_LIMIT');
        }
        // Check for CAPTCHA URLs
        if (details.url.includes('captcha') || details.url.includes('challenge')) {
          SESSION_MANAGER.recordFailure(details.tabId, 'CAPTCHA');
        }
      } catch (error) {
        console.error('[Tinder AI][BG] Error in webRequest listener:', error);
      }
    },
    { urls: ['*://*.tinder.com/*'] }
  );
} else {
  console.warn('[Tinder AI][BG] webRequest API not available, skipping CAPTCHA detection');
}

// --- Session Cleanup ---
setInterval(() => {
  // Clean up old sessions
  for (const [tabId, session] of SESSION_MANAGER.activeSessions) {
    if (SESSION_MANAGER.shouldResetSession(tabId)) {
      SESSION_MANAGER.endSession(tabId);
    }
  }

  // Clean up failure history older than 24 hours
  const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
  for (const [tabId, history] of SESSION_MANAGER.failureHistory) {
    if (history.lastFailure < dayAgo) {
      SESSION_MANAGER.failureHistory.delete(tabId);
    }
  }
}, 30 * 60 * 1000); // Run every 30 minutes

// --- Context Health Check ---
setInterval(() => {
  if (!chrome.runtime?.id) {
    console.warn('[Tinder AI][BG] Extension context lost during health check');
    attemptContextRecovery();
  }
}, 60 * 1000); // Check every minute

// --- Geolocation Spoofing ---
async function spoofGeolocation(city) {
  // Placeholder: Use DevTools Protocol or navigator.geolocation override
  // In real extension, would require user to enable DevTools experiments
  console.log('Spoofing geolocation to', city);
}

// --- AI Fallback ---
function aiFallback(currentAI) {
  const aiList = ['chatgpt', 'gemini', 'grok'];
  const idx = aiList.indexOf(currentAI);
  return aiList[(idx + 1) % aiList.length];
}

// --- Analytics Handler ---
function updateAnalytics(newData) {
  chrome.storage.local.get('analytics', ({ analytics }) => {
    const updated = { ...analytics, ...newData };
    chrome.storage.local.set({ analytics: updated });
  });
}

// --- Schedule Swiping: Time Check ---
function isSwipingAllowedNow(schedule) {
  const now = new Date();
  const day = now.getDay(); // 0=Sunday, 6=Saturday
  const isWeekend = (day === 0 || day === 6);
  const { start, end } = isWeekend ? schedule.weekend : schedule.weekday;
  if (!start || !end) return true; // If not set, allow
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (startMinutes <= endMinutes) {
    // Normal case (e.g., 18:00-22:00)
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  } else {
    // Overnight case (e.g., 22:00-02:00)
    return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
  }
}