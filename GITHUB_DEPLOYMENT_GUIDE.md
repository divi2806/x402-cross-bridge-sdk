# Complete GitHub Deployment Guide

This guide shows exactly what to include/exclude when deploying your x402 cross-chain SDK to GitHub.

---

## 📁 Repository Structure (What Goes Together)

### ✅ **Single Monorepo (Recommended)**

Keep everything in **one repository**:

```
x402-cross-bridge-sdk/
├── packages/
│   ├── sdk/              ✅ Include (source code)
│   └── facilitator/      ✅ Include (source code)
├── contracts/            ✅ Include (smart contracts)
├── examples/             ✅ Include (usage examples)
├── docs/                 ✅ Include (documentation)
├── .gitignore           ✅ Include
├── pnpm-workspace.yaml  ✅ Include
├── package.json         ✅ Include
├── README.md            ✅ Include
└── LICENSE              ✅ Include
```

**Why one repo?**
- Easier to maintain
- Shared code between packages
- Examples stay in sync with packages
- Single source of truth

---

## ✅ What to INCLUDE in GitHub

### 1. **Source Code**
```
✅ packages/sdk/src/          (TypeScript source)
✅ packages/facilitator/src/  (TypeScript source)
✅ contracts/                 (Solidity contracts)
```

### 2. **Configuration Files**
```
✅ package.json               (Root + all packages)
✅ pnpm-workspace.yaml        (Workspace config)
✅ tsconfig.json              (TypeScript configs)
✅ foundry.toml               (Contract build config)
✅ .gitignore                 (Git ignore rules)
✅ .npmignore                 (NPM ignore rules)
```

### 3. **Documentation**
```
✅ README.md                  (Main readme)
✅ packages/sdk/README.md     (SDK docs)
✅ packages/facilitator/README.md
✅ USER_INSTALLATION_GUIDE.md
✅ NPM_PUBLISH_GUIDE.md
✅ CUSTOM_HEADERS_EXPLAINED.md
✅ contracts/README.md
```

### 4. **Examples**
```
✅ examples/merchant-hosted/
✅ examples/merchant-self-hosted/
✅ examples/customer-client/
✅ examples/marketplace-integration/
```

**Include in examples:**
- ✅ Source code (`.ts`, `.tsx` files)
- ✅ `package.json`
- ✅ `README.md`
- ✅ `env.example.txt` (template, no real secrets)

### 5. **Deployment Files**
```
✅ packages/facilitator/Dockerfile
✅ packages/facilitator/docker-compose.yml
✅ packages/facilitator/.dockerignore
```

### 6. **License & Legal**
```
✅ LICENSE                    (MIT license)
```

---

## ❌ What to EXCLUDE from GitHub

### 1. **Build Artifacts**
```
❌ dist/                      (Compiled JavaScript)
❌ build/                     (Build outputs)
❌ *.tsbuildinfo             (TypeScript build info)
❌ artifacts/                 (Foundry artifacts)
❌ typechain-types/          (TypeChain types)
```

### 2. **Dependencies**
```
❌ node_modules/              (All node_modules)
❌ pnpm-lock.yaml             (Optional - some teams include it)
```

**Note:** Some teams include `pnpm-lock.yaml` for reproducible builds. Your choice.

### 3. **Environment & Secrets**
```
❌ .env                       (Environment variables)
❌ .env.local
❌ .env.*.local
❌ *.key                      (Private keys)
❌ *.pem                      (Certificates)
```

### 4. **IDE & Editor Files**
```
❌ .vscode/                   (VS Code settings)
❌ .idea/                     (IntelliJ settings)
❌ *.swp                      (Vim swap files)
❌ *.swo
❌ .DS_Store                  (macOS)
```

### 5. **Logs & Cache**
```
❌ *.log                      (Log files)
❌ .cache/                    (Cache directories)
❌ coverage/                  (Test coverage)
❌ .nyc_output/              (Coverage output)
```

### 6. **Reference Code (Not Your Code)**
```
❌ anyspend-x402/            (Reference implementation - don't include)
```

**Why exclude `anyspend-x402/`?**
- It's reference code, not your code
- Adds unnecessary size
- Could cause licensing issues
- Not needed for your project

