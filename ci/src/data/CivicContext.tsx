import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const statuses = ["Reported", "Acknowledged", "Assigned", "In Progress", "Resolved — Awaiting Verification", "Closed", "Reopened"] as const;
export type IssueStatus = (typeof statuses)[number];
export type Severity = "Low" | "Medium" | "High" | "Critical";

export type Issue = {
  id: string; title: string; description: string; category: string; severity: Severity;
  priority: number; status: IssueStatus; neighborhood: string; x: number; y: number;
  created: string; updated: string; department: string; authority: string; support: number;
  sla: string; escalation: number; verified: boolean; evidence: boolean; notes: string[];
  history: { label: string; date: string }[];
};

export const seedIssues: Issue[] = [
  { id: "CF-10471", title: "Sinkhole near Harbor school crossing", description: "A widening sinkhole is affecting the eastbound lane beside the school crossing. Temporary barriers are no longer covering the full area.", category: "Roads", severity: "Critical", priority: 96, status: "In Progress", neighborhood: "Harbor Point", x: 69, y: 59, created: "2026-03-18T08:22:00", updated: "2026-03-24T08:45:00", department: "Public Works", authority: "Maya Chen", support: 84, sla: "2026-03-24T15:00:00", escalation: 2, verified: false, evidence: false, notes: ["School access must remain open during repairs."], history: [{ label: "Work started by Public Works", date: "Today, 8:45 AM" }, { label: "Assigned to Maya Chen", date: "Mar 19, 2:10 PM" }, { label: "Report acknowledged", date: "Mar 18, 9:04 AM" }] },
  { id: "CF-10468", title: "Traffic signal timing at Cedar & 8th", description: "Pedestrian signal ends before older residents can cross.", category: "Streetlights", severity: "High", priority: 87, status: "Assigned", neighborhood: "Cedar Grove", x: 43, y: 34, created: "2026-03-19T12:10:00", updated: "2026-03-23T16:20:00", department: "Transportation", authority: "Jon Bell", support: 47, sla: "2026-03-25T12:00:00", escalation: 1, verified: false, evidence: false, notes: [], history: [{ label: "Assigned to Transportation", date: "Yesterday, 4:20 PM" }, { label: "Report acknowledged", date: "Mar 19, 1:05 PM" }] },
  { id: "CF-10459", title: "Missed recycling collection", description: "Recycling was not collected along three blocks.", category: "Sanitation", severity: "Medium", priority: 61, status: "Acknowledged", neighborhood: "Northbank", x: 51, y: 21, created: "2026-03-17T10:00:00", updated: "2026-03-22T11:30:00", department: "Unassigned", authority: "Unassigned", support: 31, sla: "2026-03-26T17:00:00", escalation: 0, verified: false, evidence: false, notes: [], history: [{ label: "Report acknowledged", date: "Mar 22, 11:30 AM" }] },
  { id: "CF-10441", title: "Broken path lighting in Juniper Park", description: "Four path lights are out near the south entrance.", category: "Streetlights", severity: "Medium", priority: 58, status: "Resolved — Awaiting Verification", neighborhood: "Juniper Heights", x: 28, y: 48, created: "2026-03-14T19:40:00", updated: "2026-03-23T15:00:00", department: "Electrical Services", authority: "Alex Morgan", support: 19, sla: "2026-03-23T17:00:00", escalation: 0, verified: false, evidence: true, notes: [], history: [{ label: "Resolution evidence submitted", date: "Yesterday, 3:00 PM" }, { label: "Repair completed", date: "Yesterday, 2:42 PM" }] },
  { id: "CF-10422", title: "Water pooling near Market Square", description: "Standing water remains after light rain.", category: "Water", severity: "High", priority: 79, status: "Reopened", neighborhood: "Old Market", x: 57, y: 70, created: "2026-03-10T07:35:00", updated: "2026-03-22T09:10:00", department: "Water & Drainage", authority: "Sam Rivera", support: 52, sla: "2026-03-23T12:00:00", escalation: 2, verified: false, evidence: true, notes: ["Reopened after community verification failed."], history: [{ label: "Reopened — drainage still blocked", date: "Mar 22, 9:10 AM" }, { label: "Resolution evidence submitted", date: "Mar 21, 5:20 PM" }] },
  { id: "CF-10398", title: "Fallen branch blocking cycle lane", description: "Large branch blocking the northbound cycle lane.", category: "Other", severity: "Low", priority: 34, status: "Closed", neighborhood: "Bayview", x: 77, y: 29, created: "2026-03-08T06:20:00", updated: "2026-03-09T13:30:00", department: "Parks & Forestry", authority: "Nia Patel", support: 8, sla: "2026-03-12T17:00:00", escalation: 0, verified: true, evidence: true, notes: [], history: [{ label: "Closed after citizen verification", date: "Mar 9, 1:30 PM" }, { label: "Branch removed", date: "Mar 9, 11:00 AM" }] },
  { id: "CF-10377", title: "Overflowing litter bin at ferry stop", description: "Public bin requires collection.", category: "Sanitation", severity: "Low", priority: 31, status: "Closed", neighborhood: "Harbor Point", x: 64, y: 52, created: "2026-03-05T14:20:00", updated: "2026-03-06T09:10:00", department: "Sanitation", authority: "Theo Grant", support: 11, sla: "2026-03-08T12:00:00", escalation: 0, verified: true, evidence: true, notes: [], history: [{ label: "Closed after verification", date: "Mar 6, 9:10 AM" }] },
  { id: "CF-10361", title: "Potholes along Willow Avenue", description: "Multiple shallow potholes creating an uneven surface.", category: "Roads", severity: "Medium", priority: 66, status: "Reported", neighborhood: "Willow East", x: 18, y: 68, created: "2026-03-03T16:05:00", updated: "2026-03-03T16:05:00", department: "Unassigned", authority: "Unassigned", support: 39, sla: "2026-03-25T09:00:00", escalation: 1, verified: false, evidence: false, notes: [], history: [{ label: "Citizen report received", date: "Mar 3, 4:05 PM" }] },
];

