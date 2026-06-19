// Cattura di pagina con Playwright (chromium headless). LAZY: playwright si
// carica solo al primo uso e il browser resta in cache per la vita del processo
// (worker). Pensato per l'host worker (Railway): in build serve
// `npx playwright install --with-deps chromium`.

export interface PageCapture {
  screenshot: Uint8Array;
  html: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let browserPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getBrowser(): Promise<any> {
  if (browserPromise) return browserPromise;
  browserPromise = (async () => {
    const { chromium } = await import("playwright");
    return chromium.launch({ headless: true });
  })();
  return browserPromise;
}

// Carica l'URL in chromium e cattura screenshot (PNG, full page) + HTML snapshot.
// Timeout prudente; il contesto si chiude sempre (no leak). Non segue azioni:
// e' una cattura passiva di prova.
export async function capturePage(url: string, timeoutMs = 20000): Promise<PageCapture> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: "WardBot/1.0 (+protezione avatar)",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    const shot: Buffer = await page.screenshot({ fullPage: true });
    const html: string = await page.content();
    return { screenshot: new Uint8Array(shot), html };
  } finally {
    await context.close();
  }
}

// Chiude il browser in cache (cleanup nei test/spegnimento worker).
export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const b = await browserPromise;
  browserPromise = null;
  await b.close();
}
