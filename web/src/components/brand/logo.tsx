/*
  The Onceform mark.

  A text caret — the I-beam every person recognises as "type here" — next to a
  filled dot standing for the answer already on file. Read left to right it is
  the whole product: the field is waiting, and the answer already exists.

  A caret was chosen partly because of what it is not. Consent and identity
  products converge on shields, padlocks and checkmarks, so a mark built from
  any of those is invisible in a row of competitor logos. An I-beam is unusual
  enough to be ownable and simple enough to survive a 16px favicon, where a
  bubble with a check inside collapses into a smudge.

  `idPrefix` exists because gradient ids are global in SVG — two marks on one
  page sharing an id will silently both use the first definition.
*/

type MarkProps = {
  size?: number;
  className?: string;
  idPrefix?: string;
};

export function OnceformMark({ size = 32, className, idPrefix = "onceform" }: MarkProps) {
  const grad = `${idPrefix}-grad`;
  const shine = `${idPrefix}-shine`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={grad} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD894" />
          <stop offset="0.45" stopColor="#F5B13D" />
          <stop offset="1" stopColor="#E08B1E" />
        </linearGradient>
        <linearGradient id={shine} x1="24" y1="3" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* The field. Squircle-ish radius: soft enough to feel like an app icon,
          tight enough that the caret inside still has room to breathe. */}
      <rect x="3" y="3" width="42" height="42" rx="13" fill={`url(#${grad})`} />
      <rect x="3" y="3" width="42" height="42" rx="13" fill={`url(#${shine})`} />

      {/* Caret: serifed I-beam, drawn as three strokes so the weight stays even
          at every size rather than thinning at the joins. */}
      <g
        stroke="#0B0B10"
        strokeOpacity="0.92"
        strokeWidth="4"
        strokeLinecap="round"
      >
        <path d="M16.6 14.2h8.6" />
        <path d="M20.9 14.2v19.6" />
        <path d="M16.6 33.8h8.6" />
      </g>

      {/* The answer already on file. */}
      <circle cx="32.2" cy="24" r="3.1" fill="#0B0B10" fillOpacity="0.92" />
    </svg>
  );
}

export function OnceformLogo({
  size = 28,
  className = "",
  idPrefix = "onceform-lockup",
}: MarkProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <OnceformMark size={size} idPrefix={idPrefix} />
      <span
        className="font-semibold tracking-[-0.02em] text-chalk-50"
        style={{ fontSize: size * 0.62 }}
      >
        Onceform
      </span>
    </span>
  );
}
