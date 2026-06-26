import { describe, it, expect } from "vitest";
import { isWhitelisted, splitByWhitelist } from "./whitelist";

type Find = { sourceUrl: string; pageUrl: string | null; host: string | null };
const f = (host: string, sourceUrl: string, pageUrl: string | null = null): Find => ({ host, sourceUrl, pageUrl });

describe("isWhitelisted", () => {
  it("match per host (l'intero dominio e' sicuro)", () => {
    expect(isWhitelisted(f("instagram.com", "https://instagram.com/a.jpg"), [{ type: "host", value: "instagram.com" }])).toBe(true);
  });
  it("match per url esatto (solo quella occorrenza)", () => {
    const find = f("blog.com", "https://blog.com/x.jpg", "https://blog.com/post");
    expect(isWhitelisted(find, [{ type: "url", value: "https://blog.com/x.jpg" }])).toBe(true);
    expect(isWhitelisted(find, [{ type: "url", value: "https://blog.com/post" }])).toBe(true);
  });
  it("nessun match = non in whitelist", () => {
    expect(isWhitelisted(f("a.ru", "https://a.ru/1.jpg"), [{ type: "host", value: "instagram.com" }])).toBe(false);
  });
});

describe("splitByWhitelist", () => {
  it("separa visibili da nascosti (i whitelisted spariscono dai risultati)", () => {
    const finds = [f("instagram.com", "https://instagram.com/a.jpg"), f("dark.ru", "https://dark.ru/b.jpg")];
    const { visible, whitelisted } = splitByWhitelist(finds, [{ type: "host", value: "instagram.com" }]);
    expect(visible.map((x) => x.host)).toEqual(["dark.ru"]);
    expect(whitelisted.map((x) => x.host)).toEqual(["instagram.com"]);
  });
});
