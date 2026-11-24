import assert from "node:assert/strict";
import test from "node:test";
import { buildThemedFavicon, getFaviconMarkColor, getThemedFaviconScript } from "./themed-favicon";

test("the favicon symbol is coral in the OpenMonetis palette and monochrome elsewhere", () => {
  assert.equal(getFaviconMarkColor("openmonetis", "dark"), "#fc941d");
  assert.equal(getFaviconMarkColor("openmonetis", "light"), "#fc941d");
  assert.equal(getFaviconMarkColor("github", "dark"), "#fff");
  assert.equal(getFaviconMarkColor("github", "light"), "#000");
});

test("the favicon is the bare symbol, without a background", () => {
  const svg = decodeURIComponent(buildThemedFavicon("#fff").replace("data:image/svg+xml,", ""));
  assert.doesNotMatch(svg, /<rect/);
  assert.match(svg, /<path[^>]+fill="#fff"/);
});

test("the head script paints the same symbol before the first frame", () => {
  const script = getThemedFaviconScript();
  assert.doesNotThrow(() => new Function(script));
  assert.match(script, /link\[rel~="icon"\]/);
  assert.match(script, /#fc941d/);
});
