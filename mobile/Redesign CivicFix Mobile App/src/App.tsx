import { useState } from 'react';

type Screen = 'login' | 'signup' | 'forgot' | 'verify' | 'home' | 'explore' | 'report' | 'complaints' | 'alerts' | 'profile' | 'detail';
type IconName =
  | 'home' | 'map' | 'plus' | 'file' | 'bell' | 'user' | 'pin' | 'arrow' | 'search'
  | 'filter' | 'road' | 'lamp' | 'water' | 'trash' | 'camera' | 'chevron' | 'check'
  | 'clock' | 'shield' | 'settings' | 'logout' | 'edit' | 'location' | 'image' | 'close';

const iconPaths: Record<IconName, JSX.Element> = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/></>,
  map: <><path d="m3 6 5-2 8 3 5-2v13l-5 2-8-3-5 2Z"/><path d="M8 4v13m8-10v13"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  file: <><path d="M6 3h9l3 3v15H6Z"/><path d="M9 11h6M9 15h6"/></>,
  bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8"/><path d="M10 21h4"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-5 3.5-7 8-7s7.2 2 8 7"/></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
  filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
  road: <><path d="M9 3 7 21M15 3l2 18M12 4v3m0 4v3m0 4v2"/></>,
  lamp: <><path d="M9 21h6M10 17h4l1-7H9l1 7Z"/><path d="M12 10V3M8 6l-2-2m10 2 2-2"/></>,
  water: <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z"/>,
  trash: <><path d="M5 7h14M9 7V4h6v3m2 0-1 14H8L7 7"/></>,
  camera: <><path d="M4 7h4l2-3h4l2 3h4v13H4Z"/><circle cx="12" cy="13" r="4"/></>,
  chevron: <path d="m9 6 6 6-6 6"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></>,
  shield: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6Z"/><path d="m9 12 2 2 4-5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/></>,
  logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4m4-4H9"/></>,
  edit: <><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10Z"/><path d="m13.5 7 3.5 3.5"/></>,
  location: <><circle cx="12" cy="12" r="3"/><path d="M12 3v2m0 14v2M3 12h2m14 0h2"/></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-5 3 3 3-3 5 5"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
};

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{iconPaths[name]}</svg>;
}

const issues = [
  { title: 'Large pothole near City Library', category: 'Roads', place: 'MG Road · 0.3 km', status: 'In progress', priority: 'High', icon: 'road' as IconName, color: 'amber' },
  { title: 'Streetlight not working', category: 'Streetlight', place: 'Lake View Ave · 0.8 km', status: 'Assigned', priority: 'Medium', icon: 'lamp' as IconName, color: 'blue' },
  { title: 'Overflowing waste bin', category: 'Sanitation', place: 'Central Market · 1.2 km', status: 'Resolved', priority: 'Low', icon: 'trash' as IconName, color: 'teal' },
];

function StatusBadge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function IssueCard({ issue = issues[0], onClick }: { issue?: typeof issues[0]; onClick: () => void }) {
  return <button className="issue-card" onClick={onClick}>
    <span className={`issue-icon ${issue.color}`}><Icon name={issue.icon}/></span>
    <span className="issue-copy">
      <span className="card-kicker">{issue.category}</span>
      <strong>{issue.title}</strong>
      <span className="meta"><Icon name="pin" size={14}/>{issue.place}</span>
      <span className="card-badges"><StatusBadge tone={issue.color}>{issue.status}</StatusBadge><span className="priority">{issue.priority} priority</span></span>
    </span>
    <Icon name="chevron" size={18}/>
  </button>
}

function Header({ title, back, action }: { title: string; back?: () => void; action?: React.ReactNode }) {
  return <header className="app-header">
    {back ? <button className="icon-btn" onClick={back} aria-label="Go back"><Icon name="arrow"/></button> : <span className="brand-mark">CF</span>}
    <strong>{title}</strong>
    <span className="header-action">{action}</span>
  </header>;
}

