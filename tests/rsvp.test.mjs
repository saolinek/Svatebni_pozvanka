import test from "node:test";
import assert from "node:assert/strict";

import { normalizeSongs } from "../netlify/functions/rsvp-utils.mjs";

test("normalizeSongs očistí a omezí hudební přání", () => {
  assert.deepEqual(
    normalizeSongs(["  ABBA – Dancing Queen  ", "", "A", "B", "C", "D", "E"]),
    ["ABBA – Dancing Queen", "A", "B", "C", "D"]
  );
});

test("normalizeSongs odmítne jiný typ a zkrátí příliš dlouhý název", () => {
  assert.deepEqual(normalizeSongs("není pole"), []);
  assert.equal(normalizeSongs(["x".repeat(200)])[0].length, 160);
});
