# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2026-08-06

### Added

- **WhatsApp → Send Message**: supports Text, Attachment (image, video, audio, document, sticker), Location, Contacts, Interactive (CTA URL, button, list, location request), and Template (body parameters, media header, quick-reply / dynamic-URL / coupon-code / flow buttons, carousel)
- **WhatsApp → Get Status Report**: retrieve delivery status by request ID
- **WhatsApp → Read Receipts**: mark incoming messages as read with optional typing indicator
- **WhatsApp → Download Media**: download media by media ID
- **Direct7 API** credential with Bearer token authentication and automatic token-verification test

### Fixed

- Renamed package from the reserved `@n8n/n8n-nodes-direct7` scope to `n8n-nodes-direct7`, following n8n's community node naming convention
- Replaced placeholder `docs.n8n.io` documentation links (credential, node codex, README) with real repository links
- Added `repository` and `engines` fields to `package.json`, and a root `LICENSE` file
- Added a GitHub Actions CI workflow to run lint and build on every push/PR
