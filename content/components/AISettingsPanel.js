// content/components/AISettingsPanel.js
// Handles the AI Settings tab in the sidebar

function renderSidebarAITab(enabled) {
  const aiPanel = document.getElementById('sidebar-tab-ai');
  if (!aiPanel) return;
  if (!chrome.runtime?.id) return;

  // Check if structure exists
  if (aiPanel.children.length === 0) {
    renderAITabStructure(aiPanel);
    setupAITabEventListeners();
  }

  // Load latest data
  updateAITabValues();
}

function renderAITabStructure(container) {
  const fragment = document.createDocumentFragment();

  const content = document.createElement('div');
  content.className = 'sidebar-panel-content';

  // AI Settings Box
  const aiBox = createAISidebarBox(i18n.t('ai.title') || 'AI Settings', 'ai-settings');
  const aiBody = aiBox.querySelector('.sidebar-box-body');

  const modelRow = createAISettingRow('select', 'ai-model-select', i18n.t('ai.model') || 'AI Model');
  const modelSelect = modelRow.querySelector('#ai-model-select'); // Use ID for certainty
  const models = [
    { val: 'gemini', text: 'Google Gemini' }, // Unified
    // { val: 'gemini-pro', text: 'Google Gemini Pro' }, // REMOVED: Merged into 'gemini'
    { val: 'chatgpt', text: 'ChatGPT (GPT-4o)' },
    { val: 'deepseek', text: 'DeepSeek' },
    { val: 'claude', text: 'Claude (Anthropic)' },
    { val: 'ollama', text: 'Ollama (Local AI)' }
  ];
  if (modelSelect) {
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.val;
      opt.textContent = m.text;
      modelSelect.appendChild(opt);
    });
  } else {
    console.error('[Tinder AI] Error: AI Model select element not created correctly.');
  }
  aiBody.appendChild(modelRow);

  const apiKeyRow = createAISettingRow('text', 'ai-api-key-input', 'API Key');
  apiKeyRow.id = 'api-key-row';
  const apiLabel = apiKeyRow.querySelector('label');
  if (apiLabel) apiLabel.id = 'api-key-label';
  const apiInput = apiKeyRow.querySelector('input');
  if (apiInput) {
    apiInput.type = 'password';
    apiInput.placeholder = 'Enter API key';
  }
  aiBody.appendChild(apiKeyRow);

  const ollamaUrlRow = createAISettingRow('text', 'ollama-url-input', 'Ollama Base URL');
  ollamaUrlRow.id = 'ollama-url-row';
  const ollamaUrlInput = ollamaUrlRow.querySelector('input');
  if (ollamaUrlInput) {
    ollamaUrlInput.placeholder = 'http://localhost:11434';
  }
  aiBody.appendChild(ollamaUrlRow);

  const ollamaModelRow = createAISettingRow('text', 'ollama-model-input', 'Ollama Model');
  ollamaModelRow.id = 'ollama-model-row';
  const ollamaModelInput = ollamaModelRow.querySelector('input');
  if (ollamaModelInput) {
    ollamaModelInput.placeholder = 'llama3.2';
  }
  aiBody.appendChild(ollamaModelRow);

  content.appendChild(aiBox);

  // Messaging Settings Box
  const msgBox = createAISidebarBox(i18n.t('ai.messaging.title') || 'Messaging Settings', 'messaging-settings');
  const msgBody = msgBox.querySelector('.sidebar-box-body');

  const toneRow = createAISettingRow('select', 'messaging-tone-select', i18n.t('ai.messaging.tone') || 'Tone');
  const toneSelect = toneRow.querySelector('#messaging-tone-select');
  if (toneSelect) {
    APP_CONSTANTS.TONE_OPTIONS.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.value;
      opt.textContent = t.label;
      toneSelect.appendChild(opt);
    });
  }
  msgBody.appendChild(toneRow);

  const langRow = createAISettingRow('select', 'messaging-language-select', i18n.t('ai.messaging.language') || 'Language');
  msgBody.appendChild(langRow);

  const autoSendRow = createAIToggleRow('auto-send-checkbox', i18n.t('ai.messaging.autoSend') || 'Auto Send');
  msgBody.appendChild(autoSendRow);

  const autoMatchRow = createAIToggleRow('auto-message-match-checkbox', i18n.t('ai.messaging.autoMessageOnMatch') || 'Auto Message on Match');
  msgBody.appendChild(autoMatchRow);

  content.appendChild(msgBox);

  // Language Preferences Box
  const langPrefsBox = createAISidebarBox(i18n.t('ai.languagePreferences.title') || 'Language Preferences', 'language-prefs');
  const langHeader = langPrefsBox.querySelector('.sidebar-box-header');
  langHeader.classList.add('collapsible');
  langHeader.id = 'language-prefs-header';
  langHeader.style.cursor = 'pointer';
  langHeader.innerHTML += ' <span class="collapse-icon">▲</span>'; // Re-append icon

  const langBody = langPrefsBox.querySelector('.sidebar-box-body');
  langBody.id = 'language-prefs-body';

  const listContainer = document.createElement('div');
  listContainer.id = 'language-checkbox-list-container';
  listContainer.className = 'language-checkbox-list';
  listContainer.style.cssText = 'max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;';
  langBody.appendChild(listContainer);

  const btnRow = document.createElement('div');
  btnRow.className = 'language-btn-row';
  btnRow.style.cssText = 'margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;';

  btnRow.appendChild(createAISmallBtn('select-all-langs', 'Select All', '#6366f1', 'white'));
  btnRow.appendChild(createAISmallBtn('clear-all-langs', 'Clear All', '#f3f4f6', '#374151'));
  btnRow.appendChild(createAISmallBtn('reset-langs', 'Reset to Default', '#fef2f2', '#dc2626'));

  langBody.appendChild(btnRow);

  const countDiv = document.createElement('div');
  countDiv.className = 'selected-count';
  countDiv.style.cssText = 'margin-top: 8px; font-size: 12px; color: #666;';
  countDiv.textContent = 'Selected: 0 languages selected';
  langBody.appendChild(countDiv);

  content.appendChild(langPrefsBox);

  // Save Button
  const saveBtn = document.createElement('button');
  saveBtn.id = 'ai-settings-save-btn';
  saveBtn.className = 'main-btn btn-start';
  saveBtn.style.cssText = 'width: 100%; margin-top: 16px;';
  saveBtn.textContent = i18n.t('buttons.save') || 'Save';
  content.appendChild(saveBtn);

  // Subtle Reset Link
  const resetLink = document.createElement('div');
  resetLink.style.cssText = 'text-align: center; margin-top: 20px;';
  const a = document.createElement('a');
  a.textContent = 'Reset Extension Data';
  a.style.cssText = 'font-size: 11px; color: #666; text-decoration: underline; cursor: pointer; opacity: 0.7;';
  a.onmouseover = () => a.style.opacity = '1';
  a.onmouseout = () => a.style.opacity = '0.7';

  a.onclick = () => showCustomResetModal();

  resetLink.appendChild(a);
  content.appendChild(resetLink);
  // content.appendChild(saveBtn); // Already appended via replaceLogic above, but let's clean up duplicate append
  // The replace logic was a bit messy, let's just finish the fragment.

  fragment.appendChild(content);
  container.appendChild(fragment);

  // Initial population of languages
  populateLanguageList();
}

