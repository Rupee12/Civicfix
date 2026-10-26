import { useEffect, useState } from 'react'

const buildings = [
  { x: 40, y: 355, w: 38, h: 105 },
  { x: 84, y: 326, w: 45, h: 142 },
  { x: 137, y: 372, w: 34, h: 92 },
  { x: 226, y: 348, w: 48, h: 120 },
  { x: 284, y: 318, w: 42, h: 151 },
  { x: 334, y: 367, w: 31, h: 96 },
]

function Building({ x, y, w, h, index }: (typeof buildings)[number] & { index: number }) {
  const windows = Array.from({ length: Math.floor(h / 25) }, (_, row) =>
    Array.from({ length: 2 }, (_, col) => ({ x: x + 10 + col * 14, y: y + 15 + row * 20 })),
  ).flat()
  return (
    <g className="building" style={{ '--i': index } as React.CSSProperties}>
      <path d={`M${x} ${y} L${x + w / 2} ${y - 12} L${x + w} ${y} L${x + w / 2} ${y + 12}Z`} fill="#173d42" />
      <path d={`M${x} ${y}L${x + w / 2} ${y + 12}V${y + h}L${x} ${y + h - 12}Z`} fill="#09262c" />
      <path d={`M${x + w / 2} ${y + 12}L${x + w} ${y}V${y + h - 12}L${x + w / 2} ${y + h}Z`} fill="#0d3036" />
      {windows.map((window, i) => (
        <rect
          className="window"
          key={i}
          x={window.x}
          y={window.y}
          width="5"
          height="8"
          rx="1"
          style={{ '--w': i } as React.CSSProperties}
        />
      ))}
    </g>
  )
}

function RoadSignals() {
  return (
    <g className="signals">
      <path className="signal signal-a" pathLength="100" d="M-20 660C80 642 113 564 192 541C264 520 292 473 421 444" />
      <path className="signal signal-b" pathLength="100" d="M427 650C320 625 299 574 226 554C151 534 129 495 5 470" />
      <path className="signal signal-c" pathLength="100" d="M196 548C183 602 129 642 67 691" />
      <path className="signal signal-d" pathLength="100" d="M208 546C247 583 312 604 387 619" />
      <path className="signal signal-e" pathLength="100" d="M186 538C152 505 104 479 48 457" />
      <circle className="intersection i-one" cx="193" cy="541" r="7" />
      <circle className="intersection i-two" cx="226" cy="554" r="6" />
      {[{ x: 69, y: 620 }, { x: 310, y: 586 }, { x: 99, y: 481 }].map((m, i) => (
        <g className={`route-marker marker-${i}`} key={i} transform={`translate(${m.x} ${m.y})`}>
          <circle r="8" />
          <circle r="2.5" />
        </g>
      ))}
    </g>
  )
}

function LocationPin() {
  return (
    <g className="pin" transform="translate(196 430)">
      <ellipse className="pin-shadow" cx="0" cy="30" rx="28" ry="9" />
      <path d="M0-47c-20 0-35 15-35 34 0 26 35 57 35 57s35-31 35-57C35-32 20-47 0-47Z" fill="url(#pinGradient)" />
      <circle cx="0" cy="-14" r="12" fill="#fff9ec" />
      <circle cx="0" cy="-14" r="5" fill="#ff8b35" />
    </g>
  )
}

function EnergyRings() {
  return (
    <g className="rings">
      {[0, 1, 2].map((i) => (
        <ellipse key={i} className={`ring ring-${i}`} cx="196" cy="471" rx="34" ry="13" />
      ))}
    </g>
  )
}

function LogoReveal() {
  return (
    <g className="brand">
      <circle className="brand-halo" cx="196" cy="350" r="82" />
      <g className="icon-frame">
        <rect x="121" y="275" width="150" height="150" rx="36" fill="#071c22" opacity=".7" />
        <image className="official-icon" href="/civicfix-icon.png" x="121" y="275" width="150" height="150" preserveAspectRatio="xMidYMid meet" />
        <path className="icon-sweep" d="M131 398C166 416 226 414 264 382" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </g>
      <text className="wordmark" x="196" y="458" textAnchor="middle">Civic<tspan>Fix</tspan></text>
      <text className="tagline" x="196" y="491" textAnchor="middle">YOUR CITY. YOUR VOICE.</text>
    </g>
  )
}