### 7. **Temporary Files**
```
❌ *.tmp
❌ *.temp
❌ test-sdk-now.sh            (If it's just for testing)
```

---

## 📝 Complete .gitignore

Your `.gitignore` should look like this:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
*.tsbuildinfo
artifacts/
typechain-types/
out/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env*.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# OS files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.project
.classpath
.settings/

# Testing
coverage/
.nyc_output/
*.lcov

# Cache
.cache/
.parcel-cache/
.eslintcache
.stylelintcache

# Temporary files
*.tmp
*.temp

# Reference code (not your code)
anyspend-x402/

# Test scripts (if temporary)
test-sdk-now.sh

# Lock files (optional - some teams include pnpm-lock.yaml)
# pnpm-lock.yaml
```

---

## 🚀 Step-by-Step: Deploy to GitHub

### Step 1: Clean Your Repository

```bash
# Remove build artifacts
pnpm clean

# Remove node_modules (they'll be reinstalled)
rm -rf node_modules packages/*/node_modules examples/*/node_modules

# Remove anyspend reference code
rm -rf anyspend-x402/

# Remove any .env files (keep .env.example.txt)
find . -name ".env" -not -name "*.example.txt" -delete
```

### Step 2: Verify .gitignore

```bash
# Check what will be committed
git status

# Should NOT see:
# - node_modules/
# - dist/
# - .env files
# - anyspend-x402/
```

### Step 3: Initialize Git (If Not Already)

```bash
# Initialize git
git init

# Add remote
git remote add origin https://github.com/yourusername/x402-cross-bridge-sdk.git
```

### Step 4: Create Initial Commit

```bash
# Stage all files
git add .

# Verify what's being added
git status

# Commit
git commit -m "Initial commit: x402 cross-chain SDK with Relay support

- SDK package for merchants and customers
- Facilitator package for self-hosting
- Smart contracts (PaymentSettlement.sol)
- Complete examples and documentation
- Full x402 compliance with cross-chain support"
```

### Step 5: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `x402-cross-bridge-sdk`
3. Description: `Cross-chain payment SDK for x402 protocol with Relay Network support`
4. Visibility: **Public** (for open source) or **Private** (if proprietary)
5. **Don't** initialize with README (you already have one)
6. Click "Create repository"

### Step 6: Push to GitHub

```bash
# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

### Step 7: Add Repository Topics (On GitHub)

Go to your repo → Settings → Topics, add:
- `x402`
- `cross-chain`
- `payments`
- `web3`
- `ethereum`
- `blockchain`
- `relay-network`
- `typescript`
- `solidity`

---

## 📦 Publishing Packages to npm

### Overview

You have **2 separate packages** to publish:

1. **`@x402-crosschain/sdk`** - Main SDK for merchants and customers
2. **`@x402-crosschain/facilitator`** - Backend facilitator service

### Step 1: Prepare SDK Package

```bash
cd packages/sdk

# 1. Build the package
pnpm build

# 2. Verify what will be published
npm pack --dry-run

# Should show:
# - dist/
# - README.md
# - package.json
```

**What gets published:**
- ✅ `dist/` (built JavaScript + TypeScript types)
- ✅ `README.md`
- ✅ `package.json`
- ❌ `src/` (excluded by `.npmignore`)
- ❌ `tsconfig.json` (excluded)
- ❌ `node_modules/` (never published)

### Step 2: Publish SDK Package

```bash
cd packages/sdk

# Login to npm (first time only)
npm login

# Check if name is available
npm view @x402-crosschain/sdk

# Publish (first time)
npm publish --access public

# For updates, bump version first:
npm version patch  # 1.0.0 -> 1.0.1
npm publish
```

**Package will be available at:**
```
https://www.npmjs.com/package/@x402-crosschain/sdk
```

### Step 3: Prepare Facilitator Package

```bash
cd packages/facilitator

# 1. Build the package
pnpm build

# 2. Verify what will be published
npm pack --dry-run

# Should show:
# - dist/
# - README.md
# - Dockerfile
# - docker-compose.yml
# - package.json
```