function updateAITabValues() {
  let activeAI = stateStore.get('activeAI') || 'gemini';

  // Migration & Smart Default Logic
  // 1. Migrate legacy 'gemini-pro'
  if (activeAI === 'gemini-pro') {
    activeAI = 'gemini';
    stateStore.set({ activeAI: 'gemini' });
  }

  // 2. Smart Revert: If selected AI (non-Gemini) has no key, revert to Gemini
  // This ensures users don't get stuck on ChatGPT/Claude without keys
  if (activeAI === 'chatgpt' && !stateStore.get('openaiApiKey')) {
    activeAI = 'gemini';
    stateStore.set({ activeAI: 'gemini' });
  } else if (activeAI === 'deepseek' && !stateStore.get('deepseekApiKey')) {
    activeAI = 'gemini';
    stateStore.set({ activeAI: 'gemini' });
  } else if (activeAI === 'claude' && !stateStore.get('anthropicApiKey')) {
    activeAI = 'gemini';
    stateStore.set({ activeAI: 'gemini' });
  }

  const messagingConfig = stateStore.get('messagingConfig') || APP_CONSTANTS.DEFAULT_CONFIG.messaging;

  // Update AI Model
  const modelSelect = document.getElementById('ai-model-select');
  if (modelSelect) modelSelect.value = activeAI;

  // Update API Key Display
  updateApiKeyDisplay(activeAI || 'gemini');

  // Update Messaging Config
  const toneSelect = document.getElementById('messaging-tone-select');
  if (toneSelect) toneSelect.value = messagingConfig.tone || 'friendly';

  const autoSend = document.getElementById('auto-send-checkbox');
  if (autoSend) autoSend.checked = messagingConfig.autoSend || false;

  const autoMatch = document.getElementById('auto-message-match-checkbox');
  if (autoMatch) autoMatch.checked = messagingConfig.autoMessageOnMatch || false;

  // Update Selected Languages and Messaging Language Dropdown
  const selectedLanguages = messagingConfig.selectedLanguages || stateStore.get('selectedLanguages') || DEFAULT_SELECTED_LANGUAGES;

  // Sync checkboxes
  const checkboxes = document.querySelectorAll('.lang-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = selectedLanguages.includes(cb.value);
  });

  updateSelectedCount(); // This also updates the messaging language dropdown

  // Set Messaging Language value after options are repopulated
  const msgLang = document.getElementById('messaging-language-select');
  if (msgLang && messagingConfig.language && msgLang.options) {
    if (Array.from(msgLang.options).some(o => o.value === messagingConfig.language)) {
      msgLang.value = messagingConfig.language;
    }
  }
}

