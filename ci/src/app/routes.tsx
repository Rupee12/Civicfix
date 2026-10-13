import { createBrowserRouter, Navigate } from "react-router";
import { AppShell } from "../components/Shell";
import {
  AiInsights, Analytics, Community, Departments, IssueDetail, Issues, Login, MapPage,
  Notifications, NotFound, Overview, Profile, Reports, Security, Settings, Sla,
} from "../pages/Pages";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  {
    path: "/", Component: AppShell, children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "overview", Component: Overview },
      { path: "issues", Component: Issues },
      { path: "issues/:issueId", Component: IssueDetail },
      { path: "city-map", Component: MapPage },
      { path: "analytics", Component: Analytics },
      { path: "departments", Component: Departments },
      { path: "community", Component: Community },
      { path: "notifications", Component: Notifications },
      { path: "sla", Component: Sla },
      { path: "reports", Component: Reports },
      { path: "ai-insights", Component: AiInsights },
      { path: "profile", Component: Profile },
      { path: "profile/security", Component: Security },
      { path: "settings", Component: Settings },
      { path: "*", Component: NotFound },
    ],
  },
]);
