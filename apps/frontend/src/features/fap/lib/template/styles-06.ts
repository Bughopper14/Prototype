/** Style rules of the FAP sheet, part 6. */
export const FAP_STYLES_06 = `	border-left:none;}
.xl239
	{mso-style-parent:style0;
	color:#A6A6A6;
	font-size:24.0pt;
	font-style:italic;
	text-align:center;
	vertical-align:middle;
	border-top:1.0pt solid windowtext;
	border-right:none;
	border-bottom:none;
	border-left:1.0pt solid windowtext;
	white-space:normal;}
.xl240
	{mso-style-parent:style0;
	color:#A6A6A6;
	font-size:24.0pt;
	font-style:italic;
	text-align:center;
	vertical-align:middle;
	border-top:1.0pt solid windowtext;
	border-right:none;
	border-bottom:none;
	border-left:none;
	white-space:normal;}
.xl241
	{mso-style-parent:style0;
	color:#A6A6A6;
	font-size:24.0pt;
	font-style:italic;
	text-align:center;
	vertical-align:middle;
	border-top:1.0pt solid windowtext;
	border-right:1.0pt solid windowtext;
	border-bottom:none;
	border-left:none;
	white-space:normal;}
.xl242
	{mso-style-parent:style0;
	color:#A6A6A6;
	font-size:24.0pt;
	font-style:italic;
	text-align:center;
	vertical-align:middle;
	border-top:none;
	border-right:none;
	border-bottom:none;
	border-left:1.0pt solid windowtext;
	white-space:normal;}
.xl243
	{mso-style-parent:style0;
	color:#A6A6A6;
	font-size:24.0pt;
	font-style:italic;
	text-align:center;
	vertical-align:middle;
	white-space:normal;}
.xl244
	{mso-style-parent:style0;
	color:#A6A6A6;
	font-size:24.0pt;
	font-style:italic;
	text-align:center;
	vertical-align:middle;
	border-top:none;
	border-right:1.0pt solid windowtext;
	border-bottom:none;
	border-left:none;
	white-space:normal;}


    body {
        margin: 0 !important;
        padding: 16px !important;
        background: #ffffff !important;
        -webkit-font-smoothing: antialiased;
    }
    .fap-autofill-val {
        color: #002060 !important;
        font-weight: 700 !important;
        text-align: center !important;
        vertical-align: middle !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        word-break: normal !important;
        line-height: 1.25 !important;
        box-sizing: border-box !important;
        padding: 4px 6px !important;
    }
    .fap-chk-val {
        font-size: 56pt !important;
        font-weight: 900 !important;
        text-align: center !important;
        vertical-align: middle !important;
        color: #002060 !important;
        line-height: 1 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    }
    .fap-address-box {
        vertical-align: middle !important;
        text-align: center !important;
        padding: 4px 6px !important;
        line-height: 1.25 !important;
        font-size: 24pt !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
    }
    [id^="fap-cell-"], td.fap-autofill-val {
        transition: background-color 0.6s cubic-bezier(0.25, 1, 0.5, 1),
                    box-shadow 0.6s cubic-bezier(0.25, 1, 0.5, 1),
                    outline 0.6s cubic-bezier(0.25, 1, 0.5, 1),
                    color 0.4s ease !important;
        outline: 0px solid rgba(37, 99, 235, 0);
        outline-offset: -1px;
    }
    @keyframes fapSlowFadeInOut {
        0% {
            background-color: transparent;
            outline: 0px solid rgba(37, 99, 235, 0);
            box-shadow: inset 0 0 0 0 rgba(37, 99, 235, 0), 0 0 0 rgba(37, 99, 235, 0);
            color: inherit;
        }
        16% {
            /* Smooth gentle fade in (~0.5s) */
            background-color: #dbeafe;
            outline: 3.5px solid #2563eb;
            box-shadow: inset 0 0 0 3px #2563eb, 0 0 20px rgba(37, 99, 235, 0.65);
            color: #1e3a8a;
        }
        48% {
            /* Gentle breathing peak (~1.5s) */
            background-color: #bfdbfe;
            outline: 4px solid #1d4ed8;
            box-shadow: inset 0 0 0 4px #1d4ed8, 0 0 26px rgba(37, 99, 235, 0.8);
            color: #1e3a8a;
        }
        72% {
            /* Sustained highlight (~2.2s) */
            background-color: #dbeafe;
            outline: 3.5px solid #2563eb;
            box-shadow: inset 0 0 0 3px #2563eb, 0 0 18px rgba(37, 99, 235, 0.55);
            color: #1e3a8a;
        }
        100% {
            /* Smooth gentle fade out back to normal (~3.0s) */
            background-color: transparent;
            outline: 0px solid rgba(37, 99, 235, 0);
            box-shadow: inset 0 0 0 0 rgba(37, 99, 235, 0), 0 0 0 rgba(37, 99, 235, 0);
            color: inherit;
        }
    }
    .fap-cell-highlight {
        animation: fapSlowFadeInOut 3s cubic-bezier(0.25, 1, 0.5, 1) forwards !important;
        outline-offset: -1px !important;
        z-index: 100 !important;
        position: relative !important;
    }
    .fap-cell-highlight * {
        color: #1e3a8a !important;
        font-weight: 700 !important;
    }
    .fap-section-highlight {
        animation: fapSlowFadeInOut 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards !important;
        outline-offset: -1px !important;
        z-index: 90 !important;
        position: relative !important;
    }
    @media print {
        @page {
            size: A4 portrait;
            margin: 4mm 3mm 3mm 3mm;
        }
        html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            zoom: 0.175 !important;
        }
        span[style*="vglayout2"] td,
        span[style*="vglayout2"] table {
            border: none !important;
        }
        table {
            margin: 0 auto !important;
            transform: scaleX(1.0545) !important;
            transform-origin: top center !important;
        }
        .fap-page-2-start {
            page-break-before: always !important;
            break-before: page !important;
        }
        .fap-spacer-row {
            height: 12px !important;
            line-height: 0 !important;
        }
        .fap-cell-highlight, .fap-section-highlight, .fap-diff-warning-cell {
            outline: none !important;
            box-shadow: none !important;
            animation: none !important;
            background-color: transparent !important;
        }
        tr.fap-spacer-row, tr.fap-spacer-row td {
            height: 6pt !important;
        }
    }

    @media screen {
        html {
            background-color: #525659 !important;
            margin: 0 !important;
            padding: 16px 20px 40px 20px !important;
            min-height: 100% !important;
            display: flex !important;
            justify-content: center !important;
            width: max-content !important;
            min-width: 100% !important;
            box-sizing: border-box !important;
        }
        body {
            background-color: #ffffff !important;
            margin: 0 auto !important;
            padding: 60px 140px 80px 120px !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45) !important;
            box-sizing: content-box !important;
            width: 3640px !important;
        }
    }

    table {
        border-left: 1.0pt solid windowtext !important;
        border-top: none !important;
        border-right: none !important;
        margin-left: auto !important;
        margin-right: auto !important;
        transform: scaleX(1.0545) !important;
        transform-origin: top center !important;
    }
    table:first-of-type > tbody > tr:first-child > .xl67,
    table:first-of-type > tbody > tr:first-child > .xl68,
    table:first-of-type > tbody > tr:first-child > .xl69,
    table:first-of-type > tr:first-child > .xl67,
    table:first-of-type > tr:first-child > .xl68,
    table:first-of-type > tr:first-child > .xl69 {
        border-top: 1.0pt solid windowtext !important;
    }
    table.fap-page-2-start {
        border-top: none !important;
    }
    table.fap-page-2-start > tbody > tr:first-child > td,
    table.fap-page-2-start > tr:first-child > td {
        border-top: none !important;
    }
    table.fap-page-2-start > tbody > tr:first-child > td.xl123,
    table.fap-page-2-start > tr:first-child > td.xl123 {
        border-top: 1.0pt solid windowtext !important;
    }
    table.fap-page-2-start > tbody > tr:first-child > td.xl70,
    table.fap-page-2-start > tr:first-child > td.xl70,
    table.fap-page-2-start td.xl70,
    table.fap-page-2-start th.xl70 {
        border: none !important;
    }
    #fap-preview-sec-company > td:not(.xl70) {
        border-top: 0.5pt solid windowtext !important;
    }
    table:first-of-type > tbody > tr:first-child > .xl67,
    table:first-of-type > tr:first-child > .xl67 {
        border-left: 1.0pt solid windowtext !important;
    }
    table:first-of-type > tbody > tr:first-child > .xl69,
    table:first-of-type > tr:first-child > .xl69 {
        border-right: 1.0pt solid windowtext !important;
    }
    span[style*="vglayout2"] table,
    span[style*="vglayout2"] td {
        border: none !important;
    }
    #fap-cell-establishmentActNo,
    #fap-cell-establishmentDate,
    #fap-cell-experienceYears,
    #fap-cell-experienceMonths {
        text-align: center !important;
        vertical-align: middle !important;
    }
    #fap-cell-prop-notes,
    #fap-cell-prop-notes *,
    #fap-cell-prop-notes p,
    #fap-cell-prop-notes span,
    #fap-cell-prop-notes div,
    #fap-cell-prop-notes li,
    #fap-cell-prop-notes td {
        font-size: 24.0pt !important;
        font-family: Calibri, sans-serif !important;
    }
    #fap-cell-prop-notes p {
        margin: 0 0 6px 0 !important;
        line-height: 1.3 !important;
    }
    </style></head>
`;
