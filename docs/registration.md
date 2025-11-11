# Registration & First-Time Setup

Guide for registering and publishing Claude Helper for the first time.

## Prerequisites

### VS Code Marketplace Publisher

1. **Create Microsoft/Azure Account**
   - Go to https://dev.azure.com
   - Sign in or create a new account

2. **Create Publisher**
   - Go to https://marketplace.visualstudio.com/manage
   - Click "Create publisher"
   - Choose a unique publisher ID (e.g., "YoniChechik")
   - Fill in display name, description, etc.

3. **Get Personal Access Token (PAT)**
   - Go to https://dev.azure.com
   - User Settings → Personal Access Tokens
   - Click "New Token"
   - Name: "vscode-marketplace"
   - Organization: All accessible organizations
   - Expiration: Custom (set to 1 year)
   - Scopes:
     - **Marketplace: Manage** (important!)
   - Copy and save the token securely

### Python Package Index (PyPI)

1. **Create PyPI Account**
   - Go to https://pypi.org/account/register/
   - Verify email

2. **Create API Token**
   - Go to https://pypi.org/manage/account/token/
   - Click "Add API token"
   - Name: "claude-helper"
   - Scope: "Entire account" (or specific project after first upload)
   - Copy and save the token

3. **Configure API Token**
   ```bash
   # Create/edit ~/.pypirc
   cat > ~/.pypirc << 'EOF'
   [pypi]
   username = __token__
   password = pypi-YOUR_TOKEN_HERE
   EOF

   chmod 600 ~/.pypirc
   ```

## Initial Setup

### Configure package.json

Ensure your publisher matches your VS Code Marketplace publisher:

```json
{
  "publisher": "YourPublisherID",
  "name": "claude-helper",
  "version": "1.0.0"
}
```

### Configure pyproject.toml

Ensure project metadata is correct:

```toml
[project]
name = "claude-helper"
version = "1.0.0"
authors = [
    { name = "Your Name", email = "your.email@example.com" }
]
```

## First Publication

### 1. Install vsce (VS Code Extension Manager)

```bash
npm install -g @vscode/vsce
```

### 2. Login to VS Code Marketplace

```bash
vsce login YourPublisherID
# Enter your Personal Access Token when prompted
```

### 3. Publish Extension

```bash
# Package and publish
vsce publish

# Or manually:
vsce package
vsce publish --packagePath ./claude-helper-1.0.0.vsix
```

### 4. Publish Python Package

```bash
# Build package
python -m build

# Upload to PyPI
python -m twine upload dist/*

# Or using uv:
uv build
uv publish
```

## Verification

### VS Code Extension

1. Go to https://marketplace.visualstudio.com/manage
2. Find your extension
3. Verify it's published and visible
4. Test installation:
   ```bash
   code --install-extension YourPublisherID.claude-helper
   ```

### Python Package

1. Go to https://pypi.org/project/claude-helper/
2. Verify package is visible
3. Test installation:
   ```bash
   uv tool install claude-helper
   # or
   pip install claude-helper
   ```

**Note:** If you haven't published to PyPI yet, users can install directly from GitHub:
```bash
uv tool install git+https://github.com/YoniChechik/vscode-claude-helper.git
```

## Post-Publication

### Update Documentation

- Add VS Code Marketplace badge to README
- Add PyPI badge to README
- Update installation instructions

### Set Up Auto-Publishing (Optional)

Create GitHub Actions workflow for automatic publishing on version tags.

## Troubleshooting

### "Publisher not found"

- Verify publisher ID in package.json matches your actual publisher
- Check you're logged in: `vsce logout` then `vsce login`

### "Extension validation failed"

- Run `vsce package` locally to see validation errors
- Fix issues and try again

### PyPI Upload Fails

- Check API token is correct
- Verify package name isn't taken
- Ensure version number hasn't been used before

### Name Conflicts

If the name is taken:
- Choose a different name (e.g., "claude-code-helper")
- Update both `package.json` and `pyproject.toml`
- Update all documentation references

## Security Notes

- **Never commit tokens/passwords** to git
- Store tokens securely (password manager)
- Rotate tokens periodically
- Use scoped tokens (not full account access)
- Add `.pypirc` to `.gitignore`
