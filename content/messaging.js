// content/messaging.js
// Messaging Automation Module for SpicySwipe
// Handles conversation tracking, message queuing, and AI response generation

const MESSAGING = {
    activeConversations: new Map(),
    messageQueue: [],
    tone: 'playful', // Default tone
    language: 'en', // Default language
    autoMessageDelay: 0, // Process immediately for testing
    maxNoReplyTime: 48 * 60 * 60 * 1000, // 48 hours
    minMessagesForMeetup: 5,
    autoSend: false,
    multiTurn: false,
    pendingApproval: null, // { matchId, text }
    processingBlocked: false, // Flag to prevent processing after cancel

    // Messaging analytics
    messagingStats: {
        conversations: 0,
        messagesSent: 0,
        responseRate: 0,
        avgResponseTime: 0,
        totalResponseTime: 0,
        responseCount: 0
    },

    async init() {
        const data = await chrome.storage.local.get(['messageSettings', 'activeConversations', 'messagingStats']);
        if (data.messageSettings) {
            this.tone = data.messageSettings.tone || 'playful';
            this.language = data.messageSettings.language || 'en';
            this.autoSend = typeof data.messageSettings.autoSend === 'boolean' ? data.messageSettings.autoSend : false;
            this.multiTurn = typeof data.messageSettings.multiTurn === 'boolean' ? data.messageSettings.multiTurn : false;
        }
        if (data.activeConversations) {
            this.activeConversations = new Map(Object.entries(data.activeConversations));
        }
        if (data.messagingStats) {
            this.messagingStats = { ...this.messagingStats, ...data.messagingStats };
        }
        this.startMessageMonitor();
    },

    async startMessageMonitor() {
        console.log('[Tinder AI] Message monitor is ready. New match checks will be triggered by the central DOM observer.');
        // The previous checker for new matches is now handled by the central observer to prevent crashes.
        // We still need to process the message queue periodically.
        setInterval(() => this.processMessageQueue(), 5000); // Process queue every 5 seconds
    },

    async checkNewMatches() {
        try {
            // Check if extension context is still valid
            if (!chrome.runtime?.id) {
                console.warn('[Tinder AI] Extension context invalidated, skipping checkNewMatches');
                return;
            }

            const matchList = document.querySelector('ul, div[class*="matchList"]');
            if (!matchList) return;

            const matches = matchList.querySelectorAll(window.SELECTORS.matchListItemSelector);
            for (const match of matches) {
                const matchId = match.getAttribute('data-id') || match.id || match.href || 'manual';
                if (!matchId) continue;

                if (!this.activeConversations.has(matchId)) {
                    // New match detected
                    const matchInfo = await this.extractMatchInfo(match);
                    this.activeConversations.set(matchId, {
                        id: matchId,
                        name: matchInfo.name,
                        lastMessage: null,
                        lastMessageTime: Date.now(),
                        messageCount: 0,
                        noReplyCount: 0,
                        language: matchInfo.language || this.language,
                        tone: this.tone
                    });

                    // Track new conversation
                    this.messagingStats.conversations++;
                    this.saveMessagingStats();

                    // Queue initial message
                    this.queueMessage(matchId, 'opener');

                    // --- Call the global hook for auto-message pause/resume ---
                    if (window.onNewMatchDetected) window.onNewMatchDetected(matchId);
                }
            }

            // Save updated conversations
            await this.saveConversations();
        } catch (error) {
            if (error.message && error.message.includes('Extension context invalidated')) {
                console.warn('[Tinder AI] Extension context invalidated during checkNewMatches');
            } else {
                console.error('[Tinder AI] Error in checkNewMatches:', error);
            }
        }
    },

    async extractMatchInfo(matchElement) {
        const name = matchElement.querySelector('span[class*="name"]')?.textContent || 'Unknown';
        const bio = matchElement.querySelector('div[class*="bio"]')?.textContent || '';

        // Detect language from bio
        const language = await this.detectLanguage(bio);

        return { name, bio, language };
    },

    async detectLanguage(text) {
        // Enhanced language detection based on common words and patterns
        const languagePatterns = {
            fr: /\b(je|tu|il|elle|nous|vous|ils|elles|bonjour|merci|oui|non|salut|comment|ça|va)\b/i,
            es: /\b(yo|tú|él|ella|nosotros|vosotros|ellos|ellas|hola|gracias|sí|no|como|estas|bien)\b/i,
            de: /\b(ich|du|er|sie|wir|ihr|sie|hallo|danke|ja|nein|wie|geht|es|dir)\b/i,
            ar: /\b(مرحبا|شكرا|نعم|لا|كيف|حالك|أهلا|سلام|صباح|مساء|الخير)\b/i,
            it: /\b(io|tu|lui|lei|noi|voi|loro|ciao|grazie|sì|no|come|stai)\b/i,
            pt: /\b(eu|tu|ele|ela|nós|vós|eles|elas|olá|obrigado|sim|não|como|está)\b/i,
            ru: /\b(я|ты|он|она|мы|вы|они|привет|спасибо|да|нет|как|дела)\b/i,
            ja: /\b(私|あなた|彼|彼女|私たち|あなたたち|彼ら|こんにちは|ありがとう|はい|いいえ|お元気)\b/i,
            ko: /\b(나|너|그|그녀|우리|너희|그들|안녕|감사|네|아니|어떻게|지내)\b/i,
            zh: /\b(我|你|他|她|我们|你们|他们|你好|谢谢|是|不|怎么样|好吗)\b/i
        };

        // Log the text being checked
        console.log('[Tinder AI][LANG DETECT] Checking text:', text);

        // Correct Unicode script detection
        // Arabic
        if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) return 'ar';
        // Japanese (Hiragana/Katakana)
        if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
        // Chinese
        if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
        // Korean
        if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
        // Russian (Cyrillic)
        if (/[\u0400-\u04FF]/.test(text)) return 'ru';

        for (const [lang, pattern] of Object.entries(languagePatterns)) {
            if (pattern.test(text)) { console.log('[Tinder AI][LANG DETECT] Detected:', lang); return lang; }
        }
        // Heuristic for French accents
        if (/[éèêëàâäîïôöùûüçœæ]/i.test(text)) { console.log('[Tinder AI][LANG DETECT] Heuristic: Detected fr by accent'); return 'fr'; }
        console.log('[Tinder AI][LANG DETECT] Default: en');
        return 'en'; // Default to English
    },

    async queueMessage(matchId, type, context = '') {
        console.log('[Tinder AI][DEBUG] queueMessage called:', { matchId, type, context });
        const conversation = this.activeConversations.get(matchId);
        if (!conversation) return;

        const message = {
            matchId,
            type,
            context,
            timestamp: Date.now(),
            status: 'pending'
        };

        this.messageQueue.push(message);
        await this.saveMessageQueue();
    },

    async processMessageQueue() {
        console.log('[Tinder AI][DEBUG] processMessageQueue called. Queue length:', this.messageQueue.length);
        if (this.messageQueue.length === 0) return;

        // If processing is blocked (user canceled), don't process
        if (this.processingBlocked) {
            console.log('[Tinder AI][DEBUG] Processing blocked by user cancel, skipping queue processing');
            return;
        }

        // If there is already a pending approval, don't process more messages
        if (this.pendingApproval) {
            console.log('[Tinder AI][DEBUG] Already have pending approval, skipping queue processing');
            return;
        }

        const message = this.messageQueue[0];
        const conversation = this.activeConversations.get(message.matchId);
        if (!conversation) {
            console.log('[Tinder AI][DEBUG] No conversation found for matchId:', message.matchId);
            this.messageQueue.shift();
            return;
        }

        // Check if it's time to send
        if (Date.now() - message.timestamp < this.autoMessageDelay) {
            return;
        }

        try {
            const response = await this.generateAIResponse(message, conversation);
            if (response) {
                // Only auto-send opener if autoMessageOnMatch is enabled, otherwise require approval
                if ((message.type === 'opener' && this.autoMessageOnMatch) || (message.type !== 'opener' && this.autoSend)) {
                    await this.sendMessage(message.matchId, response);
                    message.status = 'sent';
                    this.messageQueue.shift();
                    await this.saveMessageQueue();
                } else {
                    // Show in sidebar for approval
                    this.pendingApproval = { matchId: message.matchId, text: response };
                    console.log('[Tinder AI][DEBUG] Setting pending approval:', this.pendingApproval);
                    if (typeof renderSidebarStatusTab === 'function') {
                        renderSidebarStatusTab(sidebarConsentGiven);
                    }
                    // Wait for user action (Send/Cancel)
                    return;
                }
            } else {
                console.log('[Tinder AI][DEBUG] No response generated, removing message from queue');
                this.messageQueue.shift();
                await this.saveMessageQueue();
            }
        } catch (error) {
            console.error('Error processing message:', error);
            message.status = 'failed';
            this.messageQueue.shift();
            await this.saveMessageQueue();
        }
    },

    async generateAIResponse(message, conversation) {
        // Check rate limit
        if (typeof AI_INTEGRATION !== 'undefined' && await AI_INTEGRATION.checkRateLimit()) {
            console.log('[Tinder AI][DEBUG] generateAIResponse: Rate limit hit, returning null');
            return null;
        }

        // Clear all cached responses to ensure fresh responses
        if (typeof AI_INTEGRATION !== 'undefined') {
            await AI_INTEGRATION.clearAllCachedResponses();
        }
        console.log('[Tinder AI][DEBUG] generateAIResponse: Cleared all cached responses');

        // Detect language from conversation or last message
        let language = conversation.language || 'en';
        if (conversation.lastMessage) {
            const detected = await this.detectLanguage(conversation.lastMessage);
            if (detected) language = detected;
        }

        // Generate prompt based on message type
        let prompt;
        switch (message.type) {
            case 'opener':
                prompt = `Based on the following profile, write ONE short, engaging Tinder opening message in ${language}. Do NOT include any introduction, options, or explanation. Only output the message itself. Profile name: ${conversation.name || ''}. Bio: ${conversation.bio || ''}. Interests: ${(conversation.interests || []).join(', ')}.`;
                break;
            case 'followup':
                prompt = `Write ONE short, engaging Tinder follow-up message in ${language}, based on this context: ${message.context}. Do NOT include any introduction, options, or explanation. Only output the message itself.`;
                break;
            case 'meetup':
                prompt = `Write ONE short, friendly Tinder message in ${language} suggesting to meet up, based on this context: ${message.context}. Do NOT include any introduction, options, or explanation. Only output the message itself.`;
                break;
            default:
                return null;
        }

        console.log('[Tinder AI][DEBUG] generateAIResponse: Prompt:', prompt);

        // Get AI response - use the global getAIResponse function
        let response;
        try {
            response = await getAIResponse(prompt);
            console.log('[Tinder AI][DEBUG] generateAIResponse: Got response:', response);

            if (response && response.response) {
                window.lastGeneratedAIMessage = response.response;
                return response.response;
            } else if (typeof response === 'string') {
                window.lastGeneratedAIMessage = response;
                return response;
            } else {
                console.log('[Tinder AI][DEBUG] generateAIResponse: No response received');
                window.lastGeneratedAIMessage = '[AI ERROR] No response received';
                return null;
            }
        } catch (e) {
            console.error('[Tinder AI][DEBUG] generateAIResponse: Error:', e);
            window.lastGeneratedAIMessage = '[AI ERROR] ' + (e && e.message ? e.message : e);
            return null;
        }
    },

    async sendMessage(matchId, text) {
        try {
            const input = await waitForElement('textarea[placeholder*="message"], input[placeholder*="message"], div[contenteditable="true"]');
            if (!input) {
                console.log('[Tinder AI] No message input found');
                return false;
            }

            // Track messaging statistics
            this.messagingStats.messagesSent++;
            this.saveMessagingStats();

            await this.simulateTyping(input, text);

            const sendBtn = await waitForElement('button[aria-label*="send"], button[aria-label*="Send"], button[type="submit"]');
            if (sendBtn) {
                if (typeof ANTI_DETECTION !== 'undefined') {
                    await ANTI_DETECTION.simulateHumanBehavior(sendBtn, 'click');
                } else {
                    sendBtn.click();
                }
                console.log('[Tinder AI] Message sent successfully');
                return true;
            }

            return false;
        } catch (error) {
            console.error('[Tinder AI] Error sending message:', error);
            return false;
        }
    },

    async simulateTyping(input, text) {
        // Clear existing text
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        // Type each character with random delay
        for (const char of text) {
            input.value += char;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        }
    },

    async saveConversations() {
        try {
            // Check if extension context is still valid
            if (!chrome.runtime?.id) {
                console.warn('[Tinder AI] Extension context invalidated, skipping saveConversations');
                return;
            }

            const conversations = Object.fromEntries(this.activeConversations);
            await chrome.storage.local.set({ activeConversations: conversations });
        } catch (error) {
            if (error.message.includes('Extension context invalidated')) {
                console.warn('[Tinder AI] Extension context invalidated during saveConversations');
            } else {
                console.error('[Tinder AI] Error saving conversations:', error);
            }
        }
    },

    async saveMessageQueue() {
        try {
            // Check if extension context is still valid
            if (!chrome.runtime?.id) {
                console.warn('[Tinder AI] Extension context invalidated, skipping saveMessageQueue');
                return;
            }

            await chrome.storage.local.set({ messageQueue: this.messageQueue });
        } catch (error) {
            if (error.message.includes('Extension context invalidated')) {
                console.warn('[Tinder AI] Extension context invalidated during saveMessageQueue');
            } else {
                console.error('[Tinder AI] Error saving message queue:', error);
            }
        }
    },

    setTone(tone) {
        this.tone = tone;
        chrome.storage.local.set({ 'messageSettings.tone': tone });
    },

    setLanguage(language) {
        this.language = language;
        chrome.storage.local.set({ 'messageSettings.language': language });
    },

    setAutoSend(val) {
        this.autoSend = val;
        chrome.storage.local.set({ 'messageSettings.autoSend': val });
    },

    setMultiTurn(val) {
        this.multiTurn = val;
        chrome.storage.local.set({ 'messageSettings.multiTurn': val });
    },

    // Approve and send pending message
    async approvePendingMessage(editedText) {
        if (!this.pendingApproval) return;
        await this.sendMessage(this.pendingApproval.matchId, editedText);
        // Remove from queue
        this.messageQueue.shift();
        await this.saveMessageQueue();
        this.pendingApproval = null;
        if (typeof renderSidebarStatusTab === 'function') {
            renderSidebarStatusTab(sidebarConsentGiven);
        }
    },

    // Cancel pending message
    cancelPendingMessage() {
        console.log('[Tinder AI][DEBUG] cancelPendingMessage called');
        this.pendingApproval = null;
        this.processingBlocked = true; // Block further processing
        if (typeof renderSidebarStatusTab === 'function') {
            renderSidebarStatusTab(sidebarConsentGiven);
        }
    },

    // Cancel all pending messages
    async cancelAllPendingMessages() {
        console.log('[Tinder AI][DEBUG] cancelAllPendingMessages called. Queue length before:', this.messageQueue.length);
        this.messageQueue = [];
        this.pendingApproval = null;
        this.processingBlocked = true; // Block further processing
        await this.saveMessageQueue();
        console.log('[Tinder AI][DEBUG] cancelAllPendingMessages completed. Queue length after:', this.messageQueue.length);
        if (typeof renderSidebarStatusTab === 'function') {
            renderSidebarStatusTab(sidebarConsentGiven);
        }
    },

    // Reset processing block to allow new messages
    resetProcessingBlock() {
        console.log('[Tinder AI][DEBUG] resetProcessingBlock called');
        this.processingBlocked = false;
    },

    saveMessagingStats() {
        try {
            // Check if extension context is still valid
            if (!chrome.runtime?.id) {
                console.warn('[Tinder AI] Extension context invalidated, skipping saveMessagingStats');
                return;
            }

            // Save to storage for persistence across page refreshes
            chrome.storage.local.set({ messagingStats: this.messagingStats }, () => {
                console.log('[Tinder AI] Messaging stats saved to storage:', this.messagingStats);

                // Refresh analytics tab if it's currently active
                if (typeof currentTab !== 'undefined' && currentTab === 'analytics' && typeof renderSidebarAnalyticsTab === 'function') {
                    renderSidebarAnalyticsTab(sidebarConsentGiven);
                }
            });
        } catch (error) {
            if (error.message.includes('Extension context invalidated')) {
                console.warn('[Tinder AI] Extension context invalidated during saveMessagingStats');
            } else {
                console.error('[Tinder AI] Error saving messaging stats:', error);
            }
        }
    },

    updateResponseStats(responseTime) {
        this.messagingStats.responseCount++;
        this.messagingStats.totalResponseTime += responseTime;
        this.messagingStats.avgResponseTime = this.messagingStats.totalResponseTime / this.messagingStats.responseCount;

        // Calculate response rate (simplified - could be enhanced with actual response detection)
        if (this.messagingStats.messagesSent > 0) {
            this.messagingStats.responseRate = ((this.messagingStats.responseCount / this.messagingStats.messagesSent) * 100).toFixed(1);
        }

        this.saveMessagingStats();
    },

    setAutoMessageOnMatch(val) {
        this.autoMessageOnMatch = val;
        chrome.storage.local.set({ 'messageSettings.autoMessageOnMatch': val });
    },
};

// Initialize messaging when the script loads
MESSAGING.init();
