// content/swiping.js
// Swiping Logic Module for SpicySwipe
// Handles automated swiping, manual swipes, and swipe decision logic

// --- Swiping Logic ---
function makeDecision(profile) {
    // Use the currentFilters which are updated from stateStore
    const swipeConfig = stateStore.get('swipeConfig') || APP_CONSTANTS.DEFAULT_CONFIG.swiping;
    const likeRatio = swipeConfig.likeRatio !== undefined ? swipeConfig.likeRatio : 0.7;

    // Keyword filter
    /* Future implementation:
    if (swipeConfig.keywords && swipeConfig.keywords.length > 0) {
        ...
    }
    */

    // Photo filter (future)
    /*
    if (profile.photos && profile.photos.length < (swipeConfig.minPhotos || 1)) {
        return 'nope';
    }
    */

    return Math.random() < likeRatio ? 'like' : 'nope';
}

// Centralized error handler for swiping
async function handleSwipeError(error, retryCount, backoff, isFatal = false) {
    const message = `[${new Date().toLocaleTimeString()}] Error: ${error.message} (retry ${retryCount})`;
    if (typeof ANTI_DETECTION !== 'undefined') {
        ANTI_DETECTION.addDiagnosticLog(message);
    }
    if (typeof showErrorNotification === 'function') {
        showErrorNotification(message);
    }
    if (isFatal) {
        sessionActive = false;
        swipingGloballyStopped = true;
        if (typeof showErrorNotification === 'function') {
            showErrorNotification('Swiping paused due to repeated errors. Please refresh or check your connection.');
        }
        if (typeof renderSidebarActiveTab === 'function') {
            stateStore.set({ currentAction: 'Error' });
            renderSidebarActiveTab();
        }
    } else {
        await new Promise(resolve => setTimeout(resolve, backoff));
    }
}

// Update performSwipe to use enhanced anti-detection
async function performSwipe() {
    let profile = null;
    let retries = 0;
    const maxRetries = 5;
    let backoff = 1000;

    while (!profile && retries < maxRetries) {
        try {
            profile = extractProfileInfo();
            if (!profile) throw new Error('Profile not found');
        } catch (err) {
            await handleSwipeError(err, retries, backoff);
            retries++;
            backoff *= 2; // Exponential backoff
        }
    }

    if (!profile) {
        await handleSwipeError(new Error('Failed to extract profile info after retries'), maxRetries, backoff, true);
        return false;
    }

    const decision = makeDecision(profile);
    let button = null;
    retries = 0;
    backoff = 1000;
    
    // Try to find the button with retries using window.findTinderButton
    while (!button && retries < maxRetries) {
        try {
            if (typeof window.findTinderButton === 'function') {
                button = window.findTinderButton(decision);
            }
            
            // Legacy DOM selector fallback if window.findTinderButton returns null
            if (!button) {
                if (decision === 'like') {
                    for (const selector of window.SELECTORS.LIKE_BUTTON) {
                        const buttons = document.querySelectorAll(selector);
                        for (const btn of buttons) {
                            if (!btn.disabled && btn.offsetParent !== null && !btn.className.includes('super')) {
                                button = btn;
                                break;
                            }
                        }
                        if (button) break;
                    }
                } else if (decision === 'nope') {
                    for (const selector of window.SELECTORS.NOPE_BUTTON) {
                        const buttons = document.querySelectorAll(selector);
                        for (const btn of buttons) {
                            if (!btn.disabled && btn.offsetParent !== null) {
                                button = btn;
                                break;
                            }
                        }
                        if (button) break;
                    }
                }
            }

            if (!button) throw new Error('Swipe button not found');
        } catch (err) {
            retries++;
            if (retries < maxRetries) {
                await new Promise(r => setTimeout(r, backoff));
                backoff *= 1.5;
            }
        }
    }

    // Keyboard Fallback: If DOM button element is not found, dispatch native Tinder keyboard shortcuts!
    let usedKeyboardFallback = false;
    if (!button) {
        console.warn(`[Tinder AI] DOM button for '${decision}' not found. Using native Keyboard Shortcut fallback...`);
        const key = decision === 'like' ? 'ArrowRight' : 'ArrowLeft';
        const keyCode = decision === 'like' ? 39 : 37;
        
        document.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, keyCode, which: keyCode, bubbles: true }));
        await new Promise(r => setTimeout(r, 100));
        document.dispatchEvent(new KeyboardEvent('keyup', { key, code: key, keyCode, which: keyCode, bubbles: true }));
        
        usedKeyboardFallback = true;
    }

    if (!button && !usedKeyboardFallback) {
        // Out of likes or empty page detected
        handleStopSwiping();
        if (typeof showStatusMessage === 'function') {
            showStatusMessage('You are out of likes or button not found. Auto-swiping stopped.');
        }
        return false;
    }


    try {
        if (typeof ANTI_DETECTION !== 'undefined') {
            await ANTI_DETECTION.simulateHumanBehavior(button, 'click');
        } else {
            button.click();
        }
        swipeCount++;
        let delta = { swipes: 1 };
        if (decision === 'like') {
            delta.likes = 1;
        } else {
            delta.nopes = 1;
        }

        // Update all analytics centrally (handles both session and all-time)
        if (typeof updateAllTimeAnalytics === 'function') {
            await updateAllTimeAnalytics(delta);
        }

        // Update sidebar stats live
        if (typeof renderSidebarActiveTab === 'function') {
            renderSidebarActiveTab();
        }
        // Check rate limit after each swipe
        if (typeof ANTI_DETECTION !== 'undefined' && await ANTI_DETECTION.checkRateLimit()) {
            ANTI_DETECTION.addDiagnosticLog('Rate limit reached. Pausing...');
            return false;
        }
        return true;
    } catch (err) {
        await handleSwipeError(err, 0, 1000, true);
        return false;
    }
}

