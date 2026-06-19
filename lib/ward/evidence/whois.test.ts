import { describe, it, expect } from "vitest";
import { rdapLookup } from "./whois";

const sample = {
  ldhName: "unknown-host.ru",
  status: ["active"],
  events: [
    { eventAction: "registration", eventDate: "2020-01-01T00:00:00Z" },
    { eventAction: "expiration", eventDate: "2027-01-01T00:00:00Z" },
  ],
  entities: [
    {
      roles: ["registrar"],
      vcardArray: ["vcard", [["version", {}, "text", "4.0"], ["fn", {}, "text", "Ned-Host LLC"]]],
    },
  ],
  nameservers: [{ ldhName: "ns1.ned.ru" }, { ldhName: "ns2.ned.ru" }],
};

describe("rdapLookup", () => {
  it("riduce l'host al dominio registrabile ed estrae registrar/date/nameserver", async () => {
    const fetchFn = async () => ({ ok: true, json: async () => sample });
    const r = await rdapLookup("cdn.unknown-host.ru", fetchFn);
    expect(r.source).toBe("rdap");
    expect(r.domain).toBe("unknown-host.ru");
    expect(r.registrar).toBe("Ned-Host LLC");
    expect(r.created).toBe("2020-01-01T00:00:00Z");
    expect(r.expires).toBe("2027-01-01T00:00:00Z");
    expect(r.nameservers).toEqual(["ns1.ned.ru", "ns2.ned.ru"]);
  });
  it("fetch non ok -> summary vuoto (source none)", async () => {
    const fetchFn = async () => ({ ok: false, json: async () => ({}) });
    const r = await rdapLookup("x.example.com", fetchFn);
    expect(r.source).toBe("none");
    expect(r.registrar).toBeNull();
  });
  it("eccezione di rete -> summary vuoto, non lancia", async () => {
    const fetchFn = async () => {
      throw new Error("net down");
    };
    const r = await rdapLookup("x.example.com", fetchFn);
    expect(r.source).toBe("none");
  });
});