function updateApiKeyDisplay(model) {
  const apiKeyRow = document.getElementById('api-key-row');
  const apiKeyLabel = document.getElementById('api-key-label');
  const apiKeyInput = document.getElementById('ai-api-key-input');
  const ollamaUrlRow = document.getElementById('ollama-url-row');
  const ollamaModelRow = document.getElementById('ollama-model-row');
  const ollamaUrlInput = document.getElementById('ollama-url-input');
  const ollamaModelInput = document.getElementById('ollama-model-input');

  if (model === 'ollama') {
    if (apiKeyRow) apiKeyRow.style.display = 'none';
    if (ollamaUrlRow) ollamaUrlRow.style.display = 'flex';
    if (ollamaModelRow) ollamaModelRow.style.display = 'flex';

    if (ollamaUrlInput) ollamaUrlInput.value = stateStore.get('ollamaUrl') || 'http://localhost:11434';
    if (ollamaModelInput) ollamaModelInput.value = stateStore.get('ollamaModel') || 'llama3.2';
    return;
  }

  if (apiKeyRow) apiKeyRow.style.display = 'flex';
  if (ollamaUrlRow) ollamaUrlRow.style.display = 'none';
  if (ollamaModelRow) ollamaModelRow.style.display = 'none';

  if (!apiKeyLabel || !apiKeyInput) return;

  // Unified Gemini Key Logic
  // Check geminiApiKey first, fallback to legacy keys if empty
  const geminiKey = stateStore.get('geminiApiKey') || stateStore.get('geminiFreeApiKey') || stateStore.get('geminiProApiKey');

  const data = {
    gemini: geminiKey,
    'gemini-pro': geminiKey, // Map both to same unified key
    chatgpt: stateStore.get('openaiApiKey'),
    deepseek: stateStore.get('deepseekApiKey'),
    claude: stateStore.get('anthropicApiKey')
  };

  const labels = {
    gemini: 'Google Gemini API Key',
    'gemini-pro': 'Google Gemini API Key', // Same label
    chatgpt: 'OpenAI API Key',
    deepseek: 'DeepSeek API Key',
    claude: 'Anthropic API Key'
  };

  apiKeyLabel.textContent = labels[model] || 'API Key';
  apiKeyInput.value = data[model] || '';
}

