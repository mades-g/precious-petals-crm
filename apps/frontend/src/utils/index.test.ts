import { describe, expect, it } from "vitest";

import { formatDate, parseDateOnly, toDateOnlyValue, todayDateOnly } from ".";

describe("date utils", () => {
  it("formats date-only values in UK format", () => {
    expect(formatDate("2026-04-03")).toBe("03/04/2026");
  });

  it("parses date-only values without changing the calendar day", () => {
    const parsed = parseDateOnly("2026-04-03");

    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(3);
    expect(parsed?.getDate()).toBe(3);
  });

  it("rejects invalid date-only values", () => {
    expect(parseDateOnly("2026-02-31")).toBeUndefined();
  });

  it("serializes dates using local calendar values", () => {
    expect(toDateOnlyValue(new Date(2026, 3, 3, 0, 30))).toBe("2026-04-03");
  });

  it("builds today's date without UTC conversion", () => {
    expect(todayDateOnly(new Date(2026, 3, 3, 23, 45))).toBe("2026-04-03");
  });
});
