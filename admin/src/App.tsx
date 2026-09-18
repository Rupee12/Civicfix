import { useCallback, useEffect, useMemo, useState } from 'react'
import { IssueMap } from './components/IssueMap'
import './App.css'

type MediaItem = {
  url: string
}

type Issue = {
  id: string
  title: string
  description: string
  category: string
  status: string
  priorityLevel: string
  priorityScore: number
  reportCount: number
  supportCount: number
  area?: string
  address?: string
  city?: string
  media?: {
    photos?: MediaItem[]
    videos?: MediaItem[]
  }
  location?: {
    latitude?: number
    longitude?: number
    coordinates?: [number, number]
  }
  department?: {
    name?: string
  } | string
  assignedTo?: {
    name?: string
  } | string
  affectedPeopleEstimate?: number
  safetyImpact?: number
  priorityBreakdown?: Record<string, number>
}

type Summary = {
  totalIssues: number
  metrics: Record<string, number>
  issues: Issue[]
}

type Resolution = {
  description?: string
  completedAt?: string
  resolvedBy?: string | { name?: string }
  beforeMedia?: MediaItem[]
  afterMedia?: MediaItem[]
}

type Verification = {
  resolved: number
  notResolved: number
  thresholds?: {
    close?: number
    reopen?: number
    resolved?: number
    notResolved?: number
  }
  yourVerification?: string | null
  status?: string
  eligible?: boolean
}

type StatusHistoryEntry = {
  status?: string
  fromStatus?: string
  toStatus?: string
  timestamp?: string
  createdAt?: string
  reason?: string
}

type IssueDetails = {
  resolution?: Resolution | null
  verification?: Verification | null
  history?: StatusHistoryEntry[]
}

const apiUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const token = import.meta.env.VITE_ADMIN_TOKEN ?? ''

