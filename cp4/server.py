"""Local static preview limited to public UI and CP4 evidence assets."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote,urlsplit

ROOT=Path(__file__).resolve().parents[1]
PUBLIC=[(ROOT/'web-demo').resolve(),(ROOT/'cp4/public').resolve()]
SUFFIXES={'.html','.css','.js','.json','.png','.jpg','.jpeg','.svg','.ico','.webp','.pdf','.webm'}
class Handler(SimpleHTTPRequestHandler):
    def send_head(self):
        if urlsplit(self.path).path=='/':
            self.send_response(302);self.send_header('Location','/web-demo/live.html');self.end_headers();return None
        path=(ROOT/unquote(urlsplit(self.path).path).lstrip('/')).resolve()
        if path.suffix.lower() not in SUFFIXES or not any(path.is_relative_to(p) for p in PUBLIC) or any(part.startswith('.') for part in path.relative_to(ROOT).parts):
            self.send_error(404);return None
        return super().send_head()
def main():
    server=ThreadingHTTPServer(('127.0.0.1',8765),partial(Handler,directory=str(ROOT)))
    print('Preview: http://127.0.0.1:8765/web-demo/live.html',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
if __name__=='__main__':main()
