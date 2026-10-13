import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AdminShell, type ConnectionState } from './components/AdminShell'
import { IssueMap, type MapIssue } from './components/IssueMap'
import { apiRequest, clearSession, downloadApiFile, getApiBaseUrl, getSession, login, type Session, ApiClientError } from './api'
import './App.css'

type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
type IssueRow = {
  id: string
  title: string
  category: string
  severity: string
  safetyImpact?: string
  priorityScore: number
  priorityLevel: PriorityLevel
  reportCount: number
  supportCount: number
  status: string
  createdAt?: string
  location?: { latitude?: number; longitude?: number }
  description?: string
  address?: string
  area?: string
  city?: string
  media?: { photos?: MediaAsset[]; videos?: MediaAsset[] }
  assignedTo?: string | { name?: string; email?: string }
  departmentId?: string
  assignmentHistory?: AssignmentHistory[]
}
type MediaAsset = { url: string; originalName?: string; mimeType?: string }
type AssignmentHistory = { departmentId?: string; assignedTo?: string; assignedBy?: string; assignedAt?: string; reason?: string }
type StatusHistory = { id: string; fromStatus: string; toStatus: string; changedBy?: { name?: string; role?: string }; changedAt?: string; reason?: string }
type Resolution = { id: string; description: string; completedAt?: string; resolvedBy?: { name?: string; role?: string }; beforeMedia?: { photos?: MediaAsset[]; videos?: MediaAsset[] }; afterMedia?: { photos?: MediaAsset[]; videos?: MediaAsset[] } }
type Department = { id?: string; _id?: string; name: string; code?: string; description?: string; isActive?: boolean; authorityCount?: number; assignedIssueCount?: number }
type Authority = { id?: string; _id?: string; name: string; email?: string; departmentId?: string; isActive?: boolean; assignedIssueCount?: number }
type IssueDetail = IssueRow & { resolution?: Resolution | null }
type Summary = { metrics: Record<PriorityLevel, number>; totalIssues: number; issues: IssueRow[] }
type WorkloadDepartment = { departmentId?: string; department?: { name?: string; code?: string } | null; count: number }
type Workload = {
  totalActive: number
  unassigned: number
  criticalUnassigned: number
  inProgress: number
  resolved: number
  verificationPending: number
  byDepartment: WorkloadDepartment[]
  byStatus: { _id: string; count: number }[]
  byAuthority: { authorityId?: string; authority?: { name?: string; email?: string } | null; count: number }[]
}
type AnalyticsData = {
  period: { days: number; since: string }
  totalIssues: number
  byStatus: { _id: string; count: number }[]
  byCategory: { _id: string; count: number }[]
  bySeverity: { _id: string; count: number }[]
  byPriority: { _id: string; count: number }[]
  trend: { _id: string; count: number }[]
  resolution: { averageMs?: number; sampleSize?: number } | null
  sla: { complianceRate: number; breachRate: number; escalated: number; completed: number }
  hotspots: { latitude: number; longitude: number; count: number }[]
}

const levels: PriorityLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const apiUrl = getApiBaseUrl()

