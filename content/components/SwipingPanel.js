// content/components/SwipingPanel.js
// Handles Swiping UI and Settings

function renderSidebarSwipingTab(enabled) {
    const swipingPanel = document.getElementById('sidebar-tab-swiping');
    if (!swipingPanel) return;
    swipingPanel.style.overflowY = 'auto';
    swipingPanel.style.maxHeight = 'calc(100vh - 60px)';

    // Check if structure exists
    if (swipingPanel.children.length === 0) {
        renderSwipingStructure(swipingPanel);
        setupSwipingEventListeners();
        setupResetConsentEventListener();
    }

    // Update values
    updateSwipingValues();
}

function renderSwipingStructure(container) {
    const fragment = document.createDocumentFragment();

    // Swiping Settings Box
    const settingsBox = createSidebarBox(i18n.t('swiping.title') || 'Swiping Settings', 'swiping-settings');
    const settingsBody = settingsBox.querySelector('.sidebar-box-body');

    // Like Ratio
    const ratioRow = createSettingRow('range', 'like-ratio', i18n.t('swiping.likeRatio') || 'Like Ratio (%)');
    const ratioInput = ratioRow.querySelector('input');
    ratioInput.min = '10';
    ratioInput.max = '100';
    ratioInput.className = 'settings-input sidebar-input-grow';
    // Add value display
    const valDisplay = document.createElement('span');
    valDisplay.id = 'like-ratio-value';
    valDisplay.className = 'settings-value sidebar-label-min sidebar-text-right';
    ratioRow.querySelector('.sidebar-flex-row').appendChild(valDisplay);

    settingsBody.appendChild(ratioRow);

    // Max Swipes
    const maxSwipesRow = createSettingRow('number', 'max-swipes', i18n.t('swiping.maxSwipes') || 'Max Swipes');
    const maxSwipesInput = maxSwipesRow.querySelector('input');
    maxSwipesInput.min = '1';
    maxSwipesInput.max = '500';
    settingsBody.appendChild(maxSwipesRow);

    fragment.appendChild(settingsBox);

    // Future Settings
    const futureDiv = document.createElement('div');
    futureDiv.innerHTML = `
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
    fragment.appendChild(futureDiv);

    // Save Button (Kept for manual save, though auto-save is added)
    const saveDiv = document.createElement('div');
    saveDiv.innerHTML = `
      <div class="settings-divider"></div>
      <button id="save-swiping-settings" class="main-btn sidebar-save-btn-green sidebar-btn-full">${i18n.t('buttons.save')} ${i18n.t('swiping.title')}</button>
      <div id="swiping-settings-status" class="settings-status"></div>
    `;
    fragment.appendChild(saveDiv);

    // Reset Consent
    const resetDiv = document.createElement('div');
    resetDiv.innerHTML = `
      <div class="settings-divider"></div>
      <button id="reset-consent-btn" class="main-btn sidebar-btn-full" style="background: var(--danger); color: var(--text-light); border: 1px solid var(--danger); margin-top: 12px;">
        🔄 Reset Consent & Revoke Access
      </button>
      <div id="reset-consent-status" class="settings-status"></div>
    `;
    fragment.appendChild(resetDiv);

    container.appendChild(fragment);
}

function createSidebarBox(title, idPrefix) {
    const box = document.createElement('div');
    box.className = 'sidebar-box';
    const header = document.createElement('div');
    header.className = 'settings-header';
    header.textContent = title;
    box.appendChild(header);
    const body = document.createElement('div');
    body.className = 'sidebar-box-body'; // Using standard body class for consistency
    body.id = idPrefix + '-body';
    box.appendChild(body);
    return box;
}

function createSettingRow(type, id, labelText) {
    const row = document.createElement('div');
    row.className = 'settings-row';
    const label = document.createElement('label');
    label.htmlFor = id;
    label.className = 'settings-label';
    label.textContent = labelText;
    row.appendChild(label);

    if (type === 'range') {
        const flex = document.createElement('div');
        flex.className = 'sidebar-flex-row sidebar-gap-md sidebar-btn-wide';
        const input = document.createElement('input');
        input.type = 'range';
        input.id = id;
        flex.appendChild(input);
        row.appendChild(flex);
    } else {
        const input = document.createElement('input');
        input.type = type;
        input.id = id;
        input.className = 'settings-input';
        row.appendChild(input);
    }
    return row;
}

function updateSwipingValues() {
    const swipeConfig = stateStore.get('swipeConfig');
    const config = swipeConfig || APP_CONSTANTS.DEFAULT_CONFIG.swiping;

    const likeRatioInput = document.getElementById('like-ratio');
    const maxSwipesInput = document.getElementById('max-swipes');
    const likeRatioValue = document.getElementById('like-ratio-value');

    if (likeRatioInput) {
        likeRatioInput.value = Math.round((config.likeRatio || APP_CONSTANTS.DEFAULT_CONFIG.swiping.likeRatio) * 100);
        if (likeRatioValue) likeRatioValue.textContent = likeRatioInput.value + '%';
    }
    if (maxSwipesInput) {
        maxSwipesInput.value = config.maxSwipes || APP_CONSTANTS.DEFAULT_CONFIG.swiping.maxSwipes;
    }
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function setupSwipingEventListeners() {
    const likeRatioSlider = document.getElementById('like-ratio');
    const likeRatioValue = document.getElementById('like-ratio-value');
    const maxSwipesInput = document.getElementById('max-swipes');
    const saveSwipingBtn = document.getElementById('save-swiping-settings');

    const debouncedSave = debounce(async () => {
        await saveSettings(false); // Silent save
    }, 1000);

    if (likeRatioSlider) {
        likeRatioSlider.addEventListener('input', (e) => {
            if (likeRatioValue) likeRatioValue.textContent = e.target.value + '%';
            debouncedSave();
        });
    }

    if (maxSwipesInput) {
        maxSwipesInput.addEventListener('input', () => {
            debouncedSave();
        });
    }

    if (saveSwipingBtn) {
        saveSwipingBtn.addEventListener('click', async () => {
            await saveSettings(true); // Explicit save with notification
        });
    }
}

async function saveSettings(showNotification) {
    try {
        const likeRatioInput = document.getElementById('like-ratio');
        const maxSwipesInput = document.getElementById('max-swipes');

        if (!likeRatioInput || !maxSwipesInput) return;

        const newSwipeConfig = {
            likeRatio: parseInt(likeRatioInput.value, 10) / 100,
            maxSwipes: parseInt(maxSwipesInput.value, 10),
        };

        // Validate
        if (newSwipeConfig.likeRatio < 0.1 || newSwipeConfig.likeRatio > 1) {
            if (showNotification) showErrorNotification('Like ratio must be between 10% and 100%');
            return;
        }
        if (newSwipeConfig.maxSwipes < 5 || newSwipeConfig.maxSwipes > 500) {
            if (showNotification) showErrorNotification('Max swipes must be between 5 and 500');
            return;
        }

        await stateStore.set({ swipeConfig: newSwipeConfig });

        if (showNotification) {
            const statusEl = document.getElementById('swiping-settings-status');
            if (statusEl) {
                statusEl.textContent = i18n.t('swiping.settingsSaved') || 'Settings saved!';
                statusEl.style.color = '#48bb78';
                setTimeout(() => { statusEl.textContent = ''; }, 3000);
            }
        }

        console.log('[Tinder AI] Swiping settings saved:', newSwipeConfig);

        if (window.sidebarActiveTab === 'status' && typeof renderSidebarStatusTab === 'function') {
            renderSidebarStatusTab(window.sidebarConsentGiven);
        }

    } catch (error) {
        console.error('[Tinder AI] Error saving swiping settings:', error);
        if (showNotification) {
            const statusEl = document.getElementById('swiping-settings-status');
            if (statusEl) {
                statusEl.textContent = i18n.t('ai.error') || 'Error saving';
                statusEl.style.color = '#ef4444';
            }
        }
    }
}

function setupResetConsentEventListener() {
    const resetConsentBtn = document.getElementById('reset-consent-btn');
    if (resetConsentBtn) {
        resetConsentBtn.addEventListener('click', () => {
            if (typeof window.showCustomResetModal === 'function') {
                window.showCustomResetModal();
            } else {
                if (confirm('Reset extension data?')) {
                    chrome.storage.local.set({ hasCompletedOnboarding: false, sidebarConsentGiven: false }, () => location.reload());
                }
            }
        });
    }
}
