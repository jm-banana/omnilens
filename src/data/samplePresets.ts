export interface VisualPreset {
  id: string;
  title: string;
  subject: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cardCount: number;
  tags: string[];
  // SVG Data URL representation of a clean scanned study sheet
  svgDataUri: string;
}

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Function to generate high-contrast educational scan mockups as SVG data URIs
function createScanSvgUri(
  accentColor: string,
  title: string,
  subtext: string,
  bullets: string[],
  formulaOrDiagram: string
): string {
  const bulletLines = bullets
    .map(
      (b, i) =>
        `<text x="40" y="${190 + i * 36}" fill="#334155" font-family="sans-serif" font-size="16">• ${xmlEscape(b)}</text>`
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420">
    <defs>
      <linearGradient id="paperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#f8fafc"/>
      </linearGradient>
    </defs>
    <rect width="600" height="420" fill="url(#paperGrad)" rx="12" stroke="#cbd5e1" stroke-width="2"/>
    <line x1="0" y1="40" x2="600" y2="40" stroke="${accentColor}" stroke-width="4"/>
    <text x="40" y="85" fill="#0f172a" font-family="sans-serif" font-weight="bold" font-size="24">${xmlEscape(title)}</text>
    <text x="40" y="115" fill="#64748b" font-family="sans-serif" font-size="14">${xmlEscape(subtext)}</text>
    <line x1="40" y1="135" x2="560" y2="135" stroke="#e2e8f0" stroke-width="2"/>
    <rect x="40" y="145" width="520" height="2" fill="${accentColor}" opacity="0.3"/>
    ${bulletLines}
    <rect x="40" y="310" width="520" height="75" fill="#f1f5f9" rx="8" stroke="#e2e8f0"/>
    <text x="60" y="340" fill="#475569" font-family="sans-serif" font-size="12" font-weight="bold">KEY FOCUS / FORMULA / DIAGRAM:</text>
    <text x="60" y="365" fill="${accentColor}" font-family="monospace" font-weight="bold" font-size="15">${xmlEscape(formulaOrDiagram)}</text>
  </svg>`;

  const base64 = typeof btoa !== 'undefined'
    ? btoa(unescape(encodeURIComponent(svg)))
    : Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

export const SAMPLE_PRESETS: VisualPreset[] = [
  {
    id: 'chem-carbonyl',
    title: 'Organic Chemistry: Carbonyl Addition Reactions',
    subject: 'Chemistry',
    description: 'Nucleophilic additions, Grignard reagents, and hemiacetal formation.',
    difficulty: 'Medium',
    cardCount: 6,
    tags: ['Organic Chemistry', 'Reactions', 'Mechanisms'],
    svgDataUri: createScanSvgUri(
      '#059669',
      'CH-302: Carbonyl Reactions & Mechanisms',
      'Lecture Notes Chapter 8 • Professor Vance • Spring Semester',
      [
        'Carbonyl carbon has partial positive charge (electrophilic site)',
        'Nucleophile attacks sp2 carbon forming tetrahedral intermediate (sp3)',
        'Grignard Reagents (R-MgX) add alkyl groups to aldehydes to yield 2° alcohols',
        'Acid-catalyzed hydration forms geminal diols reversibly'
      ],
      'R-CHO + R\'-MgBr -> [R-CH(O-MgBr)-R\'] --(H3O+)--> R-CH(OH)-R\''
    ),
  },
  {
    id: 'bio-cardio',
    title: 'Cardiovascular Physiology: Cardiac Cycle & Pressure',
    subject: 'Biology & Medicine',
    description: 'Systole, diastole, Wiggers diagram, stroke volume, and Frank-Starling law.',
    difficulty: 'Hard',
    cardCount: 5,
    tags: ['Physiology', 'Medicine', 'Cardiovascular'],
    svgDataUri: createScanSvgUri(
      '#0284c7',
      'MED-201: Cardiac Mechanics & Pressure-Volume Loops',
      'Gross Anatomy & Human Physiology • Module 4 Review',
      [
        'Isovolumetric ventricular contraction: AV and semilunar valves both closed',
        'Ejection phase starts when ventricular pressure exceeds aortic pressure (~80 mmHg)',
        'Stroke Volume (SV) = End Diastolic Volume (EDV) - End Systolic Volume (ESV)',
        'Frank-Starling Law: Increased preload leads to increased stroke volume'
      ],
      'CO = Heart Rate x Stroke Volume | EF = (SV / EDV) x 100%'
    ),
  },
  {
    id: 'math-calc',
    title: 'Calculus: Fundamental Theorems & Series Convergence',
    subject: 'Mathematics',
    description: 'FTC Parts 1 & 2, Integration by Parts, Ratio Test, and Taylor Series.',
    difficulty: 'Medium',
    cardCount: 5,
    tags: ['Calculus', 'Analysis', 'Derivatives'],
    svgDataUri: createScanSvgUri(
      '#7c3aed',
      'MATH-21B: Integral Calculus Theorems',
      'STEM Core Review • Department of Mathematics',
      [
        'FTC 1: d/dx [integral from a to x of f(t) dt] = f(x)',
        'FTC 2: integral from a to b of f(x) dx = F(b) - F(a) where F\'(x) = f(x)',
        'Integration by parts formula: integral u dv = u*v - integral v du',
        'Taylor series for e^x = sum from n=0 to inf of (x^n / n!)'
      ],
      'int(u dv) = uv - int(v du) | L = lim |a_{n+1}/a_n| < 1 (Converges)'
    ),
  },
  {
    id: 'neuro-synapse',
    title: 'Neurobiology: Action Potentials & Synaptic Transmission',
    subject: 'Neuroscience',
    description: 'Resting membrane potential, voltage-gated Na+/K+ channels, neurotransmitters.',
    difficulty: 'Medium',
    cardCount: 6,
    tags: ['Neuroscience', 'Biology', 'Biochemistry'],
    svgDataUri: createScanSvgUri(
      '#d97706',
      'NEURO-105: Action Potential Propagation',
      'Cellular Neuroscience • Laboratory Protocol & Notes',
      [
        'Resting membrane potential is approximately -70 mV maintained by Na+/K+ ATPase',
        'Depolarization threshold is typically around -55 mV, opening voltage-gated Na+ channels',
        'Repolarization occurs as Na+ channels inactivate and voltage-gated K+ channels open',
        'Calcium influx through voltage-gated Ca2+ channels triggers vesicle fusion at synapse'
      ],
      'Nernst Eq: E_ion = (RT/zF) * ln([ion]_out / [ion]_in) = (61.5/z) * log10(...)'
    ),
  },
];
