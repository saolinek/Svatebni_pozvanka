#!/usr/bin/env python3
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from mimetypes import guess_type
from pathlib import Path
from urllib.parse import unquote, urlparse
import os


ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "3000"))


class WeddingInvitationHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}")

    def _resolve_path(self):
        pathname = unquote(urlparse(self.path).path)
        relative_path = pathname.lstrip("/")
        candidate = (ROOT / relative_path).resolve()

        try:
            candidate.relative_to(ROOT)
        except ValueError:
            return None

        if candidate.is_dir():
            index_file = candidate / "index.html"
            return index_file if index_file.exists() else None

        if candidate.exists():
            return candidate

        if pathname.startswith("/.netlify/"):
            return None

        if pathname == "/admin":
            admin_file = ROOT / "admin.html"
            return admin_file if admin_file.exists() else None

        if Path(pathname).suffix:
            return None

        index_file = ROOT / "index.html"
        return index_file if index_file.exists() else None

    def send_head(self):
        if self.command not in {"GET", "HEAD"}:
            self.send_error(HTTPStatus.METHOD_NOT_ALLOWED, "Method Not Allowed")
            return None

        file_path = self._resolve_path()
        if file_path is None or not file_path.exists():
            self.send_error(HTTPStatus.NOT_FOUND, "Not Found")
            return None

        content_type, _ = guess_type(str(file_path))
        content_type = content_type or "application/octet-stream"
        if content_type.startswith("text/") or content_type == "application/javascript":
            content_type = f"{content_type}; charset=utf-8"
        body = file_path.read_bytes()

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header(
            "Cache-Control",
            "no-cache" if file_path.suffix == ".html" else "public, max-age=3600",
        )
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()

        return None if self.command == "HEAD" else body

    def do_GET(self):
        body = self.send_head()
        if body is not None:
            self.wfile.write(body)

    def do_HEAD(self):
        self.send_head()


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), WeddingInvitationHandler)
    print(f"Server běží na http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
