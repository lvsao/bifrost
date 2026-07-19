import { describe, expect, it } from "vitest";
import { applyRedactionMapping, applyRedactionMappingToValue, hasRedactionMappingEntries, mergeRedactionMappings } from "./redaction";

describe("redaction reveal helpers", () => {
	it("requires at least one phase mapping", () => {
		expect(hasRedactionMappingEntries()).toBe(false);
		expect(hasRedactionMappingEntries({ input: {}, output: {} })).toBe(false);
		expect(hasRedactionMappingEntries({ input: { "EMAIL-1": "private@example.com" } })).toBe(true);
	});

	it("reveals placeholders without mutating structured log data", () => {
		const source = { owner: "[EMAIL-1]", nested: ["hello [NAME-1]"] };
		const revealed = applyRedactionMappingToValue(source, {
			"EMAIL-1": "private@example.com",
			"NAME-1": "Madhu",
		});

		expect(revealed).toEqual({ owner: "private@example.com", nested: ["hello Madhu"] });
		expect(source).toEqual({ owner: "[EMAIL-1]", nested: ["hello [NAME-1]"] });
	});

	it("uses output mappings last when revealing mixed fields", () => {
		const merged = mergeRedactionMappings({ input: { "SECRET-1": "input" }, output: { "SECRET-1": "output" } });
		expect(applyRedactionMapping("failed for [SECRET-1]", merged)).toBe("failed for output");
	});
});