# Publishing

## 1. Bump version and push

```bash
npm version patch && git push && git push --tags
```

## 2. Publish to VS Code Marketplace

```bash
source .env && AZURE_DEVOPS_ORG=chechikyoni VSCE_PAT="$VSCE_PAT" npx vsce publish
```

The `.env` file should contain:
```
VSCE_PAT=<your-pat>
```

## PAT Setup

- Generate PAT at [Azure DevOps](https://dev.azure.com/) with **Marketplace > Manage** scope
- The org name `chechikyoni` is required for the PAT to work
