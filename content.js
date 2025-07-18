// content.js
// Handles Tinder/AI DOM automation and communication with background

// --- Config ---
let SWIPE_DELAY_RANGE = [2000, 4000];
let MAX_SESSION_SWIPES = 30;
const SKIP_CHANCE = 0.1;
let swipeCount = 0;
let sessionActive = false;
let swipingGloballyStopped = true;
const currentFilters = {};
let analytics = { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0 };
let isStopping = false;
let sidebarActiveTab = 'status';
let sidebarConsentGiven = false;
const getTodayDateString = () => new Date().toISOString().slice(0, 10);

// Add at the top of the file, after other global variables:
let statusPanelState = { stats: true, stealth: true, settings: true };

// --- Helper Functions ---
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeout);
    });
}

function randomDelay(min, max) {
  return Math.random() * (max - min) + min;
}

async function simulateHumanEvents(element, eventType) {
  if (!element) return;
  
  const events = {
    click: ['mousedown', 'mouseup', 'click'],
    input: ['focus', 'input', 'change']
  };
  
  const eventSequence = events[eventType] || [eventType];
  
  for (const eventName of eventSequence) {
    const event = new MouseEvent(eventName, {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: element.getBoundingClientRect().left + element.offsetWidth / 2,
      clientY: element.getBoundingClientRect().top + element.offsetHeight / 2
    });
    element.dispatchEvent(event);
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
  }
}

// --- Profile Management ---
// Removed expandProfile function entirely

