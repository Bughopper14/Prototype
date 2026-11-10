/** Shows saved rich text (TinyMCE HTML) in the live document. */

export function renderRichHtml(val: any) {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  const stripped = str
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  if (!stripped && !/<(img|table|hr)/i.test(str)) return null;

  if (/<(p|ul|ol|li|div|br|strong|b|em|i|span|table|tr|td|th|img)[^>]*>/i.test(str)) {
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
