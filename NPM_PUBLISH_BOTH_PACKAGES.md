# Publishing Both Packages to npm

This guide shows how to publish **both** `@x402-crosschain/sdk` and `@x402-crosschain/facilitator` to npm as separate packages.

---

## 📦 Package Overview

You have **2 separate npm packages**:

1. **`@x402-crosschain/sdk`** - Main SDK for merchants and customers
2. **`@x402-crosschain/facilitator`** - Backend facilitator service

Both are published independently but can be used together.

---

## 🚀 Publishing SDK Package

### Step 1: Prepare SDK

```bash
cd packages/sdk

# Build the package
pnpm build

# Verify what will be published
npm pack --dry-run
```

**Should show:**
- ✅ `dist/` (compiled JavaScript + types)
- ✅ `README.md`
- ✅ `package.json`
- ❌ No `src/`, `node_modules/`, etc.

### Step 2: Publish SDK

```bash
cd packages/sdk

# Login to npm (first time only)
npm login

# Check name availability
npm view @x402-crosschain/sdk
# Should return 404 if available

# Publish (first time)
npm publish --access public

# For updates:
npm version patch  # 1.0.0 -> 1.0.1
npm publish
```

**Package URL:**
```
https://www.npmjs.com/package/@x402-crosschain/sdk
```

---

## 🚀 Publishing Facilitator Package

### Step 1: Prepare Facilitator

```bash
cd packages/facilitator

# Build the package
pnpm build

# Verify what will be published
npm pack --dry-run
```

**Should show:**
- ✅ `dist/` (compiled JavaScript + types)
- ✅ `README.md`
- ✅ `Dockerfile`
- ✅ `docker-compose.yml`
- ✅ `package.json`
- ❌ No `src/`, `node_modules/`, etc.

### Step 2: Publish Facilitator

```bash
cd packages/facilitator

# Login to npm (if not already)
npm login

# Check name availability
npm view @x402-crosschain/facilitator
# Should return 404 if available

# Publish (first time)
npm publish --access public

# For updates:
npm version patch  # 1.0.0 -> 1.0.1
npm publish
```

**Package URL:**
```
https://www.npmjs.com/package/@x402-crosschain/facilitator
```

---

## 🔄 Publishing Both Together

### Option 1: Manual (Recommended for First Time)

```bash
# Publish SDK
cd packages/sdk
npm version patch
npm publish --access public

# Publish Facilitator (same version)
cd ../facilitator
npm version patch
npm publish --access public
```

### Option 2: Script (For Updates)

Add to root `package.json`:

```json
{
  "scripts": {
    "version:both": "cd packages/sdk && npm version patch && cd ../facilitator && npm version patch",
    "publish:sdk": "cd packages/sdk && npm publish --access public",
    "publish:facilitator": "cd packages/facilitator && npm publish --access public",
    "publish:all": "pnpm version:both && pnpm publish:sdk && pnpm publish:facilitator"
  }
}
```

Then run:
```bash
pnpm publish:all
```

---

## ✅ Verification Checklist

After publishing both packages:

- [ ] SDK appears on npm: https://www.npmjs.com/package/@x402-crosschain/sdk
- [ ] Facilitator appears on npm: https://www.npmjs.com/package/@x402-crosschain/facilitator
- [ ] Both READMEs display correctly
- [ ] TypeScript types are included
- [ ] Can install both: `npm install @x402-crosschain/sdk @x402-crosschain/facilitator`
- [ ] No sensitive data in published packages

---

## 📋 What Gets Published

### SDK Package (`@x402-crosschain/sdk`)

**Included:**
```
dist/
├── index.js
├── index.d.ts
├── client/
│   ├── payment-client.js
│   ├── payment-client.d.ts
│   ├── browser-client.js
│   └── browser-client.d.ts
├── middleware/
│   ├── payment-middleware.js
│   └── payment-middleware.d.ts
└── types.js
└── types.d.ts
README.md
package.json
```

**Excluded:**
- `src/` (source code)
- `tsconfig.json`
- `node_modules/`
- `.env` files

### Facilitator Package (`@x402-crosschain/facilitator`)

**Included:**
```
dist/
├── index.js
├── index.d.ts
├── relay.js
├── relay.d.ts
├── settlement.js
├── settlement.d.ts
└── ...
README.md
Dockerfile
docker-compose.yml
package.json
```

**Excluded:**
- `src/` (source code)
- `tsconfig.json`
- `node_modules/`
- `.env` files

---

## 🔐 Security Before Publishing

**Both packages:**

- [ ] No private keys in code
- [ ] No API keys in code
- [ ] `.env` files excluded
- [ ] `env.example.txt` uses placeholders only
- [ ] `.npmignore` properly configured
- [ ] `files` field in `package.json` restricts published files

---

## 📊 Versioning Strategy

**Keep versions in sync** (both packages same version):

```bash
# Both should be 1.0.0, then 1.0.1, etc.
packages/sdk/package.json: "version": "1.0.0"
packages/facilitator/package.json: "version": "1.0.0"
```

**When to bump:**
- **PATCH** (1.0.0 → 1.0.1): Bug fixes
- **MINOR** (1.0.0 → 1.1.0): New features (backward compatible)
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes

---

## 🎯 Summary

**To publish both packages:**

1. ✅ Build both: `cd packages/sdk && pnpm build` and `cd packages/facilitator && pnpm build`
2. ✅ Login to npm: `npm login`
3. ✅ Publish SDK: `cd packages/sdk && npm publish --access public`
4. ✅ Publish Facilitator: `cd packages/facilitator && npm publish --access public`
5. ✅ Verify on npm website

**Both packages are now live and ready for users!** 🚀

