# Registration and First-Time Setup

Guide for registering and publishing VS Code extensions for the first time.

## Create VS Code Marketplace Publisher

1. **Create Microsoft/Azure Account**
   - Go to https://dev.azure.com
   - Sign in or create a new account

2. **Create Publisher**
   - Go to https://marketplace.visualstudio.com/manage
   - Click "Create publisher"
   - Choose a unique publisher ID (e.g., "YoniChechik")
   - Fill in display name, description, etc.

3. **Get Personal Access Token (PAT)**
   - Go to: https://dev.azure.com/chechikyoni/_usersSettings/tokens
   - Click "New Token"
   - Set name (e.g., "vscode-marketplace")
   - Set expiration (max 1 year)
   - Under "Scopes", select "Custom defined" then:
     - Find "Marketplace" and check "Manage"
   - Click "Create" and copy the token immediately (it won't be shown again)

## Initial Setup

### Configure package.json

Ensure your publisher matches your VS Code Marketplace publisher:

```json
{
  "publisher": "YourPublisherID",
  "name": "your-extension-name",
  "version": "1.0.0"
}
```

### Create .env file

```bash
VSCE_PAT=<your-pat>
```

## First Publication

See [publishing.md](publishing.md) for the publish workflow.
