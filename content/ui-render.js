// content/ui-render.js
// UI Rendering and Management

// Update language selector with current language
function updateLanguageSelector() {
  const languageSelector = document.getElementById('language-selector');
  if (languageSelector) {
    languageSelector.value = i18n.getCurrentLocale();
    console.log('[Tinder AI] Updated language selector to:', i18n.getCurrentLocale());
  }
}

// --- Helper Functions ---
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}





// --- Profile Management ---
// Removed expandProfile function entirely

function extractProfileInfo() {
  console.log('Extracting profile info...');
  // Find the card stack container
  const stack = document.querySelector('.recsCardboard__cardsContainer, .recsCardboard__cards');
  if (!stack) {
    console.log('No card stack found');
    return null;
  }
  // Get all profile cards in the stack
  const allCards = Array.from(stack.querySelectorAll('div[data-keyboard-gamepad]'));
  // Pick the last one that is not inert and not aria-hidden="true"
  let card = allCards.slice().reverse().find(card =>
    !card.hasAttribute('inert') && card.getAttribute('aria-hidden') !== 'true'
  );
  if (!card) {
    // Fallback: just use the last card
    card = allCards[allCards.length - 1];
  }
  if (!card) {
    console.log('No visible card element found');
    return null;
  }
  // Debug: print card HTML
  console.log('CARD HTML:', card.innerHTML);
  try {
    // Name and age (improved selectors)
    let name = 'Unknown';
    let age = null;
    const nameSpan = card.querySelector('span[itemprop="name"]');
    const ageSpan = card.querySelector('span[itemprop="age"]');
    console.log('Name span:', nameSpan ? nameSpan.outerHTML : 'NOT FOUND');
    console.log('Age span:', ageSpan ? ageSpan.outerHTML : 'NOT FOUND');
    if (nameSpan) name = nameSpan.textContent.trim();
    if (ageSpan) age = parseInt(ageSpan.textContent.trim());

    // Main photo (background-image style)
    let photo = '';
    const bgDiv = card.querySelector('div[style*="background-image"]');
    if (bgDiv) {
      const bg = bgDiv.style.backgroundImage;
      const urlMatch = bg.match(/url\(["']?(.*?)["']?\)/);
      if (urlMatch && urlMatch[1]) {
        photo = urlMatch[1];
      }
      console.log('Photo background div:', bgDiv.outerHTML, 'Extracted photo URL:', photo);
    } else {
      console.log('No background-image div found for photo');
    }

    // Tags/interests (log all possible tag elements)
    const interests = [];
    const tagElements = card.querySelectorAll('div[class*="tag"], div[class*="badge"], div[class*="interest"]');
    console.log('Tag elements found:', tagElements.length);
    tagElements.forEach(el => {
      const tag = el.textContent.trim();
      console.log('Tag element:', el.outerHTML, 'Tag:', tag);
      if (tag && !interests.includes(tag)) {
        interests.push(tag);
      }
    });
    const cardData = { name, age, photo, interests, timestamp: new Date().toISOString() };
    console.log('Extracted card data:', cardData);
    return cardData;
  } catch (error) {
    console.error('Error extracting profile info from card:', error);
    return null;
  }
}

// --- Swiping Logic ---
// NOTE: makeDecision, handleSwipeError, performSwipe, getDynamicSwipeDelay, 
// automateSwiping, handleStartSwiping, handleStopSwiping, handleManualLike, 
// handleManualNope are defined in content/swiping.js

// --- Anti-Detection & AI Integration ---
// NOTE: ANTI_DETECTION is defined in content/anti-detection.js
// NOTE: AI_INTEGRATION is defined in content/ai-integration.js

// --- UI Management ---
function renderSidebarActiveTab() {
  if (sidebarActiveTab === 'status') {
    renderSidebarStatusTab(sidebarConsentGiven);
  } else if (sidebarActiveTab === 'ai') {
    renderSidebarAITab(sidebarConsentGiven);
  } else if (sidebarActiveTab === 'swiping') {
    renderSidebarSwipingTab(sidebarConsentGiven);
  } else if (sidebarActiveTab === 'analytics') {
    renderSidebarAnalyticsTab(sidebarConsentGiven);
  }
}

function renderSidebarStatusTab(enabled) {
  // Always sync analytics with sessionAnalytics from storage and reset daily if needed
  chrome.storage.local.get(['sessionAnalytics'], (data) => {
    let sessionAnalytics = data.sessionAnalytics || { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: getTodayDateString() };
    if (!sessionAnalytics.date || sessionAnalytics.date !== getTodayDateString()) {
      sessionAnalytics = { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: getTodayDateString() };
      chrome.storage.local.set({ sessionAnalytics });
    }
    // Sync in-memory analytics
    analytics = { swipes: sessionAnalytics.swipes, likes: sessionAnalytics.likes, nopes: sessionAnalytics.nopes, skips: sessionAnalytics.skips, matches: sessionAnalytics.matches, messages: sessionAnalytics.messages };

    const panel = document.getElementById('sidebar-tab-status');
    if (!panel) return;
    panel.innerHTML = '';

    // Profile preview
    let profileHTML = '';
    const profile = window.currentProfile || extractProfileInfo();
    if (profile && profile.photo) {
      profileHTML = `<div class="sidebar-profile-preview">\n      <img src="${profile.photo}" alt="Profile" class="sidebar-profile-photo">\n      <div class="sidebar-profile-name">${profile.name || 'Unknown'}</div>\n      ${profile.age ? `<div class=\"sidebar-profile-age\">${profile.age} years old</div>` : ''}\n      ${profile.interests && profile.interests.length > 0 ? `<div class=\"sidebar-profile-interests\">${profile.interests.map(interest => `<span class=\\"sidebar-profile-interest\\">${interest}</span>`).join('')}` : ''}\n    </div>`;
    } else {
      profileHTML = `<div class="sidebar-profile-photo-placeholder">No Photo</div>`;
    }

    // Stats box
    const statsBox = `<div class="sidebar-box">
      <div class="sidebar-box-header">
        <span>${i18n.t('analytics.today')}</span>
      </div>
      <div class="sidebar-box-body">
        <div>${i18n.t('analytics.swipes')}: ${analytics.swipes}</div>
        <div>${i18n.t('analytics.likes')}: ${analytics.likes}</div>
        <div>${i18n.t('analytics.nopes')}: ${analytics.nopes}</div>
        <div>${i18n.t('analytics.matches')}: ${analytics.matches}</div>
        <div>${i18n.t('analytics.messages')}: ${analytics.messages}</div>
        <div>${i18n.t('swiping.likeRatio')}: ${analytics.swipes ? ((analytics.likes / analytics.swipes) * 100).toFixed(1) : 0}%</div>
      </div>
    </div>`;

    // Stealth mode toggle
    const stealthBox = `<div class="sidebar-box">
      <div class="sidebar-box-header">
        <span>${i18n.t('swiping.stealthMode')}</span>
      </div>
      <div class="sidebar-box-body">
        <label class="settings-label flex items-center">
          <input type="checkbox" id="stealth-mode" ${ANTI_DETECTION.stealthMode ? 'checked' : ''} class="mr-2">
          ${i18n.t('swiping.stealthMode')}
        </label>
        <div class="stealth-panel-desc">${i18n.t('swiping.stealthModeDesc')}</div>
      </div>
    </div>`;

    // Always fetch latest settings from storage
    chrome.storage.local.get(['swipeConfig', 'messagingConfig'], ({ swipeConfig, messagingConfig }) => {
      const _swipeConfig = swipeConfig || { maxSwipes: 30, likeRatio: 0.7 };
      const _messagingConfig = messagingConfig || { tone: 'friendly', autoSend: false };
      const settingsBox = `<div class="sidebar-box">
        <div class="sidebar-box-header">
          <span>${i18n.t('status.title')}</span>
        </div>
        <div class="sidebar-box-body">
            <div>${i18n.t('swiping.maxSwipes')}: ${_swipeConfig.maxSwipes}</div>
            <div>${i18n.t('swiping.likeRatio')}: ${Math.round((_swipeConfig.likeRatio) * 100)}%</div>
            <div>${i18n.t('ai.messaging.tone')}: ${_messagingConfig.tone}</div>
            <div>${i18n.t('ai.messaging.autoSend')}: ${_messagingConfig.autoSend ? 'Yes' : 'No'}</div>
        </div>
      </div>`;

      // Page status/warning
      const currentPath = window.location.pathname;
      const isOnSwipingPage = currentPath.includes('/app/recs') ||
        currentPath.includes('/app/explore') ||
        currentPath.includes('/app/discover') ||
        currentPath.includes('/app/matches') ||
        currentPath === '/app' ||
        currentPath === '/';
      const pageStatusHTML = !isOnSwipingPage ? `<div class="sidebar-warning">
        <div class="sidebar-warning-header">⚠️ ${i18n.t('notifications.warning')}</div>
        <div class="sidebar-warning-text">Auto-swiping works on the Discover/Explore page. Navigate there to use the Start button.</div>
      </div>` : '';

      // Control buttons
      const controlsDisabled = !enabled;
      const startDisabled = controlsDisabled || sessionActive;
      const stopDisabled = controlsDisabled || !sessionActive;
      const btnRow = `<div class="sidebar-btn-row">
        <button id="sidebar-start-btn" class="main-btn btn-start${startDisabled ? ' btn-disabled' : ''}" ${startDisabled ? 'disabled' : ''}>▶️ ${i18n.t('swiping.startSwiping')}</button>
        <button id="sidebar-stop-btn" class="main-btn btn-stop${stopDisabled ? ' btn-disabled' : ''}" ${stopDisabled ? 'disabled' : ''}>⏹️ ${i18n.t('swiping.stopSwiping')}</button>
        <button id="sidebar-like-btn" class="swipe-btn btn-like${controlsDisabled ? ' btn-disabled' : ''}" ${controlsDisabled ? 'disabled' : ''}>👍 ${i18n.t('buttons.like')}</button>
        <button id="sidebar-dislike-btn" class="swipe-btn btn-nope${controlsDisabled ? ' btn-disabled' : ''}" ${controlsDisabled ? 'disabled' : ''}>👎 ${i18n.t('buttons.nope')}</button>
      </div>`;

      panel.innerHTML = `
        <div class="sidebar-profile-preview sidebar-section-spacing">${profileHTML}</div>
        <div class="sidebar-section-spacing">${statsBox}</div>
        <div class="sidebar-section-spacing">${stealthBox}</div>
        <div class="sidebar-section-spacing">${settingsBox}</div>
        ${pageStatusHTML}
        ${btnRow}
      `;

      // Add event listeners for controls
      const startBtn = document.getElementById('sidebar-start-btn');
      const stopBtn = document.getElementById('sidebar-stop-btn');
      const likeBtn = document.getElementById('sidebar-like-btn');
      const dislikeBtn = document.getElementById('sidebar-dislike-btn');
      if (startBtn && !startDisabled) startBtn.onclick = () => { handleStartSwiping(); setTimeout(() => renderSidebarStatusTab(enabled), 100); };
      if (stopBtn && !stopDisabled) stopBtn.onclick = () => { handleStopSwiping(); setTimeout(() => renderSidebarStatusTab(enabled), 100); };
      if (likeBtn && !controlsDisabled) likeBtn.onclick = () => handleManualLike();
      if (dislikeBtn && !controlsDisabled) dislikeBtn.onclick = () => handleManualNope();
      // Stealth mode checkbox event handler
      const stealthCheckbox = document.getElementById('stealth-mode');
      if (stealthCheckbox) {
        stealthCheckbox.addEventListener('change', (e) => {
          ANTI_DETECTION.toggleStealthMode(e.target.checked);
        });
      }
    });
  });
}

// NOTE: setupSettingsEventListeners is defined later in the file (around line 4500)
// with full support for all AI provider API keys

// AI Tab - Full Implementation
function renderSidebarAITab(enabled) {
  const aiPanel = document.getElementById('sidebar-tab-ai');
  if (!aiPanel) return;
  if (!chrome.runtime?.id) return;

  chrome.storage.local.get([
    'activeAI', 'geminiFreeApiKey', 'geminiProApiKey', 'openaiApiKey', 'deepseekApiKey', 'anthropicApiKey',
    'messagingConfig', 'selectedLanguages'
  ], (data) => {
    if (!chrome.runtime?.id) return;

    const selectedAI = data.activeAI || 'gemini';
    const messagingConfig = data.messagingConfig || { tone: 'friendly', autoSend: false, autoMessageOnMatch: false, language: 'en' };
    const selectedLanguages = data.selectedLanguages || ['en', 'es', 'fr', 'de', 'it', 'pt', 'ar', 'zh', 'ja', 'ko', 'hi'];

    // Get API key for current model
    let currentApiKey = '';
    let apiKeyLabel = 'Gemini Free API Key';
    if (selectedAI === 'gemini') {
      currentApiKey = data.geminiFreeApiKey || '';
      apiKeyLabel = 'Gemini Free API Key';
    } else if (selectedAI === 'gemini-pro') {
      currentApiKey = data.geminiProApiKey || '';
      apiKeyLabel = 'Gemini Pro API Key';
    } else if (selectedAI === 'chatgpt') {
      currentApiKey = data.openaiApiKey || '';
      apiKeyLabel = 'OpenAI API Key';
    } else if (selectedAI === 'deepseek') {
      currentApiKey = data.deepseekApiKey || '';
      apiKeyLabel = 'DeepSeek API Key';
    } else if (selectedAI === 'claude') {
      currentApiKey = data.anthropicApiKey || '';
      apiKeyLabel = 'Anthropic API Key';
    }

    // Build AI settings HTML
    const aiSettingsHTML = `
      <div class="sidebar-box">
        <div class="sidebar-box-header">${i18n.t('ai.title') || 'AI Settings'}</div>
        <div class="sidebar-box-body">
          <div class="settings-row">
            <label class="settings-label">${i18n.t('ai.model') || 'AI Model'}</label>
            <select id="ai-model-select" class="settings-select">
              <option value="gemini" ${selectedAI === 'gemini' ? 'selected' : ''}>Google Gemini (Free)</option>
              <option value="gemini-pro" ${selectedAI === 'gemini-pro' ? 'selected' : ''}>Google Gemini Pro</option>
              <option value="chatgpt" ${selectedAI === 'chatgpt' ? 'selected' : ''}>ChatGPT (GPT-4o)</option>
              <option value="deepseek" ${selectedAI === 'deepseek' ? 'selected' : ''}>DeepSeek</option>
              <option value="claude" ${selectedAI === 'claude' ? 'selected' : ''}>Claude (Anthropic)</option>
            </select>
          </div>
          <div class="settings-row" id="api-key-row">
            <label class="settings-label" id="api-key-label">${apiKeyLabel}</label>
            <input type="password" id="ai-api-key-input" class="settings-input" value="${currentApiKey}" placeholder="Enter API key">
          </div>
        </div>
      </div>
    `;

    // Build messaging settings HTML
    const tones = [
      { value: 'witty', label: 'Witty' },
      { value: 'friendly', label: 'Friendly' },
      { value: 'romantic', label: 'Romantic' },
      { value: 'casual', label: 'Casual' },
      { value: 'playful', label: 'Playful' },
      { value: 'flirty', label: 'Flirty' },
      { value: 'confident', label: 'Confident' },
      { value: 'humorous', label: 'Humorous' }
    ];

    const toneOptions = tones.map(t =>
      `<option value="${t.value}" ${messagingConfig.tone === t.value ? 'selected' : ''}>${t.label}</option>`
    ).join('');

    // Convert WORLDWIDE_LANGUAGES object to array format
    let languages = [];
    if (typeof WORLDWIDE_LANGUAGES !== 'undefined' && typeof WORLDWIDE_LANGUAGES === 'object') {
      languages = Object.entries(WORLDWIDE_LANGUAGES).map(([code, lang]) => ({
        code: code,
        name: lang.name,
        nativeName: lang.native
      }));
    } else {
      languages = [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'es', name: 'Spanish', nativeName: 'Español' },
        { code: 'fr', name: 'French', nativeName: 'Français' }
      ];
    }

    const languageOptions = languages.map(l =>
      `<option value="${l.code}" ${messagingConfig.language === l.code ? 'selected' : ''}>${l.name} (${l.nativeName})</option>`
    ).join('');

    const messagingSettingsHTML = `
      <div class="sidebar-box">
        <div class="sidebar-box-header">${i18n.t('ai.messaging.title') || 'Messaging Settings'}</div>
        <div class="sidebar-box-body">
          <div class="settings-row">
            <label class="settings-label">${i18n.t('ai.messaging.tone') || 'Tone'}</label>
            <select id="messaging-tone-select" class="settings-select">${toneOptions}</select>
          </div>
          <div class="settings-row">
            <label class="settings-label">${i18n.t('ai.messaging.language') || 'Language'}</label>
            <select id="messaging-language-select" class="settings-select">${languageOptions}</select>
          </div>
          <div class="settings-row">
            <label class="settings-label flex items-center">
              <input type="checkbox" id="auto-send-checkbox" ${messagingConfig.autoSend ? 'checked' : ''} class="mr-2">
              ${i18n.t('ai.messaging.autoSend') || 'Auto Send'}
            </label>
          </div>
          <div class="settings-row">
            <label class="settings-label flex items-center">
              <input type="checkbox" id="auto-message-match-checkbox" ${messagingConfig.autoMessageOnMatch ? 'checked' : ''} class="mr-2">
              ${i18n.t('ai.messaging.autoMessageOnMatch') || 'Auto Message on Match'}
            </label>
          </div>
        </div>
      </div>
    `;

    // Build language preferences HTML
    const languagePrefsHTML = `
      <div class="sidebar-box">
        <div class="sidebar-box-header collapsible" id="language-prefs-header" style="cursor: pointer;">
          ${i18n.t('ai.languagePreferences.title') || 'Language Preferences'} <span class="collapse-icon">▲</span>
        </div>
        <div class="sidebar-box-body" id="language-prefs-body">
          <div class="language-checkbox-list" style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
            ${languages.slice(0, 30).map(l => `
              <label class="language-checkbox-item" style="display: flex; align-items: center; gap: 8px; padding: 4px 0; cursor: pointer;">
                <input type="checkbox" value="${l.code}" ${selectedLanguages.includes(l.code) ? 'checked' : ''} class="lang-checkbox">
                <span>${l.name} (${l.nativeName})</span>
              </label>
            `).join('')}
          </div>
          <div class="language-btn-row" style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="select-all-langs" class="small-btn primary" style="padding: 6px 12px; font-size: 12px; border-radius: 4px; background: #6366f1; color: white; border: none; cursor: pointer;">Select All</button>
            <button id="clear-all-langs" class="small-btn secondary" style="padding: 6px 12px; font-size: 12px; border-radius: 4px; background: #f3f4f6; color: #374151; border: none; cursor: pointer;">Clear All</button>
            <button id="reset-langs" class="small-btn secondary" style="padding: 6px 12px; font-size: 12px; border-radius: 4px; background: #fef2f2; color: #dc2626; border: none; cursor: pointer;">Reset to Default</button>
          </div>
          <div class="selected-count" style="margin-top: 8px; font-size: 12px; color: #666;">
            Selected: ${selectedLanguages.length} languages selected
          </div>
        </div>
      </div>
    `;

    // Build save button
    const saveButtonHTML = `
      <button id="ai-settings-save-btn" class="main-btn btn-start" style="width: 100%; margin-top: 16px;">
        ${i18n.t('buttons.save') || 'Save'}
      </button>
    `;

    aiPanel.innerHTML = `
      <div class="sidebar-panel-content">
        ${aiSettingsHTML}
        ${messagingSettingsHTML}
        ${languagePrefsHTML}
        ${saveButtonHTML}
      </div>
    `;

    // Set up event listeners
    setupAITabEventListeners(data);
  });
}

// Set up event listeners for AI tab
function setupAITabEventListeners(initialData) {
  // Model change - update API key label and field
  const modelSelect = document.getElementById('ai-model-select');
  if (modelSelect) {
    modelSelect.addEventListener('change', (e) => {
      const model = e.target.value;
      const apiKeyLabel = document.getElementById('api-key-label');
      const apiKeyInput = document.getElementById('ai-api-key-input');

      chrome.storage.local.get(['geminiFreeApiKey', 'geminiProApiKey', 'openaiApiKey', 'deepseekApiKey', 'anthropicApiKey'], (data) => {
        if (model === 'gemini') {
          apiKeyLabel.textContent = 'Gemini Free API Key';
          apiKeyInput.value = data.geminiFreeApiKey || '';
        } else if (model === 'gemini-pro') {
          apiKeyLabel.textContent = 'Gemini Pro API Key';
          apiKeyInput.value = data.geminiProApiKey || '';
        } else if (model === 'chatgpt') {
          apiKeyLabel.textContent = 'OpenAI API Key';
          apiKeyInput.value = data.openaiApiKey || '';
        } else if (model === 'deepseek') {
          apiKeyLabel.textContent = 'DeepSeek API Key';
          apiKeyInput.value = data.deepseekApiKey || '';
        } else if (model === 'claude') {
          apiKeyLabel.textContent = 'Anthropic API Key';
          apiKeyInput.value = data.anthropicApiKey || '';
        }
      });
    });
  }

  // Save button
  const saveBtn = document.getElementById('ai-settings-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const model = document.getElementById('ai-model-select')?.value || 'gemini';
      const apiKey = document.getElementById('ai-api-key-input')?.value || '';
      const tone = document.getElementById('messaging-tone-select')?.value || 'friendly';
      const language = document.getElementById('messaging-language-select')?.value || 'en';
      const autoSend = document.getElementById('auto-send-checkbox')?.checked || false;
      const autoMessageOnMatch = document.getElementById('auto-message-match-checkbox')?.checked || false;

      // Get selected languages
      const langCheckboxes = document.querySelectorAll('.lang-checkbox:checked');
      const selectedLanguages = Array.from(langCheckboxes).map(cb => cb.value);

      // Build storage object
      const storageObj = {
        activeAI: model,
        messagingConfig: { tone, language, autoSend, autoMessageOnMatch },
        selectedLanguages
      };

      // Add API key based on model
      if (model === 'gemini') storageObj.geminiFreeApiKey = apiKey;
      else if (model === 'gemini-pro') storageObj.geminiProApiKey = apiKey;
      else if (model === 'chatgpt') storageObj.openaiApiKey = apiKey;
      else if (model === 'deepseek') storageObj.deepseekApiKey = apiKey;
      else if (model === 'claude') storageObj.anthropicApiKey = apiKey;

      chrome.storage.local.set(storageObj, () => {
        console.log('[Tinder AI] AI settings saved:', storageObj);
        if (typeof AI_INTEGRATION !== 'undefined') {
          AI_INTEGRATION.currentAI = model;
        }
        saveBtn.textContent = '✓ Saved!';
        saveBtn.style.background = '#10b981';
        setTimeout(() => {
          saveBtn.textContent = i18n.t('buttons.save') || 'Save';
          saveBtn.style.background = '';
        }, 2000);
      });
    });
  }

  // Language collapse toggle
  const langHeader = document.getElementById('language-prefs-header');
  if (langHeader) {
    langHeader.addEventListener('click', () => {
      const body = document.getElementById('language-prefs-body');
      const icon = langHeader.querySelector('.collapse-icon');
      if (body.style.display === 'none') {
        body.style.display = 'block';
        icon.textContent = '▲';
      } else {
        body.style.display = 'none';
        icon.textContent = '▼';
      }
    });
  }

  // Select all languages
  const selectAllBtn = document.getElementById('select-all-langs');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.lang-checkbox').forEach(cb => cb.checked = true);
      updateSelectedCount();
    });
  }

  // Clear all languages
  const clearAllBtn = document.getElementById('clear-all-langs');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.lang-checkbox').forEach(cb => cb.checked = false);
      updateSelectedCount();
    });
  }

  // Reset to default languages
  const resetBtn = document.getElementById('reset-langs');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const defaults = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ar', 'zh', 'ja', 'ko', 'hi'];
      document.querySelectorAll('.lang-checkbox').forEach(cb => {
        cb.checked = defaults.includes(cb.value);
      });
      updateSelectedCount();
    });
  }

  // Update count when checkboxes change
  document.querySelectorAll('.lang-checkbox').forEach(cb => {
    cb.addEventListener('change', updateSelectedCount);
  });
}

