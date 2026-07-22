// OnboardingWizard.js
// Interactive setup guide for new users using the Glassmorphism design system

(function () {
    class OnboardingWizard {
        constructor() {
            this.currentStep = 0;
            this.steps = [
                { id: 'welcome', title: 'Welcome to SpicySwipe' },
                { id: 'ai-setup', title: 'Power Up Your AI' },
                { id: 'tone', title: 'Choose Your Vibe' },
                { id: 'finish', title: 'Ready to Dominate' }
            ];
            this.overlay = null;
            this.box = null;
        }

        async init(force = false) {
            // Check if onboarding is already completed
            const { hasCompletedOnboarding } = await chrome.storage.local.get('hasCompletedOnboarding');
            console.log(`[Tinder AI] OnboardingWizard init check. hasCompletedOnboarding: ${hasCompletedOnboarding} (Type: ${typeof hasCompletedOnboarding}), Force: ${force}`);

            if (!force && hasCompletedOnboarding) {
                console.log('[Tinder AI] Onboarding already completed. Skipping.');
                return;
            }

            console.log('[Tinder AI] Starting Onboarding Wizard...');
            this.createWizardUI();
            this.renderStep(0);
        }

        createWizardUI() {
            // Remove existing overlay if any
            const existing = document.querySelector('.spicyswipe-wizard-overlay');
            if (existing) existing.remove();

            // Dark overlay backdrop
            this.overlay = document.createElement('div');
            this.overlay.className = 'spicyswipe-wizard-overlay';
            Object.assign(this.overlay.style, {
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(10px)',
                zIndex: '20000', display: 'flex', justifyContent: 'center', alignItems: 'center',
                opacity: '0', transition: 'opacity 0.4s ease'
            });

            // Main Glass Box
            this.box = document.createElement('div');
            this.box.className = 'spicyswipe-box spicyswipe-wizard-box';
            Object.assign(this.box.style, {
                position: 'relative',
                width: '460px',
                maxWidth: '92%',
                background: 'linear-gradient(135deg, rgba(18, 18, 26, 0.96) 0%, rgba(30, 30, 45, 0.98) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(253, 38, 122, 0.25)',
                borderRadius: '24px',
                color: '#ffffff',
                transform: 'translateY(20px)',
                transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                fontFamily: "'Proxima Nova', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            });

            this.overlay.appendChild(this.box);
            document.body.appendChild(this.overlay);

            // Animate in
            requestAnimationFrame(() => {
                this.overlay.style.opacity = '1';
                this.box.style.transform = 'translateY(0)';
            });
        }

        renderStep(index) {
            this.currentStep = index;
            const stepData = this.steps[index];

            // Clear content
            this.box.innerHTML = '';

            // Header
            const header = document.createElement('div');
            header.className = 'spicyswipe-box-header';
            header.style.cssText = 'padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px 24px 0 0;';
            header.innerHTML = `
                <div class="spicyswipe-box-title" style="font-size: 20px; font-weight: 800; background: linear-gradient(90deg, #fd267a, #ff7854); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${stepData.title}</div>
                <div style="font-size: 12px; color: #a1a1aa; font-weight: 700; letter-spacing: 0.5px;">STEP ${index + 1}/${this.steps.length}</div>
            `;
            this.box.appendChild(header);

            // Content Container
            const content = document.createElement('div');
            content.className = 'spicyswipe-box-content';
            content.style.padding = '24px';

            // Progress Bar
            const progressContainer = document.createElement('div');
            progressContainer.style.cssText = 'height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; margin-bottom: 24px; overflow: hidden;';
            const progressBar = document.createElement('div');
            progressBar.style.cssText = `height: 100%; background: linear-gradient(90deg, #fd267a, #ff7854); width: ${((index + 1) / this.steps.length) * 100}%; transition: width 0.3s ease; border-radius: 3px;`;
            progressContainer.appendChild(progressBar);
            content.appendChild(progressContainer);

            // Render specific step content
            switch (stepData.id) {
                case 'welcome':
                    this.renderWelcome(content);
                    break;
                case 'ai-setup':
                    this.renderAISetup(content);
                    break;
                case 'tone':
                    this.renderTone(content);
                    break;
                case 'finish':
                    this.renderFinish(content);
                    break;
            }

            this.box.appendChild(content);
        }

        renderWelcome(container) {
            container.innerHTML += `
                <div style="text-align: center; padding: 10px 0 28px;">
                    <div style="font-size: 52px; margin-bottom: 16px; animation: float 3s ease-in-out infinite;">🔥</div>
                    <h3 style="font-size: 22px; font-weight: 700; margin-bottom: 12px; color: #ffffff !important; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">Unlock Your Dating Superpowers</h3>
                    <p style="font-size: 14.5px; color: #cbd5e1 !important; line-height: 1.6; max-width: 370px; margin: 0 auto;">
                        SpicySwipe uses advanced AI to help you break the ice, keep conversations flowing, and get more dates.
                    </p>
                    <div style="margin-top: 16px; font-size: 13.5px; color: #94a3b8 !important; font-weight: 500;">
                        ⚡ Let's get you set up in under 60 seconds.
                    </div>
                </div>
                <button class="spicyswipe-btn spicyswipe-btn-primary" style="width:100%; padding: 14px; font-size: 16px; font-weight: 700; border-radius: 14px; background: linear-gradient(135deg, #fd267a, #ff6036); color: #ffffff; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(253, 38, 122, 0.4); transition: transform 0.2s;" id="wizard-next-btn">Get Started 🚀</button>
            `;
            this.attachNextListener(container);
        }

        renderAISetup(container) {
            container.innerHTML += `
                <div class="spicyswipe-row" style="margin-bottom: 18px;">
                    <div class="spicyswipe-col" style="width: 100%;">
                        <label class="spicyswipe-label" style="color: #e2e8f0 !important; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; display: block;">Select AI Model</label>
                        <select id="wizard-ai-model" class="spicyswipe-select" style="width: 100%; padding: 12px 16px; border-radius: 12px; background: rgba(15, 23, 42, 0.85) !important; color: #ffffff !important; border: 1px solid rgba(255,255,255,0.2) !important; font-size: 14px; font-weight: 500; outline: none;">
                            <option value="gemini" style="color:#fff; background-color: #1e293b;">Google Gemini (Recommended - Free)</option>
                            <option value="chatgpt" style="color:#fff; background-color: #1e293b;">ChatGPT (Requires Key)</option>
                            <option value="deepseek" style="color:#fff; background-color: #1e293b;">DeepSeek</option>
                            <option value="claude" style="color:#fff; background-color: #1e293b;">Claude (Anthropic)</option>
                            <option value="ollama" style="color:#fff; background-color: #1e293b;">Ollama (Local AI - No Key Needed)</option>
                        </select>
                    </div>
                </div>
                <div class="spicyswipe-row" style="margin-bottom: 12px;">
                    <div class="spicyswipe-col" style="width: 100%;">
                        <label class="spicyswipe-label" style="color: #e2e8f0 !important; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; display: block;">API Key</label>
                        <input type="password" id="wizard-api-key" class="spicyswipe-select" placeholder="Enter your API Key here" style="width: 100%; padding: 12px 16px; border-radius: 12px; background: rgba(15, 23, 42, 0.85) !important; color: #ffffff !important; border: 1px solid rgba(255,255,255,0.2) !important; font-size: 14px; outline: none;">
                        <input type="text" style="display:none;"> <!-- Prevent autofill messing up colors -->
                        <div style="font-size: 12px; color: #94a3b8 !important; margin-top: 8px;">
                            Gemini keys are free. <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #ff7854; font-weight: 600; text-decoration: underline;">Get one here</a>.
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button class="spicyswipe-btn spicyswipe-btn-secondary" id="wizard-skip-btn" style="flex: 1; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.1); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.15); font-weight: 600; cursor: pointer;">Skip for Now</button>
                    <button class="spicyswipe-btn spicyswipe-btn-primary" id="wizard-save-next-btn" style="flex: 1.5; padding: 12px; border-radius: 12px; background: linear-gradient(135deg, #fd267a, #ff6036); color: #ffffff; border: none; font-weight: 700; cursor: pointer; box-shadow: 0 4px 15px rgba(253,38,122,0.4);">Save & Continue</button>
                </div>
            `;

            setTimeout(async () => {
                const saveBtn = container.querySelector('#wizard-save-next-btn');
                const skipBtn = container.querySelector('#wizard-skip-btn');
                const modelSelect = container.querySelector('#wizard-ai-model');
                const keyInput = container.querySelector('#wizard-api-key');

                // Function to check and mask existing key
                const checkExistingKey = async (model) => {
                    if (model === 'ollama') {
                        keyInput.value = '';
                        keyInput.placeholder = 'No API key needed for local Ollama';
                        keyInput.disabled = true;
                        return;
                    }
                    keyInput.disabled = false;
                    keyInput.placeholder = 'Enter your API Key here';

                    const storeKey = model === 'gemini' ? 'geminiApiKey' :
                        model === 'chatgpt' ? 'openaiApiKey' :
                            model === 'deepseek' ? 'deepseekApiKey' :
                                model === 'claude' ? 'anthropicApiKey' : null;

                    if (storeKey) {
                        const data = await chrome.storage.local.get(storeKey);
                        // Also check legacy/fallback for gemini
                        let val = data[storeKey];
                        if (model === 'gemini' && !val) {
                            const legacy = await chrome.storage.local.get(['geminiFreeApiKey', 'geminiProApiKey']);
                            val = legacy.geminiFreeApiKey || legacy.geminiProApiKey;
                        }

                        if (val) {
                            keyInput.value = val; // Store actual value (will be masked by password type)
                            keyInput.setAttribute('data-masked', 'true');
                        } else {
                            keyInput.value = '';
                            keyInput.removeAttribute('data-masked');
                        }
                    }
                };

                // Initial check
                await checkExistingKey(modelSelect.value);

                // Listen for model changes
                modelSelect.addEventListener('change', (e) => checkExistingKey(e.target.value));

                saveBtn.onclick = async () => {
                    const model = modelSelect.value;
                    const key = keyInput.value.trim();
                    const storeObj = { activeAI: model };
                    if (key && model !== 'ollama') {
                        if (model === 'gemini') storeObj.geminiApiKey = key;
                        else if (model === 'chatgpt') storeObj.openaiApiKey = key;
                        else if (model === 'deepseek') storeObj.deepseekApiKey = key;
                        else if (model === 'claude') storeObj.anthropicApiKey = key;
                    }

                    await chrome.storage.local.set(storeObj);
                    console.log(`[Tinder AI] Saved ${model} from wizard.`);
                    this.renderStep(this.currentStep + 1);
                };

                skipBtn.onclick = () => this.renderStep(this.currentStep + 1);
            }, 0);
        }

        renderTone(container) {
            const tones = ['Witty', 'Romantic', 'Direct', 'Friendly', 'Mysterious'];
            let selectedTone = 'Witty';

            const toneHtml = tones.map(tone => `
                <div class="wizard-tone-option ${tone === 'Witty' ? 'selected' : ''}" data-tone="${tone}" 
                     style="display: inline-block; padding: 10px 20px; margin: 6px; border-radius: 20px; 
                     border: 1px solid rgba(255,255,255,0.2); cursor: pointer; font-size: 14px; font-weight: 600;
                     color: #e2e8f0; background: rgba(15, 23, 42, 0.7);
                     transition: all 0.2s ease;">
                    ${tone}
                </div>
            `).join('');

            container.innerHTML += `
                <style>
                    .wizard-tone-option.selected {
                        background: linear-gradient(135deg, #fd267a, #ff6036) !important;
                        color: #ffffff !important;
                        border-color: transparent !important;
                        box-shadow: 0 4px 15px rgba(253, 38, 122, 0.4);
                        transform: scale(1.05);
                    }
                    .wizard-tone-option:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.5); }
                </style>
                <div style="text-align: center; margin-bottom: 28px;">
                    <h4 style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #ffffff !important;">How should I sound?</h4>
                    <div id="wizard-tone-container">${toneHtml}</div>
                </div>
                <button class="spicyswipe-btn spicyswipe-btn-primary" style="width:100%; padding: 14px; font-size: 16px; font-weight: 700; border-radius: 14px; background: linear-gradient(135deg, #fd267a, #ff6036); color: #ffffff; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(253, 38, 122, 0.4);" id="wizard-next-btn">Continue</button>
            `;

            setTimeout(() => {
                const toneContainer = container.querySelector('#wizard-tone-container');
                const options = toneContainer.querySelectorAll('.wizard-tone-option');
                options.forEach(opt => {
                    opt.onclick = () => {
                        options.forEach(o => o.classList.remove('selected'));
                        opt.classList.add('selected');
                        selectedTone = opt.dataset.tone;
                    };
                });

                container.querySelector('#wizard-next-btn').onclick = async () => {
                    const tone = selectedTone.toLowerCase();
                    // Sync with StateStore schema (chrome.storage.local -> messagingConfig.tone)
                    const { messagingConfig } = await chrome.storage.local.get('messagingConfig');
                    const newConfig = { ...(messagingConfig || {}), tone };

                    await chrome.storage.local.set({ messagingConfig: newConfig });
                    console.log(`[Tinder AI] Saved tone '${tone}' to messagingConfig.`);

                    // Update global StateStore if available to ensure immediate reflection
                    if (window.stateStore) {
                        await window.stateStore.set({ messagingConfig: newConfig });
                    }

                    this.renderStep(this.currentStep + 1);
                };
            }, 0);
        }

        renderFinish(container) {
            container.innerHTML += `
                <div style="text-align: center; padding: 20px 0 28px;">
                    <div style="font-size: 56px; margin-bottom: 16px; animation: float 3s ease-in-out infinite;">🎉</div>
                    <h3 style="font-size: 22px; font-weight: 700; margin-bottom: 12px; color: #ffffff !important;">You're All Set!</h3>
                    <p style="font-size: 14.5px; color: #cbd5e1 !important; line-height: 1.6; max-width: 370px; margin: 0 auto;">
                        SpicySwipe is active. Open the sidebar with the toggle button on the left to manage your settings anytime.
                    </p>
                </div>
                <button class="spicyswipe-btn spicyswipe-btn-primary" style="width:100%; padding: 14px; font-size: 16px; font-weight: 700; border-radius: 14px; background: linear-gradient(135deg, #fd267a, #ff6036); color: #ffffff; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(253, 38, 122, 0.4);" id="wizard-finish-btn">Let's Go!</button>
            `;

            setTimeout(() => {
                const btn = container.querySelector('#wizard-finish-btn');
                btn.onclick = async () => {
                    await chrome.storage.local.set({ hasCompletedOnboarding: true });
                    // Fade out
                    this.overlay.style.opacity = '0';
                    setTimeout(() => {
                        this.overlay.remove();
                        // Open main sidebar as a hint
                        const sidebarToggle = document.querySelector('.tinder-ai-sidebar-toggle');
                        if (sidebarToggle && !sidebarToggle.classList.contains('open')) {
                            sidebarToggle.click();
                        }
                    }, 400);
                };
            }, 0);
        }

        attachNextListener(container) {
            setTimeout(() => {
                const btn = container.querySelector('#wizard-next-btn');
                if (btn) btn.onclick = () => this.renderStep(this.currentStep + 1);
            }, 0);
        }
    }

    // Expose logic
    window.SpicySwipeWizard = new OnboardingWizard();
    // Expose reset for debugging
    window.resetOnboarding = () => chrome.storage.local.set({ hasCompletedOnboarding: false });

})();
