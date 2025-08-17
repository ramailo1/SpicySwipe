# Changelog

All notable changes to this project will be documented in this file.

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