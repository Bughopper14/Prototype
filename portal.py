import os
import sys
import json
import secrets
import urllib.parse
from datetime import timedelta, datetime
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_file, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.config['SESSION_COOKIE_PATH'] = '/'

# Load configuration
executable_dir = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(executable_dir, 'config.json')

if not os.path.exists(config_path):
    base_dir = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    config_path = os.path.join(base_dir, 'config.json')

with open(config_path, 'r') as f:
    config = json.load(f)

app.secret_key = config['server'].get('secret_key', 'default_secret')
INACTIVITY_TIMEOUT_MIN = config['server'].get('inactivity_timeout_minutes', 15)
MAX_LIFETIME_MIN = config['server'].get('max_session_lifetime_minutes', 120)
app.permanent_session_lifetime = timedelta(minutes=MAX_LIFETIME_MIN)

import db_connector

def get_db_connection():
    return db_connector.get_connection(config)

# VAPID KEY SETUP ON STARTUP (Web Push)
def get_vapid_keys():
    conn = get_db_connection()
    if not conn:
        return "", ""
    try:
        keys = db_connector.execute_query(conn, "SELECT public_key, private_key FROM vapid_keys")
        if keys:
            return keys[0]['public_key'], keys[0]['private_key']
        else:
            try:
                from py_vapid import Vapid
                import base64
                from cryptography.hazmat.primitives import serialization
                print("[*] Generating new VAPID keys for Web Push...")
                v = Vapid()
                v.generate_keys()
                
                pub_bytes = v.public_key.public_bytes(
                    encoding=serialization.Encoding.X962,
                    format=serialization.PublicFormat.UncompressedPoint
                )
                pub_b64 = base64.urlsafe_b64encode(pub_bytes).decode('utf-8').rstrip('=')
                
                priv_bytes = v.private_key.private_numbers().private_value.to_bytes(32, 'big')
                priv_b64 = base64.urlsafe_b64encode(priv_bytes).decode('utf-8').rstrip('=')
                
                db_connector.execute_insert(conn, "INSERT INTO vapid_keys (public_key, private_key) VALUES (%s, %s)", (pub_b64, priv_b64))
                return pub_b64, priv_b64
            except Exception as e:
                print(f"[!] VAPID generation error: {e}")
                return "", ""
    except Exception as e:
        print(f"[!] VAPID key fetch error: {e}")
        return "", ""
    finally:
        conn.close()

VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY = get_vapid_keys()

@app.route('/vapid-public-key')
def vapid_public_key():
    return jsonify({'public_key': VAPID_PUBLIC_KEY})

@app.route('/subscribe', methods=['POST'])
def subscribe_push():
    if 'user_id' not in session:
        return jsonify({'error': 'Sesi tidak valid. Silakan login kembali.'}), 401
    
    user_id = session['user_id']
    subscription = request.json
    if not subscription:
        return jsonify({'error': 'Subscription data missing'}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Koneksi database gagal.'}), 500
    
    try:
        sub_str = json.dumps(subscription)
        exists = db_connector.execute_query(conn, "SELECT 1 FROM web_push_subscriptions WHERE user_id = %s AND subscription_json = %s",
                                            (user_id, sub_str))
        if not exists:
            db_connector.execute_insert(conn, "INSERT INTO web_push_subscriptions (user_id, subscription_json) VALUES (%s, %s)",
                                        (user_id, sub_str))
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/service-worker.js')
def service_worker():
    return send_file(os.path.join(app.root_path, 'static', 'js', 'service-worker.js'), mimetype='application/javascript')

@app.route('/manifest.json')
def manifest():
    return send_file(os.path.join(app.root_path, 'static', 'manifest.json'), mimetype='application/json')

def log_audit(user_id, action, app_name="Portal Hub"):
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
            print(f"Audit Log Error: {e}")
        finally:
            conn.close()

@app.route('/assets/<path:filename>')
def serve_portal_assets(filename):
    crm_assets = os.path.join(os.path.dirname(__file__), 'CRM_Dashboard', 'dist', 'assets')
    if os.path.exists(os.path.join(crm_assets, filename)):
        return send_from_directory(crm_assets, filename)
    return "Asset not found", 404

@app.route('/documents/<path:filename>')
def serve_portal_documents(filename):
    crm_docs = os.path.join(os.path.dirname(__file__), 'CRM_Dashboard', 'Documents')
    proto_docs = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'prototype-src', 'Documents'))
    local_file = os.path.join(crm_docs, filename)
    proto_file = os.path.join(proto_docs, filename)
    if os.path.exists(local_file):
        return send_from_directory(crm_docs, filename)
    elif os.path.exists(proto_file):
        return send_from_directory(proto_docs, filename)
    return "Document not found", 404

