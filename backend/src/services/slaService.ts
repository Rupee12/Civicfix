import { Types } from "mongoose";
import { IssueModel } from "../models/Issue.js";
import { EscalationModel } from "../models/Escalation.js";
import { UserModel } from "../models/User.js";
import { slaHours } from "../config/slaConfig.js";
import { SlaConfigurationModel, type SlaTargets } from "../models/SlaConfiguration.js";
import { isDatabaseReady } from "../config/database.js";
import { ApiError } from "../utils/apiError.js";
import { createNotification } from "./notificationService.js";
import type { IssueDocument } from "../models/Issue.js";

function ready() { if (!isDatabaseReady()) throw new ApiError(503, "Database is unavailable", "DATABASE_UNAVAILABLE"); }
export function slaForPriority(priority: IssueDocument["priorityLevel"], startedAt = new Date(), targets: SlaTargets = slaHours) {
  const targetHours = targets[priority];
  return { targetHours, startedAt, dueAt: new Date(startedAt.getTime() + targetHours * 60 * 60 * 1000), escalationLevel: 0 };
}
export async function getSlaConfiguration() {
  ready();
  const configuration = await SlaConfigurationModel.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default", targets: slaHours } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return configuration.targets;
}
export async function updateSlaConfiguration(targets: SlaTargets, updatedBy: string) {
  ready();
  const configuration = await SlaConfigurationModel.findOneAndUpdate(
    { key: "default" },
    { $set: { targets, updatedBy: new Types.ObjectId(updatedBy) }, $setOnInsert: { key: "default" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return configuration.targets;
}
export async function ensureIssueSla(issue: IssueDocument) {
  if (!issue.sla) { issue.sla = slaForPriority(issue.priorityLevel, issue.createdAt, await getSlaConfiguration()); await issue.save(); }
  return issue.sla;
}
export async function getIssueSla(issueId: string) {
  ready();
  if (!Types.ObjectId.isValid(issueId)) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND");
  const issue = await IssueModel.findById(issueId).select("sla status assignedTo departmentId priorityLevel createdAt");
  if (!issue) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND");
  await ensureIssueSla(issue);
  const escalations = await EscalationModel.find({ issueId }).sort({ level: 1 }).populate("previousAssignee newAssignee", "name email").lean();
  return { sla: issue.sla ?? null, status: issue.status, assignedTo: issue.assignedTo, departmentId: issue.departmentId, escalations };
}
export async function processSlaEscalations() {
  ready();
  const now = new Date();
  const approaching = await IssueModel.find({ "sla.dueAt": { $gt: now, $lte: new Date(now.getTime() + 48 * 60 * 60 * 1000) }, status: { $nin: ["CLOSED", "REJECTED"] } }).limit(100);
  await Promise.all(approaching.filter((issue) => issue.assignedTo).map((issue) => createNotification({ recipient: issue.assignedTo!, type: "SLA_APPROACHING", title: "SLA deadline approaching", message: `Issue ${issue._id} is approaching its resolution deadline.`, relatedEntityId: issue._id, relatedEntityType: "Issue", eventKey: `sla-approaching:${issue._id}:${issue.sla?.dueAt.getTime()}` })));
  const candidates = await IssueModel.find({ "sla.dueAt": { $lte: now }, "sla.escalationLevel": { $lt: 1 }, status: { $nin: ["CLOSED", "REJECTED"] } }).limit(100);
  let escalated = 0;
  for (const candidate of candidates) {
    const level = 1;
    const issue = await IssueModel.findOneAndUpdate(
      { _id: candidate._id, "sla.escalationLevel": { $lt: level } },
      { $set: { "sla.escalationLevel": level, "sla.breachedAt": candidate.sla?.breachedAt ?? now, "sla.lastEscalatedAt": now } },
      { new: true },
    );
    if (!issue) continue;
    const escalation = await EscalationModel.findOneAndUpdate({ issueId: issue._id, level }, { $setOnInsert: { issueId: issue._id, level, reason: "SLA deadline breached", previousAssignee: issue.assignedTo } }, { upsert: true, new: true });
    if (issue.assignedTo) await createNotification({ recipient: issue.assignedTo, type: "SLA_BREACHED", title: "SLA breached", message: `Issue ${issue._id} has exceeded its resolution deadline.`, relatedEntityId: issue._id, relatedEntityType: "Issue", eventKey: `sla-breached:${issue._id}:1` });
    const admins = await UserModel.find({ role: "ADMIN", isActive: true }).select("_id").lean();
    await Promise.all(admins.map((admin) => createNotification({ recipient: admin._id, type: "ESCALATED", title: "Issue escalated", message: `Issue ${issue._id} was escalated after an SLA breach.`, relatedEntityId: issue._id, relatedEntityType: "Issue", eventKey: `escalated:${issue._id}:1` })));
    if (escalation) escalated += 1;
  }
  return { processed: candidates.length, approaching: approaching.length, escalated };
}
