/** The list of field changes of an activity (section, sub section, column, old and new value). */
import {resolveSubSectionName} from '@/features/activity/lib/sub-section';
import {type SystemActivity} from '@/features/activity/lib/types';

export function ActivityChanges({item}: {item: SystemActivity}) {
  return (
    <>
      {item.changes && item.changes.length > 0 && (
        <div
          style={{
            margin: '10px 0 14px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 6,
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#002c5f',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Rincian Perubahan Kolom ({item.changes.length})
              </span>
            </div>
            <span style={{fontSize: 11, color: '#64748b', fontWeight: 600}}>
              Bagian: <span style={{color: '#0369a1'}}>{item.changes[0]?.section || item.section}</span>
            </span>
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {item.changes.map((ch, cIdx) => {
              const effectiveSubSection =
                ch.subSection || resolveSubSectionName(ch.field || ch.label, ch.section || item.section);
              const effectiveSection = ch.section || item.section;
              return (
                <div
                  key={cIdx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '9px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  {/* Breadcrumb row: Bagian > Sub Section > Kolom */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flexWrap: 'wrap',
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        background: '#e0f2fe',
                        color: '#0369a1',
                        padding: '2px 8px',
                        borderRadius: 5,
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      Bagian: {effectiveSection}
                    </span>
                    <span style={{color: '#94a3b8', fontSize: 12}}>›</span>
                    <span
                      style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        padding: '2px 8px',
                        borderRadius: 5,
                        fontWeight: 600,
                        fontSize: 11,
                      }}
                    >
                      Sub Section: {effectiveSubSection}
                    </span>
                    <span style={{color: '#94a3b8', fontSize: 12}}>›</span>
                    <span style={{fontWeight: 700, color: '#0f172a', fontSize: 12}}>
                      Kolom: <span style={{color: '#002c5f'}}>{ch.label}</span>
                    </span>
                  </div>

                  {/* Values diff row: dari [oldValue] menjadi [newValue] */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                      fontSize: 12,
                      paddingLeft: 4,
                    }}
                  >
                    <span style={{color: '#64748b', fontWeight: 600, fontSize: 11}}>Perubahan:</span>
                    {ch.oldValue ? (
                      <>
                        <span style={{fontSize: 11, color: '#64748b'}}>dari</span>
                        <span
                          style={{
                            color: '#991b1b',
                            background: '#fee2e2',
                            padding: '2px 8px',
                            borderRadius: 4,
                            textDecoration: 'line-through',
                            fontSize: 12,
                            fontFamily: 'monospace',
                          }}
                          title="Nilai sebelumnya"
                        >
                          {ch.oldValue}
                        </span>
                        <span style={{color: '#0284c7', fontWeight: 700, fontSize: 13}}>➔</span>
                        <span style={{fontSize: 11, color: '#64748b'}}>menjadi</span>
                      </>
                    ) : null}
                    <span
                      style={{
                        color: '#166534',
                        background: '#dcfce7',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontWeight: 700,
                        fontSize: 12,
                        fontFamily: 'monospace',
                      }}
                      title="Nilai baru"
                    >
                      {ch.newValue}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
