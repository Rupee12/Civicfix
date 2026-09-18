import { Types } from "mongoose";
import { isDatabaseReady } from "../config/database.js";
import { IssueModel, type IssueDocument } from "../models/Issue.js";
import { IssueReportModel } from "../models/IssueReport.js";
import { IssueSupportModel } from "../models/IssueSupport.js";
import { mediaStorageService } from "./mediaStorageService.js";
import type { CreateIssueInput, ListIssuesInput, NearbyIssuesInput } from "../validators/issueValidators.js";
import type { SupportIssueInput } from "../validators/duplicateValidators.js";
import type { MediaAsset } from "../types/issue.js";
import { ApiError } from "../utils/apiError.js";
import { calculatePriority, type PriorityResult } from "./priorityService.js";
import { findSuggestedDepartmentId } from "./departmentService.js";

function ensureDatabaseReady() {
  if (!isDatabaseReady()) throw new ApiError(503, "Database is unavailable", "DATABASE_UNAVAILABLE");
}

export function publicIssue(issue: IssueDocument | Record<string, unknown>) {
  const value = issue instanceof IssueModel ? issue.toObject() : issue;
  const location = value.location as { coordinates: [number, number] };
  return {
    id: String(value._id), title: value.title, description: value.description, category: value.category,
    subcategory: value.subcategory, reportedBy: value.reportedBy, location: { latitude: location.coordinates[1], longitude: location.coordinates[0] },
    address: value.address, area: value.area, city: value.city, media: value.media, status: value.status, severity: value.severity,
    priorityScore: value.priorityScore, supportCount: value.supportCount, reportCount: value.reportCount, createdAt: value.createdAt, updatedAt: value.updatedAt,
    priorityLevel: value.priorityLevel, priorityBreakdown: value.priorityBreakdown, priorityUpdatedAt: value.priorityUpdatedAt,
    safetyImpact: value.safetyImpact, affectedPeopleEstimate: value.affectedPeopleEstimate,
    suggestedDepartmentId: value.suggestedDepartmentId, departmentId: value.departmentId, assignedTo: value.assignedTo, assignedAt: value.assignedAt,
    assignmentHistory: value.assignmentHistory, resolvedAt: value.resolvedAt, closedAt: value.closedAt,
  };
}

export async function recalculateIssuePriority(issue: IssueDocument) {
  if (issue.status === "CLOSED" || issue.status === "REJECTED") return issue;
  const result = calculatePriority(issue);
  issue.priorityScore = result.score;
  issue.priorityLevel = result.level;
  issue.priorityBreakdown = result.breakdown;
  issue.priorityUpdatedAt = new Date();
  await issue.save();
  return issue;
}

export async function createIssue(input: CreateIssueInput, userId: string, photos: Express.Multer.File[] = [], videos: Express.Multer.File[] = []) {
  ensureDatabaseReady();
  const photoAssets: MediaAsset[] = [];
  const videoAssets: MediaAsset[] = [];
  let issueRecord: IssueDocument | undefined;
  let reportRecord;
  try {
    for (const photo of photos) photoAssets.push(await mediaStorageService.uploadImage(photo));
    for (const video of videos) videoAssets.push(await mediaStorageService.uploadVideo(video));
    const location = { type: "Point" as const, coordinates: [input.longitude, input.latitude] as [number, number] };
    const suggestedDepartmentId = await findSuggestedDepartmentId(input.category);
    issueRecord = await IssueModel.create({ ...input, reportedBy: new Types.ObjectId(userId), location, canonicalLocation: location, suggestedDepartmentId, media: { photos: photoAssets, videos: videoAssets }, reports: [], reportCount: 1, supportCount: 0, assignmentHistory: [] });
    reportRecord = await IssueReportModel.create({ issue: issueRecord._id, reportedBy: new Types.ObjectId(userId), title: input.title, description: input.description, category: input.category, location, media: { photos: photoAssets, videos: videoAssets }, severity: input.severity, reportStatus: "ACTIVE", isPrimary: true });
    await IssueModel.updateOne({ _id: issueRecord._id }, { $push: { reports: reportRecord._id } });
    return publicIssue(await recalculateIssuePriority(issueRecord));
  } catch (error) {
    if (reportRecord) await IssueReportModel.deleteOne({ _id: reportRecord._id });
    if (issueRecord) await IssueModel.deleteOne({ _id: issueRecord._id });
    await Promise.all([...photoAssets, ...videoAssets].map((asset) => mediaStorageService.deleteMedia(asset)));
    throw error;
  }
}

export async function getIssueById(id: string) {
  ensureDatabaseReady();
  if (!Types.ObjectId.isValid(id)) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND");
  const issue = await IssueModel.findById(id).populate("reportedBy", "name");
  if (!issue) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND");
  return publicIssue(issue);
}

