// content.js
// Main entry point - initialization only
// All logic functions are in content/*.js modules

// --- Config & Global State ---
// --- Config & Global State ---
// Migrated to StateStore (content/state.js)
// Keeping core runtime flags
// Migrated to StateStore (content/state.js)
// Keeping core runtime flags (Mapped to stateStore)
let sidebarActiveTab = 'status';
let sidebarConsentGiven = false;


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

// Initialize i18n promise to be awaited
const i18nInitPromise = initializeI18n().then((success) => {
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
// Initialize i18n via promise defined above
i18nInitPromise.catch(error => {
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
// Legacy settings functions removed. Use stateStore.get('swipeConfig') instead.

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

  // Initialize State Store first!
  await stateStore.init();
  console.log('[Tinder AI] State Store initialized');

  // Wait for i18n to be ready before showing any UI
  await i18nInitPromise;

  // Check for consent from StateStore
  sidebarConsentGiven = stateStore.get('sidebarConsentGiven') === true;

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
    // Launch Wizard if needed
    if (typeof SpicySwipeWizard !== 'undefined') {
      SpicySwipeWizard.init();
    }
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
    // With idempotent rendering in Sidebar.js, we can now safely update Status tab to detect new profiles
    if (typeof window.sidebarActiveTab !== 'undefined' && window.sidebarActiveTab === 'status' && sidebarConsentGiven) {
      if (typeof renderSidebarActiveTab === 'function') {
        renderSidebarActiveTab();
      }
    }

    // Update AI icon visibility based on consent
    if (typeof createPersistentAIIcon === 'function') {
      if (sidebarConsentGiven) {
        createPersistentAIIcon();
      }
    }

    // Attach Voice Input if consent given and function exists
    if (sidebarConsentGiven && typeof attachVoiceInput === 'function') {
      attachVoiceInput();
    }

    // Auto-attach Smart Match Scores (now independent of Sidebar state)
    if (sidebarConsentGiven && typeof window.scanAndAttachScores === 'function') {
      window.scanAndAttachScores();
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
    chrome.storage.local.set({
      sidebarConsentGiven: false,
      hasCompletedOnboarding: false
    }, () => {
      console.log('[Tinder AI] Consent and Onboarding status reset (Atomic). Refresh the page to see the consent overlay.');
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

// --- Background Service Worker Heartbeat Keep-Alive ---
setInterval(() => {
  if (chrome.runtime && chrome.runtime.id) {
    chrome.runtime.sendMessage({ type: 'heartbeat' }, response => {
      if (chrome.runtime.lastError) {
        // Silently handle sw reconnects
      }
    });
  }
}, 25000);