import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Activity, Bell, Bot, Building2, ChartNoAxesCombined, ChevronDown, CircleHelp, Clock3, FileDown, LayoutDashboard, Map, Menu, PanelLeftClose, Search, Settings as SettingsIcon, ShieldCheck, Users, Wrench, X } from "lucide-react";
import { useCivic } from "../data/CivicContext";
import { Button, Input } from "./UI";

const nav = [
  ["/overview", "Overview", LayoutDashboard], ["/issues", "Issues", Wrench], ["/city-map", "Live City Map", Map],
  ["/analytics", "Analytics & Hotspots", ChartNoAxesCombined], ["/departments", "Departments & Authorities", Building2],
  ["/community", "Community Insights", Users], ["/notifications", "Notifications", Bell], ["/sla", "SLA & Escalations", Clock3],
  ["/reports", "Reports & Exports", FileDown], ["/ai-insights", "AI Insights", Bot], ["/settings", "Settings", SettingsIcon],
] as const;

export function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="logo"><span className="logo-symbol"><ShieldCheck size={20} /></span>{!compact && <strong>CivicFix</strong>}</div>;
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("cf-sidebar") === "collapsed");
  const [mobile, setMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { unread, profile } = useCivic();
  const location = useLocation();
  const navigate = useNavigate();
  const current = nav.find(([path]) => location.pathname.startsWith(path))?.[1] || (location.pathname.includes("profile") ? "Profile" : "Workspace");
  const toggle = () => { const next = !collapsed; setCollapsed(next); localStorage.setItem("cf-sidebar", next ? "collapsed" : "open"); };
  return <div className={`app ${collapsed ? "sidebar-collapsed" : ""}`}>
    <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
      <div className="sidebar-top"><Logo compact={collapsed} /><Button variant="ghost" className="mobile-close" aria-label="Close navigation" onClick={() => setMobile(false)}><X /></Button></div>
      <nav aria-label="Main navigation">{nav.map(([path, label, Icon]) => <NavLink key={path} to={path} title={collapsed ? label : undefined} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={() => setMobile(false)}><Icon size={19} /><span>{label}</span>{label === "Notifications" && unread > 0 && <b>{unread}</b>}</NavLink>)}</nav>
      <div className="sidebar-foot"><div className="demo-note"><Activity size={17} /><span><strong>Demonstration mode</strong><small>Fictional Alder Bay data</small></span></div><Button variant="ghost" className="collapse" onClick={toggle}><PanelLeftClose size={18} /><span>Collapse sidebar</span></Button></div>
    </aside>
    {mobile && <div className="mobile-scrim" onClick={() => setMobile(false)} />}
    <div className="main">
      <header className="header">
        <div className="header-left"><Button variant="ghost" className="menu-button" aria-label="Open navigation" onClick={() => setMobile(true)}><Menu /></Button><span className="crumb">Alder Bay <i>/</i> <strong>{current}</strong></span></div>
        <div className="global-search"><Search size={17} /><Input aria-label="Global search" placeholder="Search issues, places, departments…" /><kbd>⌘ K</kbd></div>
        <div className="header-actions"><Button variant="ghost" className="city-button">Alder Bay <ChevronDown size={15} /></Button><Button variant="ghost" aria-label="Help"><CircleHelp size={19} /></Button><Button variant="ghost" className="bell" aria-label={`${unread} unread notifications`} onClick={() => navigate("/notifications")}><Bell size={19} />{unread > 0 && <span>{unread}</span>}</Button><div className="profile-wrap"><Button variant="ghost" className="profile-button" onClick={() => setProfileOpen(!profileOpen)}><span className="avatar">AM</span><span>{profile.name.split(" ")[0]}</span><ChevronDown size={14} /></Button>{profileOpen && <div className="profile-menu"><button onClick={() => { navigate("/profile"); setProfileOpen(false); }}>Profile</button><button onClick={() => navigate("/login")}>Sign out of demonstration</button></div>}</div></div>
      </header>
      <main className="content"><Outlet /></main>
    </div>
  </div>;
}
