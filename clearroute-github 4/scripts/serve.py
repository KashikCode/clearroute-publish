"""Local preview. Run: python3 scripts/serve.py. Ctrl+C stops the website."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = ROOT / ('docs' if (ROOT / 'docs').exists() else 'dist')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port', type=int, default=8000)
parser.add_argument('--no-browser', action='store_true')
args = parser.parse_args()
if not (WEB_ROOT / 'index.html').is_file():
    raise SystemExit('Missing website folder. Extract the entire project ZIP first.')
try:
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(SimpleHTTPRequestHandler, directory=str(WEB_ROOT)))
except OSError as error:
    raise SystemExit(f'Could not start the preview: {error}\nTry: python3 scripts/serve.py --port 8001')
url = f'http://127.0.0.1:{args.port}/'
print(f'Clearroute is running at {url}', flush=True)
print('KEEP THIS TERMINAL OPEN. Ctrl+C stops the website. Use another terminal for training.', flush=True)
if not args.no_browser:
    threading.Timer(.5, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    print('\nPreview stopped. Run this script again to reopen it.')
finally:
    server.server_close()
