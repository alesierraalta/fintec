# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Planned Playwright multi-viewport swipe verification for mobile APK testing (#94).

## [0.2.0] - 2026-10-17

### Added

- **Low-Friction Capture Suite**:
  - Balance Reconciliation (`reconcile-balance-modal.tsx`): Instantly align recorded account balances with reality via a single adjustment transaction (INCOME/EXPENSE) that updates balance and counts toward financial statistics (#96).
  - Quick Multi-Entry (`quick-entry-modal.tsx`): Rapid shorthand input (`café 2, taxi 5`) with intelligent segment splitting, amount-first/amount-last detection, and batch submission.
  - Bank Statement CSV Import (`statement-import-modal.tsx`): Upload CSV bank statements with auto-delimiter detection (BOM, semicolon, comma), column guessing for Venezuelan and international headers, and date-range duplicate detection.
- **AI Receipt Scanner**:
  - Integration with Gemini Flash for fiscal invoice parsing (RIF, Factura Fiscal, Subtotal, IVA, IGTF, Descuento).
  - Progressive photo review modal with itemized line items and category suggestion.
  - Multi-receipt batch uploader with background processing.
- **P2P & Rate Estimations**:
  - Binance P2P estimator with reference hint, payment method filters, and fallback age bounding.
- **Capacitor Mobile & Android Platform**:
  - In-app update flow for Android APK releases without external redirects.
  - Safe area insets (`env(safe-area-inset-*)`), dynamic dvh viewport, and haptic feedback.
  - Swipeable transaction cards with fixed 148px travel and 44px minimum touch targets.
- **Legal & Data Rights**:
  - Data privacy and user data export/deletion endpoints (`/api/account/data-rights`).

### Changed

- Refactored mobile drawer to use 60fps GPU CSS transitions instead of heavy JavaScript motion.
- Replaced emoji placeholders across the entire application with accessible SVG Lucide icons.
- Redesigned landing page with AA/AAA high-contrast color tokens and editorial layout.

### Performance

- **Android WebView**: Removed residual CSS backdrop-blur filters (`.glass`, `.ios-header`, `.ios-card`) in WebView, reducing Perfetto deadline misses from 6.08% to 0.54% (-60.9% RenderThread time, #93).
- **Data Sync & Routing**: Fast-path auth bypass on route transitions and stale-while-revalidate caching.

### Fixed

- Fixed bank statement duplicate detection for historical months by querying `findByDateRange` beyond in-memory cache limit.
- Fixed `parseAmountInput` to support negative accounting parentheses `(12.50)` and Venezuelan/international currency prefixes (`Bs.`, `VES`, `USD`, `EUR`).
- Fixed transfer badge classification in receipt scanner to prevent suggesting categories for transfer transactions.
- Fixed mobile layout overflows in Income Sources dashboard.

## [0.1.0] - 2026-06-01

### Added

- Initial release of FinTec personal finance platform.
- Multi-currency support (USD, VES, EUR).
- Supabase authentication and database integration.
- Accounts, transactions, categories, and debts tracking.
