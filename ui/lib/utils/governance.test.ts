import { getModelRateLimitRules } from "./governance";
import { describe, expect, it } from "vitest";

describe("getModelRateLimitRules", () => {
	it("normalizes every single-metric model rule without truncating windows", () => {
		const rules = getModelRateLimitRules({
			id: "model-config",
			model_name: "gemini-2.5-flash",
			rate_limits: [
				{ id: "rpm", metric: "requests", request_max_limit: 15, request_reset_duration: "1m", request_current_usage: 3 } as never,
				{ id: "rpd", metric: "requests", request_max_limit: 1500, request_reset_duration: "1d", request_current_usage: 81 } as never,
				{ id: "tpm", metric: "tokens", token_max_limit: 1000, token_reset_duration: "1m", token_current_usage: 20 } as never,
				{ id: "tpd", metric: "tokens", token_max_limit: 10000, token_reset_duration: "1d", token_current_usage: 800 } as never,
			],
		} as never);

		expect(rules).toEqual([
			{ id: "rpm", metric: "requests", max_limit: 15, reset_duration: "1m", current_usage: 3 },
			{ id: "rpd", metric: "requests", max_limit: 1500, reset_duration: "1d", current_usage: 81 },
			{ id: "tpm", metric: "tokens", max_limit: 1000, reset_duration: "1m", current_usage: 20 },
			{ id: "tpd", metric: "tokens", max_limit: 10000, reset_duration: "1d", current_usage: 800 },
		]);
	});

	it("converts a legacy paired row into two editable rules", () => {
		const rules = getModelRateLimitRules({
			id: "legacy-model",
			model_name: "gpt-4o",
			rate_limit: {
				id: "legacy",
				token_max_limit: 1000,
				token_reset_duration: "1m",
				token_current_usage: 10,
				token_last_reset: "",
				request_max_limit: 15,
				request_reset_duration: "1d",
				request_current_usage: 2,
				request_last_reset: "",
			} as never,
		} as never);

		expect(rules).toEqual([
			{ metric: "tokens", max_limit: 1000, reset_duration: "1m", current_usage: 10 },
			{ metric: "requests", max_limit: 15, reset_duration: "1d", current_usage: 2 },
		]);
	});

	it("returns no rules for an empty or absent model config", () => {
		expect(getModelRateLimitRules(undefined)).toEqual([]);
		expect(getModelRateLimitRules({ id: "empty", model_name: "gpt-4o" } as never)).toEqual([]);
	});
});