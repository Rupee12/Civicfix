import { IssueModel } from "../models/Issue.js";
import { duplicateDetectionConfig } from "../config/duplicateDetection.js";
import { isDatabaseReady } from "../config/database.js";
import { ApiError } from "../utils/apiError.js";
import type { DuplicateCheckInput } from "../validators/duplicateValidators.js";

const stopWords = new Set(["a", "an", "and", "beside", "by", "for", "in", "near", "of", "on", "the", "to", "with"]);
const synonyms: Record<string, string> = { trash: "garbage", dumped: "dump", dumping: "dump", beside: "near", pile: "garbage" };

function tokens(value: string) {
  return new Set(value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((token) => token.length > 2 && !stopWords.has(token)).map((token) => synonyms[token] ?? token));
}

export function textSimilarity(left: string, right: string) {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  const union = new Set([...leftTokens, ...rightTokens]);
  if (!union.size) return 0;
  return [...leftTokens].filter((token) => rightTokens.has(token)).length / union.size;
}

export function duplicateConfidence(distanceMeters: number, radiusMeters: number, category: string, candidateCategory: string, title: string, description: string, candidateTitle: string, candidateDescription: string) {
  const geoScore = Math.max(0, 1 - distanceMeters / radiusMeters);
  const categoryScore = category === candidateCategory ? 1 : 0;
  const textScore = textSimilarity(`${title} ${description}`, `${candidateTitle} ${candidateDescription}`);
  const rawScore = geoScore * duplicateDetectionConfig.weights.geo + categoryScore * duplicateDetectionConfig.weights.category + textScore * duplicateDetectionConfig.weights.text;
  const score = categoryScore === 0 || distanceMeters >= radiusMeters * 0.8
    ? Math.min(rawScore, duplicateDetectionConfig.thresholds.possible - 0.01)
    : rawScore;
  const confidence = score >= duplicateDetectionConfig.thresholds.high ? "HIGH" : score >= duplicateDetectionConfig.thresholds.possible ? "POSSIBLE" : "LOW";
  return { score, confidence, geoScore, categoryScore, textScore } as const;
}

export async function findPotentialDuplicates(input: DuplicateCheckInput) {
  if (!isDatabaseReady()) throw new ApiError(503, "Database is unavailable", "DATABASE_UNAVAILABLE");
  const excludedStatuses = duplicateDetectionConfig.includeClosed ? ["REJECTED"] : ["REJECTED", "CLOSED"];
  const nearbyIssues = await IssueModel.aggregate([
    { $geoNear: { near: { type: "Point", coordinates: [input.longitude, input.latitude] }, distanceField: "distanceMeters", maxDistance: duplicateDetectionConfig.radiusMeters, spherical: true, query: { status: { $nin: excludedStatuses } } } },
    { $limit: 50 },
  ]);
  return nearbyIssues.map((issue) => {
    const distanceMeters = Number(issue.distanceMeters);
    const result = duplicateConfidence(distanceMeters, duplicateDetectionConfig.radiusMeters, input.category, issue.category, input.title, input.description, issue.title, issue.description);
    return { issueId: String(issue._id), title: issue.title, category: issue.category, distanceMeters: Math.round(distanceMeters), duplicateScore: Number(result.score.toFixed(4)), confidence: result.confidence, supportCount: issue.supportCount, reportCount: issue.reportCount, media: issue.media };
  }).filter((candidate) => candidate.confidence !== "LOW").sort((left, right) => right.duplicateScore - left.duplicateScore).slice(0, duplicateDetectionConfig.maxCandidates);
}