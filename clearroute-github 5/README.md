# Clearroute

A financial complaint classification workbench with four application screens: Complaint desk, Review queue, Performance, and Routing rules. The design uses navy and white, black body text, restrained green/orange accents, and a navy/green SVG logo. No framework, build step, remote font, API key, or server-side prediction service is needed.

## Run locally

Install Python 3.12 or 3.13 and open the whole project folder in VS Code. In Terminal > New Terminal:

```bash
python3 scripts/serve.py
```

The script opens your browser automatically. Keep this terminal running; pressing Ctrl+C stops the website. Use another terminal for training. If port 8000 is occupied, use `python3 scripts/serve.py --port 8001`. The included model is ready; training is optional.

## Source map

- `docs/index.html`: the four application screens and their navigation.
- `docs/guide.html`: project, model, privacy, and limitations page.
- `docs/style.css`: colors, typography, spacing, and responsive layouts.
- `docs/app.js`: screen navigation, escaped rendering, CSV handling, session queue, and team rules.
- `docs/classifier.js`: browser text preprocessing, TF-IDF transformation, and linear SVM inference.
- `docs/assets/logo.svg`: editable navy/green vector logo and favicon.
- `docs/model.json`: generated trained coefficients, vocabulary, and IDF.
- `docs/metrics.json`: actual held-out metrics and source provenance.
- `docs/parity.json`: authored examples and reference Python scores used by tests.
- `docs/train.py`: downloadable copy of the canonical training script.
- `docs/sample-complaints.csv`: authored input examples for batch import.
- `scripts/train.py`: readable, commented model-training and export pipeline.
- `scripts/download_data.py`: fetch and verify the public training archive.
- `scripts/serve.py`: local preview launcher.
- `scripts/test.cjs`: Python/JavaScript inference parity and CSV parsing checks.
- `requirements.txt`: pinned Python training dependencies.
- `MODEL_CARD.md`: scope, measured results, and methodological limitations.
- `.gitignore`: excludes raw data, environments, and local outputs.

The GitHub distribution uses `docs/`, so GitHub Pages can publish directly from main /docs. All scripts in that ZIP are adjusted to the docs folder.

## Train and test

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/download_data.py
.venv/bin/python scripts/train.py
```

Training prints progress. Do not press Ctrl+C unless you want to cancel. The July 2026 source checksum is checked against the included metadata; this script reproduces that experiment rather than silently accepting different datasets. Training outputs replace the generated model, evaluation, and parity JSON files. Do not edit metric values by hand.

On a Python.org Mac installation, if the downloader raises CERTIFICATE_VERIFY_FAILED, run `open "/Applications/Python 3.13/Install Certificates.command"`, wait for completion, then retry the download. Match 3.13 to your installed version. Do not disable certificate validation. Manual download URL is in metrics.json; save as data/cfpb-july-2026.zip.

Optional tests (Node.js required):

```bash
node scripts/test.cjs
```

Browser smoke test: classify Account fees, add to review queue, correct a category, confirm assignment, export a CSV, edit a routing rule, and inspect the performance page. The sample CSV is available in the app.

## Design and architecture

Color tokens live at the top of style.css: navy #152c46, white #ffffff, pale blue #eef4f8, ink #151719, green #246451, orange #ad4b13. The four main screens are sections inside one HTML file; hash navigation switches visibility without reloading the model. A second HTML page documents the project. JavaScript code is formatted for reading and editing.

The two-stage system predicts a financial product then maps it to an editable team. It does not classify arbitrary business complaints or send messages. All assignments require user confirmation. Browser session storage is not a shared or durable backend. Read MODEL_CARD.md before interpreting performance.
