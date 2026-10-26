import bcrypt from "bcryptjs";
import { closeDatabase, connectDatabase } from "../config/database.js";
import { IssueModel } from "../models/Issue.js";
import { DepartmentModel } from "../models/Department.js";
import { IssueReportModel } from "../models/IssueReport.js";
import { IssueSupportModel } from "../models/IssueSupport.js";
import { UserModel } from "../models/User.js";
import { Types } from "mongoose";
import { calculatePriority } from "../services/priorityService.js";
import { scheduleNewIssue } from "../services/issueScheduling.js";
import { getSlaConfiguration } from "../services/slaService.js";

const developmentUsers = [
  { name: "CivicFix Development Admin", email: "admin@civicfix.local", password: "CivicFixAdmin123!", role: "ADMIN" as const },
  { name: "CivicFix Development Authority", email: "authority@civicfix.local", password: "CivicFixAuthority123!", role: "AUTHORITY" as const },
  { name: "Sample Citizen One", email: "citizen.one@civicfix.local", password: "CivicFixCitizen123!", role: "CITIZEN" as const },
  { name: "Sample Citizen Two", email: "citizen.two@civicfix.local", password: "CivicFixCitizen456!", role: "CITIZEN" as const },
];

const developmentDepartments = [
  { name: "Sanitation", code: "SANITATION", description: "Garbage collection, illegal dumping and sanitation issues" },
  { name: "Roads", code: "ROADS", description: "Road and surface infrastructure" },
  { name: "Electrical", code: "ELECTRICAL", description: "Streetlights and public electrical infrastructure" },
  { name: "Water", code: "WATER", description: "Water supply and leakage" },
  { name: "Drainage", code: "DRAINAGE", description: "Open drains and drainage infrastructure" },
  { name: "Public Works", code: "PUBLIC_WORKS", description: "General public-space infrastructure" },
];

for (let index = 3; index <= 40; index += 1) {
  developmentUsers.push({ name: `Sample Citizen ${index}`, email: `citizen.${index}@civicfix.local`, password: `CivicFixCitizen${index}23!`, role: "CITIZEN" });
}

const connected = await connectDatabase();
if (!connected) {
  process.exitCode = 1;
  process.exit();
}

try {
  const departments = await Promise.all(developmentDepartments.map((department) => DepartmentModel.findOneAndUpdate({ code: department.code }, { $set: { ...department, isActive: true } }, { upsert: true, new: true })));
  await IssueSupportModel.deleteMany({});
  await IssueReportModel.deleteMany({});
  await IssueModel.deleteMany({});
  await UserModel.deleteMany({ email: { $in: developmentUsers.map((user) => user.email) } });
  const users = await UserModel.insertMany(await Promise.all(developmentUsers.map(async (user) => ({
    name: user.name,
    email: user.email,
    passwordHash: await bcrypt.hash(user.password, 12),
    role: user.role,
  }))));
  const sanitation = departments.find((department) => department?.code === "SANITATION");
  const authority = users.find((user) => user.role === "AUTHORITY");
  if (authority && sanitation) await UserModel.updateOne({ _id: authority._id }, { $set: { departmentId: sanitation._id } });
  const citizens = users.filter((user) => user.role === "CITIZEN");
  const slaTargets = await getSlaConfiguration();
  const issueDefinitions = [
    { title: "Garbage near park", description: "A large garbage pile is beside the public park.", category: "GARBAGE" as const, coordinates: [77.5946, 12.9716] as [number, number], reportCount: 36, supportCount: 36 },
    { title: "Broken streetlight on 5th Avenue", description: "The streetlight has been out for several nights.", category: "BROKEN_STREETLIGHT" as const, coordinates: [77.596, 12.972] as [number, number], reportCount: 4, supportCount: 2 },
    { title: "Open drain by market", description: "An open drain is exposed beside the market walkway.", category: "OPEN_DRAIN" as const, coordinates: [77.593, 12.9705] as [number, number], reportCount: 12, supportCount: 8 },
  ];
  for (const definition of issueDefinitions) {
    const location = { type: "Point" as const, coordinates: definition.coordinates };
    const createdAt = new Date();
    const scheduling = scheduleNewIssue(
      { severity: "MEDIUM", reportCount: definition.reportCount, supportCount: definition.supportCount, affectedPeopleEstimate: 0, safetyImpact: "NONE" },
      createdAt,
      slaTargets,
    );
    const issue = await IssueModel.create({ ...definition, ...scheduling, createdAt, location, canonicalLocation: location, reportedBy: citizens[0]._id, media: { photos: [], videos: [] }, reports: [], status: "REPORTED", severity: "MEDIUM", reportCount: definition.reportCount, supportCount: definition.supportCount });
    const reports = await IssueReportModel.insertMany(Array.from({ length: definition.reportCount }, (_, index) => ({ issue: issue._id, reportedBy: citizens[index % citizens.length]._id, title: definition.title, description: definition.description, category: definition.category, location, media: { photos: [], videos: [] }, severity: "MEDIUM", reportStatus: "ACTIVE", isPrimary: index === 0 })));
    const supports = await IssueSupportModel.insertMany(citizens.slice(0, definition.supportCount).map((citizen) => ({ issue: issue._id, user: citizen._id })));
    await IssueModel.updateOne({ _id: issue._id }, { $set: { reports: reports.map((report) => report._id), reportCount: reports.length, supportCount: supports.length } });
    const refreshedIssue = await IssueModel.findById(issue._id);
    if (refreshedIssue) {
      const priority = calculatePriority(refreshedIssue);
      await IssueModel.updateOne({ _id: issue._id }, { $set: { priorityScore: priority.score, priorityLevel: priority.level, priorityBreakdown: priority.breakdown, priorityUpdatedAt: new Date() } });
    }
  }
  console.log("Development users, issues, reports, and support records seeded");
} finally {
  await closeDatabase();
}