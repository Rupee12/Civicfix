import { Types } from "mongoose";
import { IssueModel } from "../models/Issue.js";
import { IssueStatusHistoryModel } from "../models/IssueStatusHistory.js";
import { DepartmentModel } from "../models/Department.js";
import { UserModel } from "../models/User.js";
import { isDatabaseReady } from "../config/database.js";
import { ApiError } from "../utils/apiError.js";
import { publicIssue, recalculateIssuePriority } from "./issueService.js";
import type { AssignmentInput, AuthorityQueueInput, StatusUpdateInput } from "../validators/workflowValidators.js";
import type { IssueStatus } from "../types/issue.js";
import { createNotification } from "./notificationService.js";
import { ensureIssueSla } from "./slaService.js";

const transitions: Partial<Record<IssueStatus, readonly IssueStatus[]>> = { REPORTED: ["UNDER_REVIEW"], UNDER_REVIEW: ["VERIFIED", "REJECTED"], VERIFIED: ["ASSIGNED"], ASSIGNED: ["IN_PROGRESS"], IN_PROGRESS: ["RESOLVED"], RESOLVED: ["VERIFICATION_PENDING"] };
function ready() { if (!isDatabaseReady()) throw new ApiError(503, "Database is unavailable", "DATABASE_UNAVAILABLE"); }
function issueId(value: string) { if (!Types.ObjectId.isValid(value)) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND"); return new Types.ObjectId(value); }
export function isValidStatusTransition(fromStatus: IssueStatus, toStatus: IssueStatus) { return transitions[fromStatus]?.includes(toStatus) ?? false; }

async function actor(userId: string) { const user = await UserModel.findById(userId); if (!user || !user.isActive) throw new ApiError(403, "Active user account is required", "INACTIVE_USER"); return user; }

export async function assignIssue(id: string, input: AssignmentInput, adminId: string) {
  ready(); const admin = await actor(adminId); if (admin.role !== "ADMIN") throw new ApiError(403, "Only administrators can assign issues", "FORBIDDEN");
  const issue = await IssueModel.findById(issueId(id)); if (!issue) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND");
  const department = await DepartmentModel.findOne({ _id: input.departmentId, isActive: true }); if (!department) throw new ApiError(400, "Active department is required", "INVALID_DEPARTMENT");
  const authority = await UserModel.findOne({ _id: input.assignedTo, role: "AUTHORITY", isActive: true }); if (!authority || !authority.departmentId || authority.departmentId.toString() !== department._id.toString()) throw new ApiError(400, "Authority does not belong to the selected department", "INVALID_AUTHORITY_DEPARTMENT");
  const firstAssignment = !issue.assignedTo;
  if (firstAssignment && issue.status !== "VERIFIED") throw new ApiError(400, "Only verified issues can be assigned", "INVALID_ASSIGNMENT_STATE");
  const statusHistory = firstAssignment ? await IssueStatusHistoryModel.create({ issueId: issue._id, fromStatus: issue.status, toStatus: "ASSIGNED", changedBy: admin._id, reason: input.reason }) : undefined;
  issue.departmentId = department._id; issue.assignedTo = authority._id; issue.assignedAt = new Date(); issue.assignmentHistory = issue.assignmentHistory ?? []; issue.assignmentHistory.push({ departmentId: department._id, assignedTo: authority._id, assignedBy: admin._id, assignedAt: new Date(), reason: input.reason }); if (firstAssignment) issue.status = "ASSIGNED";
  try { await issue.save(); } catch (error) { if (statusHistory) await IssueStatusHistoryModel.deleteOne({ _id: statusHistory._id }); throw error; }
  await ensureIssueSla(issue);
  await createNotification({ recipient: authority._id, type: "ISSUE_ASSIGNED", title: "Issue assigned to you", message: `Issue ${issue.title} is now assigned to your queue.`, relatedEntityId: issue._id, relatedEntityType: "Issue", eventKey: `assigned:${issue._id}:${issue.assignedAt?.getTime()}` });
  return publicIssue(issue);
}

export async function updateIssueStatus(id: string, input: StatusUpdateInput, userId: string) {
  ready(); const user = await actor(userId); const issue = await IssueModel.findById(issueId(id)); if (!issue) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND");
  if (user.role === "CITIZEN") throw new ApiError(403, "Citizens cannot update workflow status", "FORBIDDEN");
  if (user.role === "AUTHORITY" && (!issue.assignedTo || issue.assignedTo.toString() !== user._id.toString())) throw new ApiError(403, "Authority is not assigned to this issue", "ISSUE_ACCESS_DENIED");
  if (input.status === "ASSIGNED") throw new ApiError(400, "Use the assignment endpoint to assign an issue", "ASSIGNMENT_REQUIRED");
  if (input.status === "RESOLVED" || input.status === "VERIFICATION_PENDING") throw new ApiError(400, "Use the resolution endpoint for resolution status changes", "RESOLUTION_REQUIRED");
  if (!isValidStatusTransition(issue.status, input.status)) throw new ApiError(400, `Invalid status transition from ${issue.status} to ${input.status}`, "INVALID_STATUS_TRANSITION");
  const history = await IssueStatusHistoryModel.create({ issueId: issue._id, fromStatus: issue.status, toStatus: input.status, changedBy: user._id, reason: input.reason }); issue.status = input.status;
  try { await issue.save(); } catch (error) { await IssueStatusHistoryModel.deleteOne({ _id: history._id }); throw error; }
  if (input.status === "CLOSED") {
    if (issue.sla) issue.sla.completedAt = new Date();
  }
  await createNotification({ recipient: issue.reportedBy, type: "STATUS_CHANGED", title: "Issue status updated", message: `The status of "${issue.title}" is now ${input.status.replaceAll("_", " ").toLowerCase()}.`, relatedEntityId: issue._id, relatedEntityType: "Issue", eventKey: `status:${history._id}` });
  if (input.status === "IN_PROGRESS" && issue.assignedTo) await createNotification({ recipient: issue.assignedTo, type: "STATUS_CHANGED", title: "Assigned issue status changed", message: `The status of "${issue.title}" is now in progress.`, relatedEntityId: issue._id, relatedEntityType: "Issue", eventKey: `authority-status:${history._id}` });
  return publicIssue(issue);
}

export async function authorityIssues(userId: string, options: AuthorityQueueInput) {
  ready(); const user = await actor(userId); if (user.role !== "AUTHORITY") throw new ApiError(403, "Authority access required", "FORBIDDEN"); const filter = { assignedTo: user._id, status: options.status ?? { $nin: ["REJECTED", "CLOSED"] }, ...(options.priorityLevel ? { priorityLevel: options.priorityLevel } : {}) }; const sort: Record<string, 1 | -1> = options.sort === "oldest" ? { createdAt: 1 } : options.sort === "newest" ? { createdAt: -1 } : { priorityScore: -1, createdAt: -1 }; const [issues, total] = await Promise.all([IssueModel.find(filter).sort(sort).skip((options.page - 1) * options.limit).limit(options.limit), IssueModel.countDocuments(filter)]); return { issues: issues.map(publicIssue), pagination: { page: options.page, limit: options.limit, total, totalPages: Math.ceil(total / options.limit) } };
}

export async function issueStatusHistory(id: string) { ready(); const history = await IssueStatusHistoryModel.find({ issueId: issueId(id) }).populate("changedBy", "name role").sort({ changedAt: 1 }).lean(); return history.map((item) => ({ id: String(item._id), fromStatus: item.fromStatus, toStatus: item.toStatus, changedBy: item.changedBy, changedAt: item.changedAt, reason: item.reason })); }