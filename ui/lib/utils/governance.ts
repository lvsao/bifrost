/**
 * Parses a duration string (e.g., "1m", "5m", "1h", "1d", "1w", "1M") into human readable format
 */
export function parseResetPeriod(duration: string): string {
	if (!duration) return "Unknown";

	const timeValue = parseInt(duration.slice(0, -1));
	const timeUnit = duration.slice(-1);

	const unitMap: Record<string, { singular: string; plural: string }> = {
		s: { singular: "second", plural: "seconds" },
		m: { singular: "minute", plural: "minutes" },
		h: { singular: "hour", plural: "hours" },
		d: { singular: "day", plural: "days" },
		w: { singular: "week", plural: "weeks" },
		M: { singular: "month", plural: "months" },
		y: { singular: "year", plural: "years" },
	};

	const unit = unitMap[timeUnit];
	if (!unit) return duration;

	const unitName = timeValue === 1 ? unit.singular : unit.plural;
	return `${timeValue} ${unitName}`;
}

import { formatCompactNumber } from "./numbers";
import type { ModelConfig, ModelRateLimitMetric, RateLimit } from "@/lib/types/governance";

export function formatCurrency(dollars: number) {
	return `$${dollars.toFixed(2)}`;
}

const shortDurationLabels: Record<string, string> = {
	"1m": "/min",
	"5m": "/5min",
	"15m": "/15min",
	"30m": "/30min",
	"1h": "/hr",
	"6h": "/6hr",
	"1d": "/day",
	"1w": "/wk",
	"1M": "/mo",
};

/**
 * Formats rate limit into compact display lines.
 * e.g. ["10K tokens/hr", "100 req/hr"]
 */
export function formatRateLimitLines(
	rateLimits:
		| {
				token_max_limit?: number | null;
				token_reset_duration?: string | null;
				request_max_limit?: number | null;
				request_reset_duration?: string | null;
		  }
		| null
		| undefined,
): string[] {
	if (!rateLimits) return [];
	const lines: string[] = [];
	if (rateLimits.token_max_limit != null) {
		const duration = rateLimits.token_reset_duration ?? "";
		const suffix = shortDurationLabels[duration] ?? (duration ? `/${duration}` : "");
		lines.push(`${formatCompactNumber(rateLimits.token_max_limit)} tokens${suffix}`);
	}
	if (rateLimits.request_max_limit != null) {
		const duration = rateLimits.request_reset_duration ?? "";
		const suffix = shortDurationLabels[duration] ?? (duration ? `/${duration}` : "");
		lines.push(`${formatCompactNumber(rateLimits.request_max_limit)} req${suffix}`);
	}
	return lines;
}

/**
 * Calculates usage percentage for rate limits
 */
export function calculateUsagePercentage(current: number, max: number): number {
	if (max === 0) return 0;
	return Math.round((current / max) * 100);
}

/**
 * Gets the appropriate variant for usage percentage badges
 */
export function getUsageVariant(percentage: number): "default" | "secondary" | "destructive" | "outline" {
	if (percentage >= 90) return "destructive";
	if (percentage >= 75) return "secondary";
	return "default";
}

export interface ModelRateLimitRule {
	id?: string;
	metric: ModelRateLimitMetric;
	max_limit: number;
	reset_duration: string;
	current_usage: number;
}

/**
 * Normalizes both the new model-owned rule array and the legacy paired row
 * into one UI shape. Legacy rows intentionally omit IDs so saving them causes
 * the API to match by metric/window and copy their existing usage safely.
 */
export function getModelRateLimitRules(modelConfig: ModelConfig | null | undefined): ModelRateLimitRule[] {
	if (!modelConfig) return [];
	const rules: ModelRateLimitRule[] = [];
	for (const rateLimit of modelConfig.rate_limits ?? []) {
		if (rateLimit.metric === "tokens" && rateLimit.token_max_limit != null && rateLimit.token_reset_duration) {
			rules.push({
				id: rateLimit.id,
				metric: "tokens",
				max_limit: rateLimit.token_max_limit,
				reset_duration: rateLimit.token_reset_duration,
				current_usage: rateLimit.token_current_usage ?? 0,
			});
		} else if (rateLimit.metric === "requests" && rateLimit.request_max_limit != null && rateLimit.request_reset_duration) {
			rules.push({
				id: rateLimit.id,
				metric: "requests",
				max_limit: rateLimit.request_max_limit,
				reset_duration: rateLimit.request_reset_duration,
				current_usage: rateLimit.request_current_usage ?? 0,
			});
		} else {
			rules.push(...legacyRateLimitRules(rateLimit));
		}
	}
	if (modelConfig.rate_limit) rules.push(...legacyRateLimitRules(modelConfig.rate_limit));
	return rules;
}

function legacyRateLimitRules(rateLimit: RateLimit): ModelRateLimitRule[] {
	const rules: ModelRateLimitRule[] = [];
	if (rateLimit.token_max_limit != null && rateLimit.token_reset_duration) {
		rules.push({
			metric: "tokens",
			max_limit: rateLimit.token_max_limit,
			reset_duration: rateLimit.token_reset_duration,
			current_usage: rateLimit.token_current_usage ?? 0,
		});
	}
	if (rateLimit.request_max_limit != null && rateLimit.request_reset_duration) {
		rules.push({
			metric: "requests",
			max_limit: rateLimit.request_max_limit,
			reset_duration: rateLimit.request_reset_duration,
			current_usage: rateLimit.request_current_usage ?? 0,
		});
	}
	return rules;
}