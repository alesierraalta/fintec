# Release Process & Versioning Guide

FinTec follows [Semantic Versioning 2.0.0](https://semver.org/) and the [Keep a Changelog](https://keepachangelog.com/) standard.

---

## 1. Versioning Scheme

`MAJOR.MINOR.PATCH`

- **MAJOR (x.0.0)**: Incompatible architectural migrations, destructive database changes, or breaking API/contract modifications.
- **MINOR (0.x.0)**: New user-facing features, non-breaking schema additions, new domain services, or significant optimizations.
- **PATCH (0.0.x)**: Backward-compatible bug fixes, performance tweaks, security hardening, or non-functional refactors.

---

## 2. Release Checklist

Before creating a release, ensure all gates pass:

### Step 1: Test Suite Verification

Run the full verification suite:

```bash
pnpm test:ci
pnpm type-check
pnpm lint
```

### Step 2: Quality & Performance Validation

- For mobile changes: Verify Android APK builds (`pnpm build:mobile`) and WebView rendering (Perfetto deadline misses < 1.0%).
- For financial changes: Ensure multi-currency precision tests and TSP exploit test suites pass without regressions.

### Step 3: Changelog Maintenance

Review all commits merged to `main` since the previous release tag:

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

Update `CHANGELOG.md`: move items from `## [Unreleased]` into a new section `## [X.Y.Z] - YYYY-MM-DD`.
Organize into Keep a Changelog categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`, `Performance`.

### Step 4: Version Bump

Update `"version"` in `package.json`.

### Step 5: Commit & Tag

Commit and tag the release:

```bash
git add package.json CHANGELOG.md
git commit -m "chore(release): bump version to vX.Y.Z and update changelog"
git tag -a vX.Y.Z -m "Release vX.Y.Z - <summary>"
```

### Step 6: Push & GitHub Release

Push commits and create release:

```bash
git push origin main --tags
gh release create vX.Y.Z --title "vX.Y.Z" --notes-file <(sed -n '/## \[X.Y.Z\]/,/## \[/p' CHANGELOG.md | head -n -1)
```

---

## 3. Hotfix Process

For urgent production fixes:

1. Branch from the latest release tag: `git checkout -b fix/issue-name vX.Y.Z`.
2. Apply fix with TDD (RED -> GREEN).
3. Update `CHANGELOG.md` under `[X.Y.Z+1]`.
4. Bump patch version in `package.json`.
5. PR into `main` with `type:bug` label.