function Auth({ mode, go }: { mode: 'login' | 'signup' | 'forgot' | 'verify'; go: (screen: Screen) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = (next: Screen) => {
    setLoading(true); setError('');
    window.setTimeout(() => { setLoading(false); go(next); }, 550);
  };
  if (mode === 'verify') return <div className="screen auth-screen">
    <button className="auth-back" onClick={() => go('signup')}><Icon name="arrow"/></button>
    <div className="auth-symbol"><Icon name="shield" size={30}/></div>
    <p className="eyebrow">SECURE VERIFICATION</p><h1>Check your messages</h1>
    <p className="auth-copy">Enter the 4-digit code sent to <strong>+91 •••••• 4821</strong>.</p>
    <div className="otp-row">{['6','2','',''].map((n,i) => <input key={i} aria-label={`Digit ${i+1}`} maxLength={1} defaultValue={n}/>)}</div>
    <button className="primary" onClick={() => submit('home')}>{loading ? <span className="spinner"/> : 'Verify & continue'}</button>
    <p className="auth-switch">Didn’t receive it? <button>Resend in 00:28</button></p>
  </div>;
  if (mode === 'forgot') return <div className="screen auth-screen">
    <button className="auth-back" onClick={() => go('login')}><Icon name="arrow"/></button>
    <div className="auth-symbol"><Icon name="bell" size={30}/></div>
    <p className="eyebrow">ACCOUNT RECOVERY</p><h1>Reset your password</h1>
    <p className="auth-copy">Enter your email or phone number and we’ll send secure reset instructions.</p>
    <div className="auth-form"><label>Email or phone<input placeholder="maya.k@example.com"/></label>
      <button className="primary" onClick={() => submit('login')}>{loading ? <span className="spinner"/> : 'Send reset instructions'}</button>
    </div>
    <p className="auth-switch"><button onClick={() => go('login')}>Back to login</button></p>
  </div>;
  const signup = mode === 'signup';
  return <div className="screen auth-screen">
    <div className="auth-brand"><span className="brand-mark">CF</span><strong>CivicFix</strong></div>
    <div className="auth-visual"><span className="city-line"/><div className="auth-pin"><Icon name="pin" size={25}/></div><p>Small reports.<br/><strong>Big civic impact.</strong></p></div>
    <p className="eyebrow">{signup ? 'JOIN YOUR COMMUNITY' : 'WELCOME BACK'}</p>
    <h1>{signup ? 'Create your account' : 'Good to see you again.'}</h1>
    <p className="auth-copy">{signup ? 'Start reporting issues and help build a better neighbourhood.' : 'Sign in to track reports and improve your city.'}</p>
    <div className="auth-form">
      {signup && <label>Full name<input defaultValue="Maya Krishnan"/></label>}
      <label>{signup ? 'Email address' : 'Email or phone'}<input defaultValue={signup ? 'maya.k@example.com' : ''} placeholder="Enter your details"/></label>
      {signup && <label>Phone number<input defaultValue="+91 98765 44821"/></label>}
      <label>Password<div className="password-wrap"><input type={showPassword ? 'text' : 'password'} defaultValue={signup ? 'Civicfix@24' : ''} placeholder="Enter your password"/><button onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
      {signup && <label>Confirm password<div className="password-wrap"><input type={showPassword ? 'text' : 'password'} defaultValue="Civicfix@24"/><button onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>}
      {!signup && <button className="forgot-link" onClick={() => go('forgot')}>Forgot password?</button>}
      {signup && <label className="consent"><input type="checkbox" defaultChecked/><span>I agree to the <b>Terms of Service</b> and <b>Privacy Policy</b>.</span></label>}
      {error && <div className="inline-error"><Icon name="close" size={16}/>{error}</div>}
      <button className="primary" onClick={() => submit(signup ? 'verify' : 'home')}>{loading ? <span className="spinner"/> : signup ? 'Create account' : 'Login'}{!loading && <Icon name="arrow"/>}</button>
    </div>
    <p className="auth-switch">{signup ? 'Already have an account?' : 'New to CivicFix?'} <button onClick={() => go(signup ? 'login' : 'signup')}>{signup ? 'Log in' : 'Create account'}</button></p>
  </div>;
}

function Home({ go }: { go: (screen: Screen) => void }) {
  return <div className="screen">
    <div className="home-head">
      <div><p className="eyebrow">GOOD MORNING</p><h1>Hi, Maya</h1><p className="location"><Icon name="pin" size={15}/> Indiranagar, Bengaluru</p></div>
      <div className="home-actions"><button className="header-bell" onClick={() => go('alerts')}><Icon name="bell"/><i/></button><button className="avatar" onClick={() => go('profile')}>MK<span className="online-dot"/></button></div>
    </div>
    <button className="hero-action" onClick={() => go('report')}>
      <span className="hero-pattern"/>
      <span className="hero-plus"><Icon name="plus" size={26}/></span>
      <span><span className="hero-label">MAKE YOUR CITY BETTER</span><strong>Report an Issue</strong><small>It only takes a minute</small></span>
      <Icon name="arrow"/>
    </button>
    <section>
      <div className="section-head"><h2>Your impact</h2><button onClick={() => go('complaints')}>View all</button></div>
      <div className="stats">
        <div className="stat"><span className="stat-icon blue"><Icon name="file"/></span><strong>08</strong><small>Active</small></div>
        <div className="stat"><span className="stat-icon amber"><Icon name="clock"/></span><strong>03</strong><small>In progress</small></div>
        <div className="stat"><span className="stat-icon teal"><Icon name="check"/></span><strong>24</strong><small>Resolved</small></div>
      </div>
    </section>
    <section>
      <div className="section-head"><h2>Nearby issues</h2><button onClick={() => go('explore')}>Explore map</button></div>
      <IssueCard onClick={() => go('detail')}/>
    </section>
    <section>
      <div className="section-head"><h2>Recent activity</h2></div>
      <div className="activity">
        <span className="timeline-dot done"><Icon name="check" size={14}/></span>
        <div><strong>Complaint resolved</strong><p>Water leak on 12th Main has been fixed.</p><small>Today, 9:42 AM</small></div>
      </div>
      <div className="activity">
        <span className="timeline-dot"><Icon name="shield" size={14}/></span>
        <div><strong>Assigned to BBMP</strong><p>Your streetlight report is under review.</p><small>Yesterday, 4:10 PM</small></div>
      </div>
    </section>
  </div>;
}

function Explore({ go }: { go: (screen: Screen) => void }) {
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState(0);
  return <div className="screen map-screen">
    <Header title="Explore"/>
    <div className="map-canvas" style={{ '--zoom': zoom } as React.CSSProperties}>
      <div className="map-grid"/>
      <div className="map-road r1"/><div className="map-road r2"/><div className="map-road r3"/>
      <div className="map-search"><Icon name="search" size={19}/><input placeholder="Search area or issue"/><button><Icon name="filter" size={18}/></button></div>
      <div className="chips"><button className="active">All issues</button><button>Roads</button><button>Waste</button><button>Water</button></div>
      {[['road', 'm1'], ['lamp', 'm2'], ['trash', 'm3'], ['water', 'm4']].map(([icon, cls], i) =>
        <button key={cls} className={`marker ${cls} ${selected === i ? 'selected' : ''}`} onClick={() => setSelected(i)}><Icon name={icon as IconName} size={18}/></button>
      )}
      <div className="zoom-controls"><button onClick={() => setZoom(Math.min(1.25, zoom + .05))}>+</button><button onClick={() => setZoom(Math.max(.85, zoom - .05))}>−</button></div>
      <button className="locate"><Icon name="location"/></button>
      <div className="map-sheet">
        <span className="grabber"/>
        <div className="sheet-title"><div><strong>12 issues nearby</strong><p>Within 2 km of you</p></div><button>View list</button></div>
        <IssueCard issue={issues[selected % issues.length]} onClick={() => go('detail')}/>
      </div>
    </div>
  </div>;
}

function Report({ go }: { go: (screen: Screen) => void }) {
  const [category, setCategory] = useState('Roads');
  const [priority, setPriority] = useState('Medium');
  const [submitted, setSubmitted] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [step, setStep] = useState(1);
  if (submitted) return <div className="screen result-screen"><div className="success-orbit"><span><Icon name="check" size={34}/></span></div><p className="eyebrow">REPORT SUBMITTED</p><h1>Thanks for speaking up.</h1><p>Your report <strong>#CF-2841</strong> has been sent to the local authority. We’ll keep you updated.</p><div className="result-card"><span><Icon name="clock"/></span><div><small>ESTIMATED RESPONSE</small><strong>Within 48 hours</strong></div></div><button className="primary" onClick={() => go('complaints')}>Track my report <Icon name="arrow"/></button><button className="text-button" onClick={() => go('home')}>Back to home</button></div>;
  if (step === 1) return <div className="screen">
    <Header title="Select category" back={() => go('home')}/>
    <div className="progress"><span className="active"/><span/><span/><small>1 of 3 · Select an issue type</small></div>
    <p className="eyebrow">WHAT NEEDS ATTENTION?</p><h1 className="report-title">Choose the closest category</h1>
    <p className="report-intro">This helps CivicFix route your report to the right department.</p>
    <div className="category-list">
      {([['Roads','road','Potholes, broken roads or unsafe sidewalks'],['Streetlight','lamp','Broken, flickering or unsafe lighting'],['Garbage','trash','Overflow, missed pickup or illegal dumping'],['Water','water','Leaks, low supply or damaged pipes'],['Sewage','water','Blocked drains or sewage overflow'],['Public property','shield','Damaged signs, benches or public assets'],['Stray animals','user','Animals requiring civic assistance'],['Other','file','Any other neighbourhood issue']] as [string,IconName,string][]).map(([label,icon,copy]) =>
        <button key={label} className={category === label ? 'selected' : ''} onClick={() => setCategory(label)}><span><Icon name={icon}/></span><div><strong>{label}</strong><small>{copy}</small></div>{category === label ? <i><Icon name="check" size={13}/></i> : <Icon name="chevron" size={17}/>}</button>
      )}
    </div>
    <button className="primary sticky-submit" onClick={() => setStep(2)}>Continue with {category} <Icon name="arrow"/></button>
  </div>;
  if (step === 3) return <div className="screen">
    <Header title="Review report" back={() => setStep(2)}/>
    <div className="progress"><span className="active"/><span className="active"/><span className="active"/><small>3 of 3 · Review & submit</small></div>
    <p className="eyebrow">FINAL CHECK</p><h1 className="report-title">Ready to make an impact?</h1>
    <p className="report-intro">Review your report before sending it to the civic authority.</p>
    <div className="review-card"><div className="review-head"><span className="issue-icon blue"><Icon name="road"/></span><div><small>CATEGORY</small><strong>{category}</strong></div><button onClick={() => setStep(1)}>Edit</button></div><h2>Large pothole near City Library</h2><p>Deep pothole causing vehicles to swerve. It gets difficult to see after dark.</p></div>
    <div className="review-photo"><span className="photo-art"/><span><Icon name="image" size={16}/>1 photo attached</span></div>
    <div className="review-row"><span><Icon name="pin"/></span><div><small>LOCATION</small><strong>MG Road, Indiranagar</strong><p>Bengaluru, Karnataka 560038</p></div><button onClick={() => setStep(2)}>Edit</button></div>
    <div className="review-row"><span><Icon name="clock"/></span><div><small>IMPACT & PRIORITY</small><strong>Road safety · {priority}</strong></div><button onClick={() => setStep(2)}>Edit</button></div>
    <div className="safe-note"><Icon name="shield" size={18}/><p>Your contact information stays private. Only report details are shared with the responsible authority.</p></div>
    <button className="primary sticky-submit" onClick={() => setSubmitted(true)}>Submit issue <Icon name="arrow"/></button>
  </div>;
  return <div className="screen">
    <Header title="Report an issue" back={() => go('home')}/>
    <div className="progress"><span className="active"/><span className="active"/><span/><small>2 of 3 · Details, evidence & impact</small></div>
    <section className="form-section">
      <label>Issue title<input defaultValue="Large pothole near City Library" placeholder="Briefly describe the issue"/></label>
      <label>Description<textarea defaultValue="Deep pothole causing vehicles to swerve. It gets difficult to see after dark." placeholder="Add useful details..."/></label>
    </section>
    <section>
      <div className="section-head"><div><p className="eyebrow">EVIDENCE</p><h2>Add photos</h2></div><span className="optional">Optional</span></div>
      <div className="uploads">
        {photo && <div className="photo-preview"><span className="photo-art"/><button onClick={() => setPhoto(false)}><Icon name="close" size={15}/></button></div>}
        <button className="upload" onClick={() => setPhoto(true)}><Icon name="camera"/><strong>Camera</strong><small>Take a photo</small></button>
        <button className="upload" onClick={() => setPhoto(true)}><Icon name="image"/><strong>Gallery</strong><small>Choose a photo</small></button>
      </div>
    </section>
    <section>
      <p className="eyebrow">LOCATION</p><h2>Confirm the location</h2>
      <button className="location-card"><span className="mini-map"><i/></span><span><strong>MG Road, Indiranagar</strong><small>Bengaluru, Karnataka 560038</small></span><Icon name="edit" size={18}/></button>
    </section>
    <section>
      <p className="eyebrow">IMPACT</p><h2>Set priority</h2>
      <div className="segmented">{['Low','Medium','High'].map(p => <button key={p} onClick={() => setPriority(p)} className={priority === p ? 'active' : ''}>{p}</button>)}</div>
    </section>
    <button className="primary sticky-submit" onClick={() => setStep(3)}>Review report <Icon name="arrow"/></button>
  </div>;
}

function Complaints({ go }: { go: (screen: Screen) => void }) {
  const [filter, setFilter] = useState('All');
  return <div className="screen">
    <Header title="My complaints" action={<button className="icon-btn"><Icon name="search"/></button>}/>
    <div className="complaint-summary"><div><p>Issues reported</p><strong>35</strong></div><span/><div><p>Resolution rate</p><strong>72%</strong></div></div>
    <div className="filter-row">{['All','Open','In progress','Resolved'].map(f => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div>
    <div className="sort-row"><span>{filter} complaints</span><button><Icon name="filter" size={16}/>Newest first</button></div>
    <div className="issue-list">{issues.filter(i => filter === 'All' || i.status.toLowerCase().includes(filter.toLowerCase().split(' ')[0])).map((issue, i) => <IssueCard key={i} issue={issue} onClick={() => go('detail')}/>)}</div>
    {filter === 'Open' && <div className="empty-state"><span><Icon name="file" size={30}/></span><h3>No open complaints</h3><p>You’re all caught up. New reports will appear here.</p></div>}
  </div>;
}

function Detail({ go }: { go: (screen: Screen) => void }) {
  return <div className="screen">
    <Header title="Complaint details" back={() => go('home')} action={<button className="icon-btn"><Icon name="settings"/></button>}/>
    <div className="detail-hero"><span className="detail-pattern"/><StatusBadge tone="amber">In progress</StatusBadge><p>#CF-2794 · ROADS</p><h1>Large pothole near City Library</h1><span className="meta"><Icon name="pin" size={15}/> MG Road, Indiranagar</span></div>
    <div className="evidence-photo"><img src="https://images.unsplash.com/photo-1779179015285-120aaa822b1b?auto=format&fit=crop&w=900&q=82" alt="Broken uneven pavement reported by a citizen"/><small>1 of 2</small></div>
    <section><div className="section-head"><h2>Status timeline</h2><span className="priority high">High priority</span></div>
      <div className="status-timeline">
        <div className="complete"><span><Icon name="check" size={14}/></span><div><strong>Report submitted</strong><p>We received your complaint.</p><small>12 Jun · 10:24 AM</small></div></div>
        <div className="complete"><span><Icon name="check" size={14}/></span><div><strong>Assigned to Roads Division</strong><p>Ward 82 field team notified.</p><small>12 Jun · 2:18 PM</small></div></div>
        <div className="current"><span><Icon name="clock" size={14}/></span><div><strong>Repair scheduled</strong><p>Work is planned for tomorrow, 8–11 AM.</p><small>Today · 9:05 AM</small></div></div>
        <div><span/><div><strong>Resolution & verification</strong><p>We’ll ask you to verify the fix.</p></div></div>
      </div>
    </section>
    <section className="authority-update"><div><span><Icon name="shield"/></span><div><p className="eyebrow">AUTHORITY UPDATE</p><strong>BBMP Roads Division</strong></div></div><p>“Our crew has inspected the site. Repair materials have been dispatched.”</p></section>
    <button className="outline"><Icon name="bell" size={18}/> Notify me about updates</button>
  </div>;
}

function Alerts({ go }: { go: (screen: Screen) => void }) {
  const notices = [
    ['Repair scheduled','Your pothole report is scheduled for repair tomorrow.','clock','8 min ago','new'],
    ['Issue resolved','The water leak you reported has been fixed. Please verify.','check','2 hr ago','new'],
    ['Assigned to authority','Your streetlight report was sent to BBMP.','shield','Yesterday',''],
    ['Community update','An issue near you received 18 citizen supports.','user','Monday',''],
  ];
  return <div className="screen">
    <Header title="Notifications" action={<button className="mark-read">Mark all read</button>}/>
    <p className="day-label">TODAY</p>
    <div className="notification-list">{notices.map(([title, copy, icon, time, status], i) =>
      <button key={title} className={`notification ${status}`} onClick={() => go('detail')}><span className={`notice-icon n${i}`}><Icon name={icon as IconName}/></span><span><strong>{title}</strong><p>{copy}</p><small>{time}</small></span>{status && <i/>}</button>
    )}</div>
  </div>;
}

function Profile() {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  return <div className="screen">
    <Header title="Profile & settings" action={<button className="icon-btn" onClick={() => setEditing(!editing)}><Icon name="edit"/></button>}/>
    <div className="profile-hero"><div className="profile-avatar">MK<span/></div><h1>Maya Krishnan</h1><p>maya.k@example.com</p><span className="citizen-badge"><Icon name="shield" size={14}/>Verified citizen</span></div>
    {editing && <section className="edit-panel"><label>Full name<input defaultValue="Maya Krishnan"/></label><label>Email<input defaultValue="maya.k@example.com"/></label><button className="primary" onClick={() => {setSaved(true); setEditing(false)}}>Save changes</button></section>}
    {saved && <div className="toast"><Icon name="check" size={17}/>Profile updated successfully</div>}
    <section><p className="settings-label">ACCOUNT</p><div className="settings-card"><button onClick={() => setEditing(true)}><span><Icon name="user"/></span><div><strong>Personal information</strong><small>Name, email and phone</small></div><Icon name="chevron" size={18}/></button><button><span><Icon name="shield"/></span><div><strong>Security & password</strong><small>Keep your account secure</small></div><Icon name="chevron" size={18}/></button></div></section>
    <section><p className="settings-label">PREFERENCES</p><div className="settings-card"><button><span><Icon name="bell"/></span><div><strong>Notifications</strong><small>Updates, alerts and reminders</small></div><i className="toggle on"/ ></button><button><span><Icon name="pin"/></span><div><strong>Saved locations</strong><small>Home and frequently used places</small></div><Icon name="chevron" size={18}/></button></div></section>
    <button className="signout"><Icon name="logout" size={19}/>Sign out</button><p className="version">CivicFix v2.4.0 · Made for better cities</p>
  </div>;
}

function BottomNav({ active, go }: { active: Screen; go: (s: Screen) => void }) {
  const items: [Screen, IconName, string][] = [['home','home','Home'],['explore','map','Explore'],['report','plus','Report'],['complaints','file','My issues'],['profile','user','Profile']];
  return <nav className="bottom-nav">{items.map(([screen, icon, label]) => <button key={screen} onClick={() => go(screen)} className={active === screen ? 'active' : ''}><span className={screen === 'report' ? 'report-fab' : ''}><Icon name={icon}/></span><small>{label}</small>{screen === 'alerts' && <i/>}</button>)}</nav>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const go = (next: Screen) => { setScreen(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return <main className="app-shell">
    <div className="phone">
      <div className="statusbar"><span>9:41</span><span className="status-icons">● ◒ ▰</span></div>
      {screen === 'login' && <Auth mode="login" go={go}/>}
      {screen === 'signup' && <Auth mode="signup" go={go}/>}
      {screen === 'forgot' && <Auth mode="forgot" go={go}/>}
      {screen === 'verify' && <Auth mode="verify" go={go}/>}
      {screen === 'home' && <Home go={go}/>}
      {screen === 'explore' && <Explore go={go}/>}
      {screen === 'report' && <Report go={go}/>}
      {screen === 'complaints' && <Complaints go={go}/>}
      {screen === 'detail' && <Detail go={go}/>}
      {screen === 'alerts' && <Alerts go={go}/>}
      {screen === 'profile' && <Profile/>}
      {!['login','signup','forgot','verify','report','detail','alerts'].includes(screen) && <BottomNav active={screen} go={go}/>}
    </div>
  </main>;
}
