/* cov7seg lab core: pure data and conflict/score logic, no DOM. */
(function (root) {
  "use strict";

  const SEGMENTS = ["a", "b", "c", "d", "e", "f", "g"];
  const SEG_INDEX = Object.fromEntries(SEGMENTS.map((s, i) => [s, i]));

  // A cover removes the whole outermost line on that side.
  const COVERS = {
    top: ["a"],
    right: ["b", "c"],
    bottom: ["d"],
    left: ["e", "f"],
  };
  const COVER_ORDER = ["top", "right", "bottom", "left"];

  function maskFromNames(names) {
    let m = 0;
    for (const name of names) m |= 1 << SEG_INDEX[name];
    return m;
  }
  const COVER_MASKS = Object.fromEntries(
    COVER_ORDER.map((c) => [c, maskFromNames(COVERS[c])])
  );

  function maskOf(pattern) {
    let m = 0;
    for (let i = 0; i < 7; i++) if (pattern[i] === "1") m |= 1 << i;
    return m;
  }

  function bitsOf(mask) {
    let s = "";
    for (let i = 0; i < 7; i++) s += (mask >> i) & 1 ? "1" : "0";
    return s;
  }

  function hamming(p, q) {
    let n = 0;
    for (let i = 0; i < 7; i++) if (((p >> i) & 1) !== ((q >> i) & 1)) n++;
    return n;
  }

  const WEIGHTS = { a: 1, b: 1, c: 1, d: 0.6, e: 1, f: 1.2, g: 1.1 };
  const LAMBDA_VIS = 1.0;
  const LAMBDA_OCC = 0.3;

  function weightedDistance(p, q) {
    let d = 0;
    for (let i = 0; i < 7; i++) {
      if (((p >> i) & 1) !== ((q >> i) & 1)) d += WEIGHTS[SEGMENTS[i]];
    }
    return d;
  }

  function occludedDistance(p, q) {
    let d = 0;
    for (const c of COVER_ORDER) {
      d += weightedDistance(p & ~COVER_MASKS[c], q & ~COVER_MASKS[c]);
    }
    return d;
  }

  function glyphScore(p, q) {
    return Math.exp(
      -(LAMBDA_VIS * weightedDistance(p, q) + LAMBDA_OCC * occludedDistance(p, q))
    );
  }

  const STANDARD = {
    "0": "1111110", "1": "0110000", "2": "1101101", "3": "1111001",
    "4": "0110011", "5": "1011011", "6": "1011111", "7": "1110000",
    "8": "1111111", "9": "1111011", A: "1110111", b: "0011111",
    C: "1001110", d: "0111101", E: "1001111", F: "1000111",
  };

  const FONT_TABLES = {
    standardDec: {
      "0": "1111110", "1": "0110000", "2": "1101101", "3": "1111001",
      "4": "0110011", "5": "1011011", "6": "1011111", "7": "1110000",
      "8": "1111111", "9": "1111011",
    },
    docDec: {
      "0": "1111110", "1": "0111000", "2": "1101101", "3": "1110001",
      "4": "0110011", "5": "0011011", "6": "1001111", "7": "1110000",
      "8": "0111111", "9": "1111011",
    },
    optDec: {
      "0": "1111110", "1": "0111000", "2": "1101101", "3": "1110001",
      "4": "0110011", "5": "1010011", "6": "1011111", "7": "1110000",
      "8": "0111111", "9": "1111011",
    },
    minFlipDec: {
      "0": "1111110", "1": "0110000", "2": "1101101", "3": "1110001",
      "4": "0110011", "5": "1010011", "6": "1011111", "7": "1100000",
      "8": "0111111", "9": "1111011",
    },
    top0Dec: {
      "0": "1111110", "1": "0111000", "2": "1101101", "3": "0111001",
      "4": "0100011", "5": "1011011", "6": "0011111", "7": "1110000",
      "8": "1111111", "9": "1110011",
    },
    minMismatchDec: {
      "0": "0011101", "1": "0000010", "2": "1110001", "3": "0000001",
      "4": "1110010", "5": "0001100", "6": "1100011", "7": "0011000",
      "8": "1111111", "9": "1111110",
    },
    standardHex: {
      "0": "1111110", "1": "0110000", "2": "1101101", "3": "1111001",
      "4": "0110011", "5": "1011011", "6": "1011111", "7": "1110000",
      "8": "1111111", "9": "1111011", A: "1110111", b: "0011111",
      C: "1001110", d: "0111101", E: "1001111", F: "1000111",
    },
    docHex: {
      "0": "1111110", "1": "0111000", "2": "1101101", "3": "1111001",
      "4": "0110011", "5": "1011011", "6": "1010001", "7": "1110000",
      "8": "0100111", "9": "1100011", A: "1110111", b: "0011111",
      C: "0001110", d: "0111101", E: "1001111", F: "1000101",
    },
    minFlipHex: {
      "0": "0111110", "1": "0110000", "2": "1101101", "3": "1111001",
      "4": "0110011", "5": "1011011", "6": "1011110", "7": "1100000",
      "8": "1110111", "9": "1111010", A: "1110110", b: "0011111",
      C: "1001100", d: "0111101", E: "1001111", F: "0000111",
    },
  };

  const FONTS = {
    "standard-dec": { name: "Standard 0–9", charset: "dec", glyphs: FONT_TABLES.standardDec },
    "doc-dec": { name: "Source note 0–9", charset: "dec", glyphs: FONT_TABLES.docDec },
    "opt-dec": { name: "Optimised 0–9 (4 flips)", charset: "dec", glyphs: FONT_TABLES.optDec },
    "min-flip-dec": { name: "Min-flip 0–9", charset: "dec", glyphs: FONT_TABLES.minFlipDec },
    "top0-dec": { name: "Topology-only 0–9", charset: "dec", glyphs: FONT_TABLES.top0Dec },
    "min-mismatch-dec": { name: "Unreadable 0–9 (counterexample)", charset: "dec", glyphs: FONT_TABLES.minMismatchDec },
    "standard-hex": { name: "Standard 0–F", charset: "hex", glyphs: FONT_TABLES.standardHex },
    "doc-hex": { name: "Source note 0–F", charset: "hex", glyphs: FONT_TABLES.docHex },
    "min-flip-hex": { name: "Min-flip 0–F", charset: "hex", glyphs: FONT_TABLES.minFlipHex },
  };

  function projected(p, cover) {
    return p & ~COVER_MASKS[cover];
  }

  function conflictCovers(p, q) {
    return COVER_ORDER.filter((c) => projected(p, c) === projected(q, c));
  }

  function conflictDetails(font) {
    const labels = Object.keys(font.glyphs);
    const out = [];
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i], b = labels[j];
        const pa = maskOf(font.glyphs[a]), pb = maskOf(font.glyphs[b]);
        const covers = conflictCovers(pa, pb);
        if (!covers.length) continue;
        for (const cover of covers) {
          out.push({
            a, b, cover,
            hidden: (pa ^ pb) & COVER_MASKS[cover],
            projection: bitsOf(projected(pa, cover)),
          });
        }
      }
    }
    return out;
  }

  function readings(font, masked, cover) {
    const out = [];
    for (const [label, pattern] of Object.entries(font.glyphs)) {
      if (projected(maskOf(pattern), cover) === masked) out.push(label);
    }
    return out;
  }

  function topology(p) {
    const table = root.COV_TOPOLOGY;
    if (!table) return null;
    return table[String(p)] || null;
  }

  function topoString(t) {
    return t ? `${t[0]}c/${t[1]}h` : "?";
  }

  function nearest(font, pattern, intended) {
    const labels = Object.keys(font.glyphs);
    const dInt = weightedDistance(pattern, maskOf(STANDARD[intended]));
    const others = labels
      .filter((l) => l !== intended)
      .map((l) => [weightedDistance(pattern, maskOf(STANDARD[l])), l])
      .sort((x, y) => x[0] - y[0]);
    const best = others[0] || [Infinity, null];
    return {
      distance: dInt,
      other: best[0],
      otherLabel: best[1],
      margin: best[0] - dInt,
      unique: dInt < best[0] - 1e-9,
      ties: Math.abs(best[0] - dInt) < 1e-9,
    };
  }

  function glyphInfo(font, label) {
    const p = maskOf(font.glyphs[label]);
    const s = maskOf(STANDARD[label]);
    const tp = topology(p);
    const ts = topology(s);
    return {
      label,
      pattern: font.glyphs[label],
      mask: p,
      flips: hamming(p, s),
      score: glyphScore(p, s),
      visibleDistance: weightedDistance(p, s),
      occludedDistance: occludedDistance(p, s),
      topology: tp,
      standardTopology: ts,
      topologyMatch: tp && ts ? tp[0] === ts[0] && tp[1] === ts[1] : null,
      nearest: nearest(font, p, label),
    };
  }

  function setInfo(font) {
    const labels = Object.keys(font.glyphs);
    const glyphs = labels.map((l) => glyphInfo(font, l));
    const scores = glyphs.map((g) => g.score);
    const margins = glyphs.map((g) => g.nearest.margin);
    return {
      name: font.name,
      charset: font.charset,
      labels,
      glyphs,
      conflicts: conflictDetails(font),
      meanScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      minScore: Math.min(...scores),
      totalFlips: glyphs.reduce((a, g) => a + g.flips, 0),
      topologyMismatches: glyphs.filter((g) => g.topologyMatch === false).map((g) => g.label),
      nearestMismatches: glyphs.filter((g) => !g.nearest.unique).map((g) => g.label),
      minNearestMargin: Math.min(...margins),
    };
  }

  const api = {
    SEGMENTS, SEG_INDEX, COVERS, COVER_ORDER, COVER_MASKS,
    STANDARD, FONTS, FONT_TABLES, WEIGHTS,
    maskFromNames, maskOf, bitsOf, hamming,
    weightedDistance, occludedDistance, glyphScore,
    projected, conflictCovers, conflictDetails, readings,
    topology, topoString, nearest, glyphInfo, setInfo,
  };
  root.COV = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
