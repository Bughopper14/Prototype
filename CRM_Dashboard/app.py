import os
import sys
import json
import time
import urllib.parse
from datetime import timedelta
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from flask import Flask, send_from_directory, request, Response, session, redirect, url_for, jsonify

app = Flask(__name__)
app.config['SESSION_COOKIE_PATH'] = '/'

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
DIST_DIR = os.path.join(PARENT_DIR, 'dist') if os.path.exists(os.path.join(PARENT_DIR, 'dist')) else os.path.join(BASE_DIR, 'dist')
ASSETS_DIR = os.path.join(DIST_DIR, 'assets')

# Locate global config.json
config_path = os.path.join(PARENT_DIR, 'config.json')
with open(config_path, 'r') as f:
    GLOBAL_CONFIG = json.load(f)

app.secret_key = GLOBAL_CONFIG['server'].get('secret_key', 'default_secret')
INACTIVITY_TIMEOUT_MIN = GLOBAL_CONFIG['server'].get('inactivity_timeout_minutes', 15)
MAX_LIFETIME_MIN = GLOBAL_CONFIG['server'].get('max_session_lifetime_minutes', 120)
app.permanent_session_lifetime = timedelta(minutes=MAX_LIFETIME_MIN)

# Add parent directory to sys.path to access db_connector
if PARENT_DIR not in sys.path:
    sys.path.append(PARENT_DIR)
import db_connector

BACKEND_API_URL = "http://127.0.0.1:3002"

# Persistent HTTP Client with Connection Pooling
http_client = requests.Session()
adapter = HTTPAdapter(pool_connections=25, pool_maxsize=50, max_retries=Retry(total=1, backoff_factor=0.1))
http_client.mount("http://", adapter)
http_client.mount("https://", adapter)

import socket
import subprocess

def is_backend_alive(port=3002):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        s.connect(('127.0.0.1', port))
        s.close()
        return True
    except Exception:
        return False

def ensure_backend_running():
    if not is_backend_alive(3002):
        try:
            proto_dir = PARENT_DIR if os.path.exists(os.path.join(PARENT_DIR, 'package.json')) else os.path.abspath(os.path.join(PARENT_DIR, '..', 'prototype-src'))
            if os.path.exists(proto_dir):
                print(f"[*] Starting CRM Express backend on port 3002 from {proto_dir}...")
                creation_flags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
                subprocess.Popen('cmd.exe /c "npm run start"', cwd=proto_dir, shell=True, creationflags=creation_flags)
                for _ in range(15):
                    time.sleep(0.5)
                    if is_backend_alive(3002):
                        print("[*] CRM Express backend is now online on port 3002.")
                        break
        except Exception as e:
            print(f"[!] Failed to auto-start CRM Express backend: {e}")

# Token cache for SSO
_cached_token = None
_token_expiry = 0

# Token cache for SSO per role
_cached_tokens = {}

def get_backend_session_token(role='MKT', force_refresh=False):
    """
    Auto-authenticates with CRM Express backend (port 3002)
    using internal credentials corresponding to the role and caches the JWT session token.
    """
    global _cached_tokens
    now = time.time()
    
    role_normalized = str(role or 'MKT').upper()
    if role_normalized in ['ADMIN', 'SUPER ADMIN']:
        email = "admin@liugong.local"
    elif role_normalized in ['LEGAL', 'LEGAL OFFICER']:
        email = "legal@liugong.local"
    elif role_normalized in ['BS', 'BUSINESS SUPPORT', 'BRANCH SUPPORT']:
        email = "bs@liugong.local"
    elif role_normalized in ['HEAD_BS', 'HEAD BS']:
        email = "head_bs@liugong.local"
    elif role_normalized in ['CA', 'CREDIT ANALYST']:
        email = "ca@liugong.local"
    elif role_normalized in ['COMMITTEE', 'CREDIT COMMITTEE']:
        email = "committee@liugong.local"
    else:
        email = "mkt@liugong.local"

    cached = _cached_tokens.get(email)
    if not force_refresh and cached and now < cached['expiry']:
        return cached['token']

    if not is_backend_alive(3002):
        ensure_backend_running()

    try:
        resp = http_client.post(
            f"{BACKEND_API_URL}/api/v1/auth/login",
            json={"email": email, "password": "LiuGong2026!"},
            timeout=10
        )
        if resp.status_code == 200:
            token = resp.cookies.get("los_session")
            if token:
                _cached_tokens[email] = {
                    'token': token,
                    'expiry': now + 7200  # 2 hours cache
                }
                return token
        # Fallback to MKT if specific user login failed
        if email != "mkt@liugong.local":
            return get_backend_session_token('MKT', force_refresh)
    except Exception as e:
        print(f"[!] Error auto-authenticating with CRM backend for {email}: {e}")
    return cached.get('token') if cached else None

