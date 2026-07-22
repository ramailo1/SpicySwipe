// content/components/Sidebar.js
// Main Sidebar component, initializing logic, and Status Tab

// Global State Initializers (if not already set by content.js)
if (typeof window.sidebarActiveTab === 'undefined') window.sidebarActiveTab = 'status';
if (typeof window.sidebarConsentGiven === 'undefined') window.sidebarConsentGiven = false;

function injectSidebar() {
  console.log('[Tinder AI] injectSidebar called');

  // Wait for i18n to be initialized
  if (typeof i18nInitialized === 'undefined' || !i18nInitialized) {
    // Check if i18n is actually ready but flag missed
    if (typeof i18n !== 'undefined' && i18n.isInitialized) {
      console.log('[Tinder AI] i18n initialized (checked object)');
    } else {
      console.log('[Tinder AI] Waiting for i18n initialization...');
      setTimeout(injectSidebar, 500);
      return;
    }
  }

  // Remove any existing sidebar and styles to prevent duplicates
  const existingSidebar = document.getElementById('tinder-ai-sidebar');
  if (existingSidebar) {
    console.log('[Tinder AI] Removing existing sidebar');
    existingSidebar.remove();
  }

  // Inject shared popup/theme.css if not already present
  if (!document.getElementById('tinder-ai-theme-css')) {
    const themeLink = document.createElement('link');
    themeLink.id = 'tinder-ai-theme-css';
    themeLink.rel = 'stylesheet';
    themeLink.type = 'text/css';
    themeLink.href = chrome.runtime.getURL('popup/theme.css');
    document.head.appendChild(themeLink);
  }

  // Inject shared popup/styles.css if not already present
  if (!document.getElementById('tinder-ai-shared-css')) {
    console.log('[Tinder AI] Injecting CSS stylesheet');
    const link = document.createElement('link');
    link.id = 'tinder-ai-shared-css';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('popup/styles.css');
    document.head.appendChild(link);
    console.log('[Tinder AI] CSS stylesheet injected:', link.href);
  } else {
    console.log('[Tinder AI] CSS stylesheet already present');
  }

  // Create sidebar element
  const sidebar = document.createElement('div');
  sidebar.id = 'tinder-ai-sidebar';
  sidebar.className = 'tinder-ai-sidebar-debug dark'; // Default to dark theme

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
        <!-- Content populated by renderSidebarStatusTab -->
      </div>
      <div id="sidebar-tab-ai" class="sidebar-tab-panel">
        <!-- Content populated by renderSidebarAITab -->
      </div>
      <div id="sidebar-tab-swiping" class="sidebar-tab-panel">
        <!-- Content populated by renderSidebarSwipingTab -->
      </div>
      <div id="sidebar-tab-analytics" class="sidebar-tab-panel">
        <!-- Content populated by renderSidebarAnalyticsTab -->
      </div>
    </div>
  `;

  // Add sidebar to body
  document.body.appendChild(sidebar);
  console.log('[Tinder AI] Sidebar added to DOM');

  // Remove old toggle if present
  const oldToggle = document.querySelector('.tinder-ai-sidebar-toggle');
  if (oldToggle) oldToggle.remove();

  // Create the toggle button with SVG icon
  const toggleBtn = document.createElement('div');
  toggleBtn.className = 'tinder-ai-sidebar-toggle';
  toggleBtn.setAttribute('aria-label', i18n.t('sidebar.toggle') || 'Toggle Sidebar');
  toggleBtn.setAttribute('role', 'button');
  toggleBtn.setAttribute('tabindex', '0');
  toggleBtn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  `;
  document.body.appendChild(toggleBtn);

  // Toggle button logic
  toggleBtn.addEventListener('click', toggleSidebar);
  // Keyboard support for toggle
  toggleBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      toggleSidebar();
    }
  });

  // Setup Sidebar Tabs logic
  setupSidebarTabs();

  // --- Theme Logic (Powered by THEME_MANAGER) ---
  const themeToggle = sidebar.querySelector('#theme-toggle');
  if (themeToggle && typeof THEME_MANAGER !== 'undefined') {
    themeToggle.setAttribute('aria-label', i18n.t('sidebar.theme.toggle') || 'Cycle Theme');

    // Set initial icon
    const currentTheme = THEME_MANAGER.currentTheme;
    const themeDef = THEME_MANAGER.themes[currentTheme];
    if (themeDef) themeToggle.textContent = themeDef.icon;

    themeToggle.onclick = () => {
      const newThemeDef = THEME_MANAGER.cycleTheme();
      themeToggle.textContent = newThemeDef.icon;
      showToastNotification(`Theme: ${newThemeDef.name}`);
    };

    // Right click to reset to Auto
    themeToggle.oncontextmenu = (e) => {
      e.preventDefault();
      const season = THEME_MANAGER.enableAutoMode();
      const def = THEME_MANAGER.themes[season];
      themeToggle.textContent = def.icon;
      showToastNotification(`Auto-Theme Enabled: ${def.name}`);
    };
  }

  // --- Language Selector Logic ---
  const languageSelector = document.getElementById('language-selector');
  if (languageSelector) {
    if (typeof i18n !== 'undefined') languageSelector.value = i18n.getCurrentLocale();

    languageSelector.onchange = async (event) => {
      const newLocale = event.target.value;
      console.log(`[Tinder AI] Language changed to: ${newLocale}`);
      try {
        await i18n.changeLanguage(newLocale);
        updateSidebarTranslations();
        updateLanguageSelector(); // Sync UI
        showStatusMessage(i18n.t('notifications.languageChanged'));
      } catch (error) {
        console.error('[Tinder AI] Error changing language:', error);
        showErrorNotification('Failed to change language.');
      }
    };
  }

  // Validate AI Selection (Global Smart Revert)
  // Ensures invalid selections (premium without keys) are reverted to Gemini immediately on load
  let activeAI = stateStore.get('activeAI') || 'gemini';
  let aiChanged = false;

  if (activeAI === 'gemini-pro') {
    activeAI = 'gemini';
    aiChanged = true;
  }
  if (activeAI === 'chatgpt' && !stateStore.get('openaiApiKey')) {
    activeAI = 'gemini';
    aiChanged = true;
  } else if (activeAI === 'deepseek' && !stateStore.get('deepseekApiKey')) {
    activeAI = 'gemini';
    aiChanged = true;
  } else if (activeAI === 'claude' && !stateStore.get('anthropicApiKey')) {
    activeAI = 'gemini';
    aiChanged = true;
  }

  if (aiChanged) {
    console.log('[Tinder AI] Smart Revert: Switched AI to Gemini due to missing key');
    stateStore.set({ activeAI: 'gemini' });
  }

  // Initialize features
  renderSidebarActiveTab();
  createPersistentAIIcon();

  // Show consent overlay if not given
  const consent = stateStore.get('sidebarConsentGiven');
  if (!consent) {
    showConsentOverlay();
  } else {
    window.sidebarConsentGiven = true;
    // Inject wand buttons
    if (typeof injectWandButtons === 'function') injectWandButtons();
  }

  // Subscribe to stateStore for live analytics updates
  stateStore.subscribe((state) => {
    // Only refresh if sidebar is visible and we have needed functions
    const sidebar = document.getElementById('tinder-ai-sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
      // Debounce to avoid too many refreshes
      if (!window._analyticsRefreshTimer) {
        window._analyticsRefreshTimer = setTimeout(() => {
          renderSidebarActiveTab();
          window._analyticsRefreshTimer = null;
        }, 250);
      }
    }
  });

  console.log('[Tinder AI] Sidebar setup complete');
}

