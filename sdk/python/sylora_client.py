"""SYLORA Python SDK foundation (requests-based)."""

from __future__ import annotations

import json
from typing import Any, Optional
from urllib import error, parse, request


class SyloraClient:
    def __init__(self, base_url: str = "http://localhost:8787", token: str = "", api_key: str = "") -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.api_key = api_key

    def _request(self, path: str, method: str = "GET", body: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        data = None if body is None else json.dumps(body).encode("utf-8")
        req = request.Request(self.base_url + path, data=data, method=method)
        req.add_header("Accept", "application/json")
        if body is not None:
            req.add_header("Content-Type", "application/json")
        if self.token:
            req.add_header("Authorization", f"Bearer {self.token}")
        if self.api_key:
            req.add_header("X-Sylora-Key", self.api_key)
        try:
            with request.urlopen(req, timeout=30) as res:
                return json.loads(res.read().decode("utf-8"))
        except error.HTTPError as exc:
            payload = exc.read().decode("utf-8")
            raise RuntimeError(payload or f"HTTP_{exc.code}") from exc

    def ecosystem_status(self) -> dict[str, Any]:
        return self._request("/api/ecosystem/status")

    def identity(self) -> dict[str, Any]:
        return self._request("/api/ecosystem/identity/me")

    def search(self, q: str) -> dict[str, Any]:
        return self._request(f"/api/ecosystem/search?q={parse.quote(q)}")
