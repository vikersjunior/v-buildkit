# Viker's BuildKit — Trusted Publishing Setup

## Status

```text
READY FOR FIRST PUBLICATION
```

## Repository

```text
vikersjunior/v-buildkit
```

## Package

```text
vikers-buildkit
```

## Workflow

```text
.github/workflows/publish.yml
```

---

## Authentication Mechanism

Viker's BuildKit uses **npm Trusted Publishing (OIDC)** via GitHub Actions:

- **Permissions**: `permissions: id-token: write`
- **Zero Secrets**: No long-lived `NPM_TOKEN` or `NODE_AUTH_TOKEN` stored in GitHub secrets.
- **Signed Provenance**: Releases are published with `--provenance` verifying exact git commit and release tag origin.

---

## First Publication & Trusted Publisher Setup

1. **First Manual Publication (`2.4.0`)**:  
   Because npm requires a package to exist before configuring package-level Trusted Publishers in the npm dashboard, publish `2.4.0` once from your terminal using web authentication / WebAuthn / OTP:
   ```bash
   npm publish --access public
   ```

2. **Configure Trusted Publisher on npm.com**:  
   After publishing `2.4.0`, navigate to `https://www.npmjs.com/package/vikers-buildkit/access` -> **Publishing Access** -> **Add Trusted Publisher** and select **GitHub Actions**:
   - **GitHub owner**: `vikersjunior`
   - **Repository**: `v-buildkit`
   - **Workflow filename**: `publish.yml`
   - **Environment**: *(leave blank unless using GitHub Environments)*

---

## Future Automated Releases

Once Trusted Publishing is configured, all future releases will be fully automated:

```bash
npm version patch       # or minor/major
git push origin main --follow-tags
```

Pushing a tag like `v2.4.1` triggers `.github/workflows/publish.yml`, which runs tests and publishes to npm via OIDC without requiring 2FA OTP codes.

---

## Verification Results

| Test Step | Status | Evidence |
|---|---|---|
| `npm test` | **PASS** | 22/22 tests passing |
| `npm pack --dry-run` | **PASS** | Package manifest clean (305 files, 1.2 MB tarball) |
| `npm pack` | **PASS** | Built `vikers-buildkit-2.4.0.tgz` cleanly |
| `.github/workflows/publish.yml` | **PASS** | Validated tag-triggered OIDC workflow (`id-token: write`) |

---

## Next Step for Developer

Run the single manual publish command for `2.4.0`:

```bash
npm publish --access public
```

Then visit `https://www.npmjs.com/package/vikers-buildkit/access` to add `publish.yml` as your Trusted Publisher.
