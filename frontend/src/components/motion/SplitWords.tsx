import { Fragment } from "react";

/**
 * Text whose words rise one after another out of a mask on page load. `start` continues the
 * stagger from a previous SplitWords in the same heading. Screen readers get the plain text.
 */
export function SplitWords({ text, start = 0, wordClassName }: { text: string; start?: number; wordClassName?: string }) {
  const words = text.split(" ");
  return (
    <>
      <span className="sr-only">{text}</span>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span aria-hidden className="vx-word">
            <span style={{ "--i": start + i } as React.CSSProperties} className={wordClassName}>
              {word}
            </span>
          </span>
          {i < words.length - 1 && " "}
        </Fragment>
      ))}
    </>
  );
}