function extractProfileInfo() {
  console.log('Extracting profile info...');
  // Find the card stack container
  const stack = document.querySelector('.recsCardboard__cardsContainer, .recsCardboard__cards');
  if (!stack) {
    console.log('No card stack found');
    return null;
  }
  // Get all profile cards in the stack
  const allCards = Array.from(stack.querySelectorAll('div[data-keyboard-gamepad]'));
  // Pick the last one that is not inert and not aria-hidden="true"
  let card = allCards.slice().reverse().find(card =>
    !card.hasAttribute('inert') && card.getAttribute('aria-hidden') !== 'true'
  );
  if (!card) {
    // Fallback: just use the last card
    card = allCards[allCards.length - 1];
  }
  if (!card) {
    console.log('No visible card element found');
    return null;
  }
  // Debug: print card HTML
  console.log('CARD HTML:', card.innerHTML);
  try {
    // Name and age (improved selectors)
    let name = 'Unknown';
    let age = null;
    const nameSpan = card.querySelector('span[itemprop="name"]');
    const ageSpan = card.querySelector('span[itemprop="age"]');
    console.log('Name span:', nameSpan ? nameSpan.outerHTML : 'NOT FOUND');
    console.log('Age span:', ageSpan ? ageSpan.outerHTML : 'NOT FOUND');
    if (nameSpan) name = nameSpan.textContent.trim();
    if (ageSpan) age = parseInt(ageSpan.textContent.trim());

    // Main photo (background-image style)
    let photo = '';
    const bgDiv = card.querySelector('div[style*="background-image"]');
    if (bgDiv) {
      const bg = bgDiv.style.backgroundImage;
      const urlMatch = bg.match(/url\(["']?(.*?)["']?\)/);
      if (urlMatch && urlMatch[1]) {
        photo = urlMatch[1];
      }
      console.log('Photo background div:', bgDiv.outerHTML, 'Extracted photo URL:', photo);
    } else {
      console.log('No background-image div found for photo');
    }

    // Tags/interests (log all possible tag elements)
    const interests = [];
    const tagElements = card.querySelectorAll('div[class*="tag"], div[class*="badge"], div[class*="interest"]');
    console.log('Tag elements found:', tagElements.length);
    tagElements.forEach(el => {
      const tag = el.textContent.trim();
      console.log('Tag element:', el.outerHTML, 'Tag:', tag);
      if (tag && !interests.includes(tag)) {
        interests.push(tag);
      }
    });
    const cardData = { name, age, photo, interests, timestamp: new Date().toISOString() };
    console.log('Extracted card data:', cardData);
    return cardData;
  } catch (error) {
    console.error('Error extracting profile info from card:', error);
    return null;
  }
}

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

// --- Anti-Detection & Rate Limiting ---
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
    if (sidebarActiveTab === 'antidetection') {
      renderSidebarAntiDetectionTab(sidebarConsentGiven);
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

// --- AI Integration ---
const AI_INTEGRATION = {
  currentAI: 'gemini', // Default to Gemini since we removed ChatGPT
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
      ANTI_DETECTION.addDiagnosticLog(`Rate limit reached for ${this.currentAI}`);
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

// Centralized error handler for swiping
async function handleSwipeError(error, retryCount, backoff, isFatal = false) {
  const message = `[${new Date().toLocaleTimeString()}] Error: ${error.message} (retry ${retryCount})`;
  ANTI_DETECTION.addDiagnosticLog(message);
  showErrorNotification(message);
  if (isFatal) {
    sessionActive = false;
    swipingGloballyStopped = true;
    showErrorNotification('Swiping paused due to repeated errors. Please refresh or check your connection.');
    renderSidebarActiveTab();
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
    showStatusMessage('You are out of likes. Auto-swiping stopped.');
    return false;
  }

  try {
    await ANTI_DETECTION.simulateHumanBehavior(button, 'click');
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
    await updateAllTimeAnalytics(delta);
    // Update sidebar stats live
    renderSidebarActiveTab();
    // Check rate limit after each swipe
    if (await ANTI_DETECTION.checkRateLimit()) {
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
    renderSidebarActiveTab();
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
    renderSidebarActiveTab();
    return;
  }

  console.log(`[Tinder AI] Performing swipe ${swipeCount + 1} of ${MAX_SESSION_SWIPES}...`);

  performSwipe().then(() => {
    if (sessionActive && !swipingGloballyStopped && !isStopping) {
      window.swipeTimeout = setTimeout(automateSwiping, getDynamicSwipeDelay());
    } else {
      sessionActive = false;
      swipingGloballyStopped = true;
      renderSidebarActiveTab();
    }
  }).catch(error => {
    console.error('[Tinder AI] Error during swipe:', error);
    sessionActive = false;
    swipingGloballyStopped = true;
    renderSidebarActiveTab();
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
        showErrorNotification('Please navigate to the swiping page (Discover/Explore) to start auto-swiping. The Start button will work there.');
        
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
  
  renderSidebarActiveTab();
  
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
      await updateAllTimeAnalytics({ likes: 1, swipes: 1 });
      renderSidebarActiveTab(); 
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
      await updateAllTimeAnalytics({ nopes: 1, swipes: 1 });
      renderSidebarActiveTab(); 
  }
}

// --- UI Management ---
function renderSidebarActiveTab() {
  if (sidebarActiveTab === 'status') {
    renderSidebarStatusTab(sidebarConsentGiven);
  } else if (sidebarActiveTab === 'ai') {
    renderSidebarAITab(sidebarConsentGiven);
  } else if (sidebarActiveTab === 'swiping') {
    renderSidebarSwipingTab(sidebarConsentGiven);
  } else if (sidebarActiveTab === 'analytics') {
    renderSidebarAnalyticsTab(sidebarConsentGiven);
  }
}

function renderSidebarStatusTab(enabled) {
  const panel = document.getElementById('sidebar-tab-status');
  if (!panel) return;
  panel.innerHTML = '';

  // Profile preview
  let profileHTML = '';
  const profile = window.currentProfile || extractProfileInfo();
  if (profile && profile.photo) {
    profileHTML = `<div class="sidebar-profile-preview">\n      <img src="${profile.photo}" alt="Profile" class="sidebar-profile-photo">\n      <div class="sidebar-profile-name">${profile.name || 'Unknown'}</div>\n      ${profile.age ? `<div class="sidebar-profile-age">${profile.age} years old</div>` : ''}\n      ${profile.interests && profile.interests.length > 0 ? `<div class="sidebar-profile-interests">${profile.interests.map(interest => `<span class=\"sidebar-profile-interest\">${interest}</span>`).join('')}` : ''}\n    </div>`;
  } else {
    profileHTML = `<div class="sidebar-profile-photo-placeholder">No Photo</div>`;
  }

  // Stats box
  const statsBox = `<div class="sidebar-box">
    <div class="sidebar-box-header">
      <span>Today's Stats</span>
    </div>
    <div class="sidebar-box-body">
      <div>Swipes: ${analytics.swipes}</div>
      <div>Likes: ${analytics.likes}</div>
      <div>Nopes: ${analytics.nopes}</div>
      <div>Matches: ${analytics.matches}</div>
      <div>Messages: ${analytics.messages}</div>
      <div>Like Ratio: ${analytics.swipes ? ((analytics.likes / analytics.swipes) * 100).toFixed(1) : 0}%</div>
    </div>
  </div>`;

  // Stealth mode toggle
  const stealthBox = `<div class="sidebar-box">
    <div class="sidebar-box-header">
      <span>Stealth Mode</span>
    </div>
    <div class="sidebar-box-body">
      <label class="settings-label flex items-center">
        <input type="checkbox" id="stealth-mode" ${ANTI_DETECTION.stealthMode ? 'checked' : ''} class="mr-2">
        Enable Stealth Mode
      </label>
      <div class="stealth-panel-desc">Reduces detection risk by adding random delays and human-like behavior</div>
    </div>
  </div>`;

  // Settings summary
  const swipeConfig = window.swipeConfig || { maxSwipes: 30, likeRatio: 0.7 };
  const messagingConfig = window.messagingConfig || { tone: 'friendly', autoSend: false };
  const settingsBox = `<div class="sidebar-box">
    <div class="sidebar-box-header">
      <span>Current Settings</span>
    </div>
    <div class="sidebar-box-body">
      <div>Max Swipes: ${swipeConfig.maxSwipes}</div>
      <div>Like Ratio: ${Math.round((swipeConfig.likeRatio) * 100)}%</div>
      <div>Message Tone: ${messagingConfig.tone}</div>
      <div>Auto Send: ${messagingConfig.autoSend ? 'Yes' : 'No'}</div>
    </div>
  </div>`;

  // Page status/warning
  const currentPath = window.location.pathname;
  const isOnSwipingPage = currentPath.includes('/app/recs') || 
                         currentPath.includes('/app/explore') || 
                         currentPath.includes('/app/discover') ||
                         currentPath.includes('/app/matches') ||
                         currentPath === '/app' ||
                         currentPath === '/';
  const pageStatusHTML = !isOnSwipingPage ? `<div class="sidebar-warning">
    <div class="sidebar-warning-header">⚠️ Page Notice</div>
    <div class="sidebar-warning-text">Auto-swiping works on the Discover/Explore page. Navigate there to use the Start button.</div>
  </div>` : '';

  // Control buttons
  const controlsDisabled = !enabled;
  const startDisabled = controlsDisabled || sessionActive;
  const stopDisabled = controlsDisabled || !sessionActive;
  const btnRow = `<div class="sidebar-btn-row">
    <button id="sidebar-start-btn" class="main-btn btn-start${startDisabled ? ' btn-disabled' : ''}" ${startDisabled ? 'disabled' : ''}>▶️ Start</button>
    <button id="sidebar-stop-btn" class="main-btn btn-stop${stopDisabled ? ' btn-disabled' : ''}" ${stopDisabled ? 'disabled' : ''}>⏹️ Stop</button>
    <button id="sidebar-like-btn" class="swipe-btn btn-like${controlsDisabled ? ' btn-disabled' : ''}" ${controlsDisabled ? 'disabled' : ''}>👍 Like</button>
    <button id="sidebar-dislike-btn" class="swipe-btn btn-nope${controlsDisabled ? ' btn-disabled' : ''}" ${controlsDisabled ? 'disabled' : ''}>👎 Nope</button>
  </div>`;

  panel.innerHTML = `
    <div class="sidebar-profile-preview sidebar-section-spacing">${profileHTML}</div>
    <div class="sidebar-section-spacing">${statsBox}</div>
    <div class="sidebar-section-spacing">${stealthBox}</div>
    <div class="sidebar-section-spacing">${settingsBox}</div>
    ${pageStatusHTML}
    ${btnRow}
  `;

  // Add event listeners for controls
  const startBtn = document.getElementById('sidebar-start-btn');
  const stopBtn = document.getElementById('sidebar-stop-btn');
  const likeBtn = document.getElementById('sidebar-like-btn');
  const dislikeBtn = document.getElementById('sidebar-dislike-btn');
  if (startBtn && !startDisabled) startBtn.onclick = () => { handleStartSwiping(); setTimeout(() => renderSidebarStatusTab(enabled), 100); };
  if (stopBtn && !stopDisabled) stopBtn.onclick = () => { handleStopSwiping(); setTimeout(() => renderSidebarStatusTab(enabled), 100); };
  if (likeBtn && !controlsDisabled) likeBtn.onclick = () => handleManualLike();
  if (dislikeBtn && !controlsDisabled) dislikeBtn.onclick = () => handleManualNope();
  // Stealth mode checkbox event handler
  const stealthCheckbox = document.getElementById('stealth-mode');
  if (stealthCheckbox) {
    stealthCheckbox.addEventListener('change', (e) => {
      ANTI_DETECTION.toggleStealthMode(e.target.checked);
    });
  }
}

function renderSidebarSettingsTab(enabled) {
  const settingsPanel = document.getElementById('sidebar-tab-settings');
  if (!settingsPanel) return;

  // Clear the panel before rendering
  settingsPanel.innerHTML = '';

  // Load existing settings
  chrome.storage.local.get(['geminiFreeApiKey', 'geminiProApiKey', 'filterConfig', 'messagingConfig'], ({ geminiFreeApiKey, geminiProApiKey, filterConfig, messagingConfig }) => {
    const config = filterConfig || { likeRatio: 0.7, maxSwipes: 100 };
    const msgConfig = messagingConfig || { tone: 'friendly', language: 'en', autoSend: false };

    // Swiping Configuration
    const swipingSettingsHTML = `
      <div class="sidebar-box">
        <div class="settings-header">Swiping Behavior</div>
        <div class="settings-row">
          <label for="like-ratio" class="settings-label">Like Ratio (%)</label>
          <div class="sidebar-flex-row sidebar-gap-md sidebar-btn-wide">
            <input type="range" id="like-ratio" min="10" max="100" value="${Math.round((config.likeRatio || 0.7) * 100)}" class="settings-input sidebar-input-grow" />
            <span class="settings-value sidebar-label-min sidebar-text-right">${Math.round((config.likeRatio || 0.7) * 100)}%</span>
          </div>
        </div>
        <div class="settings-row">
          <label for="max-swipes" class="settings-label">Max Swipes</label>
          <input type="number" id="max-swipes" min="5" max="100" value="${config.maxSwipes || 100}" class="settings-input" />
        </div>
      </div>
    `;

    // Messaging Configuration
    const messagingSettingsHTML = `
      <div class="settings-divider"></div>
      <div class="settings-header">Messaging Configuration</div>
      <div class="settings-row">
        <label for="message-tone" class="settings-label">Message Tone</label>
        <select id="message-tone" class="settings-input">
          <option value="playful" ${msgConfig.tone === 'playful' ? 'selected' : ''}>Playful</option>
          <option value="friendly" ${msgConfig.tone === 'friendly' ? 'selected' : ''}>Friendly</option>
          <option value="flirty" ${msgConfig.tone === 'flirty' ? 'selected' : ''}>Flirty</option>
          <option value="witty" ${msgConfig.tone === 'witty' ? 'selected' : ''}>Witty</option>
          <option value="extra-naughty" ${msgConfig.tone === 'extra-naughty' ? 'selected' : ''}>Extra Naughty</option>
          <option value="more-funny" ${msgConfig.tone === 'more-funny' ? 'selected' : ''}>More Funny</option>
          <option value="super-romantic" ${msgConfig.tone === 'super-romantic' ? 'selected' : ''}>Super Romantic</option>
          <option value="sarcastic" ${msgConfig.tone === 'sarcastic' ? 'selected' : ''}>Sarcastic</option>
          <option value="meme-lord" ${msgConfig.tone === 'meme-lord' ? 'selected' : ''}>Meme Lord</option>
          <option value="icebreaker" ${msgConfig.tone === 'icebreaker' ? 'selected' : ''}>Icebreaker</option>
          <option value="mysterious" ${msgConfig.tone === 'mysterious' ? 'selected' : ''}>Mysterious</option>
          <option value="compliment-bomb" ${msgConfig.tone === 'compliment-bomb' ? 'selected' : ''}>Compliment Bomb</option>
          </select>
        </div>
      <div class="settings-row">
        <label for="message-language" class="settings-label">Language</label>
        <select id="message-language" class="settings-input">
          <option value="en" ${msgConfig.language === 'en' ? 'selected' : ''}>English</option>
          <option value="es" ${msgConfig.language === 'es' ? 'selected' : ''}>Spanish</option>
          <option value="fr" ${msgConfig.language === 'fr' ? 'selected' : ''}>French</option>
          <option value="de" ${msgConfig.language === 'de' ? 'selected' : ''}>German</option>
          </select>
        </div>
      <div class="settings-row">
        <label class="settings-label flex items-center text-muted">
          <input type="checkbox" id="auto-send" ${msgConfig.autoSend ? 'checked' : ''} class="mr-2">
          Auto-send messages
        </label>
      </div>
      <div class="settings-row">
        <label class="settings-label flex items-center text-muted">
          <input type="checkbox" id="auto-message-on-match" ${msgConfig.autoMessageOnMatch ? 'checked' : ''} class="mr-2">
          Auto-message new matches
        </label>
      </div>
    `;

    // Language Preferences Section
    const selectedLanguages = msgConfig.selectedLanguages || DEFAULT_SELECTED_LANGUAGES;
    const languagePreferencesHTML = `
      <div class="settings-divider"></div>
      <div class="settings-header">Language Preferences</div>
      <p class="stealth-panel-desc">Select which languages appear in your translation dropdowns:</p>
      <div id="language-selection-container" class="diagnostic-log">
        <div class="grid grid-cols-auto gap-2">
          ${getAllLanguageOptions().map(lang => `
            <label class="settings-label flex items-center text-xs cursor-pointer">
              <input type="checkbox" class="language-checkbox" value="${lang.value}" ${selectedLanguages.includes(lang.value) ? 'checked' : ''} class="mr-2">
              ${lang.text}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="flex gap-2 mt-3">
        <button id="select-all-languages" class="main-btn bg-primary text-white p-2 text-xs">Select All</button>
        <button id="deselect-all-languages" class="main-btn bg-danger text-white p-2 text-xs">Deselect All</button>
        <button id="reset-languages" class="main-btn bg-warning text-white p-2 text-xs">Reset to Default</button>
      </div>
      <div class="stealth-panel-desc">
        Selected: <span id="selected-count">${selectedLanguages.length}</span> languages
      </div>
    `;

    // API Settings
    const apiSettingsHTML = `
      <div class="settings-divider"></div>
      <div class="settings-header">API Settings</div>
      <p class="stealth-panel-desc">Using an API is faster and more reliable. Get your key from Google AI Studio.</p>
      <div class="settings-row">
          <label for="gemini-free-api-key" class="settings-label">Gemini Free API Key</label>
          <input type="password" id="gemini-free-api-key" class="settings-input" placeholder="Enter Gemini Free API Key">
        </div>
      <div id="api-key-status" class="stealth-panel-desc"></div>
      <button id="save-api-keys-btn" class="main-btn sidebar-save-btn">Save API Key</button>
    `;

    // Save Settings Button
    const saveSettingsHTML = `
      <div class="settings-divider"></div>
      <button id="save-settings" class="main-btn btn-start sidebar-btn-full">Save All Settings</button>
    
      <div id="settings-status" class="stealth-panel-desc"></div>
    `;

    settingsPanel.innerHTML = swipingSettingsHTML + messagingSettingsHTML + languagePreferencesHTML + apiSettingsHTML + saveSettingsHTML;

    // Load existing API key
    const keyInput = document.getElementById('gemini-free-api-key');
    if (keyInput && geminiFreeApiKey) {
      keyInput.value = geminiFreeApiKey;
    }

    // Add event listeners
    setupSettingsEventListeners();
  });
}

function setupSettingsEventListeners() {
  const likeRatioSlider = document.getElementById('like-ratio');
  const likeRatioValue = document.getElementById('like-ratio-value');
  if (likeRatioSlider) {
    likeRatioSlider.addEventListener('input', (e) => {
      likeRatioValue.textContent = e.target.value + '%';
    });
  }

  // Language selection event handlers
  const languageCheckboxes = document.querySelectorAll('.language-checkbox');
  const selectedCountSpan = document.getElementById('selected-count');
  
  languageCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const selectedLanguages = Array.from(document.querySelectorAll('.language-checkbox:checked')).map(cb => cb.value);
      if (selectedCountSpan) {
        selectedCountSpan.textContent = selectedLanguages.length;
      }
    });
  });

  // Select All Languages
  const selectAllBtn = document.getElementById('select-all-languages');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      languageCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
      });
      if (selectedCountSpan) {
        selectedCountSpan.textContent = languageCheckboxes.length;
      }
    });
  }

  // Deselect All Languages
  const deselectAllBtn = document.getElementById('deselect-all-languages');
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', () => {
      languageCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
      });
      if (selectedCountSpan) {
        selectedCountSpan.textContent = '0';
      }
    });
  }

  // Reset to Default Languages
  const resetLanguagesBtn = document.getElementById('reset-languages');
  if (resetLanguagesBtn) {
    resetLanguagesBtn.addEventListener('click', () => {
      languageCheckboxes.forEach(checkbox => {
        checkbox.checked = DEFAULT_SELECTED_LANGUAGES.includes(checkbox.value);
      });
      if (selectedCountSpan) {
        selectedCountSpan.textContent = DEFAULT_SELECTED_LANGUAGES.length;
      }
    });
  }

  const saveApiBtn = document.getElementById('save-api-keys-btn');
  if (saveApiBtn) {
    saveApiBtn.addEventListener('click', () => {
      const geminiKey = document.getElementById('gemini-free-api-key').value.trim();
      const statusEl = document.getElementById('api-key-status');
      
      if (geminiKey) {
        chrome.storage.local.set({ geminiFreeApiKey: geminiKey }, () => {
          console.log('[Tinder AI] Gemini API Key saved.');
          statusEl.textContent = 'Gemini API Key saved successfully!';
          statusEl.style.color = '#48bb78';
          setTimeout(() => { statusEl.textContent = ''; }, 3000);
        });
      } else {
        chrome.storage.local.remove('geminiFreeApiKey', () => {
          console.log('[Tinder AI] Gemini API Key removed.');
          statusEl.textContent = 'Gemini API Key removed.';
          statusEl.style.color = '#f59e0b';
          setTimeout(() => { statusEl.textContent = ''; }, 3000);
        });
      }
    });
  }

  const saveSettingsBtn = document.getElementById('save-settings');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const newFilterConfig = {
        likeRatio: parseInt(document.getElementById('like-ratio').value, 10) / 100,
        maxSwipes: parseInt(document.getElementById('max-swipes').value, 10),
      };

      // Get selected languages
      const selectedLanguages = Array.from(document.querySelectorAll('.language-checkbox:checked')).map(cb => cb.value);

      const newMessagingConfig = {
        tone: document.getElementById('message-tone').value,
        language: document.getElementById('message-language').value,
        autoSend: document.getElementById('auto-send').checked,
        autoMessageOnMatch: document.getElementById('auto-message-on-match').checked,
        selectedLanguages: selectedLanguages,
      };

      chrome.storage.local.set({
        filterConfig: newFilterConfig,
        messagingConfig: newMessagingConfig
      }, () => {
        console.log('[Tinder AI] Settings saved:', { newFilterConfig, newMessagingConfig });
        const statusEl = document.getElementById('settings-status');
        statusEl.textContent = 'Settings saved successfully!';
        statusEl.style.color = '#48bb78';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
      });
    });
  }
}

function renderSidebarAnalyticsTab(enabled) {
  const analyticsPanel = document.getElementById('sidebar-tab-analytics');
  if(!analyticsPanel) return;
  if (!chrome.runtime?.id) return;
  chrome.storage.local.get([
    'activeAI', 'allTimeAnalytics', 'aiPerformance', 'messagingStats',
    'geminiFreeApiKey', 'geminiProApiKey', 'openaiApiKey', 'deepseekApiKey', 'anthropicApiKey',
    'sessionAnalytics'
  ], (data) => {
    if (!chrome.runtime?.id) return;
    const { geminiFreeApiKey, geminiProApiKey, openaiApiKey, deepseekApiKey, anthropicApiKey } = data;
    let sessionAnalytics = data.sessionAnalytics || { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: getTodayDateString() };
    if (!sessionAnalytics.date || sessionAnalytics.date !== getTodayDateString()) {
      sessionAnalytics = { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: getTodayDateString() };
      chrome.storage.local.set({ sessionAnalytics });
    }
    const allTimeStats = { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, ...data.allTimeAnalytics };
    const aiStats = AI_INTEGRATION.performance;
    const messagingData = MESSAGING.messagingStats;
    const selectedAI = data.activeAI || 'gemini';
    let currentAIDisplay = 'Gemini';
    let apiKeyStatus = '🔴 No API Key';
    if (selectedAI === 'gemini' || selectedAI === 'gemini-pro') {
      currentAIDisplay = selectedAI === 'gemini-pro' ? 'Gemini Pro' : 'Gemini';
      apiKeyStatus = geminiFreeApiKey && geminiFreeApiKey.trim() !== '' ? '🟢 API Key Set' : '🔴 No API Key';
    } else if (selectedAI === 'chatgpt') {
      currentAIDisplay = 'ChatGPT';
      apiKeyStatus = openaiApiKey && openaiApiKey.trim() !== '' ? '🟢 API Key Set' : '🔴 No API Key';
    } else if (selectedAI === 'deepseek') {
      currentAIDisplay = 'DeepSeek';
      apiKeyStatus = deepseekApiKey && deepseekApiKey.trim() !== '' ? '🟢 API Key Set' : '🔴 No API Key';
    } else if (selectedAI === 'claude') {
      currentAIDisplay = 'Claude';
      apiKeyStatus = anthropicApiKey && anthropicApiKey.trim() !== '' ? '🟢 API Key Set' : '🔴 No API Key';
    }
    analyticsPanel.innerHTML = `
      <div class="sidebar-box">
        <div class="sidebar-box-header">🏆 All-Time Statistics</div>
        <div class="sidebar-box-body">
          <div>Total Swipes: ${allTimeStats.swipes}</div>
          <div>Total Likes: ${allTimeStats.likes}</div>
          <div>Total Nopes: ${allTimeStats.nopes}</div>
          <div>Total Matches: ${allTimeStats.matches}</div>
          <div>Total Messages: ${allTimeStats.messages}</div>
          <div>Overall Like Ratio: ${allTimeStats.swipes > 0 ? ((allTimeStats.likes / allTimeStats.swipes) * 100).toFixed(1) : '0.0'}%</div>
          <div>Overall Match Rate: ${allTimeStats.likes > 0 ? ((allTimeStats.matches / allTimeStats.likes) * 100).toFixed(1) : '0.0'}%</div>
          <div>Efficiency Score: ${calculateEfficiencyScore(allTimeStats)}</div>
        </div>
      </div>
      <div class="sidebar-box">
        <div class="sidebar-box-header"><span class="sidebar-ai-icon" aria-label="AI">🤖</span> AI Performance</div>
        <div class="sidebar-box-body">
          <div>Success Rate: ${aiStats.responses ? ((aiStats.success / aiStats.responses) * 100).toFixed(1) : '0.0'}%</div>
          <div>Total Responses: ${aiStats.responses || 0}</div>
          <div>Successful: ${aiStats.success || 0}</div>
          <div>Failed: ${aiStats.responses ? aiStats.responses - aiStats.success : 0}</div>
          <div>Avg Rating: ${aiStats.avgRating?.toFixed(1) || '0.0'}/10</div>
          <div>Rate Limited: ${AI_INTEGRATION.rateLimits.gemini.count}</div>
        </div>
      </div>
      <div class="sidebar-box">
        <div class="sidebar-box-header">⚡ Performance Metrics</div>
        <div class="sidebar-box-body">
          <div>Stealth Mode: ${ANTI_DETECTION.stealthMode ? 'Active' : 'Inactive'}</div>
          <div>Failure Count: <span class="${ANTI_DETECTION.failureCount > 3 ? 'failure-count-high' : 'failure-count-low'}">${ANTI_DETECTION.failureCount}</span></div>
          <div>Swipe Speed: ${SWIPE_DELAY_RANGE[0]}-${SWIPE_DELAY_RANGE[1]}ms</div>
          <div>Session Active: ${sessionActive ? 'Yes' : 'No'}</div>
          <div>Current AI: ${currentAIDisplay}</div>
          <div>API Key Status: ${apiKeyStatus}</div>
        </div>
      </div>
    `;
    analyticsPanel.style.opacity = enabled ? '1' : '0.5';
    setupAnalyticsEventListeners();
  });
}

// Helper functions for analytics
function calculateEfficiencyScore(stats) {
  if (stats.swipes === 0) return '0.0';
  const likeRatio = stats.likes / stats.swipes;
  const matchRate = stats.matches / Math.max(stats.likes, 1);
  const messageRate = stats.messages / Math.max(stats.matches, 1);
  
  const score = (likeRatio * 0.4 + matchRate * 0.4 + messageRate * 0.2) * 100;
  return Math.min(score, 100).toFixed(1);
}

function formatResponseTime(ms) {
  if (!ms || ms === 0) return 'N/A';
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

function setupAnalyticsEventListeners() {
  // Reset session stats
  const resetSessionBtn = document.getElementById('reset-session-stats');
  if (resetSessionBtn) {
    resetSessionBtn.addEventListener('click', () => {
      chrome.storage.local.set({ sessionAnalytics: { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: getTodayDateString() } }, () => {
        console.log('[Tinder AI] Session stats reset');
        renderSidebarAnalyticsTab(sidebarConsentGiven);
        renderSidebarStatusTab(sidebarConsentGiven);
      });
    });
  }

  // Reset AI stats
  const resetAIBtn = document.getElementById('reset-ai-stats');
  if (resetAIBtn) {
    resetAIBtn.addEventListener('click', () => {
      AI_INTEGRATION.performance = { gemini: { responses: 0, success: 0, avgRating: 0 } };
      chrome.storage.local.set({ aiPerformance: AI_INTEGRATION.performance }, () => {
        console.log('[Tinder AI] AI stats reset');
        renderSidebarAnalyticsTab(sidebarConsentGiven);
      });
    });
  }

  // Export data
  const exportBtn = document.getElementById('export-session-data');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      chrome.storage.local.get(['allTimeAnalytics', 'sessionAnalytics', 'aiPerformance', 'messagingStats'], (data) => {
        const exportData = {
          timestamp: new Date().toISOString(),
          allTimeAnalytics: data.allTimeAnalytics || {},
          sessionAnalytics: data.sessionAnalytics || {},
          aiPerformance: data.aiPerformance || {},
          messagingStats: data.messagingStats || {},
          currentSettings: {
            swipeConfig: { likeRatio: currentFilters.likeRatio, maxSwipes: MAX_SESSION_SWIPES },
            stealthMode: ANTI_DETECTION.stealthMode,
            currentAI: AI_INTEGRATION.currentAI
          }
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tinder-ai-analytics-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });
  }
}

function renderSidebarAntiDetectionTab(enabled) {
  const antiDetectionPanel = document.getElementById('sidebar-tab-antidetection');
  if(!antiDetectionPanel) return;
  
  requestAnimationFrame(() => {
    const log = ANTI_DETECTION.getDiagnosticLog();
    const stealthEnabled = ANTI_DETECTION.stealthMode;
    
  antiDetectionPanel.innerHTML = `
    <div class="analytics-section">
      <div class="analytics-header">Anti-Detection</div>
      <div class="settings-row">
        <label for="stealth-mode" class="settings-label">Stealth Mode:</label>
        <input type="checkbox" id="stealth-mode" ${stealthEnabled ? 'checked' : ''} ${!enabled ? 'disabled' : ''} />
      </div>
      <div class="analytics-header mt-4">Diagnostic Log</div>
      <div class="diagnostic-log">
          ${log.map(event => `
            <div class="diagnostic-log-entry">
              <span class="diagnostic-log-time">${new Date(event.timestamp).toLocaleTimeString()}:</span> 
              ${event.message}
              ${event.stealthMode ? ' (Stealth Mode)' : ''}
            </div>
          `).join('')}
      </div>
    </div>`;
      
  if (enabled) {
      const stealthCheckbox = document.getElementById('stealth-mode');
      if (stealthCheckbox) {
        stealthCheckbox.addEventListener('change', (e) => {
          ANTI_DETECTION.toggleStealthMode(e.target.checked);
        });
      }
    }
  });
}

// Helper to update all-time analytics in storage
async function updateAllTimeAnalytics(delta) {
    const data = await chrome.storage.local.get(['allTimeAnalytics', 'sessionAnalytics']);
    if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
    }
    const allTimeAnalytics = data.allTimeAnalytics || {};
    const newAllTimeTotal = { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, ...allTimeAnalytics };
    for (const k in delta) {
        newAllTimeTotal[k] = (newAllTimeTotal[k] || 0) + (delta[k] || 0);
    }
    let sessionAnalytics = data.sessionAnalytics || { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: getTodayDateString() };
    if (!sessionAnalytics.date || sessionAnalytics.date !== getTodayDateString()) {
      sessionAnalytics = { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: getTodayDateString() };
    }
    const newSessionTotal = { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, ...sessionAnalytics };
    for (const k in delta) {
        newSessionTotal[k] = (newSessionTotal[k] || 0) + (delta[k] || 0);
    }
    newSessionTotal.date = getTodayDateString();
    await chrome.storage.local.set({ 
        allTimeAnalytics: newAllTimeTotal,
        sessionAnalytics: newSessionTotal
    });
    if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
    }
}

// --- SIDEBAR CODE ---
function setupSidebarTabs() {
  const sidebar = document.getElementById('tinder-ai-sidebar');
  if (!sidebar) return;
  const tabBtns = sidebar.querySelectorAll('.sidebar-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sidebarActiveTab = btn.getAttribute('data-tab');
      const tabPanels = sidebar.querySelectorAll('.sidebar-tab-panel');
      tabPanels.forEach(panel => {
        panel.style.display = (panel.id === `sidebar-tab-${sidebarActiveTab}`) ? 'block' : 'none';
      });
      renderSidebarActiveTab();
    });
  });
}

function injectSidebar() {
  console.log('[Tinder AI] injectSidebar called');
  
  // Remove any existing sidebar and styles to prevent duplicates
  const existingSidebar = document.getElementById('tinder-ai-sidebar');
  if (existingSidebar) {
    console.log('[Tinder AI] Removing existing sidebar');
    existingSidebar.remove();
  }

  // Inject shared popup/styles.css if not already present
  if (!document.getElementById('tinder-ai-shared-css')) {
    console.log('[Tinder AI] Injecting CSS stylesheet');
    const link = document.createElement('link');
    link.id = 'tinder-ai-shared-css';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('popup/styles.css'); // UPDATED to styles.css
    document.head.appendChild(link);
    console.log('[Tinder AI] CSS stylesheet injected:', link.href);
    
    // Add event listener to check if CSS loaded
    link.onload = () => {
      console.log('[Tinder AI] ✅ CSS stylesheet loaded successfully');
      // Test if dark mode styles are available
      setTimeout(() => {
        const testElement = document.createElement('div');
        testElement.style.position = 'absolute';
        testElement.style.left = '-9999px';
        testElement.id = 'tinder-ai-css-test';
        document.body.appendChild(testElement);
        
        // Check if our CSS variables are available
        const computedStyle = window.getComputedStyle(testElement);
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary');
        console.log('[Tinder AI] CSS test - Primary color variable:', primaryColor);
        
        testElement.remove();
      }, 100);
    };
    
    link.onerror = () => {
      console.error('[Tinder AI] ❌ Failed to load CSS stylesheet');
    };
  } else {
    console.log('[Tinder AI] CSS stylesheet already present');
  }

  // Create sidebar element
  const sidebar = document.createElement('div');
  sidebar.id = 'tinder-ai-sidebar';
  
  // Add debugging class to make it easier to find
  sidebar.className = 'tinder-ai-sidebar-debug';
  // Start visible (no hidden class)

  // Set sidebar HTML using shared classes
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-ai-title">
        <span class="sidebar-ai-icon" aria-label="AI">🤖</span>
        <h1 class="text-lg font-semibold">SpicySwipe</h1>
      </div>
      <button id="theme-toggle" class="text-muted" title="Toggle theme">🌙</button>
    </div>
    <div class="sidebar-tab-bar">
      <button class="sidebar-tab-btn active" data-tab="status">Status</button>
      <button class="sidebar-tab-btn" data-tab="ai">AI</button>
      <button class="sidebar-tab-btn" data-tab="swiping">Swiping</button>
      <button class="sidebar-tab-btn" data-tab="analytics">Analytics</button>
    </div>
    <div class="sidebar-content">
      <div id="sidebar-tab-status" class="sidebar-tab-panel active"></div>
      <div id="sidebar-tab-ai" class="sidebar-tab-panel"></div>
      <div id="sidebar-tab-swiping" class="sidebar-tab-panel"></div>
      <div id="sidebar-tab-analytics" class="sidebar-tab-panel"></div>
    </div>
  `;

  // Add sidebar to body
  document.body.appendChild(sidebar);
  console.log('[Tinder AI] Sidebar added to DOM. Element:', sidebar);
  
  // Debug: Check if sidebar is visible
  setTimeout(() => {
    const computedStyle = window.getComputedStyle(sidebar);
    console.log('[Tinder AI] Sidebar computed styles:', {
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      transform: computedStyle.transform,
      position: computedStyle.position,
      zIndex: computedStyle.zIndex,
      right: computedStyle.right,
      top: computedStyle.top,
      width: computedStyle.width,
      height: computedStyle.height,
      background: computedStyle.background
    });
    
    // Check if sidebar is actually in the DOM and visible
    const sidebarInDOM = document.getElementById('tinder-ai-sidebar');
    if (sidebarInDOM) {
      console.log('[Tinder AI] ✅ Sidebar found in DOM');
      const rect = sidebarInDOM.getBoundingClientRect();
      console.log('[Tinder AI] Sidebar bounding rect:', rect);
      if (rect.width > 0 && rect.height > 0) {
        console.log('[Tinder AI] ✅ Sidebar has dimensions - should be visible');
      } else {
        console.log('[Tinder AI] ❌ Sidebar has no dimensions - may be hidden');
      }
    } else {
      console.log('[Tinder AI] ❌ Sidebar not found in DOM');
    }
  }, 100);

  // Add toggle button
  const oldToggle = document.querySelector('.tinder-ai-sidebar-toggle');
  if (oldToggle) oldToggle.remove();
  const toggleBtn = document.createElement('div');
  toggleBtn.className = 'tinder-ai-sidebar-toggle';
  toggleBtn.innerHTML = '<span id="tinder-ai-sidebar-arrow">◀</span>';
  document.body.appendChild(toggleBtn);
  console.log('[Tinder AI] Toggle button added to DOM');

  // Setup toggle functionality
  let hidden = false;
  const toggleHandler = () => {
    hidden = !hidden;
    sidebar.classList.toggle('hidden', hidden);
    // Don't hide the toggle button - it should always be visible
    toggleBtn.querySelector('#tinder-ai-sidebar-arrow').textContent = hidden ? '▶' : '◀';
    console.log('[Tinder AI] Sidebar toggled. Hidden:', hidden);
  };
  toggleBtn.addEventListener('click', toggleHandler);

  // Setup tab navigation
  const tabBtns = sidebar.querySelectorAll('.sidebar-tab-btn');
  const tabPanels = sidebar.querySelectorAll('.sidebar-tab-panel');
  const tabClickHandler = (btn) => {
    return () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(`sidebar-tab-${tabId}`).classList.add('active');
    };
  };
  tabBtns.forEach(btn => {
    btn.addEventListener('click', tabClickHandler(btn));
  });

  // Initialize tabs
  setupSidebarTabs();
  renderSidebarActiveTab();
  
  console.log('[Tinder AI] Sidebar injection complete. Check for red border to confirm visibility.');

  // Add theme toggle logic after rendering
  setTimeout(() => {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.onclick = () => {
        console.log('[Tinder AI] Theme toggle clicked');
        console.log('[Tinder AI] Before toggle - dark class:', document.documentElement.classList.contains('dark'));
        document.documentElement.classList.toggle('dark');
        console.log('[Tinder AI] After toggle - dark class:', document.documentElement.classList.contains('dark'));
        themeToggle.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
        console.log('[Tinder AI] Theme toggle text updated to:', themeToggle.textContent);
        
        // Test if dark mode styles are being applied
        setTimeout(() => {
          const sidebar = document.getElementById('tinder-ai-sidebar');
          if (sidebar) {
            const computedStyle = window.getComputedStyle(sidebar);
            console.log('[Tinder AI] Dark mode test - Sidebar background:', computedStyle.background);
            console.log('[Tinder AI] Dark mode test - Sidebar color:', computedStyle.color);
            
            // Check if the debug indicator is visible
            const beforePseudo = window.getComputedStyle(sidebar, '::before');
            console.log('[Tinder AI] Dark mode test - Before pseudo content:', beforePseudo.content);
          }
        }, 50);
      };
    } else {
      console.error('[Tinder AI] Theme toggle button not found');
    }
  }, 0);

  // --- In injectSidebar ---
  // After renderSidebarActiveTab();
  createPersistentAIIcon();
}

// --- Initialization ---
// Inject sidebar on Tinder.com
if (window.location.hostname.includes('tinder.com')) {
  console.log('[Tinder AI] Tinder.com detected, setting up sidebar...');
  // Use a small delay to ensure the body is ready
  setTimeout(() => {
    console.log('[Tinder AI] Injecting sidebar...');
    injectSidebar();
    console.log('[Tinder AI] Sidebar injection complete');
    // Force Gemini as default AI if not set or invalid
    chrome.storage.local.get(['activeAI'], ({ activeAI }) => {
      if (!activeAI || !['gemini'].includes(activeAI)) {
        chrome.storage.local.set({ activeAI: 'gemini' });
        if (AI_INTEGRATION) AI_INTEGRATION.currentAI = 'gemini';
      }
    });
  }, 500);
} else {
  console.log('[Tinder AI] Not on Tinder.com, skipping sidebar injection');
}

// Load initial settings
chrome.storage.local.get(['swipeConfig', 'swipeSpeedMin', 'swipeSpeedMax'], (settings) => {
    currentFilters.likeRatio = settings.swipeConfig?.likeRatio || 0.7;
    MAX_SESSION_SWIPES = settings.swipeConfig?.maxSwipes || 30;
  SWIPE_DELAY_RANGE[0] = settings.swipeSpeedMin || 2000;
  SWIPE_DELAY_RANGE[1] = settings.swipeSpeedMax || 4000;
});

// Update settings and apply them
async function updateSettings(newSettings) {
  // Update global variables
  currentFilters.likeRatio = newSettings.swipeConfig.likeRatio;
  MAX_SESSION_SWIPES = newSettings.swipeConfig.maxSwipes;
  SWIPE_DELAY_RANGE = [newSettings.swipeSpeedMin, newSettings.swipeSpeedMax];
  
  // Update AI settings
  if (newSettings.activeAI !== AI_INTEGRATION.currentAI) {
    AI_INTEGRATION.currentAI = newSettings.activeAI;
    await AI_INTEGRATION.checkAILoginStatus();
  }
  
  // Save to storage
  await chrome.storage.local.set({
    activeAI: newSettings.activeAI,
    swipeConfig: newSettings.swipeConfig,
    swipeSpeedMin: newSettings.swipeSpeedMin,
    swipeSpeedMax: newSettings.swipeSpeedMax
  });
  
  // Update UI
  renderSidebarStatusTab(sidebarConsentGiven);
  
  // Log the update
  ANTI_DETECTION.addDiagnosticLog(`Settings updated: Like ratio ${newSettings.swipeConfig.likeRatio}, Max swipes ${newSettings.swipeConfig.maxSwipes}, Speed ${newSettings.swipeSpeedMin}-${newSettings.swipeSpeedMax}ms, AI: ${newSettings.activeAI}`);
}

// --- Messaging Automation ---
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

    // Correct Unicode script detection\// Arabic
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
          renderSidebarStatusTab(sidebarConsentGiven);
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
    if (await AI_INTEGRATION.checkRateLimit()) {
      console.log('[Tinder AI][DEBUG] generateAIResponse: Rate limit hit, returning null');
      return null;
    }

    // Clear all cached responses to ensure fresh responses
    await AI_INTEGRATION.clearAllCachedResponses();
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

    // Get AI response
    let response;
    try {
      response = await this.getAIResponse(prompt);
      console.log('[Tinder AI][DEBUG] generateAIResponse: Got response:', response);
      
      if (response) {
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

  async getAIResponse(prompt) {
    try {
      console.log('[Tinder AI][DEBUG] getAIResponse: Calling AI_INTEGRATION.getResponse with prompt:', prompt);
      const response = await getAIResponse(prompt);
      console.log('[Tinder AI][DEBUG] getAIResponse: Got response:', response);
      if (response && response.response) {
        console.log('[Tinder AI][DEBUG] getAIResponse: Returning response:', response.response.substring(0, 50) + '...');
        return response.response;
      } else if (typeof response === 'string') {
        return response;
      } else {
        console.log('[Tinder AI][DEBUG] getAIResponse: No valid response received');
        return null;
      }
    } catch (error) {
      console.error('[Tinder AI][DEBUG] getAIResponse: Error:', error);
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
        await ANTI_DETECTION.simulateHumanBehavior(sendBtn, 'click');
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
    renderSidebarStatusTab(sidebarConsentGiven);
  },

  // Cancel pending message
  cancelPendingMessage() {
    console.log('[Tinder AI][DEBUG] cancelPendingMessage called');
    this.pendingApproval = null;
    this.processingBlocked = true; // Block further processing
    renderSidebarStatusTab(sidebarConsentGiven);
  },

  // Cancel all pending messages
  async cancelAllPendingMessages() {
    console.log('[Tinder AI][DEBUG] cancelAllPendingMessages called. Queue length before:', this.messageQueue.length);
    this.messageQueue = [];
    this.pendingApproval = null;
    this.processingBlocked = true; // Block further processing
    await this.saveMessageQueue();
    console.log('[Tinder AI][DEBUG] cancelAllPendingMessages completed. Queue length after:', this.messageQueue.length);
    renderSidebarStatusTab(sidebarConsentGiven);
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
        if (currentTab === 'analytics') {
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

// Setup manual message tracking for AI-generated messages
setupManualMessageTracking();

// --- Magic Wand Button for AI Reply on Any Conversation ---

// Function to create persistent AI icon that's always visible
function createPersistentAIIcon() {
  // Remove any existing persistent AI icon
  const existingIcon = document.getElementById('ai-persistent-icon');
  if (existingIcon) {
    existingIcon.remove();
  }

  const persistentIcon = document.createElement('div');
  persistentIcon.id = 'ai-persistent-icon';
  persistentIcon.className = 'persistent-ai-icon';

  // Responsive position: add 'sidebar-open' class if sidebar is open
  const sidebar = document.getElementById('tinder-ai-sidebar');
  if (sidebar && sidebar.style.transform !== 'translateX(100%)') {
    persistentIcon.classList.add('sidebar-open');
  }

  persistentIcon.innerHTML = `
    <span>🤖</span>
  `;
  persistentIcon.title = 'Generate AI Message';
  
  // Add hover effects
  persistentIcon.addEventListener('mouseenter', () => {
    persistentIcon.classList.add('ai-persistent-icon-hover');
  });
  
  persistentIcon.addEventListener('mouseleave', () => {
    persistentIcon.classList.remove('ai-persistent-icon-hover');
  });
  
  // Add click handler to generate AI message
  persistentIcon.addEventListener('click', async () => {
    // Check if extension context is valid before proceeding
    if (!chrome.runtime?.id) {
      showErrorNotification('Extension context lost. Please refresh the page and try again.');
      return;
    }

    // Check if we're in a conversation with a message window open
    const messageTextarea = document.querySelector('textarea[placeholder*="message"], textarea[placeholder*="Type"]');
    if (!messageTextarea) {
      // No message window open - show user feedback
      persistentIcon.innerHTML = '<span class="sidebar-persistent-icon-emoji">⚠️</span>';
      persistentIcon.title = 'Open a conversation to use AI messaging';
      
      showErrorNotification('Please open a conversation to use AI messaging');
      
      // Revert icon after 3 seconds
      setTimeout(() => {
        persistentIcon.innerHTML = '<span class="sidebar-persistent-icon-emoji">🤖</span>';
        persistentIcon.title = 'Generate AI Message';
      }, 3000);
      
      return;
    }
    
    // Message window is open - proceed with AI generation
    persistentIcon.innerHTML = '<span class="sidebar-persistent-icon-emoji">🔄</span>';
    persistentIcon.style.pointerEvents = 'none';
    
    try {
      console.log('[Tinder AI] Generating AI message for current conversation...');
      
      // Extract profile info from current chat without clicking on match items
      const profileInfo = await extractProfileInfoFromCurrentChat();
      if (!profileInfo) {
        throw new Error('Could not extract profile info from current conversation');
      }
      
      // Wait for chat messages to load
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const chatHistory = extractChatHistory();
      const newMessage = await generatePersonalizedMessage(profileInfo, chatHistory);
      if (newMessage) {
        await displayMessageForApproval(newMessage, profileInfo, chatHistory);
      } else {
        throw new Error('Failed to generate message');
      }
    } catch (error) {
      console.error('[Tinder AI] Error generating AI message:', error);
      persistentIcon.innerHTML = '<span class="sidebar-persistent-icon-emoji">❌</span>';
      persistentIcon.title = 'Error generating message';
      
      // Show specific error message based on error type
      if (error.message.includes('Extension context invalidated')) {
        showErrorNotification('Extension context lost. Please refresh the page and try again.');
      } else if (error.message.includes('Could not extract profile info')) {
        showErrorNotification('Could not extract profile information. Please try again.');
      } else if (error.message.includes('Failed to generate message')) {
        showErrorNotification('Failed to generate message. Please check your API settings.');
      } else {
        showErrorNotification('An error occurred while generating the message. Please try again.');
      }
      
      // Revert icon after 3 seconds
      setTimeout(() => {
        persistentIcon.innerHTML = '<span class="sidebar-persistent-icon-emoji">🤖</span>';
        persistentIcon.title = 'Generate AI Message';
        persistentIcon.style.pointerEvents = 'auto';
      }, 3000);
    }
  });
  
  document.body.appendChild(persistentIcon);

  // Responsive: update icon position when sidebar is toggled
  const toggleBtn = document.querySelector('.tinder-ai-sidebar-toggle');
  if (sidebar && toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      setTimeout(() => {
        if (sidebar.classList.contains('hidden') || sidebar.style.transform === 'translateX(100%)') {
          persistentIcon.classList.remove('sidebar-open');
        } else {
          persistentIcon.classList.add('sidebar-open');
        }
      }, 300);
    });
  }
}

function injectWandButtons(matches) {
  matches.forEach(matchItem => {
    // Check if a wand button container already exists
    if (matchItem.querySelector('.wand-button-container')) {
      return; // Skip if wand is already injected
    }
    matchItem.classList.add('wand-injected'); // Mark as processed

    const container = document.createElement('div');
    container.className = 'wand-button-container';
    container.style.position = 'absolute';
    container.style.top = '10px';
    container.style.right = '10px';
    container.style.zIndex = '1000';
    container.style.display = 'flex';
    container.style.gap = '5px';

    const wandButton = document.createElement('button');
    wandButton.innerHTML = '✨'; // Wand emoji
    wandButton.className = 'wand-button';
    wandButton.title = 'Generate Personalized Message';
    wandButton.onclick = async (e) => {
      e.stopPropagation();
      e.preventDefault();

      console.log('[Tinder AI] Wand button clicked, starting AI message generation...');
      wandButton.innerHTML = '🔄'; // Loading spinner
      wandButton.disabled = true;

      try {
        // Check if extension context is valid before proceeding
        if (!chrome.runtime?.id) {
          throw new Error('Extension context invalidated. Please refresh the page.');
        }

        console.log('[Tinder AI] Step 1: Extracting profile info...');
        const profileInfo = await waitForContactTabAndExtractInfo(matchItem);
        console.log('[Tinder AI] Profile info extracted:', profileInfo);
        
        if (profileInfo && (profileInfo.name || profileInfo.bio)) {
          // Added a 1.5-second delay to ensure chat messages are fully rendered.
          console.log('[Tinder AI] Profile info extracted. Waiting 1.5s for chat messages to render...');
          await new Promise(resolve => setTimeout(resolve, 1500));

          console.log('[Tinder AI] Step 2: Extracting chat history...');
          const chatHistory = extractChatHistory();
          console.log('[Tinder AI] Chat history extracted:', chatHistory);

          console.log('[Tinder AI] Step 3: Generating personalized message...');
          const message = await generatePersonalizedMessage(profileInfo, chatHistory);
          console.log('[Tinder AI] Generated message:', message);
          
          if (message) {
            console.log('[Tinder AI] Step 4: Displaying message for approval...');
            await displayMessageForApproval(message, profileInfo, chatHistory);
            console.log('[Tinder AI] Message displayed for approval successfully');
          } else {
            console.error('[Tinder AI] Failed to generate message');
            wandButton.innerHTML = '❌'; // Error
            // Show error notification
            showErrorNotification('Failed to generate message. Please try again.');
          }
        } else {
          console.error('[Tinder AI] Failed to extract profile info or profile is empty:', profileInfo);
          wandButton.innerHTML = '❌'; // Error
          showErrorNotification('Could not extract profile information. Please try again.');
        }
      } catch (error) {
        console.error('[Tinder AI] Error in wand button flow:', error);
        wandButton.innerHTML = '❌';
        
        // Show specific error message based on error type
        if (error.message.includes('Extension context invalidated')) {
          showErrorNotification('Extension context lost. Please refresh the page and try again.');
        } else if (error.message.includes('Failed to generate message')) {
          showErrorNotification('Failed to generate message. Please check your API settings.');
        } else {
          showErrorNotification('An error occurred. Please try again.');
        }
      } finally {
        // Revert button after a delay
        setTimeout(() => {
          wandButton.innerHTML = '✨';
          wandButton.disabled = false;
        }, 3000);
      }
    };

    container.appendChild(wandButton);
    matchItem.style.position = 'relative'; // Ensure the container is positioned correctly
    matchItem.appendChild(container);
  });
}

// This was the old, inefficient observer. It's now replaced by the centralized one.
// function observeMatchListForWands() { ... }

/**
 * Clicks the match item, waits for the contact tab/chat window to appear,
 * and extracts the profile info.
 */

// The following block was misplaced inside a comment. It is now active.
(async () => {
  console.log('[Tinder AI] Content script loaded, initializing...');
  
  // Check if extension context is valid
  if (!chrome.runtime?.id) {
    console.error('[Tinder AI] Extension context invalidated during initialization');
    showErrorNotification('Extension context lost. Please refresh the page and reload the extension.');
    return;
  }
  
  // Wait for the main app element to be available
  const appRoot = await waitForElement('body');
  if (!appRoot) {
    console.error('[Tinder AI] Could not find app root. Aborting.');
      return;
    }
    
  // Load consent from storage before initializing sidebar
  const consentData = await new Promise(resolve => chrome.storage.local.get('sidebarConsentGiven', resolve));
  sidebarConsentGiven = !!consentData.sidebarConsentGiven;
    
  injectSidebar();
  setupSidebarTabs();
  // setupSidebarConsent(); // Remove this line - consent is handled in sidebar setup

  // Initialize modules
  await ANTI_DETECTION.init();
  await AI_INTEGRATION.init();
  await MESSAGING.init();

  // Create persistent AI icon during initialization
  if (sidebarConsentGiven) {
    console.log('[Tinder AI][DEBUG] Calling createPersistentAIIcon() during initialization (consent given)');
  createPersistentAIIcon();
  } else {
    console.log('[Tinder AI][DEBUG] Consent not given, AI icon not shown');
  }

  // --- Centralized DOM Mutation Handler ---
  // To avoid performance crashes from multiple, aggressive MutationObservers,
  // we use a single, debounced observer to handle all DOM-related tasks.
  let domChangeTimeout;

  const handleDomChanges = () => {
    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      console.warn('[Tinder AI] Extension context invalidated, stopping DOM observer');
      observer.disconnect();
      return;
    }

    console.log('[Tinder AI] DOM change detected on path:', window.location.pathname);

    // --- New Debugging Log ---
    const allMatchesOnPage = document.querySelectorAll(window.SELECTORS.matchListItemSelector);
    console.log(`[Tinder AI] Debug: Found ${allMatchesOnPage.length} elements matching the match list item selector on this page.`);

    // --- Task 1: Inject Wand Buttons in Match List ---
    // Check for matches that don't have wand buttons (either new or lost them)
    const matchesWithoutWands = document.querySelectorAll(window.SELECTORS.matchListItemSelector + ':not(.wand-injected)');
    if (matchesWithoutWands.length > 0) {
      if (sidebarConsentGiven) {
        console.log(`[Tinder AI][DEBUG] Injecting wand buttons on ${matchesWithoutWands.length} matches (consent given).`);
        injectWandButtons(matchesWithoutWands);
      } else {
        console.log('[Tinder AI][DEBUG] Consent not given, wand buttons not injected');
      }
    }
    
    // --- Task 2: Re-inject wand buttons for matches that lost them ---
    // This handles cases where wand buttons disappear after conversation switches
    const matchesWithWands = document.querySelectorAll(window.SELECTORS.matchListItemSelector + '.wand-injected');
    const missingWandButtons = Array.from(matchesWithWands).filter(match => 
      !match.querySelector('.tinder-ai-wand-button')
    );
    
    if (missingWandButtons.length > 0 && sidebarConsentGiven) {
      console.log(`[Tinder AI][DEBUG] Re-injecting wand buttons on ${missingWandButtons.length} matches that lost their buttons.`);
      // Remove the wand-injected class so they can be re-injected
      missingWandButtons.forEach(match => match.classList.remove('wand-injected'));
      injectWandButtons(missingWandButtons);
    }
    
    // --- Task 3: Check for New Matches for Auto-Messaging ---
    if (typeof MESSAGING !== 'undefined' && MESSAGING) {
        MESSAGING.checkNewMatches();
    }
  };

  const observer = new MutationObserver(() => {
    clearTimeout(domChangeTimeout);
    domChangeTimeout = setTimeout(handleDomChanges, 500); // Debounce changes for 500ms
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('[Tinder AI] Initialization complete. Central DOM observer is active.');
  
  // Set up periodic context validation
  const contextCheckInterval = setInterval(() => {
    if (!chrome.runtime?.id) {
      console.warn('[Tinder AI] Extension context lost during periodic check');
      showErrorNotification('Extension context lost. Please refresh the page.');
      // Stop the interval
      clearInterval(contextCheckInterval);
    }
  }, 30000); // Check every 30 seconds
})();


// Inject message into textarea and optionally send
async function injectMessageAndSend(message) {
  try {
    // Find the message textarea - try multiple selectors
    let textarea = document.querySelector('#u-326398519, textarea[placeholder*="message"], textarea[placeholder*="Type"], textarea[placeholder*="Type a message"]');
    
    if (!textarea) {
      // Try alternative selectors
      textarea = document.querySelector('textarea[class*="Rsz(n)"], textarea[class*="Fx($flx1)"]');
    }
    
    if (!textarea) {
      console.error('[Tinder AI] Message textarea not found');
      return false;
    }

    console.log('[Tinder AI] Found textarea, injecting message:', message);

    // Focus the textarea
    textarea.focus();
    
    // Clear any existing text
    textarea.value = '';
    
    // Set the new message
    textarea.value = message;
    
    // Trigger input event to update the UI
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));

    // Check if auto-send is enabled
    const { messagingConfig } = await new Promise(resolve => chrome.storage.local.get('messagingConfig', resolve));
    const config = messagingConfig || { autoSend: false };

    if (config.autoSend) {
      console.log('[Tinder AI] Auto-send enabled, sending message...');
      
      // Wait a moment for the textarea to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find the send button - try multiple selectors
      let sendButton = document.querySelector('button[type="submit"]:not([disabled]), button[aria-label*="Send"]:not([disabled])');
      
      if (!sendButton) {
        // Try alternative selectors based on the HTML structure
        sendButton = document.querySelector('button[class*="button"]:not([disabled]), button[type="submit"]:not([disabled])');
      }
      
      if (!sendButton) {
        // Try finding by the specific class structure from the HTML
        sendButton = document.querySelector('button[class*="Lts($ls-s)"][class*="CenterAlign"]:not([disabled])');
      }
      
      if (sendButton && !sendButton.disabled && !sendButton.hasAttribute('aria-disabled')) {
        console.log('[Tinder AI] Found send button, clicking...');
        sendButton.click();
        console.log('[Tinder AI] Message sent automatically');
        
        // Note: Message tracking is now handled in the approval box "Use" button
        // to avoid double-counting when auto-send is enabled
        
        return true;
      } else {
        console.warn('[Tinder AI] Send button not found or disabled. Button state:', {
          found: !!sendButton,
          disabled: sendButton?.disabled,
          ariaDisabled: sendButton?.getAttribute('aria-disabled')
        });
        
        // Log all potential send buttons for debugging
        const allButtons = document.querySelectorAll('button');
        console.log('[Tinder AI] All buttons on page:', Array.from(allButtons).map(btn => ({
          text: btn.textContent?.trim(),
          type: btn.type,
          disabled: btn.disabled,
          ariaDisabled: btn.getAttribute('aria-disabled'),
          classes: btn.className
        })));
        
        return false;
      }
    } else {
      console.log('[Tinder AI] Auto-send disabled, message ready to send manually');
      return true;
    }

  } catch (error) {
    console.error('[Tinder AI] Error injecting message:', error);
    return false;
  }
} 

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
        const model = activeAI || 'gemini';
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
          console.log('[Tinder AI] Sending request to background script:', { type: 'getOpenAIAPIResponse', model: 'gpt-4o', messages });
          chrome.runtime.sendMessage({ type: 'getOpenAIAPIResponse', model: 'gpt-4o', messages }, response => {
            console.log('[Tinder AI] Received response from background script:', response);
            if (chrome.runtime.lastError) {
              if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                if (handleContextInvalidation()) {
                  resolve({ error: 'Extension context invalidated' });
                  return;
                }
                // Retry the request
                chrome.runtime.sendMessage({ type: 'getOpenAIAPIResponse', model: 'gpt-4o', messages }, retryResponse => {
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
          chrome.runtime.sendMessage({ type: 'getAnthropicAPIResponse', model: 'claude-3-opus-20240229', messages }, response => {
            if (chrome.runtime.lastError) {
              if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                if (handleContextInvalidation()) {
                  resolve({ error: 'Extension context invalidated' });
                  return;
                }
                // Retry the request
                chrome.runtime.sendMessage({ type: 'getAnthropicAPIResponse', model: 'claude-3-opus-20240229', messages }, retryResponse => {
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

// Wait for contact tab to appear and extract detailed profile information
async function waitForContactTabAndExtractInfo(matchItem) {
  return new Promise((resolve) => {
    console.log('[Tinder AI] Starting waitForContactTabAndExtractInfo...');
    console.log('[Tinder AI] Match item:', matchItem);
    
    // Click the match item to open the contact tab
    console.log('[Tinder AI] Clicking match item to open chat...');
    matchItem.click();
    
    let attempts = 0;
    const maxAttempts = 30; // 15 seconds max wait
    
    const interval = setInterval(() => {
      attempts++;
      console.log(`[Tinder AI] Attempt ${attempts}/${maxAttempts}: Looking for message textarea...`);
      
      // A reliable indicator of a loaded chat is the message text area.
      const messageTextarea = document.querySelector('textarea[placeholder*="message"], textarea[placeholder*="Type"]');
      
      if (messageTextarea) {
        clearInterval(interval);
        console.log('[Tinder AI] Chat window is open, extracting profile info...');
        console.log('[Tinder AI] Found message textarea:', messageTextarea);
        
        // The profile info is usually within the main content area when a chat is open.
        const chatContainer = document.querySelector('main[role="main"]');
        console.log('[Tinder AI] Chat container found:', chatContainer);
        
        const profileInfo = extractDetailedProfileInfo(chatContainer || document.body);
        console.log('[Tinder AI] Profile extraction complete, resolving with:', profileInfo);
        resolve(profileInfo);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error('[Tinder AI] Chat textarea not found after 15 seconds.');
        console.error('[Tinder AI] Current page elements:', document.querySelectorAll('textarea'));
        resolve(null);
      } else {
        console.log(`[Tinder AI] No textarea found yet, continuing... (attempt ${attempts})`);
      }
    }, 500);
  });
}

function findElementByText(tag, text) {
    return Array.from(document.querySelectorAll(tag)).find(el => el.textContent.trim() === text);
}

// Extract detailed profile information from the contact tab
function extractDetailedProfileInfo(container) {
  console.log('[Tinder AI] Starting detailed profile extraction from container:', container);
  const profileInfo = {
    name: '',
    age: '',
    bio: '',
    interests: [],
    prompts: []
  };

  try {
    console.log('[Tinder AI] Step 1: Looking for name and age...');
    
    // 1. Extract Name and Age from H1 - try multiple selectors
    let nameH1 = container.querySelector('h1[class*="Typs(display-2-strong)"]');
    if (!nameH1) {
      nameH1 = container.querySelector('h1');
    }
    if (!nameH1) {
      nameH1 = container.querySelector('[class*="name"]');
    }
    
    if (nameH1) {
      console.log('[Tinder AI] Found name element:', nameH1.textContent);
      const nameSpan = nameH1.querySelector('span:first-child');
      const ageSpan = nameH1.querySelector('span:last-child');
      if (nameSpan) profileInfo.name = nameSpan.textContent.trim();
      if (ageSpan && ageSpan !== nameSpan) profileInfo.age = ageSpan.textContent.trim();
    } else {
      console.log('[Tinder AI] No name element found, trying alternative selectors...');
      // Try alternative name selectors
      const nameElements = container.querySelectorAll('[class*="name"], [class*="Name"], h1, h2');
      for (const el of nameElements) {
        const text = el.textContent.trim();
        if (text && text.length < 50 && !text.includes('About') && !text.includes('Interests')) {
          profileInfo.name = text;
          console.log('[Tinder AI] Found name via alternative selector:', text);
          break;
        }
      }
    }
    
    console.log('[Tinder AI] Step 2: Looking for bio...');
    
    const getSectionText = (headerText) => {
        const header = findElementByText('h2', headerText);
        if (header) {
            const section = header.closest('div[class*="P(24px)"]');
            if (section) {
                const content = section.cloneNode(true);
                const headerElement = content.querySelector('h2');
                if(headerElement) headerElement.remove();
                return content.textContent.trim();
            }
        }
        return null;
    };
    
    // 3. Extract Bio ("About me") - try multiple approaches
    profileInfo.bio = getSectionText('About me') || '';
    
    if (!profileInfo.bio) {
      console.log('[Tinder AI] No bio found via section text, trying alternative selectors...');
      // Try alternative bio selectors
      const bioElements = container.querySelectorAll('[class*="bio"], [class*="Bio"], [class*="about"], [class*="About"]');
      for (const el of bioElements) {
        const text = el.textContent.trim();
        if (text && text.length > 10 && text.length < 500) {
          profileInfo.bio = text;
          console.log('[Tinder AI] Found bio via alternative selector:', text.substring(0, 100) + '...');
          break;
        }
      }
    }

    console.log('[Tinder AI] Step 3: Looking for interests...');
    
    // 4. Extract Interests
    const interestsHeader = findElementByText('h2', 'Interests');
    if (interestsHeader) {
        const interestsContainer = interestsHeader.closest('section');
        if (interestsContainer) {
            profileInfo.interests = Array.from(interestsContainer.querySelectorAll('li span')).map(el => el.textContent.trim());
        }
    }
    
    if (profileInfo.interests.length === 0) {
      console.log('[Tinder AI] No interests found via section text, trying alternative selectors...');
      // Try alternative interest selectors
      const interestElements = container.querySelectorAll('[class*="interest"], [class*="Interest"], [class*="tag"], [class*="Tag"]');
      for (const el of interestElements) {
        const text = el.textContent.trim();
        if (text && text.length < 50 && !profileInfo.interests.includes(text)) {
          profileInfo.interests.push(text);
        }
      }
    }
    
    console.log('[Tinder AI] Step 4: Looking for prompts...');
    
    // 5. Extract Prompt/Response sections (like 'Going Out', 'My Weekends')
    const promptHeaders = container.querySelectorAll('h3.Typs\\(body-1-regular\\)');
    promptHeaders.forEach(header => {
      const promptText = header.textContent.trim();
      const answerContainer = header.nextElementSibling;
      if (answerContainer) {
        const answerText = answerContainer.textContent.trim();
        profileInfo.prompts.push({ question: promptText, answer: answerText });
      }
    });

    // If no prompts found, try alternative selectors
    if (profileInfo.prompts.length === 0) {
      console.log('[Tinder AI] No prompts found via section text, trying alternative selectors...');
      const allH3s = container.querySelectorAll('h3');
      for (const h3 of allH3s) {
        const question = h3.textContent.trim();
        const nextEl = h3.nextElementSibling;
        if (nextEl && nextEl.textContent.trim()) {
          profileInfo.prompts.push({ question, answer: nextEl.textContent.trim() });
        }
      }
    }

    console.log('[Tinder AI] Final extracted profile info:', profileInfo);
    return profileInfo;

  } catch (error) {
    console.error('[Tinder AI] Error extracting detailed profile info:', error);
    return profileInfo;
  }
}

function extractChatHistory() {
  console.log('[Tinder AI] Starting chat history extraction...');
  const messages = [];
  
  try {
    // Strategy 1: Using data-testid attributes which are more stable
    const messageNodes = document.querySelectorAll('[data-testid^="message-"]');
    
    if (messageNodes.length > 0) {
      console.log(`[Tinder AI] Found ${messageNodes.length} messages with data-testid`);
      
      messageNodes.forEach(node => {
        const testId = node.getAttribute('data-testid');
        // Text is usually in a span or a styled div, sometimes nested.
        const textNode = node.querySelector('span, div[class*="text"], div[class*="message"]'); 
        
        if (textNode) {
          const text = textNode.textContent.trim();
          if (text && text.length > 0 && text.length < 1000) {
            let sender = 'them';
            if (testId.includes('-sent') || testId.includes('sent')) {
              sender = 'me';
            }
            messages.push({ sender, text });
          }
        }
      });

      if (messages.length > 0) {
        const uniqueMessages = messages.filter((msg, index, self) =>
          index === self.findIndex((t) => t.text === msg.text && t.sender === msg.sender)
        );
        console.log(`[Tinder AI] Extracted ${uniqueMessages.length} messages using data-testid strategy.`);
        return uniqueMessages;
      }
    }

    console.log('[Tinder AI] data-testid strategy failed or no messages found. Falling back to class-based strategy.');

    // Strategy 2: Using class names as a fallback - more comprehensive
    const allMessageElements = document.querySelectorAll('div[class*="message"], div[class*="msg"], div[class*="chat"], div[class*="bubble"]');
    
    if (allMessageElements.length > 0) {
      console.log(`[Tinder AI] Found ${allMessageElements.length} potential message elements`);
      
      allMessageElements.forEach(el => {
        // Filter out UI elements that aren't messages
        if (el.closest('button, [role="button"], textarea, input, nav, header, footer')) return;
        
        const text = el.textContent.trim();
        // Heuristic to avoid grabbing large non-message blocks
        if (text && text.length > 0 && text.length < 500 && !text.includes('Loading') && !text.includes('Typing')) {
          let sender = 'them';
          
          // Check for alignment classes on the parent container
          const parentContainer = el.parentElement;
          if (parentContainer) {
            const classList = parentContainer.className;
            if (typeof classList === 'string' && (
              classList.includes('justify-end') || 
              classList.includes('items-end') || 
              classList.includes('right') ||
              classList.includes('sent') ||
              classList.includes('outgoing')
            )) {
              sender = 'me';
            }
          }
          
          // Also check for common sent message indicators
          if (el.querySelector('[class*="sent"], [class*="outgoing"], [class*="right"]')) {
            sender = 'me';
          }
          
          messages.push({ sender, text });
        }
      });
    }
    
    // Strategy 3: Look for specific Tinder message containers
    if (messages.length === 0) {
      console.log('[Tinder AI] Class-based strategy failed. Trying Tinder-specific selectors...');
      
      // Look for Tinder's specific message structure
      const tinderMessages = document.querySelectorAll('[class*="Message"], [class*="ChatMessage"], [class*="Bubble"]');
      
      tinderMessages.forEach(el => {
        const text = el.textContent.trim();
        if (text && text.length > 0 && text.length < 500) {
          let sender = 'them';
          
          // Check for sent message indicators
          if (el.closest('[class*="sent"], [class*="outgoing"], [class*="right"]')) {
            sender = 'me';
          }
          
          messages.push({ sender, text });
        }
      });
    }
    
    const uniqueFallbackMessages = messages.filter((msg, index, self) =>
      index === self.findIndex((t) => t.text === msg.text && t.sender === msg.sender)
    );
    
    console.log(`[Tinder AI] Extracted ${uniqueFallbackMessages.length} chat messages using fallback strategy.`, uniqueFallbackMessages);
    return uniqueFallbackMessages;
    
  } catch (error) {
    console.error('[Tinder AI] Error extracting chat history:', error);
    return [];
  }
}

async function displayMessageForApproval(initialMessage, profileInfo, chatHistory) {
  // Remove any existing approval box
  const existingBox = document.getElementById('ai-approval-box');
  if (existingBox) {
    existingBox.remove();
  }

  // Remove any existing persistent AI icon
  const existingIcon = document.getElementById('ai-persistent-icon');
  if (existingIcon) {
    existingIcon.remove();
  }

  const messageTextarea = document.querySelector('textarea[placeholder*="message"], textarea[placeholder*="Type"]');
  if (!messageTextarea) {
    console.error('[Tinder AI] Cannot find message textarea to anchor the approval box.');
    await injectMessageAndSend(initialMessage); // Fallback to direct injection
    return;
  }
  
  const approvalBox = document.createElement('div');
  approvalBox.id = 'ai-approval-box';
  approvalBox.className = 'approval-box';

  approvalBox.innerHTML = `
    <div class="approval-box-header" id="ai-approval-header">
      <span class="approval-box-header-title">AI Suggestion</span>
      <span class="approval-box-header-desc">(Drag to move)</span>
    </div>
    <div class="approval-box-content">
      <p id="ai-approval-text" class="approval-box-text">${initialMessage}</p>
      <div id="ai-approval-actions" class="approval-box-actions">
        <button id="ai-use-btn" class="approval-box-btn approval-btn-use">Use</button>
        <button id="ai-regenerate-btn" class="approval-box-btn approval-btn-regenerate">Regenerate</button>
        <select id="ai-tone-select" class="approval-box-select" title="Change message tone">
          <option value="friendly">Friendly</option>
          <option value="playful">Playful</option>
          <option value="flirty">Flirty</option>
          <option value="witty">Witty</option>
          <option value="extra-naughty">Extra Naughty</option>
          <option value="more-funny">More Funny</option>
          <option value="super-romantic">Super Romantic</option>
          <option value="sarcastic">Sarcastic</option>
          <option value="meme-lord">Meme Lord</option>
          <option value="icebreaker">Icebreaker</option>
          <option value="mysterious">Mysterious</option>
          <option value="compliment-bomb">Compliment Bomb</option>
        </select>
        <div class="approval-box-divider"></div>
        <button id="ai-translate-btn" class="approval-box-btn approval-btn-translate">Translate</button>
        <select id="ai-translate-lang" class="approval-box-select">
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="ar">Arabic</option>
          <option value="pt">Portuguese</option>
          <option value="it">Italian</option>
          <option value="ru">Russian</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
          <option value="zh">Chinese</option>
        </select>
        <button id="ai-cancel-btn" class="approval-box-btn approval-btn-cancel">Cancel</button>
      </div>
      <div id="ai-approval-loader" class="approval-box-loader">Loading...</div>
    </div>
  `;

  // Always append to body and use fixed positioning, centered
  approvalBox.style.position = 'fixed';
  approvalBox.style.left = '50%';
  approvalBox.style.top = '50%';
  approvalBox.style.transform = 'translate(-50%, -50%)';
  approvalBox.style.zIndex = '99999';
  document.body.appendChild(approvalBox);

  // Set up MutationObserver to watch for approval box removal
  let observer = null;
  const setupApprovalBoxObserver = () => {
    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          // Check if the removed node is the approval box or contains it
          if (node === approvalBox || (node.nodeType === Node.ELEMENT_NODE && node.contains && node.contains(approvalBox))) {
            console.log('[Tinder AI] Approval box was removed from DOM, recreating persistent icon');
            observer.disconnect();
            observer = null;
            
            // Small delay to ensure DOM is stable
            setTimeout(() => {
              createPersistentAIIcon();
            }, 100);
          }
        });
      });
    });

    // Start observing the document body for child removals
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  // Start observing
  setupApprovalBoxObserver();

  const useBtn = approvalBox.querySelector('#ai-use-btn');
  const regenerateBtn = approvalBox.querySelector('#ai-regenerate-btn');
  const translateBtn = approvalBox.querySelector('#ai-translate-btn');
  const cancelBtn = approvalBox.querySelector('#ai-cancel-btn');
  const langSelect = approvalBox.querySelector('#ai-translate-lang');
  const textBox = approvalBox.querySelector('#ai-approval-text');
  const loader = approvalBox.querySelector('#ai-approval-loader');
  const actionsDiv = approvalBox.querySelector('#ai-approval-actions');
  const toneSelect = approvalBox.querySelector('#ai-tone-select');

  // Set initial tone from settings
  chrome.storage.local.get('messagingConfig', ({ messagingConfig }) => {
    toneSelect.value = messagingConfig?.tone || 'friendly';
  });

  // Populate translation language dropdown with user's selected languages
  getSelectedLanguages().then(selectedLanguages => {
    const languageOptions = getLanguageOptions(selectedLanguages);
    langSelect.innerHTML = languageOptions.map(lang => 
      `<option value="${lang.value}">${lang.text}</option>`
    ).join('');
  });

  useBtn.onclick = async () => {
    // Disconnect observer before removing box
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    // Check auto-send setting
    const { messagingConfig } = await chrome.storage.local.get('messagingConfig');
    const autoSend = messagingConfig?.autoSend || false;
    if (autoSend) {
      // Auto-send is enabled - send the message directly
      console.log('[Tinder AI] Auto-send enabled, sending message directly');
      MESSAGING.messagingStats.messagesSent++;
      MESSAGING.saveMessagingStats();
      updateAllTimeAnalytics({ messages: 1 });
      console.log('[Tinder AI] Message tracked for auto-send');
      injectMessageAndSend(textBox.textContent);
    } else {
      // Auto-send is disabled - just inject into textarea for manual review
      console.log('[Tinder AI] Auto-send disabled, injecting message into textarea');
      const messageTextarea = document.querySelector('textarea[placeholder*="message"], textarea[placeholder*="Type"]');
      if (messageTextarea) {
        messageTextarea.value = textBox.textContent;
        messageTextarea.focus();
        messageTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        messageTextarea.setAttribute('data-ai-message', 'true');
        MESSAGING.messagingStats.messagesSent++;
        MESSAGING.saveMessagingStats();
        updateAllTimeAnalytics({ messages: 1 });
        console.log('[Tinder AI] Message tracked for manual send');
      }
    }
    approvalBox.remove();
    // Show persistent icon after use
    createPersistentAIIcon();
  };

  const regenerateWithTone = async () => {
    actionsDiv.style.display = 'none';
    loader.style.display = 'block';
    const newTone = toneSelect.value;
    // Save the new tone selection for the session
    MESSAGING.setTone(newTone); 
    const newMessage = await generatePersonalizedMessage(profileInfo, chatHistory, { tone: newTone });
    if (newMessage) {
        textBox.textContent = newMessage;
    }
    loader.style.display = 'none';
    actionsDiv.style.display = 'flex';
  };

  regenerateBtn.onclick = regenerateWithTone;
  toneSelect.onchange = regenerateWithTone;

  translateBtn.onclick = async () => {
    actionsDiv.style.display = 'none';
    loader.style.display = 'block';
    const targetLang = langSelect.value;
    const currentText = textBox.textContent;
    const prompt = `Translate the following text to ${targetLang}. Return ONLY the translated text, with no introduction or explanation.\n\nText: "${currentText}"`;
    const response = await getAIResponse(prompt);
    if (response && response.response) {
      textBox.textContent = response.response.trim().replace(/^"|"$/g, '');
    }
    loader.style.display = 'none';
    actionsDiv.style.display = 'flex';
  };

  cancelBtn.onclick = () => {
    // Disconnect observer before removing box
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    approvalBox.remove();
    // Show persistent AI icon when cancelled
    createPersistentAIIcon();
  };

  // --- Draggable Logic & Unified Click Handling ---
  let isDragging = false;
  let offsetX, offsetY;

  const onMouseMove = (e) => {
    if (!isDragging) return;
    approvalBox.style.left = `${e.clientX - offsetX}px`;
    approvalBox.style.top = `${e.clientY - offsetY}px`;
  };

  const onMouseUp = () => {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
  
  approvalBox.addEventListener('mousedown', (e) => {
    const dragHeader = approvalBox.querySelector('#ai-approval-header');
    const isDragHandle = dragHeader && dragHeader.contains(e.target);
    e.stopPropagation();
    if (isDragHandle) {
      e.preventDefault();
      isDragging = true;
      const rect = approvalBox.getBoundingClientRect();
      // Re-parent to body to escape container constraints and use fixed positioning.
      if (approvalBox.parentElement !== document.body) {
        document.body.appendChild(approvalBox);
        approvalBox.style.position = 'fixed';
        // Remove all other inline styles except for left/top/width
        approvalBox.style.removeProperty('bottom');
        approvalBox.style.removeProperty('right');
        // Set initial drag position
        approvalBox.style.left = `${rect.left}px`;
        approvalBox.style.top = `${rect.top}px`;
        approvalBox.style.width = `${rect.width}px`;
      }
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }
  });
}

// Generate personalized message using extracted profile information
async function generatePersonalizedMessage(profileInfo, chatHistory, overrideConfig = {}) {
  try {
    const { messagingConfig } = await new Promise(resolve => chrome.storage.local.get('messagingConfig', resolve));
    
    // Start with default, apply stored config, then apply overrides
    const config = { 
        tone: 'friendly', 
        language: 'en', 
        ...messagingConfig,
        ...overrideConfig 
    };

    let language = config.language;

    // Detect language from last message if history is available
    const lastMessageFromOther = chatHistory.slice().reverse().find(m => m.sender === 'them');
    if (lastMessageFromOther) {
      language = await MESSAGING.detectLanguage(lastMessageFromOther.text);
    } else if (profileInfo.bio) {
      language = await MESSAGING.detectLanguage(profileInfo.bio);
    }
    console.log(`[Tinder AI] Language for response set to: ${language}`);

    let prompt;
    // Add custom instructions for each tone
    const toneInstructions = {
      'playful': 'Make it playful, lighthearted, and fun.',
      'friendly': 'Keep it friendly and approachable.',
      'flirty': 'Add a flirty and charming vibe, but keep it respectful.',
      'witty': 'Make it clever and witty, with a touch of humor.',
      'extra-naughty': 'Make it extra naughty, bold, and risqué, but avoid anything illegal or non-consensual.',
      'more-funny': 'Make it much funnier than usual, use jokes or puns if possible.',
      'super-romantic': 'Make it super romantic, sweet, and heartfelt.',
      'sarcastic': 'Add a strong dose of sarcasm and playful teasing.',
      'meme-lord': 'Write it in the style of a meme lord, using meme references or internet humor.',
      'icebreaker': 'Make it a creative icebreaker that gets the conversation started.',
      'mysterious': 'Make it mysterious and intriguing, leaving them wanting to know more.',
      'compliment-bomb': 'Shower them with genuine, creative compliments in a fun way.'
    };
    const tone = config.tone || 'friendly';
    const toneInstruction = toneInstructions[tone] ? `\nTONE INSTRUCTION: ${toneInstructions[tone]}` : '';
    
    if (chatHistory.length === 0) {
      // This is for generating an OPENER
      let profileContext = `Name: ${profileInfo.name || 'n/a'}\nBio: "${profileInfo.bio || 'n/a'}"\nInterests: ${profileInfo.interests.join(', ') || 'n/a'}`;
      if (profileInfo.prompts && profileInfo.prompts.length > 0) {
          const promptsText = profileInfo.prompts.map(p => `Q: ${p.question}\nA: ${p.answer}`).join('\n\n');
          profileContext += `\n\nPrompts:\n${promptsText}`;
      }
      if ((!profileInfo.bio || profileInfo.bio.toLowerCase() === 'n/a' || profileInfo.bio.trim() === '') && profileInfo.interests && profileInfo.interests.length > 0) {
        prompt = `Based on the following Tinder profile, write ONE short, engaging opening message in ${language}. The profile has no bio, so ask about or reference one of their interests: ${profileInfo.interests.join(', ')}. Be creative and specific. Do NOT use words like \"mystery\", \"intriguing\", \"blank profile\", or \"empty profile\". Do NOT include any intro, options, or explanations. ONLY output the raw message text itself.${toneInstruction}\n\nProfile:\n${profileContext}`;
      } else {
        prompt = `Based on the following Tinder profile, write ONE short, engaging opening message in ${language}. Be creative and refer to something specific from their profile if available. If the profile is very empty, ask a lighthearted, open-ended question. Do NOT use words like \"mystery\", \"intriguing\", \"blank profile\", or \"empty profile\". Do NOT include any intro, options, or explanations. ONLY output the raw message text itself.${toneInstruction}\n\nProfile:\n${profileContext}`;
      }
    } else {
      // This is for generating a REPLY, focusing on the last 4 messages for relevance.
      const recentHistory = chatHistory.slice(-4).map(m => `${m.sender}: ${m.text}`).join('\n');
      prompt = `You are a Tinder messaging assistant. Based on the profile and recent chat history below, write ONE short, engaging reply in ${language}. Your reply should be from "me" and continue the conversation naturally. Do NOT include any intro, options, or explanations. ONLY output the raw message text itself.${toneInstruction}\n\nPROFILE:\nName: ${profileInfo.name || 'n/a'}\nBio: "${profileInfo.bio || 'n/a'}"\nInterests: ${profileInfo.interests.join(', ') || 'n/a'}\n\nRECENT CHAT HISTORY:\n${recentHistory}\n\nYour reply:`;
    }

    console.log('[Tinder AI] Generating personalized message with prompt:', prompt);

    const response = await getAIResponse(prompt);
  if (response && response.response) {
      // The AI might still wrap the response in quotes, so we remove them.
      return response.response.trim().replace(/^"|"$/g, '');
    }
    return null;
  } catch (error) {
    console.error('[Tinder AI] Error generating personalized message:', error);
    return null;
  }
} 

// Enhanced function to extract profile info without clicking on match items
async function extractProfileInfoFromCurrentChat() {
  console.log('[Tinder AI] Extracting profile info from current chat...');
  
  // Wait a bit for the chat to fully load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Extract profile info from the current chat view
  const chatContainer = document.querySelector('main[role="main"]') || document.body;
  const profileInfo = extractDetailedProfileInfo(chatContainer);
  
  if (!profileInfo.name && !profileInfo.bio) {
    console.warn('[Tinder AI] Could not extract profile info from current chat view');
    return null;
  }
  
  console.log('[Tinder AI] Successfully extracted profile info from current chat:', profileInfo);
  return profileInfo;
}

// --- Worldwide Language Library ---
const WORLDWIDE_LANGUAGES = {
  en: { name: "English", native: "English" },
  es: { name: "Spanish", native: "Español" },
  fr: { name: "French", native: "Français" },
  de: { name: "German", native: "Deutsch" },
  ar: { name: "Arabic", native: "العربية" },
  pt: { name: "Portuguese", native: "Português" },
  it: { name: "Italian", native: "Italiano" },
  ru: { name: "Russian", native: "Русский" },
  ja: { name: "Japanese", native: "日本語" },
  ko: { name: "Korean", native: "한국어" },
  zh: { name: "Chinese", native: "中文" },
  hi: { name: "Hindi", native: "हिन्दी" },
  tr: { name: "Turkish", native: "Türkçe" },
  nl: { name: "Dutch", native: "Nederlands" },
  sv: { name: "Swedish", native: "Svenska" },
  da: { name: "Danish", native: "Dansk" },
  no: { name: "Norwegian", native: "Norsk" },
  fi: { name: "Finnish", native: "Suomi" },
  pl: { name: "Polish", native: "Polski" },
  cs: { name: "Czech", native: "Čeština" },
  sk: { name: "Slovak", native: "Slovenčina" },
  hu: { name: "Hungarian", native: "Magyar" },
  ro: { name: "Romanian", native: "Română" },
  bg: { name: "Bulgarian", native: "Български" },
  hr: { name: "Croatian", native: "Hrvatski" },
  sr: { name: "Serbian", native: "Српски" },
  sl: { name: "Slovenian", native: "Slovenščina" },
  et: { name: "Estonian", native: "Eesti" },
  lv: { name: "Latvian", native: "Latviešu" },
  lt: { name: "Lithuanian", native: "Lietuvių" },
  he: { name: "Hebrew", native: "עברית" },
  th: { name: "Thai", native: "ไทย" },
  vi: { name: "Vietnamese", native: "Tiếng Việt" },
  id: { name: "Indonesian", native: "Bahasa Indonesia" },
  ms: { name: "Malay", native: "Bahasa Melayu" },
  fil: { name: "Filipino", native: "Filipino" },
  uk: { name: "Ukrainian", native: "Українська" },
  be: { name: "Belarusian", native: "Беларуская" },
  kk: { name: "Kazakh", native: "Қазақ" },
  uz: { name: "Uzbek", native: "O'zbek" },
  ky: { name: "Kyrgyz", native: "Кыргызча" },
  tg: { name: "Tajik", native: "Тоҷикӣ" },
  mn: { name: "Mongolian", native: "Монгол" },
  fa: { name: "Persian", native: "فارسی" },
  ur: { name: "Urdu", native: "اردو" },
  bn: { name: "Bengali", native: "বাংলা" },
  ta: { name: "Tamil", native: "தமிழ்" },
  te: { name: "Telugu", native: "తెలుగు" },
  kn: { name: "Kannada", native: "ಕನ್ನಡ" },
  ml: { name: "Malayalam", native: "മലയാളം" },
  gu: { name: "Gujarati", native: "ગુજરાતી" },
  mr: { name: "Marathi", native: "मराठी" },
  pa: { name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  ne: { name: "Nepali", native: "नेपाली" },
  si: { name: "Sinhala", native: "සිංහල" },
  my: { name: "Burmese", native: "မြန်မာ" },
  km: { name: "Khmer", native: "ខ្មែរ" },
  lo: { name: "Lao", native: "ລາວ" },
  am: { name: "Amharic", native: "አማርኛ" },
  sw: { name: "Swahili", native: "Kiswahili" },
  zu: { name: "Zulu", native: "isiZulu" },
  af: { name: "Afrikaans", native: "Afrikaans" },
  is: { name: "Icelandic", native: "Íslenska" },
  ga: { name: "Irish", native: "Gaeilge" },
  cy: { name: "Welsh", native: "Cymraeg" },
  gd: { name: "Scottish Gaelic", native: "Gàidhlig" },
  mt: { name: "Maltese", native: "Malti" },
  eu: { name: "Basque", native: "Euskara" },
  ca: { name: "Catalan", native: "Català" },
  gl: { name: "Galician", native: "Galego" },
  sq: { name: "Albanian", native: "Shqip" },
  mk: { name: "Macedonian", native: "Македонски" },
  bs: { name: "Bosnian", native: "Bosanski" },
  me: { name: "Montenegrin", native: "Crnogorski" },
  el: { name: "Greek", native: "Ελληνικά" }
};

// Default selected languages (most common)
const DEFAULT_SELECTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'ar', 'pt', 'it', 'ru', 'ja', 'ko', 'zh'];

// Language configuration functions
function getSelectedLanguages() {
  return new Promise((resolve) => {
    chrome.storage.local.get('messagingConfig', ({ messagingConfig }) => {
      const selectedLanguages = messagingConfig?.selectedLanguages || DEFAULT_SELECTED_LANGUAGES;
      resolve(selectedLanguages);
    });
  });
}

function getLanguageOptions(selectedLanguages) {
  return selectedLanguages.map(code => ({
    value: code,
    text: `${WORLDWIDE_LANGUAGES[code]?.name} (${WORLDWIDE_LANGUAGES[code]?.native})`
  }));
}

function getAllLanguageOptions() {
  return Object.entries(WORLDWIDE_LANGUAGES).map(([code, lang]) => ({
    value: code,
    text: `${lang.name} (${lang.native})`
  })).sort((a, b) => a.text.localeCompare(b.text));
}

// --- Tinder AI Extension ---

function renderSidebarAITab(enabled) {
  const aiPanel = document.getElementById('sidebar-tab-ai');
  if (!aiPanel) return;
  aiPanel.style.overflowY = 'auto';
  aiPanel.style.maxHeight = 'calc(100vh - 60px)';
  aiPanel.innerHTML = '';

  chrome.storage.local.get(['activeAI', 'geminiFreeApiKey', 'geminiProApiKey', 'openaiApiKey', 'deepseekApiKey', 'anthropicApiKey', 'messagingConfig'], ({ activeAI, geminiFreeApiKey, geminiProApiKey, openaiApiKey, deepseekApiKey, anthropicApiKey, messagingConfig }) => {
    const msgConfig = messagingConfig || { tone: 'friendly', language: 'en', autoSend: false, autoMessageOnMatch: false };
    const selectedAI = activeAI || 'gemini';

    // --- AI Model & API Key Section ---
    const aiModelSection = `
      <div class="sidebar-box">
        <div class="settings-header">AI Model & API Key</div>
      <div class="sidebar-settings-row">
        <label for="ai-model-select" class="settings-label sidebar-label-min">AI Model</label>
        <select id="ai-model-select" class="sidebar-select-wide">
            <option value="gemini" ${selectedAI === 'gemini' ? 'selected' : ''}>Google Gemini (Free)</option>
            <option value="gemini-pro" ${selectedAI === 'gemini-pro' ? 'selected' : ''}>Google Gemini Pro (Paid)</option>
            <option value="chatgpt" ${selectedAI === 'chatgpt' ? 'selected' : ''}>OpenAI ChatGPT</option>
            <option value="deepseek" ${selectedAI === 'deepseek' ? 'selected' : ''}>DeepSeek</option>
            <option value="claude" ${selectedAI === 'claude' ? 'selected' : ''}>Anthropic Claude</option>
          </select>
        </div>
        <div id="gemini-free-key-row" class="sidebar-settings-row sidebar-row-mb sidebar-row-flex${selectedAI === 'gemini' ? '' : ' sidebar-row-none'}">
          <label for="gemini-free-api-key" class="settings-label sidebar-label-min">Gemini Free API Key</label>
          <input type="password" id="gemini-free-api-key" class="settings-input sidebar-input-grow" placeholder="Enter Gemini Free API Key">
        </div>
        <div id="gemini-pro-key-row" class="sidebar-settings-row sidebar-row-mb sidebar-row-flex${selectedAI === 'gemini-pro' ? '' : ' sidebar-row-none'}">
          <label for="gemini-pro-api-key" class="settings-label sidebar-label-min">Gemini Pro API Key</label>
          <input type="password" id="gemini-pro-api-key" class="settings-input" placeholder="Enter Gemini Pro API Key" >
        </div>
        <div id="openai-key-row" class="sidebar-settings-row sidebar-row-mb sidebar-row-flex${selectedAI === 'chatgpt' ? '' : ' sidebar-row-none'}">
          <label for="openai-api-key" class="settings-label sidebar-label-min">OpenAI API Key</label>
          <input type="password" id="openai-api-key" class="settings-input" placeholder="Enter OpenAI API Key">
        </div>
        <div id="deepseek-key-row" class="sidebar-settings-row sidebar-row-mb sidebar-row-flex${selectedAI === 'deepseek' ? '' : ' sidebar-row-none'}">
          <label for="deepseek-api-key" class="settings-label sidebar-label-min">DeepSeek API Key</label>
          <input type="password" id="deepseek-api-key" class="settings-input" placeholder="Enter DeepSeek API Key">
        </div>
        <div id="anthropic-key-row" class="sidebar-settings-row sidebar-row-mb sidebar-row-flex${selectedAI === 'claude' ? '' : ' sidebar-row-none'}">
          <label for="anthropic-api-key" class="settings-label sidebar-label-min">Anthropic API Key</label>
          <input type="password" id="anthropic-api-key" class="settings-input" placeholder="Enter Anthropic API Key">
        </div>
        <div id="api-key-status" class="stealth-panel-desc"></div>
      </div>
    `;

    // --- Messaging Configuration Section ---
    const messagingSettingsHTML = `
      <div class="sidebar-box">
        <div class="settings-header">Messaging Configuration</div>
        <div class="settings-row">
          <label for="message-tone" class="settings-label">Message Tone</label>
          <select id="message-tone" class="settings-input">
            <option value="playful" ${msgConfig.tone === 'playful' ? 'selected' : ''}>Playful</option>
            <option value="friendly" ${msgConfig.tone === 'friendly' ? 'selected' : ''}>Friendly</option>
            <option value="flirty" ${msgConfig.tone === 'flirty' ? 'selected' : ''}>Flirty</option>
            <option value="witty" ${msgConfig.tone === 'witty' ? 'selected' : ''}>Witty</option>
            <option value="extra-naughty" ${msgConfig.tone === 'extra-naughty' ? 'selected' : ''}>Extra Naughty</option>
            <option value="more-funny" ${msgConfig.tone === 'more-funny' ? 'selected' : ''}>More Funny</option>
            <option value="super-romantic" ${msgConfig.tone === 'super-romantic' ? 'selected' : ''}>Super Romantic</option>
            <option value="sarcastic" ${msgConfig.tone === 'sarcastic' ? 'selected' : ''}>Sarcastic</option>
            <option value="meme-lord" ${msgConfig.tone === 'meme-lord' ? 'selected' : ''}>Meme Lord</option>
            <option value="icebreaker" ${msgConfig.tone === 'icebreaker' ? 'selected' : ''}>Icebreaker</option>
            <option value="mysterious" ${msgConfig.tone === 'mysterious' ? 'selected' : ''}>Mysterious</option>
            <option value="compliment-bomb" ${msgConfig.tone === 'compliment-bomb' ? 'selected' : ''}>Compliment Bomb</option>
          </select>
        </div>
        <div class="settings-row">
          <label for="message-language" class="settings-label">Language</label>
          <select id="message-language" class="settings-input">
            <option value="en" ${msgConfig.language === 'en' ? 'selected' : ''}>English</option>
            <option value="es" ${msgConfig.language === 'es' ? 'selected' : ''}>Spanish</option>
            <option value="fr" ${msgConfig.language === 'fr' ? 'selected' : ''}>French</option>
            <option value="de" ${msgConfig.language === 'de' ? 'selected' : ''}>German</option>
          </select>
        </div>
        <div class="settings-row">
          <label class="settings-label flex items-center text-muted">
            <input type="checkbox" id="auto-send" ${msgConfig.autoSend ? 'checked' : ''} class="mr-2">
            Auto-send messages
          </label>
        </div>
        <div class="settings-row">
          <label class="settings-label flex items-center text-muted">
            <input type="checkbox" id="auto-message-on-match" ${msgConfig.autoMessageOnMatch ? 'checked' : ''} class="mr-2">
            Auto-message new matches
          </label>
        </div>
      </div>
    `;

    // --- Collapsible Language Preferences Section ---
    const selectedLanguages = msgConfig.selectedLanguages || DEFAULT_SELECTED_LANGUAGES;
    const languagePreferencesHTML = `
      <div class="sidebar-box">
        <div id="lang-pref-header" class="sidebar-lang-header">
        <p class="sidebar-lang-desc">Select which languages appear in your translation dropdowns:</p>
         <span id="lang-pref-toggle" class="sidebar-lang-toggle">&#x25BC;</span>
           <div id="lang-pref-body" class="sidebar-lang-body">      
          <p class="sidebar-lang-desc">Select which languages appear in your translation dropdowns:</p>
          <div id="language-selection-container" class="diagnostic-log">
            <div class="grid grid-cols-auto gap-2">
              ${getAllLanguageOptions().map(lang => `
                <label class="settings-label flex items-center text-xs cursor-pointer">
                  <input type="checkbox" class="language-checkbox" value="${lang.value}" ${selectedLanguages.includes(lang.value) ? 'checked' : ''} class="mr-2">
                  ${lang.text}
                </label>
              `).join('')}
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <button id="select-all-languages" class="main-btn bg-primary text-white p-2 text-xs">Select All</button>
            <button id="deselect-all-languages" class="main-btn bg-danger text-white p-2 text-xs">Deselect All</button>
            <button id="reset-languages" class="main-btn bg-warning text-white p-2 text-xs">Reset to Default</button>
           </div>
           <div class="stealth-panel-desc">
            Selected: <span id="selected-count">${selectedLanguages.length}</span> languages
          </div>
        </div>
      </div>
    `;

    // --- Save Button ---
    const saveSettingsHTML = `
      <div class="sidebar-box">
        <button id="save-ai-settings" class="main-btn sidebar-save-btn-green sidebar-btn-full">Save All Settings</button>
        <div id="ai-settings-status" class="stealth-panel-desc"></div>
      </div>
    `;

    aiPanel.innerHTML = aiModelSection + messagingSettingsHTML + languagePreferencesHTML + saveSettingsHTML;

    // --- Collapsible logic for Language Preferences ---
    const langPrefHeader = document.getElementById('lang-pref-header');
    const langPrefBody = document.getElementById('lang-pref-body');
    const langPrefToggle = document.getElementById('lang-pref-toggle');
    if (langPrefHeader && langPrefBody && langPrefToggle) {
      langPrefHeader.onclick = () => {
        const isOpen = langPrefBody.style.display === 'block';
        langPrefBody.style.display = isOpen ? 'none' : 'block';
        langPrefToggle.innerHTML = isOpen ? '&#x25BC;' : '&#x25B2;';
      };
    }

    // --- Set initial values for API keys ---
    if (geminiFreeApiKey) document.getElementById('gemini-free-api-key').value = geminiFreeApiKey;
    if (geminiProApiKey) document.getElementById('gemini-pro-api-key').value = geminiProApiKey;
    if (openaiApiKey) document.getElementById('openai-api-key').value = openaiApiKey;
    if (deepseekApiKey) document.getElementById('deepseek-api-key').value = deepseekApiKey;
    if (anthropicApiKey) document.getElementById('anthropic-api-key').value = anthropicApiKey;

    // --- Show/hide API key fields based on model ---
    function updateKeyVisibility() {
      const model = document.getElementById('ai-model-select').value;
      document.getElementById('gemini-free-key-row').style.display = (model === 'gemini') ? 'flex' : 'none';
      document.getElementById('gemini-pro-key-row').style.display = (model === 'gemini-pro') ? 'flex' : 'none';
      document.getElementById('openai-key-row').style.display = (model === 'chatgpt') ? 'flex' : 'none';
      document.getElementById('deepseek-key-row').style.display = (model === 'deepseek') ? 'flex' : 'none';
      document.getElementById('anthropic-key-row').style.display = (model === 'claude') ? 'flex' : 'none';
    }
    updateKeyVisibility();
    document.getElementById('ai-model-select').addEventListener('change', updateKeyVisibility);

    // --- Add event listeners ---
    setupAIEventListeners();
  });
}

function setupAIEventListeners() {
  // Language selection event handlers
  const languageCheckboxes = document.querySelectorAll('.language-checkbox');
  const selectedCountSpan = document.getElementById('selected-count');
  
  languageCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const selectedLanguages = Array.from(document.querySelectorAll('.language-checkbox:checked')).map(cb => cb.value);
      if (selectedCountSpan) {
        selectedCountSpan.textContent = selectedLanguages.length;
      }
    });
  });

  // Select All Languages
  const selectAllBtn = document.getElementById('select-all-languages');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      languageCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
      });
      if (selectedCountSpan) {
        selectedCountSpan.textContent = languageCheckboxes.length;
      }
    });
  }

  // Deselect All Languages
  const deselectAllBtn = document.getElementById('deselect-all-languages');
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', () => {
      languageCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
      });
      if (selectedCountSpan) {
        selectedCountSpan.textContent = '0';
      }
    });
  }

  // Reset to Default Languages
  const resetLanguagesBtn = document.getElementById('reset-languages');
  if (resetLanguagesBtn) {
    resetLanguagesBtn.addEventListener('click', () => {
      languageCheckboxes.forEach(checkbox => {
        checkbox.checked = DEFAULT_SELECTED_LANGUAGES.includes(checkbox.value);
      });
      if (selectedCountSpan) {
        selectedCountSpan.textContent = DEFAULT_SELECTED_LANGUAGES.length;
      }
    });
  }

  // Save API Keys
  const saveApiBtn = document.getElementById('save-api-keys-btn');
  if (saveApiBtn) {
    saveApiBtn.addEventListener('click', () => {
      const model = document.getElementById('ai-model-select').value;
      const geminiKey = document.getElementById('gemini-free-api-key').value.trim();
      const geminiProKey = document.getElementById('gemini-pro-api-key').value.trim();
      const openaiKey = document.getElementById('openai-api-key').value.trim();
      const deepseekKey = document.getElementById('deepseek-api-key').value.trim();
      const anthropicKey = document.getElementById('anthropic-api-key').value.trim();
      const statusEl = document.getElementById('api-key-status');
      let toSave = { activeAI: model };
      if (model === 'gemini') toSave.geminiFreeApiKey = geminiKey;
      if (model === 'gemini-pro') toSave.geminiProApiKey = geminiProKey;
      if (model === 'chatgpt') toSave.openaiApiKey = openaiKey;
      if (model === 'deepseek') toSave.deepseekApiKey = deepseekKey;
      if (model === 'claude') toSave.anthropicApiKey = anthropicKey;
      chrome.storage.local.set(toSave, () => {
        statusEl.textContent = 'API Key(s) saved successfully!';
        statusEl.style.color = '#48bb78';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
      });
    });
  }

  // Save AI Settings
  const saveSettingsBtn = document.getElementById('save-ai-settings');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const activeAI = document.getElementById('ai-model-select').value;
      const tone = document.getElementById('message-tone').value;
      const language = document.getElementById('message-language').value;
      const autoSend = document.getElementById('auto-send').checked;
      const autoMessageOnMatch = document.getElementById('auto-message-on-match').checked;
      const selectedLanguages = Array.from(document.querySelectorAll('.language-checkbox:checked')).map(cb => cb.value);
      // API keys
      const geminiKey = document.getElementById('gemini-free-api-key').value.trim();
      const geminiProKey = document.getElementById('gemini-pro-api-key').value.trim();
      const openaiKey = document.getElementById('openai-api-key').value.trim();
      const deepseekKey = document.getElementById('deepseek-api-key').value.trim();
      const anthropicKey = document.getElementById('anthropic-api-key').value.trim();
      let toSave = { activeAI, messagingConfig: { tone, language, autoSend, autoMessageOnMatch }, selectedLanguages };
      if (activeAI === 'gemini') toSave.geminiFreeApiKey = geminiKey;
      if (activeAI === 'gemini-pro') toSave.geminiProApiKey = geminiProKey;
      if (activeAI === 'chatgpt') toSave.openaiApiKey = openaiKey;
      if (activeAI === 'deepseek') toSave.deepseekApiKey = deepseekKey;
      if (activeAI === 'claude') toSave.anthropicApiKey = anthropicKey;
      chrome.storage.local.set(toSave, () => {
        console.log('[Tinder AI] AI settings and API key saved:', toSave);
        const statusEl = document.getElementById('ai-settings-status');
        statusEl.textContent = 'AI settings and API key saved successfully!';
        statusEl.style.color = '#48bb78';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
        // Update global variables
        MESSAGING.tone = tone;
        MESSAGING.language = language;
        MESSAGING.autoSend = autoSend;
        MESSAGING.autoMessageOnMatch = autoMessageOnMatch;
      });
    });
  }
}

