import { Types } from "mongoose";
import { verificationConfig } from "../config/verificationConfig.js";
import { isDatabaseReady } from "../config/database.js";
import { IssueModel } from "../models/Issue.js";
import { IssueReportModel } from "../models/IssueReport.js";
import { IssueStatusHistoryModel } from "../models/IssueStatusHistory.js";
import { IssueSupportModel } from "../models/IssueSupport.js";
import { IssueVerificationModel, type VerificationVote } from "../models/IssueVerification.js";
import { UserModel } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import type { VerificationInput } from "../validators/workflowValidators.js";
import { createNotification } from "./notificationService.js";

function ready() { if (!isDatabaseReady()) throw new ApiError(503, "Database is unavailable", "DATABASE_UNAVAILABLE"); }
function issueId(value: string) { if (!Types.ObjectId.isValid(value)) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND"); return new Types.ObjectId(value); }

export async function isEligibleVerifier(issue: Types.ObjectId, user: Types.ObjectId) {
  const [report, support] = await Promise.all([
    IssueReportModel.exists({ issue, reportedBy: user }),
    IssueSupportModel.exists({ issue, user }),
  ]);
  return Boolean(report || support);
}

async function summary(issue: Types.ObjectId, user?: Types.ObjectId) {
  const [resolved, notResolved, own] = await Promise.all([
    IssueVerificationModel.countDocuments({ issue, vote: "RESOLVED" }),
    IssueVerificationModel.countDocuments({ issue, vote: "NOT_RESOLVED" }),
    user ? IssueVerificationModel.findOne({ issue, user }).lean() : undefined,
  ]);
  return {
    resolved, notResolved,
    thresholds: verificationConfig,
    yourVerification: own ? { vote: own.vote, comment: own.comment, updatedAt: own.updatedAt } : null,
  };
}

async function applyThreshold(issueId: Types.ObjectId, userId: Types.ObjectId, resolved: number, notResolved: number) {
  const issue = await IssueModel.findById(issueId);
  if (!issue || issue.status !== "VERIFICATION_PENDING") return issue;
  const target = notResolved >= verificationConfig.negativeVotesToReopen ? "IN_PROGRESS" : resolved >= verificationConfig.positiveVotesToClose ? "CLOSED" : undefined;
  if (!target) return issue;

  const history = target === "CLOSED"
    ? [await IssueStatusHistoryModel.create({ issueId, fromStatus: "VERIFICATION_PENDING", toStatus: "CLOSED", changedBy: userId, reason: "Citizen verification threshold reached" })]
    : [
      await IssueStatusHistoryModel.create({ issueId, fromStatus: "VERIFICATION_PENDING", toStatus: "REOPENED", changedBy: userId, reason: "Citizen rejection threshold reached" }),
      await IssueStatusHistoryModel.create({ issueId, fromStatus: "REOPENED", toStatus: "IN_PROGRESS", changedBy: userId, reason: "Reopened for authority work" }),
    ];
  issue.status = target;
  if (target === "CLOSED") issue.closedAt = new Date();
  try { await issue.save(); } catch (error) { await IssueStatusHistoryModel.deleteMany({ _id: { $in: history.map((item) => item._id) } }); throw error; }
  return issue;
}

export async function submitVerification(id: string, input: VerificationInput, userId: string) {
  ready();
  const issueObjectId = issueId(id);
  const userObjectId = new Types.ObjectId(userId);
  const [user, issue] = await Promise.all([UserModel.findById(userObjectId), IssueModel.findById(issueObjectId)]);
  if (!user || !user.isActive || user.role !== "CITIZEN") throw new ApiError(403, "Only active citizens can verify resolutions", "FORBIDDEN");
  if (!issue) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND");
  if (issue.status !== "VERIFICATION_PENDING") throw new ApiError(400, "Verification is only available while citizen verification is pending", "INVALID_VERIFICATION_STATE");
  if (!await isEligibleVerifier(issueObjectId, userObjectId)) throw new ApiError(403, "Only reporters and supporters can verify this issue", "VERIFICATION_NOT_ELIGIBLE");

  const existing = await IssueVerificationModel.findOne({ issue: issueObjectId, user: userObjectId });
  if (existing) {
    existing.vote = input.vote;
    existing.comment = input.comment;
    existing.history.push({ vote: input.vote, comment: input.comment, changedAt: new Date() });
    await existing.save();
  } else {
    await IssueVerificationModel.create({ issue: issueObjectId, user: userObjectId, vote: input.vote, comment: input.comment, history: [{ vote: input.vote, comment: input.comment, changedAt: new Date() }] });
  }
  const result = await summary(issueObjectId, userObjectId);
  const updatedIssue = await applyThreshold(issueObjectId, userObjectId, result.resolved, result.notResolved);
  if (updatedIssue?.status === "IN_PROGRESS" && updatedIssue.assignedTo) {
    await createNotification({ recipient: updatedIssue.assignedTo, type: "ISSUE_REOPENED", title: "Issue reopened", message: `Citizen verification reopened "${updatedIssue.title}".`, relatedEntityId: updatedIssue._id, relatedEntityType: "Issue", eventKey: `reopened:${updatedIssue._id}:${updatedIssue.updatedAt.getTime()}` });
  }
  return { ...result, status: updatedIssue?.status ?? issue.status };
}

export async function getVerificationSummary(id: string, userId: string) {
  ready();
  const issueObjectId = issueId(id);
  const [issue, user] = await Promise.all([IssueModel.findById(issueObjectId).select("status"), UserModel.findById(userId).select("role")]);
  if (!issue) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND");
  const userObjectId = new Types.ObjectId(userId);
  return { ...(await summary(issueObjectId, userObjectId)), status: issue.status, eligible: user?.role === "CITIZEN" && await isEligibleVerifier(issueObjectId, userObjectId) };
}

export function verificationOutcome(resolved: number, notResolved: number): "CLOSED" | "IN_PROGRESS" | undefined {
  if (notResolved >= verificationConfig.negativeVotesToReopen) return "IN_PROGRESS";
  if (resolved >= verificationConfig.positiveVotesToClose) return "CLOSED";
  return undefined;
}
