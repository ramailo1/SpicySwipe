// content.js
// Main entry point - initialization only
// All logic functions are in content/*.js modules

// --- Config & Global State ---
let SWIPE_DELAY_RANGE = [2000, 4000];
let MAX_SESSION_SWIPES = 30;
const SKIP_CHANCE = 0.1;
let swipeCount = 0;
let sessionActive = false;
let swipingGloballyStopped = true;
const currentFilters = {};
let analytics = { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0 };
let isStopping = false;
let sidebarActiveTab = 'status';
let sidebarConsentGiven = false;
const getTodayDateString = () => new Date().toISOString().slice(0, 10);

// Add at the top of the file, after other global variables:
let statusPanelState = { stats: true, stealth: true, settings: true };

// --- Debug Mode Controller (placed early to suppress initial logs) ---
function applyDebugMode(enabled) {
  const flag = !!enabled;
  if (!window.__origConsole) {
    window.__origConsole = {
      log: console.log,
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };
  }
  const o = window.__origConsole;
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

// Initialize with default suppression, then apply stored value and listen for changes
try {
  // Start suppressed by default
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
  // If storage not available, keep current console
}

// --- I18n Initialization ---
async function initializeI18n() {
  try {
    await i18n.init();
    console.log('[Tinder AI] I18n initialized with locale:', i18n.getCurrentLocale());
    return true;
  } catch (error) {
    console.error('[Tinder AI] Error initializing i18n:', error);
    return false;
  }
}

// Global flag to track i18n initialization
let i18nInitialized = false;

// Initialize i18n immediately
initializeI18n().then((success) => {
  i18nInitialized = success;
  console.log('[Tinder AI] I18n initialization complete:', success);

  // Debug: Check current language storage
  chrome.storage.local.get(['userLanguage'], (result) => {
    console.log('[Tinder AI] Current language in storage:', result.userLanguage);
    console.log('[Tinder AI] Current i18n locale:', i18n.getCurrentLocale());
  });
});

// --- Module References ---
// NOTE: All functionality is now defined in separate modules:
// - content/languages.js: WORLDWIDE_LANGUAGES, language selection functions
// - content/anti-detection.js: ANTI_DETECTION object
// - content/ai-integration.js: AI_INTEGRATION object
// - content/ai-response.js: getAIResponse function
// - content/profile-extraction.js: Profile and chat extraction functions
// - content/messaging.js: MESSAGING object and automation
// - content/swiping.js: Swiping logic and handlers
// - content/ui-render.js: All sidebar UI rendering functions

// --- Initialization ---
// Initialize i18n first
initializeI18n().then(() => {
  console.log('[Tinder AI] I18n initialized successfully');
}).catch(error => {
  console.error('[Tinder AI] Error initializing i18n:', error);
});

// Inject sidebar if on tinder.com
if (window.location.hostname.includes('tinder.com')) {
  injectSidebar();
  // Ensure Gemini is default if no AI is set
  setTimeout(() => {
    chrome.storage.local.get(['activeAI'], (result) => {
      if (!result.activeAI) {
        console.log('[Tinder AI] No active AI set, defaulting to Gemini');
        chrome.storage.local.set({ activeAI: 'gemini' });
        if (AI_INTEGRATION) AI_INTEGRATION.currentAI = 'gemini';
      }
    });
  }, 500);
} else {
  console.log('[Tinder AI] Not on Tinder.com, skipping sidebar injection');
}

// Load initial settings
function loadSwipingSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['swipeDelay', 'maxSwipes', 'likeRatio', 'swipeConfig'], (data) => {
      if (data.swipeConfig) {
        if (data.swipeConfig.swipeDelayMin && data.swipeConfig.swipeDelayMax) {
          SWIPE_DELAY_RANGE = [data.swipeConfig.swipeDelayMin, data.swipeConfig.swipeDelayMax];
        }
        if (data.swipeConfig.maxSwipes) {
          MAX_SESSION_SWIPES = data.swipeConfig.maxSwipes;
        }
        if (data.swipeConfig.likeRatio !== undefined) {
          currentFilters.likeRatio = data.swipeConfig.likeRatio;
        }
      } else {
        if (data.swipeDelay) {
          SWIPE_DELAY_RANGE = [data.swipeDelay, data.swipeDelay + 2000];
        }
        if (data.maxSwipes) {
          MAX_SESSION_SWIPES = data.maxSwipes;
        }
        if (data.likeRatio !== undefined) {
          currentFilters.likeRatio = data.likeRatio;
        }
      }
      console.log('[Tinder AI] Settings loaded:', { SWIPE_DELAY_RANGE, MAX_SESSION_SWIPES, likeRatio: currentFilters.likeRatio });
      resolve();
    });
  });
}

// Load initial settings
loadSwipingSettings();

