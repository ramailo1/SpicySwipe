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

---

## [Older versions]
See commit history for details prior to 1.2.0. 