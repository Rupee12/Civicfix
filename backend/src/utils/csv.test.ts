import assert from "node:assert/strict";
import test from "node:test";
import { csvValue } from "./csv.js";

test("CSV values escape delimiters, quotes, line breaks, and formulas", () => {
  assert.equal(csvValue('hello, "civic"\nteam'), '"hello, ""civic""\nteam"');
  assert.equal(csvValue("=HYPERLINK(\"https://example.com\")"), `"\'=HYPERLINK(""https://example.com"")"`);
});
