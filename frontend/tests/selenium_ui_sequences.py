"""Automated UI audit sequences for Petong SaaS using Selenium.

This script is designed for autonomous agents:
- Executes long end-to-end SaaS workflows (auth, NGO, pets, adoption, transparency).
- Captures findings in machine-readable JSON + human-readable Markdown.
- Supports strict mode for CI gates while still allowing exploratory audit mode.

Usage:
  BASE_URL=http://127.0.0.1:3001 python frontend/tests/selenium_ui_sequences.py

Important env vars:
  UI_WAIT_SECONDS=12
  UI_AUDIT_REPORT_DIR=tmp/ui-audit
  UI_AUDIT_STRICT=1  # when 1, any high severity finding exits non-zero
"""

from __future__ import annotations

import json
import os
import time
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:3001")
WAIT_SECONDS = int(os.getenv("UI_WAIT_SECONDS", "12"))
REPORT_DIR = Path(os.getenv("UI_AUDIT_REPORT_DIR", "tmp/ui-audit"))
STRICT_MODE = os.getenv("UI_AUDIT_STRICT", "1") == "1"


@dataclass
class ScenarioContext:
    email: str
    password: str
    user_name: str
    tenant_name: str
    tenant_slug: str


@dataclass
class Finding:
    severity: str
    category: str
    title: str
    details: str