function renderSidebarSwipingTab(enabled) {
  const swipingPanel = document.getElementById('sidebar-tab-swiping');
  if (!swipingPanel) return;
  swipingPanel.style.overflowY = 'auto';
  swipingPanel.style.maxHeight = 'calc(100vh - 60px)';
  // ... existing code ...
  swipingPanel.innerHTML = '';

  // Load existing settings
  chrome.storage.local.get(['swipeConfig'], ({ swipeConfig }) => {
    const config = swipeConfig || { likeRatio: 0.7, maxSwipes: 100 };

    // Swiping Configuration
    const swipingSettingsHTML = `
      <div class="sidebar-box">
        <div class="settings-header">Swiping Behavior</div>
        <div class="settings-row">
          <label for="like-ratio" class="settings-label">Like Ratio (%)</label>
          <div class="sidebar-flex-row sidebar-gap-md sidebar-btn-wide">
            <input type="range" id="like-ratio" min="10" max="100" value="${Math.round((config.likeRatio || 0.7) * 100)}" class="settings-input sidebar-input-grow" />
            <span class="settings-value sidebar-label-min sidebar-text-right" id="like-ratio-value">${Math.round((config.likeRatio || 0.7) * 100)}%</span>
        </div>
        </div>
        <div class="settings-row">
          <label for="max-swipes" class="settings-label">Max Swipes</label>
          <input type="number" id="max-swipes" min="5" max="100" value="${config.maxSwipes || 100}" class="settings-input" />
        </div>
        </div>
    `;

    // Future Swiping Settings Placeholder
    const futureSettingsHTML = `
      <div class="settings-divider"></div>
      <div class="settings-header">Advanced Swiping</div>
      <div class="sidebar-box">
        <p class="settings-desc">Future features coming soon:</p>
        <ul class="settings-desc sidebar-list-indent">
          <li>Swipe speed settings</li>
          <li>Filter preferences</li>
          <li>Swiping patterns</li>
          <li>Smart matching</li>
        </ul>
      </div>
    `;

    // Save Settings Button
    const saveSettingsHTML = `
      <div class="settings-divider"></div>
      <button id="save-swiping-settings" class="main-btn sidebar-save-btn-green sidebar-btn-full">Save Swiping Settings</button>
      <div id="swiping-settings-status" class="settings-status"></div>
    `;

    swipingPanel.innerHTML = swipingSettingsHTML + futureSettingsHTML + saveSettingsHTML;

    // Add event listeners
    setupSwipingEventListeners();
  });
}

