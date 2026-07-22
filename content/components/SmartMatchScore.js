// SmartMatchScore.js – Chrome extension content component
// This component creates an overlay badge on each Tinder profile card showing a
// "Smart Match Score" calculated from basic profile data (age, distance,
// common interests). The implementation is intentionally lightweight and runs
// entirely in the content script context.

(function () {
    // Utility to compute a simple heuristic score (0‑100)
    function computeMatchScore(profile) {
        // Basic example: age similarity, distance, and number of common interests
        const ageScore = Math.max(0, 100 - Math.abs((profile.age || 25) - 25) * 2); // target age 25
        const distanceScore = Math.max(0, 100 - (profile.distance || 0) * 0.5); // closer is better
        const interestsScore = Math.min(100, (profile.commonInterests || 0) * 20);
        const total = (ageScore + distanceScore + interestsScore) / 3;
        return Math.round(total);
    }

    // Create overlay element
    function createScoreBadge(score) {
        const badge = document.createElement('div');
        badge.className = 'smart-match-score-badge';

        // Icon SVG (flame/sparkle)
        const iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right:4px;">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;

        badge.innerHTML = `${iconSvg} <span style="font-weight:700;">${score}% Match</span>`;

        // Styling – Vibrant Gradient & Premium Feel
        badge.style.position = 'absolute';
        badge.style.top = '12px';
        badge.style.right = '12px';
        badge.style.padding = '6px 14px';
        // Linear gradient: Pink -> Purple -> Orange
        badge.style.background = 'linear-gradient(135deg, #FF655B 0%, #FD297B 50%, #FF5864 100%)';
        badge.style.backdropFilter = 'blur(4px)'; // Slight blur for texture
        badge.style.borderRadius = '20px'; // Pill shape
        badge.style.fontSize = '14px';
        badge.style.color = '#fff';
        badge.style.zIndex = '9999';
        badge.style.boxShadow = '0 4px 15px rgba(253, 41, 123, 0.4)'; // Glow effect
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.fontFamily = '"Proxima Nova", "Helvetica Neue", Arial, sans-serif';
        badge.style.textTransform = 'uppercase';
        badge.style.letterSpacing = '0.5px';
        badge.style.border = '1px solid rgba(255,255,255,0.3)';

        // Add Pulse Animation
        const styleId = 'smart-match-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                @keyframes pulse-glow {
                    0% { transform: scale(1); box-shadow: 0 4px 15px rgba(253, 41, 123, 0.4); }
                    50% { transform: scale(1.05); box-shadow: 0 6px 20px rgba(253, 41, 123, 0.6); }
                    100% { transform: scale(1); box-shadow: 0 4px 15px rgba(253, 41, 123, 0.4); }
                }
            `;
            document.head.appendChild(style);
        }
        badge.style.animation = 'pulse-glow 2s infinite ease-in-out';

        // Add tooltip
        badge.title = 'AI Smart Match Score based on compatibility';
        return badge;
    }

    // Main function to attach badge to a profile card element
    function attachSmartMatchScore(profileCard, profileData) {
        if (!profileCard || !profileData) return;

        // Ensure we don't duplicate badges
        const existing = profileCard.querySelector('.smart-match-score-badge');
        if (existing) return;

        const score = computeMatchScore(profileData);
        const badge = createScoreBadge(score);

        // Ensure profileCard has relative position for absolute badge
        const computedStyle = window.getComputedStyle(profileCard);
        if (computedStyle.position === 'static') {
            profileCard.style.position = 'relative';
        }

        profileCard.appendChild(badge);
        console.log('[Tinder AI] Smart Match Score attached:', score);
    }

    // Scan for profile cards and attach scores if missing
    window.scanAndAttachScores = function () {
        // Find valid cards
        const stack = document.querySelector('.recsCardboard__cardsContainer, .recsCardboard__cards');
        if (!stack) return;

        // Use specific selector for cards
        const cards = stack.querySelectorAll('div[data-keyboard-gamepad]');

        cards.forEach(card => {
            // Skip if already attached
            if (card.querySelector('.smart-match-score-badge')) return;

            // Skip inert/hidden cards
            if (card.hasAttribute('inert') || card.getAttribute('aria-hidden') === 'true') return;

            // Extract basic info for heuristic (simplified extraction to avoid recursion loops)
            const ageSpan = card.querySelector('span[itemprop="age"]');
            const age = ageSpan ? parseInt(ageSpan.textContent.trim()) : 0;
            const interests = card.querySelectorAll('div[class*="tag"], div[class*="badge"]').length;

            const profileData = {
                age: age || 25, // Fallback
                distance: 10,
                commonInterests: interests
            };

            // Attach
            attachSmartMatchScore(card, profileData);
        });
    };

    // Expose functions globally
    window.computeMatchScore = computeMatchScore;
    window.createScoreBadge = createScoreBadge;
    window.attachSmartMatchScore = attachSmartMatchScore;
    window.scanAndAttachScores = scanAndAttachScores;

    console.log('[Tinder AI] SmartMatchScore component loaded');
})();
