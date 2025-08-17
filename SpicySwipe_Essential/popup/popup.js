// Minimal popup launcher for Tinder AI Extension

// Fallback translations in case i18n fails
const fallbackTranslations = {
  'popup.openTinder': 'Open Tinder to use SpicySwipe',
  'popup.openTinderButton': 'Open Tinder',
  'popup.sidebarAvailable': 'SpicySwipe is active!',
  'popup.sidebarInstructions': 'Use the sidebar to control AI features',
  'popup.supportDevelopment': 'Support Development'
};

// Simple translation function
function t(key) {
  // First try manually loaded translations
  if (window.popupTranslations && window.popupTranslations[key]) {
    return window.popupTranslations[key];
  }
  
  // Then try i18n
  if (typeof i18n !== 'undefined' && i18n.t) {
    return i18n.t(key);
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
    chrome.storage.local.get(['debugMode'], (res) => {
      const debugOn = !!res.debugMode;
      if (url.includes('tinder.com')) {
        content.innerHTML = `
          <div class="popup-title">${t('popup.sidebarAvailable')}</div>
          <div class="popup-desc">${t('popup.sidebarInstructions')}</div>
          <div class="popup-divider">
            <button id="donate-btn" class="popup-donate-btn">
              <span class="popup-coffee-emoji">☕</span>
              <span>${t('popup.supportDevelopment')}</span>
            </button>
          </div>
          <div class="popup-divider"></div>
          <div class="settings-label flex items-center" aria-label="${t('popup.debugTitle')}">
            <label class="switch" title="${t('popup.debugTitle')}">
              <input type="checkbox" id="debug-toggle" ${debugOn ? 'checked' : ''} aria-checked="${debugOn}" aria-label="${t('popup.debugTitle')}" />
              <span class="switch-slider"></span>
            </label>
            <span style="margin-left: 10px;">${t('popup.debugTitle')}</span>
          </div>
          <div class="stealth-panel-desc">${t('popup.debugDesc')}</div>
        `;
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
          <div class="popup-divider"></div>
          <div class="settings-label flex items-center" aria-label="${t('popup.debugTitle')}">
            <label class="switch" title="${t('popup.debugTitle')}">
              <input type="checkbox" id="debug-toggle" ${debugOn ? 'checked' : ''} aria-checked="${debugOn}" aria-label="${t('popup.debugTitle')}" />
              <span class="switch-slider"></span>
            </label>
            <span style="margin-left: 10px;">${t('popup.debugTitle')}</span>
          </div>
          <div class="stealth-panel-desc">${t('popup.debugDesc')}</div>
        `;
        document.getElementById('open-tinder-btn').onclick = () => {
          chrome.tabs.create({ url: 'https://tinder.com' });
        };
      }
      
      // Add click handler for donation button
      document.getElementById('donate-btn').onclick = () => {
        chrome.tabs.create({ url: 'https://coff.ee/soufienne' });
      };
      
      // Debug toggle change handler
      const debugToggle = document.getElementById('debug-toggle');
      if (debugToggle) {
        debugToggle.addEventListener('change', (e) => {
          const enabled = e.target.checked;
          chrome.storage.local.set({ debugMode: enabled });
        });
      }
      
      // Add elegant hover effects
      const donateBtn = document.getElementById('donate-btn');
      donateBtn.addEventListener('mouseenter', () => {
        donateBtn.classList.add('popup-btn-donate-hover');
      });
      donateBtn.addEventListener('mouseleave', () => {
        donateBtn.classList.remove('popup-btn-donate-hover');
      });
    });
  });
}