function toggleSidebar() {
  const sidebar = document.getElementById('tinder-ai-sidebar');
  const toggleBtn = document.querySelector('.tinder-ai-sidebar-toggle');
  if (!sidebar || !toggleBtn) return;

  sidebar.classList.toggle('active');
  toggleBtn.classList.toggle('active');

  // Update toggle icon rotation and tooltip (handled by CSS, but we can add logic if needed)
}

function setupSidebarTabs() {
  const sidebar = document.getElementById('tinder-ai-sidebar');
  if (!sidebar) return;
  const tabBtns = sidebar.querySelectorAll('.sidebar-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.sidebarActiveTab = btn.getAttribute('data-tab');

      const tabPanels = sidebar.querySelectorAll('.sidebar-tab-panel');
      tabPanels.forEach(panel => {
        panel.style.display = (panel.id === `sidebar-tab-${window.sidebarActiveTab}`) ? 'block' : 'none';
        if (panel.id === `sidebar-tab-${window.sidebarActiveTab}`) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
      renderSidebarActiveTab();
    });
  });
}

function renderSidebarActiveTab() {
  const activeTab = window.sidebarActiveTab || 'status';
  const consent = window.sidebarConsentGiven || false;

  if (activeTab === 'status') {
    renderSidebarStatusTab(consent);
  } else if (activeTab === 'ai') {
    if (typeof renderSidebarAITab === 'function') renderSidebarAITab(consent);
  } else if (activeTab === 'swiping') {
    if (typeof renderSidebarSwipingTab === 'function') renderSidebarSwipingTab(consent);
  } else if (activeTab === 'analytics') {
    if (typeof renderSidebarAnalyticsTab === 'function') renderSidebarAnalyticsTab(consent);
  }
}

