// content/ai-integration.js
// AI Integration Module for SpicySwipe
// Handles AI provider management, caching, and response validation

const AI_INTEGRATION = {
    currentAI: 'gemini', // Default to Gemini
    fallbackOrder: ['gemini'], // Only Gemini now
    responseCache: new Map(),
    performance: {
        gemini: { responses: 0, success: 0, avgRating: 0 }
    },
    rateLimits: {
        gemini: { count: 0, lastReset: Date.now(), limit: 60, window: 3600000 } // 60/hour
    },

    async init() {
        const data = await chrome.storage.local.get(['activeAI', 'aiPerformance', 'aiRateLimits']);
        this.currentAI = data.activeAI || 'gemini';
        if (data.aiPerformance) this.performance = data.aiPerformance;
        if (data.aiRateLimits) this.rateLimits = data.aiRateLimits;
    },

    async fallbackToNextAI() {
        // No fallback needed since we only use Gemini
        console.log('[Tinder AI][AI_INTEGRATION] No fallback available - using Gemini only');
    },

    async validateResponse(response) {
        if (!response || typeof response !== 'string') {
            console.log('[Tinder AI][AI_INTEGRATION] validateResponse: Invalid response type:', typeof response);
            return false;
        }

        const trimmed = response.trim();
        if (trimmed.length === 0) {
            console.log('[Tinder AI][AI_INTEGRATION] validateResponse: Empty response');
            return false;
        }

        // Check for common error messages
        const errorPatterns = [
            /i'm sorry/i,
            /i cannot/i,
            /i don't have access/i,
            /i'm not able/i,
            /error/i,
            /failed/i,
            /unable/i
        ];

        for (const pattern of errorPatterns) {
            if (pattern.test(trimmed)) {
                console.log('[Tinder AI][AI_INTEGRATION] validateResponse: Error pattern detected:', pattern);
                return false;
            }
        }

        // Check if response is too short (likely an error)
        if (trimmed.length < 5) {
            console.log('[Tinder AI][AI_INTEGRATION] validateResponse: Response too short:', trimmed);
            return false;
        }

        console.log('[Tinder AI][AI_INTEGRATION] validateResponse: Response validated successfully:', trimmed.substring(0, 50) + '...');
        return true;
    },

    rateResponseQuality(response) {
        let score = 5; // Base score

        // Length check
        if (response.length > 100) score += 1;
        if (response.length > 200) score += 1;

        // Structure check
        if (response.includes('?')) score += 1; // Contains questions
        if (response.includes('!')) score += 1; // Contains enthusiasm
        if (response.includes('.')) score += 1; // Proper sentences

        // Content check
        if (response.toLowerCase().includes('hello') ||
            response.toLowerCase().includes('hi')) score += 1;

        return Math.min(10, score);
    },

    async checkRateLimit() {
        const limit = this.rateLimits[this.currentAI];
        const now = Date.now();

        // Reset counter if window has passed
        if (now - limit.lastReset > limit.window) {
            limit.count = 0;
            limit.lastReset = now;
        }

        if (limit.count >= limit.limit) {
            if (typeof ANTI_DETECTION !== 'undefined') {
                ANTI_DETECTION.addDiagnosticLog(`Rate limit reached for ${this.currentAI}`);
            }
            return true;
        }

        limit.count++;
        await chrome.storage.local.set({ aiRateLimits: this.rateLimits });
        return false;
    },

    async getCachedResponse(prompt) {
        const cacheKey = `${this.currentAI}:${prompt}`;
        const cached = this.responseCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
            return cached.response;
        }

        return null;
    },

    async cacheResponse(prompt, response) {
        const cacheKey = `${this.currentAI}:${prompt}`;
        this.responseCache.set(cacheKey, {
            response,
            timestamp: Date.now()
        });

        // Keep cache size manageable
        if (this.responseCache.size > 100) {
            const oldestKey = this.responseCache.keys().next().value;
            this.responseCache.delete(oldestKey);
        }
    },

    async getResponse(prompt) {
        try {
            console.log('[Tinder AI][AI_INTEGRATION] getResponse called. Prompt:', prompt);
            // getAIResponse is defined in content.js
            const response = await getAIResponse(prompt);
            console.log('[Tinder AI][AI_INTEGRATION] getResponse: Got response:', response);
            if (response && response.response) {
                console.log('[Tinder AI][AI_INTEGRATION] getResponse: Returning response:', response.response.substring(0, 50) + '...');
                return response.response;
            } else if (typeof response === 'string') {
                return response;
            } else {
                console.log('[Tinder AI][AI_INTEGRATION] getResponse: No valid response received');
                return null;
            }
        } catch (error) {
            console.error('[Tinder AI][AI_INTEGRATION] getResponse error:', error && (error.message || error), error && error.stack);
            return null;
        }
    },

    async clearCachedResponse(prompt) {
        const cacheKey = `${this.currentAI}:${prompt}`;
        this.responseCache.delete(cacheKey);
        console.log('[Tinder AI][AI_INTEGRATION] Cleared cached response for:', cacheKey);
    },

    async clearAllCachedResponses() {
        this.responseCache.clear();
        console.log('[Tinder AI][AI_INTEGRATION] Cleared all cached responses');
    },
};

// Initialize AI integration
AI_INTEGRATION.init();
