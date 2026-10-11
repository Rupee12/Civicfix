import { useState, type ReactNode } from 'react'

type NavItem = { id: string; label: string; icon: string }
export type ConnectionState = 'checking' | 'connected' | 'signed-out' | 'permission-denied' | 'network-error' | 'auth-error' | 'server-error' | 'configuration-error'

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: '▦' },
  { id: 'issues', label: 'Issues', icon: '▤' },
  { id: 'map', label: 'Live City Map', icon: '⌖' },
  { id: 'analytics', label: 'Analytics & Hotspots', icon: '◒' },
  { id: 'departments', label: 'Departments & Authorities', icon: '⌂' },
  { id: 'notifications', label: 'Notifications', icon: '◌' },
  { id: 'sla', label: 'SLA & Escalations', icon: '!' },
  { id: 'reports', label: 'Reports & Exports', icon: '↗' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export function AdminShell({
  activePage,
  onNavigate,
  user,
  onLogout,
  connectionState = 'checking',
  children,
}: {
  activePage: string
  onNavigate: (page: string) => void
  user?: { name: string; email: string }
  onLogout?: () => void
  connectionState?: ConnectionState
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeLabel = navItems.find((item) => item.id === activePage)?.label ?? 'Overview'
  const connectionLabel = connectionState === 'connected' ? 'Connected' : connectionState === 'checking' ? 'Checking connection' : connectionState === 'signed-out' ? 'Sign in required' : connectionState === 'permission-denied' ? 'Permission denied' : connectionState === 'auth-error' ? 'Session expired' : connectionState === 'server-error' ? 'API unavailable' : connectionState === 'configuration-error' ? 'Configuration required' : 'Disconnected'
  const connectionDetail = connectionState === 'connected' ? 'Authenticated CivicFix API' : connectionState === 'checking' ? 'Verifying protected API access' : connectionState === 'signed-out' ? 'Administrator sign-in required' : connectionState === 'permission-denied' ? 'Administrator role required' : connectionState === 'auth-error' ? 'Sign in again to continue' : connectionState === 'server-error' ? 'Server returned an error' : connectionState === 'configuration-error' ? 'API configuration required' : 'Cannot reach CivicFix API'

  return (
    <div className={`admin-app ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`admin-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="admin-sidebar-top">
          <div className="admin-logo">
            <span className="admin-logo-symbol">✓</span>
            {!collapsed && <strong>CivicFix</strong>}
          </div>
          <button className="admin-mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation">×</button>
        </div>
        <nav aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              title={collapsed ? item.label : undefined}
              className={`admin-nav-item ${item.id === activePage ? 'active' : ''}`}
              onClick={() => { onNavigate(item.id); setMobileOpen(false) }}
            >
              <span aria-hidden="true">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          {!collapsed && <div className={`admin-mode-note connection-${connectionState}`}><span>●</span><div><strong>{connectionLabel}</strong><small>{connectionDetail}</small></div></div>}
          {user && onLogout && !collapsed ? <button type="button" className="admin-logout" onClick={onLogout}>Sign out <small>{user.name}</small></button> : null}
          <button type="button" className="admin-collapse" onClick={() => setCollapsed((value) => !value)}>
            <span>{collapsed ? '→' : '←'}</span>{!collapsed && 'Collapse sidebar'}
          </button>
        </div>
      </aside>
      {mobileOpen && <button className="admin-mobile-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <div className="admin-main">
        <header className="admin-header">
          <button type="button" className="admin-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">☰</button>
          <span className="admin-crumb">CivicFix <i>/</i> <strong>{activeLabel}</strong></span>
          <div className="admin-header-actions">
            <span className={`admin-live-badge connection-${connectionState}`}><i />{connectionLabel}</span>
            <button type="button" className="admin-avatar" onClick={onLogout} aria-label={`Sign out ${user?.name ?? ''}`}>{user?.name.slice(0, 2).toUpperCase() ?? 'CF'}</button>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  )
}