function setupSwipingEventListeners() {
  const likeRatioSlider = document.getElementById('like-ratio');
  const likeRatioValue = document.getElementById('like-ratio-value');
  if (likeRatioSlider) {
    likeRatioSlider.addEventListener('input', (e) => {
      likeRatioValue.textContent = e.target.value + '%';
    });
  }

  const saveSwipingBtn = document.getElementById('save-swiping-settings');
  if (saveSwipingBtn) {
    saveSwipingBtn.addEventListener('click', () => {
      const newSwipeConfig = {
        likeRatio: parseInt(document.getElementById('like-ratio').value, 10) / 100,
        maxSwipes: parseInt(document.getElementById('max-swipes').value, 10),
      };

      // Call updateSettings to update global variables for automatic swiping
      updateSettings({
        swipeConfig: newSwipeConfig,
        swipeSpeedMin: SWIPE_DELAY_RANGE[0],
        swipeSpeedMax: SWIPE_DELAY_RANGE[1],
        activeAI: AI_INTEGRATION.currentAI
      });

      chrome.storage.local.set({
        swipeConfig: newSwipeConfig
      }, () => {
        console.log('[Tinder AI] Swiping settings saved:', newSwipeConfig);
        const statusEl = document.getElementById('swiping-settings-status');
        statusEl.textContent = 'Swiping settings saved successfully!';
        statusEl.style.color = '#48bb78';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
        
        // Refresh the status tab to show updated values
        if (currentTab === 'status') {
          renderSidebarStatusTab(enabled);
        }
      });
    });
  }
}