// Update settings and apply them
function updateSettings(newSettings) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['swipeConfig'], (data) => {
      const currentConfig = data.swipeConfig || {
        swipeDelayMin: SWIPE_DELAY_RANGE[0],
        swipeDelayMax: SWIPE_DELAY_RANGE[1],
        maxSwipes: MAX_SESSION_SWIPES,
        likeRatio: currentFilters.likeRatio || 0.7
      };

      const updatedConfig = { ...currentConfig, ...newSettings };

      chrome.storage.local.set({ swipeConfig: updatedConfig }, () => {
        // Apply settings
        if (updatedConfig.swipeDelayMin && updatedConfig.swipeDelayMax) {
          SWIPE_DELAY_RANGE = [updatedConfig.swipeDelayMin, updatedConfig.swipeDelayMax];
        }
        if (updatedConfig.maxSwipes) {
          MAX_SESSION_SWIPES = updatedConfig.maxSwipes;
        }
        if (updatedConfig.likeRatio !== undefined) {
          currentFilters.likeRatio = updatedConfig.likeRatio;
        }

        console.log('[Tinder AI] Settings updated:', { SWIPE_DELAY_RANGE, MAX_SESSION_SWIPES, likeRatio: currentFilters.likeRatio });
        resolve();
      });
    });
  });
}

// --- Messaging Automation ---
// NOTE: MESSAGING is defined in content/messaging.js

// Setup manual message tracking for AI-generated messages
setupManualMessageTracking();

// --- Main Initialization Block ---
(async () => {
  console.log('[Tinder AI] Content script loaded, initializing...');

  // Check if extension context is valid
  if (!chrome.runtime?.id) {
    console.error('[Tinder AI] Extension context invalidated during initialization');
    return;
  }

  // Check for consent
  const data = await chrome.storage.local.get(['sidebarConsentGiven']);
  sidebarConsentGiven = data.sidebarConsentGiven === true;

  if (!sidebarConsentGiven) {
    console.log('[Tinder AI] Consent not given, showing consent overlay');
    showConsentOverlay();
  } else {
    console.log('[Tinder AI] Consent already given, skipping consent overlay');
  }

  // Initialize modules
  await ANTI_DETECTION.init();
  await AI_INTEGRATION.init();
  await MESSAGING.init();

  // Create persistent AI icon during initialization
  if (sidebarConsentGiven) {
    console.log('[Tinder AI][DEBUG] Calling createPersistentAIIcon() during initialization (consent given)');
    createPersistentAIIcon();
  } else {
    console.log('[Tinder AI][DEBUG] Consent not given, AI icon not shown');
  }

  // --- Centralized DOM Mutation Handler ---
  // To avoid performance crashes from multiple, aggressive MutationObservers,
  // we use a single, debounced observer to handle all DOM-related tasks.
  let domChangeTimeout;
  function handleDomChanges() {
    // Check for new matches and update UI elements
    if (typeof MESSAGING !== 'undefined') {
      MESSAGING.checkNewMatches();
    }

    // Update the magic wand buttons if they exist
    if (typeof injectWandButtons === 'function') {
      injectWandButtons();
    }

    // NOTE: Status tab updates are handled separately to prevent re-render loops
    // The status tab will update on tab click or after specific actions (swipe, message, etc.)

    // Update AI icon visibility based on consent
    if (typeof createPersistentAIIcon === 'function') {
      if (sidebarConsentGiven) {
        createPersistentAIIcon();
      }
    }
  }

  const observer = new MutationObserver(() => {
    clearTimeout(domChangeTimeout);
    domChangeTimeout = setTimeout(handleDomChanges, 500); // Debounce changes for 500ms
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Listen for storage changes (e.g., consent granted from another tab/context)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.sidebarConsentGiven) {
        sidebarConsentGiven = changes.sidebarConsentGiven.newValue === true;
        if (sidebarConsentGiven) {
          console.log('[Tinder AI] Consent granted via storage, initializing features...');
          createPersistentAIIcon();
          injectWandButtons();
          renderSidebarActiveTab();
        }
      }
    }
  });

  // Add global function to reset consent for testing
  window.resetSpicySwipeConsent = function () {
    chrome.storage.local.set({ sidebarConsentGiven: false }, () => {
      console.log('[Tinder AI] Consent reset. Refresh the page to see the consent overlay.');
      sidebarConsentGiven = false;
      // Remove AI icon
      const aiIcon = document.getElementById('ai-persistent-icon');
      if (aiIcon) aiIcon.remove();
    });
  };

  console.log('[Tinder AI] Consent reset function available: resetSpicySwipeConsent()');
})();

// Global cache for tone instructions
let cachedToneInstructions = null;
let cachedToneList = null;

// Load and cache tone instructions at startup
async function loadToneInstructions() {
  try {
    const url = chrome.runtime.getURL('tone_instructions.json');
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load tone instructions');
    const data = await response.json();
    cachedToneInstructions = data;
    cachedToneList = Object.keys(data).map(key => ({
      value: key,
      label: data[key].label || key.charAt(0).toUpperCase() + key.slice(1)
    }));
    console.log('[Tinder AI] Tone instructions loaded and cached:', cachedToneList.map(t => t.value).join(', '));
    return cachedToneInstructions;
  } catch (error) {
    console.error('[Tinder AI] Error loading tone instructions:', error);
    // Fallback to hardcoded list
    cachedToneList = [
      { value: 'witty', label: 'Witty' },
      { value: 'friendly', label: 'Friendly' },
      { value: 'romantic', label: 'Romantic' },
      { value: 'casual', label: 'Casual' },
      { value: 'playful', label: 'Playful' }
    ];
    return null;
  }
}

// Update all tone dropdowns to use the cached list
function getToneDropdownOptions(selectedTone) {
  if (!cachedToneList) return '';
  return cachedToneList.map(t => `<option value="${t.value}"${t.value === selectedTone ? ' selected' : ''}>${t.label}</option>`).join('');
}

// Load tone instructions on startup
loadToneInstructions();