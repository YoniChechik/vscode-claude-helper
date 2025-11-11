# How to Publish to VS Code Marketplace

This guide walks you through publishing the Git Diff Viewer extension to the Visual Studio Code Marketplace.

## Prerequisites

- Microsoft/Azure account
- Git repository published on GitHub
- Extension code ready in this directory

## Step 1: Create Publisher Account

1. Go to [VS Code Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft account
3. Click **"Create publisher"** if you don't have one yet
4. Fill in the form:
   - **Name**: Your display name (e.g., "Yoni Chechik")
   - **ID**: `YoniChechik` (must match the `publisher` field in package.json)
   - **Email**: Your contact email
5. Click **"Create"**

## Step 2: Get Personal Access Token (PAT)

1. Go to [Azure DevOps](https://dev.azure.com)
2. Sign in with the same Microsoft account
3. Click your **profile icon** (top-right) → **Personal access tokens**
   - Or go directly to: https://dev.azure.com/_usersSettings/tokens
4. Click **"+ New Token"**
5. Configure the token:
   - **Name**: `vscode-extension-publishing`
   - **Organization**: Select **"All accessible organizations"**
   - **Expiration**: Choose duration (recommended: 90 days or custom)
   - **Scopes**:
     - Click **"Show all scopes"**
     - Find and expand **"Marketplace"**
     - Check **"Manage"** (gives read + publish permissions)
6. Click **"Create"**
7. **IMPORTANT**: Copy the token immediately (you won't see it again!)
8. Store it securely (password manager, secure notes, etc.)

## Step 3: Login to vsce

Open terminal in the extension directory and run:

```bash
npx vsce login YoniChechik
```

When prompted, paste your Personal Access Token (PAT).

## Step 4: Publish the Extension

### Option A: Direct Publish

```bash
npx vsce publish
```

This will:
- Package the extension
- Upload it to the marketplace
- Auto-increment the patch version

### Option B: Publish Specific Version

```bash
# Publish with version bump
npx vsce publish patch   # 0.6.0 → 0.6.1
npx vsce publish minor   # 0.6.0 → 0.7.0
npx vsce publish major   # 0.6.0 → 1.0.0

# Or publish specific version
npx vsce publish 0.6.0
```

### Option C: Package First, Upload Later

```bash
# Create .vsix package file
npx vsce package

# Then manually upload at:
# https://marketplace.visualstudio.com/manage/publishers/YoniChechik
```

## Step 5: Verify Publication

1. Go to [VS Code Marketplace](https://marketplace.visualstudio.com/)
2. Search for "Git Diff Viewer"
3. Or visit your publisher page: https://marketplace.visualstudio.com/publishers/YoniChechik

The extension should be live within a few minutes!

## Updating the Extension

When you want to publish an update:

1. Make your changes
2. Update version in `package.json` (or let vsce do it)
3. Update `CHANGELOG.md` or `README.md` with release notes
4. Commit and push changes
5. Run `npx vsce publish` again

## Troubleshooting

### Error: "Missing publisher name"
- Ensure `package.json` has `"publisher": "YoniChechik"`

### Error: "Missing activationEvents"
- Already fixed! `package.json` has `activationEvents` defined

### Error: "Not authenticated"
- Run `npx vsce login YoniChechik` again with your PAT

### Error: "Publisher not found"
- Create publisher account at https://marketplace.visualstudio.com/manage

### Extension not showing in marketplace
- Wait 5-10 minutes for indexing
- Check publisher page directly

## Unpublishing

To remove the extension from marketplace:

```bash
npx vsce unpublish YoniChechik.git-diff-viewer
```

**Warning**: This permanently removes the extension and all download stats!

## Resources

- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Marketplace Publisher Portal](https://marketplace.visualstudio.com/manage)
- [vsce CLI Documentation](https://github.com/microsoft/vscode-vsce)

---

**Current Status**: Ready to publish version 0.6.0!