function App() {
  const [session, setSession] = useState<Session | undefined>(() => getSession())
  const [summary, setSummary] = useState<Summary>()
  const [workload, setWorkload] = useState<Workload>()
  const [filter, setFilter] = useState<PriorityLevel | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [activePage, setActivePage] = useState('overview')
  const [selectedIssueId, setSelectedIssueId] = useState<string>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking')

  useEffect(() => {
    const clear = () => setSession(undefined)
    window.addEventListener('civicfix:session-cleared', clear)
    return () => window.removeEventListener('civicfix:session-cleared', clear)
  }, [])

  const loadDashboard = useCallback(async () => {
    if (!session) {
      setError('Sign in with an administrator account to load live data.')
      setLoading(false)
      setConnectionState('signed-out')
      return
    }
    setLoading(true)
    setError('')
    setConnectionState('checking')
    try {
      await apiRequest('/health')
      const [priorityData, workloadData] = await Promise.all([
        apiRequest<Summary>('/admin/priority', {}, session.token),
        apiRequest<Workload>('/admin/workload', {}, session.token),
      ])
      setSummary(priorityData)
      setWorkload(workloadData)
      setConnectionState('connected')
    } catch (requestError) {
      if (requestError instanceof ApiClientError && requestError.status === 0) {
        setConnectionState('network-error')
        setError(`Cannot reach the CivicFix API at ${apiUrl}.`)
      } else if (requestError instanceof ApiClientError && requestError.status === 401) {
        setConnectionState('auth-error')
        setError('Your administrator session has expired or is invalid. Please sign in again.')
      } else if (requestError instanceof ApiClientError && requestError.status === 403) {
        setConnectionState('permission-denied')
        setError('This authenticated account does not have permission to access the administrator dashboard.')
      } else if (requestError instanceof ApiClientError && requestError.status >= 500) {
        setConnectionState('server-error')
        setError(`The CivicFix API returned ${requestError.status}.`)
      } else {
        setConnectionState('server-error')
        setError(requestError instanceof Error ? requestError.message : 'Priority data could not be loaded.')
      }
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { void loadDashboard() }, [loadDashboard])

  const visibleIssues = useMemo(() => {
    const query = search.trim().toLowerCase()
    return summary?.issues.filter((issue) => {
      const matchesLevel = filter === 'ALL' || issue.priorityLevel === filter
      const matchesSearch = !query || `${issue.title} ${issue.category} ${issue.status}`.toLowerCase().includes(query)
      return matchesLevel && matchesSearch
    }) ?? []
  }, [filter, search, summary])

  const activeOpen = workload ? Math.max(workload.totalActive - workload.resolved, 0) : undefined
  const departmentMax = Math.max(...(workload?.byDepartment.map((item) => item.count) ?? [1]), 1)

  const navigate = (page: string) => { setActivePage(page); if (page !== 'issues') setSelectedIssueId(undefined) }

  if (!session) return <LoginScreen onLogin={setSession} />

  return <AdminShell activePage={activePage} onNavigate={navigate} user={session.user} onLogout={() => { clearSession(); setSession(undefined) }} connectionState={connectionState}>
    <section className="dashboard">
      {activePage === 'overview' ? <header className="welcome-panel">
        <div>
          <p className="eyebrow">CIVICFIX / AUTHORITY VIEW</p>
          <h1>Good morning, civic team.</h1>
          <p className="subhead">A calm command centre for the issues that need your city’s attention first.</p>
        </div>
        <div className="city-health">
          <span className="health-orbit"><i /></span>
          <div><strong>{connectionState === 'connected' ? 'City operations online' : connectionState === 'checking' ? 'Checking city operations' : 'City operations unavailable'}</strong><small>{connectionState === 'connected' ? 'Live CivicFix API · verified just now' : error || 'Verifying the configured API endpoint'}</small></div>
        </div>
      </header> : null}

      {activePage === 'overview' && error ? <section className="notice error-notice"><div><strong>Live data is unavailable</strong><p>{error}</p></div><button type="button" onClick={() => void loadDashboard()}>Try again</button></section> : null}
      {activePage === 'overview' && loading ? <DashboardSkeleton /> : null}

      {activePage === 'overview' && summary ? <>
        <section className="overview-grid" aria-label="CivicFix overview metrics">
          <Metric label="Total active issues" value={summary.totalIssues} tone="mint" detail="Open priority queue" />
          <Metric label="Open issues" value={activeOpen} tone="sky" detail="Active, excluding resolved" />
          <Metric label="Resolved" value={workload?.resolved} tone="peach" detail="Current workload snapshot" />
          <UnavailableMetric label="Avg. resolution time" detail="Needs issue history timestamps" />
        </section>

        <section className="insight-strip">
          <div><span className="insight-icon insight-critical">!</span><div><strong>{summary.metrics.CRITICAL} critical issues</strong><small>Require immediate review in the ranked queue</small></div></div>
          <div><span className="insight-icon insight-yellow">↗</span><div><strong>{workload?.unassigned ?? '—'} unassigned</strong><small>Active issues currently without an owner</small></div></div>
          <div><span className="insight-icon insight-teal">✓</span><div><strong>{workload?.verificationPending ?? '—'} awaiting verification</strong><small>Resolved work ready for confirmation</small></div></div>
        </section>

        <section className="dashboard-columns">
          <section className="panel priority-panel">
            <div className="panel-heading"><div><p className="eyebrow">OPEN ISSUE QUEUE</p><h2>Priority desk</h2><p className="panel-description">The highest-scoring issues from the live API.</p></div><span className="result-count">{visibleIssues.length} shown</span></div>
            <div className="queue-tools">
              <label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search issues" aria-label="Search issues" /></label>
              <select value={filter} onChange={(event) => setFilter(event.target.value as PriorityLevel | 'ALL')} aria-label="Filter by priority"><option value="ALL">All levels</option>{levels.map((level) => <option key={level} value={level}>{level}</option>)}</select>
            </div>
            <div className="issue-list">{visibleIssues.slice(0, 8).map((issue) => <IssuePreview issue={issue} key={issue.id} onOpen={() => { setSelectedIssueId(issue.id); setActivePage('issues') }} />)}{!visibleIssues.length ? <p className="empty">No issues match this search or priority level.</p> : null}{visibleIssues.length > 8 ? <p className="queue-foot">Showing the 8 most urgent results from the API response.</p> : null}</div>
          </section>

          <section className="panel workload-panel">
            <div className="panel-heading"><div><p className="eyebrow">OPERATIONAL ASSIGNMENT</p><h2>Department workload</h2><p className="panel-description">Active issues grouped by department.</p></div></div>
            {workload?.byDepartment.length ? <div className="department-list">{workload.byDepartment.slice(0, 6).map((item, index) => <div className="department-row" key={item.departmentId ?? `unassigned-${index}`}><div className="department-label"><span className={`department-avatar department-avatar-${index % 4}`}>{(item.department?.name ?? 'Unassigned').slice(0, 1).toUpperCase()}</span><strong>{item.department?.name ?? 'Unassigned'}</strong><b>{item.count}</b></div><div className="workload-bar"><i style={{ width: `${(item.count / departmentMax) * 100}%` }} /></div></div>)}</div> : <p className="empty compact-empty">No department workload is available.</p>}
            {workload ? <div className="status-summary"><strong>Status mix</strong>{workload.byStatus.slice(0, 4).map((item) => <span key={item._id}>{formatLabel(item._id)} <b>{item.count}</b></span>)}</div> : null}
          </section>
        </section>

        <section className="lower-grid">
          <section className="panel snapshot-panel"><div className="panel-heading"><div><p className="eyebrow">SERVICE SNAPSHOT</p><h2>Resolution pipeline</h2></div><span className="unavailable-label">Live snapshot</span></div><div className="pipeline"><PipelineStep label="Unassigned" value={workload?.unassigned} tone="peach" /><PipelineStep label="In progress" value={workload?.inProgress} tone="sky" /><PipelineStep label="Verification" value={workload?.verificationPending} tone="mint" /><PipelineStep label="Resolved" value={workload?.resolved} tone="teal" /></div></section>
          <section className="panel limitation-panel"><span className="limitation-mark">i</span><div><p className="eyebrow">DATA CAPABILITY</p><h2>Trends will appear here</h2><p>Historical trends, recent activity, and average resolution time are not included in the current admin API responses. No values are estimated.</p></div></section>
        </section>
      </> : activePage === 'issues' ? <IssueManagement initialIssueId={selectedIssueId} /> : activePage === 'map' ? <MapPage token={session.token} onViewDetails={(issue) => { setSelectedIssueId(issue.id); setActivePage('issues') }} /> : activePage === 'analytics' ? <AnalyticsPage token={session.token} /> : activePage === 'departments' ? <DepartmentsPage token={session.token} /> : activePage === 'notifications' ? <NotificationsPage token={session.token} onOpenIssue={(id) => { setSelectedIssueId(id); setActivePage('issues') }} /> : activePage === 'sla' ? <SlaPage token={session.token} /> : activePage === 'reports' ? <ReportsPage token={session.token} /> : activePage === 'settings' ? <SettingsPage token={session.token} user={session.user} /> : null}
    </section>
  </AdminShell>
}

type NotificationRow = { id: string; title: string; message: string; readAt?: string; createdAt: string; relatedEntityId?: string }
function NotificationsPage({ token, onOpenIssue }: { token: string; onOpenIssue: (id: string) => void }) {
  const [items, setItems] = useState<NotificationRow[]>([]); const [error, setError] = useState('')
  const load = useCallback(async () => { try { setItems((await apiRequest<{ notifications: NotificationRow[] }>('/notifications?limit=50', {}, token)).notifications) } catch (e) { setError(e instanceof Error ? e.message : 'Notifications could not be loaded.') } }, [token])
  useEffect(() => { void load() }, [load])
  const readAll = async () => { await apiRequest('/notifications/read-all', { method: 'PATCH' }, token); await load() }
  const read = async (item: NotificationRow) => { if (!item.readAt) await apiRequest(`/notifications/${item.id}/read`, { method: 'PATCH' }, token); if (item.relatedEntityId) onOpenIssue(item.relatedEntityId); await load() }
  return <section className="operations-page"><header className="issues-heading"><div><p className="eyebrow">CIVICFIX / INBOX</p><h1>Notifications</h1><p className="subhead">Workflow and SLA events for your administrator account.</p></div><button type="button" onClick={() => void readAll()}>Mark all read</button></header>{error ? <section className="notice error-notice"><p>{error}</p><button type="button" onClick={() => void load()}>Try again</button></section> : null}<section className="panel issue-list">{items.length ? items.map((item) => <button type="button" className={`notification-row ${item.readAt ? '' : 'unread'}`} key={item.id} onClick={() => void read(item)}><strong>{item.title}</strong><span>{item.message}</span><small>{new Date(item.createdAt).toLocaleString()}</small></button>) : <p className="empty">No notifications yet.</p>}</section></section>
}

function SlaPage({ token }: { token: string }) {
  const [data, setData] = useState<{ nearingDeadline: number; overdue: number; escalated: number }>(); const [targets, setTargets] = useState<Record<PriorityLevel, number>>({ CRITICAL: 24, HIGH: 72, MEDIUM: 168, LOW: 336 }); const [error, setError] = useState(''); const [message, setMessage] = useState('')
  const load = useCallback(async () => { try { const [overview, config] = await Promise.all([apiRequest<{ nearingDeadline: number; overdue: number; escalated: number }>('/sla/overview', {}, token), apiRequest<{ targets: Record<PriorityLevel, number> }>('/sla/configuration', {}, token)]); setData(overview); setTargets(config.targets) } catch (e) { setError(e instanceof Error ? e.message : 'SLA overview could not be loaded.') } }, [token])
  useEffect(() => { void load() }, [load])
  const process = async () => { await apiRequest('/sla/process', { method: 'POST' }, token); await load() }
  const save = async (event: FormEvent) => { event.preventDefault(); setMessage(''); try { await apiRequest('/sla/configuration', { method: 'PATCH', body: JSON.stringify(targets) }, token); setMessage('SLA targets saved. New issues will use the updated values.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'SLA configuration could not be saved.') } }
  return <section className="operations-page"><header className="issues-heading"><div><p className="eyebrow">CIVICFIX / OPERATIONS</p><h1>SLA & escalations</h1><p className="subhead">Deadlines are calculated in UTC from issue creation; closed and rejected issues stop the clock.</p></div><button type="button" onClick={() => void process()}>Process overdue issues</button></header>{error ? <section className="notice error-notice"><p>{error}</p><button type="button" onClick={() => void load()}>Try again</button></section> : null}<section className="overview-grid">{[['Nearing deadline', data?.nearingDeadline], ['Overdue', data?.overdue], ['Escalated', data?.escalated]].map(([label, value]) => <section className="panel metric-card" key={String(label)}><p className="eyebrow">{label}</p><strong>{value ?? '—'}</strong></section>)}</section><section className="panel"><div className="panel-heading"><div><p className="eyebrow">ADMIN CONFIGURATION</p><h2>Resolution targets</h2><p className="panel-description">Hours are validated from 1 to 8,760. Existing issue deadlines are preserved.</p></div></div><form onSubmit={save} className="settings-form">{levels.map((level) => <label key={level}>{formatLabel(level)} hours<input type="number" min="1" max="8760" step="1" value={targets[level]} onChange={(event) => setTargets((current) => ({ ...current, [level]: Number(event.target.value) }))} required /></label>)}<button type="submit">Save SLA targets</button>{message ? <p>{message}</p> : null}</form></section></section>
}

function ReportsPage({ token }: { token: string }) {
  const [error, setError] = useState(''); const [filters, setFilters] = useState({ startDate: '', endDate: '', status: '', priorityLevel: '', category: '' })
  const download = async () => { try { const params = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value) }); const blob = await downloadApiFile(`/admin/reports/export?${params.toString()}`, token); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'civicfix-report.csv'; link.click(); URL.revokeObjectURL(url) } catch (e) { setError(e instanceof Error ? e.message : 'Report export failed.') } }
  return <section className="operations-page"><header className="issues-heading"><div><p className="eyebrow">CIVICFIX / DATA</p><h1>Reports & exports</h1><p className="subhead">Export actual MongoDB issue records using combined filters.</p></div><button type="button" onClick={() => void download()}>Download CSV</button></header>{error ? <section className="notice error-notice"><p>{error}</p></section> : null}<section className="panel"><div className="map-toolbar"><label>From<input type="date" value={filters.startDate} onChange={(e) => setFilters((current) => ({ ...current, startDate: e.target.value }))} /></label><label>To<input type="date" value={filters.endDate} onChange={(e) => setFilters((current) => ({ ...current, endDate: e.target.value }))} /></label><select value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))} aria-label="Report status"><option value="">All statuses</option>{issueStatuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}</select><select value={filters.priorityLevel} onChange={(e) => setFilters((current) => ({ ...current, priorityLevel: e.target.value }))} aria-label="Report priority"><option value="">All priorities</option>{levels.map((level) => <option key={level} value={level}>{level}</option>)}</select><select value={filters.category} onChange={(e) => setFilters((current) => ({ ...current, category: e.target.value }))} aria-label="Report category"><option value="">All categories</option>{issueCategories.map((category) => <option key={category} value={category}>{formatLabel(category)}</option>)}</select></div><p>Exports are limited to 10,000 records and include issue workflow fields only. Filters apply together.</p></section></section>
}