def resolve_user_crm_role(user_id, username):
    role_info = {'role': 'MKT', 'displayRole': 'Marketing', 'roleBadge': 'MKT', 'isAdmin': False}
    conn_role = get_db_connection()
    if conn_role and user_id:
        try:
            # If user is administrator in portal or database, always grant ADMIN
            is_portal_admin = session.get('is_admin') is True
            is_db_admin = db_connector.is_admin_user(conn_role, user_id)
            is_named_admin = str(username or '').lower() in ['admin', 'axel@liugongfinance.com'] or user_id in [1, 2]
            if is_portal_admin or is_db_admin or is_named_admin:
                return {'role': 'ADMIN', 'displayRole': 'Administrator', 'roleBadge': 'ADMIN', 'isAdmin': True}

            role_rows = db_connector.execute_query(conn_role, """
                SELECT r.role_name FROM user_app_roles uar
                JOIN roles r ON uar.role_id = r.id
                WHERE uar.user_id = %s AND uar.app_id = 2
            """, (user_id,))
            if role_rows:
                crm_role_name = role_rows[0]['role_name']
                if 'Admin' in crm_role_name or 'Super' in crm_role_name:
                    role_info = {'role': 'ADMIN', 'displayRole': 'Administrator', 'roleBadge': 'ADMIN', 'isAdmin': True}
                elif 'MKT' in crm_role_name or 'Marketing' in crm_role_name:
                    role_info = {'role': 'MKT', 'displayRole': 'Marketing', 'roleBadge': 'MKT', 'isAdmin': False}
                elif 'BS' in crm_role_name or 'Branch Support' in crm_role_name or 'Business Support' in crm_role_name:
                    role_info = {'role': 'BS', 'displayRole': 'Business Support', 'roleBadge': 'BS', 'isAdmin': False}
                elif 'CA' in crm_role_name or 'Credit Analyst' in crm_role_name:
                    role_info = {'role': 'CA', 'displayRole': 'Credit Analyst', 'roleBadge': 'CA', 'isAdmin': False}
                elif 'LEGAL' in crm_role_name or 'Legal' in crm_role_name:
                    role_info = {'role': 'LEGAL', 'displayRole': 'Legal Officer', 'roleBadge': 'LEGAL', 'isAdmin': False}
                elif 'Committee' in crm_role_name:
                    role_info = {'role': 'COMMITTEE', 'displayRole': 'Credit Committee', 'roleBadge': 'COMMITTEE', 'isAdmin': False}
                else:
                    clean_role = crm_role_name.upper().replace(' ', '_')
                    role_info = {'role': clean_role, 'displayRole': crm_role_name, 'roleBadge': clean_role, 'isAdmin': False}
        finally:
            conn_role.close()
    else:
        if str(username or '').lower() in ['admin', 'axel@liugongfinance.com'] or session.get('is_admin') is True:
            return {'role': 'ADMIN', 'displayRole': 'Administrator', 'roleBadge': 'ADMIN', 'isAdmin': True}
    return role_info

def get_db_connection():
    return db_connector.get_connection(GLOBAL_CONFIG)

def get_internal_crm_db_connection():
    """Returns connection to MySQL internaltest1 (CRM Business Database)"""
    return db_connector.get_connection(GLOBAL_CONFIG)

_valid_app_ids_cache = None
_valid_app_ids_cache_time = 0

def get_mysql_valid_application_ids(force=False):
    """
    Fetches the authoritative list of application IDs existing in MySQL (all_applications table).
    Cached for 15 seconds to eliminate repeated MySQL table scans on every page load.
    """
    global _valid_app_ids_cache, _valid_app_ids_cache_time
    now = time.time()
    if not force and _valid_app_ids_cache is not None and (now - _valid_app_ids_cache_time) < 15:
        return _valid_app_ids_cache

    conn = get_internal_crm_db_connection()
    if not conn:
        return _valid_app_ids_cache
    try:
        rows = db_connector.execute_query(conn, "SELECT application_id FROM all_applications")
        _valid_app_ids_cache = {r['application_id'] for r in rows}
        _valid_app_ids_cache_time = now
        return _valid_app_ids_cache
    except Exception as e:
        print(f"[!] Error reading MySQL all_applications: {e}")
        return _valid_app_ids_cache
    finally:
        conn.close()

def invalidate_valid_app_ids_cache():
    global _valid_app_ids_cache
    _valid_app_ids_cache = None

