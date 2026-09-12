import { describe, expect, it } from "vitest";
import { waMeLink } from "./utils";

describe("waMeLink", () => {
  it("builds link from admin display format", () => {
    expect(waMeLink("+62 898-7608-379")).toBe("https://wa.me/628987608379");
  });

  it("accepts already-raw digits", () => {
    expect(waMeLink("628123456789")).toBe("https://wa.me/628123456789");
  });

  it("returns null when unset or invalid — callers hide WA affordances", () => {
    expect(waMeLink("")).toBeNull();
    expect(waMeLink(undefined)).toBeNull();
    expect(waMeLink(null)).toBeNull();
    expect(waMeLink("not-a-number")).toBeNull();
    expect(waMeLink("12345")).toBeNull(); // too short
  });
});
