// Internationalization (i18n) utility for SpicySwipe extension

class I18n {
  constructor() {
    this.currentLocale = 'en';
    this.translations = {};
    this.fallbackTranslations = {}; // Store English translations for fallback
    this.fallbackLocale = 'en';
    this.supportedLocales = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ar', 'zh', 'ko', 'ja'];
  }

  // Initialize i18n with browser language detection
  async init() {
    try {
      // Always load English translations first for fallback
      await this.loadFallbackTranslations();
      
      // Load user's saved language preference first
      await this.loadUserPreference();
      
      // If no saved preference, detect browser language
      if (this.currentLocale === 'en') {
        const browserLang = navigator.language || navigator.userLanguage || 'en';
        const detectedLocale = this.detectLocale(browserLang);
        
        // Load translations for detected locale
        await this.loadTranslations(detectedLocale);
      }
      
      console.log(`[I18n] Initialized with locale: ${this.currentLocale}`);
    } catch (error) {
      console.error('[I18n] Error initializing i18n:', error);
      // Fallback to English
      await this.loadTranslations(this.fallbackLocale);
    }
  }

  // Load English translations for fallback
  async loadFallbackTranslations() {
    try {
      const response = await fetch(chrome.runtime.getURL(`locales/${this.fallbackLocale}.json`));
      if (response.ok) {
        this.fallbackTranslations = await response.json();
        console.log(`[I18n] Loaded fallback translations for locale: ${this.fallbackLocale}`);
      }
    } catch (error) {
      console.error(`[I18n] Error loading fallback translations:`, error);
    }
  }

  // Detect the best locale from browser language
  detectLocale(browserLang) {
    // Extract language code (e.g., 'en-US' -> 'en')
    const langCode = browserLang.split('-')[0].toLowerCase();
    
    // Check if we support this language
    if (this.supportedLocales.includes(langCode)) {
      return langCode;
    }
    
    // Fallback to English
    return this.fallbackLocale;
  }

  // Load translations for a specific locale
  async loadTranslations(locale) {
    try {
      const response = await fetch(chrome.runtime.getURL(`locales/${locale}.json`));
      if (!response.ok) {
        throw new Error(`Failed to load ${locale} translations`);
      }
      
      this.translations = await response.json();
      this.currentLocale = locale;
      
      // Save user's language preference
      chrome.storage.local.set({ userLanguage: locale });
      
      console.log(`[I18n] Loaded translations for locale: ${locale}`);
    } catch (error) {
      console.error(`[I18n] Error loading ${locale} translations:`, error);
      
      // Try to load fallback locale
      if (locale !== this.fallbackLocale) {
        await this.loadTranslations(this.fallbackLocale);
      } else {
        // If even fallback fails, use empty translations
        this.translations = {};
      }
    }
  }

  // Change language dynamically
  async changeLanguage(locale) {
    if (this.supportedLocales.includes(locale)) {
      await this.loadTranslations(locale);
      // Trigger UI update
      this.updateUI();
    }
  }

  // Get translation for a key
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if translation not found
        console.warn(`[I18n] Translation key not found: ${key} in locale: ${this.currentLocale}`);
        const fallbackValue = this.getFallbackTranslation(key);
        return fallbackValue || key;
      }
    }
    
    if (typeof value === 'string') {
      // Replace parameters in the translation
      return value.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] !== undefined ? params[param] : match;
      });
    }
    
    return value || key;
  }

  // Get fallback translation from English
  getFallbackTranslation(key) {
    const keys = key.split('.');
    let value = this.fallbackTranslations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }
    
    return value;
  }

  // Get current locale
  getCurrentLocale() {
    return this.currentLocale;
  }

  // Get supported locales
  getSupportedLocales() {
    return this.supportedLocales;
  }

  // Get locale display name
  getLocaleDisplayName(locale) {
    const displayNames = {
      'en': 'English',
      'fr': 'Français',
      'es': 'Español',
      'de': 'Deutsch',
      'it': 'Italiano',
      'pt': 'Português',
      'ar': 'العربية',
      'zh': '中文',
      'ko': '한국어',
      'ja': '日本語'
    };
    return displayNames[locale] || locale;
  }

  // Update UI elements with new translations
  updateUI() {
    // This will be called when language changes
    // Trigger a custom event that other parts of the app can listen to
    document.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { locale: this.currentLocale }
    }));
  }

  // Load user's saved language preference
  async loadUserPreference() {
    try {
      const result = await chrome.storage.local.get(['userLanguage']);
      if (result.userLanguage && this.supportedLocales.includes(result.userLanguage)) {
        await this.loadTranslations(result.userLanguage);
      }
    } catch (error) {
      console.error('[I18n] Error loading user preference:', error);
    }
  }
}

// Create global instance
const i18n = new I18n();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = i18n;
}