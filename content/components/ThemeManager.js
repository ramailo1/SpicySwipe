// content/components/ThemeManager.js
// Handles Dynamic Theme Engine, Seasonal Detection, and CSS Injection

const THEME_MANAGER = {
    currentTheme: 'dark',
    autoMode: true,

    // Theme Definitions with CSS Variables
    themes: {
        dark: {
            name: 'Dark Mode',
            icon: '🌙',
            vars: {
                '--tinder-gradient': 'linear-gradient(135deg, #fd267a 0%, #ff7854 100%)',
                '--glass-bg': 'rgba(20, 20, 30, 0.85)',
                '--glass-border': 'rgba(255, 255, 255, 0.1)',
                '--text-primary': '#ffffff',
                '--text-secondary': '#aaaaaa'
            }
        },
        light: {
            name: 'Light Mode',
            icon: '☀️',
            vars: {
                '--tinder-gradient': 'linear-gradient(135deg, #fd267a 0%, #ff7854 100%)',
                '--glass-bg': 'rgba(255, 255, 255, 0.9)',
                '--glass-border': 'rgba(0, 0, 0, 0.1)',
                '--text-primary': '#000000',
                '--text-secondary': '#555555'
            }
        },
        spicy: {
            name: 'Spicy Mode',
            icon: '🌶️',
            vars: {
                '--tinder-gradient': 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', // Deep Red
                '--glass-bg': 'rgba(40, 0, 0, 0.9)',
                '--glass-border': 'rgba(255, 50, 50, 0.2)',
                '--text-primary': '#ffebeb',
                '--text-secondary': '#ffb3b3'
            }
        },
        winter: {
            name: 'Winter Wonderland',
            icon: '❄️',
            vars: {
                '--tinder-gradient': 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', // Icy Blue
                '--glass-bg': 'rgba(240, 248, 255, 0.85)',
                '--glass-border': 'rgba(161, 196, 253, 0.4)',
                '--text-primary': '#1e3a8a',
                '--text-secondary': '#60a5fa'
            }
        },
        valentine: {
            name: 'Cupid\'s Choice',
            icon: '💘',
            vars: {
                '--tinder-gradient': 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', // Soft Pink/Blue
                '--glass-bg': 'rgba(255, 240, 245, 0.9)',
                '--glass-border': 'rgba(255, 182, 193, 0.4)',
                '--text-primary': '#db2777',
                '--text-secondary': '#ec4899'
            }
        },
        summer: {
            name: 'Summer Vibes',
            icon: '☀️',
            vars: {
                '--tinder-gradient': 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', // Sunny Orange
                '--glass-bg': 'rgba(255, 250, 240, 0.9)',
                '--glass-border': 'rgba(253, 160, 133, 0.3)',
                '--text-primary': '#c05621',
                '--text-secondary': '#ed8936'
            }
        },
        spooky: {
            name: 'Spooky Season',
            icon: '🎃',
            vars: {
                '--tinder-gradient': 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)', // Orange/Red
                '--glass-bg': 'rgba(20, 0, 10, 0.9)',
                '--glass-border': 'rgba(255, 100, 0, 0.3)',
                '--text-primary': '#ffedd5',
                '--text-secondary': '#fdba74'
            }
        }
    },

    async init() {
        console.log('[Tinder AI] Initializing Theme Manager...');
        const stored = await chrome.storage.local.get(['theme', 'autoTheme']);

        // If auto mode is on (or undefined/default), verify season
        this.autoMode = stored.autoTheme !== false;

        if (this.autoMode) {
            this.currentTheme = this.detectSeason();
            // User requested indication when seasonal theme is activated automatically
            if (this.currentTheme !== 'dark' && this.currentTheme !== 'light') {
                setTimeout(() => {
                    if (typeof showToastNotification === 'function') {
                        const def = this.themes[this.currentTheme];
                        showToastNotification(`Seasonal Theme Active: ${def.name} ${def.icon}`);
                    }
                }, 1000);
            }
        } else {
            this.currentTheme = stored.theme || 'dark';
        }

        this.applyTheme(this.currentTheme);
    },

    // Detect season based on current date
    detectSeason() {
        const now = new Date();
        const month = now.getMonth() + 1; // 1-12
        const day = now.getDate();

        // October -> Spooky
        if (month === 10) return 'spooky';

        // December/January -> Winter
        if (month === 12 || month === 1) return 'winter';

        // February 1-15 -> Valentine
        if (month === 2 && day <= 15) return 'valentine';

        // June/July/August -> Summer
        if (month >= 6 && month <= 8) return 'summer';

        // Default
        return 'dark';
    },

    // Apply theme variables to root
    applyTheme(themeName) {
        if (!this.themes[themeName]) themeName = 'dark';

        const theme = this.themes[themeName];
        this.currentTheme = themeName;

        const root = document.documentElement;

        // Remove old classes (both patterns for compatibility)
        Object.keys(this.themes).forEach(t => {
            root.classList.remove(`${t}-theme`);
            root.classList.remove(t);
        });

        // Add new class (both patterns for CSS compatibility)
        root.classList.add(`${themeName}-theme`);
        root.classList.add(themeName);

        // Also update sidebar class if it exists
        const sidebar = document.getElementById('tinder-ai-sidebar');
        if (sidebar) {
            Object.keys(this.themes).forEach(t => {
                sidebar.classList.remove(t);
                sidebar.classList.remove(`${t}-theme`);
            });
            sidebar.classList.add(themeName);
        }

        // Inject CSS Variables
        for (const [key, value] of Object.entries(theme.vars)) {
            root.style.setProperty(key, value);
        }

        // Persist
        chrome.storage.local.set({ theme: themeName });
        console.log(`[Tinder AI] Applied theme: ${theme.name} ${theme.icon}`);

        // Update toggle button text if sidebar exists
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.textContent = theme.icon;
    },

    // List of themes that can be manually cycled via toggle button
    CORE_THEMES: ['dark', 'light'],

    // Cycle to next core theme
    cycleTheme() {
        const currentIndex = this.CORE_THEMES.indexOf(this.currentTheme);
        // If current theme is seasonal (not in core), start from the beginning of core
        const nextIndex = (currentIndex === -1) ? 0 : (currentIndex + 1) % this.CORE_THEMES.length;
        const nextTheme = this.CORE_THEMES[nextIndex];

        // Disable auto mode if user manually cycles
        this.autoMode = false;
        chrome.storage.local.set({ autoTheme: false });

        this.applyTheme(nextTheme);
        return this.themes[nextTheme];
    },

    // Enable auto mode
    enableAutoMode() {
        this.autoMode = true;
        chrome.storage.local.set({ autoTheme: true });
        const seasonal = this.detectSeason();
        this.applyTheme(seasonal);
        return seasonal;
    }
};

// Initialize on load
THEME_MANAGER.init();