def log_audit(user_id, action, app_name="CRM Dashboard"):
    conn = get_db_connection()
    if conn:
        try:
            ip_addr = request.headers.get('X-Real-IP', request.headers.get('X-Forwarded-For', request.headers.get('True-Client-IP', request.remote_addr)))
            if ip_addr and ',' in ip_addr: ip_addr = ip_addr.split(',')[0].strip()
            db_connector.execute_query(conn, '''
                INSERT INTO audit_logs (user_id, action, app_name, ip_address)
                VALUES (%s, %s, %s, %s)
            ''', (user_id, action, app_name, ip_addr))
        except Exception as e:
            print(f"[!] Audit log error in CRM Dashboard: {e}")
        finally:
            conn.close()

_app_label_cache = {}

def get_application_label(app_id):
    """Fetches company name and FAP registration number for application_id (cached)"""
    if not app_id:
        return ""
    if app_id in _app_label_cache:
        return _app_label_cache[app_id]
    conn = get_internal_crm_db_connection()
    if not conn:
        return f"ID: {app_id}"
    try:
        rows = db_connector.execute_query(conn, """
            SELECT f.company_name, f.fap_registration_number 
            FROM all_applications a
            LEFT JOIN new_application_fap_stage f ON a.id_fap_stage = f.id_fap_stage
            WHERE a.application_id = %s
        """, (app_id,))
        if rows and rows[0].get('company_name'):
            company = rows[0]['company_name']
            fap = rows[0].get('fap_registration_number')
            lbl = f"{company} (FAP: {fap})" if fap else company
            _app_label_cache[app_id] = lbl
            return lbl
    except Exception as e:
        print(f"[!] Error fetching application label: {e}")
    finally:
        conn.close()
    return f"ID: {app_id}"

def format_crm_mutation_action(method, subpath, req_data_dict=None):
    """Translates backend API mutations into clear, user-friendly Indonesian action descriptions"""
    if subpath == 'intake/drafts' and method == 'POST':
        comp = ''
        if req_data_dict:
            comp = req_data_dict.get('customer', {}).get('companyName') or req_data_dict.get('profile', {}).get('companyName') or ''
        return f"Membuat Draft Aplikasi Baru: {comp}" if comp else "Membuat Draft Aplikasi Baru"
    
    parts = subpath.split('/')
    if len(parts) >= 2 and parts[0] == 'applications':
        app_id = parts[1]
        app_lbl = get_application_label(app_id)
        if len(parts) == 3:
            section = parts[2]
            if section == 'page-1':
                return f"Menyimpan Perubahan Profil Customer & PIC: {app_lbl}"
            elif section == 'page-2':
                return f"Menyimpan Data Finansial: {app_lbl}"
            elif section == 'page-legal':
                return f"Menyimpan Data Legal & Akta: {app_lbl}"
            elif section == 'business':
                return f"Menyimpan Data Usaha, Kontrak & Bank: {app_lbl}"
            elif section == 'transition':
                action_name = req_data_dict.get('action') if req_data_dict else ''
                return f"Melakukan Transisi Workflow [{action_name}] pada {app_lbl}" if action_name else f"Melakukan Transisi Workflow pada {app_lbl}"
        elif len(parts) >= 4 and parts[2] == 'deeds':
            return f"Menyimpan Draft Akta pada {app_lbl}"
        elif len(parts) >= 4 and parts[2] == 'documents':
            if parts[3] == 'upload':
                return f"Mengunggah Dokumen pada {app_lbl}"
            elif parts[3] == 'files' and method == 'DELETE':
                return f"Menghapus File Dokumen pada {app_lbl}"
        elif len(parts) >= 5 and parts[2] == 'checklist' and parts[4] == 'verify':
            is_v = req_data_dict.get('isVerified') if req_data_dict else None
            status_text = "Disetujui" if is_v is True else ("Ditolak" if is_v is False else "Diproses")
            return f"Verifikasi Dokumen ({status_text}) pada {app_lbl}"

    if subpath.startswith('master-data') and method in ['PUT', 'POST', 'PATCH']:
        group = subpath.split('/')[-1] if '/' in subpath else 'Umum'
        return f"Mengubah Master Data [{group}]"

    if subpath.startswith('workspace-data'):
        menu = subpath.split('/')[-1]
        return f"Menyimpan Data Menu [{menu}]"

    return f"Operasi {method} pada /{subpath}"

def get_user_crm_authorities(user_id):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        rows = db_connector.execute_query(conn, """
            SELECT DISTINCT au.authority_name
            FROM user_app_roles uar
            JOIN role_authorities ra ON uar.role_id = ra.role_id
            JOIN authorities au ON ra.authority_id = au.id
            WHERE uar.user_id = %s AND (uar.app_id = 2 OR au.app_id = 2)
        """, (user_id,))
        return [r['authority_name'] for r in rows]
    except Exception as e:
        print(f"[!] Error fetching user CRM authorities: {e}")
        return []
    finally:
        conn.close()

