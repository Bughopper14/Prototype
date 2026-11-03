import shutil
import os

src_base = r'c:\Users\reage\Documents\ChatGPT\testlfidash\LiugongApps_Clean'
dst_base = r'c:\Users\reage\Documents\ChatGPT\testlfidash\prototype-src'

# Files to copy at root
root_files = [
    'portal.py',
    'server.py',
    'database_init.py',
    'db_connector.py',
    'MYSQL_SETUP.sql',
    'MSSQL_SETUP.sql',
    'requirements.txt',
    'start_server.bat',
    'config.json'
]

for rf in root_files:
    s = os.path.join(src_base, rf)
    d = os.path.join(dst_base, rf)
    if os.path.exists(s):
        shutil.copy2(s, d)
        print(f'Copied {rf}')

# Copy templates directory
s_tmpl = os.path.join(src_base, 'templates')
d_tmpl = os.path.join(dst_base, 'templates')
if os.path.exists(s_tmpl):
    shutil.copytree(s_tmpl, d_tmpl, dirs_exist_ok=True)
    print('Copied templates/')

# Copy static directory
s_stat = os.path.join(src_base, 'static')
d_stat = os.path.join(dst_base, 'static')
if os.path.exists(s_stat):
    shutil.copytree(s_stat, d_stat, dirs_exist_ok=True)
    print('Copied static/')

# Copy User_Management directory (ignoring __pycache__)
s_um = os.path.join(src_base, 'User_Management')
d_um = os.path.join(dst_base, 'User_Management')
if os.path.exists(s_um):
    shutil.copytree(s_um, d_um, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'), dirs_exist_ok=True)
    print('Copied User_Management/')

# Copy CRM_Dashboard essentials
s_crm = os.path.join(src_base, 'CRM_Dashboard')
d_crm = os.path.join(dst_base, 'CRM_Dashboard')
os.makedirs(d_crm, exist_ok=True)
crm_files = ['app.py', 'apply_theme.py', 'ocr_handler.py', 'ocr_cli.py']
for cf in crm_files:
    s = os.path.join(s_crm, cf)
    d = os.path.join(d_crm, cf)
    if os.path.exists(s):
        shutil.copy2(s, d)
        print(f'Copied CRM_Dashboard/{cf}')

print("Ecosystem copying completed successfully.")
