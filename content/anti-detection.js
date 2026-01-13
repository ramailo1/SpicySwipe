// content/anti-detection.js
// Anti-Detection & Rate Limiting Module for SpicySwipe
// Handles human behavior simulation, rate limit detection, and CAPTCHA detection

const ANTI_DETECTION = {
    stealthMode: false,
    failureCount: 0,
    lastFailureTime: null,
    diagnosticLog: [],

    // Rate limiting configuration
    rateLimit: {
        maxSessionSwipes: 100,
        sessionSwipes: 0,
        lastActionTimestamp: 0,
        minActionInterval: 800
    },

    // Stealth mode timing configuration
    timingConfig: {
        typingDelay: [80, 220],
        mouseMoveDelay: [15, 50],
        scrollDelay: [400, 1000]
    },

    // Initialize from storage
    async init() {
        const data = await chrome.storage.local.get(['stealthMode', 'diagnosticLog']);
        this.stealthMode = data.stealthMode || false;
        this.diagnosticLog = data.diagnosticLog || [];
    },

    // Get random delay with stealth mode consideration
    getRandomDelay(min, max) {
        const baseDelay = Math.random() * (max - min) + min;
        return this.stealthMode ? baseDelay * (1 + Math.random() * 0.5) : baseDelay;
    },

    // Enhanced human-like behavior
    async simulateHumanBehavior(element, action = 'click') {
        if (!element) return;

        // Add random mouse movement before click
        if (action === 'click') {
            const rect = element.getBoundingClientRect();
            const startX = Math.random() * window.innerWidth;
            const startY = Math.random() * window.innerHeight;
            const endX = rect.left + rect.width / 2;
            const endY = rect.top + rect.height / 2;

            // Simulate mouse movement
            const steps = 10;
            for (let i = 0; i <= steps; i++) {
                const x = startX + (endX - startX) * (i / steps);
                const y = startY + (endY - startY) * (i / steps);

                const moveEvent = new MouseEvent('mousemove', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: x,
                    clientY: y
                });
                element.dispatchEvent(moveEvent);
                await new Promise(resolve => setTimeout(resolve, this.getRandomDelay(20, 50)));
            }
        }

        // Add random delay before action
        await new Promise(resolve => setTimeout(resolve,
            this.stealthMode ? 500 + Math.random() * 1000 : 100 + Math.random() * 300
        ));

        // Perform the action with human-like timing
        const events = {
            click: ['mousedown', 'mouseup', 'click'],
            input: ['focus', 'input', 'change']
        };

        const eventSequence = events[action] || [action];
        for (const eventName of eventSequence) {
            const event = new MouseEvent(eventName, {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: element.getBoundingClientRect().left + element.offsetWidth / 2,
                clientY: element.getBoundingClientRect().top + element.offsetHeight / 2
            });
            element.dispatchEvent(event);
            await new Promise(resolve => setTimeout(resolve,
                this.stealthMode ? 100 + Math.random() * 200 : 50 + Math.random() * 100
            ));
        }
    },

    // Simulate natural-looking page scrolling with easing
    async simulateNaturalScroll() {
        return new Promise(resolve => {
            const scrollAmount = (Math.random() - 0.5) * 400;
            const startY = window.scrollY;
            const duration = this.getRandomDelay(300, 800);
            let startTime = null;

            const scrollStep = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const progress = (timestamp - startTime) / duration;
                const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI); // Ease-in-out
                window.scrollTo(0, startY + scrollAmount * ease);
                if (progress < 1) {
                    window.requestAnimationFrame(scrollStep);
                } else {
                    this.addDiagnosticLog(`Simulated natural scroll by ${Math.round(scrollAmount)}px.`);
                    resolve();
                }
            };
            window.requestAnimationFrame(scrollStep);
        });
    },

    // Randomize viewport size (signals for background script)
    randomizeViewport() {
        const width = 1200 + Math.floor(Math.random() * 400);
        const height = 800 + Math.floor(Math.random() * 200);
        this.addDiagnosticLog(`Requesting new viewport size: ${width}x${height}`);
        return { width, height };
    },

    // CAPTCHA detection based on keywords in the DOM
    detectCAPTCHA() {
        const bodyText = document.body.innerText.toLowerCase();
        const captchaKeywords = ['captcha', 'verify you are human', 'challenge', 'are you a robot'];
        if (captchaKeywords.some(keyword => bodyText.includes(keyword))) {
            this.addDiagnosticLog('CAPTCHA detected via keyword search.');
            return true;
        }
        return false;
    },

    // Watch for DOM changes that might indicate anti-bot measures
    detectDOMChanges(targetSelector, timeout = 2000) {
        return new Promise((resolve) => {
            const observer = new MutationObserver((mutations, obs) => {
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.textContent && (node.textContent.toLowerCase().includes('captcha') || node.textContent.toLowerCase().includes('challenge'))) {
                                this.addDiagnosticLog('Suspicious DOM change: CAPTCHA or challenge text detected.');
                            }
                        }
                    }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => {
                observer.disconnect();
                resolve();
            }, timeout);
        });
    },

    // Reset session counters
    resetSession() {
        this.rateLimit.sessionSwipes = 0;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.addDiagnosticLog('Anti-detection session counters reset.');
    },

    // Enhanced rate limiting with session tracking
    async checkRateLimit() {
        const now = Date.now();

        // Check minimum action interval
        if (now - this.rateLimit.lastActionTimestamp < this.rateLimit.minActionInterval) {
            const delay = this.rateLimit.minActionInterval - (now - this.rateLimit.lastActionTimestamp);
            this.addDiagnosticLog(`Rate limit check: Throttling action for ${delay}ms.`);
            await new Promise(r => setTimeout(r, delay));
        }

        // Check max session swipes
        if (this.rateLimit.sessionSwipes >= this.rateLimit.maxSessionSwipes) {
            this.addDiagnosticLog('Rate limit check: Max session swipes reached.');
            return false;
        }

        this.rateLimit.lastActionTimestamp = Date.now();

        // Track failures over time
        if (this.lastFailureTime && now - this.lastFailureTime < 3600000) { // 1 hour window
            this.failureCount++;
        } else {
            this.failureCount = 1;
        }
        this.lastFailureTime = now;

        // Adjust behavior based on failure count
        if (this.failureCount >= 5) {
            await this.toggleStealthMode(true);
            this.addDiagnosticLog('Multiple failures detected. Enabling stealth mode.');
            return true;
        } else if (this.failureCount >= 3) {
            this.addDiagnosticLog('Rate limit detected. Increasing delays.');
            return true;
        }
        return true;
    },

    // Increment swipe counter
    incrementSwipeCount() {
        this.rateLimit.sessionSwipes++;
    },

    // Add to diagnostic log
    async addDiagnosticLog(message) {
        const logEntry = {
            timestamp: new Date(),
            message,
            failureCount: this.failureCount,
            stealthMode: this.stealthMode
        };

        this.diagnosticLog.unshift(logEntry); // Add to beginning for newest first
        // Keep only last 100 entries
        if (this.diagnosticLog.length > 100) {
            this.diagnosticLog.pop();
        }

        // Save to storage
        await chrome.storage.local.set({ diagnosticLog: this.diagnosticLog });

        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('antiDetectionDiagnostic', { detail: logEntry }));

        // Update UI if anti-detection tab is active
        if (typeof sidebarActiveTab !== 'undefined' && sidebarActiveTab === 'antidetection') {
            if (typeof renderSidebarAntiDetectionTab === 'function') {
                renderSidebarAntiDetectionTab(sidebarConsentGiven);
            }
        }
    },

    // Get diagnostic log
    getDiagnosticLog() {
        return this.diagnosticLog;
    },

    // Toggle stealth mode
    async toggleStealthMode(enabled) {
        this.stealthMode = enabled;
        await chrome.storage.local.set({ stealthMode: enabled });
        await this.addDiagnosticLog(`Stealth mode ${enabled ? 'enabled' : 'disabled'}`);
    }
};

// Initialize anti-detection when the script loads
ANTI_DETECTION.init();
