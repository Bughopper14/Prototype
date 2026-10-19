import openpyxl, os, base64, html, re

wb_path = r'D:\CRM App2\CRM App2\Application Form APPROVED(mandatory field).xlsx'
wb = openpyxl.load_workbook(wb_path, data_only=True)

# Load logo
logo_path = r'D:\CRM App2\CRM App2\public\excel_assets\image2.jpg'
with open(logo_path, 'rb') as f:
    logo_b64 = base64.b64encode(f.read()).decode('utf-8')

sample_data = {
    'reg_no': 'REG-LFI-2026-0089',
    'date': '19 Oktober 2026',
    'branch': 'Jakarta Head Office',
    'customer_type': 'Baru',
    'segment': 'Corporate',
    'company_name': 'PT SUMBER MAKMUR NUSANTARA',
    'company_address': 'Jl. Jenderal Sudirman Kav. 52-53, Kawasan SCBD Lot 11, Senayan',
    'city': 'Jakarta Selatan',
    'province': 'DKI Jakarta',
    'postal_code': '12190',
    'main_business': 'Kontraktor Alat Berat, Pertambangan Nikel & Batubara',
    'deed_est_no': '08 / Notaris Anita S., S.H., M.Kn.',
    'deed_est_date': '14 Maret 2018',
    'exp_years': '8',
    'exp_months': '7',
    'deed_amend_no': '24 / Notaris Anita S., S.H., M.Kn.',
    'deed_amend_date': '10 Januari 2024',
    'nib': '0123456789012',
    'npwp': '01.234.567.8-012.000',
    'phone': '+62 21 5289-0199',
    'website': 'www.sumbermakmurnusantara.co.id',
    'email': 'corporate.finance@sumbermakmur.co.id',
    'repayment_source': 'Termin Pembayaran Proyek Tambang PT Vale & PT Antam',
    'place_status': 'Milik Sendiri',
    'pic_name': 'Bambang Wijaya, S.T.',
    'pic_position': 'Direktur Utama',
    'pic_address': 'Jl. Bumi Indah No. 12, Kel. Gunung, Kec. Kebayoran Baru',
    'pic_city': 'Jakarta Selatan',
    'pic_province': 'DKI Jakarta',
    'pic_postal': '12120',
}