function CityScene() {
  const particles = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2
    return { x: 196 + Math.cos(angle) * (44 + (i % 3) * 12), y: 450 + Math.sin(angle) * 28 }
  })
  return (
    <svg className="city" viewBox="0 0 393 852" role="img" aria-label="A futuristic city awakening into the CivicFix logo">
      <defs>
        <linearGradient id="sky" x2="0" y2="1"><stop stopColor="#02090c" /><stop offset="1" stopColor="#063238" /></linearGradient>
        <linearGradient id="pinGradient" x2=".7" y2="1"><stop stopColor="#ffbc62" /><stop offset=".5" stopColor="#ff7b2d" /><stop offset="1" stopColor="#ca461a" /></linearGradient>
        <linearGradient id="brandGradient"><stop stopColor="#2dffd0" /><stop offset=".55" stopColor="#10dca4" /><stop offset="1" stopColor="#2aaaff" /></linearGradient>
        <linearGradient id="farFacade" x2="0" y2="1"><stop stopColor="#14505c" /><stop offset="1" stopColor="#061d23" /></linearGradient>
        <linearGradient id="nearLeft"><stop stopColor="#153d45" /><stop offset=".5" stopColor="#061a20" /></linearGradient>
        <linearGradient id="nearRight" x1="1"><stop stopColor="#164c52" /><stop offset=".6" stopColor="#06191e" /></linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="soft"><feGaussianBlur stdDeviation="14" /></filter>
      </defs>
      <rect width="393" height="852" fill="url(#sky)" />
      <g className="light-beams">
        <path d="M36 0L143 610H82Z" />
        <path d="M350 0L244 610H322Z" />
      </g>
      <g className="stars">{Array.from({ length: 22 }, (_, i) => <circle key={i} cx={(i * 83) % 393} cy={72 + ((i * 47) % 230)} r={i % 4 === 0 ? 1.2 : .6} />)}</g>
      <ellipse className="ambient-glow" cx="196" cy="510" rx="190" ry="190" />
      <g className="far-city">
        <path d="M0 405V320h21v38h14v-82h30v69h22v-115h36v123h20v-78h33v61h25v-97h33v109h19v-63h34v49h19v-94h31v106h26v-72h30v131Z" fill="url(#farFacade)" />
        {[16, 48, 98, 112, 160, 216, 261, 305, 350, 373].map((x, i) => <path className="far-window" key={x} d={`M${x} ${285 + (i % 3) * 17}v78`} />)}
        <g className="antennas"><path d="M105 230v-42M101 202h8M303 240v-57M298 208h10M214 239v-31" /></g>
      </g>
      <g className="fog fog-back"><ellipse cx="196" cy="415" rx="240" ry="57" /></g>
      <g className="city-world">
        <ellipse cx="196" cy="584" rx="235" ry="154" fill="#06191e" stroke="#17494b" strokeWidth="2" />
        <path d="M-20 660C80 642 113 564 192 541C264 520 292 473 421 444" fill="none" stroke="#071316" strokeWidth="54" />
        <path d="M-20 660C80 642 113 564 192 541C264 520 292 473 421 444" fill="none" stroke="#284348" strokeWidth="42" />
        <path d="M427 650C320 625 299 574 226 554C151 534 129 495 5 470" fill="none" stroke="#071316" strokeWidth="46" />
        <path d="M427 650C320 625 299 574 226 554C151 534 129 495 5 470" fill="none" stroke="#1d383e" strokeWidth="34" />
        <g className="road-reflections">
          <path d="M-20 660C80 642 113 564 192 541C264 520 292 473 421 444" />
          <path d="M427 650C320 625 299 574 226 554C151 534 129 495 5 470" />
          <path d="M196 548C170 620 99 663 29 716" />
          <path d="M208 546C261 598 322 612 414 628" />
        </g>
        <g className="lane-marks" fill="none" stroke="#b9d5d3" strokeWidth="2" strokeDasharray="10 13">
          <path d="M-20 660C80 642 113 564 192 541C264 520 292 473 421 444" />
          <path d="M427 650C320 625 299 574 226 554C151 534 129 495 5 470" />
        </g>
        {buildings.map((building, i) => <Building key={i} {...building} index={i} />)}
        <g className="civic-building">
          <path d="M154 449L196 426l42 23-42 23Z" fill="#285159" />
          <path d="M160 452h72v67h-72z" fill="#10353b" />
          <path d="M151 514h90v12h-90z" fill="#1c5155" />
          {[170, 188, 207, 225].map((x) => <rect key={x} className="civic-light" x={x} y="466" width="8" height="31" rx="2" />)}
          <path d="M151 449h90l-45-31Z" fill="#317076" />
          <path className="civic-edge" d="M151 449l45-31 45 31M160 452h72M158 514h76" />
          <ellipse className="civic-core" cx="196" cy="506" rx="20" ry="7" />
        </g>
        <g className="trees">{[38, 72, 312, 348].map((x, i) => <g key={x} transform={`translate(${x} ${530 + (i % 2) * 45})`}><rect x="-2" width="4" height="16" fill="#6a6250" /><circle cy="-5" r="10" fill="#0d5a4c" /></g>)}</g>
        <g className="streetlights">{[35, 117, 275, 354].map((x, i) => <g key={x} transform={`translate(${x} ${605 - (i % 2) * 88})`}><path d="M0 0v-28h8" stroke="#739091" strokeWidth="2" /><circle className="lamp" cx="9" cy="-28" r="4" /></g>)}</g>
        <RoadSignals />
        <EnergyRings />
        <LocationPin />
        <g className="particles">{particles.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i % 3 === 0 ? 2.5 : 1.4} style={{ '--p': i } as React.CSSProperties} />)}</g>
        <path className="ribbon ribbon-a" pathLength="100" d="M48 436C86 308 301 279 348 423C379 518 270 581 165 531" />
        <path className="ribbon ribbon-b" pathLength="100" d="M341 491C294 603 93 577 56 447C25 339 144 282 245 322" />
      </g>
      <g className="foreground">
        <path d="M-18 852V636l54-31 47 26v221Z" fill="url(#nearLeft)" />
        <path d="M310 852V620l44-25 57 32v225Z" fill="url(#nearRight)" />
        {Array.from({ length: 7 }, (_, i) => <rect key={`l${i}`} x={17 + (i % 2) * 26} y={651 + i * 25} width="11" height="7" rx="2" />)}
        {Array.from({ length: 7 }, (_, i) => <rect key={`r${i}`} x={333 + (i % 2) * 26} y={647 + i * 25} width="11" height="7" rx="2" />)}
      </g>
      <g className="fog fog-front"><ellipse cx="196" cy="676" rx="260" ry="70" /></g>
      <LogoReveal />
      <text className="eyebrow" x="196" y="105" textAnchor="middle">A BETTER CITY STARTS HERE</text>
      <rect className="bottom-sheen" y="808" width="393" height="44" fill="url(#brandGradient)" opacity=".06" />
    </svg>
  )
}

function ReplayControl({ onReplay, visible }: { onReplay: () => void; visible: boolean }) {
  return (
    <button className={`replay ${visible ? 'is-visible' : ''}`} onClick={onReplay} disabled={!visible} aria-label="Replay animation">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 7.2A8 8 0 1 1 4 14M4.9 7.2V3m0 4.2h4.2" /></svg>
      Replay
    </button>
  )
}

export default function App() {
  const [run, setRun] = useState(0)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    setComplete(false)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => setComplete(true), reduced ? 100 : 4100)
    return () => window.clearTimeout(timer)
  }, [run])

  return (
    <main className="splash-shell">
      <section className="phone-stage" key={run}>
        <CityScene />
      </section>
      <ReplayControl visible={complete} onReplay={() => setRun((value) => value + 1)} />
    </main>
  )
}