// Refactored renderSidebarStatusTab using createElement for performance
function renderSidebarStatusTab(enabled) {
  const panel = document.getElementById('sidebar-tab-status');
  if (!panel) return;

  // Get stats from stateStore
  const sessionAnalytics = stateStore.get('sessionAnalytics') || { swipes: 0, likes: 0, nopes: 0, matches: 0, messages: 0 };
  // Update global analytics object if it exists
  if (typeof analytics !== 'undefined') {
    Object.assign(analytics, sessionAnalytics);
  }

  // Check if structure exists
  if (panel.children.length === 0) {
    renderStatusTabStructure(panel);
    setupStatusTabEventListeners(enabled);
  }

  updateStatusTabValues(enabled, sessionAnalytics);
}

function renderStatusTabStructure(container) {
  const fragment = document.createDocumentFragment();

  // 1. Profile Preview
  const profileDiv = document.createElement('div');
  profileDiv.className = 'sidebar-profile-preview sidebar-section-spacing';
  profileDiv.id = 'status-tab-profile';
  fragment.appendChild(profileDiv);

  // 2. Stats Box
  const statsBox = createStatusSidebarBox(i18n.t('analytics.today') || 'Today', 'status-stats');
  const statsBody = statsBox.querySelector('.sidebar-box-body');
  statsBody.style.display = 'grid'; // Improve alignment
  statsBody.style.gridTemplateColumns = '1fr 1fr';
  statsBody.style.gap = '8px';
  fragment.appendChild(createSectionSpacing(statsBox));

  // 3. Stealth Mode (Slider Toggle)
  const stealthBox = createStatusSidebarBox(i18n.t('swiping.stealthMode') || 'Stealth Mode', 'status-stealth');
  const stealthBody = stealthBox.querySelector('.sidebar-box-body');

  // Create toggle switch container
  const toggleContainer = document.createElement('div');
  toggleContainer.className = 'toggle-switch-container';
  toggleContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px 0;';

  const toggleLabel = document.createElement('span');
  toggleLabel.textContent = i18n.t('swiping.stealthMode') || 'Stealth Mode';
  toggleLabel.style.cssText = 'font-weight: 600; color: var(--text-primary, #fff);';

  // Create the actual toggle switch
  const toggleWrapper = document.createElement('label');
  toggleWrapper.className = 'toggle-switch';
  toggleWrapper.style.cssText = `
    position: relative;
    display: inline-block;
    width: 48px;
    height: 26px;
    cursor: pointer;
  `;

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = 'stealth-mode';
  input.style.cssText = 'opacity: 0; width: 0; height: 0;';

  const slider = document.createElement('span');
  slider.className = 'toggle-slider';
  slider.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.3s;
    border-radius: 26px;
  `;

  // Slider knob (pseudo-element via ::before doesn't work in JS, so create a div)
  const sliderKnob = document.createElement('span');
  sliderKnob.className = 'toggle-knob';
  sliderKnob.style.cssText = `
    position: absolute;
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;
  slider.appendChild(sliderKnob);

  // Handle state changes
  input.addEventListener('change', function () {
    if (this.checked) {
      slider.style.background = 'linear-gradient(135deg, #fd267a 0%, #ff7854 100%)';
      sliderKnob.style.transform = 'translateX(22px)';
    } else {
      slider.style.background = '#ccc';
      sliderKnob.style.transform = 'translateX(0)';
    }
  });

  toggleWrapper.appendChild(input);
  toggleWrapper.appendChild(slider);

  toggleContainer.appendChild(toggleLabel);
  toggleContainer.appendChild(toggleWrapper);

  stealthBody.appendChild(toggleContainer);

  const desc = document.createElement('div');
  desc.className = 'stealth-panel-desc';
  desc.textContent = i18n.t('swiping.stealthModeDesc');
  desc.style.cssText = 'font-size: 12px; color: var(--text-secondary, #888); margin-top: 8px;';
  stealthBody.appendChild(desc);

  fragment.appendChild(createSectionSpacing(stealthBox));

  // 4. Settings Summary
  const settingsBox = createStatusSidebarBox(i18n.t('status.title') || 'Status', 'status-settings');
  const settingsBody = settingsBox.querySelector('.sidebar-box-body');
  // We'll populate lines dynamically
  fragment.appendChild(createSectionSpacing(settingsBox));

  // 5. Page Warning
  const warningDiv = document.createElement('div');
  warningDiv.id = 'status-page-warning';
  // Content set dynamically
  fragment.appendChild(warningDiv);

  // 6. Controls
  const btnRow = document.createElement('div');
  btnRow.className = 'sidebar-btn-row';
  btnRow.innerHTML = `
      <button id="sidebar-start-btn" class="main-btn btn-start">▶️ ${i18n.t('swiping.startSwiping')}</button>
      <button id="sidebar-stop-btn" class="main-btn btn-stop">⏹️ ${i18n.t('swiping.stopSwiping')}</button>
      <button id="sidebar-like-btn" class="swipe-btn btn-like">👍 ${i18n.t('buttons.like')}</button>
      <button id="sidebar-dislike-btn" class="swipe-btn btn-nope">👎 ${i18n.t('buttons.nope')}</button>
    `;
  fragment.appendChild(btnRow);

  container.appendChild(fragment);
}