function updateSelectedCount() {
  const count = document.querySelectorAll('.lang-checkbox:checked').length;
  const countEl = document.querySelector('.selected-count');
  if (countEl) {
    countEl.textContent = `Selected: ${count} languages selected`;
  }
}

function renderSidebarAnalyticsTab(enabled) {
  const analyticsPanel = document.getElementById('sidebar-tab-analytics');
  if (!analyticsPanel) return;
  if (!chrome.runtime?.id) return;
  chrome.storage.local.get([
    'activeAI', 'allTimeAnalytics', 'aiPerformance', 'messagingStats',
    'geminiFreeApiKey', 'geminiProApiKey', 'openaiApiKey', 'deepseekApiKey', 'anthropicApiKey',
    'sessionAnalytics'
  ], (data) => {
    if (!chrome.runtime?.id) return;
    const { geminiFreeApiKey, geminiProApiKey, openaiApiKey, deepseekApiKey, anthropicApiKey } = data;
    let sessionAnalytics = data.sessionAnalytics || { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: getTodayDateString() };
    if (!sessionAnalytics.date || sessionAnalytics.date !== getTodayDateString()) {
      sessionAnalytics = { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: getTodayDateString() };
      chrome.storage.local.set({ sessionAnalytics });
    }
    const allTimeStats = { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, ...data.allTimeAnalytics };
    const aiStats = AI_INTEGRATION.performance;
    const messagingData = MESSAGING.messagingStats;
    const selectedAI = data.activeAI || 'gemini';
    let currentAIDisplay = 'Gemini';
    let apiKeyStatus = '🔴 No API Key';
    if (selectedAI === 'gemini' || selectedAI === 'gemini-pro') {
      currentAIDisplay = selectedAI === 'gemini-pro' ? 'Gemini Pro' : 'Gemini';
      apiKeyStatus = geminiFreeApiKey && geminiFreeApiKey.trim() !== '' ? '🟢 API Key Set' : '🔴 No API Key';
    } else if (selectedAI === 'chatgpt') {
      currentAIDisplay = 'ChatGPT';
      apiKeyStatus = openaiApiKey && openaiApiKey.trim() !== '' ? '🟢 API Key Set' : '🔴 No API Key';
    } else if (selectedAI === 'deepseek') {
      currentAIDisplay = 'DeepSeek';
      apiKeyStatus = deepseekApiKey && deepseekApiKey.trim() !== '' ? '🟢 API Key Set' : '🔴 No API Key';
    } else if (selectedAI === 'claude') {
      currentAIDisplay = 'Claude';
      apiKeyStatus = anthropicApiKey && anthropicApiKey.trim() !== '' ? '🟢 API Key Set' : '🔴 No API Key';
    }
    analyticsPanel.innerHTML = `
      <div class="sidebar-box">
        <div class="sidebar-box-header">🏆 ${i18n.t('analytics.allTime')}</div>
        <div class="sidebar-box-body">
          <div>${i18n.t('analytics.swipes')}: ${allTimeStats.swipes}</div>
          <div>${i18n.t('analytics.likes')}: ${allTimeStats.likes}</div>
          <div>${i18n.t('analytics.nopes')}: ${allTimeStats.nopes}</div>
          <div>${i18n.t('analytics.matches')}: ${allTimeStats.matches}</div>
          <div>${i18n.t('analytics.messages')}: ${allTimeStats.messages}</div>
          <div>${i18n.t('swiping.likeRatio')}: ${allTimeStats.swipes > 0 ? ((allTimeStats.likes / allTimeStats.swipes) * 100).toFixed(1) : '0.0'}%</div>
          <div>${i18n.t('analytics.matchRate')}: ${allTimeStats.likes > 0 ? ((allTimeStats.matches / allTimeStats.likes) * 100).toFixed(1) : '0.0'}%</div>
          <div>${i18n.t('analytics.efficiency')}: ${calculateEfficiencyScore(allTimeStats)}</div>
        </div>
      </div>
      <div class="sidebar-box">
        <div class="sidebar-box-header"><span class="sidebar-ai-icon" aria-label="AI">🤖</span> ${i18n.t('ai.title')}</div>
        <div class="sidebar-box-body">
          <div>${i18n.t('analytics.successRate')}: ${aiStats.responses ? ((aiStats.success / aiStats.responses) * 100).toFixed(1) : '0.0'}%</div>
          <div>${i18n.t('analytics.totalResponses')}: ${aiStats.responses || 0}</div>
          <div>${i18n.t('analytics.successful')}: ${aiStats.success || 0}</div>
          <div>${i18n.t('analytics.failed')}: ${aiStats.responses ? aiStats.responses - aiStats.success : 0}</div>
          <div>${i18n.t('analytics.avgRating')}: ${aiStats.avgRating?.toFixed(1) || '0.0'}/10</div>
          <div>${i18n.t('analytics.rateLimited')}: ${AI_INTEGRATION.rateLimits.gemini.count}</div>
        </div>
      </div>
      <div class="sidebar-box">
        <div class="sidebar-box-header">⚡ ${i18n.t('analytics.performanceMetrics')}</div>
        <div class="sidebar-box-body">
          <div>${i18n.t('swiping.stealthMode')}: ${ANTI_DETECTION.stealthMode ? i18n.t('status.active') : i18n.t('status.inactive')}</div>
          <div>${i18n.t('analytics.failureCount')}: <span class="${ANTI_DETECTION.failureCount > 3 ? 'failure-count-high' : 'failure-count-low'}">${ANTI_DETECTION.failureCount}</span></div>
          <div>${i18n.t('analytics.swipeSpeed')}: ${SWIPE_DELAY_RANGE[0]}-${SWIPE_DELAY_RANGE[1]}ms</div>
          <div>${i18n.t('analytics.sessionActive')}: ${sessionActive ? i18n.t('analytics.yes') : i18n.t('analytics.no')}</div>
          <div>${i18n.t('analytics.currentAI')}: ${currentAIDisplay}</div>
          <div>${i18n.t('analytics.apiKeyStatus')}: ${apiKeyStatus}</div>
        </div>
      </div>
    `;
    analyticsPanel.style.opacity = enabled ? '1' : '0.5';
    setupAnalyticsEventListeners();
  });
}

