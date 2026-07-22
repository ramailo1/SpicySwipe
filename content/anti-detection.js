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

    // Gaussian random number generator (Box-Muller transform) for natural distribution
    boxMullerRandom(min, max, skew = 1) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

        num = num / 10.0 + 0.5; // Translate to 0 -> 1
        if (num > 1 || num < 0) num = this.boxMullerRandom(min, max, skew); // resample
        else {
            num = Math.pow(num, skew); // Skew
            num *= max - min; // Stretch to range
            num += min; // Offset to min
        }
        return num;
    },

    // Get random delay with stealth mode consideration using Gaussian distribution
    getRandomDelay(min, max) {
        // If stealth mode, shift the curve towards higher delays (skew < 1)
        const skew = this.stealthMode ? 0.7 : 1;
        const delay = this.boxMullerRandom(min, max, skew);
        // Add occasional "thought pause" outlier
        if (Math.random() < 0.05) { // 5% chance
            return delay * (1.5 + Math.random());
        }
        return delay;
    },

    // Generate smooth Cubic Bezier path for mouse movement
    generateBezierPath(start, end, steps) {
        const path = [];
        // Random control points to create arcs/S-curves
        const spread = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y)) * 0.5;
        const control1 = {
            x: start.x + (Math.random() - 0.5) * spread,
            y: start.y + (Math.random() - 0.5) * spread
        };
        const control2 = {
            x: end.x + (Math.random() - 0.5) * spread,
            y: end.y + (Math.random() - 0.5) * spread
        };

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            // Cubic Bezier formula
            const x = Math.pow(1 - t, 3) * start.x +
                3 * Math.pow(1 - t, 2) * t * control1.x +
                3 * (1 - t) * Math.pow(t, 2) * control2.x +
                Math.pow(t, 3) * end.x;
            const y = Math.pow(1 - t, 3) * start.y +
                3 * Math.pow(1 - t, 2) * t * control1.y +
                3 * (1 - t) * Math.pow(t, 2) * control2.y +
                Math.pow(t, 3) * end.y;
            path.push({ x, y });
        }
        return path;
    },

    // Enhanced human-like behavior
    async simulateHumanBehavior(element, action = 'click') {
        if (!element) return;

        // Add random mouse movement before click with Bezier curves
        if (action === 'click') {
            const rect = element.getBoundingClientRect();
            // Start from a random point or the center of the screen (simulating idle mouse)
            const startX = Math.random() * window.innerWidth;
            const startY = Math.random() * window.innerHeight;

            // Randomize target point within the element (not always dead center)
            const padding = Math.min(rect.width, rect.height) * 0.2;
            const endX = rect.left + padding + Math.random() * (rect.width - 2 * padding);
            const endY = rect.top + padding + Math.random() * (rect.height - 2 * padding);

            const steps = Math.floor(this.getRandomDelay(15, 30)); // Variable steps
            const path = this.generateBezierPath({ x: startX, y: startY }, { x: endX, y: endY }, steps);

            for (let i = 0; i < path.length; i++) {
                const point = path[i];

                // Add micro-jitter
                const jitterX = (Math.random() - 0.5) * 2;
                const jitterY = (Math.random() - 0.5) * 2;

                const moveEvent = new MouseEvent('mousemove', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: point.x + jitterX,
                    clientY: point.y + jitterY
                });
                element.dispatchEvent(moveEvent);

                // Variable delays between moves (fast in middle, slow at ends - Fitts's Law approximation)
                const speedFactor = 1 - Math.sin((i / steps) * Math.PI); // 1 at ends, 0 in middle
                const moveDelay = 5 + speedFactor * 15;

                await new Promise(resolve => setTimeout(resolve, moveDelay));
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
            const duration = this.getRandomDelay(400, 1000); // Smoother, longer duration
            let startTime = null;

            const scrollStep = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const progress = (timestamp - startTime) / duration;
                // Improved easing function (easeOutQuart)
                const ease = 1 - Math.pow(1 - progress, 4);

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

    // Human-like typing simulation
    async simulateTyping(element, text) {
        if (!element) return;
        element.focus();

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            // Keydown
            const keydown = new KeyboardEvent('keydown', { key: char, bubbles: true });
            element.dispatchEvent(keydown);

            // Random delay between down/up (dwell time)
            await new Promise(r => setTimeout(r, this.boxMullerRandom(30, 80)));

            // Input/Value update
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.value += char; // Standard behavior
                element.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Keyup
            const keyup = new KeyboardEvent('keyup', { key: char, bubbles: true });
            element.dispatchEvent(keyup);

            // Random delay between keystrokes (flight time)
            // Spacebar usually takes longer
            const baseDelay = char === ' ' ? 120 : 80;
            await new Promise(r => setTimeout(r, this.getRandomDelay(baseDelay - 30, baseDelay + 50)));

            // Occasional "mistake" pause (thinking)
            if (Math.random() < 0.05) {
                await new Promise(r => setTimeout(r, this.getRandomDelay(300, 800)));
            }
        }
        element.dispatchEvent(new Event('change', { bubbles: true }));
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
            timestamp: new Date().toISOString(), // Store as ISO string for serialization
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
