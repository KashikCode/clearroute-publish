"""Download the exact public archive used for the included baseline."""
import hashlib
import json
import shutil
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
metadata = json.loads((ROOT / 'docs' / 'metrics.json').read_text())
target = ROOT / 'data' / 'cfpb-july-2026.zip'
target.parent.mkdir(exist_ok=True)
url = 'https://files.consumerfinance.gov/f/documents/CCDB_Export_20_July_2026.zip'
print('Downloading the public CFPB July 2026 archive...')
with urllib.request.urlopen(url, timeout=120) as response, target.open('wb') as output:
    shutil.copyfileobj(response, output)
actual = hashlib.sha256(target.read_bytes()).hexdigest()
if actual != metadata['source_sha256']:
    raise SystemExit('Archive checksum differs from the bundled model. Inspect the source before training.')
print(f'Saved and verified: {target}')
