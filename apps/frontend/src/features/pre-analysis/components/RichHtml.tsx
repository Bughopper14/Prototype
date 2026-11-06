/** Renders stored rich text (HTML or plain text with line breaks). */

export function renderRichHtml(val: any) {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  if (/<(p|ul|ol|li|div|br|strong|b|em|i|span|table|tr|td|th)[^>]*>/i.test(str)) {
    return (
      <div
        className="preana-rich-rendered-html"
        style={{lineHeight: 1.45}}
        dangerouslySetInnerHTML={{__html: str}}
      />
    );
  }
  return <div style={{whiteSpace: 'pre-line', lineHeight: 1.45}}>{str}</div>;
}
