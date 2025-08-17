// --- Debug Mode --- 
let debugMode = false;
const logBuffer = [];
const originalConsole = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
};

const consoleHandler = (type) => (...args) => {
    if (debugMode) {
        originalConsole[type](...args);
    } else {
        logBuffer.push({ type, args });
    }
};

console.log = consoleHandler('log');
console.error = consoleHandler('error');
console.warn = consoleHandler('warn');
console.info = consoleHandler('info');
console.debug = consoleHandler('debug');

chrome.storage.local.get('debugMode', (result) => {
    debugMode = !!result.debugMode;
    if (debugMode) {
        // Flush buffer
        logBuffer.forEach(log => originalConsole[log.type](...log.args));
        logBuffer.length = 0; // Clear buffer
    } else {
        // Clear buffer without logging
        logBuffer.length = 0;
    }
});

// Minimal popup launcher for Tinder AI Extension

// Fallback translations in case i18n fails
const fallbackTranslations = {
  'popup.openTinder': 'Open Tinder to use SpicySwipe',
  'popup.openTinderButton': 'Open Tinder',
  'popup.sidebarAvailable': 'SpicySwipe is active!',
  'popup.sidebarInstructions': 'Use the sidebar to control AI features',
  'popup.supportDevelopment': 'Support Development',
  'popup.debugMode': 'Debug Mode'
};

// Simple translation function
function t(key) {
  const keys = key.split('.');
  let current = window.popupTranslations;

  // Try manually loaded translations with nesting
  if (current) {
    for (let i = 0; i < keys.length; i++) {
      if (current[keys[i]] !== undefined) {
        current = current[keys[i]];
      } else {
        current = null;
        break;
      }
    }
    if (typeof current === 'string') {
      return current;
    }
  }

  // Then try i18n
  if (typeof i18n !== 'undefined' && i18n.t) {
    const translation = i18n.t(key);
    if (translation !== key) return translation;
  }

  // Fallback to English
  return fallbackTranslations[key] || key;
}

// Manual translation loading for popup
async function loadPopupTranslations() {
  try {
    // Get user's saved language preference
    const result = await chrome.storage.local.get(['userLanguage']);
    const locale = result.userLanguage || 'en';
    console.log('[Popup] Loading translations for locale:', locale);
    
    // Load translation file
    const url = chrome.runtime.getURL(`locales/${locale}.json`);
    console.log('[Popup] Translation URL:', url);
    const response = await fetch(url);
    console.log('[Popup] Response status:', response.status);
    if (response.ok) {
      const translations = await response.json();
      console.log('[Popup] Loaded translations:', translations);
      return translations;
    }
  } catch (error) {
    console.error('[Popup] Error loading translations:', error);
  }
  return null;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Load translations manually for popup
  const translations = await loadPopupTranslations();
  if (translations) {
    // Override the t function to use loaded translations
    window.popupTranslations = translations;
  }
  
  // Initialize i18n (for compatibility)
  try {
    await i18n.init();
    // Load user's saved language preference
    await i18n.loadUserPreference();
    console.log('[Popup] I18n initialized with locale:', i18n.getCurrentLocale());
  } catch (error) {
    console.error('[Popup] Error initializing i18n:', error);
  }
  
  // Render popup content
  renderPopupContent();
});

function renderPopupContent() {
  const content = document.getElementById('popup-content');
  
  // Debug: Check if i18n is available
  console.log('[Popup] i18n available:', typeof i18n !== 'undefined');
  console.log('[Popup] Current locale:', i18n ? i18n.getCurrentLocale() : 'i18n not available');
  console.log('[Popup] Translation test:', t('popup.openTinder'));
  
  // Check if current tab is Tinder.com
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const url = tabs[0]?.url || '';
    if (url.includes('tinder.com')) {
      content.innerHTML = `
       <div class="popup-title">${t('popup.sidebarAvailable')}</div>
<div class="popup-desc">${t('popup.sidebarInstructions')}</div>
<div class="popup-divider"></div>
<div class="popup-setting">
  <span class="popup-setting-label">${t('popup.debugMode')}</span>
  <label class="switch">
    <input type="checkbox" id="debug-switch">
    <span class="slider round"></span>
  </label>
</div>
<div class="popup-divider">
<button id="donate-btn" class="popup-donate-btn">
<span class="popup-coffee-emoji">☕</span>
            <span>${t('popup.supportDevelopment')}</span>
          </button>
        </div>
      `;

      const debugSwitch = document.getElementById('debug-switch');

      // Load saved state
      chrome.storage.local.get('debugMode', (result) => {
        debugSwitch.checked = !!result.debugMode;
      });

      // Save state on change
      debugSwitch.addEventListener('change', (event) => {
        chrome.storage.local.set({ debugMode: event.target.checked });
      });
    } else {
      content.innerHTML = `
        <div><img src="../assets/tinder-icon.png" alt="Tinder" class="popup-img" /></div>
        <div class="popup-title">${t('popup.openTinder')}</div>
        <button id="open-tinder-btn" class="popup-btn">${t('popup.openTinderButton')}</button>
       <div class="popup-divider">
         <button id="donate-btn" class="popup-donate-btn">
           <span class="popup-coffee-emoji">☕</span>
            <span>${t('popup.supportDevelopment')}</span>
          </button>
        </div>
      `;
      document.getElementById('open-tinder-btn').onclick = () => {
        chrome.tabs.create({ url: 'https://tinder.com' });
      };
    }
    
    // Add click handler for donation button
    document.getElementById('donate-btn').onclick = () => {
      chrome.tabs.create({ url: 'https://coff.ee/soufienne' });
    };
    
    // Add elegant hover effects
    const donateBtn = document.getElementById('donate-btn');
    donateBtn.addEventListener('mouseenter', () => {
      donateBtn.classList.add('popup-btn-donate-hover');
    });
    donateBtn.addEventListener('mouseleave', () => {
      donateBtn.classList.remove('popup-btn-donate-hover');
    });
  });
} 