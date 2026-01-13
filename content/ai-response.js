// content/ai-response.js
// AI Response Module for SpicySwipe
// Handles AI API calls to various providers (Gemini, OpenAI, DeepSeek, Claude)

// This is now the primary function for getting AI responses.
async function getAIResponse(prompt) {
    console.log('[Tinder AI] getAIResponse called. Prompt:', prompt);

    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
        console.warn('[Tinder AI] Extension context invalidated, cannot get AI response');
        return { error: 'Extension context invalidated' };
    }

    return new Promise(resolve => {
        try {
            chrome.storage.local.get(['activeAI', 'geminiFreeApiKey', 'geminiProApiKey', 'openaiApiKey', 'deepseekApiKey', 'anthropicApiKey'], ({ activeAI, geminiFreeApiKey, geminiProApiKey, openaiApiKey, deepseekApiKey, anthropicApiKey }) => {
                let model = activeAI || 'gemini';

                // Helper to check if an API key is valid
                function hasValidKey(key) {
                    return key && key.trim() !== '';
                }

                // Build a map of available models with their API keys
                const availableModels = {
                    'gemini': hasValidKey(geminiFreeApiKey),
                    'gemini-pro': hasValidKey(geminiProApiKey) || hasValidKey(geminiFreeApiKey),
                    'chatgpt': hasValidKey(openaiApiKey),
                    'deepseek': hasValidKey(deepseekApiKey),
                    'claude': hasValidKey(anthropicApiKey)
                };

                console.log('[Tinder AI] Available models with keys:', availableModels);

                // Check if selected model has a key, if not, find a fallback
                function getModelWithKey(selectedModel) {
                    if (availableModels[selectedModel]) {
                        return selectedModel;
                    }

                    // Find first available model with a key
                    const fallbackOrder = ['gemini', 'chatgpt', 'deepseek', 'claude', 'gemini-pro'];
                    for (const fallbackModel of fallbackOrder) {
                        if (availableModels[fallbackModel]) {
                            console.log(`[Tinder AI] Fallback: ${selectedModel} has no API key, using ${fallbackModel} instead`);
                            return fallbackModel;
                        }
                    }
                    return null; // No model has an API key
                }

                // Try to get a model with a valid key
                const originalModel = model;
                model = getModelWithKey(model);

                if (!model) {
                    console.error('[Tinder AI] No AI model has an API key configured');
                    resolve({ error: 'No API key found for any AI model. Please add an API key in the AI settings tab.' });
                    return;
                }

                if (model !== originalModel) {
                    console.log(`[Tinder AI] Auto-switched from ${originalModel} to ${model} (${originalModel} has no API key)`);
                }

                // Helper to show error in status panel
                function showError(msg) {
                    const statusPanel = document.getElementById('sidebar-tab-status');
                    if (statusPanel) {
                        let errBanner = document.createElement('div');
                        errBanner.style = 'background: #f87171; color: #fff; border-radius: 8px; padding: 12px; margin: 12px 0; font-weight: 600; text-align: center;';
                        errBanner.textContent = msg;
                        statusPanel.prepend(errBanner);
                        setTimeout(() => { if (errBanner) errBanner.remove(); }, 4000);
                    }
                }

                // Helper to handle extension context invalidation
                function handleContextInvalidation() {
                    console.warn('[Tinder AI] Extension context invalidated, attempting recovery...');
                    // Try to reinitialize the extension context
                    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
                        console.log('[Tinder AI] Extension context recovered');
                        return false; // Context is valid
                    } else {
                        console.error('[Tinder AI] Extension context permanently invalidated');
                        showError('Extension context lost. Please refresh the page.');
                        return true; // Context is invalid
                    }
                }

                // --- Gemini (Flash/Pro) ---
                if (model === 'gemini' || model === 'gemini-pro') {
                    if (!geminiFreeApiKey || geminiFreeApiKey.trim() === '') {
                        showError('No Gemini API key found. Please add your key in Settings.');
                        resolve({ error: 'No Gemini API key found.' });
                        return;
                    }
                    chrome.runtime.sendMessage({ type: 'getGeminiAPIResponse', prompt, model }, response => {
                        if (chrome.runtime.lastError) {
                            if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                                if (handleContextInvalidation()) {
                                    resolve({ error: 'Extension context invalidated' });
                                    return;
                                }
                                // Retry the request
                                chrome.runtime.sendMessage({ type: 'getGeminiAPIResponse', prompt, model }, retryResponse => {
                                    if (chrome.runtime.lastError) {
                                        showError('Error communicating with background script: ' + chrome.runtime.lastError.message);
                                        resolve({ error: chrome.runtime.lastError.message });
                                    } else {
                                        resolve(retryResponse);
                                    }
                                });
                            } else {
                                showError('Error communicating with background script: ' + chrome.runtime.lastError.message);
                                resolve({ error: chrome.runtime.lastError.message });
                            }
                        } else {
                            resolve(response);
                        }
                    });
                    return;
                }
                // --- ChatGPT (OpenAI) ---
                if (model === 'chatgpt') {
                    console.log('[Tinder AI] Using ChatGPT model');
                    if (!openaiApiKey || openaiApiKey.trim() === '') {
                        console.error('[Tinder AI] No OpenAI API key found');
                        showError('No OpenAI API key found. Please add your key in Settings.');
                        resolve({ error: 'No OpenAI API key found.' });
                        return;
                    }
                    console.log('[Tinder AI] OpenAI API key found, preparing request');
                    const messages = [
                        { role: 'system', content: 'You are a witty AI assistant helping users write playful, charming Tinder opening messages based on minimal or no profile info. Keep it flirty, respectful, and short.' },
                        { role: 'user', content: prompt }
                    ];
                    console.log('[Tinder AI] Sending request to background script:', { type: 'getOpenAIAPIResponse', model: 'gpt-4o-mini', messages });
                    chrome.runtime.sendMessage({ type: 'getOpenAIAPIResponse', model: 'gpt-4o-mini', messages }, response => {
                        console.log('[Tinder AI] Received response from background script:', response);
                        if (chrome.runtime.lastError) {
                            if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                                if (handleContextInvalidation()) {
                                    resolve({ error: 'Extension context invalidated' });
                                    return;
                                }
                                // Retry the request
                                chrome.runtime.sendMessage({ type: 'getOpenAIAPIResponse', model: 'gpt-4o-mini', messages }, retryResponse => {
                                    if (chrome.runtime.lastError) {
                                        console.error('[Tinder AI] Runtime error on retry:', chrome.runtime.lastError);
                                        showError('Error communicating with background script: ' + chrome.runtime.lastError.message);
                                        resolve({ error: chrome.runtime.lastError.message });
                                    } else if (retryResponse && retryResponse.error) {
                                        console.error('[Tinder AI] API error on retry:', retryResponse.error);
                                        showError('OpenAI API error: ' + retryResponse.error);
                                        resolve({ error: retryResponse.error });
                                    } else if (retryResponse && retryResponse.response) {
                                        console.log('[Tinder AI] Success on retry! Response:', retryResponse.response);
                                        resolve(retryResponse);
                                    } else {
                                        console.error('[Tinder AI] Unexpected response format on retry:', retryResponse);
                                        showError('Unexpected response format from OpenAI API');
                                        resolve({ error: 'Unexpected response format' });
                                    }
                                });
                            } else {
                                console.error('[Tinder AI] Runtime error:', chrome.runtime.lastError);
                                showError('Error communicating with background script: ' + chrome.runtime.lastError.message);
                                resolve({ error: chrome.runtime.lastError.message });
                            }
                        } else if (response && response.error) {
                            console.error('[Tinder AI] API error:', response.error);
                            showError('OpenAI API error: ' + response.error);
                            resolve({ error: response.error });
                        } else if (response && response.response) {
                            console.log('[Tinder AI] Success! Response:', response.response);
                            resolve(response);
                        } else {
                            console.error('[Tinder AI] Unexpected response format:', response);
                            showError('Unexpected response format from OpenAI API');
                            resolve({ error: 'Unexpected response format' });
                        }
                    });
                    return;
                }
                // --- DeepSeek ---
                if (model === 'deepseek') {
                    if (!deepseekApiKey || deepseekApiKey.trim() === '') {
                        showError('No DeepSeek API key found. Please add your key in Settings.');
                        resolve({ error: 'No DeepSeek API key found.' });
                        return;
                    }
                    const messages = [
                        { role: 'system', content: 'Be a witty Tinder opener generator.' },
                        { role: 'user', content: prompt }
                    ];
                    chrome.runtime.sendMessage({ type: 'getDeepSeekAPIResponse', model: 'deepseek-chat', messages }, response => {
                        if (chrome.runtime.lastError) {
                            if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                                if (handleContextInvalidation()) {
                                    resolve({ error: 'Extension context invalidated' });
                                    return;
                                }
                                // Retry the request
                                chrome.runtime.sendMessage({ type: 'getDeepSeekAPIResponse', model: 'deepseek-chat', messages }, retryResponse => {
                                    if (chrome.runtime.lastError) {
                                        showError('Error communicating with background script: ' + chrome.runtime.lastError.message);
                                        resolve({ error: chrome.runtime.lastError.message });
                                    } else {
                                        resolve(retryResponse);
                                    }
                                });
                            } else {
                                showError('Error communicating with background script: ' + chrome.runtime.lastError.message);
                                resolve({ error: chrome.runtime.lastError.message });
                            }
                        } else {
                            resolve(response);
                        }
                    });
                    return;
                }
                // --- Claude (Anthropic) ---
                if (model === 'claude') {
                    if (!anthropicApiKey || anthropicApiKey.trim() === '') {
                        showError('No Anthropic API key found. Please add your key in Settings.');
                        resolve({ error: 'No Anthropic API key found.' });
                        return;
                    }
                    const messages = [
                        { role: 'user', content: prompt }
                    ];
                    chrome.runtime.sendMessage({ type: 'getAnthropicAPIResponse', model: 'claude-haiku-4-5', messages }, response => {
                        if (chrome.runtime.lastError) {
                            if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                                if (handleContextInvalidation()) {
                                    resolve({ error: 'Extension context invalidated' });
                                    return;
                                }
                                // Retry the request
                                chrome.runtime.sendMessage({ type: 'getAnthropicAPIResponse', model: 'claude-haiku-4-5', messages }, retryResponse => {
                                    if (chrome.runtime.lastError) {
                                        showError('Error communicating with background script: ' + chrome.runtime.lastError.message);
                                        resolve({ error: chrome.runtime.lastError.message });
                                    } else {
                                        resolve(retryResponse);
                                    }
                                });
                            } else {
                                showError('Error communicating with background script: ' + chrome.runtime.lastError.message);
                                resolve({ error: chrome.runtime.lastError.message });
                            }
                        } else {
                            resolve(response);
                        }
                    });
                    return;
                }
                // --- Fallback ---
                resolve({ error: 'No valid AI model selected.' });
            });
        } catch (error) {
            console.error('[Tinder AI] Error getting AI response:', error);
            resolve({ error: 'Error getting AI response' });
        }
    });
}
