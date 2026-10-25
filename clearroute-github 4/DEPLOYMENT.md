# GitHub Pages deployment for the downloadable project

## What developers normally do

1. Edit files in a code editor such as VS Code on their computer.
2. Run and test the app locally.
3. Use Git to save a meaningful version (a commit).
4. Push commits to GitHub, which stores the repository.
5. A hosting service publishes the app. For this static app, GitHub Pages is sufficient.

GitHub Desktop is a separate Mac application that gives Git a visual interface. GitHub.com is a website. Chrome's File menu is not GitHub Desktop's File menu. You can edit small files on GitHub.com, and Codespaces offers a cloud development environment, but editing locally is a straightforward workflow for this project.

## Update the existing KashikCode/clearroute repository

Do not create another repository if you already have this one.

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

You do not need npm, a build command, a Flask backend, or GitHub Actions for deployment. Python training does not run on GitHub Pages: you train locally and push the generated JSON files. GitHub Pages serves the files in docs/.

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