async function listWithFilter(filter: Record<string, unknown>, options: ListIssuesInput) {
  ensureDatabaseReady();
  const page = Number(options.page) || 1;
  const limit = Math.min(Number(options.limit) || 20, 50);
  const sort: Record<string, 1 | -1> = options.sort === "priority" ? { priorityScore: -1, createdAt: -1 } : options.sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };
  const [issues, total] = await Promise.all([
    IssueModel.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    IssueModel.countDocuments(filter),
  ]);
  return { issues: issues.map(publicIssue), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export function listIssues(options: ListIssuesInput) {
  return listWithFilter({ ...(options.category && { category: options.category }), ...(options.status && { status: options.status }), ...(options.severity && { severity: options.severity }), ...(options.priorityLevel && { priorityLevel: options.priorityLevel }) }, options);
}

export async function getNearbyIssues(options: NearbyIssuesInput) {
  ensureDatabaseReady();
  const latitude = Number(options.latitude);
  const longitude = Number(options.longitude);
  const requestedRadius = Number(options.radius);
  const requestedLimit = Number(options.limit);
  const radius = Number.isFinite(requestedRadius) && requestedRadius > 0 ? Math.min(requestedRadius, 5000) : 1000;
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 50) : 20;
  const issues = await IssueModel.aggregate([
    { $geoNear: { near: { type: "Point", coordinates: [longitude, latitude] }, distanceField: "distanceMeters", maxDistance: radius, spherical: true } },
    { $limit: limit },
  ]);
  return issues.map((issue) => ({ ...publicIssue(issue), distanceMeters: Math.round(issue.distanceMeters) }));
}

export async function getIssuePriority(id: string): Promise<PriorityResult> {
  ensureDatabaseReady();
  if (!Types.ObjectId.isValid(id)) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND");
  const issue = await IssueModel.findById(id);
  if (!issue) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND");
  if (issue.status === "CLOSED" || issue.status === "REJECTED") {
    return { score: issue.priorityScore, level: issue.priorityLevel, breakdown: issue.priorityBreakdown, explanation: calculatePriority(issue).explanation };
  }
  const result = calculatePriority(issue);
  if (issue.priorityScore !== result.score || issue.priorityLevel !== result.level) {
    await recalculateIssuePriority(issue);
  }
  return result;
}

export function getMyIssues(userId: string, options: ListIssuesInput) {
  return listWithFilter({ reportedBy: new Types.ObjectId(userId) }, options);
}

export async function supportIssue(issueId: string, userId: string, input: SupportIssueInput = {}) {
  ensureDatabaseReady();
  if (!Types.ObjectId.isValid(issueId)) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND");
  const issue = await IssueModel.findById(issueId);
  if (!issue) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND");
  let supportRecord;
  let reportRecord;
  try {
    supportRecord = await IssueSupportModel.create({ issue: issue._id, user: new Types.ObjectId(userId) });
    const location = input.latitude !== undefined && input.longitude !== undefined
      ? { type: "Point" as const, coordinates: [input.longitude, input.latitude] as [number, number] }
      : issue.location;
    reportRecord = await IssueReportModel.create({ issue: issue._id, reportedBy: new Types.ObjectId(userId), title: input.title ?? issue.title, description: input.description ?? issue.description, category: input.category ?? issue.category, location, media: { photos: [], videos: [] }, severity: input.severity ?? issue.severity, reportStatus: "ACTIVE", isPrimary: false });
    const updated = await IssueModel.findOneAndUpdate({ _id: issue._id }, { $inc: { reportCount: 1, supportCount: 1 }, $push: { reports: reportRecord._id } }, { new: true });
    return publicIssue(await recalculateIssuePriority(updated!));
  } catch (error) {
    if (supportRecord) await IssueSupportModel.deleteOne({ _id: supportRecord._id });
    if (reportRecord) await IssueReportModel.deleteOne({ _id: reportRecord._id });
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new ApiError(409, "You already support this issue", "DUPLICATE_SUPPORT");
    }
    throw error;
  }
}

export async function removeIssueSupport(issueId: string, userId: string) {
  ensureDatabaseReady();
  const support = await IssueSupportModel.findOneAndDelete({ issue: issueId, user: userId });
  if (!support) throw new ApiError(404, "Support not found", "SUPPORT_NOT_FOUND");
  const issue = await IssueModel.findOneAndUpdate({ _id: issueId, supportCount: { $gt: 0 } }, { $inc: { supportCount: -1 } }, { new: true });
  if (!issue) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND");
  return publicIssue(await recalculateIssuePriority(issue));
}

export async function getIssueSupport(issueId: string, userId: string) {
  ensureDatabaseReady();
  const [issue, support] = await Promise.all([IssueModel.findById(issueId).select("supportCount"), IssueSupportModel.exists({ issue: issueId, user: userId })]);
  if (!issue) throw new ApiError(404, "Issue not found", "ISSUE_NOT_FOUND");
  return { supported: Boolean(support), supportCount: issue.supportCount };
}

export async function getIssueReports(issueId: string) {
  ensureDatabaseReady();
  const reports = await IssueReportModel.find({ issue: issueId }).populate("reportedBy", "name").sort({ createdAt: -1 }).lean();
  return reports.map((report) => ({ id: String(report._id), reportedBy: report.reportedBy, title: report.title, description: report.description, category: report.category, location: { latitude: report.location.coordinates[1], longitude: report.location.coordinates[0] }, media: report.media, severity: report.severity, status: report.reportStatus, createdAt: report.createdAt }));
}