function SettingsPage({ token, user }: { token: string; user: Session['user'] }) {
  const [name, setName] = useState(user.name); const [message, setMessage] = useState('')
  const save = async (event: FormEvent) => { event.preventDefault(); try { await apiRequest('/auth/me', { method: 'PATCH', body: JSON.stringify({ name }) }, token); setMessage('Profile updated successfully.') } catch (e) { setMessage(e instanceof Error ? e.message : 'Profile update failed.') } }
  return <section className="operations-page"><header className="issues-heading"><div><p className="eyebrow">CIVICFIX / ACCOUNT</p><h1>Settings</h1><p className="subhead">{user.email}</p></div></header><section className="panel"><form onSubmit={save}><label>Name<input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required /></label><button type="submit">Save profile</button>{message ? <p>{message}</p> : null}</form></section></section>
}

function MapPage({ token, onViewDetails }: { token: string; onViewDetails: (issue: MapIssue) => void }) {
  const [issues, setIssues] = useState<MapIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ category: '', severity: '', status: '', priorityLevel: '' })
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ page: '1', limit: '50', sort: 'priority' })
      if (filters.status) params.set('status', filters.status)
      if (filters.category) params.set('category', filters.category)
      if (filters.severity) params.set('severity', filters.severity)
      if (filters.priorityLevel) params.set('priorityLevel', filters.priorityLevel)
      const data = await apiRequest<{ issues: MapIssue[] }>(`/issues?${params.toString()}`, {}, token)
      setIssues(data.issues)
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Mapped issues could not be loaded.') }
    finally { setLoading(false) }
  }, [filters.category, filters.priorityLevel, filters.severity, filters.status, token])
  useEffect(() => { void load() }, [load])
  const mediaUrl = (path: string) => path.startsWith('http') ? path : `${apiUrl.replace(/\/api\/?$/, '')}${path}`
  return <section className="operations-page"><header className="issues-heading"><div><p className="eyebrow">CIVICFIX / OPERATIONS</p><h1>Live city map</h1><p className="subhead">Explore real reported issues by location, priority, status, category, and severity.</p></div><span className="live-dot">LIVE API</span></header><div className="map-toolbar"><select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} aria-label="Filter map by category"><option value="">All categories</option>{issueCategories.map((category) => <option key={category} value={category}>{formatLabel(category)}</option>)}</select><select value={filters.severity} onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value }))} aria-label="Filter map by severity"><option value="">All severities</option>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((severity) => <option key={severity} value={severity}>{severity}</option>)}</select><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} aria-label="Filter map by status"><option value="">All statuses</option>{issueStatuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}</select><select value={filters.priorityLevel} onChange={(event) => setFilters((current) => ({ ...current, priorityLevel: event.target.value }))} aria-label="Filter map by priority"><option value="">All priorities</option>{levels.map((level) => <option key={level} value={level}>{level}</option>)}</select><button type="button" onClick={() => void load()}>Refresh map</button></div>{error ? <section className="notice error-notice"><div><strong>Map data unavailable</strong><p>{error}</p></div><button type="button" onClick={() => void load()}>Try again</button></section> : null}{loading ? <DashboardSkeleton /> : <IssueMap issues={issues} onViewDetails={onViewDetails} resolveMediaUrl={mediaUrl} />}</section>
}

