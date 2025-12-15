# Product Requirements Document: Comprehensive Dependency Cleanup

## 1. Introduction
This document outlines the requirements for a comprehensive cleanup of the project's dependencies and codebase. The primary objective is to remove unused libraries, specifically targeting `paddle` and `lemonsqueezy`, along with any other detected unused packages, to reduce bundle size and maintenance overhead.

## 2. Goals
*   **Remove Unused Dependencies:** Uninstall packages that are no longer imported or used in the project.
*   **Clean Codebase:** Permanently delete source files, hooks, and utilities associated with removed dependencies.
*   **Ensure Stability:** Verify that the application builds and passes all tests after the cleanup.

## 3. User Stories
*   As a **developer**, I want to identify all unused dependencies so that I can keep the project lightweight.
*   As a **developer**, I want to remove the specific implementations of `paddle` and `lemonsqueezy` because we have migrated away from them (or they are no longer needed).
*   As a **maintainer**, I want to ensure that removing these dependencies does not break existing functionality or the build process.

## 4. Functional Requirements

### 4.1. Dependency Analysis
*   The system must perform a scan of the codebase to identify unused dependencies in `package.json`.
*   Tools like `depcheck` or similar analysis methods should be used to assist in detection.
*   **Targeted Removal:** Explicitly confirm usage and removal plan for:
    *   `@paddle/paddle-js` (and related)
    *   Lemon Squeezy SDKs (if present)

### 4.2. Code Removal
*   Identify and permanently delete files associated with the target dependencies.
*   **Specific targets for deletion (examples based on file structure):**
    *   `hooks/use-paddle.ts`
    *   `hooks/use-paddle-products.ts`
    *   `hooks/use-lemon-squeezy-products.ts`
    *   `lib/paddle/*`
    *   `lib/lemonsqueezy/*`
    *   Any components exclusively using these hooks/libs.
*   Remove `import` statements and associated logic from consuming files (e.g., global providers or layouts) to prevent build errors.

### 4.3. Package Uninstallation
*   Execute `npm uninstall` (or equivalent) for the identified packages.
*   Update `package.json` and `package-lock.json`.

### 4.4. Verification
*   Run `npm run build` to ensure no missing imports cause compilation failures.
*   Run `npm run test` to ensure no logic regressions occurred.

## 5. Non-Goals
*   Refactoring code that is not directly related to the removed dependencies.
*   Archiving code (deleted code will be recoverable via Git history, but no local backup folders will be created).

## 6. Success Metrics
*   Reduction in `node_modules` size (optional but expected).
*   `package.json` contains only actively used dependencies.
*   Build process (`npm run build`) completes successfully with exit code 0.
*   Test suite (`npm run test`) passes with exit code 0.

## 7. Technical Considerations
*   **Depcheck Configuration:** Be careful with "false positives" (dependencies used in scripts, config files like `tailwind.config.ts`, or `eslint` plugins that aren't imported in `.ts` files). These must be excluded from removal.
*   **Global Contexts:** Check `app/layout.tsx` or `providers/index.ts` carefully, as payment providers are often wrapped globally.

## 8. Open Questions
*   Are there any "soft" dependencies (libraries used only for types or specifically strictly in a single script) that might be missed by static analysis?
