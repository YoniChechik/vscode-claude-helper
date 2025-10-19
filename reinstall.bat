@echo off
cd "C:\Users\Yoni\Desktop\vscode-git-diff-extension" && rm -f *.vsix && npm run compile && npx @vscode/vsce package --allow-star-activation && code --install-extension git-diff-viewer-0.6.0.vsix --force
