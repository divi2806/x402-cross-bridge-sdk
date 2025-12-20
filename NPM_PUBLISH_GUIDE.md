# Complete Guide: Publishing SDK to npm

## Step 1: Remove Sensitive Information

### ⚠️ CRITICAL: Found Real Private Key!

**File:** `packages/sdk/env.example.txt` (line 13)
- Contains: `TEST_CUSTOMER_PRIVATE_KEY=0x3a0839bf64095653fd9a7eba82bea3db7df012f7c4b81fd519bc07ee16161c74`
- **Action:** Replace with placeholder `0x0000000000000000000000000000000000000000000000000000000000000000`

### Files to Check/Clean:

1. **`packages/sdk/env.example.txt`**
   - ✅ Keep file (it's an example)
   - ❌ Remove real private keys
   - ✅ Replace with placeholders

2. **`packages/sdk/src/`** (source code)
   - ✅ No hardcoded private keys found
   - ✅ No hardcoded API keys found
   - ✅ Uses `process.env` correctly

3. **`packages/sdk/dist/`** (build output)
   - ✅ Will be regenerated on build
   - ✅ No sensitive data in compiled code

---

## Step 2: Update package.json

### Required Fields:

```json
{
  "name": "@x402-crosschain/sdk",
  "version": "1.0.0",
  "description": "x402 cross-chain payment SDK with Relay Network support",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "README.md"],
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/x402-cross-bridge-sdk.git",
    "directory": "packages/sdk"
  },
  "keywords": [
    "x402",
    "cross-chain",
    "payments",
    "relay",
    "web3",
    "ethereum",
    "blockchain"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "publishConfig": {
    "access": "public"
  }
}
```

### Important Notes:
- **`files`**: Only include `dist` and `README.md` (excludes src, node_modules, etc.)
- **`publishConfig.access`**: Set to `"public"` for scoped packages (`@x402-crosschain/...`)
- **`repository`**: Update with your actual GitHub URL

---

## Step 3: Create .npmignore

Create `packages/sdk/.npmignore`:

```
# Source files (users don't need these)
src/
tsconfig.json
tsup.config.ts

# Development files
.env
.env.*
env.example.txt
*.log

# Build artifacts (keep dist/)
*.tsbuildinfo

# Testing
coverage/
.nyc_output/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Git
.git/
.gitignore

# Documentation (keep README.md)
docs/
*.md
!README.md
```

---

## Step 4: Build the Package

```bash
cd packages/sdk
pnpm install
pnpm build
```

**Verify build:**
- ✅ `dist/index.js` exists
- ✅ `dist/index.d.ts` exists
- ✅ All TypeScript types are generated

---

## Step 5: Test Locally (Optional but Recommended)

### Test with `npm pack`:

```bash
cd packages/sdk
npm pack
```

This creates a `.tgz` file. Test it:

```bash
# In a test directory
npm install /path/to/x402-crosschain-sdk-1.0.0.tgz
```

---

## Step 6: Login to npm

```bash
npm login
```

**Enter:**
- Username
- Password
- Email
- OTP (if 2FA enabled)

**Verify:**
```bash
npm whoami
```

---

## Step 7: Check Package Name Availability

```bash
npm view @x402-crosschain/sdk
```

- If it returns 404: ✅ Name is available
- If it returns package info: ❌ Name is taken (change in package.json)

---

## Step 8: Publish to npm

### First Time (Initial Publish):

```bash
cd packages/sdk
npm publish --access public
```

**Why `--access public`?**
- Scoped packages (`@x402-crosschain/...`) are private by default
- You need `--access public` to make it public

### Subsequent Publishes:

```bash
# Update version first
npm version patch  # 1.0.0 -> 1.0.1
# or
npm version minor  # 1.0.0 -> 1.1.0
# or
npm version major  # 1.0.0 -> 2.0.0

# Then publish
npm publish
```

---

## Step 9: Verify Publication

1. **Check npm website:**
   ```
   https://www.npmjs.com/package/@x402-crosschain/sdk
   ```

2. **Test installation:**
   ```bash
   npm install @x402-crosschain/sdk
   ```

3. **Verify package contents:**
   ```bash
   npm view @x402-crosschain/sdk
   ```

---

## Step 10: Post-Publish Checklist

- [ ] Package appears on npm
- [ ] README.md is displayed correctly
- [ ] Version number is correct
- [ ] All dependencies are listed
- [ ] TypeScript types are included
- [ ] No sensitive data in published package

---

## Common Issues & Solutions

### Issue 1: "Package name already exists"
**Solution:** Change package name in `package.json` or use a different scope

### Issue 2: "You must verify your email"
**Solution:** Check email and verify with npm

### Issue 3: "Missing required field: repository"
**Solution:** Add `repository` field to `package.json`

### Issue 4: "Package size too large"
**Solution:** 
- Check `.npmignore` is working
- Remove unnecessary files
- Use `files` field in `package.json` to whitelist only needed files

### Issue 5: "TypeScript types not found"
**Solution:**
- Ensure `types` field points to `dist/index.d.ts`
- Run `pnpm build` before publishing
- Check `tsconfig.json` has `"declaration": true`

---

## Security Checklist Before Publishing

- [ ] No private keys in code
- [ ] No API keys in code
- [ ] No hardcoded credentials
- [ ] `.env` files excluded
- [ ] `env.example.txt` uses placeholders only
- [ ] No localhost URLs in production code
- [ ] No test data in published package
- [ ] `.npmignore` properly configured
- [ ] `files` field in `package.json` restricts what's published

---

## Versioning Strategy

Follow [Semantic Versioning](https://semver.org/):

- **PATCH** (1.0.0 → 1.0.1): Bug fixes
- **MINOR** (1.0.0 → 1.1.0): New features (backward compatible)
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes

**Example:**
```bash
npm version patch  # Bug fix
npm version minor  # New feature
npm version major  # Breaking change
```

---

## Automated Publishing (Optional)

Add to `package.json`:

```json
{
  "scripts": {
    "prepublishOnly": "pnpm build",
    "prepack": "pnpm build"
  }
}
```

This ensures the package is always built before publishing.

---

## Summary

1. ✅ Remove sensitive data (private keys, API keys)
2. ✅ Update `package.json` with all required fields
3. ✅ Create `.npmignore`
4. ✅ Build the package (`pnpm build`)
5. ✅ Test locally (`npm pack`)
6. ✅ Login to npm (`npm login`)
7. ✅ Check name availability
8. ✅ Publish (`npm publish --access public`)
9. ✅ Verify on npm website
10. ✅ Test installation

**Your package will be live at:**
```
https://www.npmjs.com/package/@x402-crosschain/sdk
```

