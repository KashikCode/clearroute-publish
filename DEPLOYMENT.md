## Instructions to make your own clearroute for local use

1. Download and unzip the complete project archive.
2. Open the installed GitHub Desktop app. Sign in as the repository owner.
3. If the repository is already cloned, select it in Current Repository. Otherwise choose File > Clone Repository > URL; enter https://github.com/KashikCode/clearroute.git, keep a convenient Local Path, and click Clone.
4. Choose Repository > Show in Finder. This opens the connected local repository.
5. Copy the contents of the extracted project into that folder, replacing matching app files. Keep the repository's existing .git folder. Do not put the enclosing clearroute-github folder inside the repository: docs/ must be immediately inside the repository root.
6. Include scripts/, requirements.txt, README.md, DEPLOYMENT.md, MODEL_CARD.md, start.command, data/README.md, and .gitignore, not just docs/. Show hidden files with Command+Shift+. when copying .gitignore. Do not copy .venv or downloaded data archives.
7. Open this connected folder in VS Code using File > Open Folder. Run python3 scripts/serve.py to test. Keep its terminal running while viewing the app.
8. In GitHub Desktop, review Changes. Enter `Redesign Clearroute interface` in Summary and click Commit to main. Click Push origin (or Publish branch if this is the first branch publication).
9. On GitHub.com open the repository, then Settings > Pages. Set Source to Deploy from a branch, Branch to main, Folder to /docs, and Save. For a free personal GitHub account, use a public repository for Pages.
10. Wait for GitHub's Pages deployment and use the Visit site link shown there. The expected URL pattern is https://KashikCode.github.io/clearroute/, but the settings page is authoritative. This guide does not imply that the repository or Pages site has already been updated.

## Later updates

Edit in the connected VS Code folder, test, commit, then Push origin. Pages publishes changes to docs/. Editing a training script without retraining does not update model.json. A local server URL such as 127.0.0.1 works only on your own machine while its server is running; a deployed Pages URL is publicly reachable independently of your terminal.

## Common issues

- **Website disappears after Ctrl+C:** restart scripts/serve.py and leave that terminal running.
- **Address already in use:** run `python3 scripts/serve.py --port 8001`.
- **404 on GitHub Pages:** confirm docs/index.html is at the repository root's docs folder and the Pages source is main /docs, not /(root).
- **App loads but model is unavailable:** confirm docs/model.json and docs/metrics.json were uploaded. Keep relative asset paths. Use HTTP preview instead of double-clicking index.html.
- **Empty changes in GitHub Desktop:** make sure you copied files into the cloned repository, not only Downloads.
- **Different app name in Mac menu bar:** open GitHub Desktop via Command+Space for Git operations. Chrome menus only control Chrome.
- **Training seems quiet:** progress prints before each model; give it time to finish. KeyboardInterrupt means it was cancelled.
- **Certificate verification failed:** run the matching Python Install Certificates.command, then retry. The included model does not require downloading data to use the app.

Official instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