function setupSettingsEventListeners() {
  const likeRatioSlider = document.getElementById('like-ratio');
  const likeRatioValue = document.getElementById('like-ratio-value');
  if (likeRatioSlider) {
    likeRatioSlider.addEventListener('input', (e) => {
      likeRatioValue.textContent = e.target.value + '%';
    });
  }

  // Language selection event handlers
  const languageCheckboxes = document.querySelectorAll('.language-checkbox');
  const selectedCountSpan = document.getElementById('selected-count');
  
  languageCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const selectedLanguages = Array.from(document.querySelectorAll('.language-checkbox:checked')).map(cb => cb.value);
      if (selectedCountSpan) {
        selectedCountSpan.textContent = selectedLanguages.length;
      }
    });
  });

  // Select All Languages
  const selectAllBtn = document.getElementById('select-all-languages');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      languageCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
      });
      if (selectedCountSpan) {
        selectedCountSpan.textContent = languageCheckboxes.length;
      }
    });
  }

  // Deselect All Languages
  const deselectAllBtn = document.getElementById('deselect-all-languages');
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', () => {
      languageCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
      });
      if (selectedCountSpan) {
        selectedCountSpan.textContent = '0';
      }
    });
  }

  // Reset to Default Languages
  const resetLanguagesBtn = document.getElementById('reset-languages');
  if (resetLanguagesBtn) {
    resetLanguagesBtn.addEventListener('click', () => {
      languageCheckboxes.forEach(checkbox => {
        checkbox.checked = DEFAULT_SELECTED_LANGUAGES.includes(checkbox.value);
      });
      if (selectedCountSpan) {
        selectedCountSpan.textContent = DEFAULT_SELECTED_LANGUAGES.length;
      }
    });
  }

  const saveApiBtn = document.getElementById('save-api-keys-btn');
  if (saveApiBtn) {
    saveApiBtn.addEventListener('click', () => {
      const geminiKey = document.getElementById('gemini-free-api-key').value.trim();
      const geminiProKey = document.getElementById('gemini-pro-api-key').value.trim();
      const openaiKey = document.getElementById('openai-api-key').value.trim();
      const deepseekKey = document.getElementById('deepseek-api-key').value.trim();
      const anthropicKey = document.getElementById('anthropic-api-key').value.trim();
      const statusEl = document.getElementById('api-key-status');
      let toSave = { activeAI: document.getElementById('ai-model-select').value };
      if (document.getElementById('ai-model-select').value === 'gemini') toSave.geminiFreeApiKey = geminiKey;
      if (document.getElementById('ai-model-select').value === 'gemini-pro') toSave.geminiProApiKey = geminiProKey;
      if (document.getElementById('ai-model-select').value === 'chatgpt') toSave.openaiApiKey = openaiKey;
      if (document.getElementById('ai-model-select').value === 'deepseek') toSave.deepseekApiKey = deepseekKey;
      if (document.getElementById('ai-model-select').value === 'claude') toSave.anthropicApiKey = anthropicKey;
      chrome.storage.local.set(toSave, () => {
        statusEl.textContent = 'API Key(s) saved successfully!';
          statusEl.style.color = '#48bb78';
          setTimeout(() => { statusEl.textContent = ''; }, 3000);
        });
    });
  }

  const saveSettingsBtn = document.getElementById('save-settings');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const newFilterConfig = {
        likeRatio: parseInt(document.getElementById('like-ratio').value, 10) / 100,
        maxSwipes: parseInt(document.getElementById('max-swipes').value, 10),
      };

      // Get selected languages
      const selectedLanguages = Array.from(document.querySelectorAll('.language-checkbox:checked')).map(cb => cb.value);

      const newMessagingConfig = {
        tone: document.getElementById('message-tone').value,
        language: document.getElementById('message-language').value,
        autoSend: document.getElementById('auto-send').checked,
        autoMessageOnMatch: document.getElementById('auto-message-on-match').checked,
        selectedLanguages: selectedLanguages,
      };

      chrome.storage.local.set({
        filterConfig: newFilterConfig,
        messagingConfig: newMessagingConfig
      }, () => {
        console.log('[Tinder AI] Settings saved:', { newFilterConfig, newMessagingConfig });
        const statusEl = document.getElementById('settings-status');
        statusEl.textContent = 'Settings saved successfully!';
        statusEl.style.color = '#48bb78';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
      });
    });
  }
}