class PetongUIAudit:
    def __init__(self) -> None:
        options = webdriver.ChromeOptions()
        options.add_argument("--headless=new")
        options.add_argument("--window-size=1440,1800")
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, WAIT_SECONDS)
        self.findings: list[Finding] = []
        self.results: list[dict[str, str]] = []

        uid = uuid.uuid4().hex[:8]
        self.ctx = ScenarioContext(
            email=f"selenium-{uid}@example.com",
            password="secret123",
            user_name=f"Selenium QA {uid}",
            tenant_name=f"ONG Selenium {uid}",
            tenant_slug=f"ong-selenium-{uid}",
        )
        self.pet_id: str | None = None
        self.application_id: str | None = None
        self.campaign_id: str | None = None

    def close(self) -> None:
        self.driver.quit()

    def run_all(self) -> None:
        sequences = [
            self.seq_shell_and_accessibility,
            self.seq_register_and_session,
            self.seq_create_tenant_and_public_route,
            self.seq_theme_update_and_preview_sync,
            self.seq_pet_lifecycle,
            self.seq_adoption_application_lifecycle,
            self.seq_transparency_flow,
            self.seq_route_active_state_consistency,
        ]

        for sequence in sequences:
            name = sequence.__name__
            started = time.time()
            try:
                sequence()
                self.results.append({"sequence": name, "status": "passed", "duration_s": f"{time.time() - started:.1f}"})
                print(f"✅ {name} passed")
            except Exception as exc:  # noqa: BLE001 - explicit audit capture
                message = str(exc)
                self.results.append({"sequence": name, "status": "failed", "duration_s": f"{time.time() - started:.1f}"})
                self._add_finding("high", "workflow", f"Sequence failed: {name}", message)
                print(f"❌ {name} failed: {message}")

        self._heuristic_gap_checks()
        self._write_reports()

        high_count = sum(1 for item in self.findings if item.severity == "high")
        if STRICT_MODE and high_count:
            raise SystemExit(f"UI audit found {high_count} high-severity finding(s).")

    # Sequences
    def seq_shell_and_accessibility(self) -> None:
        self.driver.get(f"{BASE_URL}/")
        self._expect_text("Every adoption workflow deserves a warmer front door.")

        skip = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "a.skip-link")))
        assert skip.get_attribute("href").endswith("#main-content"), "Skip link should target #main-content"

        self.driver.get(f"{BASE_URL}/login")
        self._expect_text("Authentication")

    def seq_register_and_session(self) -> None:
        self.driver.get(f"{BASE_URL}/dashboard")
        self._fill("#register-form input[name='name']", self.ctx.user_name)
        self._fill("#register-form input[name='email']", self.ctx.email)
        self._fill("#register-form input[name='password']", self.ctx.password)
        self._click("#register-form button[type='submit']")

        self._expect_text("Registered and authenticated.")
        self._expect_text(self.ctx.email)

    def seq_create_tenant_and_public_route(self) -> None:
        self.driver.get(f"{BASE_URL}/dashboard/ngo")
        self._fill("#tenant-form input[name='name']", self.ctx.tenant_name)
        self._fill("#tenant-form input[name='slug']", self.ctx.tenant_slug)
        self._fill("#tenant-form input[name='description']", "ONG focada em adoção responsável.")
        self._click("#tenant-form button[type='submit']")

        self._expect_text("NGO created.")
        self._expect_text(self.ctx.tenant_slug)

        self.driver.get(f"{BASE_URL}/t/{self.ctx.tenant_slug}")
        self._expect_text("Tenant profile and available pets")
        self._expect_text(self.ctx.tenant_name)

    def seq_theme_update_and_preview_sync(self) -> None:
        tenant_id = self._extract_text(r"Tenant ID: (ngo_[A-Za-z0-9_-]+)")
        if not tenant_id:
            self._add_finding("medium", "ux", "Tenant ID not visible after NGO creation", "Could not capture tenant id for theme-edit sequence.")
            return

        self.driver.get(f"{BASE_URL}/dashboard/ngo")
        self._fill("#tenant-theme-form input[name='tenantId']", tenant_id)
        self._fill("#tenant-theme-form input[name='primaryColor']", "#1255cc")
        self._fill("#tenant-theme-form input[name='secondaryColor']", "#32d67a")
        self._fill("#tenant-theme-form input[name='description']", "Tema atualizado para inspeção automática")
        self._click("#tenant-theme-form button[type='submit']")
        self._expect_text("NGO theme updated.")

        self.driver.get(f"{BASE_URL}/t/{self.ctx.tenant_slug}")
        self._expect_text("#1255cc")

    def seq_pet_lifecycle(self) -> None:
        self.driver.get(f"{BASE_URL}/dashboard/pets")
        self._fill("#pet-form input[name='name']", "Luna")
        self._fill("#pet-form input[name='species']", "dog")
        self._fill("#pet-form input[name='breed']", "mixed")
        self._fill("#pet-form input[name='size']", "small")
        self._fill("#pet-form input[name='city']", "Sao Paulo")
        self._fill("#pet-form input[name='ageGroup']", "adult")
        self._fill("#pet-form input[name='description']", "Sociable and calm")
        self._click("#pet-form button[type='submit']")
        self._expect_text("Pet added.")

        self.pet_id = self._extract_text(r"Pet ID: (pet_[A-Za-z0-9_-]+)")
        if not self.pet_id:
            self._add_finding("high", "data-flow", "Pet creation did not expose Pet ID", "Application flow cannot continue without visible pet id.")

    def seq_adoption_application_lifecycle(self) -> None:
        if not self.pet_id:
            self._add_finding("high", "workflow", "Adoption flow skipped", "Missing pet id from prior sequence.")
            return

        self.driver.get(f"{BASE_URL}/dashboard/adoptions")
        self._fill("#application-form input[name='petId']", self.pet_id)
        self._fill("#application-form input[name='adopterName']", "Joana QA")
        self._fill("#application-form input[name='message']", "Tenho experiência com cães resgatados.")
        self._click("#application-form button[type='submit']")
        self._expect_text("Application submitted.")

        self.application_id = self._extract_text(r"Application ID: (app_[A-Za-z0-9_-]+)")
        if not self.application_id:
            self._add_finding("high", "data-flow", "Application ID missing from list", "Could not execute review action assertions.")
            return

        self._click("button[data-review-status='under_review']")
        self._expect_text("Application updated to under_review.")
        self._click("button[data-review-status='approved']")
        self._expect_text("Application updated to approved.")

    def seq_transparency_flow(self) -> None:
        self.driver.get(f"{BASE_URL}/dashboard/transparency")
        self._fill("#campaign-form input[name='name']", "Ração de inverno")
        self._fill("#campaign-form input[name='description']", "Compra de ração para 2 meses")
        self._fill("#campaign-form input[name='goalAmount']", "2500")
        self._click("#campaign-form button[type='submit']")
        self._expect_text("Campaign created.")

        self.campaign_id = self._extract_text(r"Campaign ID: (camp_[A-Za-z0-9_-]+)")
        if not self.campaign_id:
            self._add_finding("high", "data-flow", "Campaign ID missing", "Donation/expense forms need campaign id.")
            return

        self._fill("#donation-form input[name='campaignId']", self.campaign_id)
        self._fill("#donation-form input[name='donorName']", "Apoiador Selenium")
        self._fill("#donation-form input[name='amount']", "600")
        self._fill("#donation-form input[name='note']", "Contribuição mensal")
        self._click("#donation-form button[type='submit']")
        self._expect_text("Donation recorded.")

        self._fill("#expense-form input[name='campaignId']", self.campaign_id)
        self._fill("#expense-form input[name='category']", "food")
        self._fill("#expense-form input[name='description']", "Compra de ração")
        self._fill("#expense-form input[name='amount']", "150")
        self._click("#expense-form button[type='submit']")
        self._expect_text("Expense recorded.")
        self._expect_text("Tenant Totals")

    def seq_route_active_state_consistency(self) -> None:
        routes_to_links = {
            "/dashboard/ngo": "dashboard-ngo",
            "/dashboard/pets": "dashboard-pets",
            "/dashboard/adoptions": "dashboard-adoptions",
            "/dashboard/transparency": "dashboard-transparency",
        }
        for route, link_key in routes_to_links.items():
            self.driver.get(f"{BASE_URL}{route}")
            link = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, f"[data-route-link='{link_key}']")))
            classes = link.get_attribute("class") or ""
            if "is-active" not in classes:
                self._add_finding("medium", "navigation", "Active route style missing", f"Expected link {link_key} active on {route}.")

    # Helpers
    def _heuristic_gap_checks(self) -> None:
        source = self.driver.page_source
        if "type=\"checkbox\"" not in source and "Has Children" in source:
            self._add_finding(
                "medium",
                "usability",
                "Boolean inputs modeled as free text",
                "Profile boolean fields appear as plain text inputs, which can cause inconsistent values.",
            )

    def _write_reports(self) -> None:
        REPORT_DIR.mkdir(parents=True, exist_ok=True)
        data = {
            "base_url": BASE_URL,
            "strict_mode": STRICT_MODE,
            "results": self.results,
            "findings": [asdict(item) for item in self.findings],
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        (REPORT_DIR / "ui-audit-report.json").write_text(json.dumps(data, indent=2), encoding="utf-8")

        lines = [
            "# UI Audit Report",
            "",
            f"- Base URL: `{BASE_URL}`",
            f"- Strict mode: `{STRICT_MODE}`",
            "",
            "## Sequence Results",
        ]
        for item in self.results:
            icon = "✅" if item["status"] == "passed" else "❌"
            lines.append(f"- {icon} `{item['sequence']}` ({item['duration_s']}s)")

        lines.extend(["", "## Findings"])
        if not self.findings:
            lines.append("- ✅ No critical gaps detected in this run.")
        else:
            for finding in self.findings:
                lines.append(f"- **{finding.severity.upper()}** [{finding.category}] {finding.title}: {finding.details}")

        lines.extend(
            [
                "",
                "## Agent Next Actions",
                "1. Prioritize HIGH findings as code/test fixes.",
                "2. For MEDIUM findings, open issues with UX rationale and acceptance criteria.",
                "3. Re-run this script after each fix and compare `ui-audit-report.json` deltas.",
            ]
        )
        (REPORT_DIR / "ui-audit-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"📝 Report written to {REPORT_DIR / 'ui-audit-report.md'}")

    def _add_finding(self, severity: str, category: str, title: str, details: str) -> None:
        self.findings.append(Finding(severity=severity, category=category, title=title, details=details))

    def _fill(self, css: str, value: str) -> None:
        el = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, css)))
        el.clear()
        el.send_keys(value)

    def _click(self, css: str) -> None:
        el = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, css)))
        el.click()

    def _expect_text(self, text: str) -> None:
        try:
            self.wait.until(lambda d: text in d.page_source)
        except TimeoutException as exc:
            snippet = self.driver.page_source[:1500]
            raise AssertionError(f"Expected text not found: {text}\\nSnippet: {snippet}") from exc

    def _extract_text(self, regex: str) -> str | None:
        import re

        match = re.search(regex, self.driver.page_source)
        if not match:
            return None
        return match.group(1)


def main() -> None:
    started = time.time()
    suite = PetongUIAudit()
    try:
        suite.run_all()
        print(f"⏱️ Duration: {time.time() - started:.1f}s")
    finally:
        suite.close()


if __name__ == "__main__":
    main()
