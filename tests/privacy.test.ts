import { describe, expect, it } from "vitest";
import { maskSensitiveText } from "../lib/privacy";

describe("PII masking", () => {
  it("masks national id, imei and email in text", () => {
    const input = "tc=12345678901 imei=123456789012345 mail=test@example.com";
    const output = maskSensitiveText(input);

    expect(output).not.toContain("12345678901");
    expect(output).not.toContain("123456789012345");
    expect(output).not.toContain("test@example.com");
    expect(output).toContain("***");
  });
});
