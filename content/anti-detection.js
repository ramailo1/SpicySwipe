// content/anti-detection.js
// Anti-Detection & Rate Limiting Module for SpicySwipe
// Handles human behavior simulation and rate limit detection

const ANTI_DETECTION = {
    stealthMode: false,
    failureCount: 0,
    lastFailureTime: null,
    diagnosticLog: [],

    // Initialize from storage
    async init() {
        const data = await chrome.storage.local.get(['stealthMode', 'diagnosticLog']);
        this.stealthMode = data.stealthMode || false;
        this.diagnosticLog = data.diagnosticLog || [];
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
                await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));
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

    // Enhanced rate limiting
    async checkRateLimit() {
        const now = Date.now();
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
        return false;
    },

    // Add to diagnostic log
    async addDiagnosticLog(message) {
        const logEntry = {
            timestamp: new Date(),
            message,
            failureCount: this.failureCount,
            stealthMode: this.stealthMode
        };

        this.diagnosticLog.push(logEntry);
        // Keep only last 100 entries
        if (this.diagnosticLog.length > 100) {
            this.diagnosticLog.shift();
        }

        // Save to storage
        await chrome.storage.local.set({ diagnosticLog: this.diagnosticLog });

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