def render_worksheet_table(ws, sheet_id):
    # Map merged cells
    merged_map = {}
    for rng in ws.merged_cells.ranges:
        for r in range(rng.min_row, rng.max_row + 1):
            for c in range(rng.min_col, rng.max_col + 1):
                if r == rng.min_row and c == rng.min_col:
                    merged_map[(r, c)] = (rng.max_col - rng.min_col + 1, rng.max_row - rng.min_row + 1)
                else:
                    merged_map[(r, c)] = 'skip'

    # Determine column widths for cols 1..20 (A..T)
    col_widths = []
    for c in range(1, 21):
        col_letter = openpyxl.utils.get_column_letter(c)
        w = ws.column_dimensions[col_letter].width or 12.0
        col_widths.append((col_letter, w))
    total_w = sum(w for _, w in col_widths)

    html_out = []
    html_out.append(f'<div class="excel-sheet-wrapper" id="{sheet_id}">')
    html_out.append('<table class="excel-grid-table">')
    
    # colgroup
    html_out.append('<colgroup>')
    for _, w in col_widths:
        pct = (w / total_w) * 100.0
        html_out.append(f'<col style="width: {pct:.2f}%;">')
    html_out.append('</colgroup>')

    html_out.append('<tbody>')

    # Iterate rows 1..118
    for r in range(1, 119):
        # Check if row is completely empty
        has_content = any(ws.cell(r, c).value is not None or (r, c) in merged_map for c in range(1, 21))
        # Special check for separator lines like row 6
        is_row_6 = (r == 6)

        row_h = ws.row_dimensions[r].height
        h_style = f'height: {row_h*1.2:.1f}px;' if row_h and row_h > 20 else ''

        # Anchor section IDs for quick jump
        section_id_attr = ''
        if r == 3: section_id_attr = 'id="sec-header"'
        elif r == 12: section_id_attr = 'id="sec-company"'
        elif r == 25: section_id_attr = 'id="sec-legal"'
        elif r == 46: section_id_attr = 'id="sec-purpose"'
        elif r == 55: section_id_attr = 'id="sec-segmentation"'
        elif r == 64: section_id_attr = 'id="sec-bank-facility"'
        elif r == 74: section_id_attr = 'id="sec-proposed"'
        elif r == 91: section_id_attr = 'id="sec-financial"'
        elif r == 102: section_id_attr = 'id="sec-declaration"'
        elif r == 107: section_id_attr = 'id="sec-signature"'

        html_out.append(f'<tr class="excel-tr row-{r}" {section_id_attr} style="{h_style}">')

        for c in range(1, 21):
            m_info = merged_map.get((r, c))
            if m_info == 'skip':
                continue

            colspan_attr = ''
            rowspan_attr = ''
            if isinstance(m_info, tuple):
                colspan, rowspan = m_info
                if colspan > 1: colspan_attr = f' colspan="{colspan}"'
                if rowspan > 1: rowspan_attr = f' rowspan="{rowspan}"'

            cell = ws.cell(r, c)
            val = cell.value

            # Styling classes & inline styles
            classes = ['excel-td', f'c-{c}', f'r-{r}']
            styles = []

            # Background fill
            fill = cell.fill
            if is_row_6:
                styles.append('background-color: #002060; height: 4px;')
            elif fill and fill.fill_type == 'solid':
                fg = getattr(fill, 'fgColor', None)
                theme = getattr(fg, 'theme', None)
                rgb = getattr(fg, 'rgb', None)
                if isinstance(rgb, str) and rgb.startswith('FF'):
                    styles.append(f'background-color: #{rgb[2:]};')
                elif theme == 9: # green mandatory
                    classes.append('cell-mandatory-green')
                elif theme == 5: # orange structure
                    classes.append('cell-structure-orange')
                elif theme == 0:
                    styles.append('background-color: #ffffff;')

            # Borders
            b = cell.border
            if b:
                if b.top and b.top.style:
                    w = '2px solid #0f172a' if b.top.style == 'medium' else '1px solid #475569'
                    styles.append(f'border-top: {w};')
                if b.bottom and b.bottom.style:
                    w = '2px solid #0f172a' if b.bottom.style == 'medium' else '1px solid #475569'
                    styles.append(f'border-bottom: {w};')
                if b.left and b.left.style:
                    w = '2px solid #0f172a' if b.left.style == 'medium' else '1px solid #475569'
                    styles.append(f'border-left: {w};')
                if b.right and b.right.style:
                    w = '2px solid #0f172a' if b.right.style == 'medium' else '1px solid #475569'
                    styles.append(f'border-right: {w};')

            # Font styling
            fnt = cell.font
            if fnt:
                if fnt.bold: classes.append('font-bold')
                if fnt.italic: classes.append('font-italic')
                if fnt.size and fnt.size > 28: classes.append('text-header-title')
                elif fnt.size and fnt.size >= 24: classes.append('text-xl')
                elif fnt.size and fnt.size >= 14: classes.append('text-lg')

            # Alignment
            align = cell.alignment
            if align:
                if align.horizontal in ['center', 'right']:
                    classes.append(f'text-{align.horizontal}')
                if align.vertical in ['center', 'middle', 'bottom']:
                    classes.append(f'valign-{align.vertical}')

            # Cell Value formatting
            rendered_val = ''
            if r == 3 and c == 1:
                # Custom Header with LiuGong Logo
                rendered_val = f'''
                <div class="fap-app-header-cell">
                    <img src="data:image/jpeg;base64,{logo_b64}" alt="LiuGong Finance Indonesia Logo" class="fap-excel-logo" />
                    <div class="fap-app-title-box">
                        <h1 class="fap-main-heading">APPLICATION FORM</h1>
                        <div class="fap-sub-heading">PT. LIUGONG FINANCE INDONESIA · ORIGINATION WORKSPACE</div>
                    </div>
                </div>
                '''
                classes.append('header-hero-cell')
            elif val is not None:
                str_val = str(val).strip()
                escaped = html.escape(str_val).replace('\n', '<br/>')

                # Highlight placeholders vs sample data
                if str_val in ['1:1', '1:0..1', '1:0..M', '1:1..M', 'drop down', '1 : 1']:
                    rendered_val = f'''
                    <span class="tpl-placeholder">{escaped}</span>
                    <span class="sample-filled-val" data-pos="{openpyxl.utils.get_column_letter(c)}{r}"></span>
                    '''
                    classes.append('has-dynamic-field')
                elif 'drop down' in str_val:
                    rendered_val = f'''
                    <span class="tpl-placeholder tpl-dropdown">{escaped}</span>
                    <span class="sample-filled-val" data-pos="{openpyxl.utils.get_column_letter(c)}{r}"></span>
                    '''
                    classes.append('has-dynamic-field')
                elif str_val == 'AUTO GENERATE':
                    rendered_val = f'''
                    <span class="tpl-placeholder tpl-auto">{escaped}</span>
                    <span class="sample-filled-val" data-pos="{openpyxl.utils.get_column_letter(c)}{r}">REG-LFI-2026-0089</span>
                    '''
                    classes.append('has-dynamic-field')
                elif str_val in ['[sign & company stamp]', '[sign]']:
                    rendered_val = f'''
                    <div class="fap-signature-stamp-box">
                        <div class="sign-seal-icon">🔏</div>
                        <div class="sign-seal-label">{escaped}</div>
                        <div class="sample-signature-overlay">
                            <span class="sample-digital-signature">Bambang Wijaya</span>
                            <span class="sample-stamp-badge">PT SUMBER MAKMUR NUSANTARA<br/>★ METERAI ELEKTRONIK ★</span>
                        </div>
                    </div>
                    '''
                else:
                    rendered_val = escaped
            else:
                rendered_val = '&nbsp;'

            style_attr = f' style="{" ".join(styles)}"' if styles else ''
            class_attr = f' class="{" ".join(classes)}"'
            html_out.append(f'<td{class_attr}{colspan_attr}{rowspan_attr}{style_attr}>{rendered_val}</td>')

        html_out.append('</tr>')

    html_out.append('</tbody></table></div>')
    return '\n'.join(html_out)

