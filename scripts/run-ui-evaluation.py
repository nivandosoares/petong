#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
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
        description="Evaluate Petong UI routes in Chrome and emit a findings report."
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--start-backend", action="store_true")
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--report", default=str(ROOT_DIR / "tmp" / "ui-evaluation-report.json"))
    parser.add_argument("--timeout", type=float, default=20.0)
    return parser.parse_args()


def parse_port(base_url: str) -> int:
    from urllib.parse import urlparse

    parsed = urlparse(base_url)
    if parsed.port:
      return parsed.port
    if parsed.scheme == "https":
      return 443
    return 80


def start_backend(base_url: str):
    temp_dir = tempfile.mkdtemp(prefix="petong-ui-eval-")
    env = os.environ.copy()
    env["PORT"] = str(parse_port(base_url))
    env["PETONG_DATA_FILE"] = str(Path(temp_dir) / "petong-data.json")
    env["PETONG_PLATFORM_DATA_FILE"] = str(Path(temp_dir) / "petong-platform.json")
    env["PETONG_TRANSPARENCY_DATA_FILE"] = str(Path(temp_dir) / "petong-transparency.json")
    process = subprocess.Popen(
        ["node", "backend/index.js"],
        cwd=ROOT_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        preexec_fn=os.setsid,
    )
    return process, temp_dir


def stop_backend(process, temp_dir: str | None):
    if process and process.poll() is None:
        os.killpg(os.getpgid(process.pid), 15)
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(os.getpgid(process.pid), 9)
    if temp_dir:
        subprocess.run(["rm", "-rf", temp_dir], check=False)


def wait_for_health(base_url: str, timeout: float):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{base_url.rstrip('/')}/health", timeout=2) as response:
                if response.status == 200:
                    return
        except Exception:
            time.sleep(0.4)
    raise RuntimeError("Timed out waiting for backend")


def require_selenium():
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

    return webdriver, Options, By, WebDriverWait, EC


def build_driver(headless: bool):
    webdriver, Options, _, _, _ = require_selenium()
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,1200")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    chrome_binary = os.environ.get("CHROME_BINARY")
    if chrome_binary:
        options.binary_location = chrome_binary
    return webdriver.Chrome(options=options)


def click_element(driver, element):
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
    try:
        element.click()
    except Exception:
        driver.execute_script("arguments[0].click();", element)


def api_request(base_url: str, path: str, method: str = "GET", body: dict | None = None, token: str | None = None, tenant_id: str | None = None):
    headers = {}
    data = None
    if token:
        headers["authorization"] = f"Bearer {token}"
    if tenant_id:
        headers["x-tenant-id"] = tenant_id
    if body is not None:
        headers["content-type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(f"{base_url.rstrip('/')}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def seed_demo(base_url: str):
    stamp = str(int(time.time() * 1000))
    email = f"uieval+{stamp}@example.com"
    slug = f"ui-eval-{stamp}"
    register = api_request(
        base_url,
        "/api/auth/register",
        method="POST",
        body={"name": "UI Eval", "email": email, "password": "password123"},
    )
    token = register["token"]
    tenant = api_request(
        base_url,
        "/api/tenants",
        method="POST",
        token=token,
        body={
            "name": "UI Eval Rescue",
            "slug": slug,
            "primaryColor": "#ea7a30",
            "secondaryColor": "#f6ce55",
            "description": "Seeded UI evaluation tenant",
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
            "size": "medium",
            "city": "Sao Paulo",
            "description": "Seeded public pet",
            "ageGroup": "adult",
        },
    )
    return {"slug": slug, "tenant_name": tenant["name"]}


def evaluate_route(driver, route):
    _, _, By, WebDriverWait, EC = require_selenium()
    findings = []
    driver.get(route["url"])
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "main")))
    main_elements = driver.find_elements(By.TAG_NAME, "main")
    if len(main_elements) != 1:
        findings.append({"severity": "high", "code": "main-count", "message": f"Expected 1 <main>, found {len(main_elements)}"})
    title = driver.title
    if route["title"] not in title:
        findings.append({"severity": "medium", "code": "title", "message": f"Expected title to include '{route['title']}', got '{title}'"})
    main_text = main_elements[0].text
    if route["text"] not in main_text:
        findings.append({"severity": "high", "code": "route-content", "message": f"Expected route text '{route['text']}' in main content"})
    if route.get("active_link"):
        active = driver.find_elements(By.CSS_SELECTOR, '[aria-current="page"]')
        if not active:
            findings.append({"severity": "medium", "code": "aria-current", "message": "No active navigation link exposes aria-current=page"})
        elif route["active_link"] not in active[0].get_attribute("href"):
            findings.append({"severity": "medium", "code": "active-link-target", "message": f"Expected active link to target '{route['active_link']}'"})
    browser_logs = [entry for entry in driver.get_log("browser") if entry.get("level") == "SEVERE"]
    if browser_logs:
        findings.append({"severity": "high", "code": "browser-console", "message": browser_logs[0].get("message", "Browser console error")})
    return {
        "url": route["url"],
        "title": title,
        "findingCount": len(findings),
        "findings": findings,
    }


