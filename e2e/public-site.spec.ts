import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/sobre",
  "/contato",
  "/termos",
  "/privacidade",
  "/institucional/termos",
  "/institucional/privacidade",
  "/institucional/anuncie",
  "/brickboard/como-funciona",
  "/lancamentos",
  "/em-alta",
  "/busca",
];

for (const route of routes) {
  test(`${route} loads, fits the viewport and passes axe`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: "load" });
    expect(response?.status()).toBeLessThan(400);
    const main = page.locator("main");
    await expect(main).toHaveCount(1);
    await expect(main).toBeVisible();
    const skipLink = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(skipLink).toHaveAttribute("href", "#conteudo-principal");
    const firstFocusable = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(
        "a[href], button, input:not([type=hidden]), select, textarea, [tabindex]",
      ));
      return candidates.find((candidate) => {
        const style = window.getComputedStyle(candidate);
        return candidate.tabIndex >= 0 && style.display !== "none" && style.visibility !== "hidden" && candidate.getClientRects().length > 0;
      })?.id;
    });
    expect(firstFocusable).toBe("link-pular-conteudo");
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    const skipLinkHeight = await skipLink.evaluate((link) => link.getBoundingClientRect().height);
    expect(skipLinkHeight).toBeGreaterThan(10);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#conteudo-principal$/);
    await expect(main).toBeFocused();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("internal page links resolve without client or server errors", async ({ page, request, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "A validação HTTP dos destinos roda uma vez por rota.");
  test.setTimeout(120_000);
  const origin = new URL(baseURL!).origin;
  const destinations = new Set<string>();
  for (const route of routes) {
    await page.goto(route, { waitUntil: "load" });
    const hrefs = await page.locator("a[href]").evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href));
    for (const href of hrefs) {
      const url = new URL(href);
      if (url.origin === origin && !url.pathname.startsWith("/api/")) destinations.add(`${url.pathname}${url.search}`);
    }
  }

  const failures: string[] = [];
  const hrefs = [...destinations];
  for (let index = 0; index < hrefs.length; index += 8) {
    const responses = await Promise.all(hrefs.slice(index, index + 8).map(async (href) => {
      try {
        const response = await request.get(new URL(href, origin).toString(), { maxRedirects: 0, timeout: 15_000 });
        return { href, status: response.status() };
      } catch {
        return { href, status: 0 };
      }
    }));
    for (const result of responses) if (result.status === 0 || result.status >= 400) failures.push(`${result.status} ${result.href}`);
  }

  expect(failures).toEqual([]);
});