// Helper functions for analytics
function calculateEfficiencyScore(stats) {
  if (stats.swipes === 0) return '0.0';
  const likeRatio = stats.likes / stats.swipes;
  const matchRate = stats.matches / Math.max(stats.likes, 1);
  const messageRate = stats.messages / Math.max(stats.matches, 1);

  const score = (likeRatio * 0.4 + matchRate * 0.4 + messageRate * 0.2) * 100;
  return Math.min(score, 100).toFixed(1);
}

function setupAnalyticsEventListeners() {
  // Reset session stats
  const resetSessionBtn = document.getElementById('reset-session-stats');
  if (resetSessionBtn) {
    resetSessionBtn.addEventListener('click', () => {
      chrome.storage.local.set({ sessionAnalytics: { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: getTodayDateString() } }, () => {
        console.log('[Tinder AI] Session stats reset');
        renderSidebarAnalyticsTab(sidebarConsentGiven);
        renderSidebarStatusTab(sidebarConsentGiven);
      });
    });
  }

  // Reset AI stats
  const resetAIBtn = document.getElementById('reset-ai-stats');
  if (resetAIBtn) {
    resetAIBtn.addEventListener('click', () => {
      AI_INTEGRATION.performance = { gemini: { responses: 0, success: 0, avgRating: 0 } };
      chrome.storage.local.set({ aiPerformance: AI_INTEGRATION.performance }, () => {
        console.log('[Tinder AI] AI stats reset');
        renderSidebarAnalyticsTab(sidebarConsentGiven);
      });
    });
  }

  // Export data
  const exportBtn = document.getElementById('export-session-data');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      chrome.storage.local.get(['allTimeAnalytics', 'sessionAnalytics', 'aiPerformance', 'messagingStats'], (data) => {
        const exportData = {
          timestamp: new Date().toISOString(),
          allTimeAnalytics: data.allTimeAnalytics || {},
          sessionAnalytics: data.sessionAnalytics || {},
          aiPerformance: data.aiPerformance || {},
          messagingStats: data.messagingStats || {},
          currentSettings: {
            swipeConfig: { likeRatio: currentFilters.likeRatio, maxSwipes: MAX_SESSION_SWIPES },
            stealthMode: ANTI_DETECTION.stealthMode,
            currentAI: AI_INTEGRATION.currentAI
          }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tinder-ai-analytics-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });
  }
}

