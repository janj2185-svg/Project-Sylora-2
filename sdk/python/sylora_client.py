"""SYLORA Python SDK foundation for the Developer Platform sandbox."""

from __future__ import annotations

import json
import urllib.request
from typing import Any, Optional


class SyloraClient:
    def __init__(self, base_url: str = "http://localhost:8787", api_key: Optional[str] = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    def request(self, path: str, method: str = "GET", body: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        data = None if body is None else json.dumps(body).encode("utf-8")
        req = urllib.request.Request(f"{self.base_url}{path}", data=data, method=method)
        req.add_header("content-type", "application/json")
        if self.api_key:
            req.add_header("authorization", f"Bearer {self.api_key}")
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode("utf-8"))

    def identity_me(self) -> dict[str, Any]:
        return self.request("/api/v1/identity/me")

    def list_agents(self) -> dict[str, Any]:
        return self.request("/api/agents")
