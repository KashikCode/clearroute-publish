const fs = require("fs"),
  assert = require("assert");
const { classify, parseCSV } = require("../docs/classifier.js");
const model = JSON.parse(fs.readFileSync("docs/model.json"));
const cases = JSON.parse(fs.readFileSync("docs/parity.json"));
for (const t of cases) {
  const r = classify(t.text, model);
  const max = Math.max(...r.scores.map((s, i) => Math.abs(s - t.scores[i])));
  assert(max < 1e-7, `Model parity error ${max}`);
  console.log(r.category, "max score error", max.toExponential(2));
}
assert.deepEqual(
  parseCSV('\uFEFFtext,id\r\n"a, b",1\r\n"two\nlines and ""quotes""",2'),
  [
    ["text", "id"],
    ["a, b", "1"],
    ['two\nlines and "quotes"', "2"],
  ],
);
assert.throws(() => parseCSV('text\n"open'));
assert.equal(classify("", model).coverage, 0);
assert.equal(classify("xx xxx XXXX", model).words, 0);
assert.equal(classify("123456 !!!!", model).terms.length, 0);
console.log(
  "PASS: Python/JS inference parity, CSV escaping/newlines/BOM, malformed CSV, empty/OOV inputs.",
);