function updateStatusTabValues(enabled, stats) {
  // 1. Profile
  const profileContainer = document.getElementById('status-tab-profile');
  if (profileContainer) {
    const profile = (typeof window.currentProfile !== 'undefined' ? window.currentProfile : null) || (typeof extractProfileInfo === 'function' ? extractProfileInfo() : null);

    // Create a signature to compare changes efficiently
    const newSignature = profile ? `${profile.name}|${profile.age}|${profile.photo}` : 'null';
    const lastSignature = profileContainer.getAttribute('data-last-profile');

    if (newSignature !== lastSignature) {
      if (profile && profile.photo) {
        const safeName = typeof escapeHTML === 'function' ? escapeHTML(profile.name || 'Unknown') : (profile.name || 'Unknown');
        const safeAge = profile.age ? (typeof escapeHTML === 'function' ? escapeHTML(profile.age) : profile.age) : null;
        const safeInterests = profile.interests && profile.interests.length > 0
          ? profile.interests.map(i => `<span class="sidebar-profile-interest">${typeof escapeHTML === 'function' ? escapeHTML(i) : i}</span>`).join('')
          : '';

        profileContainer.innerHTML = `
                      <img src="${profile.photo}" alt="Profile" class="sidebar-profile-photo">
                      <div class="sidebar-profile-name">${safeName}</div>
                      ${safeAge ? `<div class="sidebar-profile-age">${safeAge} years old</div>` : ''}
                      ${safeInterests ? `<div class="sidebar-profile-interests">${safeInterests}</div>` : ''}
                  `;
      } else {
        profileContainer.innerHTML = `<div class="sidebar-profile-photo-placeholder">No Photo</div>`;
      }
      profileContainer.setAttribute('data-last-profile', newSignature);
    }
  }

  // 2. Stats
  // 2. Stats
  const statsBody = document.getElementById('status-stats-body');
  if (statsBody) {
    updateOrAddStatLine(statsBody, 'swipes', i18n.t('analytics.swipes') || 'Total Swipes', stats.swipes);
    updateOrAddStatLine(statsBody, 'likes', i18n.t('analytics.likes') || 'Total Likes', stats.likes);
    updateOrAddStatLine(statsBody, 'nopes', i18n.t('analytics.nopes') || 'Total Nopes', stats.nopes);
    updateOrAddStatLine(statsBody, 'matches', i18n.t('analytics.matches') || 'Total Matches', stats.matches);
  }

  // 3. Status Summary (Populate the empty 'Status' box)
  const settingsBody = document.getElementById('status-settings-body');
  if (settingsBody) {
    const activeAI = stateStore.get('activeAI') || 'Gemini';
    // Use dynamic currentAction from state, fallback to Idle
    const action = stateStore.get('currentAction') || (enabled ? 'Swiping' : 'Idle');

    updateOrAddStatLine(settingsBody, 'action', i18n.t('status.currentAction') || 'Current Action', action);
    updateOrAddStatLine(settingsBody, 'ai', i18n.t('ai.model') || 'AI Model', activeAI.charAt(0).toUpperCase() + activeAI.slice(1));
  }

  // 4. Stealth Mode
  const stealthCheckbox = document.getElementById('stealth-mode');
  if (stealthCheckbox && typeof ANTI_DETECTION !== 'undefined') {
    stealthCheckbox.checked = ANTI_DETECTION.stealthMode;
    // Also update slider visual state
    const slider = stealthCheckbox.parentElement.querySelector('.toggle-slider');
    const knob = slider ? slider.querySelector('.toggle-knob') : null;
    if (slider && knob) {
      if (ANTI_DETECTION.stealthMode) {
        slider.style.background = 'linear-gradient(135deg, #fd267a 0%, #ff7854 100%)';
        knob.style.transform = 'translateX(22px)';
      } else {
        slider.style.background = '#ccc';
        knob.style.transform = 'translateX(0)';
      }
    }
  }

  // 4. Page Warning
  const warningDiv = document.getElementById('status-page-warning');
  if (warningDiv) {
    if (!window.location.href.includes('tinder.com')) {
      warningDiv.textContent = '⚠️ ' + i18n.t('status.notOnTinder');
      warningDiv.className = 'status-warning';
    } else {
      warningDiv.textContent = '';
      warningDiv.className = '';
    }
  }

  // 5. Controls Updating (Start/Stop buttons)
  // 5. Controls Updating (Start/Stop buttons)
  const startBtn = document.getElementById('sidebar-start-btn');
  const stopBtn = document.getElementById('sidebar-stop-btn');

  // Determine actual swiping state from store
  const currentAction = stateStore.get('currentAction') || 'Idle';
  // Consider swiping active if action is not Idle, Error, or stopped states
  const isSwiping = currentAction === 'Swiping' || currentAction === 'Running';

  if (startBtn && stopBtn) {
    if (isSwiping) {
      startBtn.classList.add('btn-disabled');
      startBtn.disabled = true;
      stopBtn.classList.remove('btn-disabled');
      stopBtn.disabled = false;
    } else {
      startBtn.classList.remove('btn-disabled');
      startBtn.disabled = false;
      stopBtn.classList.add('btn-disabled');
      stopBtn.disabled = true;
    }
  }
}