function renderSidebarAntiDetectionTab(enabled) {
  const antiDetectionPanel = document.getElementById('sidebar-tab-antidetection');
  if (!antiDetectionPanel) return;

  requestAnimationFrame(() => {
    const log = ANTI_DETECTION.getDiagnosticLog();
    const stealthEnabled = ANTI_DETECTION.stealthMode;

    antiDetectionPanel.innerHTML = `
    <div class="analytics-section">
      <div class="analytics-header">${i18n.t('swiping.stealthMode')}</div>
      <div class="settings-row">
        <label for="stealth-mode" class="settings-label">${i18n.t('swiping.stealthMode')}:</label>
        <input type="checkbox" id="stealth-mode" ${stealthEnabled ? 'checked' : ''} ${!enabled ? 'disabled' : ''} />
      </div>
      <div class="analytics-header mt-4">Diagnostic Log</div>
      <div class="diagnostic-log">
          ${log.map(event => `
            <div class="diagnostic-log-entry">
              <span class="diagnostic-log-time">${new Date(event.timestamp).toLocaleTimeString()}:</span> 
              ${event.message}
              ${event.stealthMode ? ' (Stealth Mode)' : ''}
            </div>
          `).join('')}
      </div>
    </div>`;

    if (enabled) {
      const stealthCheckbox = document.getElementById('stealth-mode');
      if (stealthCheckbox) {
        stealthCheckbox.addEventListener('change', (e) => {
          ANTI_DETECTION.toggleStealthMode(e.target.checked);
        });
      }
    }
  });
}

// Helper to update all-time analytics in storage
async function updateAllTimeAnalytics(delta) {
  const data = await chrome.storage.local.get(['allTimeAnalytics', 'sessionAnalytics']);
  if (chrome.runtime.lastError) {
    throw new Error(chrome.runtime.lastError.message);
  }
  const allTimeAnalytics = data.allTimeAnalytics || {};
  const newAllTimeTotal = { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, ...allTimeAnalytics };
  for (const k in delta) {
    newAllTimeTotal[k] = (newAllTimeTotal[k] || 0) + (delta[k] || 0);
  }
  let sessionAnalytics = data.sessionAnalytics || { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: getTodayDateString() };
  if (!sessionAnalytics.date || sessionAnalytics.date !== getTodayDateString()) {
    sessionAnalytics = { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: getTodayDateString() };
  }
  const newSessionTotal = { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, ...sessionAnalytics };
  for (const k in delta) {
    newSessionTotal[k] = (newSessionTotal[k] || 0) + (delta[k] || 0);
  }
  newSessionTotal.date = getTodayDateString();
  await chrome.storage.local.set({
    allTimeAnalytics: newAllTimeTotal,
    sessionAnalytics: newSessionTotal
  });
  if (chrome.runtime.lastError) {
    throw new Error(chrome.runtime.lastError.message);
  }
}

// --- SIDEBAR CODE ---
function setupSidebarTabs() {
  const sidebar = document.getElementById('tinder-ai-sidebar');
  if (!sidebar) return;
  const tabBtns = sidebar.querySelectorAll('.sidebar-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sidebarActiveTab = btn.getAttribute('data-tab');
      const tabPanels = sidebar.querySelectorAll('.sidebar-tab-panel');
      tabPanels.forEach(panel => {
        panel.style.display = (panel.id === `sidebar-tab-${sidebarActiveTab}`) ? 'block' : 'none';
      });
      renderSidebarActiveTab();
    });
  });
}

// Function to show the consent overlay
function showConsentOverlay() {
  console.log('[Tinder AI] Showing consent overlay');

  // Detect browser language and set appropriate locale
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  const langCode = browserLang.split('-')[0].toLowerCase();

  // Check if we support this language, fallback to English if not
  const supportedLanguages = ['en', 'ja', 'ko', 'fr', 'es', 'de', 'it', 'pt', 'ar', 'zh'];
  const detectedLanguage = supportedLanguages.includes(langCode) ? langCode : 'en';

  console.log(`[Tinder AI] Detected browser language: ${browserLang}, using: ${detectedLanguage}`);

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'tinder-ai-consent-overlay';
  overlay.className = 'tinder-ai-consent-overlay';

  // Create consent dialog
  const dialog = document.createElement('div');
  dialog.className = 'tinder-ai-consent-dialog';

  // Add title
  const title = document.createElement('h2');
  title.className = 'tinder-ai-consent-title';
  title.textContent = i18n.t('consentOverlay.title', { lng: detectedLanguage });

  // Add description
  const description = document.createElement('p');
  description.className = 'tinder-ai-consent-description';
  description.textContent = i18n.t('consentOverlay.description', { lng: detectedLanguage });

  // Create features container
  const featuresContainer = document.createElement('div');
  featuresContainer.className = 'tinder-ai-consent-features';

  const features = i18n.t('consentOverlay.features', { lng: detectedLanguage });

  features.forEach(featureText => {
    const feature = document.createElement('div');
    feature.className = 'tinder-ai-consent-feature';
    feature.textContent = featureText;
    featuresContainer.appendChild(feature);
  });

  // Add accept button
  const acceptButton = document.createElement('button');
  acceptButton.className = 'tinder-ai-consent-accept-btn';
  acceptButton.textContent = i18n.t('consentOverlay.acceptButton', { lng: detectedLanguage });

  // Add event listener to accept button
  acceptButton.addEventListener('click', () => {
    console.log('[Tinder AI] Consent given, removing overlay');
    // Set consent to true
    sidebarConsentGiven = true;
    // Save consent to storage
    chrome.storage.local.set({ sidebarConsentGiven: true });
    // Remove overlay
    overlay.remove();
    // Initialize features that require consent
    console.log('[Tinder AI] Consent accepted, initializing features...');
    createPersistentAIIcon();
    injectWandButtons();
    // Refresh sidebar tabs to enable features
    renderSidebarActiveTab();
    // Force a DOM change check to inject any missing buttons
    setTimeout(() => {
      const matches = document.querySelectorAll(window.SELECTORS.matchListItemSelector + ':not(.wand-injected)');
      if (matches.length > 0) {
        injectWandButtons(matches);
      }
    }, 1000);
  });

  // Assemble dialog
  dialog.appendChild(title);
  dialog.appendChild(description);
  dialog.appendChild(featuresContainer);
  dialog.appendChild(acceptButton);
  overlay.appendChild(dialog);

  // Add to body
  document.body.appendChild(overlay);
  console.log('[Tinder AI] Consent overlay added to DOM');
}

