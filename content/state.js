// content/state.js
// Centralized State Management (Observer Pattern)
// Eliminates direct storage calls in UI components

class StateStore {
    constructor() {
        this.state = {
            // Default State
            swipeConfig: APP_CONSTANTS.DEFAULT_CONFIG.swiping,
            messagingConfig: APP_CONSTANTS.DEFAULT_CONFIG.messaging,
            activeAI: 'gemini',
            selectedLanguages: DEFAULT_SELECTED_LANGUAGES,
            sidebarConsentGiven: false,
            sessionAnalytics: { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: getTodayDateString() },
            allTimeAnalytics: { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0 },
            aiPerformance: { gemini: { responses: 0, success: 0, avgRating: 0 } },
            // API Keys
            geminiApiKey: '', // Unified Gemini Key
            geminiFreeApiKey: '', // Legacy/Fallback
            geminiProApiKey: '', // Legacy/Fallback
            openaiApiKey: '',
            deepseekApiKey: '',
            anthropicApiKey: '',

            // Runtime Status
            currentAction: 'Idle'
        };
        this.listeners = new Set();
        this.initialized = false;
    }

    // Initialize: Load from storage and merge with defaults
    async init() {
        if (this.initialized) return;

        return new Promise((resolve) => {
            chrome.storage.local.get(null, (data) => { // Get all data
                // Merge loaded data into state
                this.state = {
                    ...this.state,
                    ...data,
                    // Ensure configs are objects (fix legacy data issues)
                    swipeConfig: data.swipeConfig || this.state.swipeConfig,
                    messagingConfig: data.messagingConfig || this.state.messagingConfig,
                    sessionAnalytics: data.sessionAnalytics || this.state.sessionAnalytics
                };

                // Date check for session analytics
                if (this.state.sessionAnalytics.date !== getTodayDateString()) {
                    this.state.sessionAnalytics = {
                        swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0,
                        date: getTodayDateString()
                    };
                    chrome.storage.local.set({ sessionAnalytics: this.state.sessionAnalytics });
                }

                console.log('[StateStore] Initialized with state:', this.state);
                this.initialized = true;
                this.notify();
                resolve();
            });
        });
    }

    // Get a specific state property
    get(key) {
        return this.state[key];
    }

    // Update state properties and sync to storage
    // Usage: stateStore.set({ activeAI: 'claude', swipeConfig: { ... } })
    async set(update) {
        // Update in-memory state
        this.state = { ...this.state, ...update };

        // Notify listeners immediately (optimistic UI update)
        this.notify();

        // Sync to persistent storage
        return new Promise((resolve, reject) => {
            chrome.storage.local.set(update, () => {
                if (chrome.runtime.lastError) {
                    console.error('[StateStore] Storage error:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }

    // Subscribe to state changes
    subscribe(listener) {
        this.listeners.add(listener);
        // call listener immediately with current state
        listener(this.state);
        // Return unsubscribe function
        return () => this.listeners.delete(listener);
    }

    // Notify all listeners
    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }
}

// Global instance
const stateStore = new StateStore();
window.stateStore = stateStore; // Expose globally