function createStatusSidebarBox(title, idPrefix) {
  const box = document.createElement('div');
  box.className = 'sidebar-box';
  const header = document.createElement('div');
  header.className = 'sidebar-box-header';
  header.innerHTML = title;
  box.appendChild(header);
  const body = document.createElement('div');
  body.className = 'sidebar-box-body';
  body.id = idPrefix + '-body';
  box.appendChild(body);
  return box;
}

function updateOrAddStatLine(container, key, label, value) {
  let line = container.querySelector(`[data-key="${key}"]`);
  if (!line) {
    line = document.createElement('div');
    line.className = 'sidebar-stat-row';
    line.setAttribute('data-key', key);
    line.innerHTML = `
      <span class="sidebar-stat-label"></span>
      <span class="sidebar-stat-value"></span>
    `;
    container.appendChild(line);
  }

  const labelSpan = line.querySelector('.sidebar-stat-label');
  const valueSpan = line.querySelector('.sidebar-stat-value');

  if (labelSpan && labelSpan.textContent !== label) labelSpan.textContent = label;
  if (valueSpan && valueSpan.textContent !== String(value)) valueSpan.textContent = value;
}

function createSectionSpacing(element) {
  const wrapper = document.createElement('div');
  wrapper.className = 'sidebar-section-spacing';
  wrapper.appendChild(element);
  return wrapper;
}

