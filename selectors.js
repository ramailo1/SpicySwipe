// selectors.js
// Defines selectors for Tinder UI elements

window.SELECTORS = {
  // Profile card selectors
  PROFILE_CARD: [
    'div[class*="gamepad-card"]',
    'div[class*="recs-card"]',
    'div[class*="card"]'
  ],

  // Bio selectors
  BIO: [
    'div[class*="gamepad-bio"]',
    'div[class*="recs-bio"]',
    'div[class*="bio"]'
  ],

  // Photo selectors
  PHOTO: [
    'img[class*="gamepad-photo"]',
    'img[class*="recs-photo"]',
    'img[class*="photo"]'
  ],

  // Button selectors - Unified and prioritized with ARIA & data-testid fallbacks
  LIKE_BUTTON: [
    'button[class*="gamepad-button"][class*="Bgc($c-ds-background-gamepad-sparks-like-default)"]:not([class*="super"]):not([class*="Bgc($c-ds-background-gamepad-sparks-super-like-default)"])',
    'button[class*="gamepad-button"][class*="like"]:not([class*="super"]):not([class*="Bgc($c-ds-background-gamepad-sparks-super-like-default)"])',
    'button[class*="Bgc($c-ds-background-gamepad-sparks-like-default)"]:not([class*="super"]):not([class*="Bgc($c-ds-background-gamepad-sparks-super-like-default)"])',
    'button[aria-label*="Like" i]:not([aria-label*="Super" i])',
    'button[data-testid*="gamepad-like"]',
    'button[data-testid*="like"]'
  ],

  NOPE_BUTTON: [
    'button[class*="gamepad-button"][class*="nope"]',
    'button[class*="gamepad-button-wrapper"] button[class*="nope"]',
    'button[class*="nope"]',
    'button[class*="Bgc($c-ds-background-gamepad-sparks-nope-default)"]',
    'button[aria-label*="Nope" i]',
    'button[aria-label*="Pass" i]',
    'button[aria-label*="Dislike" i]',
    'button[data-testid*="gamepad-nope"]',
    'button[data-testid*="nope"]'
  ],

  // Match list and message selectors
  MATCH_LIST: 'div[class*="matchList"]',
  MATCH_LIST_ITEM: 'a[href*="/app/messages/"]',
  MESSAGE_INPUT: 'textarea[id="chat-text-area"], textarea[placeholder*="message"], textarea[placeholder*="Type"]',

  // Tinder-specific grouped selectors (for backward compat)
  tinder: {
    likeButton: [
      'button[class*="gamepad-button"][class*="like"]:not([class*="super"]):not([class*="Bgc($c-ds-background-gamepad-sparks-super-like-default)"])',
      'button[class*="gamepad-button-wrapper"] button:not([class*="super"]):not([class*="Bgc($c-ds-background-gamepad-sparks-super-like-default)"])',
      'button[aria-label*="Like" i]:not([aria-label*="Super" i])'
    ],
    nopeButton: [
      'button[class*="gamepad-button"][class*="nope"]',
      'button[class*="gamepad-button-wrapper"] button[class*="nope"]',
      'button[aria-label*="Nope" i]',
      'button[aria-label*="Pass" i]'
    ],
    matchList: [
      'div[class*="matchList"]',
      'div[class*="matches"]',
      'div[class*="conversations"]'
    ]
  },

  // AI interface generic selectors
  ai: {
    input: [
      'textarea[class*="chat"]',
      'textarea[class*="message"]',
      'div[contenteditable="true"]'
    ],
    sendButton: 'button[class*="sendButton"]',
    output: [
      'div[class*="response"]',
      'div[class*="message"]',
      'div[class*="content"]'
    ]
  },

  // Messaging selectors
  MESSAGE_CONTAINER: 'div[class*="messageContainer"]',
  MESSAGE_BUBBLE: 'div[class*="messageBubble"]'
};

// Resilient element finder helper
window.findTinderButton = function (action) {
  if (!window.SELECTORS) return null;
  const isLike = action === 'like';
  const selectors = isLike ? window.SELECTORS.LIKE_BUTTON : window.SELECTORS.NOPE_BUTTON;

  // 1. Try CSS Selectors
  for (const selector of selectors) {
    try {
      const buttons = document.querySelectorAll(selector);
      for (const btn of buttons) {
        if (!btn.disabled && btn.offsetParent !== null) {
          if (isLike && (btn.className.includes('super') || (btn.getAttribute('aria-label') || '').toLowerCase().includes('super'))) {
            continue;
          }
          return btn;
        }
      }
    } catch (e) {
      // Ignore invalid selector syntax if any
    }
  }

  // 2. Fallback: Search all interactive buttons by ARIA label
  const allButtons = document.querySelectorAll('button[aria-label]');
  for (const btn of allButtons) {
    if (btn.disabled || btn.offsetParent === null) continue;
    const label = (btn.getAttribute('aria-label') || '').toLowerCase();
    if (isLike) {
      if (label.includes('like') && !label.includes('super')) return btn;
    } else {
      if (label.includes('nope') || label.includes('pass') || label.includes('dislike')) return btn;
    }
  }

  return null;
};

