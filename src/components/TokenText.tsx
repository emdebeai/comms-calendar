import { Fragment } from "react";

/** Renders a string with Marketo personalisation tokens ({{First Name}})
 *  set in monospace, like inline code — so a templated subject line reads
 *  as the template it is, not odd punctuation. Plain text passes through. */
export function TokenText({ text }: { text: string }) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) =>
        /^\{\{[^}]+\}\}$/.test(p) ? (
          <code
            key={i}
            className="rounded bg-grey-90/8 px-1 font-mono text-[0.82em] font-medium"
          >
            {p}
          </code>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
