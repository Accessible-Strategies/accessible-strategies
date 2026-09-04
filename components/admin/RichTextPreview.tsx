'use client';

// ── RichTextPreview ───────────────────────────────────────────────────────
//
// Renders stored HTML from RichTextEditor with consistent admin preview styles.
// Admin-only — content is trusted (authored by the sole admin user).
//
// Heading sizes are intentionally smaller than public site tokens — those
// are 30px+ and overwhelm a compact preview pane. These values are scoped
// to prose-in-admin and should not be changed to site tokens.

interface RichTextPreviewProps {
  html?:  string;
  style?: React.CSSProperties;
}

const PREVIEW_STYLES = `
  .as-rte-preview > * + *    { margin-top: 0.5em; }
  .as-rte-preview p          { margin: 0; min-height: 1em; }
  .as-rte-preview h2         { font-size: 1.25rem; font-weight: 700; line-height: 1.35; color: var(--as-text); margin: 1em 0 0.3em; }
  .as-rte-preview h3         { font-size: 1.1rem;  font-weight: 600; line-height: 1.4;  color: var(--as-text); margin: 0.75em 0 0.2em; }
  .as-rte-preview ul         { list-style: disc    inside; padding-left: 1em; margin: 0.4em 0; }
  .as-rte-preview ol         { list-style: decimal inside; padding-left: 1em; margin: 0.4em 0; }
  .as-rte-preview li         { display: list-item; margin-bottom: 0.2em; }
  .as-rte-preview li > p     { display: inline; margin: 0; }
  .as-rte-preview blockquote { border-left: 3px solid var(--as-heading); padding-left: 0.75em; color: var(--as-text-muted); margin: 0.4em 0; }
  .as-rte-preview a          { color: var(--as-heading); text-decoration: underline; }
  .as-rte-preview strong     { font-weight: 700; }
  .as-rte-preview em         { font-style: italic; }
  .as-rte-preview u          { text-decoration: underline; }
  .as-rte-preview img        { max-width: 100%; height: auto; border-radius: var(--as-radius-md); display: block; margin: 0.5em 0; }
`;

export default function RichTextPreview({ html, style }: RichTextPreviewProps) {
  if (!html) return null;
  return (
    <>
      <style>{PREVIEW_STYLES}</style>
      <div
        className="as-rte-preview"
        style={{
          fontSize:   'var(--as-text-sm)',
          color:      'var(--as-text)',
          lineHeight: 'var(--as-leading-base)',
          ...style,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}