**What gets published:**
- ✅ `dist/` (built JavaScript + TypeScript types)
- ✅ `README.md`
- ✅ `Dockerfile` (for deployment)
- ✅ `docker-compose.yml` (for deployment)
- ✅ `package.json`
- ❌ `src/` (excluded by `.npmignore`)
- ❌ `node_modules/` (never published)

### Step 4: Publish Facilitator Package

```bash
cd packages/facilitator

# Login to npm (if not already)
npm login

# Check if name is available
npm view @x402-crosschain/facilitator

# Publish (first time)
npm publish --access public

# For updates, bump version first:
npm version patch  # 1.0.0 -> 1.0.1
npm publish
```

**Package will be available at:**
```
https://www.npmjs.com/package/@x402-crosschain/facilitator
```

### Step 5: Verify Both Packages

1. **Check npm:**
   - https://www.npmjs.com/package/@x402-crosschain/sdk
   - https://www.npmjs.com/package/@x402-crosschain/facilitator

2. **Test installation:**
   ```bash
   npm install @x402-crosschain/sdk
   npm install @x402-crosschain/facilitator
   ```

3. **Verify package contents:**
   ```bash
   npm view @x402-crosschain/sdk
   npm view @x402-crosschain/facilitator
   ```

### Package Structure for npm

#### SDK Package (`@x402-crosschain/sdk`)

**Controlled by:**
- `packages/sdk/.npmignore` - Excludes source files
- `packages/sdk/package.json` → `"files": ["dist", "README.md"]` - Whitelist

**Published files:**
```
@x402-crosschain/sdk/
├── dist/
│   ├── index.js
│   ├── index.d.ts
│   └── ... (all compiled files)
├── README.md
└── package.json
```

#### Facilitator Package (`@x402-crosschain/facilitator`)

**Controlled by:**
- `packages/facilitator/.npmignore` - Excludes source files
- `packages/facilitator/package.json` → `"files"` field (if specified)

**Published files:**
```
@x402-crosschain/facilitator/
├── dist/
│   ├── index.js
│   ├── index.d.ts
│   └── ... (all compiled files)
├── README.md
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### Versioning Strategy

**Both packages should be versioned together** (same version numbers):

```bash
# In packages/sdk
npm version patch  # 1.0.0 -> 1.0.1
npm publish

# In packages/facilitator (same version)
npm version patch  # 1.0.0 -> 1.0.1
npm publish
```

**Or use a script to version both:**

```bash
# In root package.json, add:
{
  "scripts": {
    "version:patch": "cd packages/sdk && npm version patch && cd ../facilitator && npm version patch",
    "publish:all": "cd packages/sdk && npm publish --access public && cd ../facilitator && npm publish --access public"
  }
}
```

### Automated Publishing (Optional)

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: pnpm build
      - run: |
          cd packages/sdk
          npm publish --access public
      - run: |
          cd packages/facilitator
          npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 🔄 What Goes Together vs Separately

### ✅ **Together (One Repo)**

1. **SDK + Facilitator**
   - Same repo (monorepo)
   - Shared types
   - Easier maintenance

2. **Contracts + Packages**
   - Same repo
   - Contracts used by facilitator
   - Single source of truth

3. **Examples + Packages**
   - Same repo
   - Examples stay in sync
   - Easy to test

### ❌ **Separate (Different Repos)**

**Don't create separate repos for:**
- ❌ SDK and Facilitator (keep together)
- ❌ Examples (keep with packages)

**Only separate if:**
- You want to publish SDK and Facilitator to different npm orgs
- You have completely different teams maintaining them
- You want different access controls

---

## 📋 Pre-Deployment Checklist

Before pushing to GitHub:

- [ ] Removed all `node_modules/` directories
- [ ] Removed all `dist/` directories (will be rebuilt)
- [ ] Removed all `.env` files (kept `.env.example.txt`)
- [ ] Removed `anyspend-x402/` reference code
- [ ] Verified `.gitignore` is comprehensive
- [ ] Updated `README.md` with correct information
- [ ] Updated `package.json` with correct author/repo URLs
- [ ] Removed any hardcoded private keys/secrets
- [ ] All `env.example.txt` files use placeholders
- [ ] License file included (LICENSE)
- [ ] Documentation is complete

---

## 🎯 Repository Organization

### Recommended Structure:

```
x402-cross-bridge-sdk/
├── .github/                    (GitHub workflows, templates)
│   ├── workflows/
│   │   └── ci.yml              (CI/CD pipeline)
│   └── ISSUE_TEMPLATE/
├── contracts/                  ✅ Smart contracts
├── packages/
│   ├── sdk/                    ✅ SDK package
│   └── facilitator/            ✅ Facilitator package
├── examples/                   ✅ Usage examples
├── docs/                       ✅ Additional documentation
├── .gitignore                  ✅
├── LICENSE                     ✅
├── README.md                   ✅ Main readme
└── package.json                ✅ Root package.json
```

---

## 🔐 Security Checklist

Before pushing:

- [ ] No private keys in code
- [ ] No API keys in code
- [ ] No `.env` files committed
- [ ] All `env.example.txt` use placeholders
- [ ] No hardcoded credentials
- [ ] No wallet private keys
- [ ] No RPC API keys
- [ ] No contract addresses with private keys

**Scan for secrets:**
```bash
# Search for potential secrets
grep -r "0x[a-fA-F0-9]{64}" --exclude-dir=node_modules --exclude-dir=dist
grep -r "sk_live\|sk_test" --exclude-dir=node_modules
grep -r "api[_-]?key" -i --exclude-dir=node_modules
```

---

## 📝 README.md Template

Your main `README.md` should include:

```markdown
# x402 Cross-Chain Payment SDK