function setupStatusTabEventListeners(enabled) {
  const startBtn = document.getElementById('sidebar-start-btn');
  const stopBtn = document.getElementById('sidebar-stop-btn');
  const likeBtn = document.getElementById('sidebar-like-btn');
  const dislikeBtn = document.getElementById('sidebar-dislike-btn');
  const stealthCheckbox = document.getElementById('stealth-mode');

  if (startBtn) startBtn.onclick = () => {
    if (typeof handleStartSwiping === 'function') handleStartSwiping();
    // UI update will happen via state change or timeout
    setTimeout(() => renderSidebarStatusTab(window.sidebarConsentGiven), 100);
  };
  if (stopBtn) stopBtn.onclick = () => {
    if (typeof handleStopSwiping === 'function') handleStopSwiping();
    setTimeout(() => renderSidebarStatusTab(window.sidebarConsentGiven), 100);
  };
  if (likeBtn) likeBtn.onclick = () => { if (typeof handleManualLike === 'function') handleManualLike(); };
  if (dislikeBtn) dislikeBtn.onclick = () => { if (typeof handleManualNope === 'function') handleManualNope(); };

  if (stealthCheckbox) {
    stealthCheckbox.addEventListener('change', (e) => {
      if (typeof ANTI_DETECTION !== 'undefined') ANTI_DETECTION.toggleStealthMode(e.target.checked);
    });
  }
}

function showConsentOverlay() {
  if (document.getElementById('tinder-ai-consent-overlay')) {
    console.log('[Tinder AI] Consent overlay already shown, skipping');
    return;
  }
  console.log('[Tinder AI] Showing consent overlay');
  // ... (Abbreviated, can delegate to separate file if desired, keeping here for now as part of core sidebar flow)
  // Re-implementing simplified logic or full logic
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  const langCode = browserLang.split('-')[0].toLowerCase();
  const supportedLanguages = DEFAULT_SELECTED_LANGUAGES;
  const detectedLanguage = supportedLanguages.includes(langCode) ? langCode : 'en';

  const overlay = document.createElement('div');
  overlay.id = 'tinder-ai-consent-overlay';
  overlay.className = 'tinder-ai-consent-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'tinder-ai-consent-dialog';

  dialog.innerHTML = `
    <h2 class="tinder-ai-consent-title">${i18n.t('consentOverlay.title', { lng: detectedLanguage })}</h2>
    <p class="tinder-ai-consent-description">${i18n.t('consentOverlay.description', { lng: detectedLanguage })}</p>
    <div class="tinder-ai-consent-features">
      ${i18n.t('consentOverlay.features', { lng: detectedLanguage }).map(f => `<div class="tinder-ai-consent-feature">${f}</div>`).join('')}
    </div>
    <button class="tinder-ai-consent-accept-btn">${i18n.t('consentOverlay.acceptButton', { lng: detectedLanguage })}</button>
  `;

  dialog.querySelector('button').onclick = () => {
    console.log('[Tinder AI] Consent given');
    window.sidebarConsentGiven = true;
    stateStore.set({ sidebarConsentGiven: true });
    overlay.remove();
    createPersistentAIIcon();
    if (typeof injectWandButtons === 'function') injectWandButtons();
    renderSidebarActiveTab();

    // Chain Onboarding Wizard immediately after consent (Force it!)
    if (typeof SpicySwipeWizard !== 'undefined') {
      SpicySwipeWizard.init(true);
    }
  };

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}

function updateLanguageSelector() {
  const languageSelector = document.getElementById('language-selector');
  if (languageSelector && typeof i18n !== 'undefined') {
    languageSelector.value = i18n.getCurrentLocale();
  }
}