function createAISidebarBox(title, idPrefix) {
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

function createAISettingRow(type, id, labelText) {
  const row = document.createElement('div');
  row.className = 'settings-row';
  const label = document.createElement('label');
  label.className = 'settings-label';
  label.textContent = labelText;
  row.appendChild(label);

  if (type === 'select') {
    const select = document.createElement('select');
    select.className = 'settings-select';
    select.id = id;
    row.appendChild(select);
    return row;
  }

  // Input fallback
  const input = document.createElement('input');
  input.className = 'settings-input';
  input.id = id;
  if (type !== 'text') input.type = type;
  row.appendChild(input);
  return row;
}

function createAIToggleRow(id, labelText) {
  const row = document.createElement('div');
  row.className = 'settings-row';
  row.style.justifyContent = 'space-between'; // Push toggle to right

  const label = document.createElement('label');
  label.className = 'settings-label flex items-center';
  label.style.marginBottom = '0'; // Align vertical
  label.textContent = labelText;
  label.htmlFor = id; // Accessibility

  const switchLabel = document.createElement('label');
  switchLabel.className = 'switch';
  switchLabel.style.marginLeft = '12px'; // Spacing

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;

  const slider = document.createElement('span');
  slider.className = 'slider round';

  switchLabel.appendChild(input);
  switchLabel.appendChild(slider);

  row.appendChild(label);
  row.appendChild(switchLabel);
  return row;
}

function createAISmallBtn(id, text, bg, color) {
  const btn = document.createElement('button');
  btn.id = id;
  btn.className = 'small-btn';
  btn.style.cssText = `padding: 6px 12px; font-size: 12px; border-radius: 4px; background: ${bg}; color: ${color}; border: none; cursor: pointer;`;
  btn.textContent = text;
  return btn;
}

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function setupAITabEventListeners() {
  // Model change
  const modelSelect = document.getElementById('ai-model-select');
  if (modelSelect) {
    modelSelect.addEventListener('change', (e) => {
      updateApiKeyDisplay(e.target.value);
    });
  }

  // API Key Debounced Save
  const apiKeyInput = document.getElementById('ai-api-key-input');
  if (apiKeyInput) {
    const debouncedKeySave = debounce((val) => {
      const model = document.getElementById('ai-model-select')?.value || 'gemini';
      const storageObj = {};
      if (model === 'gemini' || model === 'gemini-pro') {
        storageObj.geminiApiKey = val;
      }
      else if (model === 'chatgpt') storageObj.openaiApiKey = val;
      else if (model === 'deepseek') storageObj.deepseekApiKey = val;
      else if (model === 'claude') storageObj.anthropicApiKey = val;

      stateStore.set(storageObj).then(() => {
        console.log('[Tinder AI] API Key auto-saved');
      });
    }, 1000);

    apiKeyInput.addEventListener('input', (e) => {
      debouncedKeySave(e.target.value);
    });
  }

  // Ollama settings debounced save
  const ollamaUrlInput = document.getElementById('ollama-url-input');
  if (ollamaUrlInput) {
    const debouncedUrlSave = debounce((val) => {
      stateStore.set({ ollamaUrl: val }).then(() => {
        console.log('[Tinder AI] Ollama URL auto-saved');
      });
    }, 1000);
    ollamaUrlInput.addEventListener('input', (e) => debouncedUrlSave(e.target.value));
  }

  const ollamaModelInput = document.getElementById('ollama-model-input');
  if (ollamaModelInput) {
    const debouncedModelSave = debounce((val) => {
      stateStore.set({ ollamaModel: val }).then(() => {
        console.log('[Tinder AI] Ollama Model auto-saved');
      });
    }, 1000);
    ollamaModelInput.addEventListener('input', (e) => debouncedModelSave(e.target.value));
  }

  // Save button (Manual Save for non-key settings mainly, or confirmation)
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

      // Add API key or Ollama settings based on model (Explicit save updates it too)
      if (model === 'gemini' || model === 'gemini-pro') {
        storageObj.geminiApiKey = apiKey;
      }
      else if (model === 'chatgpt') storageObj.openaiApiKey = apiKey;
      else if (model === 'deepseek') storageObj.deepseekApiKey = apiKey;
      else if (model === 'claude') storageObj.anthropicApiKey = apiKey;
      else if (model === 'ollama') {
        storageObj.ollamaUrl = document.getElementById('ollama-url-input')?.value || 'http://localhost:11434';
        storageObj.ollamaModel = document.getElementById('ollama-model-input')?.value || 'llama3.2';
      }

      stateStore.set(storageObj).then(() => {
        console.log('[Tinder AI] AI settings saved:', storageObj);
        if (typeof AI_INTEGRATION !== 'undefined') {
          AI_INTEGRATION.currentAI = model;
        }
        if (typeof showToastNotification === 'function') {
          showToastNotification(i18n.t('notifications.saved') || 'Settings saved!', 'success');
        }
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
        if (icon) icon.textContent = '▲';
      } else {
        body.style.display = 'none';
        if (icon) icon.textContent = '▼';
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
      const defaults = DEFAULT_SELECTED_LANGUAGES;
      document.querySelectorAll('.lang-checkbox').forEach(cb => {
        cb.checked = defaults.includes(cb.value);
      });
      updateSelectedCount();
    });
  }

  // Update count when checkboxes change (Event Delegation)
  const listContainer = document.getElementById('language-checkbox-list-container');
  if (listContainer) {
    listContainer.addEventListener('change', (e) => {
      if (e.target.matches('.lang-checkbox')) {
        updateSelectedCount();
      }
    });
  }
}

