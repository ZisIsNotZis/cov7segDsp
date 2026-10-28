const assert = require("assert");
require("./data.js");
const C = require("./core.js");

assert.strictEqual(C.SEGMENTS.length, 7);
assert.strictEqual(C.conflictDetails(C.FONTS["doc-dec"]).length, 0);
assert(C.conflictDetails(C.FONTS["standard-dec"]).length > 0);
assert.strictEqual(C.setInfo(C.FONTS["opt-dec"]).nearestMismatches.length, 0);
assert.deepStrictEqual(
  C.setInfo(C.FONTS["doc-hex"]).nearestMismatches.sort(),
  ["6", "8"]
);
const topo8 = C.topology(C.maskOf(C.FONTS["standard-dec"].glyphs["8"]));
assert.deepStrictEqual(topo8, [1, 2]);
const topo0 = C.topology(C.maskOf(C.FONTS["standard-dec"].glyphs["0"]));
assert.deepStrictEqual(topo0, [1, 1]);
const n3 = C.nearest(C.FONTS["doc-dec"], C.maskOf(C.FONTS["doc-dec"].glyphs["3"]), "3");
assert(n3.unique && n3.margin > 0);
// The 6/8 right-cover conflict in the standard font.
const std = C.FONTS["standard-dec"];
const details = C.conflictDetails(std).filter(
  (d) => (d.a === "6" && d.b === "8") || (d.a === "8" && d.b === "6")
);
assert(details.some((d) => d.cover === "right"));
console.log("core tests passed");
