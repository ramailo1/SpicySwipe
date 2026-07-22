# Changelog

All notable changes to this project will be documented in this file.

## [1.4.1] - 2026-07-22
### 🚀 Features, Security Hardening & UI Contrast Fixes

#### 🦙 **Local Ollama AI Integration**
- **Ollama Model Option**: Added **Ollama (Local AI)** option to the model selection dropdown in both AI Settings and the Onboarding Wizard.
- **Customizable Endpoints**: Added dedicated UI controls for configuring `Ollama Base URL` (defaults to `http://localhost:11434`) and `Ollama Model` (defaults to `llama3.2`).
- **No-Key Setup**: Integrated local Ollama execution without requiring external API keys.

#### 🛡️ **Cybersecurity Hardening & Vulnerability Remediation**
- **XSS Prevention**: Added global `escapeHTML()` sanitization across content scripts and wrapped all dynamic profile interpolations (`name`, `interests`, `age`) in `Sidebar.js` and `ApprovalUI.js`.
- **Sender Verification**: Implemented strict `sender.id === chrome.runtime.id` verification in `background.js` to block unauthorized runtime messaging.
- **Header Key Transport**: Updated Gemini API requests to pass credentials via `x-goog-api-key` HTTP headers instead of URL query parameters.

#### 🤖 **Dynamic AI Auto-Detect & Fallback Fixes**
- **Key Storage Alignment**: Unified Gemini API key verification to check `geminiApiKey` across all storage operations.
- **Promise Callback Fix**: Resolved missing response promise resolution in the Claude API integration handler.

#### 🎨 **UI Contrast & Onboarding Enhancements**
- **Dark Glassmorphism Card**: Redesigned `.spicyswipe-wizard-box` with dark glass styling (`rgba(18, 18, 26, 0.96)`), glowing borders, and crisp white typography.
- **Form Controls & Buttons**: Applied dark slate containers to form controls (`#wizard-ai-model`, `#wizard-api-key`) and gradient styling to action buttons and tone selection chips.

## [1.4.0] - 2026-01-15
### 🚀 Major Feature Release: Dynamic Themes & Human-Like Stealth

#### 🎨 **Dynamic Theme Engine**
- **Seasonal Themes**: Automatically detects seasons and applies immersive themes:
  - ❄️ **Winter Wonderland** (Dec-Jan)
  - 💘 **Cupid's Choice** (Feb)
  - ☀️ **Summer Vibes** (Jun-Aug)
  - 🎃 **Spooky Season** (Oct)
- **Manual Cycle**: New Sidebar header button to cycle through all themes, including **Dark**, **Light**, and **Spicy**.
- **Auto-Detection Notification**: Toast notification alerts when a seasonal theme is auto-activated.

#### 🕵️‍♂️ **Advanced Anti-Detection**
- **Human-Like Mouse Movement**: Implemented **Bezier Curve** algorithms to simulate natural, non-linear cursor paths.
- **Natural Timing**: Replaced random delays with **Gaussian (Bell Curve) Distribution** for realistic reaction times.
- **Typing Simulation**: Text inputs now mimic human typing speeds, including "flight time" between keys and occasional "thinking" pauses.

#### 🏗️ **Architecture**
- **Modular Refactor**: Confirmed robust separation of concerns with `ThemeManager.js` and component isolation.

## [1.3.0] - 2026-01-13
### 🚀 Features & Updates

#### 🤖 **AI & API Updates**
- **Introduction of GPT-5.1**: Updated OpenAI integration to use the cutting-edge `gpt-5.1` model for superior reasoning and conversational flow.
- **Claude 4.5 Sonnet**: Upgraded Anthropic integration to `claude-4.5-sonnet`, enabling advanced agentic capabilities.
- **Gemini 2.0 Integration**: Defaulted to `gemini-2.0-flash` for high-speed, free-tier access.
- **DeepSeek V3**: Standardized DeepSeek V3 integration.

#### 🌍 **Store Localization**
- **Edge Store Support**: Migrated to `_locales` directory structure to ensure the extension is correctly detected as multilingual in the Edge/Chrome Web Store.
- **Manifest Updates**: Localized `name` and `description` fields in `manifest.json`.

