// content/swiping.js
// Swiping Logic Module for SpicySwipe
// Handles automated swiping, manual swipes, and swipe decision logic

// --- Swiping Logic ---
function makeDecision(profile) {
    // Use the currentFilters which are updated from storage
    const likeRatio = currentFilters.likeRatio || 0.7;

    // Keyword filter
    if (currentFilters.keywords && currentFilters.keywords.length > 0) {
        const bio = profile.bio || '';
        if (currentFilters.keywords.some(keyword => bio.toLowerCase().includes(keyword.toLowerCase()))) {
            // If keyword found, it's a potential like, otherwise nope
        } else {
            return 'nope';
        }
    }

    // Photo filter
    if (profile.photos && profile.photos.length < (currentFilters.minPhotos || 1)) {
        return 'nope';
    }

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
    // Try to find the button with retries
    while (!button && retries < maxRetries) {
        try {
            if (decision === 'like') {
                for (const selector of window.SELECTORS.LIKE_BUTTON) {
                    const buttons = document.querySelectorAll(selector);
                    for (const btn of buttons) {
                        if (!btn.disabled &&
                            btn.offsetParent !== null &&
                            !btn.className.includes('super') &&
                            !btn.className.includes('Bgc($c-ds-background-gamepad-sparks-super-like-default)') &&
                            btn.className.includes('Bgc($c-ds-background-gamepad-sparks-like-default)') &&
                            btn.querySelector('.gamepad-icon-wrapper') &&
                            !btn.querySelector('.gamepad-icon-wrapper svg path[d*="M11.27.948"]')) {
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
                        if (!btn.disabled &&
                            btn.offsetParent !== null &&
                            (btn.className.includes('nope') || btn.className.includes('Bgc($c-ds-background-gamepad-sparks-nope-default)'))) {
                            button = btn;
                            break;
                        }
                    }
                    if (button) break;
                }
            }
            if (!button) throw new Error('Swipe button not found');
        } catch (err) {
            await handleSwipeError(err, retries, backoff);
            retries++;
            backoff *= 2;
        }
    }

    if (!button) {
        // Out of likes or empty page detected
        handleStopSwiping();
        if (typeof showStatusMessage === 'function') {
            showStatusMessage('You are out of likes. Auto-swiping stopped.');
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
            analytics.likes = (analytics.likes || 0) + 1;
            delta.likes = 1;
        } else {
            analytics.nopes = (analytics.nopes || 0) + 1;
            delta.nopes = 1;
        }
        analytics.swipes = (analytics.swipes || 0) + 1;
        await chrome.storage.local.set({ analytics });
        // Update all-time and session analytics for auto swipes
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
    // Start with the configured range
    let [min, max] = SWIPE_DELAY_RANGE;
    // As swipeCount increases, slow down swipes
    const progress = swipeCount / MAX_SESSION_SWIPES;
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
    if (!sessionActive || swipeCount >= MAX_SESSION_SWIPES || swipingGloballyStopped || isStopping) {
        sessionActive = false;
        swipingGloballyStopped = true;
        console.log(`[Tinder AI] Swipe session ended. Completed ${swipeCount} swipes out of ${MAX_SESSION_SWIPES} maximum.`);
        try {
            if (chrome.runtime?.id) {
                chrome.runtime.sendMessage({ type: 'swipeSessionComplete', analytics });
            }
        } catch (e) {
            console.warn('[Tinder AI] Could not send swipe session completion message. Context likely invalidated.');
        }
        swipeCount = 0;
        analytics = { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0 };
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
            renderSidebarActiveTab();
        }
        return;
    }

    console.log(`[Tinder AI] Performing swipe ${swipeCount + 1} of ${MAX_SESSION_SWIPES}...`);

    performSwipe().then(() => {
        if (sessionActive && !swipingGloballyStopped && !isStopping) {
            window.swipeTimeout = setTimeout(automateSwiping, getDynamicSwipeDelay());
        } else {
            sessionActive = false;
            swipingGloballyStopped = true;
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
        btn.click();
        analytics.likes = (analytics.likes || 0) + 1;
        analytics.swipes = (analytics.swipes || 0) + 1;
        await chrome.storage.local.set({ analytics });
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
        btn.click();
        analytics.nopes = (analytics.nopes || 0) + 1;
        analytics.swipes = (analytics.swipes || 0) + 1;
        await chrome.storage.local.set({ analytics });
        if (typeof updateAllTimeAnalytics === 'function') {
            await updateAllTimeAnalytics({ nopes: 1, swipes: 1 });
        }
        if (typeof renderSidebarActiveTab === 'function') {
            renderSidebarActiveTab();
        }
    }
}
