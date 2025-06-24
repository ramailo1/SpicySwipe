# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2024-06-09
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

## [1.2.1] - 2024-06-09
### Changed
- Sidebar and popup UI: All labels, section headers, and important text are now pure white for maximum clarity on dark backgrounds.
- Input fields (including API key) now fit perfectly in the sidebar and do not overflow.
- API key input and AI model select are visually consistent in width (160px).
- Improved spacing and grouping for settings sections.
- Checkbox and label alignment improved for a more polished look.

### Fixed
- Fixed input overflow and text contrast issues in the AI and Swiping tabs.
- Fixed sidebar text visibility issues caused by previous color overrides.

---

## [Older versions]
See commit history for details prior to 1.2.0. 