async function injectSidebar() {
  console.log('[Tinder AI] injectSidebar called');

  // Wait for i18n to be initialized
  if (!i18nInitialized) {
    console.log('[Tinder AI] Waiting for i18n initialization...');
    let attempts = 0;
    while (!i18nInitialized && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    if (!i18nInitialized) {
      console.warn('[Tinder AI] i18n not initialized after 5 seconds, proceeding anyway');
    } else {
      console.log('[Tinder AI] i18n initialized, proceeding with sidebar injection');
    }
  }

  // Remove any existing sidebar and styles to prevent duplicates
  const existingSidebar = document.getElementById('tinder-ai-sidebar');
  if (existingSidebar) {
    console.log('[Tinder AI] Removing existing sidebar');
    existingSidebar.remove();
  }

  // Inject shared popup/styles.css if not already present
  if (!document.getElementById('tinder-ai-shared-css')) {
    console.log('[Tinder AI] Injecting CSS stylesheet');
    const link = document.createElement('link');
    link.id = 'tinder-ai-shared-css';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('popup/styles.css'); // UPDATED to styles.css
    document.head.appendChild(link);
    console.log('[Tinder AI] CSS stylesheet injected:', link.href);

    // Add event listener to check if CSS loaded
    link.onload = () => {
      console.log('[Tinder AI] ✅ CSS stylesheet loaded successfully');
      // Test if dark mode styles are available
      setTimeout(() => {
        const testElement = document.createElement('div');
        testElement.style.position = 'absolute';
        testElement.style.left = '-9999px';
        testElement.id = 'tinder-ai-css-test';
        document.body.appendChild(testElement);

        // Check if our CSS variables are available
        const computedStyle = window.getComputedStyle(testElement);
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary');
        console.log('[Tinder AI] CSS test - Primary color variable:', primaryColor);

        testElement.remove();
      }, 100);
    };

    link.onerror = () => {
      console.error('[Tinder AI] ❌ Failed to load CSS stylesheet');
    };
  } else {
    console.log('[Tinder AI] CSS stylesheet already present');
  }

  // Create sidebar element
  const sidebar = document.createElement('div');
  sidebar.id = 'tinder-ai-sidebar';

  // Add debugging class to make it easier to find
  sidebar.className = 'tinder-ai-sidebar-debug';
  // Start visible (no hidden class)

  // Set sidebar HTML using shared classes
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-ai-title">
        <span class="sidebar-ai-icon" aria-label="AI">🤖</span>
        <h1 class="text-lg font-semibold">${i18n.t('extension.name')}</h1>
      </div>
      <div class="sidebar-controls">
        <select id="language-selector" class="language-selector-abbr" title="${i18n.t('sidebar.language.label')}">
          <option value="en">EN</option>
          <option value="fr">FR</option>
          <option value="es">ES</option>
          <option value="de">DE</option>
          <option value="it">IT</option>
          <option value="pt">PT</option>
          <option value="ar">AR</option>
          <option value="zh">ZH</option>
          <option value="ko">KO</option>
          <option value="ja">JA</option>
        </select>
        <button id="theme-toggle" class="text-muted" title="${i18n.t('sidebar.theme.toggle')}">🌙</button>
      </div>
    </div>
    <div class="sidebar-tab-bar">
      <button class="sidebar-tab-btn active" data-tab="status">${i18n.t('sidebar.tabs.status')}</button>
      <button class="sidebar-tab-btn" data-tab="ai">${i18n.t('sidebar.tabs.ai')}</button>
      <button class="sidebar-tab-btn" data-tab="swiping">${i18n.t('sidebar.tabs.swiping')}</button>
      <button class="sidebar-tab-btn" data-tab="analytics">${i18n.t('sidebar.tabs.analytics')}</button>
    </div>
    <div class="sidebar-content">
      <div id="sidebar-tab-status" class="sidebar-tab-panel active">
        <div class="sidebar-panel-content">
          <div class="sidebar-panel-section">
            <h3 class="sidebar-panel-title">${i18n.t('status.title')}</h3>
            <div class="sidebar-status-grid">
              <div class="sidebar-status-item">
                <span class="sidebar-status-label">${i18n.t('status.active')}</span>
                <span id="status-active" class="sidebar-status-value">${i18n.t('status.inactive')}</span>
              </div>
              <div class="sidebar-status-item">
                <span class="sidebar-status-label">${i18n.t('status.connected')}</span>
                <span id="status-connected" class="sidebar-status-value">${i18n.t('status.disconnected')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="sidebar-tab-ai" class="sidebar-tab-panel">
        <!-- Content will be dynamically rendered by renderSidebarAITab() -->
      </div>
      <div id="sidebar-tab-swiping" class="sidebar-tab-panel">
        <div class="sidebar-panel-content">
          <div class="sidebar-panel-section">
            <h3 class="sidebar-panel-title">${i18n.t('swiping.title')}</h3>
            <div class="sidebar-form-group">
              <label class="sidebar-form-label">${i18n.t('swiping.autoSwipe')}</label>
              <input type="checkbox" id="swiping-auto" class="sidebar-form-checkbox">
            </div>
            <div class="sidebar-form-group">
              <label class="sidebar-form-label">${i18n.t('swiping.swipeDelay')}</label>
              <input type="range" id="swiping-delay" class="sidebar-form-range" min="1000" max="10000" step="500">
              <span id="swiping-delay-value" class="sidebar-form-value">3000ms</span>
            </div>
            <div class="sidebar-form-group">
              <label class="sidebar-form-label">${i18n.t('swiping.maxSwipes')}</label>
              <input type="number" id="swiping-max" class="sidebar-form-input" min="1" max="100" value="30">
            </div>
            <button id="swiping-save" class="sidebar-btn primary">${i18n.t('swiping.settingsSaved')}</button>
            <div id="swiping-status" class="sidebar-status-message"></div>
          </div>
        </div>
      </div>
      <div id="sidebar-tab-analytics" class="sidebar-tab-panel">
        <div class="sidebar-panel-content">
          <div class="sidebar-panel-section">
            <h3 class="sidebar-panel-title">${i18n.t('analytics.title')}</h3>
            <div class="sidebar-analytics-grid">
              <div class="sidebar-analytics-item">
                <span class="sidebar-analytics-label">${i18n.t('analytics.swipes')}</span>
                <span id="analytics-swipes" class="sidebar-analytics-value">0</span>
              </div>
              <div class="sidebar-analytics-item">
                <span class="sidebar-analytics-label">${i18n.t('analytics.likes')}</span>
                <span id="analytics-likes" class="sidebar-analytics-value">0</span>
              </div>
              <div class="sidebar-analytics-item">
                <span class="sidebar-analytics-label">${i18n.t('analytics.matches')}</span>
                <span id="analytics-matches" class="sidebar-analytics-value">0</span>
              </div>
              <div class="sidebar-analytics-item">
                <span class="sidebar-analytics-label">${i18n.t('analytics.messages')}</span>
                <span id="analytics-messages" class="sidebar-analytics-value">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add sidebar to body
  document.body.appendChild(sidebar);
  console.log('[Tinder AI] Sidebar added to DOM. Element:', sidebar);

  // Debug: Check if sidebar is visible
  setTimeout(() => {
    const computedStyle = window.getComputedStyle(sidebar);
    console.log('[Tinder AI] Sidebar computed styles:', {
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      transform: computedStyle.transform,
      position: computedStyle.position,
      zIndex: computedStyle.zIndex,
      right: computedStyle.right,
      top: computedStyle.top,
      width: computedStyle.width,
      height: computedStyle.height,
      background: computedStyle.background
    });

    // Check if sidebar is actually in the DOM and visible
    const sidebarInDOM = document.getElementById('tinder-ai-sidebar');
    if (sidebarInDOM) {
      console.log('[Tinder AI] ✅ Sidebar found in DOM');
      const rect = sidebarInDOM.getBoundingClientRect();
      console.log('[Tinder AI] Sidebar bounding rect:', rect);
      if (rect.width > 0 && rect.height > 0) {
        console.log('[Tinder AI] ✅ Sidebar has dimensions - should be visible');
      } else {
        console.log('[Tinder AI] ❌ Sidebar has no dimensions - may be hidden');
      }
    } else {
      console.log('[Tinder AI] ❌ Sidebar not found in DOM');
    }
  }, 100);

  // In injectSidebar, after adding the sidebar to the DOM:
  // Remove old toggle if present
  const oldToggle = document.querySelector('.tinder-ai-sidebar-toggle');
  if (oldToggle) oldToggle.remove();

  // Create the toggle button
  // Create the toggle button with SVG icon
  const toggleBtn = document.createElement('div');
  toggleBtn.className = 'tinder-ai-sidebar-toggle';
  toggleBtn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  `;
  document.body.appendChild(toggleBtn);

  // Toggle functionality
  function updateToggleState() {
    const isHidden = sidebar.classList.contains('hidden');
    if (isHidden) {
      toggleBtn.classList.remove('open');
      toggleBtn.style.right = '0px';
      toggleBtn.style.left = 'auto';
    } else {
      toggleBtn.classList.add('open');
      toggleBtn.style.right = '390px'; // Sidebar width (380px) + gap (10px) to prevent overlap
      toggleBtn.style.left = 'auto'; // Use right positioning relative to screen edge or sidebar
    }
  }

  // Initial update
  updateToggleState();

  toggleBtn.onclick = () => {
    sidebar.classList.toggle('hidden');
    updateToggleState();
  };

  // Setup tab navigation
  const tabBtns = sidebar.querySelectorAll('.sidebar-tab-btn');
  const tabPanels = sidebar.querySelectorAll('.sidebar-tab-panel');
  const tabClickHandler = (btn) => {
    return () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(`sidebar-tab-${tabId}`).classList.add('active');
    };
  };
  tabBtns.forEach(btn => {
    btn.addEventListener('click', tabClickHandler(btn));
  });

  // Initialize tabs
  setupSidebarTabs();
  renderSidebarActiveTab();

  console.log('[Tinder AI] Sidebar injection complete. Check for red border to confirm visibility.');

  // --- Theme persistence ---
  // --- Theme Logic (Light -> Dark -> Spicy) ---
  const themeToggle = sidebar.querySelector('#theme-toggle');

  if (themeToggle) {
    const themes = ['light', 'dark', 'spicy'];
    let currentThemeIndex = 0;

    function applyTheme(theme) {
      const html = document.documentElement;

      html.classList.remove('dark', 'spicy-theme');

      if (theme === 'dark') {
        html.classList.add('dark');
        themeToggle.textContent = '🌙';
      } else if (theme === 'spicy') {
        html.classList.add('spicy-theme');
        themeToggle.textContent = '🌶️';
      } else {
        themeToggle.textContent = '☀️';
      }
    }

    // Load saved theme
    chrome.storage.local.get(['theme'], (result) => {
      if (result.theme) {
        currentThemeIndex = themes.indexOf(result.theme);
        if (currentThemeIndex === -1) currentThemeIndex = 0;
      }
      applyTheme(themes[currentThemeIndex]);
    });

    themeToggle.onclick = () => {
      currentThemeIndex = (currentThemeIndex + 1) % themes.length;
      const newTheme = themes[currentThemeIndex];
      applyTheme(newTheme);
      chrome.storage.local.set({ theme: newTheme });
    };
  } else {
    console.error('[Tinder AI] Theme toggle button not found');
  }

  // Add language selector logic
  const languageSelector = document.getElementById('language-selector');
  if (languageSelector) {
    // Set current language
    languageSelector.value = i18n.getCurrentLocale();

    languageSelector.onchange = async (event) => {
      const newLocale = event.target.value;
      console.log(`[Tinder AI] Language changed to: ${newLocale}`);

      try {
        await i18n.changeLanguage(newLocale);

        // Debug: Verify language was saved
        chrome.storage.local.get(['userLanguage'], (result) => {
          console.log('[Tinder AI] Language saved to storage:', result.userLanguage);
        });

        // Update all text elements in the sidebar
        updateSidebarTranslations();

        // Update language selector to reflect new language
        updateLanguageSelector();

        // Show success message
        showStatusMessage(i18n.t('notifications.languageChanged'));

      } catch (error) {
        console.error('[Tinder AI] Error changing language:', error);
        showErrorNotification('Failed to change language. Please try again.');
      }
    };
  } else {
    console.error('[Tinder AI] Language selector not found');
  }

  // --- In injectSidebar ---
  // After renderSidebarActiveTab();
  createPersistentAIIcon();
}


// --- Swiping UI & Settings ---
function renderSidebarSwipingTab(enabled) {
  const swipingPanel = document.getElementById('sidebar-tab-swiping');
  if (!swipingPanel) return;
  swipingPanel.style.overflowY = 'auto';
  swipingPanel.style.maxHeight = 'calc(100vh - 60px)';
  swipingPanel.innerHTML = '';

  // Load existing settings from storage
  chrome.storage.local.get(['swipeConfig'], async ({ swipeConfig }) => {
    // Use current global values as fallback to ensure consistency
    const config = swipeConfig || {
      likeRatio: currentFilters.likeRatio || 0.7,
      maxSwipes: MAX_SESSION_SWIPES || 30
    };

    // Swiping Configuration
    const swipingSettingsHTML = `
      <div class="sidebar-box">
        <div class="settings-header">${i18n.t('swiping.title')}</div>
        <div class="settings-row">
          <label for="like-ratio" class="settings-label">${i18n.t('swiping.likeRatio')} (%)</label>
          <div class="sidebar-flex-row sidebar-gap-md sidebar-btn-wide">
            <input type="range" id="like-ratio" min="10" max="100" value="${Math.round((config.likeRatio || 0.7) * 100)}" class="settings-input sidebar-input-grow" />
            <span class="settings-value sidebar-label-min sidebar-text-right" id="like-ratio-value">${Math.round((config.likeRatio || 0.7) * 100)}%</span>
        </div>
        </div>
        <div class="settings-row">
          <label for="max-swipes" class="settings-label">${i18n.t('swiping.maxSwipes')}</label>
          <input type="number" id="max-swipes" min="1" max="500" value="${config.maxSwipes || 30}" class="settings-input" />
        </div>
        </div>
    `;

    // Future Swiping Settings Placeholder
    const futureSettingsHTML = `
      <div class="settings-divider"></div>
      <div class="settings-header">Advanced Swiping</div>
      <div class="sidebar-box">
        <p class="settings-desc">Future features coming soon:</p>
        <ul class="settings-desc sidebar-list-indent">
          <li>Swipe speed settings</li>
          <li>Filter preferences</li>
          <li>Swiping patterns</li>
          <li>Smart matching</li>
        </ul>
      </div>
    `;

    // Save Settings Button
    const saveSettingsHTML = `
      <div class="settings-divider"></div>
      <button id="save-swiping-settings" class="main-btn sidebar-save-btn-green sidebar-btn-full">${i18n.t('buttons.save')} ${i18n.t('swiping.title')}</button>
      <div id="swiping-settings-status" class="settings-status"></div>
    `;

    // Reset Consent Button
    const resetConsentHTML = `
      <div class="settings-divider"></div>
      <button id="reset-consent-btn" class="main-btn sidebar-btn-full" style="background: var(--danger); color: var(--text-light); border: 1px solid var(--danger); margin-top: 12px;">
        🔄 Reset Consent & Revoke Access
      </button>
      <div id="reset-consent-status" class="settings-status"></div>
    `;

    swipingPanel.innerHTML = swipingSettingsHTML + futureSettingsHTML + saveSettingsHTML + resetConsentHTML;

    // Add event listeners
    setupSwipingEventListeners();
    setupResetConsentEventListener();
  });
}

function setupSwipingEventListeners() {
  const likeRatioSlider = document.getElementById('like-ratio');
  const likeRatioValue = document.getElementById('like-ratio-value');
  if (likeRatioSlider) {
    likeRatioSlider.addEventListener('input', (e) => {
      likeRatioValue.textContent = e.target.value + '%';
    });
  }

  const saveSwipingBtn = document.getElementById('save-swiping-settings');
  if (saveSwipingBtn) {
    saveSwipingBtn.addEventListener('click', async () => {
      try {
        const newSwipeConfig = {
          likeRatio: parseInt(document.getElementById('like-ratio').value, 10) / 100,
          maxSwipes: parseInt(document.getElementById('max-swipes').value, 10),
        };

        // Validate the settings
        if (newSwipeConfig.likeRatio < 0.1 || newSwipeConfig.likeRatio > 1) {
          showErrorNotification('Like ratio must be between 10% and 100%');
          return;
        }

        if (newSwipeConfig.maxSwipes < 5 || newSwipeConfig.maxSwipes > 500) {
          showErrorNotification('Max swipes must be between 5 and 500');
          return;
        }

        // Call updateSettings to update global variables for automatic swiping
        await updateSettings({
          swipeConfig: newSwipeConfig,
          swipeSpeedMin: SWIPE_DELAY_RANGE[0],
          swipeSpeedMax: SWIPE_DELAY_RANGE[1],
          activeAI: AI_INTEGRATION.currentAI
        });

        // Show success message
        const statusEl = document.getElementById('swiping-settings-status');
        statusEl.textContent = i18n.t('swiping.settingsSaved');
        statusEl.style.color = '#48bb78';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);

        console.log('[Tinder AI] Swiping settings saved:', newSwipeConfig);

        // Refresh the status tab to show updated values
        if (sidebarActiveTab === 'status') {
          renderSidebarStatusTab(sidebarConsentGiven);
        }

      } catch (error) {
        console.error('[Tinder AI] Error saving swiping settings:', error);
        const statusEl = document.getElementById('swiping-settings-status');
        statusEl.textContent = i18n.t('ai.error');
        statusEl.style.color = '#ef4444';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
      }
    });
  }
}

function setupResetConsentEventListener() {
  const resetConsentBtn = document.getElementById('reset-consent-btn');
  if (resetConsentBtn) {
    resetConsentBtn.addEventListener('click', async () => {
      try {
        const statusEl = document.getElementById('reset-consent-status');

        // Show confirmation dialog
        if (confirm('Are you sure you want to reset consent? This will revoke all extension permissions and show the consent overlay again.')) {
          statusEl.textContent = 'Resetting consent...';
          statusEl.style.color = '#f59e0b';

          // Remove consent from storage
          await chrome.storage.local.remove('sidebarConsentGiven');

          // Update global variable
          sidebarConsentGiven = false;

          // Hide sidebar and remove AI elements
          const sidebar = document.getElementById('tinder-ai-sidebar');
          if (sidebar) {
            sidebar.style.display = 'none';
          }

          // Remove AI icon if exists
          const aiIcon = document.getElementById('tinder-ai-icon');
          if (aiIcon) {
            aiIcon.remove();
          }

          // Remove wand buttons
          document.querySelectorAll('.tinder-ai-wand-btn').forEach(btn => btn.remove());

          // Show success message
          statusEl.textContent = 'Consent reset successfully! Reloading...';
          statusEl.style.color = '#48bb78';

          console.log('[Tinder AI] Consent reset by user');

          // Reload page to show consent overlay
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (error) {
        console.error('[Tinder AI] Error resetting consent:', error);
        const statusEl = document.getElementById('reset-consent-status');
        statusEl.textContent = 'Error resetting consent';
        statusEl.style.color = '#ef4444';
      }
    });
  }
}

function setupSettingsEventListeners() {
  const likeRatioSlider = document.getElementById('like-ratio');
  const likeRatioValue = document.getElementById('like-ratio-value');
  if (likeRatioSlider) {
    likeRatioSlider.addEventListener('input', (e) => {
      likeRatioValue.textContent = e.target.value + '%';
    });
  }

  // Language selection event handlers
  const languageCheckboxes = document.querySelectorAll('.language-checkbox');
  const selectedCountSpan = document.getElementById('selected-count');

  languageCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const selectedLanguages = Array.from(document.querySelectorAll('.language-checkbox:checked')).map(cb => cb.value);
      if (selectedCountSpan) {
        selectedCountSpan.textContent = selectedLanguages.length;
      }
    });
  });

  // Select All Languages
  const selectAllBtn = document.getElementById('select-all-languages');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      languageCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
      });
      if (selectedCountSpan) {
        selectedCountSpan.textContent = languageCheckboxes.length;
      }
    });
  }

  // Deselect All Languages
  const deselectAllBtn = document.getElementById('deselect-all-languages');
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', () => {
      languageCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
      });
      if (selectedCountSpan) {
        selectedCountSpan.textContent = '0';
      }
    });
  }

  // Reset to Default Languages
  const resetLanguagesBtn = document.getElementById('reset-languages');
  if (resetLanguagesBtn) {
    resetLanguagesBtn.addEventListener('click', () => {
      languageCheckboxes.forEach(checkbox => {
        checkbox.checked = DEFAULT_SELECTED_LANGUAGES.includes(checkbox.value);
      });
      if (selectedCountSpan) {
        selectedCountSpan.textContent = DEFAULT_SELECTED_LANGUAGES.length;
      }
    });
  }

  const saveApiBtn = document.getElementById('save-api-keys-btn');
  if (saveApiBtn) {
    saveApiBtn.addEventListener('click', () => {
      const geminiKey = document.getElementById('gemini-free-api-key').value.trim();
      const geminiProKey = document.getElementById('gemini-pro-api-key').value.trim();
      const openaiKey = document.getElementById('openai-api-key').value.trim();
      const deepseekKey = document.getElementById('deepseek-api-key').value.trim();
      const anthropicKey = document.getElementById('anthropic-api-key').value.trim();
      const statusEl = document.getElementById('api-key-status');
      let toSave = { activeAI: document.getElementById('ai-model-select').value };
      if (document.getElementById('ai-model-select').value === 'gemini') toSave.geminiFreeApiKey = geminiKey;
      if (document.getElementById('ai-model-select').value === 'gemini-pro') toSave.geminiProApiKey = geminiProKey;
      if (document.getElementById('ai-model-select').value === 'chatgpt') toSave.openaiApiKey = openaiKey;
      if (document.getElementById('ai-model-select').value === 'deepseek') toSave.deepseekApiKey = deepseekKey;
      if (document.getElementById('ai-model-select').value === 'claude') toSave.anthropicApiKey = anthropicKey;
      chrome.storage.local.set(toSave, () => {
        statusEl.textContent = 'API Key(s) saved successfully!';
        statusEl.style.color = '#48bb78';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
      });
    });
  }

  const saveSettingsBtn = document.getElementById('save-settings');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const newFilterConfig = {
        likeRatio: parseInt(document.getElementById('like-ratio').value, 10) / 100,
        maxSwipes: parseInt(document.getElementById('max-swipes').value, 10),
      };

      // Get selected languages
      const selectedLanguages = Array.from(document.querySelectorAll('.language-checkbox:checked')).map(cb => cb.value);

      const newMessagingConfig = {
        tone: document.getElementById('message-tone').value,
        language: document.getElementById('message-language').value,
        autoSend: document.getElementById('auto-send').checked,
        autoMessageOnMatch: document.getElementById('auto-message-on-match').checked,
        selectedLanguages: selectedLanguages,
      };

      chrome.storage.local.set({
        filterConfig: newFilterConfig,
        messagingConfig: newMessagingConfig
      }, () => {
        console.log('[Tinder AI] Settings saved:', { newFilterConfig, newMessagingConfig });
        const statusEl = document.getElementById('settings-status');
        statusEl.textContent = i18n.t('ai.settingsSaved');
        statusEl.style.color = '#48bb78';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
      });
    });
  }
}

// --- Notifications ---
function showErrorNotification(message) {
  // Remove any existing error notifications
  const existingNotifications = document.querySelectorAll('.tinder-ai-error-notification');
  existingNotifications.forEach(notification => notification.remove());

  const notification = document.createElement('div');
  notification.className = 'tinder-ai-error-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f56565;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10001;
    font-family: sans-serif;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease;
    word-wrap: break-word;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Add slide-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Remove notification after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
    if (style.parentNode) {
      style.remove();
    }
  }, 5000);
}
function showStatusMessage(msg) {
  const statusPanel = document.getElementById('sidebar-tab-status');
  if (statusPanel) {
    const existing = document.getElementById('out-of-likes-message');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'out-of-likes-message';
    div.className = 'sidebar-status-message';
    div.textContent = msg;
    statusPanel.prepend(div);
  }
}

// --- Translation Updates ---
function updateSidebarTranslations() {
  try {
    const sidebar = document.getElementById('tinder-ai-sidebar');
    if (!sidebar) {
      console.warn('[Tinder AI] Sidebar not found for translation update');
      return;
    }

    // Update sidebar title
    const title = sidebar.querySelector('.sidebar-ai-title h1');
    if (title) {
      title.textContent = i18n.t('extension.name');
    }

    // Update language selector title
    const languageSelector = sidebar.querySelector('#language-selector');
    if (languageSelector) {
      languageSelector.title = i18n.t('sidebar.language.label');
    }

    // Update theme toggle button
    const themeToggle = sidebar.querySelector('#theme-toggle');
    if (themeToggle) {
      const isDark = document.documentElement.classList.contains('dark');
      themeToggle.textContent = isDark ? '☀️' : '🌙';
      themeToggle.title = i18n.t('sidebar.theme.toggle');
    }

    // Update tab buttons
    const tabButtons = sidebar.querySelectorAll('.sidebar-tab-btn');
    tabButtons.forEach(btn => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId) {
        btn.textContent = i18n.t(`sidebar.tabs.${tabId}`);
      }
    });

    // Find the currently active tab and re-render it
    const activeTabBtn = sidebar.querySelector('.sidebar-tab-btn.active');
    if (activeTabBtn) {
      const activeTabId = activeTabBtn.getAttribute('data-tab');
      console.log('[Tinder AI] Re-rendering active tab:', activeTabId);

      // Re-render the currently active tab content
      switch (activeTabId) {
        case 'status':
          renderSidebarStatusTab(sidebarConsentGiven);
          break;
        case 'ai':
          renderSidebarAITab(true);
          break;
        case 'swiping':
          renderSidebarSwipingTab(true);
          break;
        case 'analytics':
          renderSidebarAnalyticsTab(true);
          break;
        case 'anti-detection':
          renderSidebarAntiDetectionTab(true);
          break;
        default:
          // For other tabs, just update the basic translations
          updateBasicTabTranslations(activeTabId);
      }
    }

    console.log('[Tinder AI] Sidebar translations updated');
  } catch (error) {
    console.error('[Tinder AI] Error updating sidebar translations:', error);
  }
}

// Helper function to update basic tab translations for tabs that don't need full re-rendering
function updateBasicTabTranslations(tabId) {
  const tab = document.getElementById(`sidebar-tab-${tabId}`);
  if (!tab) return;

  // Update tab title
  const title = tab.querySelector('.sidebar-panel-title');
  if (title) {
    title.textContent = i18n.t(`${tabId}.title`);
  }

  // Update common elements
  const labels = tab.querySelectorAll('.sidebar-form-label, .sidebar-status-label, .sidebar-analytics-label');
  labels.forEach((label, index) => {
    // This is a simplified update - specific tabs should handle their own detailed updates
    const key = label.getAttribute('data-i18n-key');
    if (key) {
      label.textContent = i18n.t(key);
    }
  });
}

// --- Messaging UI Functions ---

// Function to create persistent AI icon that's always visible
function createPersistentAIIcon() {
  // Check if icon already exists
  if (document.getElementById('ai-persistent-icon')) return;

  const icon = document.createElement('div');
  icon.id = 'ai-persistent-icon';
  icon.innerHTML = '🤖';
  icon.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    transition: transform 0.2s, box-shadow 0.2s;
  `;

  icon.addEventListener('mouseenter', () => {
    icon.style.transform = 'scale(1.1)';
    icon.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
  });

  icon.addEventListener('mouseleave', () => {
    icon.style.transform = 'scale(1)';
    icon.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
  });

  icon.addEventListener('click', async () => {
    console.log('[Tinder AI] AI icon clicked');
    try {
      // Generate AI message for current conversation - try multiple selectors
      const chatContainerSelectors = [
        'div[class*="chat"]',
        'div[class*="conversation"]',
        'div[class*="messages"]',
        'div[class*="messageList"]',
        'main[role="main"]',
        'main',
        'div[class*="App"] > div',
        'body'
      ];

      let chatContainer = null;
      for (const selector of chatContainerSelectors) {
        chatContainer = document.querySelector(selector);
        if (chatContainer) {
          console.log('[Tinder AI] Found chat container with selector:', selector);
          break;
        }
      }

      if (!chatContainer) {
        chatContainer = document.body; // Ultimate fallback
        console.log('[Tinder AI] Using document.body as fallback');
      }

      console.log('[Tinder AI] Extracting profile info...');
      const profileInfo = typeof extractDetailedProfileInfo === 'function'
        ? extractDetailedProfileInfo(chatContainer)
        : { name: 'Unknown' };
      console.log('[Tinder AI] Profile info:', profileInfo);

      console.log('[Tinder AI] Extracting chat history...');
      const chatHistory = typeof extractChatHistory === 'function'
        ? extractChatHistory()
        : [];
      console.log('[Tinder AI] Chat history length:', chatHistory.length);

      console.log('[Tinder AI] Calling generatePersonalizedMessage...');
      const message = await generatePersonalizedMessage(profileInfo, chatHistory);
      console.log('[Tinder AI] AI Response:', message);

      if (message && !message.error) {
        displayMessageForApproval(message.response || message, profileInfo, chatHistory);
      } else {
        console.error('[Tinder AI] AI message generation failed:', message?.error || 'Unknown error');
        displayErrorBox(message?.error || 'Failed to generate message', profileInfo);
      }
    } catch (error) {
      console.error('[Tinder AI] Error in AI icon click handler:', error);
      displayErrorBox('Error generating message: ' + error.message, {});
    }
  });

  document.body.appendChild(icon);
  console.log('[Tinder AI] Persistent AI icon created');
}

// Inject magic wand buttons on match list items
function injectWandButtons(matches) {
  if (!matches) {
    matches = document.querySelectorAll(window.SELECTORS?.matchListItemSelector + ':not(.wand-injected)');
  }

  matches.forEach(matchItem => {
    if (matchItem.classList.contains('wand-injected')) return;
    matchItem.classList.add('wand-injected');

    const wand = document.createElement('button');
    wand.className = 'ai-wand-btn';
    wand.innerHTML = '✨';
    wand.title = 'Generate AI Message';
    wand.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 50%;
      color: white;
      cursor: pointer;
      font-size: 14px;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.8;
      transition: opacity 0.2s, transform 0.2s;
    `;

    wand.addEventListener('mouseenter', () => {
      wand.style.opacity = '1';
      wand.style.transform = 'scale(1.1)';
    });

    wand.addEventListener('mouseleave', () => {
      wand.style.opacity = '0.8';
      wand.style.transform = 'scale(1)';
    });

    wand.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log('[Tinder AI] Wand clicked on match item');

      // Click match to open chat
      matchItem.click();

      // Wait for chat to load and extract info
      setTimeout(async () => {
        try {
          // Try multiple selectors for chat container
          const chatContainerSelectors = [
            'div[class*="chat"]',
            'div[class*="conversation"]',
            'div[class*="messages"]',
            'div[class*="messageList"]',
            'main[role="main"]',
            'main',
            'div[class*="App"] > div',
            'body'
          ];

          let chatContainer = null;
          for (const selector of chatContainerSelectors) {
            chatContainer = document.querySelector(selector);
            if (chatContainer) {
              console.log('[Tinder AI] Wand found chat container with selector:', selector);
              break;
            }
          }

          if (!chatContainer) {
            chatContainer = document.body; // Ultimate fallback
            console.log('[Tinder AI] Wand using document.body as fallback');
          }

          console.log('[Tinder AI] Extracting profile info from wand...');
          const profileInfo = typeof extractDetailedProfileInfo === 'function'
            ? extractDetailedProfileInfo(chatContainer)
            : { name: 'Unknown' };
          console.log('[Tinder AI] Profile info:', profileInfo);

          console.log('[Tinder AI] Extracting chat history from wand...');
          const chatHistory = typeof extractChatHistory === 'function'
            ? extractChatHistory()
            : [];
          console.log('[Tinder AI] Chat history length:', chatHistory.length);

          console.log('[Tinder AI] Calling generatePersonalizedMessage from wand...');
          const message = await generatePersonalizedMessage(profileInfo, chatHistory);
          console.log('[Tinder AI] AI Response from wand:', message);

          if (message && !message.error) {
            displayMessageForApproval(message.response || message, profileInfo, chatHistory);
          } else {
            console.error('[Tinder AI] AI message generation failed from wand:', message?.error || 'Unknown error');
            displayErrorBox(message?.error || 'Failed to generate message', profileInfo);
          }
        } catch (error) {
          console.error('[Tinder AI] Error in wand click handler:', error);
          displayErrorBox('Error generating message: ' + error.message, {});
        }
      }, 1500);
    });

    matchItem.style.position = 'relative';
    matchItem.appendChild(wand);
  });
}

// Track manual message sends
function trackManualMessageSend() {
  if (typeof updateAllTimeAnalytics === 'function') {
    updateAllTimeAnalytics({ messages: 1 });
  }
  console.log('[Tinder AI] Manual message tracked');
}

// Setup manual message tracking
function setupManualMessageTracking() {
  // Monitor send button clicks
  document.addEventListener('click', (e) => {
    const sendBtn = e.target.closest('button[type="submit"], button[aria-label*="Send"]');
    if (sendBtn) {
      const textarea = document.querySelector('textarea');
      if (textarea && textarea.value.trim()) {
        trackManualMessageSend();
      }
    }
  });

  // Monitor Enter key in textarea
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const textarea = document.activeElement;
      if (textarea && textarea.tagName === 'TEXTAREA' && textarea.value.trim()) {
        trackManualMessageSend();
      }
    }
  });

  console.log('[Tinder AI] Manual message tracking initialized');
}

// Inject message into textarea
function injectMessageAndSend(message) {
  const textarea = document.querySelector('textarea[placeholder*="message"], textarea[placeholder*="Type"]');
  if (!textarea) {
    console.error('[Tinder AI] No textarea found');
    return false;
  }

  // Set the value
  textarea.value = message;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));

  console.log('[Tinder AI] Message injected:', message);
  return true;
}

// Generate personalized message using AI
async function generatePersonalizedMessage(profileInfo, chatHistory, overrideConfig = {}) {
  console.log('[Tinder AI] Generating personalized message for:', profileInfo);
  console.log('[Tinder AI] Override config:', overrideConfig);

  // Get the tone from override or default
  const tone = overrideConfig.tone || 'witty';

  // Tone descriptions for the AI
  const toneDescriptions = {
    'witty': 'witty and clever with a hint of humor',
    'friendly': 'warm, friendly and approachable',
    'romantic': 'romantic and sweet with heartfelt emotion',
    'casual': 'casual and laid-back',
    'playful': 'playful and fun with a teasing vibe',
    'flirty': 'flirty and charming with subtle attraction',
    'confident': 'confident and bold without being arrogant',
    'humorous': 'funny and humorous with jokes or puns'
  };

  const toneDescription = toneDescriptions[tone] || toneDescriptions['witty'];

  // Build prompt with tone
  let prompt = `Generate a ${toneDescription} Tinder message`;

  if (profileInfo.name && profileInfo.name !== 'Unknown') {
    prompt += ` for ${profileInfo.name}`;
  }

  if (profileInfo.age) {
    prompt += ` (${profileInfo.age} years old)`;
  }

  if (profileInfo.bio) {
    prompt += `. Bio: "${profileInfo.bio}"`;
  }

  if (profileInfo.interests && profileInfo.interests.length > 0) {
    prompt += `. Interests: ${profileInfo.interests.join(', ')}`;
  }

  if (chatHistory && chatHistory.length > 0) {
    prompt += `. Previous messages: ${chatHistory.slice(-3).map(m => `${m.sender}: ${m.text}`).join('; ')}`;
    prompt += `. Continue the conversation naturally.`;
  } else {
    prompt += `. This is the first message, make it a great opener!`;
  }

  prompt += ` Keep it short (1-2 sentences), ${tone}, and respectful.`;

  // Get AI response
  if (typeof getAIResponse === 'function') {
    return await getAIResponse(prompt);
  } else {
    console.error('[Tinder AI] getAIResponse function not available');
    return { error: 'AI response function not available' };
  }
}

// Display user-friendly error box (instead of just console errors)
function displayErrorBox(errorMessage, profileInfo = {}) {
  console.log('[Tinder AI] Displaying error box:', errorMessage);

  // Remove any existing approval box
  const existingBox = document.getElementById('ai-approval-box');
  if (existingBox) existingBox.remove();

  // Parse error to give user-friendly advice using translations
  let userFriendlyMessage = errorMessage;
  let suggestion = '';

  if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('exceeded')) {
    userFriendlyMessage = i18n.t('errors.rateLimitTitle');
    suggestion = i18n.t('errors.rateLimitMessage');
  } else if (errorMessage.includes('API key') || errorMessage.includes('key not found')) {
    userFriendlyMessage = i18n.t('errors.missingKeyTitle');
    suggestion = i18n.t('errors.missingKeyMessage');
  } else if (errorMessage.includes('Extension context')) {
    userFriendlyMessage = i18n.t('errors.extensionErrorTitle');
    suggestion = i18n.t('errors.extensionErrorMessage');
  } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    userFriendlyMessage = i18n.t('errors.networkErrorTitle');
    suggestion = i18n.t('errors.networkErrorMessage');
  }

  const box = document.createElement('div');
  box.id = 'ai-approval-box';
  box.className = 'spicyswipe-box';
  box.style.bottom = '80px';
  box.style.right = '20px';

  const errorTitle = i18n.t('errors.title');
  const forMatchText = i18n.t('errors.forMatch');
  const retryButtonText = i18n.t('errors.retryButton');
  const settingsButtonText = i18n.t('errors.settingsButton');

  box.innerHTML = `
    <div class="spicyswipe-box-header spicyswipe-box-header-red">
      <div>
        <div class="spicyswipe-box-title">❌ ${errorTitle}</div>
        <div class="spicyswipe-box-subtitle">${forMatchText} ${profileInfo.name || 'match'}</div>
      </div>
      <button id="ai-close-header-btn" class="spicyswipe-close-btn">✕</button>
    </div>
    <div class="spicyswipe-box-content">
      <div class="spicyswipe-error-alert">
        <div class="spicyswipe-error-title">${userFriendlyMessage}</div>
        <div class="spicyswipe-error-message">${suggestion || errorMessage}</div>
      </div>
      <div class="spicyswipe-btn-group">
        <button id="ai-retry-btn" class="spicyswipe-btn spicyswipe-btn-primary full">${retryButtonText}</button>
        <button id="ai-settings-btn" class="spicyswipe-btn spicyswipe-btn-secondary">${settingsButtonText}</button>
        <button id="ai-close-footer-btn" class="spicyswipe-btn spicyswipe-btn-danger">✕</button>
      </div>
    </div>
  `;

  document.body.appendChild(box);

  // Make the error box draggable by its header
  const header = box.querySelector('.spicyswipe-box-header');
  if (header) {
    header.style.cursor = 'grab';

    let isDragging = false;
    let startX, startY, initialX, initialY;

    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;

      isDragging = true;
      header.style.cursor = 'grabbing';

      startX = e.clientX;
      startY = e.clientY;

      const rect = box.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      box.style.bottom = 'auto';
      box.style.right = 'auto';
      box.style.left = `${initialX + deltaX}px`;
      box.style.top = `${initialY + deltaY}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = 'grab';
      }
    });
  }

  // Event handlers
  document.getElementById('ai-retry-btn').onclick = async () => {
    box.remove();
    // Trigger click on the AI icon to retry
    const aiIcon = document.getElementById('ai-persistent-icon');
    if (aiIcon) aiIcon.click();
  };

  document.getElementById('ai-settings-btn').onclick = () => {
    box.remove();
    // Switch to AI settings tab
    const aiTabBtn = document.querySelector('.sidebar-tab-btn[data-tab="ai"]');
    if (aiTabBtn) aiTabBtn.click();
  };

  // Close handlers (Header and Footer)
  const closeBox = () => box.remove();

  const headerCloseBtn = document.getElementById('ai-close-header-btn');
  if (headerCloseBtn) headerCloseBtn.onclick = closeBox;

  const footerCloseBtn = document.getElementById('ai-close-footer-btn');
  if (footerCloseBtn) footerCloseBtn.onclick = closeBox;
}

