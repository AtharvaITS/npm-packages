/* Inline icons: tiny, dependency-free, decorative (aria-hidden). */
const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
  className: 'aits-icon',
};

export const SortAscIcon = () => (
  <svg {...base}>
    <path d="M8 13V3M4 7l4-4 4 4" />
  </svg>
);
export const SortDescIcon = () => (
  <svg {...base}>
    <path d="M8 3v10M4 9l4 4 4-4" />
  </svg>
);
export const SortNoneIcon = () => (
  <svg {...base} className="aits-icon aits-icon-muted">
    <path d="M5 6l3-3 3 3M5 10l3 3 3-3" />
  </svg>
);
export const MoreIcon = () => (
  <svg {...base}>
    <circle cx="8" cy="3.5" r="0.6" fill="currentColor" />
    <circle cx="8" cy="8" r="0.6" fill="currentColor" />
    <circle cx="8" cy="12.5" r="0.6" fill="currentColor" />
  </svg>
);
export const TableIcon = () => (
  <svg {...base}>
    <rect x="2" y="3" width="12" height="10" rx="1" />
    <path d="M2 6.5h12M2 9.8h12M6 3v10" />
  </svg>
);
export const GridIcon = () => (
  <svg {...base}>
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
    <rect x="9" y="9" width="5" height="5" rx="1" />
  </svg>
);
export const ListIcon = () => (
  <svg {...base}>
    <path d="M5.5 4h8.5M5.5 8h8.5M5.5 12h8.5" />
    <circle cx="2.5" cy="4" r="0.7" fill="currentColor" />
    <circle cx="2.5" cy="8" r="0.7" fill="currentColor" />
    <circle cx="2.5" cy="12" r="0.7" fill="currentColor" />
  </svg>
);
export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5L14 14" />
  </svg>
);
export const CloseIcon = () => (
  <svg {...base}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);
export const FilterIcon = () => (
  <svg {...base}>
    <path d="M2 3h12l-4.5 5.5V13l-3-1.5V8.5z" />
  </svg>
);
export const FormatIcon = () => (
  <svg {...base}>
    <path d="M4 13h8" />
    <path d="M5.2 11.2L8 3.2l2.8 8" />
    <path d="M6.2 8.4h3.6" />
  </svg>
);
export const ColumnsIcon = () => (
  <svg {...base}>
    <rect x="2" y="3" width="12" height="10" rx="1" />
    <path d="M6 3v10M10 3v10" />
  </svg>
);
export const ChevronIcon = ({ dir }: { dir: 'first' | 'prev' | 'next' | 'last' }) => (
  <svg {...base} className="aits-icon aits-icon-flip-rtl">
    {dir === 'first' && <path d="M11 4L7 8l4 4M4.5 4v8" />}
    {dir === 'prev' && <path d="M10 4L6 8l4 4" />}
    {dir === 'next' && <path d="M6 4l4 4-4 4" />}
    {dir === 'last' && <path d="M5 4l4 4-4 4M11.5 4v8" />}
  </svg>
);
