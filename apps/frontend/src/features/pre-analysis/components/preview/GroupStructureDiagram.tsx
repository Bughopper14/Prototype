/** Preview: holding → subsidiaries diagram with shareholding tables. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';

export function GroupStructureDiagram() {
  const {currentGroupStructure} = usePreAnalysis();
  return (
    <div
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '10px 6px',
        background: '#f8fafc',
        overflowX: 'auto',
      }}
    >
      <div
        style={{
          minWidth:
            (currentGroupStructure.subsidiaries?.length || 0) > 3
              ? `${(currentGroupStructure.subsidiaries?.length || 0) * 240}px`
              : '100%',
        }}
      >
        <div
          style={{
            fontSize: '8.5pt',
            fontWeight: 800,
            color: '#1e3a8a',
            letterSpacing: '0.03em',
            textAlign: 'center',
            marginBottom: '8px',
            borderBottom: '1px dashed #cbd5e1',
            paddingBottom: '4px',
          }}
        >
          GROUP SHAREHOLDING STRUCTURE CHART
        </div>

        {/* LEVEL 1: HOLDING ENTITY (PT STAR) CENTERED */}
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <div
            style={{
              width: '490px',
              maxWidth: '100%',
              background: '#ffffff',
              border: `2px solid ${currentGroupStructure.holding?.borderColor || '#1e3a8a'}`,
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 5px rgba(30, 58, 138, 0.08)',
            }}
          >
            {/* Card Header */}
            <div
              style={{
                padding: '5px 8px 3px 8px',
                textAlign: 'center',
                background: '#ffffff',
              }}
            >
              <div
                style={{
                  fontSize: '10.5pt',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '0.02em',
                  lineHeight: 1.2,
                }}
              >
                {currentGroupStructure.holding?.name || 'PT STAR'}
              </div>
              {currentGroupStructure.holding?.subtitle && (
                <div
                  style={{
                    fontSize: '7.5pt',
                    fontWeight: 600,
                    color: '#475569',
                    marginTop: '1px',
                  }}
                >
                  {currentGroupStructure.holding.subtitle}
                </div>
              )}
            </div>

            {/* Shareholding Composition Banner */}
            <div
              style={{
                background: '#0f294a',
                color: '#ffffff',
                fontSize: '7.2pt',
                fontWeight: 700,
                textAlign: 'center',
                padding: '2.5px 6px',
                letterSpacing: '0.03em',
              }}
            >
              Shareholding Composition
            </div>

            {/* 5-Column Table */}
            <div style={{padding: '3px 5px'}}>
              <table
                style={{
                  width: '100%',
                  tableLayout: 'fixed',
                  borderCollapse: 'collapse',
                  fontSize: '6.2pt',
                  lineHeight: 1.2,
                }}
              >
                <colgroup>
                  <col style={{width: '27%'}} />
                  <col style={{width: '22%'}} />
                  <col style={{width: '7%'}} />
                  <col style={{width: '17%'}} />
                  <col style={{width: '27%'}} />
                </colgroup>
                <thead>
                  <tr
                    style={{
                      background: '#f8fafc',
                      borderBottom: '1px solid #cbd5e1',
                      color: '#1e293b',
                    }}
                  >
                    <th
                      style={{
                        padding: '2px 3px',
                        textAlign: 'left',
                        fontWeight: 700,
                        verticalAlign: 'top',
                      }}
                    >
                      Name
                    </th>
                    <th
                      style={{
                        padding: '2px 3px',
                        textAlign: 'left',
                        fontWeight: 700,
                        verticalAlign: 'top',
                      }}
                    >
                      Position
                    </th>
                    <th
                      style={{
                        padding: '2px 1px',
                        textAlign: 'center',
                        fontWeight: 700,
                        verticalAlign: 'top',
                      }}
                      title="Share Class"
                    >
                      Class
                    </th>
                    <th
                      style={{
                        padding: '2px 3px',
                        textAlign: 'right',
                        fontWeight: 700,
                        verticalAlign: 'top',
                      }}
                    >
                      Number of Shares
                    </th>
                    <th
                      style={{
                        padding: '2px 3px',
                        textAlign: 'right',
                        fontWeight: 700,
                        verticalAlign: 'top',
                      }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(currentGroupStructure.holding?.shareholders || []).map((sh, idx) => (
                    <tr key={idx} style={{borderBottom: '1px solid #f1f5f9'}}>
                      <td
                        style={{
                          padding: '2px 3px',
                          fontWeight: 600,
                          color: '#0f172a',
                          verticalAlign: 'top',
                          wordBreak: 'normal',
                        }}
                      >
                        {sh.name}
                      </td>
                      <td
                        style={{
                          padding: '2px 3px',
                          color: '#475569',
                          verticalAlign: 'top',
                          wordBreak: 'normal',
                        }}
                      >
                        {sh.position || sh.role || '-'}
                      </td>
                      <td
                        style={{
                          padding: '2px 1px',
                          textAlign: 'center',
                          color: '#64748b',
                          verticalAlign: 'top',
                        }}
                      >
                        {sh.shareClass || '-'}
                      </td>
                      <td
                        style={{
                          padding: '2px 3px',
                          textAlign: 'right',
                          color: '#0f172a',
                          verticalAlign: 'top',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sh.numberOfShares || sh.percentage || '-'}
                      </td>
                      <td
                        style={{
                          padding: '2px 3px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#0f172a',
                          verticalAlign: 'top',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sh.total || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Capital Summary */}
            <div
              style={{
                padding: '3px 6px 4px 6px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                fontSize: '6.4pt',
                lineHeight: 1.3,
                color: '#1e293b',
              }}
            >
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <tbody>
                  <tr>
                    <td
                      style={{
                        fontWeight: 700,
                        color: '#334155',
                        padding: '1px 0',
                        verticalAlign: 'middle',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Authorized Capital
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#0f172a',
                        padding: '1px 0',
                        verticalAlign: 'middle',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {currentGroupStructure.holding?.authorizedCapital || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        fontWeight: 700,
                        color: '#334155',
                        padding: '1px 0',
                        verticalAlign: 'middle',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Issued and Paid-up Capital
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#0f172a',
                        padding: '1px 0',
                        verticalAlign: 'middle',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {currentGroupStructure.holding?.paidUpCapital || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CONNECTOR STEM & BRANCH LINES WITH ARROWS */}
        {(currentGroupStructure.subsidiaries || []).length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              margin: '0 auto',
            }}
          >
            {/* Vertical stem from holding */}
            <div style={{width: '2px', height: '14px', background: '#1e3a8a'}} />

            {/* Horizontal bar spanning children */}
            {(currentGroupStructure.subsidiaries || []).length > 1 ? (
              <div
                style={{
                  width: `calc(100% - ${100 / (currentGroupStructure.subsidiaries?.length || 1)}%)`,
                  height: '2px',
                  background: '#1e3a8a',
                }}
              />
            ) : null}

            {/* Downward drop lines with arrows into each child */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${currentGroupStructure.subsidiaries?.length || 1}, 1fr)`,
                width: '100%',
              }}
            >
              {(currentGroupStructure.subsidiaries || []).map((_, idx) => (
                <div key={idx} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                  <div style={{width: '2px', height: '12px', background: '#1e3a8a'}} />
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      borderTop: '5px solid #1e3a8a',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LEVEL 2: 3 SUBSIDIARIES GRID WITH SHAREHOLDING TABLES */}
        {(currentGroupStructure.subsidiaries || []).length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${currentGroupStructure.subsidiaries?.length || 1}, minmax(0, 1fr))`,
              gap: '6px',
              marginTop: '2px',
            }}
          >
            {(currentGroupStructure.subsidiaries || []).map((sub, sIdx) => {
              const border = sub.borderColor || (sIdx === 0 ? '#0284c7' : sIdx === 1 ? '#dc2626' : '#16a34a');
              return (
                <div
                  key={sIdx}
                  style={{
                    background: '#ffffff',
                    border: `2px solid ${border}`,
                    borderRadius: '7px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                  }}
                >
                  {/* Sub Header */}
                  <div
                    style={{
                      padding: '5px 4px 2px 4px',
                      textAlign: 'center',
                      background: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '9pt',
                        fontWeight: 800,
                        color: '#0f172a',
                        letterSpacing: '0.02em',
                        lineHeight: 1.2,
                      }}
                    >
                      {sub.name || `PT Entity #${sIdx + 1}`}
                    </div>
                    {sub.subtitle && (
                      <div
                        style={{
                          fontSize: '6.2pt',
                          fontWeight: 600,
                          color: '#475569',
                          marginTop: '1px',
                          lineHeight: 1.15,
                        }}
                      >
                        {sub.subtitle}
                      </div>
                    )}
                  </div>

                  {/* Sub Banner */}
                  <div
                    style={{
                      background: '#0f294a',
                      color: '#ffffff',
                      fontSize: '6.4pt',
                      fontWeight: 700,
                      textAlign: 'center',
                      padding: '2px 2px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Shareholding Composition
                  </div>

                  {/* 5-Column Table */}
                  <div style={{padding: '2px 3px', flex: 1, minWidth: 0, overflow: 'hidden'}}>
                    <table
                      style={{
                        width: '100%',
                        tableLayout: 'fixed',
                        borderCollapse: 'collapse',
                        fontSize: '5.2pt',
                        lineHeight: 1.2,
                      }}
                    >
                      <colgroup>
                        <col style={{width: '26%'}} />
                        <col style={{width: '25%'}} />
                        <col style={{width: '6%'}} />
                        <col style={{width: '14%'}} />
                        <col style={{width: '29%'}} />
                      </colgroup>
                      <thead>
                        <tr
                          style={{
                            background: '#f8fafc',
                            borderBottom: '1px solid #cbd5e1',
                            color: '#1e293b',
                          }}
                        >
                          <th
                            style={{
                              padding: '2px 2px',
                              textAlign: 'left',
                              fontWeight: 700,
                              verticalAlign: 'top',
                            }}
                          >
                            Name
                          </th>
                          <th
                            style={{
                              padding: '2px 2px',
                              textAlign: 'left',
                              fontWeight: 700,
                              verticalAlign: 'top',
                            }}
                          >
                            Position
                          </th>
                          <th
                            style={{
                              padding: '2px 0px',
                              textAlign: 'center',
                              fontWeight: 700,
                              verticalAlign: 'top',
                            }}
                            title="Share Class"
                          >
                            Class
                          </th>
                          <th
                            style={{
                              padding: '2px 2px',
                              textAlign: 'right',
                              fontWeight: 700,
                              verticalAlign: 'top',
                            }}
                          >
                            Shares
                          </th>
                          <th
                            style={{
                              padding: '2px 2px',
                              textAlign: 'right',
                              fontWeight: 700,
                              verticalAlign: 'top',
                            }}
                          >
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(sub.shareholders || []).map((sh, idx) => (
                          <tr key={idx} style={{borderBottom: '1px solid #f1f5f9'}}>
                            <td
                              style={{
                                padding: '2px 2px',
                                fontWeight: 600,
                                color: '#0f172a',
                                verticalAlign: 'top',
                                wordBreak: 'normal',
                                lineHeight: 1.15,
                              }}
                            >
                              {sh.name}
                            </td>
                            <td
                              style={{
                                padding: '2px 2px',
                                color: '#475569',
                                verticalAlign: 'top',
                                wordBreak: 'normal',
                                lineHeight: 1.15,
                              }}
                            >
                              {sh.position || sh.role || '-'}
                            </td>
                            <td
                              style={{
                                padding: '2px 0px',
                                textAlign: 'center',
                                color: '#64748b',
                                verticalAlign: 'top',
                              }}
                            >
                              {sh.shareClass || '-'}
                            </td>
                            <td
                              style={{
                                padding: '2px 2px',
                                textAlign: 'right',
                                color: '#0f172a',
                                verticalAlign: 'top',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {sh.numberOfShares || sh.percentage || '-'}
                            </td>
                            <td
                              style={{
                                padding: '2px 2px',
                                textAlign: 'right',
                                fontWeight: 600,
                                color: '#0f172a',
                                verticalAlign: 'top',
                                whiteSpace: 'nowrap',
                                fontSize: '5.1pt',
                              }}
                            >
                              {sh.total || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Capital Summary */}
                  <div
                    style={{
                      padding: '3px 4px 4px 4px',
                      borderTop: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      fontSize: '5.5pt',
                      lineHeight: 1.25,
                      color: '#1e293b',
                    }}
                  >
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                      <tbody>
                        <tr>
                          <td
                            style={{
                              fontWeight: 700,
                              color: '#334155',
                              padding: '1px 0',
                              verticalAlign: 'middle',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Authorized Capital
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 600,
                              color: '#0f172a',
                              padding: '1px 0',
                              verticalAlign: 'middle',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {sub.authorizedCapital || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td
                            style={{
                              fontWeight: 700,
                              color: '#334155',
                              padding: '1px 0',
                              verticalAlign: 'middle',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Issued & Paid-up Capital
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 600,
                              color: '#0f172a',
                              padding: '1px 0',
                              verticalAlign: 'middle',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {sub.paidUpCapital || '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