// Track manual message sends (when auto-send is disabled)
function trackManualMessageSend() {
  // Check if there's a message in the textarea that was injected by AI
  const textarea = document.querySelector('textarea[placeholder*="message"], textarea[placeholder*="Type"], textarea[placeholder*="Type a message"]');
  if (textarea && textarea.value.trim() && textarea.hasAttribute('data-ai-message')) {
    // This is an AI-generated message being sent manually
    // Note: Message is already tracked in the approval box, so we don't double-count
    console.log('[Tinder AI] Manual AI message send detected (already tracked in approval box)');
    
    // Remove the AI message marker to prevent double-counting
    textarea.removeAttribute('data-ai-message');
  }
}

// Monitor for manual message sends
function setupManualMessageTracking() {
  // Listen for clicks on send buttons
  document.addEventListener('click', (e) => {
    // Check for send buttons using valid selectors
    const isSendButton = e.target.matches('button[type="submit"]') || 
                        e.target.matches('button[aria-label*="Send"]') ||
                        e.target.closest('button[aria-label*="Send"]') ||
                        (e.target.tagName === 'BUTTON' && e.target.textContent.toLowerCase().includes('send'));
    
    if (isSendButton) {
      // Small delay to ensure the message is sent
      setTimeout(trackManualMessageSend, 500);
    }
  });
  
  // Also listen for Enter key in textarea
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target.matches('textarea[placeholder*="message"], textarea[placeholder*="Type"]')) {
      setTimeout(trackManualMessageSend, 500);
    }
  });
}