function AnalyticsPage({ token }: { token: string }) {
  const [days, setDays] = useState('30')
  const [data, setData] = useState<AnalyticsData>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await apiRequest<AnalyticsData>(`/admin/analytics?days=${days}`, {}, token)) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Analytics could not be loaded.') }
    finally { setLoading(false) }
  }, [days, token])
  useEffect(() => { void load() }, [load])
  return <section className="operations-page"><header className="issues-heading"><div><p className="eyebrow">CIVICFIX / INSIGHTS</p><h1>Analytics & hotspots</h1><p className="subhead">Aggregated from persisted issue records; no dashboard-page estimates.</p></div><select value={days} onChange={(event) => setDays(event.target.value)} aria-label="Analytics period"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 365 days</option></select></header>{error ? <section className="notice error-notice"><div><strong>Analytics unavailable</strong><p>{error}</p></div><button type="button" onClick={() => void load()}>Try again</button></section> : null}{loading ? <DashboardSkeleton /> : data ? <><section className="overview-grid"><Metric label="Issues in period" value={data.totalIssues} tone="mint" detail={`${data.period.days}-day database window`} /><Metric label="Resolved sample" value={data.resolution?.sampleSize} tone="peach" detail="Records with resolution timestamps" /><Metric label="SLA compliance" value={`${Math.round(data.sla.complianceRate)}%`} tone="sky" detail={`${data.sla.completed} completed issues`} /><Metric label="SLA breach rate" value={`${Math.round(data.sla.breachRate)}%`} tone="butter" detail={`${data.sla.escalated} escalated issues`} /></section><section className="analytics-grid"><AnalyticsList title="Status distribution" items={data.byStatus} /><AnalyticsList title="Category distribution" items={data.byCategory} /><AnalyticsList title="Priority distribution" items={data.byPriority} /><AnalyticsList title="Daily issue trend" items={data.trend} /></section><section className="panel analytics-hotspots"><p className="eyebrow">LOCATION AGGREGATION</p><h2>Hotspots</h2>{data.hotspots.length ? <div className="hotspot-list">{data.hotspots.map((hotspot) => <span key={`${hotspot.latitude}-${hotspot.longitude}`}>{hotspot.count} issues · {hotspot.latitude.toFixed(2)}, {hotspot.longitude.toFixed(2)}</span>)}</div> : <p>No location hotspots are available for this period.</p>}</section></> : null}</section>
}