@app.route('/api/v1/<path:subpath>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def proxy_root_api_to_crm(subpath):
    try:
        from CRM_Dashboard.app import middleware_gateway
        return middleware_gateway(subpath)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.before_request
def global_session_security_check():
    # Public assets & endpoints that do not require authentication
    if (request.path.startswith('/static') or 
        request.path.startswith('/assets') or 
        request.path.startswith('/favicon.ico') or 
        request.path.startswith('/login') or
        request.path.startswith('/manifest.json') or
        request.path.startswith('/service-worker.js') or
        request.path.startswith('/documents') or
        '/reverse-lookup' in request.path):
        return

    # If user is not logged in:
    if 'user_id' not in session or not session.get('session_id'):
        session.clear()
        if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.path.startswith('/api/'):
            return jsonify({'error': 'Sesi Anda telah berakhir atau belum login.', 'code': 'SESSION_TIMEOUT'}), 401
        return redirect('/login?timeout=1&reason=' + urllib.parse.quote('Sesi Anda telah berakhir. Silakan login kembali.'))

    # User has session, validate validity & touch database record
    conn = get_db_connection()
    if conn:
        try:
            is_valid, reason = db_connector.validate_and_touch_session(
                conn, session['user_id'], session['session_id'],
                inactivity_minutes=INACTIVITY_TIMEOUT_MIN,
                max_lifetime_minutes=MAX_LIFETIME_MIN
            )
            if not is_valid:
                session.clear()
                if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.path.startswith('/api/'):
                    return jsonify({'error': reason, 'code': 'SESSION_TIMEOUT'}), 401
                return redirect(f'/login?timeout=1&reason={urllib.parse.quote(reason)}')
        finally:
            conn.close()

@app.route('/api/heartbeat', methods=['POST'])
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

@app.route('/', methods=['GET'])
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('gallery'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    next_url = request.args.get('next') or request.form.get('next')
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        conn = get_db_connection()
        if not conn:
            return "Database connection failed. Please verify database service.", 500
            
        try:
            users = db_connector.execute_query(conn, "SELECT * FROM users WHERE username = %s AND is_active = 1", (username,))
            user = users[0] if users else None
            
            if user and check_password_hash(user['password_hash'], password):
                is_admin = db_connector.is_admin_user(conn, user['id'])
                session.permanent = True
                session['user_id'] = user['id']
                session['username'] = user['username']
                session['full_name'] = user['full_name']
                session['is_admin'] = is_admin
                
                # Clear force_logout_at flag on successful login
                db_connector.execute_query(conn, "UPDATE users SET force_logout_at = NULL WHERE id = %s", (user['id'],))
                
                # Session Logging with Database Expiration and Activity Timestamps
                try:
                    sess_token = secrets.token_hex(16)
                    session['session_id'] = sess_token
                    session['active_apps'] = ['Portal Apps']
                    
                    ip_addr = request.headers.get('X-Real-IP', request.headers.get('X-Forwarded-For', request.headers.get('True-Client-IP', request.remote_addr)))
                    if ip_addr and ',' in ip_addr: ip_addr = ip_addr.split(',')[0].strip()
                    user_agent = request.headers.get('User-Agent')
                    
                    db_connector.create_session_record(conn, user['id'], sess_token, ip_addr, user_agent, 'Portal Apps', MAX_LIFETIME_MIN)
                except Exception as e: 
                    print(f"Session log error: {e}")

                log_audit(user['id'], "User Login")
                if next_url:
                    return redirect(next_url)
                return redirect(url_for('gallery'))
            else:
                return render_template('login.html', error="Invalid username or password", next=next_url)
        finally:
            conn.close()
            
    timeout_msg = request.args.get('reason')
    if not timeout_msg and request.args.get('timeout'):
        timeout_msg = f"Sesi Anda telah berakhir karena tidak ada pergerakan/aktivitas selama {INACTIVITY_TIMEOUT_MIN} menit. Silakan login kembali."
    return render_template('login.html', error=None, timeout_msg=timeout_msg, next=next_url)

@app.route('/logout')
def logout():
    user_id = session.get('user_id')
    session_id = session.get('session_id')
    if user_id:
        log_audit(user_id, "User Logout")
        conn = get_db_connection()
        if conn:
            try:
                if session_id:
                    db_connector.execute_query(conn, """
                        UPDATE session_logs SET logout_time = GETDATE() 
                        WHERE session_id = %s AND logout_time IS NULL
                    """, (session_id,))
                else:
                    db_connector.execute_query(conn, """
                        UPDATE session_logs SET logout_time = GETDATE() 
                        WHERE user_id = %s AND logout_time IS NULL
                    """, (user_id,))
            except Exception as e:
                print(f"Logout update session error: {e}")
            finally:
                conn.close()
    session.clear()
    return redirect(url_for('login'))

@app.route('/api/change-password', methods=['POST'])
def api_change_password():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Sesi tidak valid. Silakan login kembali.'}), 401
    
    data = request.get_json()
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    
    if not current_password or not new_password:
        return jsonify({'success': False, 'error': 'Semua field wajib diisi.'})
    if len(new_password) < 6:
        return jsonify({'success': False, 'error': 'Password baru minimal 6 karakter.'})
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Koneksi database gagal.'})
    
    try:
        users = db_connector.execute_query(conn, 'SELECT id, password_hash FROM users WHERE id = %s AND is_active = 1', (session['user_id'],))
        if not users:
            return jsonify({'success': False, 'error': 'User tidak ditemukan.'})
        
        user = users[0]
        if not check_password_hash(user['password_hash'], current_password):
            return jsonify({'success': False, 'error': 'Password saat ini salah.'})
        
        new_hash = generate_password_hash(new_password)
        db_connector.execute_query(conn, 'UPDATE users SET password_hash = %s WHERE id = %s', (new_hash, session['user_id']))
        log_audit(session['user_id'], 'Changed Password')
        return jsonify({'success': True})
    except Exception as e:
        print(f'Change password error: {e}')
        return jsonify({'success': False, 'error': 'Terjadi kesalahan server.'})
    finally:
        conn.close()

@app.route('/gallery')
def gallery():
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    conn = get_db_connection()
    if not conn:
        return "Database connection failed in Gallery.", 500
        
    apps = db_connector.execute_query(conn, """
        SELECT a.*, r.role_name 
        FROM applications a
        JOIN user_app_roles uar ON a.id = uar.app_id
        JOIN roles r ON uar.role_id = r.id
        WHERE uar.user_id = %s
    """, (session['user_id'],))
    conn.close()
    
    log_audit(session['user_id'], "Viewed Dashboard Gallery")
    return render_template('gallery.html', apps=apps, full_name=session.get('full_name'))

@app.route('/pre_analysis/<path:filename>')
def serve_portal_pre_analysis(filename):
    pre_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pre_analysis')
    return send_from_directory(pre_dir, filename)