def is_internal_page_href(base_url: str, href: str) -> bool:
    if not href or href.startswith("#"):
        return False
    parsed = urllib.parse.urlparse(href)
    base = urllib.parse.urlparse(base_url)
    if parsed.scheme and parsed.netloc and (parsed.scheme != base.scheme or parsed.netloc != base.netloc):
        return False
    path = parsed.path or "/"
    if path in {"/styles.css", "/favicon.svg"}:
        return False
    if "." in Path(path).name and not path.endswith(".html"):
        return False
    return True


def collect_visible_internal_links(driver, base_url: str):
    _, _, By, _, _ = require_selenium()
    links = []
    seen = set()

    for element in driver.find_elements(By.CSS_SELECTOR, "a[href]"):
        href = element.get_attribute("href") or ""
        if not is_internal_page_href(base_url, href):
            continue
        normalized = urllib.parse.urljoin(base_url.rstrip("/") + "/", urllib.parse.urlparse(href).path.lstrip("/"))
        if normalized in seen:
            continue
        seen.add(normalized)
        links.append({"href": normalized, "text": (element.text or "").strip()})

    return links


def audit_route_links(driver, route, base_url: str):
    _, _, By, WebDriverWait, EC = require_selenium()
    findings = []

    driver.get(route["url"])
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "main")))
    source_title = driver.title
    source_links = collect_visible_internal_links(driver, base_url)

    for link in source_links:
        driver.get(link["href"])
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "main")))
        title = driver.title
        main_text = driver.find_element(By.TAG_NAME, "main").text
        if "Page Not Found" in title or "Page not found" in main_text:
            findings.append(
                {
                    "severity": "high",
                    "code": "dead-link",
                    "message": f"Visible link from '{source_title}' to '{link['href']}' lands on the not-found view",
                }
            )

    return {
        "url": route["url"],
        "linksChecked": len(source_links),
        "findingCount": len(findings),
        "findings": findings,
    }


