"""UI acceptance sequences for Petong SaaS using Selenium.

How to run (example):
  BASE_URL=http://127.0.0.1:3001 python frontend/tests/selenium_ui_sequences.py

Expected environment:
- Backend app shell running (serves frontend + API)
- Chrome/Chromium + matching chromedriver available
- Python package selenium installed

The script executes realistic rescue-SaaS workflows and validates
expected outcomes after each sequence.
"""

from __future__ import annotations

import os
import time
import uuid
from dataclasses import dataclass

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:3001")
WAIT_SECONDS = int(os.getenv("UI_WAIT_SECONDS", "12"))


@dataclass
class ScenarioContext:
    email: str
    password: str
    user_name: str
    tenant_name: str
    tenant_slug: str


class PetongUISequences:
    """High-value frontend acceptance checks for NGO adoption operations."""

    def __init__(self) -> None:
        opts = webdriver.ChromeOptions()
        opts.add_argument("--headless=new")
        opts.add_argument("--window-size=1440,1700")
        self.driver = webdriver.Chrome(options=opts)
        self.wait = WebDriverWait(self.driver, WAIT_SECONDS)

        uid = uuid.uuid4().hex[:8]
        self.ctx = ScenarioContext(
            email=f"selenium-{uid}@example.com",
            password="secret123",
            user_name=f"Selenium QA {uid}",
            tenant_name=f"ONG Selenium {uid}",
            tenant_slug=f"ong-selenium-{uid}",
        )

    def close(self) -> None:
        self.driver.quit()

    def run_all(self) -> None:
        self.sequence_shell_routes()
        self.sequence_register_auth()
        self.sequence_create_tenant_and_public_route()
        self.sequence_route_navigation_consistency()
        print("✅ All UI sequences passed.")

    # -----------------------------
    # Sequence 1: route shell smoke
    # -----------------------------
    def sequence_shell_routes(self) -> None:
        routes = [
            ("/", "Every adoption workflow deserves a warmer front door."),
            ("/login", "Authentication"),
            ("/dashboard", "Operations Desk"),
            ("/dashboard/ngo", "NGO Management"),
            ("/dashboard/pets", "Pets"),
            ("/dashboard/adoptions", "Adoption Discovery"),
            ("/dashboard/transparency", "Transparency Summary"),
        ]

        for route, expected_text in routes:
            self.driver.get(f"{BASE_URL}{route}")
            self._expect_text(expected_text)

        print("✅ Sequence 1 passed: shell routes render expected content.")

    # -----------------------------------
    # Sequence 2: registration + auth card
    # -----------------------------------
    def sequence_register_auth(self) -> None:
        self.driver.get(f"{BASE_URL}/dashboard")

        self._fill("#register-form input[name='name']", self.ctx.user_name)
        self._fill("#register-form input[name='email']", self.ctx.email)
        self._fill("#register-form input[name='password']", self.ctx.password)
        self._click("#register-form button[type='submit']")

        self._expect_text("Registered and authenticated.")
        self._expect_text(self.ctx.email)

        print("✅ Sequence 2 passed: register flow authenticates and updates auth state.")

    # --------------------------------------------
    # Sequence 3: create tenant + check public view
    # --------------------------------------------
    def sequence_create_tenant_and_public_route(self) -> None:
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

        print("✅ Sequence 3 passed: tenant creation reflected in public tenant route.")

    # -------------------------------------
    # Sequence 4: route nav and active state
    # -------------------------------------
    def sequence_route_navigation_consistency(self) -> None:
        self.driver.get(f"{BASE_URL}/dashboard/pets")
        pets_link = self.wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "[data-route-link='dashboard-pets']"))
        )
        classes = pets_link.get_attribute("class") or ""
        assert "is-active" in classes, "Expected Pets route link to be active on /dashboard/pets"

        # Public route should still render public preview container.
        self.driver.get(f"{BASE_URL}/t/{self.ctx.tenant_slug}")
        self.wait.until(EC.presence_of_element_located((By.ID, "public-tenant-view")))

        print("✅ Sequence 4 passed: route highlighting and public containers are consistent.")

    # ----------
    # utilities
    # ----------
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
            snippet = self.driver.page_source[:1200]
            raise AssertionError(f"Expected text not found: {text}\nPage snippet: {snippet}") from exc


def main() -> None:
    suite = PetongUISequences()
    try:
        started = time.time()
        suite.run_all()
        print(f"⏱️ Duration: {time.time() - started:.1f}s")
    finally:
        suite.close()


if __name__ == "__main__":
    main()
