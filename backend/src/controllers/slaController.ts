import type { RequestHandler } from "express";
import { getIssueSla, getSlaConfiguration, processSlaEscalations, updateSlaConfiguration } from "../services/slaService.js";
import { IssueModel } from "../models/Issue.js";
import { ApiError } from "../utils/apiError.js";

export const status: RequestHandler = async (request, response) => {
  const data = await getIssueSla(String(request.params.id));
  if (request.user!.role === "AUTHORITY" && String(data.assignedTo) !== request.user!.userId) throw new ApiError(403, "You do not have permission to access this SLA", "FORBIDDEN");
  if (request.user!.role === "CITIZEN") {
    const issue = await IssueModel.findById(String(request.params.id)).select("reportedBy");
    if (!issue || String(issue.reportedBy) !== request.user!.userId) throw new ApiError(403, "You do not have permission to access this SLA", "FORBIDDEN");
    data.escalations = [];
  }
  response.json({ success: true, message: "SLA status retrieved", data });
};
export const overview: RequestHandler = async (_request, response) => {
  const [nearingDeadline, overdue, escalated] = await Promise.all([
    IssueModel.countDocuments({ "sla.dueAt": { $gte: new Date(), $lte: new Date(Date.now() + 48 * 60 * 60 * 1000) }, status: { $nin: ["CLOSED", "REJECTED"] } }),
    IssueModel.countDocuments({ "sla.dueAt": { $lt: new Date() }, status: { $nin: ["CLOSED", "REJECTED"] } }),
    IssueModel.countDocuments({ "sla.escalationLevel": { $gt: 0 } }),
  ]);
  response.json({ success: true, message: "SLA overview retrieved", data: { nearingDeadline, overdue, escalated } });
};
export const configuration: RequestHandler = async (_request, response) => {
  response.json({ success: true, message: "SLA configuration retrieved", data: { targets: await getSlaConfiguration() } });
};
export const updateConfiguration: RequestHandler = async (request, response) => {
  response.json({ success: true, message: "SLA configuration updated", data: { targets: await updateSlaConfiguration(request.body, request.user!.userId) } });
};
export const process: RequestHandler = async (_request, response) => {
  response.json({ success: true, message: "SLA processing completed", data: await processSlaEscalations() });
};
