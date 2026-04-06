import { describe, expect, it } from "vitest";
import { cn, formatRelativeWindow } from "@/lib/utils";

describe("utility helpers", () => {
  it("joins truthy class names", () => {
    expect(cn("base", undefined, false, "accent", null, "mobile")).toBe(
      "base accent mobile",
    );
  });

  it("formats a readable window label", () => {
    expect(formatRelativeWindow("Phase 1", "Phase 3")).toBe("Phase 1 to Phase 3");
  });
});