function updateSelectedCount() {
  const checkedBoxes = Array.from(document.querySelectorAll('.lang-checkbox:checked'));
  const count = checkedBoxes.length;
  const countEl = document.querySelector('.selected-count');
  if (countEl) {
    countEl.textContent = `Selected: ${count} languages selected`;
  }

  // Reactive update of Messaging Language dropdown
  const msgLangSelect = document.getElementById('messaging-language-select');
  if (msgLangSelect && msgLangSelect.options) {
    const currentVal = msgLangSelect.value;
    const previousOptions = Array.from(msgLangSelect.options).map(o => o.value).join(',');

    // If no languages selected, fallback to showing all available options from the list
    let inputList = checkedBoxes;
    if (inputList.length === 0) {
      inputList = Array.from(document.querySelectorAll('.lang-checkbox'));
    }

    const newOptionsStr = inputList.map(cb => cb.value).join(',');

    // Only rebuild if options changed
    if (previousOptions !== newOptionsStr) {
      msgLangSelect.innerHTML = '';
      const fragment = document.createDocumentFragment();
      inputList.forEach(cb => {
        const code = cb.value;
        const labelEl = cb.nextElementSibling;
        const label = labelEl ? labelEl.textContent : code;

        const option = document.createElement('option');
        option.value = code;
        option.textContent = label;
        fragment.appendChild(option);
      });
      msgLangSelect.appendChild(fragment);

      // Restore selection if possible, otherwise select first
      if (Array.from(msgLangSelect.options).some(opt => opt.value === currentVal)) {
        msgLangSelect.value = currentVal;
      } else if (msgLangSelect.options.length > 0) {
        msgLangSelect.value = msgLangSelect.options[0].value;
      }
    }
  }
}

