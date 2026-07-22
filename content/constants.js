// content/constants.js
// Shared Constants for SpicySwipe

const APP_CONSTANTS = {
    // Tone options used in AI Settings and Approval Box
    TONE_OPTIONS: [
        { value: 'witty', label: '😏 Witty' },
        { value: 'friendly', label: '😊 Friendly' },
        { value: 'romantic', label: '💕 Romantic' },
        { value: 'casual', label: '😎 Casual' },
        { value: 'playful', label: '🎉 Playful' },
        { value: 'flirty', label: '😘 Flirty' },
        { value: 'confident', label: '💪 Confident' },
        { value: 'humorous', label: '😂 Humorous' }
    ],

    // Default configurations
    DEFAULT_CONFIG: {
        messaging: {
            tone: 'friendly',
            autoSend: false,
            autoMessageOnMatch: false,
            language: 'en'
        },
        swiping: {
            maxSwipes: 30,
            likeRatio: 0.7
        }
    }
};

// Ensure tones are consistent (some places use simplified labels)
const TONE_LABELS_SIMPLE = APP_CONSTANTS.TONE_OPTIONS.map(t => ({
    value: t.value,
    label: t.label.replace(/[\u{1F600}-\u{1F6FF}]/gu, '').trim()
}));
// Utility functions
function getTodayDateString() {
    return new Date().toISOString().slice(0, 10);
}

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
