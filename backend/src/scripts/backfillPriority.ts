import { closeDatabase, connectDatabase } from "../config/database.js";
import { IssueModel } from "../models/Issue.js";
import { calculatePriority } from "../services/priorityService.js";

if (!await connectDatabase()) process.exit(1);

try {
  const issues = await IssueModel.find({ status: { $nin: ["CLOSED", "REJECTED"] } });
  for (const issue of issues) {
    const result = calculatePriority(issue);
    issue.priorityScore = result.score;
    issue.priorityLevel = result.level;
    issue.priorityBreakdown = result.breakdown;
    issue.priorityUpdatedAt = new Date();
    await issue.save();
  }
  console.log(`Backfilled priority for ${issues.length} issues`);
} finally {
  await closeDatabase();
}