function getDynamicSwipeDelay() {
    const swipeConfig = stateStore.get('swipeConfig') || APP_CONSTANTS.DEFAULT_CONFIG.swiping;
    const maxSwipes = swipeConfig.maxSwipes || 30;

    // Start with the configured range
    let min = swipeConfig.swipeDelayMin || 2000;
    let max = swipeConfig.swipeDelayMax || 4000;

    // As swipeCount increases, slow down swipes
    const progress = swipeCount / maxSwipes;
    // Increase delay by up to 2x as session progresses
    min = min * (1 + progress);
    max = max * (1 + progress * 1.5);
    // Occasionally insert a longer break every 7-12 swipes
    if (swipeCount > 0 && swipeCount % (7 + Math.floor(Math.random() * 6)) === 0) {
        return 8000 + Math.random() * 7000; // 8-15 seconds break
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function automateSwiping() {
    const swipeConfig = stateStore.get('swipeConfig') || APP_CONSTANTS.DEFAULT_CONFIG.swiping;
    const maxSwipes = swipeConfig.maxSwipes || 30;

    if (!sessionActive || swipeCount >= maxSwipes || swipingGloballyStopped || isStopping) {
        sessionActive = false;
        swipingGloballyStopped = true;
        console.log(`[Tinder AI] Swipe session ended. Completed ${swipeCount} swipes out of ${maxSwipes} maximum.`);
        try {
            if (chrome.runtime?.id) {
                const analytics = stateStore.get('sessionAnalytics') || { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0 };
                chrome.runtime.sendMessage({ type: 'swipeSessionComplete', analytics });
            }
        } catch (e) {
            console.warn('[Tinder AI] Could not send swipe session completion message. Context likely invalidated.');
        }
        swipeCount = 0;
        stateStore.set({
            sessionAnalytics: { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: new Date().toLocaleDateString() },
            currentAction: 'Idle'
        });
        if (typeof renderSidebarActiveTab === 'function') {
            renderSidebarActiveTab();
        }
        return;
    }

    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;

    // Check if we're on a valid swiping page
    const isOnSwipingPage = currentPath.includes('/app/recs') ||
        currentPath.includes('/app/explore') ||
        currentPath.includes('/app/discover') ||
        currentPath.includes('/app/matches') ||
        currentPath === '/app' ||
        currentPath === '/';

    if (!isOnSwipingPage) {
        console.log('[Tinder AI] Not on a valid swiping page. Current path:', currentPath);
        sessionActive = false;
        swipingGloballyStopped = true;
        if (typeof renderSidebarActiveTab === 'function') {
            stateStore.set({ currentAction: 'Idle' });
            renderSidebarActiveTab();
        }
        return;
    }

    console.log(`[Tinder AI] Performing swipe ${swipeCount + 1} of ${maxSwipes}...`);

    performSwipe().then(() => {
        if (sessionActive && !swipingGloballyStopped && !isStopping) {
            window.swipeTimeout = setTimeout(automateSwiping, getDynamicSwipeDelay());
        } else {
            sessionActive = false;
            swipingGloballyStopped = true;
            swipingGloballyStopped = true;
            stateStore.set({ currentAction: 'Idle' });
            if (typeof renderSidebarActiveTab === 'function') {
                renderSidebarActiveTab();
            }
        }
    }).catch(error => {
        console.error('[Tinder AI] Error during swipe:', error);
        sessionActive = false;
        swipingGloballyStopped = true;
        if (typeof renderSidebarActiveTab === 'function') {
            renderSidebarActiveTab();
        }
    });
}

// --- Action Handlers ---
async function handleStartSwiping() {
    console.log('[Tinder AI] handleStartSwiping called');

    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;

    console.log('[Tinder AI] Current URL:', currentUrl);
    console.log('[Tinder AI] Current path:', currentPath);

    // Check if we're already on a swiping page
    const isOnSwipingPage = currentPath.includes('/app/recs') ||
        currentPath.includes('/app/explore') ||
        currentPath.includes('/app/discover') ||
        currentPath.includes('/app/matches') ||
        currentPath === '/app' ||
        currentPath === '/';

    console.log('[Tinder AI] Is on swiping page:', isOnSwipingPage);

    if (!isOnSwipingPage) {
        console.log('[Tinder AI] Not on swiping page, showing notification...');

        // Show a user-friendly notification instead of immediately redirecting
        if (typeof showErrorNotification === 'function') {
            showErrorNotification('Please navigate to the swiping page (Discover/Explore) to start auto-swiping. The Start button will work there.');
        }

        // Optionally, offer to redirect after a delay
        setTimeout(() => {
            if (confirm('Would you like to go to the swiping page now?')) {
                console.log('[Tinder AI] User confirmed redirect to swiping page');
                window.location.href = 'https://tinder.com/app/recs';
            }
        }, 1000);

        return;
    }

    console.log('[Tinder AI] Starting auto-swiping on current page:', currentPath);
    swipeCount = 0;
    sessionActive = true;
    swipingGloballyStopped = false;
    isStopping = false;
    stateStore.set({ currentAction: 'Swiping' });

    console.log('[Tinder AI] Session variables set, waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('[Tinder AI] Calling automateSwiping...');
    automateSwiping();
}

function handleStopSwiping() {
    isStopping = true;
    sessionActive = false;
    swipingGloballyStopped = true;
    swipeCount = 0;

    if (window.swipeTimeout) {
        clearTimeout(window.swipeTimeout);
        window.swipeTimeout = null;
    }

    if (typeof renderSidebarActiveTab === 'function') {
        stateStore.set({ currentAction: 'Idle' });
        renderSidebarActiveTab();
    }

    setTimeout(() => {
        isStopping = false;
    }, 1000);
}

async function handleManualLike() {
    let btn = null;
    for (const sel of window.SELECTORS.tinder.likeButton || []) {
        btn = document.querySelector(sel);
        if (btn) break;
    }
    if (btn) {
        if (typeof ANTI_DETECTION !== 'undefined') {
            await ANTI_DETECTION.simulateHumanBehavior(btn, 'click');
        } else {
            btn.click();
        }
        const sessionStats = stateStore.get('sessionAnalytics') || { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0 };
        sessionStats.likes++;
        sessionStats.swipes++;
        stateStore.set({ sessionAnalytics: sessionStats });
        if (typeof updateAllTimeAnalytics === 'function') {
            await updateAllTimeAnalytics({ likes: 1, swipes: 1 });
        }
        if (typeof renderSidebarActiveTab === 'function') {
            renderSidebarActiveTab();
        }
    }
}

async function handleManualNope() {
    let btn = null;
    for (const sel of window.SELECTORS.tinder.nopeButton || []) {
        btn = document.querySelector(sel);
        if (btn) break;
    }
    if (btn) {
        if (typeof ANTI_DETECTION !== 'undefined') {
            await ANTI_DETECTION.simulateHumanBehavior(btn, 'click');
        } else {
            btn.click();
        }
        const sessionStats = stateStore.get('sessionAnalytics') || { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0 };
        sessionStats.nopes++;
        sessionStats.swipes++;
        stateStore.set({ sessionAnalytics: sessionStats });
        if (typeof updateAllTimeAnalytics === 'function') {
            await updateAllTimeAnalytics({ nopes: 1, swipes: 1 });
        }
        if (typeof renderSidebarActiveTab === 'function') {
            renderSidebarActiveTab();
        }
    }
}