def evaluate_human_journeys(driver, base_url: str, seeded: dict):
    _, _, By, WebDriverWait, EC = require_selenium()
    findings = []

    driver.get(f"{base_url.rstrip('/')}/")
    click_element(driver, driver.find_element(By.CSS_SELECTOR, 'a[href="/about"]'))
    WebDriverWait(driver, 10).until(
        EC.text_to_be_present_in_element((By.TAG_NAME, "main"), "Built for rescue teams that need speed and trust")
    )

    driver.get(f"{base_url.rstrip('/')}/")
    click_element(driver, driver.find_element(By.CSS_SELECTOR, 'a[href="/dashboard"]'))
    WebDriverWait(driver, 10).until(
        EC.text_to_be_present_in_element((By.TAG_NAME, "main"), "Authentication")
    )

    click_element(driver, driver.find_element(By.CSS_SELECTOR, '[data-route-link="dashboard-adoptions"]'))
    WebDriverWait(driver, 10).until(
        EC.text_to_be_present_in_element((By.TAG_NAME, "main"), "Adoption Discovery")
    )

    driver.get(f"{base_url.rstrip('/')}/missing-route")
    click_element(driver, driver.find_element(By.CSS_SELECTOR, 'a[href="/about"]'))
    WebDriverWait(driver, 10).until(
        EC.text_to_be_present_in_element((By.TAG_NAME, "main"), "Built for rescue teams that need speed and trust")
    )

    driver.get(f"{base_url.rstrip('/')}/t/{seeded['slug']}")
    WebDriverWait(driver, 10).until(
        EC.text_to_be_present_in_element((By.TAG_NAME, "main"), seeded["tenant_name"])
    )

    title = driver.title
    if seeded["tenant_name"] not in title:
        findings.append(
            {
                "severity": "medium",
                "code": "public-title",
                "message": f"Expected public route title to include '{seeded['tenant_name']}', got '{title}'",
            }
        )

    return {
        "journey": "visitor-navigation",
        "findingCount": len(findings),
        "findings": findings,
    }


def main():
    args = parse_args()
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    backend = None
    temp_dir = None
    driver = None
    results = []
    link_audits = []
    journeys = []
    try:
        if args.start_backend:
            backend, temp_dir = start_backend(args.base_url)
        wait_for_health(args.base_url, args.timeout)
        seeded = seed_demo(args.base_url)
        routes = [
            {"url": f"{args.base_url.rstrip('/')}/", "title": "Home", "text": "Every adoption workflow deserves a warmer front door.", "active_link": "/"},
            {"url": f"{args.base_url.rstrip('/')}/about", "title": "About", "text": "Built for rescue teams that need speed and trust", "active_link": "/about"},
            {"url": f"{args.base_url.rstrip('/')}/login", "title": "Login", "text": "Authentication"},
            {"url": f"{args.base_url.rstrip('/')}/register", "title": "Register", "text": "Authentication"},
            {
                "url": f"{args.base_url.rstrip('/')}/dashboard",
                "title": "Dashboard",
                "text": "Authentication",
                "active_link": "/dashboard",
            },
            {
                "url": f"{args.base_url.rstrip('/')}/dashboard/ngo",
                "title": "NGO Management",
                "text": "NGO Management",
                "active_link": "/dashboard/ngo",
            },
            {
                "url": f"{args.base_url.rstrip('/')}/dashboard/transparency",
                "title": "Transparency",
                "text": "No transparency records available yet.",
                "active_link": "/dashboard/transparency",
            },
            {
                "url": f"{args.base_url.rstrip('/')}/dashboard/pets",
                "title": "Pets",
                "text": "No pets registered for this tenant yet.",
                "active_link": "/dashboard/pets",
            },
            {
                "url": f"{args.base_url.rstrip('/')}/dashboard/adoptions",
                "title": "Adoptions",
                "text": "No discovery matches yet.",
                "active_link": "/dashboard/adoptions",
            },
            {"url": f"{args.base_url.rstrip('/')}/t/{seeded['slug']}", "title": seeded["tenant_name"], "text": seeded["tenant_name"]},
            {"url": f"{args.base_url.rstrip('/')}/missing-route", "title": "Page Not Found", "text": "Page not found"},
        ]
        driver = build_driver(args.headless)
        for route in routes:
            results.append(evaluate_route(driver, route))
        for route in routes:
            if route["title"] == "Page Not Found":
                continue
            link_audits.append(audit_route_links(driver, route, args.base_url))
        journeys.append(evaluate_human_journeys(driver, args.base_url, seeded))
    finally:
        if driver:
            driver.quit()
        stop_backend(backend, temp_dir)

    report = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "routes": results,
        "linkAudits": link_audits,
        "journeys": journeys,
        "totalFindings": sum(item["findingCount"] for item in results)
        + sum(item["findingCount"] for item in link_audits)
        + sum(item["findingCount"] for item in journeys),
    }
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    if report["totalFindings"]:
        print(json.dumps(report, indent=2))
        return 1

    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
