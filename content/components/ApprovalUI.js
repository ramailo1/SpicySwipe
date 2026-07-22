// content/components/ApprovalUI.js
// Handles AI Message Approval, Error Display, and Wand Buttons

// Inject Wand buttons onto match list items
function injectWandButtons(specificMatches = null) {
    if (!window.sidebarConsentGiven && !(typeof ANTI_DETECTION !== 'undefined' && ANTI_DETECTION.isDevMode)) return;

    const matches = specificMatches || document.querySelectorAll(window.SELECTORS.MATCH_LIST_ITEM);
    // console.log(`[Tinder AI] Found ${matches.length} matches to inject wand`);

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

            // 1. Enter Loading State
            const originalIcon = wand.innerHTML;
            wand.innerHTML = '⏳';
            wand.style.cursor = 'wait';

            // Create "Thinking..." tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'wand-loading-tooltip';
            tooltip.innerText = 'Thinking...';
            tooltip.style.cssText = `
                position: absolute;
                bottom: 40px; 
                right: -10px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 5px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: bold;
                white-space: nowrap;
                pointer-events: none;
                z-index: 200;
                opacity: 0;
                transform: translateY(5px);
                transition: all 0.2s ease;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            `;
            wand.appendChild(tooltip);

            // Animate tooltip in
            requestAnimationFrame(() => {
                tooltip.style.opacity = '1';
                tooltip.style.transform = 'translateY(0)';
            });

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

                    // Update tooltip to "Generating..."
                    tooltip.innerText = 'Generating...';

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
                } finally {
                    // Reset Loading State
                    wand.innerHTML = originalIcon;
                    wand.style.cursor = 'pointer';
                    tooltip.style.opacity = '0';
                    setTimeout(() => tooltip.remove(), 200);
                }
            }, 1000); // Reduced delay slightly
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

    prompt += ` Keep it short (1-2 sentences), ${tone}, and respectful. IMPORTANT: Return ONLY the message itself. Do not include "Option 1", quotes, or any other text. Just the single best message ready to send.`;

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

    const safeMatchName = typeof escapeHTML === 'function' ? escapeHTML(profileInfo.name || 'match') : (profileInfo.name || 'match');

    box.innerHTML = `
    <div class="spicyswipe-box-header spicyswipe-box-header-red">
      <div>
        <div class="spicyswipe-box-title">❌ ${errorTitle}</div>
        <div class="spicyswipe-box-subtitle">${forMatchText} ${safeMatchName}</div>
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
    const closeBox = () => {
        stateStore.set({ currentAction: 'Idle' });
        box.remove();
    };

    const headerCloseBtn = document.getElementById('ai-close-header-btn');
    if (headerCloseBtn) headerCloseBtn.onclick = closeBox;

    const footerCloseBtn = document.getElementById('ai-close-footer-btn');
    if (footerCloseBtn) footerCloseBtn.onclick = closeBox;
}

// Display message for user approval
async function displayMessageForApproval(initialMessage, profileInfo, chatHistory) {
    console.log('[Tinder AI] Displaying message for approval:', initialMessage);
    stateStore.set({ currentAction: 'Messaging' });

    // Remove any existing approval box
    const existingBox = document.getElementById('ai-approval-box');
    if (existingBox) existingBox.remove();

    // Get user's selected languages and current tone from stateStore
    const messagingConfig = stateStore.get('messagingConfig') || APP_CONSTANTS.DEFAULT_CONFIG.messaging;
    const selectedLanguages = messagingConfig.selectedLanguages || stateStore.get('selectedLanguages') || DEFAULT_SELECTED_LANGUAGES;
    const currentTone = messagingConfig.tone || 'witty';

    // Use centralized tones
    const availableTones = APP_CONSTANTS.TONE_OPTIONS;

    const box = document.createElement('div');
    box.id = 'ai-approval-box';
    box.className = 'spicyswipe-box';
    box.style.bottom = '80px';
    box.style.right = '20px';

    const message = typeof initialMessage === 'string' ? initialMessage : initialMessage.response || initialMessage;
    const modelUsed = typeof initialMessage === 'object' && initialMessage.modelUsed ? initialMessage.modelUsed : null;

    // Build tone options HTML
    const toneOptionsHtml = availableTones.map(t =>
        `<option value="${t.value}" ${t.value === currentTone ? 'selected' : ''}>${t.label}</option>`
    ).join('');

    // Build language options HTML from user's selected languages
    const languageOptionsHtml = selectedLanguages.map(lang => {
        const name = WORLDWIDE_LANGUAGES[lang]?.name || lang.toUpperCase();
        return `<option value="${lang}">${name}</option>`;
    }).join('');

    // Map tone to header color class
    const getHeaderClass = (t) => {
        const toneMap = {
            'witty': 'spicyswipe-box-header-purple',
            'friendly': 'spicyswipe-box-header-blue',
            'romantic': 'spicyswipe-box-header-pink',
            'flirty': 'spicyswipe-box-header-red',
            'confident': 'spicyswipe-box-header-dark',
            'humorous': 'spicyswipe-box-header-orange',
            'casual': 'spicyswipe-box-header-teal',
            'casual': 'spicyswipe-box-header-teal',
            'spicy': 'spicyswipe-box-header-red' // Explicit "Spicy" support
        };
        return toneMap[t] || 'spicyswipe-box-header-purple';
    };

    const headerClass = getHeaderClass(currentTone);

    const safeMatchName = typeof escapeHTML === 'function' ? escapeHTML(profileInfo.name || 'match') : (profileInfo.name || 'match');

    box.innerHTML = `
    <div class="spicyswipe-box-header ${headerClass}" id="ai-approval-header">
      <div>
        <div class="spicyswipe-box-title">✨ ${i18n.t('approvalBox.title')}</div>
        <div class="spicyswipe-box-subtitle">
            ${i18n.t('errors.forMatch')} ${safeMatchName}
            ${modelUsed ? `<br><span style="font-size: 0.85em; opacity: 0.8; font-weight: normal;">Generated by: ${modelUsed}</span>` : ''}
        </div>
      </div>
      <button id="ai-close-header-btn" class="spicyswipe-close-btn">✕</button>
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
            stateStore.set({ currentAction: 'Idle' });
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
            // Update subtitle if model changed
            const subtitle = document.querySelector('.spicyswipe-box-subtitle');
            if (subtitle && newMessage.modelUsed) {
                // Preserve original subtext (match name) + new model
                const matchName = profileInfo.name || 'match';
                subtitle.innerHTML = `${i18n.t('errors.forMatch')} ${matchName}<br><span style="font-size: 0.85em; opacity: 0.8; font-weight: normal;">Generated by: ${newMessage.modelUsed}</span>`;
            }
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
            // Update subtitle if model changed
            const subtitle = document.querySelector('.spicyswipe-box-subtitle');
            if (subtitle && newMessage.modelUsed) {
                const matchName = profileInfo.name || 'match';
                subtitle.innerHTML = `${i18n.t('errors.forMatch')} ${matchName}<br><span style="font-size: 0.85em; opacity: 0.8; font-weight: normal;">Generated by: ${newMessage.modelUsed}</span>`;
            }
        } else {
            textarea.value = originalValue; // Restore if failed
        }

        // Update header color on tone change
        const newHeaderClass = getHeaderClass(selectedTone);
        const headerEl = document.getElementById('ai-approval-header');
        if (headerEl) {
            headerEl.className = `spicyswipe-box-header ${newHeaderClass}`;
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
        const targetLangName = WORLDWIDE_LANGUAGES[targetLanguage]?.name || targetLanguage;
        const translatePrompt = `Translate the following message to ${targetLangName}. Keep the same tone and meaning. Only return the translated text, nothing else:\n\n"${currentMessage}"`;

        const translated = await getAIResponse(translatePrompt);

        textarea.style.opacity = '1';
        textarea.disabled = false;

        if (translated && !translated.error) {
            textarea.value = translated.response || translated;
        }

        // Reset the select
        document.getElementById('ai-translate-select').value = '';
    };

    const closeBtn = document.getElementById('ai-close-header-btn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            box.remove();
        };
    }
}
