import os

source_css_path = r'c:\Users\reage\Documents\ChatGPT\testlfidash\prototype-src\src\styles.css'
target_css_path = r'C:\Users\reage\Documents\ChatGPT\testlfidash\LiugongApps_Clean\LOS_Dashboard\src\styles.css'

with open(source_css_path, 'r', encoding='utf-8') as f:
    css = f.read()

replacements = [
    ("'DM Sans',Arial,sans-serif", "'Outfit', 'Plus Jakarta Sans', sans-serif"),
    ("--green:#174f3e;", "--green:#002c5f;"),
    ("--dark:#142e28;", "--dark:#001f42;"),
    ("--muted:#7c8984;", "--muted:#64748b;"),
    ("--border:#e6ebe8;", "--border:#e2e8f0;"),
    ("--orange:#eaa358", "--orange:#ff9900;--yellow:#ff9900;--yellow-light:#ffc44d"),
    ("background:#15342b;", "background:#001f42;"),
    ("background:#15372b;", "background:#001f42;"),
    ("background:#102a2266;", "background:rgba(0,31,66,0.6);"),
    ("background:#21543e;", "background:#002c5f;"),
    ("background:#163e2c;", "background:#001a35;"),
    ("background:#cad695;color:#173a2c;", "background:#ff9900;color:#002c5f;"),
    ("background:#d3dfad;color:#233d2a;", "background:#ff9900;color:#002c5f;"),
    ("background:#b8c895;", "background:#002c5f;color:#ff9900;"),
    ("background:#f5f7f6;", "background:#f0f4f9;"),
    ("color:#243a34;", "color:#1e293b;"),
    ("color:#213c32;", "color:#002c5f;"),
    ("color:#87a293;", "color:#ffc44d;"),
    ("color:#adbfb3;", "color:#ffc44d;"),
    ("color:#afc1b5;", "color:rgba(255,255,255,0.75);"),
    ("color:#93aa9b;", "color:rgba(255,255,255,0.65);"),
    ("color:#94ac9c;", "color:rgba(255,255,255,0.65);"),
    ("color:#96b29d;", "color:rgba(255,255,255,0.65);"),
    ("background:#d9c4a3;", "background:linear-gradient(135deg,#ff9900,#ffb833);"),
    ("color:#4f5138;", "color:#002c5f;"),
    ("border-bottom-color:#587c40;color:#4f713b;", "border-bottom-color:#ff9900;color:#002c5f;font-weight:700;"),
    ("background:#edf2e5;border-color:#e0e8d6;", "background:#f0f7ff;border-color:#bae6fd;"),
    ("background:#f2f5ea;color:#87936a;", "background:#eff6ff;color:#002c5f;"),
    ("background:#faf0e2;color:#d7a367;", "background:#fffbeb;color:#f59e0b;"),
    ("background:#e2e9d4;", "background:#cbd5e1;"),
    ("background:#c5d6ad;", "background:#93c5fd;"),
    ("background:#95b086;", "background:#60a5fa;"),
    ("background:#658e67;", "background:#ff9900;"),
    ("background:#2d6449;", "background:#002c5f;")
]

for old, new in replacements:
    css = css.replace(old, new)