@app.before_request
def check_authorization():
    # Allow assets, OCR scans, and public resources without auth check
    if request.path.startswith('/assets/') or request.path.startswith('/static/') or request.path.startswith('/documents/') or 'ocr/scan' in request.path or 'reverse-lookup' in request.path or 'reverse-lookup' in request.url:
        return

    # Check if user is logged into LiugongApps
    if 'user_id' not in session or not session.get('session_id'):
        session.clear()
        if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.path.startswith('/api/'):
            return jsonify({'error': 'Unauthorized. Sesi Anda telah berakhir.', 'code': 'SESSION_TIMEOUT'}), 401
        return redirect('/login?timeout=1&reason=' + urllib.parse.quote('Sesi Anda telah berakhir. Silakan login kembali.'))

    # Check session validity (Inactivity Timeout & Max Lifetime)
    # Throttled to at most once per 30 seconds per session to eliminate DB lock contention on parallel frontend requests
    now = time.time()
    last_touch = session.get('_crm_last_touch', 0)
    if (now - last_touch) > 30:
        conn_chk = get_db_connection()
        if conn_chk:
            try:
                is_valid, reason = db_connector.validate_and_touch_session(
                    conn_chk, session['user_id'], session.get('session_id'),
                    inactivity_minutes=INACTIVITY_TIMEOUT_MIN,
                    max_lifetime_minutes=MAX_LIFETIME_MIN
                )
                if not is_valid:
                    session.clear()
                    if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.path.startswith('/api/'):
                        return jsonify({'error': reason, 'code': 'SESSION_TIMEOUT'}), 401
                    return redirect(f'/login?timeout=1&reason={urllib.parse.quote(reason)}&next=/crm-dashboard/')
                session['_crm_last_touch'] = now
            finally:
                conn_chk.close()

    # Track active app in session
    if 'active_apps' not in session:
        session['active_apps'] = []

    if 'CRM Dashboard' not in session['active_apps']:
        conn = get_db_connection()
        if conn:
            try:
                ip_addr = request.headers.get('X-Real-IP', request.headers.get('X-Forwarded-For', request.headers.get('True-Client-IP', request.remote_addr)))
                if ip_addr and ',' in ip_addr: ip_addr = ip_addr.split(',')[0].strip()
                user_agent = request.headers.get('User-Agent')
                db_connector.create_session_record(
                    conn, session['user_id'], session.get('session_id', ''),
                    ip_addr, user_agent, 'CRM Dashboard', MAX_LIFETIME_MIN
                )
                
                active_apps = list(session['active_apps'])
                active_apps.append('CRM Dashboard')
                session['active_apps'] = active_apps
            except Exception as e:
                print(f"[!] Session log error in CRM Dashboard: {e}")
            finally:
                conn.close()

        log_audit(session['user_id'], "Masuk ke Aplikasi CRM Dashboard", "CRM Dashboard")

@app.route('/api/heartbeat', methods=['GET', 'POST'])
@app.route('/api/v1/heartbeat', methods=['GET', 'POST'])
def heartbeat():
    if 'user_id' not in session or not session.get('session_id'):
        return jsonify({'status': 'expired', 'message': 'Sesi tidak ditemukan'}), 401

    conn = get_db_connection()
    is_admin = False
    user_timeout = INACTIVITY_TIMEOUT_MIN
    if conn:
        try:
            is_admin = db_connector.is_admin_user(conn, session['user_id'])
            user_timeout = db_connector.get_user_session_timeout(conn, session['user_id'], INACTIVITY_TIMEOUT_MIN)
        finally:
            conn.close()

    is_unlimited = is_admin or user_timeout == 0
    return jsonify({
        'status': 'active',
        'user': session.get('username'),
        'isAdmin': is_admin,
        'inactivity_timeout_minutes': None if is_unlimited else user_timeout,
        'max_lifetime_minutes': None if is_unlimited else MAX_LIFETIME_MIN
    })

def record_user_activity():
    """Records precise user navigation/viewing/editing action in CRM Dashboard"""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json(silent=True) or {}
    action = (data.get('action') or '').strip()
    if not action:
        return jsonify({'error': 'Action is required'}), 400
    
    user_id = session['user_id']
    
    # Avoid duplicate consecutive log within 5 seconds for the exact same action and user
    conn = get_db_connection()
    if conn:
        try:
            recent = db_connector.execute_query(conn, """
                SELECT action FROM audit_logs 
                WHERE user_id = %s AND app_name = 'CRM Dashboard' 
                ORDER BY timestamp DESC LIMIT 1
            """, (user_id,))
            if recent and recent[0]['action'] == action:
                return jsonify({'status': 'ignored', 'message': 'Duplicate activity suppressed'})
        except Exception as e:
            print(f"[!] Error checking recent audit log: {e}")
        finally:
            conn.close()

    log_audit(user_id, action, "CRM Dashboard")
    return jsonify({'status': 'logged', 'action': action})