// Helper: Populate language list efficiently using DocumentFragment
function populateLanguageList() {
  const container = document.getElementById('language-checkbox-list-container');
  if (!container) return;

  if (container.children.length > 0) return; // Already populated

  // Logic to get languages
  let languages = [];
  if (typeof getAllLanguageOptions === 'function') {
    const opts = getAllLanguageOptions();
    languages = opts.map(o => ({
      code: o.value,
      name: o.text.split('(')[0].trim(),
      nativeName: o.text.match(/\(([^)]+)\)/)?.[1] || ''
    }));
  } else {
    languages = DEFAULT_SELECTED_LANGUAGES.map(code => ({
      code,
      name: WORLDWIDE_LANGUAGES[code]?.name || code,
      nativeName: WORLDWIDE_LANGUAGES[code]?.native || ''
    }));
  }

  // Get currently selected from store or defaults for initial check
  // Note: Actual checked state will be synced in updateAITabValues

  const fragment = document.createDocumentFragment();

  languages.forEach(l => {
    const label = document.createElement('label');
    label.className = 'language-checkbox-item';
    label.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 4px 0; cursor: pointer;';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = l.code;
    input.className = 'lang-checkbox';
    // Checked state set by updateAITabValues later

    const span = document.createElement('span');
    span.textContent = `${l.name} (${l.nativeName})`;

    label.appendChild(input);
    label.appendChild(span);
    fragment.appendChild(label);
  });

  container.appendChild(fragment);
}


// Custom Glassmorphism Modal for Reset Confirmation
window.showCustomResetModal = function () {
  // Remove existing if any
  const existing = document.getElementById('spicyswipe-reset-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'spicyswipe-reset-modal';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(12px);
    z-index: 2147483647; display: flex; justify-content: center; align-items: center;
    opacity: 0; transition: opacity 0.3s ease;
  `;

  const box = document.createElement('div');
  box.className = 'tinder-ai-consent-dialog'; // Reuse main consent class for consistent gradients/shadows
  box.style.cssText = `
    width: 380px; padding: 32px; text-align: center;
    background: linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(35,35,45,0.98) 100%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05);
    border-radius: 24px;
    transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    font-family: 'Proxima Nova', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  `;

  box.innerHTML = `
    <div style="font-size: 64px; margin-bottom: 20px; animation: float 3s ease-in-out infinite;">😿</div>
    <h3 style="color: #fff; margin: 0 0 12px; font-size: 24px; font-weight: 700; background: linear-gradient(90deg, #ff6b6b, #feca57); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Start Over?</h3>
    <p style="color: #e0e0e0; font-size: 15px; line-height: 1.6; margin-bottom: 12px;">
      Are you sure you want to reset everything?
    </p>
    <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 28px; font-style: italic;">
      "Every new beginning comes from some other beginning's end... but your custom settings will be lost forever!" 💔
    </p>
    <div style="display: flex; gap: 12px; flex-direction: column-reverse;">
       <button id="reset-confirm-btn" style="width: 100%; padding: 14px; border-radius: 14px; border: 1px dashed rgba(255,255,255,0.2); background: rgba(255,0,0,0.1); color: #ff5252; font-weight: 600; cursor: pointer; transition: all 0.2s;">
        Yes, Wipe Everything
      </button>
      <button id="reset-cancel-btn" style="width: 100%; padding: 14px; border-radius: 14px; border: none; background: linear-gradient(45deg, #fd267a, #ff6036); color: #fff; font-weight: 700; font-size: 16px; cursor: pointer; box-shadow: 0 4px 15px rgba(253,38,122,0.4); text-transform: uppercase; letter-spacing: 0.5px;">
        Wait, I'll Stay!
      </button>
    </div>
    <style>
      @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
      #reset-confirm-btn:hover { background: rgba(255,0,0,0.2) !important; color: #ff8888 !important; }
      #reset-cancel-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(253,38,122,0.6) !important; }
    </style>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Animation
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    box.style.transform = 'scale(1)';
  });

  // Handlers
  overlay.querySelector('#reset-cancel-btn').onclick = () => {
    overlay.style.opacity = '0';
    box.style.transform = 'scale(0.9)';
    setTimeout(() => overlay.remove(), 300);
  };

  overlay.querySelector('#reset-confirm-btn').onclick = () => {
    const btn = overlay.querySelector('#reset-confirm-btn');
    btn.textContent = 'Deleting memories...';
    btn.style.opacity = '0.7';

    // Perform Reset (Atomic)
    chrome.storage.local.set({
      hasCompletedOnboarding: false,
      sidebarConsentGiven: false,
      activeConversations: {}
    }, () => {
      setTimeout(() => location.reload(), 800);
    });
  };
}
