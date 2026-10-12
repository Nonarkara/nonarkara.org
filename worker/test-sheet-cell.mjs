import assert from "node:assert";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./apps-script/second-brain-sheet.js", import.meta.url), "utf8");
const match = source.match(/function sheetCell\(value\) \{[\s\S]*?\n\}/);
assert(match, "sheetCell must guard Apps Script cells");
const sheetCell = new Function(`${match[0]}; return sheetCell;`)();

assert.equal(sheetCell("=1+1"), "'=1+1");
assert.equal(sheetCell("+1+1"), "'+1+1");
assert.equal(sheetCell("-1+1"), "'-1+1");
assert.equal(sheetCell("@SUM(A1)"), "'@SUM(A1)");
assert.equal(sheetCell("\t=1"), "'\t=1");
assert.equal(sheetCell("\r=1"), "'\r=1");
assert.equal(sheetCell("a note"), "a note");
assert.equal(sheetCell(""), "");
assert.equal(sheetCell(null), "");
assert.equal(sheetCell(25), 25);
assert.equal(sheetCell(0), 0);
assert.equal(sheetCell(true), true);
assert.equal(sheetCell(false), false);

for (const field of ["p.dashboard", "p.text", "p.reflection", "p.duration_min || 25"]) {
  assert(source.includes(`sheetCell(${field}`), `caller field must be stored as text: ${field}`);
}

console.log("worker sheet cell: formula prefixes are stored as text");