// Helper function to show error notifications
function showErrorNotification(message) {
  // Remove any existing error notifications
  const existingNotifications = document.querySelectorAll('.tinder-ai-error-notification');
  existingNotifications.forEach(notification => notification.remove());

  const notification = document.createElement('div');
  notification.className = 'tinder-ai-error-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f56565;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10001;
    font-family: sans-serif;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease;
    word-wrap: break-word;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Add slide-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  // Remove notification after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
    if (style.parentNode) {
      style.remove();
    }
  }, 5000);
}

// Helper function to manually recover extension context
function manualContextRecovery() {
  console.log('[Tinder AI] Manual context recovery initiated');
  
  if (chrome.runtime?.id) {
    showErrorNotification('Extension context is already valid');
    return;
  }
  
  // Try to reinitialize the extension
  try {
    // Force a page reload to reinitialize the extension
    showErrorNotification('Reloading page to recover extension context...');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    console.error('[Tinder AI] Manual recovery failed:', error);
    showErrorNotification('Manual recovery failed. Please refresh the page manually.');
  }
}

// --- Auto-message on new match: global hook ---
window.onNewMatchDetected = async function(matchId) {
  // Pause swiping
  sessionActive = false;
  swipingGloballyStopped = true;
  console.log('[Tinder AI] Auto-message: Paused swiping for new match', matchId);

  // Retry logic for opening chat
  let chatReady = false;
  let matchItem = null;
  let attempts = 0;
  const maxAttempts = 3;
  while (!chatReady && attempts < maxAttempts) {
    // Try to find and click the match item to open chat
    matchItem = document.querySelector(`[data-id='${matchId}']`);
    if (!matchItem) {
      // Fallback: try to find by href
      matchItem = Array.from(document.querySelectorAll("a[href*='/app/messages/']")).find(a => a.href.includes(matchId));
    }
    if (matchItem) {
      matchItem.click();
      console.log(`[Tinder AI] Auto-message: Clicked match item to open chat for ${matchId} (attempt ${attempts + 1})`);
      // Wait for chat window (textarea) to appear
      for (let i = 0; i < 20; i++) { // up to 10 seconds
        if (document.querySelector('textarea[placeholder*="message"], textarea[placeholder*="Type"], textarea[placeholder*="Type a message"]')) {
          chatReady = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (chatReady) break;
    } else {
      console.warn(`[Tinder AI] Auto-message: Could not find match item in DOM for ${matchId} (attempt ${attempts + 1})`);
    }
    attempts++;
  }
  if (!chatReady) {
    console.warn(`[Tinder AI] Auto-message: Chat window did not appear for match ${matchId} after ${maxAttempts} attempts. Skipping auto-message for this match.`);
    // Resume swiping even if chat could not be opened
    sessionActive = true;
    swipingGloballyStopped = false;
    automateSwiping();
    return;
  }

  // Wait for the message to be sent (poll the message queue)
  let maxWait = 30; // seconds
  while (MESSAGING.messageQueue.some(m => m.matchId === matchId && m.status !== 'sent') && maxWait > 0) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    maxWait--;
  }

  // Resume swiping
  sessionActive = true;
  swipingGloballyStopped = false;
  console.log('[Tinder AI] Auto-message: Resuming swiping after messaging new match', matchId);
  automateSwiping();
};

// Helper to show a status message in the sidebar
function showStatusMessage(msg) {
  const statusPanel = document.getElementById('sidebar-tab-status');
  if (statusPanel) {
    const existing = document.getElementById('out-of-likes-message');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'out-of-likes-message';
    div.className = 'sidebar-status-message';
    div.textContent = msg;
    statusPanel.prepend(div);
  }
}