// Display message for user approval
async function displayMessageForApproval(initialMessage, profileInfo, chatHistory) {
  console.log('[Tinder AI] Displaying message for approval:', initialMessage);

  // Remove any existing approval box
  const existingBox = document.getElementById('ai-approval-box');
  if (existingBox) existingBox.remove();

  // Get user's selected languages and current tone from storage
  const storageData = await new Promise(resolve => {
    chrome.storage.local.get(['selectedLanguages', 'messagingConfig'], resolve);
  });

  const selectedLanguages = storageData.selectedLanguages || ['en', 'es', 'fr', 'de'];
  const currentTone = storageData.messagingConfig?.tone || 'witty';

  // Define available tones
  const availableTones = [
    { value: 'witty', label: '😏 Witty' },
    { value: 'friendly', label: '😊 Friendly' },
    { value: 'romantic', label: '💕 Romantic' },
    { value: 'casual', label: '😎 Casual' },
    { value: 'playful', label: '🎉 Playful' },
    { value: 'flirty', label: '😘 Flirty' },
    { value: 'confident', label: '💪 Confident' },
    { value: 'humorous', label: '😂 Humorous' }
  ];

  // Define language names
  const languageNames = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'ar': 'Arabic', 'zh': 'Chinese',
    'ko': 'Korean', 'ja': 'Japanese', 'hi': 'Hindi', 'tr': 'Turkish',
    'nl': 'Dutch', 'sv': 'Swedish', 'da': 'Danish', 'no': 'Norwegian',
    'fi': 'Finnish', 'pl': 'Polish', 'cs': 'Czech', 'sk': 'Slovak',
    'hu': 'Hungarian', 'ro': 'Romanian', 'bg': 'Bulgarian', 'hr': 'Croatian',
    'sr': 'Serbian', 'sl': 'Slovenian', 'et': 'Estonian', 'lv': 'Latvian',
    'lt': 'Lithuanian', 'ru': 'Russian'
  };

  const box = document.createElement('div');
  box.id = 'ai-approval-box';
  box.className = 'spicyswipe-box';
  box.style.bottom = '80px';
  box.style.right = '20px';

  const message = typeof initialMessage === 'string' ? initialMessage : initialMessage.response || initialMessage;

  // Build tone options HTML
  const toneOptionsHtml = availableTones.map(t =>
    `<option value="${t.value}" ${t.value === currentTone ? 'selected' : ''}>${t.label}</option>`
  ).join('');

  // Build language options HTML from user's selected languages
  const languageOptionsHtml = selectedLanguages.map(lang =>
    `<option value="${lang}">${languageNames[lang] || lang.toUpperCase()}</option>`
  ).join('');

  box.innerHTML = `
    <div class="spicyswipe-box-header spicyswipe-box-header-purple">
      <div>
        <div class="spicyswipe-box-title">✨ ${i18n.t('approvalBox.title')}</div>
        <div class="spicyswipe-box-subtitle">${i18n.t('errors.forMatch')} ${profileInfo.name || 'match'}</div>
      </div>
      <button id="ai-close-btn" class="spicyswipe-close-btn">✕</button>
    </div>
    <div class="spicyswipe-box-content">
      <textarea id="ai-message-preview" class="spicyswipe-textarea">${message}</textarea>
      
      <!-- Tone and Translate Row -->
      <div class="spicyswipe-row">
        <div class="spicyswipe-col">
          <label class="spicyswipe-label">🎭 ${i18n.t('ai.tone')}</label>
          <select id="ai-tone-select" class="spicyswipe-select">
            ${toneOptionsHtml}
          </select>
        </div>
        <div class="spicyswipe-col">
          <label class="spicyswipe-label">🌐 ${i18n.t('approvalBox.translate')}</label>
          <select id="ai-translate-select" class="spicyswipe-select">
            <option value="">-- Select --</option>
            ${languageOptionsHtml}
          </select>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="spicyswipe-btn-group">
        <button id="ai-send-btn" class="spicyswipe-btn spicyswipe-btn-primary">${i18n.t('buttons.send')}</button>
        <button id="ai-regenerate-btn" class="spicyswipe-btn spicyswipe-btn-secondary">🔄</button>
      </div>
    </div>
  `;

  document.body.appendChild(box);

  // Make the box draggable by its header
  const header = box.querySelector('.spicyswipe-box-header');
  if (header) {
    header.style.cursor = 'grab';

    let isDragging = false;
    let startX, startY, initialX, initialY;

    header.addEventListener('mousedown', (e) => {
      // Don't start drag if clicking on close button
      if (e.target.tagName === 'BUTTON') return;

      isDragging = true;
      header.style.cursor = 'grabbing';

      startX = e.clientX;
      startY = e.clientY;

      const rect = box.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      // Prevent text selection during drag
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // Switch from bottom/right to top/left positioning for dragging
      box.style.bottom = 'auto';
      box.style.right = 'auto';
      box.style.left = `${initialX + deltaX}px`;
      box.style.top = `${initialY + deltaY}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = 'grab';
      }
    });
  }

  // Event handlers
  document.getElementById('ai-send-btn').onclick = () => {
    const finalMessage = document.getElementById('ai-message-preview').value;
    if (injectMessageAndSend(finalMessage)) {
      box.remove();
      if (typeof updateAllTimeAnalytics === 'function') {
        updateAllTimeAnalytics({ messages: 1 });
      }
    }
  };

  document.getElementById('ai-regenerate-btn').onclick = async () => {
    const selectedTone = document.getElementById('ai-tone-select').value;
    const newMessage = await generatePersonalizedMessage(profileInfo, chatHistory, { tone: selectedTone });
    if (newMessage && !newMessage.error) {
      document.getElementById('ai-message-preview').value = newMessage.response || newMessage;
    }
  };

  // Tone change handler - regenerate with new tone
  document.getElementById('ai-tone-select').onchange = async () => {
    const selectedTone = document.getElementById('ai-tone-select').value;
    const textarea = document.getElementById('ai-message-preview');
    const originalValue = textarea.value;
    textarea.style.opacity = '0.5';
    textarea.disabled = true;

    const newMessage = await generatePersonalizedMessage(profileInfo, chatHistory, { tone: selectedTone });

    textarea.style.opacity = '1';
    textarea.disabled = false;

    if (newMessage && !newMessage.error) {
      textarea.value = newMessage.response || newMessage;
    } else {
      textarea.value = originalValue; // Restore if failed
    }
  };

  // Translation handler
  document.getElementById('ai-translate-select').onchange = async () => {
    const targetLanguage = document.getElementById('ai-translate-select').value;
    if (!targetLanguage) return;

    const textarea = document.getElementById('ai-message-preview');
    const currentMessage = textarea.value;
    textarea.style.opacity = '0.5';
    textarea.disabled = true;

    // Request translation via AI
    const translatePrompt = `Translate the following message to ${languageNames[targetLanguage] || targetLanguage}. Keep the same tone and meaning. Only return the translated text, nothing else:\n\n"${currentMessage}"`;

    const translated = await getAIResponse(translatePrompt);

    textarea.style.opacity = '1';
    textarea.disabled = false;

    if (translated && !translated.error) {
      textarea.value = translated.response || translated;
    }

    // Reset the select
    document.getElementById('ai-translate-select').value = '';
  };

  document.getElementById('ai-close-btn').onclick = () => {
    box.remove();
  };
}

// Handler for new match detection
function onNewMatchDetected(matchId) {
  console.log('[Tinder AI] New match detected:', matchId);
  if (typeof updateAllTimeAnalytics === 'function') {
    updateAllTimeAnalytics({ matches: 1 });
  }
}
