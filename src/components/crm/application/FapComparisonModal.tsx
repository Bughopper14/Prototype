import {Editor} from '@tinymce/tinymce-react';
import {createPortal} from 'react-dom';
import {useState} from 'react';
import {Pencil, AlertCircle, AlertTriangle, X, Loader2, Lock, CheckCircle} from 'lucide-react';
import {type Field, label} from '@/lib/shared/fields';


export function FapComparisonModal({
  comparison,
  onClose,
  onApprove,
  onCorrect,
  busy
}: {
  comparison: any;
  onClose: () => void;
  onApprove: (data: any) => void;
  onCorrect: () => void;
  busy: boolean;
}) {
  if (!comparison) return null;
  const diffs: Array<{ field: string; label: string; oldValue: string; newValue: string }> = comparison.diffs || [];

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} style={{zIndex: 9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div 
        className="modal fap-comparison-modal" 
        onClick={e => e.stopPropagation()} 
        style={{
          width: '94vw',
          maxWidth: '920px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          background: '#ffffff'
        }}
      >
        <div className="modal-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #e2e8f0', background:'#f8fafc'}}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <div style={{width: 36, height: 36, borderRadius: '8px', background: '#fef3c7', color: '#d97706', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{margin:0, fontSize:'16px', fontWeight:600, color:'#0f172a'}}>Signed FAP Form OCR Verification</h3>
              <p style={{margin:0, fontSize:'12px', color:'#64748b'}}>Differences detected between initial system data and physical document OCR results</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} style={{border:'none', background:'transparent', cursor:'pointer', padding:'4px'}}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{padding:'20px', overflowY:'auto', flex:1}}>
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <AlertCircle size={18} style={{flexShrink:0, marginTop:'2px'}} />
            <div>
              <strong>Non-Blocking Notice:</strong> The signed FAP form has been uploaded and the submit button is now unlocked. Below are the fields where data differences were detected between the system database and the physical document:
            </div>
          </div>

          <div style={{border:'1px solid #e2e8f0', borderRadius:'8px', overflow:'hidden', marginBottom:'16px'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
              <thead>
                <tr style={{background:'#f1f5f9', borderBottom:'1px solid #cbd5e1', textAlign:'left'}}>
                  <th style={{padding:'10px 14px', fontWeight:600, color:'#334155', width:'30%'}}>Field Name</th>
                  <th style={{padding:'10px 14px', fontWeight:600, color:'#334155', width:'35%'}}>Current System Data (Previous)</th>
                  <th style={{padding:'10px 14px', fontWeight:600, color:'#047857', width:'35%'}}>FAP Document Data (OCR Detected)</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((d, i) => (
                  <tr key={d.field || i} style={{borderBottom: i < diffs.length - 1 ? '1px solid #e2e8f0' : 'none', background: i % 2 === 0 ? '#ffffff' : '#f8fafc'}}>
                    <td style={{padding:'10px 14px', fontWeight:500, color:'#1e293b'}}>
                      {d.label}
                      <div style={{fontSize:'11px', color:'#94a3b8', fontFamily:'monospace'}}>{d.field}</div>
                    </td>
                    <td style={{padding:'10px 14px', color:'#64748b'}}>
                      <span style={{background:'#f1f5f9', padding:'3px 8px', borderRadius:'4px', border:'1px solid #e2e8f0', display:'inline-block'}}>
                        {d.oldValue || '—'}
                      </span>
                    </td>
                    <td style={{padding:'10px 14px', color:'#047857', fontWeight:500}}>
                      <span style={{background:'#ecfdf5', color:'#065f46', padding:'3px 8px', borderRadius:'4px', border:'1px solid #a7f3d0', display:'inline-block'}}>
                        {d.newValue}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{fontSize:'12px', color:'#64748b', lineHeight:1.5}}>
            Physical FAP document verification confirmation:
            <ul style={{margin:'6px 0 0 18px', padding:0}}>
              <li><strong>Approve Document:</strong> Will NOT alter system/database records. All discrepancies are noted in Remarks, and Customer &amp; PIC sections will be locked before proceeding to Pre-analysis.</li>
              <li><strong>Review Remarks:</strong> Closes modal and stays on the document to review or add remarks.</li>
            </ul>
          </div>
        </div>

        <div className="modal-actions" style={{display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'10px', padding:'14px 20px', borderTop:'1px solid #e2e8f0', background:'#f8fafc'}}>
          <button 
            type="button" 
            className="button" 
            disabled={busy} 
            onClick={onCorrect} 
            style={{display:'inline-flex', alignItems:'center', gap:'6px'}}
          >
            <Pencil size={14} /> Review Remarks / Cancel
          </button>
          <button 
            type="button" 
            className="button primary" 
            disabled={busy} 
            onClick={() => onApprove(comparison.extractedData)} 
            style={{display:'inline-flex', alignItems:'center', gap:'6px', background:'#059669', borderColor:'#059669'}}
          >
            {busy ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />} Approve Document (Lock Customer &amp; PIC)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function FapRemarksTinyMCE({
  initialContent,
  disabled,
  onChange,
}: {
  initialContent: string;
  disabled?: boolean;
  onChange: (html: string) => void;
}) {
  const [initialValue] = useState(() => initialContent);

  return (
    <div className="legal-tinymce-wrapper" style={{ width: '100%' }}>
      <Editor
        licenseKey="gpl"
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        initialValue={initialValue}
        disabled={disabled}
        onEditorChange={onChange}
        init={{
          height: 220,
          menubar: false,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'charmap',
            'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'table', 'help', 'wordcount'
          ],
          toolbar: 'undo redo | blocks | bold italic underline forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
          content_style: `
            body { 
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              font-size: 13px; 
              line-height: 1.6; 
              color: #0f172a; 
              padding: 10px 14px; 
            }
            ol {
              margin: 0 0 8px 0;
              padding-left: 24px;
              list-style-type: decimal !important;
            }
            ol li {
              margin-bottom: 4px;
              line-height: 1.6;
            }
            ul {
              margin: 0 0 8px 0;
              padding-left: 24px;
              list-style-type: disc !important;
            }
            ul li {
              margin-bottom: 4px;
              line-height: 1.6;
            }
            p {
              margin: 0 0 6px 0;
              line-height: 1.6;
            }
          `,
          branding: false,
          promotion: false,
          statusbar: true,
          setup: (ed: any) => {
            ed.on('init', () => {
              if (!disabled) {
                ed.mode.set('design');
              }
            });
          }
        }}
      />
    </div>
  );
}
