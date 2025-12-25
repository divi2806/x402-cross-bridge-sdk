# How to Update and Republish Packages

This guide shows how to make changes to your published packages and republish them as new versions.

---

## 📦 Versioning Strategy

Follow [Semantic Versioning](https://semver.org/):

- **PATCH** (1.0.0 → 1.0.1): Bug fixes, small improvements
- **MINOR** (1.0.0 → 1.1.0): New features (backward compatible)
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes

### Examples:

**PATCH (1.0.0 → 1.0.1):**
- Fix a bug in payment client
- Fix TypeScript types
- Update documentation
- Fix error messages

**MINOR (1.0.0 → 1.1.0):**
- Add new feature (backward compatible)
- Add new function/export
- Support new chain
- Add new configuration option

**MAJOR (1.0.0 → 2.0.0):**
- Remove deprecated function
- Change function signature
- Breaking API changes
- Remove support for something

---

## 🔄 Step-by-Step: Update and Republish

### Step 1: Make Your Changes

Edit your code, documentation, or configuration:

```bash
# Edit source files
vim packages/sdk/src/client/payment-client.ts

# Or edit documentation
vim packages/sdk/README.md
```

### Step 2: Build the Package

```bash
cd packages/sdk
pnpm build

# Verify build succeeded
ls dist/
```

### Step 3: Test Your Changes

```bash
# Test locally with npm pack
npm pack --dry-run

# Or install locally in a test project
npm pack
# Creates: x402-crosschain-sdk-1.0.1.tgz
# Test it in another project
```

### Step 4: Update Version

**Option A: Using npm version (Recommended)**

```bash
cd packages/sdk

# For bug fix
npm version patch  # 1.0.0 → 1.0.1

# For new feature
npm version minor  # 1.0.0 → 1.1.0

# For breaking change
npm version major  # 1.0.0 → 2.0.0
```

**What this does:**
- Updates `package.json` version
- Creates a git commit with the version
- Creates a git tag (optional)

**Option B: Manual Edit**

```bash
# Edit package.json manually
vim packages/sdk/package.json
# Change: "version": "1.0.0" → "version": "1.0.1"
```

### Step 5: Update Changelog (Optional but Recommended)

Create or update `CHANGELOG.md`:

```markdown
# Changelog

## [1.0.1] - 2024-01-15

### Fixed
- Fixed bug in cross-chain payment verification
- Updated TypeScript types for better compatibility

## [1.0.0] - 2024-01-10

### Added
- Initial release
- Cross-chain payment support via Relay Network
```

### Step 6: Commit Changes

```bash
# If you used npm version, it already created a commit
# Otherwise:
git add .
git commit -m "chore: bump version to 1.0.1

- Fixed payment verification bug
- Updated documentation"
```

### Step 7: Publish New Version

```bash
cd packages/sdk

# Publish to npm
npm publish --access public
```

**That's it!** Your new version is now live on npm.

---

## 🔄 Updating Both Packages Together

If you need to update both SDK and Facilitator:

### Option 1: Same Version (Recommended)

```bash
# Update SDK
cd packages/sdk
npm version patch
npm publish --access public

# Update Facilitator (same version)
cd ../facilitator
npm version patch
npm publish --access public
```

### Option 2: Script (For Convenience)

Add to root `package.json`:

```json
{
  "scripts": {
    "version:patch": "cd packages/sdk && npm version patch && cd ../facilitator && npm version patch",
    "version:minor": "cd packages/sdk && npm version minor && cd ../facilitator && npm version minor",
    "version:major": "cd packages/sdk && npm version major && cd ../facilitator && npm version major",
    "publish:sdk": "cd packages/sdk && npm publish --access public",
    "publish:facilitator": "cd packages/facilitator && npm publish --access public",
    "publish:all": "pnpm publish:sdk && pnpm publish:facilitator"
  }
}
```

Then:
```bash
# Version both
pnpm version:patch

# Publish both
pnpm publish:all
```

---

## 📝 Common Update Scenarios

### Scenario 1: Fix a Bug

```bash
# 1. Fix the bug
vim packages/sdk/src/client/payment-client.ts

# 2. Build
pnpm build

# 3. Version bump (patch)
npm version patch  # 1.0.0 → 1.0.1

# 4. Publish
npm publish --access public
```

### Scenario 2: Add a New Feature

```bash
# 1. Add new feature
vim packages/sdk/src/index.ts
# Export new function

# 2. Update README
vim packages/sdk/README.md

# 3. Build
pnpm build

# 4. Version bump (minor)
npm version minor  # 1.0.0 → 1.1.0

# 5. Publish
npm publish --access public
```

### Scenario 3: Update Documentation Only

```bash
# 1. Update README
vim packages/sdk/README.md

# 2. Version bump (patch - docs are patch)
npm version patch  # 1.0.0 → 1.0.1

# 3. Publish
npm publish --access public
```

### Scenario 4: Breaking Change

```bash
# 1. Make breaking changes
vim packages/sdk/src/index.ts
# Remove deprecated function, change API

# 2. Update README with migration guide
vim packages/sdk/README.md

# 3. Build
pnpm build

# 4. Version bump (major)
npm version major  # 1.0.0 → 2.0.0

# 5. Publish
npm publish --access public
```

---

## ✅ Pre-Publish Checklist (For Updates)

Before republishing:

- [ ] Changes tested locally
- [ ] Package builds successfully (`pnpm build`)
- [ ] TypeScript types generated
- [ ] Version number updated
- [ ] README updated (if needed)
- [ ] CHANGELOG updated (if you maintain one)
- [ ] No new secrets added
- [ ] `.npmignore` still correct
- [ ] `files` field in `package.json` still correct

---

## 🔍 Verify Your Update

After publishing:

1. **Check npm:**
   ```
   https://www.npmjs.com/package/@x402-crosschain/sdk
   ```
   - Should show new version
   - Should show updated README

2. **Test installation:**
   ```bash
   npm install @x402-crosschain/sdk@latest
   # or specific version
   npm install @x402-crosschain/sdk@1.0.1
   ```

3. **Verify package contents:**
   ```bash
   npm view @x402-crosschain/sdk versions
   npm view @x402-crosschain/sdk version
   ```

---

## 🚨 Important Notes

### 1. **Version Numbers are Immutable**

Once published, you **cannot** republish the same version. If you make a mistake:

```bash
# Wrong: Can't do this
npm publish  # Tries to publish 1.0.1 again - will fail

# Right: Bump version again
npm version patch  # 1.0.1 → 1.0.2
npm publish
```

### 2. **Unpublishing is Limited**

You can unpublish within 72 hours, but it's discouraged:

```bash
# Only if absolutely necessary (within 72 hours)
npm unpublish @x402-crosschain/sdk@1.0.1
```

**Better approach:** Just publish a new version with the fix.

### 3. **Keep Versions in Sync (If Related)**

If SDK and Facilitator are tightly coupled:
- Keep same version numbers
- Update both together
- Document breaking changes in both

### 4. **Git Tags**

`npm version` creates git tags automatically. Push them:

```bash
git push origin main --tags
```

---

## 📋 Quick Reference

### Update SDK Only

```bash
cd packages/sdk
# Make changes...
pnpm build
npm version patch  # or minor/major
npm publish --access public
```

### Update Facilitator Only

```bash
cd packages/facilitator
# Make changes...
pnpm build
npm version patch  # or minor/major
npm publish --access public
```

### Update Both

```bash
# SDK
cd packages/sdk
pnpm build
npm version patch
npm publish --access public

# Facilitator
cd ../facilitator
pnpm build
npm version patch
npm publish --access public
```

---

## 🎯 Best Practices

1. **Always build before publishing:**
   ```bash
   pnpm build
   ```

2. **Test locally first:**
   ```bash
   npm pack
   # Test the .tgz file
   ```

3. **Use semantic versioning:**
   - Bug fix → patch
   - New feature → minor
   - Breaking change → major

4. **Update CHANGELOG:**
   - Document what changed
   - Help users understand updates

5. **Commit version bump:**
   - `npm version` does this automatically
   - Or commit manually

6. **Push to GitHub:**
   ```bash
   git push origin main --tags
   ```

---

## 📊 Version History Example

```
1.0.0 - Initial release
1.0.1 - Fixed payment verification bug
1.0.2 - Updated documentation
1.1.0 - Added support for Solana
1.1.1 - Fixed Solana integration bug
2.0.0 - Breaking: Changed API signature
2.0.1 - Fixed migration issue
```

---

## 🚀 Summary

**To update and republish:**

1. Make changes
2. Build: `pnpm build`
3. Version: `npm version patch|minor|major`
4. Publish: `npm publish --access public`
5. Verify on npm website

**That's it!** Your updated package is now live. 🎉

