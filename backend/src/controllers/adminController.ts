import { IssueModel } from "../models/Issue.js";
import { DepartmentModel } from "../models/Department.js";
import { UserModel } from "../models/User.js";
import { IssueVerificationModel } from "../models/IssueVerification.js";
import { isDatabaseReady } from "../config/database.js";
import { ApiError } from "../utils/apiError.js";
import { PRIORITY_LEVELS } from "../types/issue.js";
import { createAuthority, createDepartment, listAuthorities, listDepartments, updateAuthority, updateDepartment } from "../services/departmentService.js";
import type { RequestHandler } from "express";

export const prioritySummary: RequestHandler = async (request, response) => {
  if (!isDatabaseReady()) throw new ApiError(503, "Database is unavailable", "DATABASE_UNAVAILABLE");
  const requestedLevel = typeof request.query.priorityLevel === "string" ? request.query.priorityLevel : undefined;
  const filter = { status: { $nin: ["CLOSED", "REJECTED"] }, ...(requestedLevel && PRIORITY_LEVELS.includes(requestedLevel as (typeof PRIORITY_LEVELS)[number]) ? { priorityLevel: requestedLevel } : {}) };
  const [counts, issues] = await Promise.all([
    Promise.all(PRIORITY_LEVELS.map(async (level) => [level, await IssueModel.countDocuments({ ...filter, priorityLevel: level })] as const)),
    IssueModel.find(filter).sort({ priorityScore: -1, createdAt: -1 }).limit(100).select("title description category subcategory severity priorityScore priorityLevel priorityBreakdown reportCount supportCount status createdAt address area city location media departmentId assignedTo").populate("departmentId", "name code").populate("assignedTo", "name").lean(),
  ]);
  response.json({ success: true, message: "Priority summary retrieved", data: { metrics: Object.fromEntries(counts), totalIssues: counts.reduce((total, [, count]) => total + count, 0), issues: issues.map((issue) => ({ id: String(issue._id), title: issue.title, description: issue.description, category: issue.category, subcategory: issue.subcategory, severity: issue.severity, priorityScore: issue.priorityScore, priorityLevel: issue.priorityLevel, priorityBreakdown: issue.priorityBreakdown, reportCount: issue.reportCount, supportCount: issue.supportCount, status: issue.status, createdAt: issue.createdAt, address: issue.address, area: issue.area, city: issue.city, location: issue.location ? { latitude: issue.location.coordinates[1], longitude: issue.location.coordinates[0] } : undefined, media: issue.media, department: issue.departmentId, assignedAuthority: issue.assignedTo })) } });
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
  const [totalActive, unassigned, criticalUnassigned, inProgress, resolved, verificationPending, verificationVotes, byDepartment, byStatus, byAuthority] = await Promise.all([
    IssueModel.countDocuments({ status: active }),
    IssueModel.countDocuments({ status: active, assignedTo: { $exists: false } }),
    IssueModel.countDocuments({ status: active, assignedTo: { $exists: false }, priorityLevel: "CRITICAL" }),
    IssueModel.countDocuments({ status: "IN_PROGRESS" }),
    IssueModel.countDocuments({ status: "RESOLVED" }),
    IssueModel.countDocuments({ status: "VERIFICATION_PENDING" }),
    IssueVerificationModel.aggregate([{ $group: { _id: "$vote", count: { $sum: 1 } } }]),
    IssueModel.aggregate([{ $match: { status: active } }, { $group: { _id: "$departmentId", count: { $sum: 1 } } }]),
    IssueModel.aggregate([{ $match: { status: active } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    IssueModel.aggregate([{ $match: { status: active, assignedTo: { $exists: true } } }, { $group: { _id: "$assignedTo", count: { $sum: 1 } } }]),
  ]);
  const departmentIds = byDepartment.map((item) => item._id).filter(Boolean);
  const authorityIds = byAuthority.map((item) => item._id).filter(Boolean);
  const [departments, authorities] = await Promise.all([DepartmentModel.find({ _id: { $in: departmentIds } }).select("name code").lean(), UserModel.find({ _id: { $in: authorityIds } }).select("name email").lean()]);
  const departmentNames = new Map(departments.map((department) => [String(department._id), department]));
  const authorityNames = new Map(authorities.map((authority) => [String(authority._id), authority]));
  response.json({ success: true, message: "Workload retrieved", data: { totalActive, unassigned, criticalUnassigned, inProgress, resolved, verificationPending, verificationVotes: { resolved: verificationVotes.find((item) => item._id === "RESOLVED")?.count ?? 0, notResolved: verificationVotes.find((item) => item._id === "NOT_RESOLVED")?.count ?? 0 }, byDepartment: byDepartment.map((item) => ({ departmentId: item._id, department: item._id ? departmentNames.get(String(item._id)) : null, count: item.count })), byStatus, byAuthority: byAuthority.map((item) => ({ authorityId: item._id, authority: item._id ? authorityNames.get(String(item._id)) : null, count: item.count })) } });
};