function AnalyticsList({ title, items }: { title: string; items: { _id: string; count: number }[] }) {
  const maximum = Math.max(...items.map((item) => item.count), 1)
  return <section className="panel analytics-list"><h2>{title}</h2>{items.length ? items.slice(0, 8).map((item) => <div key={item._id}><span>{formatLabel(item._id)}</span><b>{item.count}</b><i style={{ width: `${Math.round(item.count / maximum * 100)}%` }} /></div>) : <p>No records in this period.</p>}</section>
}

function DepartmentsPage({ token }: { token: string }) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [authorities, setAuthorities] = useState<Authority[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [newDepartment, setNewDepartment] = useState({ name: '', code: '', description: '' })
  const [newAuthority, setNewAuthority] = useState({ name: '', email: '', password: '', departmentId: '' })
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [departmentData, authorityData] = await Promise.all([apiRequest<{ departments: Department[] }>('/admin/departments', {}, token), apiRequest<{ authorities: Authority[] }>('/admin/authorities', {}, token)])
      setDepartments(departmentData.departments); setAuthorities(authorityData.authorities)
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Administrative records could not be loaded.') }
    finally { setLoading(false) }
  }, [token])
  useEffect(() => { void load() }, [load])
  async function createDepartment(event: FormEvent) {
    event.preventDefault(); setNotice(''); try { await apiRequest('/admin/departments', { method: 'POST', body: JSON.stringify(newDepartment) }, token); setNewDepartment({ name: '', code: '', description: '' }); setNotice('Department created.'); await load() } catch (requestError) { setNotice(requestError instanceof Error ? requestError.message : 'Department could not be created.') }
  }
  async function createAuthority(event: FormEvent) {
    event.preventDefault(); setNotice(''); try { await apiRequest('/admin/authorities', { method: 'POST', body: JSON.stringify(newAuthority) }, token); setNewAuthority({ name: '', email: '', password: '', departmentId: '' }); setNotice('Authority created.'); await load() } catch (requestError) { setNotice(requestError instanceof Error ? requestError.message : 'Authority could not be created.') }
  }
  async function toggleDepartment(department: Department) {
    const id = String(department.id ?? department._id); try { await apiRequest(`/admin/departments/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive: department.isActive === false }) }, token); await load() } catch (requestError) { setNotice(requestError instanceof Error ? requestError.message : 'Department could not be updated.') }
  }
  return <section className="operations-page"><header className="issues-heading"><div><p className="eyebrow">CIVICFIX / ADMINISTRATION</p><h1>Departments & authorities</h1><p className="subhead">Manage active operational teams and their assignment capacity.</p></div><button type="button" onClick={() => void load()}>Refresh</button></header>{error ? <section className="notice error-notice"><div><strong>Records unavailable</strong><p>{error}</p></div><button type="button" onClick={() => void load()}>Try again</button></section> : null}{notice ? <p className="mutation-notice" role="status">{notice}</p> : null}{loading ? <DashboardSkeleton /> : <><section className="admin-record-grid">{departments.map((department) => <article className="panel admin-record" key={String(department.id ?? department._id)}><div><span className={`status-pill ${department.isActive === false ? 'status-rejected' : 'status-verified'}`}>{department.isActive === false ? 'Inactive' : 'Active'}</span><h2>{department.name}</h2><p>{department.code} · {department.description || 'No description'}</p></div><strong>{department.assignedIssueCount ?? 0}<small> active issues</small></strong><small>{department.authorityCount ?? 0} authorities</small><button type="button" onClick={() => void toggleDepartment(department)}>{department.isActive === false ? 'Activate' : 'Deactivate'}</button></article>)}</section><section className="admin-forms"><form className="panel admin-form" onSubmit={(event) => void createDepartment(event)}><h2>Add department</h2><input required minLength={2} placeholder="Name" value={newDepartment.name} onChange={(event) => setNewDepartment({ ...newDepartment, name: event.target.value })} /><input required minLength={2} placeholder="Code" value={newDepartment.code} onChange={(event) => setNewDepartment({ ...newDepartment, code: event.target.value })} /><textarea placeholder="Description" value={newDepartment.description} onChange={(event) => setNewDepartment({ ...newDepartment, description: event.target.value })} /><button type="submit">Create department</button></form><form className="panel admin-form" onSubmit={(event) => void createAuthority(event)}><h2>Add authority</h2><input required minLength={2} placeholder="Name" value={newAuthority.name} onChange={(event) => setNewAuthority({ ...newAuthority, name: event.target.value })} /><input required type="email" placeholder="Email" value={newAuthority.email} onChange={(event) => setNewAuthority({ ...newAuthority, email: event.target.value })} /><input required minLength={8} type="password" placeholder="Temporary password" value={newAuthority.password} onChange={(event) => setNewAuthority({ ...newAuthority, password: event.target.value })} /><select value={newAuthority.departmentId} onChange={(event) => setNewAuthority({ ...newAuthority, departmentId: event.target.value })}><option value="">No department</option>{departments.filter((department) => department.isActive !== false).map((department) => <option key={String(department.id ?? department._id)} value={String(department.id ?? department._id)}>{department.name}</option>)}</select><button type="submit">Create authority</button></form></section><section className="panel authority-list"><h2>Authorities</h2>{authorities.map((authority) => <div key={String(authority.id ?? authority._id)}><span>{authority.name}<small>{authority.email}</small></span><b>{authority.assignedIssueCount ?? 0} active issues</b><span>{authority.isActive === false ? 'Inactive' : 'Active'}</span></div>)}</section></>}</section>
}

function formatLabel(value: string) { return value.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase()) }

function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true); setError('')
    try { onLogin(await login(email, password)) }
    catch (requestError) {
      if (requestError instanceof ApiClientError && requestError.status === 0) setError('The CivicFix API could not be reached.')
      else if (requestError instanceof ApiClientError && requestError.status === 403) setError('This account is not an administrator.')
      else if (requestError instanceof ApiClientError && requestError.status === 401) setError('Invalid email or password.')
      else setError(requestError instanceof Error ? requestError.message : 'Sign in failed.')
    } finally { setLoading(false) }
  }

  return <main className="login-screen"><section className="login-card"><div className="login-brand"><span className="admin-logo-symbol">✓</span><strong>CivicFix</strong></div><p className="eyebrow">ADMINISTRATOR ACCESS</p><h1>Welcome back.</h1><p className="login-copy">Sign in to the CivicFix command centre to manage live civic issues.</p><form onSubmit={(event) => void submit(event)}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error ? <p className="login-error" role="alert">{error}</p> : null}<button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in securely'}</button></form><small className="login-note">Administrator permissions are verified by the CivicFix API.</small></section></main>
}

function IssuePreview({ issue, onOpen }: { issue: IssueRow; onOpen?: () => void }) {
  return <article className="issue-row">
    <div className={`score score-${issue.priorityLevel.toLowerCase()}`}><strong>{issue.priorityScore}</strong><span>/100</span></div>
    <div className="issue-copy"><span className="category">{formatLabel(issue.category)}</span><h3>{issue.title}</h3><p>{issue.reportCount} reports · {issue.supportCount} supports · {formatLabel(issue.status)}</p></div>
    <span className={`level level-${issue.priorityLevel.toLowerCase()}`}>{issue.priorityLevel}</span>
    {onOpen ? <button type="button" className="issue-open" onClick={onOpen}>View</button> : null}
  </article>
}

function Metric({ label, value, tone, detail }: { label: string; value?: number | string; tone: string; detail: string }) {
  return <article className={`metric metric-${tone}`}><div className="metric-top"><span>{label}</span><i aria-hidden="true">↗</i></div><strong>{value ?? '—'}</strong><small>{detail}</small></article>
}

function UnavailableMetric({ label, detail }: { label: string; detail: string }) {
  return <article className="metric metric-unavailable"><div className="metric-top"><span>{label}</span><i aria-hidden="true">—</i></div><strong>—</strong><small>{detail}</small></article>
}

function PipelineStep({ label, value, tone }: { label: string; value?: number; tone: string }) {
  return <div className="pipeline-step"><span className={`pipeline-dot ${tone}`} /><div><strong>{value ?? '—'}</strong><small>{label}</small></div></div>
}

function DashboardSkeleton() {
  return <section className="skeleton-area" aria-label="Loading dashboard"><div className="skeleton-row">{[1, 2, 3, 4].map((item) => <span className="skeleton-card" key={item} />)}</div><div className="skeleton-large" /></section>
}

const issueStatuses = ['REPORTED', 'UNDER_REVIEW', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFICATION_PENDING', 'REJECTED', 'CLOSED']
const issueCategories = ['GARBAGE', 'ILLEGAL_DUMPING', 'BROKEN_STREETLIGHT', 'OPEN_DRAIN', 'DAMAGED_ROAD', 'WATER_LEAKAGE', 'PUBLIC_SPACE_DAMAGE', 'OTHER']
const transitions: Record<string, string[]> = { REPORTED: ['UNDER_REVIEW'], UNDER_REVIEW: ['VERIFIED', 'REJECTED'], VERIFIED: ['ASSIGNED'], ASSIGNED: ['IN_PROGRESS'], IN_PROGRESS: ['RESOLVED'] }

function IssueManagement({ initialIssueId }: { initialIssueId?: string }) {
  const [issues, setIssues] = useState<IssueRow[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ search: '', category: '', status: '', severity: '', priorityLevel: '', sort: 'priority' })
  const [selectedId, setSelectedId] = useState(initialIssueId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [detail, setDetail] = useState<IssueDetail>()
  const [detailLoading, setDetailLoading] = useState(false)
  const [history, setHistory] = useState<StatusHistory[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [authorities, setAuthorities] = useState<Authority[]>([])
  const [mutationLoading, setMutationLoading] = useState(false)
  const [statusReason, setStatusReason] = useState('')
  const [targetStatus, setTargetStatus] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [authorityId, setAuthorityId] = useState('')
  const [assignmentReason, setAssignmentReason] = useState('')
  const [resolutionDescription, setResolutionDescription] = useState('')
  const [resolutionPhotos, setResolutionPhotos] = useState<FileList>()

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const currentSession = getSession()
    if (!currentSession) throw new ApiClientError('Sign in is required.', 401, 'AUTHENTICATION_REQUIRED')
    return apiRequest<unknown>(path, init, currentSession.token)
  }, [])

  const loadIssues = useCallback(async (page = pagination.page) => {
    setLoading(true); setError('')
    const params = new URLSearchParams({ page: String(page), limit: '20', sort: filters.sort })
    if (filters.category) params.set('category', filters.category)
    if (filters.status) params.set('status', filters.status)
    if (filters.severity) params.set('severity', filters.severity)
    if (filters.priorityLevel) params.set('priorityLevel', filters.priorityLevel)
    try {
      const payload = await request(`/issues?${params.toString()}`) as { issues: IssueRow[]; pagination: typeof pagination }
      setIssues(payload.issues); setPagination(payload.pagination)
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Issues could not be loaded.') }
    finally { setLoading(false) }
  }, [filters.category, filters.priorityLevel, filters.severity, filters.sort, filters.status, pagination.page, request])

  const loadSupportingData = useCallback(async () => {
    try {
      const [departmentPayload, authorityPayload] = await Promise.all([
        request('/admin/departments') as Promise<{ departments: Department[] }>,
        request('/admin/authorities') as Promise<{ authorities: Authority[] }>,
      ])
      setDepartments(departmentPayload.departments); setAuthorities(authorityPayload.authorities)
    } catch { setDepartments([]); setAuthorities([]) }
  }, [request])

  const loadDetail = useCallback(async (id: string) => {
    setSelectedId(id); setDetailLoading(true); setNotice(''); setTargetStatus('')
    try {
      const [issuePayload, historyPayload] = await Promise.all([
        request(`/issues/${id}`) as Promise<{ issue: IssueDetail }>,
        request(`/issues/${id}/status-history`) as Promise<{ history: StatusHistory[] }>,
      ])
      setDetail(issuePayload.issue); setHistory(historyPayload.history)
      setDepartmentId(typeof issuePayload.issue.departmentId === 'string' ? issuePayload.issue.departmentId : '')
      const assigned = typeof issuePayload.issue.assignedTo === 'string' ? issuePayload.issue.assignedTo : ''
      setAuthorityId(assigned)
    } catch (requestError) { setNotice(requestError instanceof Error ? requestError.message : 'Issue details could not be loaded.') }
    finally { setDetailLoading(false) }
  }, [request])

  useEffect(() => { void loadIssues(1) }, [loadIssues])
  useEffect(() => { void loadSupportingData() }, [loadSupportingData])
  useEffect(() => { if (initialIssueId) void loadDetail(initialIssueId) }, [initialIssueId, loadDetail])

  const filteredIssues = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    return query ? issues.filter((issue) => `${issue.title} ${issue.description ?? ''} ${issue.category} ${issue.status}`.toLowerCase().includes(query)) : issues
  }, [filters.search, issues])
  const availableAuthorities = authorities.filter((authority) => !departmentId || String(authority.departmentId) === departmentId)
  const validNextStatuses = detail ? transitions[detail.status] ?? [] : []

  async function mutate(path: string, init: RequestInit, successMessage: string) {
    setMutationLoading(true); setNotice('')
    try { await request(path, init); setNotice(successMessage); await loadIssues(pagination.page); if (selectedId) await loadDetail(selectedId) }
    catch (requestError) { setNotice(requestError instanceof Error ? requestError.message : 'The update could not be completed.') }
    finally { setMutationLoading(false) }
  }

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }))
    if (key !== 'search') setPagination((current) => ({ ...current, page: 1 }))
  }

  return <section className="issue-management">
    <header className="issues-heading"><div><p className="eyebrow">CIVICFIX / OPERATIONS</p><h1>Issue management</h1><p className="subhead">Review, assign, and move real civic issues through the verified workflow.</p></div><span className="live-dot">LIVE API</span></header>
    <div className="issue-toolbar">
      <label className="search-field"><span aria-hidden="true">⌕</span><input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search this page of issues" aria-label="Search issues" /></label>
      <FilterSelect label="Category" value={filters.category} onChange={(value) => updateFilter('category', value)} options={issueCategories} />
      <FilterSelect label="Status" value={filters.status} onChange={(value) => updateFilter('status', value)} options={issueStatuses} />
      <FilterSelect label="Priority" value={filters.priorityLevel} onChange={(value) => updateFilter('priorityLevel', value)} options={levels} />
      <select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)} aria-label="Sort issues"><option value="priority">Priority first</option><option value="newest">Newest</option><option value="oldest">Oldest</option></select>
    </div>
    {error ? <section className="notice error-notice"><div><strong>Issues could not be loaded</strong><p>{error}</p></div><button type="button" onClick={() => void loadIssues(1)}>Try again</button></section> : null}
    {notice ? <p className="mutation-notice" role="status">{notice}</p> : null}
    {loading ? <div className="issue-table-skeleton" aria-label="Loading issues">{[1, 2, 3, 4, 5].map((item) => <i key={item} />)}</div> : <section className="issue-table" aria-label="Issue list">
      <div className="issue-table-head"><span>Issue</span><span>Priority</span><span>Status</span><span>Reported</span><span> </span></div>
      {filteredIssues.map((issue) => <button type="button" className={`issue-table-row ${selectedId === issue.id ? 'selected' : ''}`} key={issue.id} onClick={() => void loadDetail(issue.id)}><span><strong>{issue.title}</strong><small>{formatLabel(issue.category)} · {issue.reportCount} reports</small></span><span><b className={`table-priority priority-${issue.priorityLevel.toLowerCase()}`}>{issue.priorityLevel}</b><small>{issue.priorityScore}/100</small></span><span><b className={`status-pill status-${issue.status.toLowerCase()}`}>{formatLabel(issue.status)}</b></span><span><small>{formatDate(issue.createdAt)}</small></span><span className="row-chevron">›</span></button>)}
      {!filteredIssues.length ? <div className="empty-table"><strong>{filters.search ? 'No matching issues on this page' : 'No issues found'}</strong><p>Try changing the filters or loading another page.</p></div> : null}
    </section>}
    {pagination.totalPages > 1 ? <nav className="pagination" aria-label="Issue pagination"><button type="button" disabled={pagination.page <= 1} onClick={() => void loadIssues(pagination.page - 1)}>Previous</button><span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} total</span><button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => void loadIssues(pagination.page + 1)}>Next</button></nav> : null}
    {selectedId ? <aside className={`issue-drawer ${detail ? 'open' : ''}`} aria-label="Issue details">
      <button type="button" className="drawer-close" onClick={() => { setSelectedId(undefined); setDetail(undefined) }} aria-label="Close issue details">×</button>
      {detailLoading ? <div className="drawer-loading"><span /> <span /> <span /></div> : detail ? <div className="drawer-content">
        <div className="drawer-kicker"><span className={`table-priority priority-${detail.priorityLevel.toLowerCase()}`}>{detail.priorityLevel}</span><span className={`status-pill status-${detail.status.toLowerCase()}`}>{formatLabel(detail.status)}</span></div>
        <h2>{detail.title}</h2><p className="drawer-meta">{formatLabel(detail.category)} · Reported {formatDate(detail.createdAt)}</p>
        <section className="detail-section"><h3>Description</h3><p>{detail.description || 'No description provided.'}</p></section>
        <section className="detail-facts"><Fact label="Severity" value={detail.severity} /><Fact label="Safety impact" value={detail.safetyImpact ?? 'Not provided'} /><Fact label="Reports" value={String(detail.reportCount)} /><Fact label="Community support" value={String(detail.supportCount)} /></section>
        <section className="detail-section"><h3>Location</h3><p>{detail.address || detail.area || detail.city || 'Address not provided'}</p>{detail.location ? <small>{detail.location.latitude}, {detail.location.longitude}</small> : null}</section>
        <MediaGallery title="Reported evidence" assets={detail.media?.photos} />
        <section className="detail-section"><h3>Assignment</h3><div className="assignment-fields"><select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setAuthorityId('') }} aria-label="Department"><option value="">Select department</option>{departments.filter((item) => item.isActive !== false).map((item) => <option key={String(item.id ?? item._id)} value={String(item.id ?? item._id)}>{item.name}</option>)}</select><select value={authorityId} onChange={(event) => setAuthorityId(event.target.value)} aria-label="Authority"><option value="">Select authority</option>{availableAuthorities.filter((item) => item.isActive !== false).map((item) => <option key={String(item.id ?? item._id)} value={String(item.id ?? item._id)}>{item.name}</option>)}</select><input value={assignmentReason} onChange={(event) => setAssignmentReason(event.target.value)} placeholder="Assignment reason (optional)" /><button type="button" disabled={mutationLoading || !departmentId || !authorityId} onClick={() => void mutate(`/issues/${detail.id}/assignment`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ departmentId, assignedTo: authorityId, reason: assignmentReason || undefined }) }, 'Issue assignment updated.')}>Assign issue</button></div><small className="form-note">The server requires an active department, a matching authority, and a verified issue for first assignment.</small></section>
        <section className="detail-section"><h3>Update status</h3>{validNextStatuses.length ? <><select value={targetStatus} onChange={(event) => setTargetStatus(event.target.value)} aria-label="Next valid status"><option value="">Choose next status</option>{validNextStatuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}</select><input value={statusReason} onChange={(event) => setStatusReason(event.target.value)} placeholder="Reason (optional)" /><button type="button" disabled={mutationLoading || !targetStatus} onClick={() => void mutate(`/issues/${detail.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: targetStatus, reason: statusReason || undefined }) }, 'Issue status updated.')}>Update status</button></> : <p className="workflow-note">There are no direct status actions available from <strong>{formatLabel(detail.status)}</strong>. Resolution requires evidence and uses the resolution workflow.</p>}</section>
        {detail.status === 'IN_PROGRESS' ? <ResolutionForm description={resolutionDescription} setDescription={setResolutionDescription} photos={resolutionPhotos} setPhotos={setResolutionPhotos} disabled={mutationLoading} onSubmit={() => { const body = new FormData(); body.append('description', resolutionDescription); if (resolutionPhotos) Array.from(resolutionPhotos).forEach((file) => body.append('afterPhotos', file)); void mutate(`/issues/${detail.id}/resolution`, { method: 'POST', body }, 'Resolution submitted for citizen verification.') }} /> : null}
        <MediaGallery title="Resolution evidence" assets={detail.resolution?.afterMedia?.photos} />
        <section className="detail-section"><h3>Status history</h3>{history.length ? <ol className="history-list">{history.map((item) => <li key={item.id}><span className="history-dot" /><div><strong>{formatLabel(item.toStatus)}</strong><small>{formatDate(item.changedAt)} · {item.changedBy?.name ?? item.changedBy?.role ?? 'CivicFix workflow'}</small>{item.reason ? <p>{item.reason}</p> : null}</div></li>)}</ol> : <p className="workflow-note">No status history is available.</p>}</section>
        {detail.status === 'VERIFICATION_PENDING' ? <p className="verification-note">Resolution submitted. Citizen verification is pending; verification votes are not exposed by the current admin API.</p> : null}
      </div> : null}
    </aside> : null}
  </section>
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  const plural = label === 'Category' ? 'categories' : label === 'Priority' ? 'priorities' : `${label.toLowerCase()}es`
  return <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={`Filter by ${label}`}><option value="">All {plural}</option>{options.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}</select>
}

