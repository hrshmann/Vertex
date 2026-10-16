/** Grid pitch in px; matches the grid drawn by body::before in globals.css. */
const GRID = 48;

/** Light pulses travelling along grid lines: [row or column index, seconds per pass, delay]. */
const ROW_PULSES = [
  [3, 9, 0],
  [7, 13, 4],
  [12, 11, 7],
] as const;
const COLUMN_PULSES = [
  [5, 12, 2],
  [19, 15, 6],
  [27, 10, 9],
] as const;

/**
 * The page's animated background, behind everything: two slowly drifting glows in the logo's
 * blue and violet, a faint scan beam, and pulses of light running along the grid lines. All of
 * it moves with transforms only, so it costs no layout or repaint; reduced motion stills it.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="vx-drift-a absolute -left-[15vw] -top-[30vh] h-[70vh] w-[70vw] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgb(var(--accent) / 0.2), transparent)" }}
      />
      <div
        className="vx-drift-b absolute -right-[20vw] -top-[25vh] h-[65vh] w-[60vw] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgb(var(--glow) / 0.17), transparent)" }}
      />
      <div
        className="vx-drift-c absolute bottom-[-35vh] left-[25vw] h-[60vh] w-[55vw] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgb(var(--accent) / 0.07), transparent)" }}
      />

      <div
        className="vx-scan absolute inset-x-0 top-0 h-24"
        style={{ background: "linear-gradient(to bottom, transparent, rgb(var(--accent) / 0.05) 85%, rgb(var(--accent) / 0.16) 100%, transparent 100%)" }}
      />

      {ROW_PULSES.map(([row, dur, delay]) => (
        <div
          key={`r${row}`}
          className="vx-pulse-x absolute left-0 h-px w-[22vw]"
          style={
            {
              top: row * GRID - 1,
              background: "linear-gradient(90deg, transparent, rgb(var(--accent) / 0.75))",
              "--dur": `${dur}s`,
              "--delay": `${delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
      {COLUMN_PULSES.map(([col, dur, delay]) => (
        <div
          key={`c${col}`}
          className="vx-pulse-y absolute top-0 h-[22vh] w-px"
          style={
            {
              left: col * GRID - 1,
              background: "linear-gradient(180deg, transparent, rgb(var(--glow) / 0.7))",
              "--dur": `${dur}s`,
              "--delay": `${delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
