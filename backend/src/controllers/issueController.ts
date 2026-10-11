import type { RequestHandler } from "express";
import { ApiError } from "../utils/apiError.js";
import { createIssue, getIssueById, getIssuePriority, getIssueReports, getIssueSupport, getMyIssues, getNearbyIssues, listIssues, removeIssueSupport, supportIssue } from "../services/issueService.js";
import { findPotentialDuplicates } from "../services/duplicateDetectionService.js";
import { assignIssue, authorityIssues, issueStatusHistory, updateIssueStatus } from "../services/workflowService.js";
import { getIssueResolution, submitResolution } from "../services/resolutionService.js";

function filesByField(request: Express.Request, field: string) {
  const files = request.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  return files?.[field] ?? [];
}

export const create: RequestHandler = async (request, response) => {
  const candidates = await findPotentialDuplicates(request.body);
  if (candidates.length) {
    response.status(409).json({ success: false, message: "Possible existing issues found", error: "DUPLICATE_CANDIDATES", data: { candidates } });
    return;
  }
  const issue = await createIssue(request.body, request.user!.userId, filesByField(request, "photos"), filesByField(request, "videos"));
  response.status(201).json({ success: true, message: "Issue created successfully", data: { issue } });
};

export const getById: RequestHandler = async (request, response) => {
  const issueId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  const issue = await getIssueById(issueId);
  let resolution;
  try { resolution = await getIssueResolution(issueId); } catch (error) { if (!(error instanceof ApiError) || error.code !== "RESOLUTION_NOT_FOUND") throw error; }
  response.json({ success: true, message: "Issue retrieved successfully", data: { issue: { ...issue, resolution } } });
};

export const list: RequestHandler = async (request, response) => {
  const result = await listIssues(request.query as never);
  response.json({ success: true, message: "Issues retrieved successfully", data: result });
};

export const nearby: RequestHandler = async (request, response) => {
  const issues = await getNearbyIssues(request.query as never);
  response.json({ success: true, message: "Nearby issues retrieved successfully", data: { issues } });
};

export const mine: RequestHandler = async (request, response) => {
  const result = await getMyIssues(request.user!.userId, request.query as never);
  response.json({ success: true, message: "Your issues retrieved successfully", data: result });
};

export const checkDuplicates: RequestHandler = async (request, response) => {
  const candidates = await findPotentialDuplicates(request.body);
  response.json({ success: true, message: "Duplicate check completed", data: { candidates } });
};

export const support: RequestHandler = async (request, response) => {
  const issueId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  const issue = await supportIssue(issueId, request.user!.userId, request.body);
  response.status(201).json({ success: true, message: "Issue supported successfully", data: { issue } });
};

export const removeSupport: RequestHandler = async (request, response) => {
  const issueId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  const issue = await removeIssueSupport(issueId, request.user!.userId);
  response.json({ success: true, message: "Issue support removed", data: { issue } });
};

export const supportStatus: RequestHandler = async (request, response) => {
  const issueId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  const status = await getIssueSupport(issueId, request.user!.userId);
  response.json({ success: true, message: "Issue support retrieved", data: status });
};

export const reports: RequestHandler = async (request, response) => {
  const issueId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  response.json({ success: true, message: "Issue reports retrieved", data: { reports: await getIssueReports(issueId) } });
};

export const priority: RequestHandler = async (request, response) => {
  const issueId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  response.json({ success: true, message: "Priority calculated successfully", data: await getIssuePriority(issueId) });
};

export const assignment: RequestHandler = async (request, response) => { const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id; response.json({ success: true, message: "Issue assigned successfully", data: { issue: await assignIssue(id, request.body, request.user!.userId) } }); };
export const status: RequestHandler = async (request, response) => { const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id; response.json({ success: true, message: "Issue status updated", data: { issue: await updateIssueStatus(id, request.body, request.user!.userId) } }); };
export const statusHistory: RequestHandler = async (request, response) => { const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id; response.json({ success: true, message: "Issue status history retrieved", data: { history: await issueStatusHistory(id) } }); };
export const authorityQueue: RequestHandler = async (request, response) => { response.json({ success: true, message: "Authority issue queue retrieved", data: await authorityIssues(request.user!.userId, request.query as never) }); };
export const createResolution: RequestHandler = async (request, response) => { const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id; const files = request.files as { [fieldname: string]: Express.Multer.File[] } | undefined; const result = await submitResolution(id, request.body, request.user!.userId, files?.afterPhotos ?? [], files?.afterVideos ?? []); response.status(201).json({ success: true, message: "Resolution submitted for citizen verification", data: result }); };
export const resolution: RequestHandler = async (request, response) => { const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id; response.json({ success: true, message: "Resolution retrieved", data: { resolution: await getIssueResolution(id) } }); };