function Fact({ label, value }: { label: string; value: string }) { return <div><small>{label}</small><strong>{formatLabel(value)}</strong></div> }
function formatDate(value?: string) { return value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown date' }
function resolveMediaUrl(path: string) { return path.startsWith('http') ? path : `${apiUrl.replace(/\/api$/, '')}${path.startsWith('/') ? '' : '/'}${path}` }
function MediaGallery({ title, assets }: { title: string; assets?: MediaAsset[] }) { return <section className="detail-section"><h3>{title}</h3>{assets?.length ? <div className="media-gallery">{assets.map((asset) => <a href={resolveMediaUrl(asset.url)} target="_blank" rel="noreferrer" key={asset.url}><img src={resolveMediaUrl(asset.url)} alt={asset.originalName ?? title} /></a>)}</div> : <p className="workflow-note">No images available.</p>}</section> }
function ResolutionForm({ description, setDescription, photos, setPhotos, disabled, onSubmit }: { description: string; setDescription: (value: string) => void; photos?: FileList; setPhotos: (files: FileList | undefined) => void; disabled: boolean; onSubmit: () => void }) { return <section className="detail-section resolution-form"><h3>Submit resolution</h3><p>At least one after-resolution photo is required by the server. The issue will move to citizen verification.</p><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the completed work" /><input type="file" accept="image/*" multiple onChange={(event) => setPhotos(event.target.files ?? undefined)} aria-label="After-resolution photos" /><button type="button" disabled={disabled || description.trim().length < 10 || !photos?.length} onClick={onSubmit}>Submit resolution evidence</button></section> }

export default App