## [1.2.5] - 2025-06-29
### ✨ New Features & Fixes

#### ⚙️ **Developer & Debugging**
- **Debug Mode Toggle**: Added a debug mode switch in the popup to enable/disable console logging.
- **Conditional Logging**: Console logs are now suppressed by default and only active when debug mode is enabled.
- **CSP Fix**: Updated the Content Security Policy to allow loading fonts from Google Fonts, fixing console errors.


## [1.2.4] - 2025-06-28
### 🚀 Major Update: Enhanced User Experience & Privacy

#### 🔐 **Privacy & Consent Management**
- 🔄 **Reset Consent Button**: Added a "Reset Consent & Revoke Access" button in the swiping tab
- 🛡️ **User Control**: Users can now revoke consent and reset the extension state without developer tools
- ⚡ **One-Click Reset**: Simple button click with confirmation dialog to reset consent status
- 🔄 **Auto-Reload**: Page automatically reloads after consent reset to show consent overlay again
- 🔐 **User Autonomy**: Enhanced user control over extension permissions and data access
- 🛡️ **Privacy Compliance**: Better alignment with privacy regulations through explicit consent management

#### 🌍 **Internationalization & Localization**
- 🌍 **Multi-Language Support**: Added support for 9 languages (English, French, Spanish, German, Italian, Portuguese, Arabic, Chinese, Korean, Japanese)
- 🔄 **Automatic Language Detection**: Extension now detects browser language and loads appropriate translations
- 🎛️ **Language Selector**: Added language dropdown in sidebar for manual language switching
- 💾 **Language Persistence**: User's language preference is saved and remembered across sessions
- 🛡️ **Fallback Support**: Graceful fallback to English if translations are missing
- 🔧 **Improved i18n System**: Robust internationalization utility with parameter substitution

#### 🎨 **UI/UX Enhancements**
- 📝 **Updated UI**: All sidebar text elements now use translated content
- 🎨 **Enhanced Styling**: Added CSS styles for language selector dropdown
- 🌙 **Dark Mode Support**: Full dark/light theme toggle functionality
- 🎛️ **Theme Toggle**: Theme toggle button in the sidebar with persistence

#### 📦 **Technical Infrastructure**
- 📁 **New Files**: Added translation files in `locales/` directory
- 🛠️ **New Utility**: Created `utils/i18n.js` for language management
- 📦 **Manifest Updates**: Updated manifest to include locales in web accessible resources

## [1.2.2] - 2025-06-25
### Added
- Custom AI prompt instructions for each message tone (e.g., Extra Naughty, Meme Lord, Super Romantic, etc.)
- Improved AI message generation: selected tone now directly affects the style and content of generated messages.
- All tone options are now available in the AI tab, Settings, and approval/translation bar.

### Changed
- Enhanced prompt logic to ensure the AI output matches the selected tone.

### Fixed
- Consistent tone dropdowns across all relevant UI sections.

## [1.2.1] - 2025-06-23
### Changed
- Sidebar and popup UI: All labels, section headers, and important text are now pure white for maximum clarity on dark backgrounds.
- Input fields (including API key) now fit perfectly in the sidebar and do not overflow.
- API key input and AI model select are visually consistent in width (160px).
- Improved spacing and grouping for settings sections.
- Checkbox and label alignment improved for a more polished look.

### Fixed
- Fixed input overflow and text contrast issues in the AI and Swiping tabs.
- Fixed sidebar text visibility issues caused by previous color overrides.

## [1.2.0] - 2025-06-24
### Added
- Privacy policy for store compliance (`docs/privacy.html`).
- Debug logs for compliance and troubleshooting.

### Changed
- Version bump to 1.2.0 in `manifest.json`.
- Updated description for privacy and logs compliance.
- Improved AI model dropdown to include both Google Gemini (Free) and Gemini Pro (Paid).
- "Save All Settings" now saves the API key for the selected model.

### Fixed
- Wand button and AI button now only appear after user consent.
- DOM mutation handler now re-injects wand buttons if they disappear after UI changes.
- Removed undefined `setupSidebarConsent` call to prevent initialization errors.
- Improved reliability of AI generation and UI injection.


---

## [Older versions]
See commit history for details prior to 1.2.0.