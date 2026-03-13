#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_BASE_URL = "http://127.0.0.1:3001"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run optional Selenium UI smoke tests against the local Petong app."
    )
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help="Base URL for the running app. Default: %(default)s",
    )
    parser.add_argument(
        "--start-backend",
        action="store_true",
        help="Start the local backend before running Selenium tests.",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run Chrome in headless mode. By default the browser is visible.",
    )
    parser.add_argument(
        "--test",
        action="append",
        choices=["routes", "public"],
        help="Limit execution to one or more named smoke tests.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=20.0,
        help="Seconds to wait for the backend health endpoint. Default: %(default)s",
    )
    return parser.parse_args()


def wait_for_health(base_url: str, timeout: float) -> None:
    deadline = time.time() + timeout
    health_url = f"{base_url.rstrip('/')}/health"

    while time.time() < deadline:
        try:
            with urllib.request.urlopen(health_url, timeout=2) as response:
                if response.status == 200:
                    return
        except Exception:
            time.sleep(0.5)

    raise RuntimeError(f"Timed out waiting for backend health at {health_url}")


def start_backend(base_url: str) -> tuple[subprocess.Popen[bytes], str]:
    temp_dir = tempfile.mkdtemp(prefix="petong-selenium-")
    port = parse_port(base_url)
    env = os.environ.copy()
    env["PORT"] = str(port)
    env["PETONG_DATA_FILE"] = str(Path(temp_dir) / "petong-data.json")
    env["PETONG_PLATFORM_DATA_FILE"] = str(Path(temp_dir) / "petong-platform.json")
    env["PETONG_TRANSPARENCY_DATA_FILE"] = str(Path(temp_dir) / "petong-transparency.json")

    process = subprocess.Popen(
        ["node", "backend/index.js"],
        cwd=ROOT_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=env,
        preexec_fn=os.setsid,
    )
    return process, temp_dir


def stop_backend(process: subprocess.Popen[bytes] | None, temp_dir: str | None) -> None:
    if not process:
        return

    if process.poll() is not None:
        return

    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        os.killpg(os.getpgid(process.pid), signal.SIGKILL)

    if temp_dir:
        subprocess.run(["rm", "-rf", temp_dir], check=False)


def require_selenium():
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
    except ModuleNotFoundError as error:
        raise RuntimeError(
            "selenium is not installed. Run `python3 -m pip install -r requirements-ui.txt` first."
        ) from error

    return webdriver, Options, By, WebDriverWait, EC


def build_driver(headless: bool):
    webdriver, Options, _, _, _ = require_selenium()
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,1200")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    chrome_binary = os.environ.get("CHROME_BINARY")
    if chrome_binary:
        options.binary_location = chrome_binary

    return webdriver.Chrome(options=options)


def parse_port(base_url: str) -> int:
    parsed = urllib.parse.urlparse(base_url)
    if parsed.port:
        return parsed.port
    if parsed.scheme == "https":
        return 443
    return 80


def api_request(base_url: str, path: str, method: str = "GET", body: dict | None = None, token: str | None = None, tenant_id: str | None = None) -> dict:
    headers = {}
    payload = None

    if token:
        headers["authorization"] = f"Bearer {token}"
    if tenant_id:
        headers["x-tenant-id"] = tenant_id
    if body is not None:
        headers["content-type"] = "application/json"
        payload = json.dumps(body).encode("utf-8")

    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=payload,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        raise RuntimeError(f"API request failed for {path}: {error.code} {detail}") from error


