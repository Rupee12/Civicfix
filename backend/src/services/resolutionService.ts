import { Types } from "mongoose";
import { IssueModel } from "../models/Issue.js";
import { ResolutionModel, type ResolutionDocument } from "../models/Resolution.js";
import { IssueStatusHistoryModel } from "../models/IssueStatusHistory.js";
import { UserModel } from "../models/User.js";
import { isDatabaseReady } from "../config/database.js";
import { mediaStorageService, publicMedia } from "./mediaStorageService.js";
import { publicIssue } from "./issueService.js";
import { ApiError } from "../utils/apiError.js";
import type { ResolutionInput } from "../validators/workflowValidators.js";
import type { MediaAsset } from "../types/issue.js";
import { createNotification } from "./notificationService.js";

function ready() { if (!isDatabaseReady()) throw new ApiError(503, "Database is unavailable", "DATABASE_UNAVAILABLE"); }
function validId(value: string) { if (!Types.ObjectId.isValid(value)) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND"); return new Types.ObjectId(value); }
function publicResolution(resolution: ResolutionDocument | Record<string, unknown>) {
  const value = resolution instanceof ResolutionModel ? resolution.toObject() : resolution;
  return { id: String(value._id), issueId: String(value.issueId), resolvedBy: value.resolvedBy, description: value.description, beforeMedia: publicMedia(value.beforeMedia as { photos: MediaAsset[]; videos: MediaAsset[] }), afterMedia: publicMedia(value.afterMedia as { photos: MediaAsset[]; videos: MediaAsset[] }), completedAt: value.completedAt, createdAt: value.createdAt, updatedAt: value.updatedAt };
}

export function canResolveIssue(role: string, actorId: string, assignedTo: Types.ObjectId | undefined, isActive: boolean, status: string) {
  if (!isActive || (role !== "ADMIN" && role !== "AUTHORITY") || status !== "IN_PROGRESS") return false;
  if (role === "AUTHORITY") return Boolean(assignedTo && assignedTo.toString() === actorId);
  return true;
}

export async function submitResolution(issueId: string, input: ResolutionInput, userId: string, afterPhotos: Express.Multer.File[] = [], afterVideos: Express.Multer.File[] = []) {
  ready();
  const objectId = validId(issueId);
  const actor = await UserModel.findById(userId);
  if (!actor || !actor.isActive) throw new ApiError(403, "Active user account is required", "INACTIVE_USER");
  if (actor.role === "CITIZEN") throw new ApiError(403, "Citizens cannot submit resolutions", "FORBIDDEN");
  const issue = await IssueModel.findById(objectId);
  if (!issue) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND");
  if (await ResolutionModel.exists({ issueId: issue._id })) throw new ApiError(409, "A resolution has already been submitted", "DUPLICATE_RESOLUTION");
  if (!canResolveIssue(actor.role, actor._id.toString(), issue.assignedTo, actor.isActive, issue.status)) {
    if (actor.role === "AUTHORITY" && (!issue.assignedTo || issue.assignedTo.toString() !== actor._id.toString())) throw new ApiError(403, "Authority is not assigned to this issue", "ISSUE_ACCESS_DENIED");
    throw new ApiError(400, "Only in-progress issues can be resolved", "INVALID_RESOLUTION_STATE");
  }
  if (!afterPhotos.length) throw new ApiError(400, "At least one after-resolution photo is required", "RESOLUTION_EVIDENCE_REQUIRED");

  const uploadedPhotos: MediaAsset[] = [];
  const uploadedVideos: MediaAsset[] = [];
  let resolution: ResolutionDocument | undefined;
  const histories: Types.ObjectId[] = [];
  try {
    for (const file of afterPhotos) uploadedPhotos.push(await mediaStorageService.uploadImage(file, "resolutions"));
    for (const file of afterVideos) uploadedVideos.push(await mediaStorageService.uploadVideo(file, "resolutions"));
    const completedAt = new Date();
    resolution = await ResolutionModel.create({ issueId: issue._id, resolvedBy: actor._id, description: input.description, beforeMedia: issue.media, afterMedia: { photos: uploadedPhotos, videos: uploadedVideos }, completedAt });
    const resolvedHistory = await IssueStatusHistoryModel.create({ issueId: issue._id, fromStatus: "IN_PROGRESS", toStatus: "RESOLVED", changedBy: actor._id, changedAt: completedAt, reason: input.description }); histories.push(resolvedHistory._id);
    const pendingHistory = await IssueStatusHistoryModel.create({ issueId: issue._id, fromStatus: "RESOLVED", toStatus: "VERIFICATION_PENDING", changedBy: actor._id, reason: "Resolution submitted for citizen verification" }); histories.push(pendingHistory._id);
    issue.status = "VERIFICATION_PENDING";
    issue.resolvedAt = completedAt;
    if (issue.sla) issue.sla.completedAt = completedAt;
    await issue.save();
    await createNotification({ recipient: issue.reportedBy, type: "VERIFICATION_REQUESTED", title: "Resolution ready for verification", message: `Please review the resolution for "${issue.title}".`, relatedEntityId: issue._id, relatedEntityType: "Issue", eventKey: `verification-requested:${resolution._id}` });
    const storedResolution = await ResolutionModel.findById(resolution._id).populate("resolvedBy", "name role");
    return { issue: publicIssue(issue), resolution: publicResolution(storedResolution!) };
  } catch (error) {
    if (resolution) await ResolutionModel.deleteOne({ _id: resolution._id });
    if (histories.length) await IssueStatusHistoryModel.deleteMany({ _id: { $in: histories } });
    await Promise.all([...uploadedPhotos, ...uploadedVideos].map((asset) => mediaStorageService.deleteMedia(asset)));
    throw error;
  }
}

export async function getIssueResolution(issueId: string) {
  ready();
  const resolution = await ResolutionModel.findOne({ issueId: validId(issueId) }).populate("resolvedBy", "name role");
  if (!resolution) throw new ApiError(404, "Resolution not found", "RESOLUTION_NOT_FOUND");
  return publicResolution(resolution);
}