@app.route('/api/user-activity', methods=['POST'])
@app.route('/api/v1/user-activity', methods=['POST'])
def route_user_activity():
    return record_user_activity()

import ocr_handler

@app.route('/api/v1/ocr/scan', methods=['POST'])
@app.route('/api/ocr/scan', methods=['POST'])
def route_ocr_scan():
    if 'file' not in request.files:
        return jsonify({'error': 'File tidak ditemukan'}), 400
    file_storage = request.files['file']
    doc_type = request.form.get('doc_type', 'auto')
    app_id = request.form.get('application_id') or request.form.get('app_id')
    stakeholder_id = request.form.get('stakeholder_id')
    try:
        result = ocr_handler.scan_document_ocr(file_storage, doc_type, app_id=app_id, stakeholder_id=stakeholder_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': f"Gagal mengekstrak dokumen via OCR: {str(e)}"}), 500

@app.route('/api/v1/stakeholders/documents/save', methods=['POST'])
@app.route('/api/stakeholders/documents/save', methods=['POST'])
def route_save_stakeholder_doc():
    payload = request.get_json(silent=True) or {}
    stakeholder_id = payload.get('stakeholder_id')
    doc_type = payload.get('doc_type', 'ktp')
    data = payload.get('data', {})
    if not stakeholder_id:
        return jsonify({'error': 'stakeholder_id wajib diisi'}), 400
    try:
        result = ocr_handler.save_document_db(GLOBAL_CONFIG, stakeholder_id, doc_type, data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': f"Gagal menyimpan data dokumen: {str(e)}"}), 500

@app.route('/api/v1/stakeholders/documents/<doc_type>/<stakeholder_id>', methods=['GET'])
@app.route('/api/stakeholders/documents/<doc_type>/<stakeholder_id>', methods=['GET'])
def route_get_stakeholder_doc(doc_type, stakeholder_id):
    try:
        data = ocr_handler.get_document_db(GLOBAL_CONFIG, doc_type, stakeholder_id)
        if not data:
            return jsonify({'status': 'not_found', 'data': None}), 404
        return jsonify({'status': 'success', 'data': data})
    except Exception as e:
        return jsonify({'error': f"Gagal mengambil data dokumen: {str(e)}"}), 500

@app.route('/api/v1/wilayah/reverse-lookup', methods=['GET'])
@app.route('/api/wilayah/reverse-lookup', methods=['GET'])
def route_wilayah_reverse_lookup():
    kecamatan = request.args.get('kecamatan', '')
    kelurahan = request.args.get('kelurahan', '')
    postal_code = request.args.get('postalCode', '')
    import re
    c_kec = re.sub(r'[^A-Za-z0-9]', '', kecamatan).upper()
    c_kel = re.sub(r'[^A-Za-z0-9]', '', kelurahan).upper()
    c_pos = re.sub(r'[^A-Za-z0-9]', '', postal_code).upper()

    conn = get_db_connection()
    if not conn:
        return jsonify({'found': False})
    try:
        row = None
        if c_kec and c_kel:
            rows = db_connector.execute_query(conn, """
                SELECT v.id AS village_id, v.name AS village_name, v.postal_code,
                       d.id AS district_id, d.name AS district_name,
                       c.id AS city_id, c.name AS city_name,
                       p.id AS province_id, p.name AS province_name
                FROM master_kelurahan_desa v
                JOIN master_kecamatan d ON v.kecamatan_id=d.id
                JOIN master_kabupaten_kota c ON d.kabupaten_kota_id=c.id
                JOIN master_provinsi p ON c.provinsi_id=p.id
                WHERE REPLACE(UPPER(d.name),' ','')=%s AND REPLACE(UPPER(v.name),' ','')=%s
                LIMIT 1
            """, (c_kec, c_kel))
            if rows:
                row = rows[0]
        if not row and c_pos and c_kec:
            rows = db_connector.execute_query(conn, """
                SELECT v.id AS village_id, v.name AS village_name, v.postal_code,
                       d.id AS district_id, d.name AS district_name,
                       c.id AS city_id, c.name AS city_name,
                       p.id AS province_id, p.name AS province_name
                FROM master_kelurahan_desa v
                JOIN master_kecamatan d ON v.kecamatan_id=d.id
                JOIN master_kabupaten_kota c ON d.kabupaten_kota_id=c.id
                JOIN master_provinsi p ON c.provinsi_id=p.id
                WHERE v.postal_code=%s AND REPLACE(UPPER(d.name),' ','')=%s
                LIMIT 1
            """, (c_pos, c_kec))
            if rows:
                row = rows[0]
        if not row and c_pos:
            rows = db_connector.execute_query(conn, """
                SELECT v.id AS village_id, v.name AS village_name, v.postal_code,
                       d.id AS district_id, d.name AS district_name,
                       c.id AS city_id, c.name AS city_name,
                       p.id AS province_id, p.name AS province_name
                FROM master_kelurahan_desa v
                JOIN master_kecamatan d ON v.kecamatan_id=d.id
                JOIN master_kabupaten_kota c ON d.kabupaten_kota_id=c.id
                JOIN master_provinsi p ON c.provinsi_id=p.id
                WHERE v.postal_code=%s
                LIMIT 1
            """, (c_pos,))
            if rows:
                row = rows[0]
        if not row and c_kec:
            rows = db_connector.execute_query(conn, """
                SELECT NULL AS village_id, NULL AS village_name, NULL AS postal_code,
                       d.id AS district_id, d.name AS district_name,
                       c.id AS city_id, c.name AS city_name,
                       p.id AS province_id, p.name AS province_name
                FROM master_kecamatan d
                JOIN master_kabupaten_kota c ON d.kabupaten_kota_id=c.id
                JOIN master_provinsi p ON c.provinsi_id=p.id
                WHERE REPLACE(UPPER(d.name),' ','')=%s
                LIMIT 1
            """, (c_kec,))
            if rows:
                row = rows[0]
        if not row and c_kel:
            rows = db_connector.execute_query(conn, """
                SELECT v.id AS village_id, v.name AS village_name, v.postal_code,
                       d.id AS district_id, d.name AS district_name,
                       c.id AS city_id, c.name AS city_name,
                       p.id AS province_id, p.name AS province_name
                FROM master_kelurahan_desa v
                JOIN master_kecamatan d ON v.kecamatan_id=d.id
                JOIN master_kabupaten_kota c ON d.kabupaten_kota_id=c.id
                JOIN master_provinsi p ON c.provinsi_id=p.id
                WHERE REPLACE(UPPER(v.name),' ','')=%s
                LIMIT 1
            """, (c_kel,))
            if rows:
                row = rows[0]
        if row:
            return jsonify({
                'found': True,
                'province': row['province_name'],
                'provinceId': row['province_id'],
                'city': row['city_name'],
                'cityRegency': row['city_name'],
                'cityId': row['city_id'],
                'district': row['district_name'],
                'districtId': row['district_id'],
                'village': row['village_name'],
                'villageId': row['village_id'],
                'postalCode': row['postal_code']
            })
        return jsonify({'found': False})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

# =========================================================================
# MIDDLEWARE / MIDDLEMAN API GATEWAY
# Flow: Frontend (React) -> Middleware (Flask) -> Backend (Express 3002) -> Database (MySQL)
# =========================================================================
@app.route('/api/v1/<path:subpath>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def middleware_gateway(subpath):
    if subpath == 'user-activity' and request.method == 'POST':
        return record_user_activity()

    # Direct Portal-authenticated SSO handling
    if subpath == 'auth/me':
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Unauthorized. Sesi Anda telah berakhir.', 'code': 'SESSION_TIMEOUT'}), 401

        fullname = session.get('full_name') or session.get('username') or 'Administrator'
        username = session.get('username') or 'admin'
        email = session.get('email')

        crm_authorities = get_user_crm_authorities(user_id) if user_id else []
        role_info = resolve_user_crm_role(user_id, username)

        if role_info.get('isAdmin'):
            conn_all = get_db_connection()
            if conn_all:
                try:
                    all_rows = db_connector.execute_query(conn_all, "SELECT authority_name FROM authorities WHERE app_id = 2")
                    crm_authorities = [r['authority_name'] for r in all_rows]
                finally:
                    conn_all.close()

        user_data = {
            'id': str(user_id),
            'name': fullname,
            'username': username,
            'email': email or f"{username}@liugong.co.id",
            'role': role_info.get('role', 'MKT'),
            'displayRole': role_info.get('displayRole', 'MKT'),
            'roleBadge': role_info.get('roleBadge', 'MKT'),
            'isAdmin': role_info.get('isAdmin', False),
            'authorities': crm_authorities,
            'source': 'portal'
        }

        token = get_backend_session_token(role_info.get('role', 'MKT'))
        response = jsonify(user_data)
        response.headers['X-Middleware-Gateway'] = 'LiugongApps-Middleman'
        if token:
            response.set_cookie('los_session', token, path='/', httponly=True, samesite='Lax')
        return response

    if subpath == 'auth/login' and request.method == 'POST':
        user_id = session.get('user_id')
        if user_id:
            return middleware_gateway('auth/me')
        return jsonify({'error': 'Silakan gunakan login Portal LiuGong.', 'code': 'PORTAL_LOGIN_REQUIRED'}), 403

    if subpath == 'auth/logout':
        session.clear()
        resp = jsonify({'ok': True, 'redirect': '/login'})
        resp.delete_cookie('los_session', path='/')
        return resp

    if not is_backend_alive(3002):
        ensure_backend_running()

    target_url = f"{BACKEND_API_URL}/api/v1/{subpath}"
    headers = {k: v for k, v in request.headers if k.lower() not in ['host', 'content-length', 'cookie']}
    headers['X-Middleware-Gateway'] = 'LiugongApps-Middleman'
    
    # Audit log on mutation requests (descriptive Indonesian text)
    if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
        user_id = session.get('user_id', 1)
        payload = request.get_json(silent=True) or {}
        action_text = format_crm_mutation_action(request.method, subpath, payload)
        conn = get_db_connection()
        skip_log = False
        if conn:
            try:
                recent = db_connector.execute_query(conn, """
                    SELECT action FROM audit_logs 
                    WHERE user_id = %s AND app_name = 'CRM Dashboard' 
                    ORDER BY timestamp DESC LIMIT 1
                """, (user_id,))
                if recent and (recent[0]['action'] == action_text or action_text.split(':')[0] in recent[0]['action']):
                    skip_log = True
            except Exception:
                pass
            finally:
                conn.close()
        if not skip_log:
            log_audit(user_id, action_text, "CRM Dashboard")

    # Prepare cookies with automatic SSO token
    client_cookies = dict(request.cookies)
    user_id = session.get('user_id')
    username = session.get('username')
    role_info = resolve_user_crm_role(user_id, username) if user_id else {'role': 'ADMIN'}
    token = client_cookies.get('los_session') or get_backend_session_token(role_info.get('role', 'ADMIN'))
    if token:
        client_cookies['los_session'] = token

    # Invalidate valid app IDs cache if a mutation occurred
    if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
        invalidate_valid_app_ids_cache()

    # Middleware Security: Enforce database-level submit lock (is_locked = 1)
    # Prevents bypassing UI disabled attribute via Inspect Element
    if request.method in ['POST', 'PUT'] and ('/stage' in subpath or '/transition' in subpath):
        try:
            req_json = request.get_json(silent=True) or {}
            is_submit_action = (
                req_json.get('stage') == 'Pre-analysis' or 
                req_json.get('action') == 'SUBMIT_TO_BS'
            )
            if is_submit_action:
                parts = subpath.split('/')
                app_id_val = parts[1] if len(parts) > 1 and parts[0] == 'applications' else None
                if app_id_val and app_id_val != 'new':
                    conn_lock = get_db_connection()
                    if conn_lock:
                        try:
                            lock_rows = db_connector.execute_query(conn_lock, """
                                SELECT is_locked, fap_doc_uploaded 
                                FROM application_submit_lock 
                                WHERE application_id = %s
                            """, (app_id_val,))
                            if lock_rows and lock_rows[0].get('is_locked') == 1:
                                return jsonify({
                                    'error': 'Please upload the signed FAP Stage document in the Documents tab first.'
                                }), 403
                        finally:
                            conn_lock.close()
        except Exception as lock_err:
            print(f"[!] Middleware lock validation error: {lock_err}")

    # Determine appropriate timeout:
    # OCR scanning, file uploads, and FAP comparison can take up to 2-3 minutes
    is_long_operation = (
        '/ocr/' in subpath or 
        '/documents/upload' in subpath or 
        '/fap-comparison/run' in subpath or
        subpath.endswith('fap-comparison/run') or
        subpath.endswith('ocr/scan')
    )
    op_timeout = 180 if is_long_operation else 60

    try:
        # Middleman forwards request to Backend Service with connection pooling
        resp = http_client.request(
            method=request.method,
            url=target_url,
            params=request.args,
            headers=headers,
            data=request.get_data(),
            cookies=client_cookies,
            allow_redirects=False,
            timeout=op_timeout
        )

        # If 401 unauthorized, retry once with refreshed token
        if resp.status_code == 401:
            fresh_token = get_backend_session_token(force_refresh=True)
            if fresh_token:
                client_cookies['los_session'] = fresh_token
                resp = http_client.request(
                    method=request.method,
                    url=target_url,
                    params=request.args,
                    headers=headers,
                    data=request.get_data(),
                    cookies=client_cookies,
                    allow_redirects=False,
                    timeout=op_timeout
                )

        # 1. Handle applications listing: Filter out duplicate mock/seed items, keeping only pure MySQL rows
        if subpath == 'applications' and request.method == 'GET' and resp.status_code == 200:
            try:
                raw_apps = resp.json()
                valid_mysql_ids = get_mysql_valid_application_ids()
                if valid_mysql_ids is not None:
                    # Keep only applications present in MySQL all_applications
                    filtered_apps = [a for a in raw_apps if a.get('id') in valid_mysql_ids]
                    response = jsonify(filtered_apps)
                    response.headers['X-Middleware-Gateway'] = 'LiugongApps-Middleman'
                    response.headers['X-Data-Source'] = 'MySQL-InternalTest1'
                    if token and 'los_session' not in request.cookies:
                        response.set_cookie('los_session', token, path='/', httponly=True, samesite='Lax')
                    return response
            except Exception as e:
                print(f"[!] Error filtering application duplicates: {e}")

        # 3. Normal proxy response - filter out all hop-by-hop headers per PEP 3333
        hop_by_hop = {
            'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
            'te', 'trailers', 'transfer-encoding', 'upgrade', 'content-encoding',
            'content-length'
        }
        resp_headers = [(k, v) for k, v in resp.raw.headers.items() if k.lower() not in hop_by_hop]
        proxy_response = Response(resp.content, status=resp.status_code, headers=resp_headers)
        proxy_response.headers['X-Middleware-Gateway'] = 'LiugongApps-Middleman'

        # Ensure client receives backend session cookie
        if token and 'los_session' not in request.cookies:
            proxy_response.set_cookie('los_session', token, path='/', httponly=True, samesite='Lax')

        return proxy_response
    except Exception as e:
        if isinstance(e, (requests.exceptions.ConnectionError, requests.exceptions.Timeout)):
            print(f"[!] Backend service unreachable on 3002 ({e}). Triggering auto-recovery...")
            ensure_backend_running()
            if is_backend_alive(3002):
                try:
                    resp = http_client.request(
                        method=request.method,
                        url=target_url,
                        params=request.args,
                        headers=headers,
                        data=request.get_data(),
                        cookies=client_cookies,
                        allow_redirects=False,
                        timeout=op_timeout
                    )
                    hop_by_hop = {
                        'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
                        'te', 'trailers', 'transfer-encoding', 'upgrade', 'content-encoding',
                        'content-length'
                    }
                    resp_headers = [(k, v) for k, v in resp.raw.headers.items() if k.lower() not in hop_by_hop]
                    proxy_response = Response(resp.content, status=resp.status_code, headers=resp_headers)
                    proxy_response.headers['X-Middleware-Gateway'] = 'LiugongApps-Middleman'
                    if token and 'los_session' not in request.cookies:
                        proxy_response.set_cookie('los_session', token, path='/', httponly=True, samesite='Lax')
                    return proxy_response
                except Exception as retry_err:
                    return jsonify({'error': f'Backend service unreachable: {str(retry_err)}'}), 502
        return jsonify({'error': f'Backend service unreachable: {str(e)}'}), 502

# Serve Static Assets
@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(ASSETS_DIR, filename)

# Serve Uploaded Documents
@app.route('/documents/<path:filename>')
def serve_documents(filename):
    doc_dir_local = os.path.join(BASE_DIR, 'Documents')
    doc_dir_parent = os.path.join(PARENT_DIR, 'Documents')
    doc_dir_proto = os.path.abspath(os.path.join(PARENT_DIR, '..', 'prototype-src', 'Documents'))
    if os.path.exists(os.path.join(doc_dir_local, filename)):
        return send_from_directory(doc_dir_local, filename)
    elif os.path.exists(os.path.join(doc_dir_parent, filename)):
        return send_from_directory(doc_dir_parent, filename)
    elif os.path.exists(os.path.join(doc_dir_proto, filename)):
        return send_from_directory(doc_dir_proto, filename)
    return jsonify({'error': 'Dokumen tidak ditemukan'}), 404

# Serve Frontend Single Page Application
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    if path and os.path.exists(os.path.join(DIST_DIR, path)):
        return send_from_directory(DIST_DIR, path)
    
    user_id = session.get('user_id')
    username = session.get('username')
    role_info = resolve_user_crm_role(user_id, username) if user_id else {'role': 'ADMIN'}
    token = get_backend_session_token(role_info.get('role', 'ADMIN'))
    response = send_from_directory(DIST_DIR, 'index.html')
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    if token:
        response.set_cookie('los_session', token, path='/', httponly=True, samesite='Lax')
    return response

if __name__ == '__main__':
    app.run(port=8087, debug=True)