def seed_public_demo(base_url: str) -> dict:
    stamp = str(int(time.time() * 1000))
    email = f"selenium+{stamp}@example.com"
    slug = f"demo-ngo-{stamp}"

    register = api_request(
        base_url,
        "/api/auth/register",
        method="POST",
        body={"name": "Selenium Admin", "email": email, "password": "password123"},
    )
    token = register["token"]
    tenant = api_request(
        base_url,
        "/api/tenants",
        method="POST",
        token=token,
        body={
            "name": "Demo NGO",
            "slug": slug,
            "primaryColor": "#ea7a30",
            "secondaryColor": "#f6ce55",
            "description": "Seeded for Selenium public route checks",
        },
    )["tenant"]

    api_request(
        base_url,
        "/api/pets",
        method="POST",
        token=token,
        tenant_id=tenant["id"],
        body={
            "name": "Luna",
            "species": "dog",
            "breed": "mixed",
            "size": "medium",
            "city": "Sao Paulo",
            "healthStatus": "vaccinated",
            "specialNeeds": "",
            "description": "Friendly public listing from Selenium setup",
            "ageGroup": "adult",
        },
    )

    campaign = api_request(
        base_url,
        "/api/transparency/campaigns",
        method="POST",
        token=token,
        tenant_id=tenant["id"],
        body={
            "name": "Medical Care",
            "description": "Emergency care campaign",
            "goalAmount": 500,
        },
    )["campaign"]

    api_request(
        base_url,
        "/api/transparency/donations",
        method="POST",
        token=token,
        tenant_id=tenant["id"],
        body={
            "campaignId": campaign["id"],
            "donorName": "Selenium Donor",
            "amount": 125,
            "note": "Browser smoke setup",
        },
    )

    return {"slug": slug, "tenantName": tenant["name"], "petName": "Luna", "campaignName": campaign["name"]}


def assert_text(driver, by, selector: str, expected: str) -> None:
    _, _, _, WebDriverWait, EC = require_selenium()
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((by, selector)))
    text = driver.find_element(by, selector).text
    if expected not in text:
        raise AssertionError(
            f"Expected '{expected}' in '{selector}', got '{text}'. "
            f"url={driver.current_url} title={driver.title!r}"
        )


def run_routes_smoke(driver, base_url: str) -> None:
    _, _, By, _, _ = require_selenium()
    for path, expected in (
        ("/", "Every adoption workflow deserves a warmer front door."),
        ("/about", "Built for rescue teams that need speed and trust"),
        ("/dashboard/transparency", "Transparency Summary"),
        ("/missing-route", "Page not found"),
    ):
        driver.get(f"{base_url.rstrip('/')}{path}")
        assert_text(driver, By.TAG_NAME, "main", expected)


def run_public_smoke(driver, base_url: str) -> None:
    _, _, By, _, _ = require_selenium()
    seeded = seed_public_demo(base_url)
    driver.get(f"{base_url.rstrip('/')}/t/{seeded['slug']}")
    assert_text(driver, By.TAG_NAME, "main", "Tenant profile and available pets")
    assert_text(driver, By.TAG_NAME, "main", seeded["tenantName"])
    assert_text(driver, By.TAG_NAME, "main", seeded["petName"])
    assert_text(driver, By.TAG_NAME, "main", seeded["campaignName"])


def main() -> int:
    args = parse_args()
    selected = args.test or ["routes"]
    backend = None
    temp_dir = None
    driver = None

    try:
        if args.start_backend:
            backend, temp_dir = start_backend(args.base_url)

        wait_for_health(args.base_url, args.timeout)
        driver = build_driver(args.headless)
        try:
            if "routes" in selected:
                run_routes_smoke(driver, args.base_url)
            if "public" in selected:
                run_public_smoke(driver, args.base_url)
        finally:
            driver.quit()
    except Exception as error:
        title = ""
        current_url = ""
        page_snippet = ""
        try:
            title = driver.title
            current_url = driver.current_url
            page_snippet = driver.page_source[:600].replace("\n", " ")
        except Exception:
            pass

        print(f"[selenium-ui] {error}", file=sys.stderr)
        if title or current_url or page_snippet:
            print(
                f"[selenium-ui] diagnostic url={current_url} title={title!r} page={page_snippet}",
                file=sys.stderr,
            )
        return 1
    finally:
        stop_backend(backend, temp_dir)

    print("[selenium-ui] all selected Selenium smoke tests passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