export function validNext(issue: Issue): IssueStatus[] {
  if (issue.status === "Reported") return ["Acknowledged"];
  if (issue.status === "Acknowledged") return issue.department === "Unassigned" ? [] : ["Assigned"];
  if (issue.status === "Assigned") return ["In Progress"];
  if (issue.status === "In Progress") return issue.evidence ? ["Resolved — Awaiting Verification"] : [];
  if (issue.status === "Resolved — Awaiting Verification") return issue.verified ? ["Closed", "Reopened"] : ["Reopened"];
  if (issue.status === "Closed") return ["Reopened"];
  return issue.department === "Unassigned" ? [] : ["Assigned", "In Progress"];
}

type Store = {
  issues: Issue[]; updateIssue: (id: string, patch: Partial<Issue>, history?: string) => void;
  reset: () => void; unread: number; setUnread: (value: number) => void;
  profile: { name: string; email: string; role: string; photo?: string };
  setProfile: (profile: Store["profile"]) => void;
};
const CivicContext = createContext<Store | null>(null);

export function CivicProvider({ children }: { children: ReactNode }) {
  const [issues, setIssues] = useState<Issue[]>(() => {
    try { return JSON.parse(localStorage.getItem("civicfix-issues") || "null") || seedIssues; } catch { return seedIssues; }
  });
  const [unread, setUnread] = useState(4);
  const [profile, setProfile] = useState({ name: "Avery Morgan", email: "admin@alderbay.demo", role: "City Administrator", photo: "" });
  useEffect(() => localStorage.setItem("civicfix-issues", JSON.stringify(issues)), [issues]);
  const value = useMemo<Store>(() => ({
    issues, unread, setUnread, profile, setProfile,
    updateIssue: (id, patch, history) => setIssues(current => current.map(issue => issue.id === id ? { ...issue, ...patch, updated: new Date().toISOString(), history: history ? [{ label: history, date: "Just now" }, ...issue.history] : issue.history } : issue)),
    reset: () => { setIssues(seedIssues); localStorage.removeItem("civicfix-issues"); },
  }), [issues, unread, profile]);
  return <CivicContext.Provider value={value}>{children}</CivicContext.Provider>;
}

export function useCivic() {
  const value = useContext(CivicContext);
  if (!value) throw new Error("useCivic must be used within CivicProvider");
  return value;
}
