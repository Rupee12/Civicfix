import { IssueModel } from "../models/Issue.js";
import { DepartmentModel } from "../models/Department.js";
import { UserModel } from "../models/User.js";
import { isDatabaseReady } from "../config/database.js";
import { ApiError } from "../utils/apiError.js";
import { PRIORITY_LEVELS } from "../types/issue.js";
import { createAuthority, createDepartment, listAuthorities, listDepartments, updateAuthority, updateDepartment } from "../services/departmentService.js";
import type { RequestHandler } from "express";
import type { AnalyticsQuery } from "../validators/analyticsValidators.js";
import type { ReportQuery } from "../validators/analyticsValidators.js";
import { csvValue } from "../utils/csv.js";

export const prioritySummary: RequestHandler = async (request, response) => {
  if (!isDatabaseReady()) throw new ApiError(503, "Database is unavailable", "DATABASE_UNAVAILABLE");
  const requestedLevel = typeof request.query.priorityLevel === "string" ? request.query.priorityLevel : undefined;
  const filter = { status: { $nin: ["CLOSED", "REJECTED"] }, ...(requestedLevel && PRIORITY_LEVELS.includes(requestedLevel as (typeof PRIORITY_LEVELS)[number]) ? { priorityLevel: requestedLevel } : {}) };
  const [counts, issues] = await Promise.all([
    Promise.all(PRIORITY_LEVELS.map(async (level) => [level, await IssueModel.countDocuments({ ...filter, priorityLevel: level })] as const)),
    IssueModel.find(filter).sort({ priorityScore: -1, createdAt: -1 }).limit(100).select("title category severity priorityScore priorityLevel reportCount supportCount status createdAt").lean(),
  ]);
  response.json({ success: true, message: "Priority summary retrieved", data: { metrics: Object.fromEntries(counts), totalIssues: counts.reduce((total, [, count]) => total + count, 0), issues: issues.map((issue) => ({ id: String(issue._id), title: issue.title, category: issue.category, severity: issue.severity, priorityScore: issue.priorityScore, priorityLevel: issue.priorityLevel, reportCount: issue.reportCount, supportCount: issue.supportCount, status: issue.status, createdAt: issue.createdAt })) } });
};

export const departments: RequestHandler = async (_request, response) => { response.json({ success: true, message: "Departments retrieved", data: { departments: await listDepartments() } }); };
export const createDepartmentController: RequestHandler = async (request, response) => { response.status(201).json({ success: true, message: "Department created", data: { department: await createDepartment(request.body) } }); };
export const updateDepartmentController: RequestHandler = async (request, response) => { response.json({ success: true, message: "Department updated", data: { department: await updateDepartment(String(request.params.id), request.body) } }); };
export const authorities: RequestHandler = async (_request, response) => { response.json({ success: true, message: "Authorities retrieved", data: { authorities: await listAuthorities() } }); };
export const createAuthorityController: RequestHandler = async (request, response) => { response.status(201).json({ success: true, message: "Authority created", data: { authority: await createAuthority(request.body) } }); };
export const updateAuthorityController: RequestHandler = async (request, response) => { response.json({ success: true, message: "Authority updated", data: { authority: await updateAuthority(String(request.params.id), request.body) } }); };