fap_stage_html = render_worksheet_table(wb['FAP STAGE'], 'sheet-fap-stage')
pre_analysis_html = render_worksheet_table(wb['PRE ANALYSIS'], 'sheet-pre-analysis')

full_html = f'''<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Form APPROVED · HTML Template Preview | LiuGong Finance</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {{
            --lfi-navy: #00224a;
            --lfi-blue: #004085;
            --lfi-accent-blue: #2563eb;
            --lfi-orange: #d97706;
            --lfi-dark-orange: #c2410c;
            --bg-canvas: #f1f5f9;
            --paper-bg: #ffffff;
            --border-grid: #e2e8f0;
            --text-dark: #0f172a;
            --text-muted: #64748b;
        }}

        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}

        body {{
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-canvas);
            color: var(--text-dark);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
        }}

        /* Top Enterprise Toolbar */
        .excel-viewer-toolbar {{
            position: sticky;
            top: 0;
            z-index: 1000;
            background: linear-gradient(180deg, #001a38 0%, #00224a 100%);
            border-bottom: 2px solid #001428;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
            padding: 8px 16px;
            color: #ffffff;
        }}

        .toolbar-primary-row {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            flex-wrap: wrap;
        }}

        .brand-info {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}

        .brand-logo-mini {{
            height: 32px;
            width: auto;
            background: #ffffff;
            padding: 2px 6px;
            border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }}

        .brand-titles h1 {{
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.5px;
            color: #f8fafc;
            display: flex;
            align-items: center;
            gap: 8px;
        }}

        .brand-titles .badge-approved {{
            background: #10b981;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}

        .brand-titles p {{
            font-size: 11px;
            color: #94a3b8;
        }}

        .toolbar-actions {{
            display: flex;
            align-items: center;
            gap: 8px;
        }}

        .btn-tool {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #0f2c59;
            border: 1px solid #1e3a8a;
            color: #e2e8f0;
            font-size: 12px;
            font-weight: 600;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s ease;
            text-decoration: none;
        }}

        .btn-tool:hover {{
            background: #1e3a8a;
            color: #ffffff;
            border-color: #3b82f6;
        }}

        .btn-tool.active {{
            background: #2563eb;
            color: #ffffff;
            border-color: #60a5fa;
            box-shadow: 0 0 10px rgba(37, 99, 235, 0.4);
        }}

        .btn-tool-accent {{
            background: #d97706;
            border-color: #b45309;
            color: #ffffff;
        }}

        .btn-tool-accent:hover {{
            background: #b45309;
            border-color: #92400e;
        }}

        /* Secondary Navigation Bar */
        .toolbar-secondary-row {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            gap: 12px;
            flex-wrap: wrap;
        }}

        .sheet-tabs {{
            display: flex;
            align-items: center;
            gap: 4px;
        }}

        .sheet-tab-btn {{
            background: rgba(15, 44, 89, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-bottom: none;
            color: #cbd5e1;
            font-size: 12px;
            font-weight: 600;
            padding: 6px 14px;
            border-radius: 6px 6px 0 0;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }}

        .sheet-tab-btn.active {{
            background: #ffffff;
            color: #00224a;
            font-weight: 700;
            border-color: #ffffff;
            box-shadow: 0 -2px 6px rgba(0,0,0,0.1);
        }}

        .quick-nav-pills {{
            display: flex;
            align-items: center;
            gap: 6px;
            overflow-x: auto;
            max-width: 100%;
            padding-bottom: 2px;
        }}

        .quick-nav-pill {{
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #e2e8f0;
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 12px;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.12s;
        }}

        .quick-nav-pill:hover {{
            background: rgba(255, 255, 255, 0.25);
            color: #ffffff;
        }}

        /* Main Workspace Canvas */
        .workspace-viewport {{
            flex: 1;
            overflow: auto;
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            background-color: #cbd5e1;
            background-image: radial-gradient(#94a3b8 1px, transparent 1px);
            background-size: 24px 24px;
        }}

        .paper-canvas {{
            background: #ffffff;
            width: 100%;
            max-width: 1400px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            border-radius: 4px;
            padding: 24px 32px;
            transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            transform-origin: top center;
        }}

        /* Excel Table Base Styles */
        .excel-sheet-wrapper {{
            width: 100%;
            overflow-x: auto;
        }}

        .excel-sheet-wrapper.hidden {{
            display: none;
        }}

        .excel-grid-table {{
            width: 100%;
            border-collapse: collapse;
            font-family: 'Segoe UI', Calibri, -apple-system, sans-serif;
            font-size: 11px;
            line-height: 1.35;
            color: #1e293b;
            table-layout: fixed;
        }}

        .excel-td {{
            padding: 4px 6px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }}

        .excel-tr:hover td {{
            background-color: rgba(241, 245, 249, 0.4);
        }}

        /* Typography & Alignment */
        .font-bold {{ font-weight: 700; color: #0f172a; }}
        .font-italic {{ font-style: italic; }}
        .text-center {{ text-align: center; }}
        .text-right {{ text-align: right; }}
        .valign-top {{ vertical-align: top; }}
        .valign-bottom {{ vertical-align: bottom; }}

        .text-header-title {{
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 1px;
            color: #00224a;
        }}

        .text-xl {{ font-size: 12px; }}
        .text-lg {{ font-size: 11px; }}

        /* Cells with special fills from Excel */
        .cell-mandatory-green {{
            background-color: #e2efda !important;
            border-color: #a9d08e !important;
        }}

        .cell-structure-orange {{
            background-color: #fce4d6 !important;
            border-color: #f4b084 !important;
        }}

        /* Header Hero Cell (Logo + Application Form Title) */
        .fap-app-header-cell {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 0 16px 0;
            border-bottom: 2px solid #002060;
            margin-bottom: 8px;
        }}

        .fap-excel-logo {{
            height: 52px;
            width: auto;
            object-fit: contain;
        }}

        .fap-app-title-box {{
            text-align: right;
        }}

        .fap-main-heading {{
            font-size: 26px;
            font-weight: 900;
            letter-spacing: 1.5px;
            color: #002060;
            line-height: 1;
            margin-bottom: 4px;
        }}

        .fap-sub-heading {{
            font-size: 10px;
            font-weight: 700;
            color: #c2410c;
            letter-spacing: 0.8px;
        }}

        /* Placeholder badges */
        .tpl-placeholder {{
            display: inline-block;
            background: #f1f5f9;
            color: #64748b;
            font-family: 'JetBrains Mono', monospace;
            font-size: 9.5px;
            font-weight: 600;
            padding: 1px 5px;
            border-radius: 3px;
            border: 1px dashed #cbd5e1;
        }}

        .tpl-dropdown {{
            background: #eff6ff;
            color: #2563eb;
            border-color: #bfdbfe;
        }}

        .tpl-auto {{
            background: #fef3c7;
            color: #d97706;
            border-color: #fde68a;
        }}

        /* Filled sample mode */
        .sample-filled-val {{
            display: none;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-weight: 600;
            color: #1e3a8a;
        }}

        body.mode-sample-filled .tpl-placeholder {{
            display: none;
        }}

        body.mode-sample-filled .sample-filled-val {{
            display: inline-block;
        }}

        /* Signature and Stamp Styling */
        .fap-signature-stamp-box {{
            padding: 12px 8px;
            text-align: center;
            border: 1px dashed #94a3b8;
            border-radius: 4px;
            background: #fafafa;
            position: relative;
            min-height: 80px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }}

        .sign-seal-icon {{
            font-size: 18px;
            margin-bottom: 4px;
            opacity: 0.6;
        }}

        .sign-seal-label {{
            font-size: 10px;
            color: #64748b;
            font-style: italic;
        }}

        .sample-signature-overlay {{
            display: none;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
        }}

        body:not(.mode-sample-filled) .sample-signature-overlay {{
            display: none !important;
        }}

        .sample-digital-signature {{
            font-family: 'Brush Script MT', 'Segoe Script', cursive;
            font-size: 22px;
            color: #00224a;
            transform: rotate(-3deg);
        }}

        .sample-stamp-badge {{
            border: 2px solid #c2410c;
            color: #c2410c;
            font-size: 8px;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transform: rotate(2deg);
        }}

        /* Status banner at bottom */
        .excel-viewer-footer {{
            background: #ffffff;
            border-top: 1px solid #e2e8f0;
            padding: 10px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
            color: #64748b;
        }}

        .footer-legend {{
            display: flex;
            align-items: center;
            gap: 16px;
        }}

        .legend-item {{
            display: flex;
            align-items: center;
            gap: 6px;
        }}

        .legend-color-box {{
            width: 12px;
            height: 12px;
            border-radius: 2px;
            border: 1px solid #cbd5e1;
        }}

        /* Print Media Styles */
        @media print {{
            .excel-viewer-toolbar,
            .excel-viewer-footer {{
                display: none !important;
            }}
            body, .workspace-viewport {{
                background: #ffffff !important;
                padding: 0 !important;
            }}
            .paper-canvas {{
                box-shadow: none !important;
                max-width: 100% !important;
                padding: 0 !important;
                transform: none !important;
            }}
            @page {{
                size: A4 landscape;
                margin: 8mm;
            }}
        }}
    </style>
</head>
<body>

    <!-- Top Enterprise Ribbon Toolbar -->
    <header class="excel-viewer-toolbar">
        <div class="toolbar-primary-row">
            <div class="brand-info">
                <img src="data:image/jpeg;base64,{logo_b64}" alt="LiuGong Logo" class="brand-logo-mini" />
                <div class="brand-titles">
                    <h1>
                        Application Form APPROVED (Mandatory Field)
                        <span class="badge-approved">Approved 1:1 Excel</span>
                    </h1>
                    <p>PT LiuGong Finance Indonesia · Form Ref: ver 01/2025 · Standalone HTML Review</p>
                </div>
            </div>

            <div class="toolbar-actions">
                <!-- View Mode Toggle -->
                <button type="button" class="btn-tool active" id="btn-mode-blank" onclick="setMode('blank')">
                    📄 Template Kosong (1:1 Excel)
                </button>
                <button type="button" class="btn-tool" id="btn-mode-sample" onclick="setMode('sample')">
                    📋 Simulasi Data Terisi (PT Sumber Makmur)
                </button>

                <!-- Zoom Controls -->
                <button type="button" class="btn-tool" onclick="setZoom(0.75)">75%</button>
                <button type="button" class="btn-tool active" id="btn-zoom-100" onclick="setZoom(1.0)">100%</button>
                <button type="button" class="btn-tool" onclick="setZoom(1.25)">125%</button>
                <button type="button" class="btn-tool" onclick="setZoom('fit')">Fit</button>

                <!-- Actions -->
                <button type="button" class="btn-tool btn-tool-accent" onclick="window.print()">
                    🖨️ Cetak / PDF
                </button>
                <a href="/excel_assets/Application Form APPROVED(mandatory field).xlsx" download class="btn-tool">
                    ⬇️ Download .xlsx
                </a>
            </div>
        </div>

        <div class="toolbar-secondary-row">
            <!-- Sheet Tabs -->
            <div class="sheet-tabs">
                <button type="button" class="sheet-tab-btn active" id="tab-fap" onclick="switchSheet('sheet-fap-stage')">
                    📑 FAP STAGE (118 Baris)
                </button>
                <button type="button" class="sheet-tab-btn" id="tab-pre" onclick="switchSheet('sheet-pre-analysis')">
                    📑 PRE ANALYSIS (Aturan Field)
                </button>
            </div>

            <!-- Quick Section Navigation -->
            <div class="quick-nav-pills">
                <span style="font-size: 11px; color: #94a3b8; margin-right: 4px;">Lompat Seksi:</span>
                <button type="button" class="quick-nav-pill" onclick="jumpTo('sec-header')">1. Header</button>
                <button type="button" class="quick-nav-pill" onclick="jumpTo('sec-company')">2. Perusahaan & PIC</button>
                <button type="button" class="quick-nav-pill" onclick="jumpTo('sec-legal')">3. Legalitas & Saham</button>
                <button type="button" class="quick-nav-pill" onclick="jumpTo('sec-purpose')">4. Tujuan Pembiayaan</button>
                <button type="button" class="quick-nav-pill" onclick="jumpTo('sec-segmentation')">5. Segmentasi & Proyek</button>
                <button type="button" class="quick-nav-pill" onclick="jumpTo('sec-bank-facility')">6. Fasilitas Bank</button>
                <button type="button" class="quick-nav-pill" onclick="jumpTo('sec-proposed')">7. Facility Proposed</button>
                <button type="button" class="quick-nav-pill" onclick="jumpTo('sec-financial')">8. Laporan Keuangan</button>
                <button type="button" class="quick-nav-pill" onclick="jumpTo('sec-signature')">9. Tanda Tangan</button>
            </div>
        </div>
    </header>

    <!-- Main Viewport Canvas -->
    <main class="workspace-viewport">
        <div class="paper-canvas" id="printable-paper">
            {fap_stage_html}
            {pre_analysis_html}
        </div>
    </main>

    <!-- Footer Legend -->
    <footer class="excel-viewer-footer">
        <div class="footer-legend">
            <span style="font-weight: 700;">Legenda Format Excel Asli:</span>
            <div class="legend-item">
                <div class="legend-color-box" style="background-color: #e2efda; border-color: #a9d08e;"></div>
                <span>Mandatory Field (Hijau Theme 9)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color-box" style="background-color: #fce4d6; border-color: #f4b084;"></div>
                <span>Struktur Organisasi & Saham (Oranye Theme 5)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color-box" style="background-color: #002060;"></div>
                <span>Garis Pembatas Utama (LiuGong Deep Navy)</span>
            </div>
            <div class="legend-item">
                <span class="tpl-placeholder">[1:1]</span>
                <span>Binding Data Otomatis dari Form Input</span>
            </div>
        </div>

        <div>
            Status: <strong>1:1 Template Converted & Ready for Right-Pane Integration</strong>
        </div>
    </footer>

    <script>
        // Sample data mapping to populate [1:1] cells
        const sampleDict = {{
            'C8': '19 Oktober 2026',
            'C9': 'Jakarta Head Office',
            'H8': '[X] Ya',
            'H9': '[ ] Tidak',
            'N8': '[X] Corporate',
            'N9': '[ ] Commercial',
            'E12': 'PT SUMBER MAKMUR NUSANTARA',
            'L12': 'Bambang Wijaya, S.T.',
            'R12': '+62 21 5289-0199',
            'E14': 'Jl. Jenderal Sudirman Kav. 52-53, Kawasan SCBD Lot 11, Senayan',
            'L14': 'Direktur Utama',
            'R14': 'corporate.finance@sumbermakmur.co.id',
            'F16': 'Jakarta Selatan',
            'L16': 'Jl. Bumi Indah No. 12, Kebayoran Baru',
            'F18': 'DKI Jakarta',
            'L18': 'DKI Jakarta',
            'F20': '12190',
            'L20': 'Jakarta Selatan',
            'P20': '12120',
            'E22': 'Kontraktor Alat Berat, Pertambangan Nikel & Batubara',
            'L22': 'DKI Jakarta',
            'P22': '12190',
            'P24': '12120',
            'E25': 'AHU-0019284.AH.01.01.TAHUN 2018',
            'H25': '14 Maret 2018',
            'E27': '8',
            'G27': '6',
            'E29': 'AHU-0098271.AH.01.02.TAHUN 2024',
            'H29': '10 Januari 2024',
            'E32': '0123456789012',
            'E34': '01.234.567.8-012.000',
            'E36': '+62 21 5289-0199 / Fax: +62 21 5289-0198',
            'E38': 'www.sumbermakmurnusantara.co.id',
            'E40': 'corporate.finance@sumbermakmur.co.id',
            'E42': 'Termin Pembayaran Proyek Tambang PT Vale & PT Antam',
            'E44': '[X] Milik Sendiri',
            'I56': 'PT Vale Indonesia Tbk',
            'L56': 'Site Sorowako, Luwu Timur',
            'P56': 'Sub-Contractor',
            'C65': 'Bank Mandiri (Persero) Tbk',
            'F65': 'IDR',
            'G65': '25.000.000.000',
            'I65': '450.000.000'
        }};

        // Apply sample data into data-pos attributes
        document.querySelectorAll('.sample-filled-val').forEach(el => {{
            const pos = el.getAttribute('data-pos');
            if (sampleDict[pos]) {{
                el.innerText = sampleDict[pos];
            }} else {{
                el.innerText = '—';
            }}
        }});

        function setMode(mode) {{
            const btnBlank = document.getElementById('btn-mode-blank');
            const btnSample = document.getElementById('btn-mode-sample');
            if (mode === 'sample') {{
                document.body.classList.add('mode-sample-filled');
                btnSample.classList.add('active');
                btnBlank.classList.remove('active');
            }} else {{
                document.body.classList.remove('mode-sample-filled');
                btnBlank.classList.add('active');
                btnSample.classList.remove('active');
            }}
        }}

        function switchSheet(sheetId) {{
            const sheetFap = document.getElementById('sheet-fap-stage');
            const sheetPre = document.getElementById('sheet-pre-analysis');
            const tabFap = document.getElementById('tab-fap');
            const tabPre = document.getElementById('tab-pre');

            if (sheetId === 'sheet-fap-stage') {{
                sheetFap.classList.remove('hidden');
                sheetPre.classList.add('hidden');
                tabFap.classList.add('active');
                tabPre.classList.remove('active');
            }} else {{
                sheetFap.classList.add('hidden');
                sheetPre.classList.remove('hidden');
                tabFap.classList.remove('active');
                tabPre.classList.add('active');
            }}
        }}

        function setZoom(level) {{
            const paper = document.getElementById('printable-paper');
            if (level === 'fit') {{
                const viewportWidth = window.innerWidth - 64;
                const scale = Math.min(1.0, viewportWidth / 1400);
                paper.style.transform = `scale(${{scale}})`;
            }} else {{
                paper.style.transform = `scale(${{level}})`;
            }}
        }}

        function jumpTo(secId) {{
            const el = document.getElementById(secId);
            if (el) {{
                el.scrollIntoView({{ behavior: 'smooth', block: 'center' }});
                el.style.outline = '3px solid #2563eb';
                setTimeout(() => {{
                    el.style.outline = 'none';
                }}, 2000);
            }}
        }}

        // Initially hide pre analysis sheet
        document.getElementById('sheet-pre-analysis').classList.add('hidden');
    </script>
</body>
</html>
'''

output_path_public = r'D:\CRM App2\CRM App2\public\fap_excel_template_view.html'
output_path_dist = r'D:\CRM App2\CRM App2\dist\fap_excel_template_view.html'

with open(output_path_public, 'w', encoding='utf-8') as f:
    f.write(full_html)
print('Wrote to public:', output_path_public, 'size:', len(full_html))

with open(output_path_dist, 'w', encoding='utf-8') as f:
    f.write(full_html)
print('Wrote to dist:', output_path_dist, 'size:', len(full_html))
