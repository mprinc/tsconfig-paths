import { assert } from "chai";
import { getAbsoluteMappingEntries } from "../src/mapping-entry";
import { join } from "path";

describe("mapping-entry", () => {
	it("should change to absolute paths and sort in longest prefix order", () => {
		const result = getAbsoluteMappingEntries(
			"/absolute/base/url",
			{
				"*": ["foo1", "foo2"],
				"longest/pre/fix/*": ["foo2/bar"],
				"pre/fix/*": ["foo3"],
			},
			true
		);
		assert.deepEqual(result, [
			{
				pattern: "longest/pre/fix/*",
				paths: [join("/absolute", "base", "url", "foo2", "bar")],
			},
			{
				pattern: "pre/fix/*",
				paths: [join("/absolute", "base", "url", "foo3")],
			},
			{
				pattern: "*",
				paths: [join("/absolute", "base", "url", "foo1"), join("/absolute", "base", "url", "foo2")],
			},
		]);
	});

	it("should change to absolute paths and sort in longest prefix order, but avoid already absolute paths", () => {
		const result = getAbsoluteMappingEntries(
			"/absolute/base/url",
			{
				"pre/fix/*": ["foo3"],
				"pre/fix2/*": ["/absolute_path/foo3"],
			},
			false
		);
		assert.deepEqual(result, [
			{
				pattern: "pre/fix2/*",
				paths: [join("/absolute_path", "foo3")],
			},
			{
				pattern: "pre/fix/*",
				paths: [join("/absolute", "base", "url", "foo3")],
			},
		]);
	});

	it("should should add a match-all pattern when requested", () => {
		let result = getAbsoluteMappingEntries("/absolute/base/url", {}, true);
		assert.deepEqual(result, [
			{
				pattern: "*",
				paths: [join("/absolute", "base", "url", "*")],
			},
		]);

		result = getAbsoluteMappingEntries("/absolute/base/url", {}, false);
		assert.deepEqual(result, []);
	});
});