export const workload: RequestHandler = async (_request, response) => {
  if (!isDatabaseReady()) throw new ApiError(503, "Database is unavailable", "DATABASE_UNAVAILABLE");
  const active = { $nin: ["REJECTED", "CLOSED"] };
  const [totalActive, unassigned, criticalUnassigned, inProgress, resolved, verificationPending, byDepartment, byStatus, byAuthority] = await Promise.all([
    IssueModel.countDocuments({ status: active }),
    IssueModel.countDocuments({ status: active, assignedTo: { $exists: false } }),
    IssueModel.countDocuments({ status: active, assignedTo: { $exists: false }, priorityLevel: "CRITICAL" }),
    IssueModel.countDocuments({ status: "IN_PROGRESS" }),
    IssueModel.countDocuments({ status: "RESOLVED" }),
    IssueModel.countDocuments({ status: "VERIFICATION_PENDING" }),
    IssueModel.aggregate([{ $match: { status: active } }, { $group: { _id: "$departmentId", count: { $sum: 1 } } }]),
    IssueModel.aggregate([{ $match: { status: active } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    IssueModel.aggregate([{ $match: { status: active, assignedTo: { $exists: true } } }, { $group: { _id: "$assignedTo", count: { $sum: 1 } } }]),
  ]);
  const departmentIds = byDepartment.map((item) => item._id).filter(Boolean);
  const authorityIds = byAuthority.map((item) => item._id).filter(Boolean);
  const [departments, authorities] = await Promise.all([DepartmentModel.find({ _id: { $in: departmentIds } }).select("name code").lean(), UserModel.find({ _id: { $in: authorityIds } }).select("name email").lean()]);
  const departmentNames = new Map(departments.map((department) => [String(department._id), department]));
  const authorityNames = new Map(authorities.map((authority) => [String(authority._id), authority]));
  response.json({ success: true, message: "Workload retrieved", data: { totalActive, unassigned, criticalUnassigned, inProgress, resolved, verificationPending, byDepartment: byDepartment.map((item) => ({ departmentId: item._id, department: item._id ? departmentNames.get(String(item._id)) : null, count: item.count })), byStatus, byAuthority: byAuthority.map((item) => ({ authorityId: item._id, authority: item._id ? authorityNames.get(String(item._id)) : null, count: item.count })) } });
};

export const analytics: RequestHandler = async (request, response) => {
  if (!isDatabaseReady()) throw new ApiError(503, "Database is unavailable", "DATABASE_UNAVAILABLE");
  const { days } = request.query as unknown as AnalyticsQuery;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const dateFormat = "%Y-%m-%d";
  const [totals, statuses, categories, severities, priorities, trend, resolution, hotspots, sla] = await Promise.all([
    IssueModel.aggregate([{ $match: { createdAt: { $gte: since } } }, { $count: "count" }]),
    IssueModel.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    IssueModel.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    IssueModel.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: "$severity", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    IssueModel.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: "$priorityLevel", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    IssueModel.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: dateFormat, date: "$createdAt", timezone: "UTC" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    IssueModel.aggregate([{ $match: { createdAt: { $gte: since }, resolvedAt: { $type: "date" } } }, { $group: { _id: null, averageMs: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } }, count: { $sum: 1 } } }]),
    IssueModel.aggregate([{ $match: { createdAt: { $gte: since }, "location.coordinates": { $size: 2 } } }, { $project: { latitude: { $arrayElemAt: ["$location.coordinates", 1] }, longitude: { $arrayElemAt: ["$location.coordinates", 0] } } }, { $project: { latitude: { $round: ["$latitude", 2] }, longitude: { $round: ["$longitude", 2] } } }, { $group: { _id: { latitude: "$latitude", longitude: "$longitude" }, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]),
    IssueModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $in: ["$status", ["CLOSED", "REJECTED"]] }, 1, 0] } },
          breached: { $sum: { $cond: [{ $ne: [{ $ifNull: ["$sla.breachedAt", null] }, null] }, 1, 0] } },
          escalated: { $sum: { $cond: [{ $gt: [{ $ifNull: ["$sla.escalationLevel", 0] }, 0] }, 1, 0] } },
          onTime: { $sum: { $cond: [{ $and: [{ $ne: [{ $ifNull: ["$sla.completedAt", null] }, null] }, { $lte: ["$sla.completedAt", "$sla.dueAt"] }] }, 1, 0] } },
        },
      },
    ]),
  ]);
  const resolutionSummary = resolution[0] as { averageMs?: number; count?: number } | undefined;
  response.json({
    success: true,
    message: "Analytics retrieved",
    data: {
      period: { days, since: since.toISOString() },
      totalIssues: totals[0]?.count ?? 0,
      byStatus: statuses,
      byCategory: categories,
      bySeverity: severities,
      byPriority: priorities,
      trend,
      resolution: resolutionSummary ? { averageMs: resolutionSummary.averageMs, sampleSize: resolutionSummary.count } : null,
      sla: { complianceRate: sla[0]?.total ? (sla[0].onTime / sla[0].total) * 100 : 0, breachRate: sla[0]?.total ? (sla[0].breached / sla[0].total) * 100 : 0, escalated: sla[0]?.escalated ?? 0, completed: sla[0]?.completed ?? 0 },
      hotspots: hotspots.map((item) => ({ latitude: item._id.latitude, longitude: item._id.longitude, count: item.count })),
    },
  });
};

export const reportExport: RequestHandler = async (request, response) => {
  if (!isDatabaseReady()) throw new ApiError(503, "Database is unavailable", "DATABASE_UNAVAILABLE");
  const query = request.query as unknown as ReportQuery;
  const createdAt: Record<string, Date> = {};
  if (query.startDate) createdAt.$gte = query.startDate;
  if (query.endDate) { const end = new Date(query.endDate); end.setUTCHours(23, 59, 59, 999); createdAt.$lte = end; }
  const filter = { ...(Object.keys(createdAt).length ? { createdAt } : {}), ...(query.status ? { status: query.status } : {}), ...(query.priorityLevel ? { priorityLevel: query.priorityLevel } : {}), ...(query.category ? { category: query.category } : {}), ...(query.departmentId ? { departmentId: query.departmentId } : {}), ...(query.assignedTo ? { assignedTo: query.assignedTo } : {}) };
  const issues = await IssueModel.find(filter).sort({ createdAt: -1 }).limit(10000).populate("assignedTo", "name email").populate("departmentId", "name").lean();
  const header = ["issueId", "title", "category", "status", "priority", "department", "assignee", "createdAt", "resolvedAt"];
  const rows = issues.map((issue) => [issue._id, issue.title, issue.category, issue.status, issue.priorityLevel, (issue.departmentId as { name?: string } | null)?.name, (issue.assignedTo as { name?: string } | null)?.name, issue.createdAt?.toISOString(), issue.resolvedAt?.toISOString()].map(csvValue).join(","));
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename="civicfix-report-${new Date().toISOString().slice(0, 10)}.csv"`);
  response.send([header.join(","), ...rows].join("\r\n"));
};