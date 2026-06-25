import { describe, it, expect } from "vitest";
import { isSafeRemoteImageUrl } from "./preview-guard";

// Il proxy anteprima scarica un URL salvato in scan_matches (origine Vision) e lo
// rilancia. Difesa SSRF: solo http/https verso host PUBBLICI; mai loopback, IP
// privati, link-local (incl. metadata cloud 169.254.169.254) o host interni.
describe("isSafeRemoteImageUrl", () => {
  it("accetta URL http/https pubblici", () => {
    expect(isSafeRemoteImageUrl("https://example.com/a.jpg")).toBe(true);
    expect(isSafeRemoteImageUrl("http://cdn.site.co/x/y.png")).toBe(true);
    expect(isSafeRemoteImageUrl("https://1.2.3.4/img.jpg")).toBe(true);
  });

  it("rifiuta schemi non http(s)", () => {
    expect(isSafeRemoteImageUrl("ftp://example.com/a.jpg")).toBe(false);
    expect(isSafeRemoteImageUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeRemoteImageUrl("data:image/png;base64,xxx")).toBe(false);
  });

  it("rifiuta input non-URL o vuoti", () => {
    expect(isSafeRemoteImageUrl("non un url")).toBe(false);
    expect(isSafeRemoteImageUrl("")).toBe(false);
  });

  it("rifiuta loopback e localhost", () => {
    expect(isSafeRemoteImageUrl("http://localhost/x.jpg")).toBe(false);
    expect(isSafeRemoteImageUrl("http://127.0.0.1/x.jpg")).toBe(false);
    expect(isSafeRemoteImageUrl("http://[::1]/x.jpg")).toBe(false);
  });

  it("rifiuta IPv4 privati e link-local (anche metadata cloud)", () => {
    expect(isSafeRemoteImageUrl("http://10.0.0.5/x.jpg")).toBe(false);
    expect(isSafeRemoteImageUrl("http://192.168.1.1/x.jpg")).toBe(false);
    expect(isSafeRemoteImageUrl("http://172.16.0.1/x.jpg")).toBe(false);
    expect(isSafeRemoteImageUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
  });

  it("rifiuta host interni", () => {
    expect(isSafeRemoteImageUrl("http://db.internal/x.jpg")).toBe(false);
    expect(isSafeRemoteImageUrl("http://printer.local/x.jpg")).toBe(false);
    expect(isSafeRemoteImageUrl("http://metadata.google.internal/x")).toBe(false);
  });

  it("non blocca per sbaglio host pubblici che iniziano per fc/fd", () => {
    expect(isSafeRemoteImageUrl("https://fcbarcelona.com/logo.png")).toBe(true);
    expect(isSafeRemoteImageUrl("https://fd-cdn.com/a.jpg")).toBe(true);
  });

  it("rifiuta IPv6 unique-local e link-local", () => {
    expect(isSafeRemoteImageUrl("http://[fc00::1]/x.jpg")).toBe(false);
    expect(isSafeRemoteImageUrl("http://[fe80::1]/x.jpg")).toBe(false);
  });
});