extra_css = """
/* ===== LIUGONG THEME OVERRIDES & ENHANCEMENTS ===== */
:root {
  --liugong-blue: #002c5f;
  --liugong-dark: #001f42;
  --liugong-yellow: #ff9900;
  --liugong-yellow-light: #ffc44d;
  --liugong-yellow-badge: rgba(255, 153, 0, 0.2);
  --liugong-bg: #f0f4f9;
}
* {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
}
body {
  background: #f0f4f9 !important;
  color: #1e293b !important;
}
.sidebar {
  background: #001f42 !important;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}
.brand strong {
  color: #ffffff !important;
}
.brand small {
  color: #ffc44d !important;
  font-weight: 700;
  letter-spacing: 1.5px;
}
.brand-mark {
  background: linear-gradient(135deg, #ff9900, #ffb833) !important;
  color: #002c5f !important;
  font-weight: 800 !important;
}
.workspace {
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 8px !important;
}
.workspace-logo {
  background: #ff9900 !important;
  color: #002c5f !important;
}
.nav-label {
  color: #ffc44d !important;
  font-weight: 700 !important;
  letter-spacing: 1.5px !important;
}
nav button.active {
  background: #ff9900 !important;
  color: #002c5f !important;
  font-weight: 700 !important;
  box-shadow: 0 4px 14px rgba(255, 153, 0, 0.3) !important;
}
nav button.active em {
  background: #002c5f !important;
  color: #ff9900 !important;
  font-weight: 700 !important;
}
.topbar {
  background: #ffffff !important;
  border-bottom: 2px solid #e2e8f0 !important;
  box-shadow: 0 2px 10px rgba(0, 44, 95, 0.04);
}
.topbar-portal-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #eff6ff !important;
  color: #002c5f !important;
  border: 1px solid #bfdbfe !important;
  border-radius: 8px !important;
  padding: 6px 14px !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  text-decoration: none !important;
  transition: all 0.2s;
}
.topbar-portal-btn:hover {
  background: #dbeafe !important;
  color: #001f42 !important;
  transform: translateY(-1px);
}
.eyebrow {
  color: #ff9900 !important;
  font-weight: 700 !important;
  letter-spacing: 1.5px !important;
}
.page-heading h1, .detail-heading h1, h1, h2, h3 {
  color: #002c5f !important;
}
.button.primary {
  background: #002c5f !important;
  border-color: #002c5f !important;
  color: #ffffff !important;
  box-shadow: 0 3px 8px rgba(0, 44, 95, 0.18) !important;
}
.button.primary:hover {
  background: #001a35 !important;
  border-color: #001a35 !important;
}
.stat-card {
  border-radius: 14px !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 4px 16px rgba(0, 44, 95, 0.05) !important;
}
.stat-card>strong {
  color: #002c5f !important;
}
.stat-card.stat-3 {
  background: linear-gradient(135deg, #f0f7ff, #e0effe) !important;
  border-color: #bae6fd !important;
}
.panel {
  border-radius: 14px !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 4px 16px rgba(0, 44, 95, 0.05) !important;
}
.panel-head h2 {
  color: #002c5f !important;
}
.panel-head h2>span {
  background: #eff6ff !important;
  color: #1d4ed8 !important;
  font-weight: 700 !important;
}
.badge.approved, .badge.verified, .badge.bs_verified {
  background: #ecfdf5 !important;
  color: #047857 !important;
  border: 1px solid #a7f3d0 !important;
}
.badge.in_ca_legal_review, .badge.uploaded {
  background: #eff6ff !important;
  color: #1d4ed8 !important;
  border: 1px solid #bfdbfe !important;
}
.badge.submitted_to_bs, .badge.credit_committee_review {
  background: #fffbeb !important;
  color: #b45309 !important;
  border: 1px solid #fde68a !important;
}
.badge.returned, .badge.rejected {
  background: #fef2f2 !important;
  color: #b91c1c !important;
  border: 1px solid #fecaca !important;
}
.welcome-section-dash {
  background: linear-gradient(135deg, #002c5f 0%, #003d7a 100%);
  border-radius: 16px;
  padding: 24px 28px;
  color: white;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 44, 95, 0.2);
}
.welcome-section-dash h2 {
  color: #ffffff !important;
  font-size: 1.4rem;
  font-weight: 800;
  margin: 0 0 6px;
}
.welcome-section-dash p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.88rem;
  margin: 0;
}
.orange-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 153, 0, 0.2);
  border: 1px solid rgba(255, 153, 0, 0.4);
  color: #ffc44d;
  border-radius: 30px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 12px;
  margin-bottom: 10px;
}
.text-link {
  color: #002c5f !important;
  font-weight: 600 !important;
}
.text-link:hover {
  color: #ff9900 !important;
}
.company-cell b {
  color: #002c5f !important;
}
.amount {
  color: #002c5f !important;
  font-weight: 700 !important;
}
"""

with open(target_css_path, 'w', encoding='utf-8') as f:
    f.write(css + '\n' + extra_css)

print('Updated styles.css successfully!')