function updateSidebarTranslations() {
  // Simple re-render of current tab
  renderSidebarActiveTab();
  // Update Header Title
  const sidebar = document.getElementById('tinder-ai-sidebar');
  if (sidebar) {
    const title = sidebar.querySelector('.sidebar-ai-title h1');
    if (title) title.textContent = i18n.t('extension.name');

    const tabBtns = sidebar.querySelectorAll('.sidebar-tab-btn');
    tabBtns.forEach(btn => {
      const tab = btn.getAttribute('data-tab');
      if (tab) btn.textContent = i18n.t(`sidebar.tabs.${tab}`);
    });
  }
}

function createPersistentAIIcon() {
  if (document.getElementById('ai-persistent-icon')) return;

  const icon = document.createElement('div');
  icon.id = 'ai-persistent-icon';
  icon.innerHTML = '🤖';
  icon.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
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
    console.log('[Tinder AI] AI Icon Clicked');

    // 1. Enter Loading State
    const originalIcon = icon.innerHTML;
    icon.innerHTML = '⏳';
    icon.style.cursor = 'wait';

    // Create "Thinking..." tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'ai-icon-tooltip';
    tooltip.innerText = 'Thinking...';
    tooltip.style.cssText = `
        position: absolute;
        bottom: 70px; 
        right: 0;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: bold;
        white-space: nowrap;
        pointer-events: none;
        z-index: 10002;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    icon.appendChild(tooltip);

    // Animate tooltip in
    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(0)';
    });

    // Find current chat container
    const chatSelectors = [
      'div[class*="chat"]',
      'div[class*="conversation"]',
      'main[role="main"]',
      'main',
      'div[class*="App"] > div'
    ];

    let chatContainer = null;
    for (const s of chatSelectors) {
      const el = document.querySelector(s);
      if (el && el.innerText.length > 50) { // Simple heuristic: has content
        chatContainer = el;
        break;
      }
    }

    if (!chatContainer) {
      showToastNotification('Open a chat to use AI assistant', 'warning');
      // Reset Loading State
      icon.innerHTML = originalIcon;
      icon.style.cursor = 'pointer';
      tooltip.remove();
      return;
    }

    // Extract Info
    const profileInfo = typeof extractDetailedProfileInfo === 'function' ? extractDetailedProfileInfo(chatContainer) : { name: 'Unknown' };
    const chatHistory = typeof extractChatHistory === 'function' ? extractChatHistory() : [];

    // Show Approval Box
    if (typeof displayMessageForApproval === 'function') {
      // Update tooltip to "Generating..."
      tooltip.innerText = 'Generating...';
      stateStore.set({ currentAction: 'Generating Message...' });

      try {
        const message = await generatePersonalizedMessage(profileInfo, chatHistory);
        if (message && !message.error) {
          displayMessageForApproval(message, profileInfo, chatHistory);
        } else {
          displayErrorBox(message?.error || 'Failed to generate message', profileInfo);
        }
      } catch (e) {
        showToastNotification('Error generating message', 'error');
      } finally {
        // Reset Loading State
        icon.innerHTML = originalIcon;
        icon.style.cursor = 'pointer';
        tooltip.style.opacity = '0';
        stateStore.set({ currentAction: 'Idle' });
        setTimeout(() => tooltip.remove(), 200);
      }
    }
  });

  document.body.appendChild(icon);
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

function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'tinder-ai-error-notification';
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; background: #f56565; color: white;
    padding: 12px 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10001; font-family: sans-serif; font-size: 14px; max-width: 300px;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
}


// Make injectSidebar available globally
function showToastNotification(message, type = 'success') {
  const existing = document.getElementById('tinder-ai-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'tinder-ai-toast';
  toast.className = `tinder-ai-toast ${type}`;
  toast.innerHTML = `
      <div class="toast-content">
          <span class="toast-icon">${type === 'success' ? '✅' : '⚠️'}</span>
          <span class="toast-message">${message}</span>
      </div>
  `;

  // Inline styles for the toast to ensure it looks good immediately
  toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--surface-elevated, #ffffff);
      color: var(--text, #0f172a);
      padding: 12px 20px;
      border-radius: 50px;
      box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1));
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 10002;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
      border: 1px solid var(--border, #e2e8f0);
      font-weight: 500;
  `;

  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Make globally available
window.injectSidebar = injectSidebar;
window.showToastNotification = showToastNotification;
