@echo off
echo.
echo ================================================
echo   Reinstalling Git Diff Viewer Extension
echo ================================================
echo.

echo [1/5] Uninstalling old version...
code --uninstall-extension local.git-diff-viewer 2>nul
echo.

echo [2/5] Compiling TypeScript...
call npm run compile
if errorlevel 1 goto error
echo.

echo [3/5] Packaging extension...
call npx @vscode/vsce package
if errorlevel 1 goto error
echo.

echo [4/5] Installing extension...
for %%f in (git-diff-viewer-*.vsix) do (
    code --install-extension "%%f"
)
if errorlevel 1 goto error
echo.

echo [5/5] Restarting VS Code...
echo Closing VS Code instances...
taskkill /IM "Code.exe" /F >nul 2>&1
timeout /t 2 /nobreak >nul
echo Opening VS Code...
start "" code .

echo.
echo ================================================
echo   SUCCESS! Extension installed and VS Code restarted
echo ================================================
echo.
goto end

:error
echo.
echo ================================================
echo   ERROR: Installation failed!
echo ================================================
echo.
pause
exit /b 1

:end