> Accept payments from any chain, receive USDC on Base

[![npm version](https://img.shields.io/npm/v/@x402-crosschain/sdk.svg)](https://www.npmjs.com/package/@x402-crosschain/sdk)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Quick Start

\`\`\`bash
npm install @x402-crosschain/sdk
\`\`\`

## Documentation

- [Installation Guide](USER_INSTALLATION_GUIDE.md)
- [SDK Documentation](packages/sdk/README.md)
- [Facilitator Documentation](packages/facilitator/README.md)

## Packages

- **@x402-crosschain/sdk** - Main SDK for merchants and customers
- **@x402-crosschain/facilitator** - Self-hosted facilitator backend

## License

MIT
```

---

## 🚀 After Deployment

### 1. Set Up GitHub Actions (CI/CD)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test  # If you have tests
```

### 2. Add Badges to README

```markdown
![GitHub](https://img.shields.io/github/license/yourusername/x402-cross-bridge-sdk)
![GitHub stars](https://img.shields.io/github/stars/yourusername/x402-cross-bridge-sdk)
```

### 3. Create Releases

When ready to publish to npm:
1. Create a GitHub release
2. Tag with version: `v1.0.0`
3. Publish to npm (see `NPM_PUBLISH_GUIDE.md`)

---

## 📊 Summary

**What to Include:**
- ✅ Source code (`src/`)
- ✅ Configuration files
- ✅ Documentation
- ✅ Examples
- ✅ Contracts
- ✅ License

**What to Exclude:**
- ❌ `node_modules/`
- ❌ `dist/` (build artifacts)
- ❌ `.env` files
- ❌ `anyspend-x402/` (reference code)
- ❌ IDE files
- ❌ Logs and cache

**Structure:**
- ✅ Single monorepo (recommended)
- ✅ All packages together
- ✅ Examples with packages

**Security:**
- ✅ No secrets in code
- ✅ Use `.env.example.txt` templates
- ✅ Scan for private keys before commit

---

## 🎉 You're Ready!

Once deployed, users can:

1. **Clone the repo:**
   ```bash
   git clone https://github.com/yourusername/x402-cross-bridge-sdk.git
   cd x402-cross-bridge-sdk
   pnpm install
   ```

2. **Use the packages:**
   ```bash
   npm install @x402-crosschain/sdk
   npm install @x402-crosschain/facilitator
   ```

3. **Follow examples:**
   - See `examples/` directory
   - Read `USER_INSTALLATION_GUIDE.md`

Your SDK is now ready for the world! 🚀