const resolveMediaUrl = (path: string) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const backendOrigin = apiUrl.replace(/\/api$/, '')
  return `${backendOrigin}${path.startsWith('/') ? path : `/${path}`}`
}

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`)
  }

  const body = await response.json()
  return body.data as T
}

function formatDate(value?: string) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function getPriorityClass(level?: string) {
  switch (level) {
    case 'CRITICAL':
      return 'priority-critical'
    case 'HIGH':
      return 'priority-high'
    case 'MEDIUM':
      return 'priority-medium'
    default:
      return 'priority-low'
  }
}

function getStatusClass(status?: string) {
  return `status-${status?.toLowerCase().replace(/_/g, '-') ?? 'unknown'}`
}

function getDepartmentName(issue: Issue) {
  if (!issue.department) return 'Unassigned'
  if (typeof issue.department === 'string') return issue.department
  return issue.department.name ?? 'Unassigned'
}

function getAuthorityName(issue: Issue) {
  if (!issue.assignedTo) return 'Unassigned'
  if (typeof issue.assignedTo === 'string') return issue.assignedTo
  return issue.assignedTo.name ?? 'Unassigned'
}

function getIssueCoordinates(issue: Issue): [number, number] | null {
  if (issue.location?.coordinates?.length === 2) {
    const [longitude, latitude] = issue.location.coordinates

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      return [latitude, longitude]
    }
  }

  if (
    Number.isFinite(issue.location?.latitude) &&
    Number.isFinite(issue.location?.longitude)
  ) {
    return [
      issue.location!.latitude as number,
      issue.location!.longitude as number,
    ]
  }

  return null
}

function App() {
  const [summary, setSummary] = useState<Summary>()
  const [activeView, setActiveView] = useState('Dashboard')
  const [selectedIssue, setSelectedIssue] = useState<Issue>()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [error, setError] = useState('')

  const [details, setDetails] = useState<Record<string, IssueDetails>>({})
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>(
    {},
  )
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      setError('')

      const data = await apiFetch<Summary>('/admin/priority')
      setSummary(data)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to load CivicFix data.',
      )
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const categories = useMemo(() => {
    const values = new Set(
      summary?.issues.map((issue) => issue.category).filter(Boolean),
    )

    return Array.from(values).sort()
  }, [summary])

  const filteredIssues = useMemo(() => {
    const search = query.trim().toLowerCase()

    return (
      summary?.issues.filter((issue) => {
        const searchable = [
          issue.title,
          issue.description,
          issue.category,
          issue.area ?? '',
          issue.address ?? '',
        ]
          .join(' ')
          .toLowerCase()

        const matchesSearch =
          search.length === 0 || searchable.includes(search)

        const matchesStatus =
          statusFilter === 'ALL' || issue.status === statusFilter

        const matchesPriority =
          priorityFilter === 'ALL' ||
          issue.priorityLevel === priorityFilter

        const matchesCategory =
          categoryFilter === 'ALL' || issue.category === categoryFilter

        return (
          matchesSearch &&
          matchesStatus &&
          matchesPriority &&
          matchesCategory
        )
      }) ?? []
    )
  }, [summary, query, statusFilter, priorityFilter, categoryFilter])

  const metrics = summary?.metrics ?? {}

  const activeIssues =
    metrics.active ??
    metrics.activeIssues ??
    summary?.issues.filter(
      (issue) => !['CLOSED', 'REJECTED'].includes(issue.status),
    ).length ??
    0

  const criticalIssues =
    metrics.critical ??
    summary?.issues.filter((issue) => issue.priorityLevel === 'CRITICAL')
      .length ??
    0

  const highIssues =
    metrics.high ??
    summary?.issues.filter((issue) => issue.priorityLevel === 'HIGH').length ??
    0

  const verificationPending =
    metrics.verificationPending ??
    summary?.issues.filter((issue) => issue.status === 'VERIFICATION_PENDING')
      .length ??
    0

  const unassigned =
    metrics.unassigned ??
    summary?.issues.filter(
      (issue) =>
        !issue.assignedTo &&
        !['CLOSED', 'REJECTED'].includes(issue.status),
    ).length ??
    0

  const loadIssueDetails = useCallback(async (issueId: string, force = false) => {
    if (!force && details[issueId]) {
      return
    }

    setLoadingDetails((current) => ({
      ...current,
      [issueId]: true,
    }))

    setDetailErrors((current) => {
      const next = { ...current }
      delete next[issueId]
      return next
    })

    const [resolutionResult, verificationResult, historyResult] =
      await Promise.allSettled([
        apiFetch<Resolution | null>(`/issues/${issueId}/resolution`),
        apiFetch<Verification>(`/issues/${issueId}/verification`),
        apiFetch<StatusHistoryEntry[]>(
          `/issues/${issueId}/status-history`,
        ),
      ])

    const issueDetails: IssueDetails = {}

    const failedSections: string[] = []

    if (resolutionResult.status === 'fulfilled') {
      issueDetails.resolution = resolutionResult.value
    } else {
      failedSections.push('resolution')
    }

    if (verificationResult.status === 'fulfilled') {
      issueDetails.verification = verificationResult.value
    } else {
      failedSections.push('verification')
    }

    if (historyResult.status === 'fulfilled') {
      issueDetails.history = historyResult.value
    } else {
      failedSections.push('timeline')
    }

    setDetails((current) => ({
      ...current,
      [issueId]: issueDetails,
    }))

    if (failedSections.length > 0) {
      setDetailErrors((current) => ({
        ...current,
        [issueId]: `Unable to load: ${failedSections.join(', ')}`,
      }))
    }

    setLoadingDetails((current) => ({
      ...current,
      [issueId]: false,
    }))
  }, [details])

  function handleIssueSelect(issue: { id: string }) {
    const fullIssue = summary?.issues.find(item => item.id === issue.id)

    if (!fullIssue) {
        return
    }

    setSelectedIssue(fullIssue)
    void loadIssueDetails(fullIssue.id)
    }

  function clearFilters() {
    setQuery('')
    setStatusFilter('ALL')
    setPriorityFilter('ALL')
    setCategoryFilter('ALL')
  }

  async function refreshSelectedIssue() {
    if (!selectedIssue) return

    await loadIssueDetails(selectedIssue.id, true)
  }

  const selectedDetails = selectedIssue
    ? details[selectedIssue.id]
    : undefined

  const selectedLoading = selectedIssue
    ? loadingDetails[selectedIssue.id]
    : false

  const selectedDetailError = selectedIssue
    ? detailErrors[selectedIssue.id]
    : undefined

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          Civic<span>Fix</span>
        </div>

        {['Dashboard', 'Issues', 'Map', 'Verification'].map((view) => (
          <button
            key={view}
            className={`nav ${activeView === view ? 'active' : ''}`}
            onClick={() => setActiveView(view)}
          >
            {view}
          </button>
        ))}
      </aside>

      <main>
        <header>
          <div>
            <h1>{activeView}</h1>
            <p>Civic issue operations console</p>
          </div>

          <button onClick={() => void load()}>Refresh</button>
        </header>

        {activeView !== 'Map' && (
          <div className="toolbar">
            <input
              className="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search issues..."
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="VERIFIED">Verified</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="VERIFICATION_PENDING">
                Verification Pending
              </option>
              <option value="REOPENED">Reopened</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
            >
              <option value="ALL">All priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="ALL">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <button onClick={clearFilters}>Clear</button>
          </div>
        )}

        {error && (
          <div className="notice">
            <strong>Unable to load data.</strong>
            <button onClick={() => void load()}>Retry</button>
            <span>{error}</span>
          </div>
        )}

        {!error && !summary && (
          <div className="empty">
            <strong>Loading CivicFix...</strong>
          </div>
        )}

        {summary && activeView === 'Dashboard' && (
          <>
            <section className="metrics">
              <article>
                <span>Active Issues</span>
                <strong>{activeIssues}</strong>
              </article>

              <article>
                <span>Critical</span>
                <strong>{criticalIssues}</strong>
              </article>

              <article>
                <span>High Priority</span>
                <strong>{highIssues}</strong>
              </article>

              <article>
                <span>Verification Pending</span>
                <strong>{verificationPending}</strong>
              </article>

              <article>
                <span>Unassigned</span>
                <strong>{unassigned}</strong>
              </article>
            </section>

            <section className="queue">
              <div className="section-heading">
                <div>
                  <h2>Priority Issue Queue</h2>
                  <span>{filteredIssues.length} issues</span>
                </div>
              </div>

              {filteredIssues.length === 0 ? (
                <div className="empty">No issues match the current filters.</div>
              ) : (
                filteredIssues.map((issue) => (
                  <button
                    className="issue-row"
                    key={issue.id}
                    onClick={() => handleIssueSelect(issue)}
                  >
                    <div className="issue-thumb">
                      {issue.media?.photos?.[0]?.url ? (
                        <img
                          src={resolveMediaUrl(issue.media.photos[0].url)}
                          alt=""
                        />
                      ) : (
                        <span>No media</span>
                      )}
                    </div>

                    <div className="issue-main">
                      <b>{issue.title}</b>
                      <span>
                        {issue.category} · {issue.area ?? issue.address ?? 'Location unavailable'}
                      </span>
                      <small>
                        {issue.reportCount} reports · {issue.supportCount} supporters
                      </small>
                    </div>

                    <div className="issue-meta">
                      <span
                        className={`priority-badge ${getPriorityClass(
                          issue.priorityLevel,
                        )}`}
                      >
                        {issue.priorityLevel}
                      </span>

                      <strong>{issue.priorityScore}</strong>

                      <span className={`status-badge ${getStatusClass(issue.status)}`}>
                        {issue.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </section>
          </>
        )}

        {summary && activeView === 'Issues' && (
          <section className="queue">
            {filteredIssues.length === 0 ? (
              <div className="empty">No issues found.</div>
            ) : (
              filteredIssues.map((issue) => (
                <button
                  className="issue-row"
                  key={issue.id}
                  onClick={() => handleIssueSelect(issue)}
                >
                  <div className="issue-thumb">
                    {issue.media?.photos?.[0]?.url ? (
                      <img
                        src={resolveMediaUrl(issue.media.photos[0].url)}
                        alt=""
                      />
                    ) : (
                      <span>No media</span>
                    )}
                  </div>

                  <div className="issue-main">
                    <b>{issue.title}</b>
                    <span>{issue.category}</span>
                    <small>
                      {issue.area ?? issue.address ?? 'Location unavailable'}
                    </small>
                  </div>

                  <div className="issue-meta">
                    <span
                      className={`priority-badge ${getPriorityClass(
                        issue.priorityLevel,
                      )}`}
                    >
                      {issue.priorityLevel} · {issue.priorityScore}
                    </span>

                    <span className={`status-badge ${getStatusClass(issue.status)}`}>
                      {issue.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </button>
              ))
            )}
          </section>
        )}

        {summary && activeView === 'Map' && (
          <IssueMap
            issues={filteredIssues}
            onViewDetails={handleIssueSelect}
            resolveMediaUrl={resolveMediaUrl}
          />
        )}

        {summary && activeView === 'Verification' && (
          <section className="queue">
            {summary.issues
              .filter((issue) => issue.status === 'VERIFICATION_PENDING')
              .map((issue) => (
                <button
                  className="issue-row"
                  key={issue.id}
                  onClick={() => handleIssueSelect(issue)}
                >
                  <div className="issue-thumb">
                    {issue.media?.photos?.[0]?.url ? (
                      <img
                        src={resolveMediaUrl(issue.media.photos[0].url)}
                        alt=""
                      />
                    ) : (
                      <span>No media</span>
                    )}
                  </div>

                  <div className="issue-main">
                    <b>{issue.title}</b>
                    <span>{issue.category}</span>
                    <small>Awaiting citizen verification</small>
                  </div>

                  <div className="issue-meta">
                    <span
                      className={`priority-badge ${getPriorityClass(
                        issue.priorityLevel,
                      )}`}
                    >
                      {issue.priorityLevel}
                    </span>

                    <span className="status-badge status-verification-pending">
                      Verification Pending
                    </span>
                  </div>
                </button>
              ))}

            {summary.issues.filter(
              (issue) => issue.status === 'VERIFICATION_PENDING',
            ).length === 0 && (
              <div className="empty">
                No issues are currently awaiting citizen verification.
              </div>
            )}
          </section>
        )}
      </main>

      {selectedIssue && (
        <aside className="drawer">
          <div className="drawer-header">
            <div>
              <span className="drawer-label">Issue Details</span>
              <h2>{selectedIssue.title}</h2>
            </div>

            <div className="drawer-actions">
              <button
                onClick={() => void refreshSelectedIssue()}
                disabled={selectedLoading}
              >
                {selectedLoading ? 'Loading...' : 'Refresh'}
              </button>

              <button onClick={() => setSelectedIssue(undefined)}>
                Close
              </button>
            </div>
          </div>

          <section className="drawer-section">
            <div className="drawer-status-row">
              <span
                className={`priority-badge ${getPriorityClass(
                  selectedIssue.priorityLevel,
                )}`}
              >
                {selectedIssue.priorityLevel} · {selectedIssue.priorityScore}
              </span>

              <span
                className={`status-badge ${getStatusClass(
                  selectedIssue.status,
                )}`}
              >
                {selectedIssue.status.replace(/_/g, ' ')}
              </span>
            </div>

            <p>{selectedIssue.description}</p>
          </section>

          <section className="drawer-section">
            <h3>Evidence</h3>

            {selectedIssue.media?.photos?.length ? (
              <div className="evidence-grid">
                {selectedIssue.media.photos.map((photo, index) => (
                  <a
                    key={`${photo.url}-${index}`}
                    href={resolveMediaUrl(photo.url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={resolveMediaUrl(photo.url)}
                      alt={`Issue evidence ${index + 1}`}
                    />
                  </a>
                ))}
              </div>
            ) : (
              <div className="empty">No citizen media available.</div>
            )}
          </section>

          <section className="drawer-section">
            <h3>Priority</h3>

            <div className="detail-grid">
              <div>
                <span>Score</span>
                <strong>{selectedIssue.priorityScore}/100</strong>
              </div>

              <div>
                <span>Level</span>
                <strong>{selectedIssue.priorityLevel}</strong>
              </div>

              <div>
                <span>Reports</span>
                <strong>{selectedIssue.reportCount}</strong>
              </div>

              <div>
                <span>Supporters</span>
                <strong>{selectedIssue.supportCount}</strong>
              </div>
            </div>

            {selectedIssue.priorityBreakdown && (
              <div className="breakdown">
                {Object.entries(selectedIssue.priorityBreakdown).map(
                  ([key, value]) => (
                    <div key={key}>
                      <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                      <strong>{value}</strong>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          <section className="drawer-section">
            <h3>Assignment</h3>

            <div className="detail-grid">
              <div>
                <span>Department</span>
                <strong>{getDepartmentName(selectedIssue)}</strong>
              </div>

              <div>
                <span>Authority</span>
                <strong>{getAuthorityName(selectedIssue)}</strong>
              </div>
            </div>
          </section>

          {selectedLoading && (
            <section className="drawer-section">
              <div className="loading">Loading resolution, verification and timeline...</div>
            </section>
          )}

          {selectedDetailError && (
            <section className="drawer-section">
              <div className="notice">
                <span>{selectedDetailError}</span>
                <button onClick={() => void refreshSelectedIssue()}>
                  Retry
                </button>
              </div>
            </section>
          )}

          {selectedDetails?.resolution !== undefined && (
            <section className="drawer-section">
              <h3>Resolution</h3>

              {selectedDetails.resolution ? (
                <>
                  <div className="detail-grid">
                    <div>
                      <span>Resolved By</span>
                      <strong>
                        {typeof selectedDetails.resolution.resolvedBy === 'string'
                          ? selectedDetails.resolution.resolvedBy
                          : selectedDetails.resolution.resolvedBy?.name ?? '—'}
                      </strong>
                    </div>

                    <div>
                      <span>Completed</span>
                      <strong>
                        {formatDate(
                          selectedDetails.resolution.completedAt,
                        )}
                      </strong>
                    </div>
                  </div>

                  {selectedDetails.resolution.description && (
                    <p>{selectedDetails.resolution.description}</p>
                  )}

                  <div className="before-after">
                    <div>
                      <h4>Before</h4>

                      {selectedDetails.resolution.beforeMedia?.length ? (
                        <div className="evidence-grid">
                          {selectedDetails.resolution.beforeMedia.map(
                            (media, index) => (
                              <a
                                key={`${media.url}-${index}`}
                                href={resolveMediaUrl(media.url)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={resolveMediaUrl(media.url)}
                                  alt={`Before resolution ${index + 1}`}
                                />
                              </a>
                            ),
                          )}
                        </div>
                      ) : (
                        <div className="empty">No before media.</div>
                      )}
                    </div>

                    <div>
                      <h4>After</h4>

                      {selectedDetails.resolution.afterMedia?.length ? (
                        <div className="evidence-grid">
                          {selectedDetails.resolution.afterMedia.map(
                            (media, index) => (
                              <a
                                key={`${media.url}-${index}`}
                                href={resolveMediaUrl(media.url)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={resolveMediaUrl(media.url)}
                                  alt={`After resolution ${index + 1}`}
                                />
                              </a>
                            ),
                          )}
                        </div>
                      ) : (
                        <div className="empty">No after media.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty">No resolution recorded.</div>
              )}
            </section>
          )}

          {selectedDetails?.verification !== undefined && (
            <section className="drawer-section">
              <h3>Citizen Verification</h3>

              {selectedDetails.verification ? (
                <>
                  <div className="detail-grid">
                    <div>
                      <span>Resolved</span>
                      <strong>
                        {selectedDetails.verification.resolved}
                      </strong>
                    </div>

                    <div>
                      <span>Not Resolved</span>
                      <strong>
                        {selectedDetails.verification.notResolved}
                      </strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong>
                        {selectedDetails.verification.status ?? '—'}
                      </strong>
                    </div>

                    <div>
                      <span>Eligible</span>
                      <strong>
                        {selectedDetails.verification.eligible
                          ? 'Yes'
                          : 'No'}
                      </strong>
                    </div>
                  </div>

                  {selectedDetails.verification.thresholds && (
                    <div className="breakdown">
                      <div>
                        <span>Close threshold</span>
                        <strong>
                          {selectedDetails.verification.thresholds.close ??
                            selectedDetails.verification.thresholds.resolved ??
                            '—'}
                        </strong>
                      </div>

                      <div>
                        <span>Reopen threshold</span>
                        <strong>
                          {selectedDetails.verification.thresholds.reopen ??
                            selectedDetails.verification.thresholds.notResolved ??
                            '—'}
                        </strong>
                      </div>
                    </div>
                  )}

                  {selectedDetails.verification.yourVerification && (
                    <p>
                      Your verification:{' '}
                      <strong>
                        {selectedDetails.verification.yourVerification}
                      </strong>
                    </p>
                  )}

                  {selectedDetails.verification.resolved === 0 &&
                    selectedDetails.verification.notResolved === 0 ? (
                    <div className="empty">
                      No citizen verification votes yet.
                    </div>
                  ) : (
                    <div className="verification-bar">
                      <div
                        style={{
                          width: `${
                            (selectedDetails.verification.resolved /
                              (selectedDetails.verification.resolved +
                                selectedDetails.verification.notResolved)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="empty">
                  No verification information available.
                </div>
              )}
            </section>
          )}

          {selectedDetails?.history !== undefined && (
            <section className="drawer-section">
              <h3>Issue Timeline</h3>

              {selectedDetails.history.length ? (
                <div className="timeline">
                  {selectedDetails.history.map((entry, index) => {
                    const status =
                      entry.toStatus ?? entry.status ?? entry.fromStatus ?? 'UNKNOWN'

                    return (
                      <div className="timeline-item" key={`${status}-${index}`}>
                        <div className="timeline-node" />

                        <div>
                          <strong>{status.replace(/_/g, ' ')}</strong>

                          <span>
                            {formatDate(
                              entry.timestamp ?? entry.createdAt,
                            )}
                          </span>

                          {entry.reason && <p>{entry.reason}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="empty">No status history available.</div>
              )}
            </section>
          )}

          <section className="drawer-section">
            <h3>Location</h3>

            <div className="detail-grid">
              <div>
                <span>Area</span>
                <strong>
                  {selectedIssue.area ?? selectedIssue.address ?? '—'}
                </strong>
              </div>

              <div>
                <span>City</span>
                <strong>{selectedIssue.city ?? '—'}</strong>
              </div>

              <div>
                <span>Coordinates</span>
                <strong>
                  {(() => {
                    const coordinates = getIssueCoordinates(selectedIssue)

                    return coordinates
                      ? `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`
                      : 'Unavailable'
                  })()}
                </strong>
              </div>
            </div>
          </section>
        </aside>
      )}
    </div>
  )
}

export default App