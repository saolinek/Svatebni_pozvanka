#!/usr/bin/env python3
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from mimetypes import guess_type
from pathlib import Path
from urllib.parse import unquote, urlparse
import json
import os
import uuid
from datetime import datetime, timezone


ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "3000"))
DATA_DIR = ROOT / "data"
RESPONSES_FILE = DATA_DIR / "rsvp-responses.json"
GUESTS_FILE = DATA_DIR / "guests.json"


def load_responses():
    if RESPONSES_FILE.exists():
        try:
            return json.loads(RESPONSES_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return []


def save_responses(responses):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RESPONSES_FILE.write_text(
        json.dumps(responses, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_guests():
    if GUESTS_FILE.exists():
        try:
            guests = json.loads(GUESTS_FILE.read_text(encoding="utf-8"))
            if isinstance(guests, list):
                return [
                    {"id": g["id"], "name": g["name"], "group": g.get("group", "")}
                    for g in guests
                    if isinstance(g, dict) and "id" in g and "name" in g
                ]
        except (json.JSONDecodeError, OSError):
            pass
    return []


def normalize_text(value, max_length=500):
    return " ".join(str(value or "").split()).strip()[:max_length]


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

    def _is_rsvp_path(self):
        pathname = unquote(urlparse(self.path).path)
        return pathname.rstrip("/") == "/.netlify/functions/rsvp"

    def _send_json(self, status_code, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}

    def _handle_rsvp_get(self):
        responses = load_responses()
        guests = load_guests()
        guest_map = {g["id"]: g for g in guests}

        for resp in responses:
            gid = resp.get("assignedGuestId", "")
            if gid and gid in guest_map:
                resp["assignedGuestName"] = guest_map[gid]["name"]
                resp["assignedGroup"] = guest_map[gid].get("group", "")

        responses.sort(key=lambda r: r.get("submittedAt", ""), reverse=True)

        stats = {
            "guests": len(guests),
            "responses": len(responses),
            "attending": sum(1 for r in responses if r.get("attending")),
            "declined": sum(1 for r in responses if not r.get("attending")),
            "assigned": sum(
                1
                for r in responses
                if r.get("assignedGuestId") or r.get("assignedGuestName")
            ),
        }

        self._send_json(200, {"guests": guests, "responses": responses, "stats": stats})

    def _handle_rsvp_post(self):
        payload = self._read_body()
        guest_name = normalize_text(payload.get("guestName"), 160)

        if len(guest_name) < 2:
            self._send_json(400, {"error": "Napište prosím své jméno."})
            return

        attending = payload.get("attending")
        if not isinstance(attending, bool):
            self._send_json(400, {"error": "Vyberte prosím, jestli dorazíte."})
            return

        response_id = str(uuid.uuid4())
        response = {
            "responseId": response_id,
            "guestName": guest_name,
            "attending": attending,
            "plusOne": "",
            "dietary": "",
            "note": normalize_text(payload.get("note"), 500),
            "assignedGuestId": "",
            "assignedGuestName": "",
            "assignedGroup": "",
            "submittedAt": datetime.now(timezone.utc).isoformat(),
        }

        responses = load_responses()
        responses.append(response)
        save_responses(responses)

        self._send_json(200, {"ok": True, "response": response})

    def _handle_rsvp_patch(self):
        payload = self._read_body()
        response_id = normalize_text(payload.get("responseId"), 120)

        if not response_id:
            self._send_json(400, {"error": "Chybí ID odpovědi."})
            return

        responses = load_responses()
        target = None
        for resp in responses:
            if resp.get("responseId") == response_id:
                target = resp
                break

        if not target:
            self._send_json(404, {"error": "Odpověď nebyla nalezena."})
            return

        guests = load_guests()
        assigned_guest_id = normalize_text(payload.get("assignedGuestId"), 120)
        assigned_guest = next((g for g in guests if g["id"] == assigned_guest_id), None)
        assigned_guest_name = (
            assigned_guest["name"]
            if assigned_guest
            else normalize_text(payload.get("assignedGuestName"), 160)
        )

        target["assignedGuestId"] = assigned_guest["id"] if assigned_guest else ""
        target["assignedGuestName"] = assigned_guest_name
        target["assignedGroup"] = assigned_guest.get("group", "") if assigned_guest else ""
        target["assignedAt"] = datetime.now(timezone.utc).isoformat()

        save_responses(responses)
        self._send_json(200, {"ok": True, "response": target})

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
        if self._is_rsvp_path():
            self._handle_rsvp_get()
            return
        body = self.send_head()
        if body is not None:
            self.wfile.write(body)

    def do_HEAD(self):
        self.send_head()

    def do_POST(self):
        if self._is_rsvp_path():
            self._handle_rsvp_post()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")

    def do_PATCH(self):
        if self._is_rsvp_path():
            self._handle_rsvp_patch()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.end_headers()


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
