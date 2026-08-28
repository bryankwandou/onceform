/*
  The SaySo mark.

  A speech bubble holding a check: something a person said, and it counted. The
  two halves of the name are carried by one shape, which is the only way a mark
  survives being shrunk to a 16px favicon.

  The gradient runs top-left to bottom-right so the tail sits in the darkest
  part of the ramp and the mark reads as lit from above. `idPrefix` exists
  because gradient ids are global in SVG — two marks on one page with the same
  id will silently share the first definition.
*/

type MarkProps = {
  size?: number;
  className?: string;
  idPrefix?: string;
};

export function SaySoMark({ size = 32, className, idPrefix = "sayso" }: MarkProps) {
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
        <linearGradient id={grad} x1="6" y1="4" x2="40" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD894" />
          <stop offset="0.45" stopColor="#F5B13D" />
          <stop offset="1" stopColor="#E08B1E" />
        </linearGradient>
        <linearGradient id={shine} x1="24" y1="5" x2="24" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.42" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Bubble and tail drawn as one path so the join never shows a seam. */}
      <path
        d="M16 5.5h16c5.8 0 8.7 0 10.9 1.6a9 9 0 0 1 2 2C46.5 11.3 46.5 14.2 46.5 20v3.5c0 5.8 0 8.7-1.6 10.9a9 9 0 0 1-2 2c-2.2 1.6-5.1 1.6-10.9 1.6H21.4l-7.2 6.6c-1.4 1.3-3.7.3-3.7-1.6v-5.5c-3.3-.6-5.2-2-6.4-4.5C3 30.8 3 27.9 3 22.1V20c0-5.8 0-8.7 1.6-10.9a9 9 0 0 1 2-2C8.8 5.5 11.7 5.5 17.5 5.5Z"
        fill={`url(#${grad})`}
      />

      {/* Top highlight, clipped to the bubble by sitting inside its bounds. */}
      <path
        d="M16 5.5h16c5.8 0 8.7 0 10.9 1.6a9 9 0 0 1 2 2c1.1 1.5 1.4 3.4 1.5 6.4H2.6c.1-3 .4-4.9 1.5-6.4a9 9 0 0 1 2-2C8.8 5.5 11.7 5.5 17.5 5.5Z"
        fill={`url(#${shine})`}
      />

      {/* The statement itself. */}
      <path
        d="M16 22.4l5.2 5.2L33 15.8"
        stroke="#0B0B10"
        strokeOpacity="0.9"
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SaySoLogo({
  size = 28,
  className = "",
  idPrefix = "sayso-lockup",
}: MarkProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <SaySoMark size={size} idPrefix={idPrefix} />
      <span
        className="font-semibold tracking-[-0.02em] text-chalk-50"
        style={{ fontSize: size * 0.62 }}
      >
        SaySo
      </span>
    </span>
  );
}
