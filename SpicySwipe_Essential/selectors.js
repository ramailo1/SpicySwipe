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

  // Button selectors - Updated to be more specific and exclude super likes
  LIKE_BUTTON: [
    'button[class*="gamepad-button"][class*="Bgc($c-ds-background-gamepad-sparks-like-default)"]:not([class*="super"]):not([class*="Bgc($c-ds-background-gamepad-sparks-super-like-default)"])',
    'button[class*="gamepad-button"][class*="like"]:not([class*="super"]):not([class*="Bgc($c-ds-background-gamepad-sparks-super-like-default)"])',
    'button[class*="Bgc($c-ds-background-gamepad-sparks-like-default)"]:not([class*="super"]):not([class*="Bgc($c-ds-background-gamepad-sparks-super-like-default)"])'
  ],

  NOPE_BUTTON: [
    'button[class*="gamepad-button"][class*="nope"]',
    'button[class*="gamepad-button-wrapper"] button[class*="nope"]',
    'button[class*="nope"]',
    'button[class*="Bgc($c-ds-background-gamepad-sparks-nope-default)"]'
  ],

  // Match list selectors
  MATCH_LIST: 'div[class*="matchList"]',
  matchListItemSelector: 'a[href*="/app/messages/"]',

  // Message input selectors
  MESSAGE_INPUT: 'textarea[class*="messageInput"]',

  // Tinder-specific selectors
  tinder: {
    likeButton: [
      'button[class*="gamepad-button"][class*="like"]:not([class*="super"]):not([class*="Bgc($c-ds-background-gamepad-sparks-super-like-default)"])',
      'button[class*="gamepad-button-wrapper"] button:not([class*="super"]):not([class*="Bgc($c-ds-background-gamepad-sparks-super-like-default)"])',
      'button[class*="like"]:not([class*="super"]):not([class*="Bgc($c-ds-background-gamepad-sparks-super-like-default)"])',
      'button[class*="Bgc($c-ds-background-gamepad-sparks-like-default)"]:not([class*="super"]):not([class*="Bgc($c-ds-background-gamepad-sparks-super-like-default)"])'
    ],
    nopeButton: [
      'button[class*="gamepad-button"][class*="nope"]',
      'button[class*="gamepad-button-wrapper"] button[class*="nope"]',
      'button[class*="nope"]',
      'button[class*="Bgc($c-ds-background-gamepad-sparks-nope-default)"]'
    ],
    matchList: [
      'div[class*="matchList"]',
      'div[class*="matches"]',
      'div[class*="conversations"]'
    ]
  },

  // AI interface selectors
  chatgpt: {
    input: [
      'textarea[class*="chat"]',
      'textarea[class*="message"]',
      'div[class*="input"][contenteditable="true"]'
    ],
    sendButton: 'button[class*="sendButton"]',
    output: [
      'div[class*="response"]',
      'div[class*="message"]',
      'div[class*="content"]'
    ],
    messageInput: 'textarea[class*="messageInput"]'
  },

  gemini: {
    input: [
      'textarea[class*="chat"]',
      'textarea[class*="message"]',
      'div[class*="input"][contenteditable="true"]'
    ],
    sendButton: 'button[class*="sendButton"]',
    output: [
      'div[class*="response"]',
      'div[class*="message"]',
      'div[class*="content"]'
    ],
    messageInput: 'textarea[class*="messageInput"]'
  },

  grok: {
    input: [
      'textarea[class*="chat"]',
      'textarea[class*="message"]',
      'div[class*="input"][contenteditable="true"]'
    ],
    sendButton: 'button[class*="sendButton"]',
    output: [
      'div[class*="response"]',
      'div[class*="message"]',
      'div[class*="content"]'
    ],
    messageInput: 'textarea[class*="messageInput"]'
  },

  // Messaging selectors
  MESSAGE_CONTAINER: 'div[class*="messageContainer"]',
  MESSAGE_BUBBLE: 'div[class*="messageBubble"]'
}; 