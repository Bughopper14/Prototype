import pyodbc
import os
import json
import sys
import urllib.parse
from flask import Flask, render_template, session, redirect, url_for, request, jsonify
from werkzeug.security import generate_password_hash
from datetime import timedelta
from collections import defaultdict

app = Flask(__name__)
app.config['SESSION_COOKIE_PATH'] = '/'
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.jinja_env.auto_reload = True

# Locate config.json (in parent directory or executable directory)
executable_dir = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
config_path = os.path.join(executable_dir, 'config.json')

if not os.path.exists(config_path):
    base_dir = getattr(sys, '_MEIPASS', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    config_path = os.path.join(base_dir, 'config.json')

with open(config_path, 'r') as f:
    GLOBAL_CONFIG = json.load(f)

# Allow importing db_connector from project root
sys.path.append(os.path.dirname(config_path))
import db_connector

app.secret_key = GLOBAL_CONFIG['server'].get('secret_key', 'default_secret')
INACTIVITY_TIMEOUT_MIN = GLOBAL_CONFIG['server'].get('inactivity_timeout_minutes', 15)
MAX_LIFETIME_MIN = GLOBAL_CONFIG['server'].get('max_session_lifetime_minutes', 120)
app.permanent_session_lifetime = timedelta(minutes=MAX_LIFETIME_MIN)

def get_db_connection():
    return db_connector.get_connection(GLOBAL_CONFIG)

def log_audit(user_id, action, app_name="User Management"):
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
            print(f"Audit log error: {e}")
        finally:
            conn.close()

def has_authority(user_id, authority_name):
    conn = get_db_connection()
    if not conn:
        return False
    try:
        rows = db_connector.execute_query(conn, """
            SELECT 1 FROM user_app_roles uar
            JOIN roles r ON uar.role_id = r.id
            JOIN role_authorities ra ON r.id = ra.role_id
            JOIN authorities auth ON ra.authority_id = auth.id
            WHERE uar.user_id = %s AND auth.authority_name = %s
        """, (user_id, authority_name))
        return len(rows) > 0
    except Exception as e:
        print(f"Authority check error: {e}")
        return False
    finally:
        if conn:
            conn.close()

@app.before_request
def check_authorization():
    if request.path.startswith('/static') or request.path.startswith('/favicon.ico'):
        return

    if 'user_id' not in session:
        return redirect('/login')

    # Check if session has timed out due to inactivity or max lifetime
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
                return redirect(f'/login?timeout=1&reason={urllib.parse.quote(reason)}')
        finally:
            conn_chk.close()
        
    # Check if user has manage_system authority
    if not has_authority(session['user_id'], 'manage_system'):
        return redirect('/?error=Unauthorized+Access+to+User+Management')
        
    # Session tracking for User Management app
    if 'session_id' not in session:
        import secrets
        session['session_id'] = secrets.token_hex(16)
        
    if 'active_apps' not in session:
        session['active_apps'] = []
        
    if 'User Management' not in session['active_apps']:
        conn = get_db_connection()
        if conn:
            try:
                ip_addr = request.headers.get('X-Real-IP', request.headers.get('X-Forwarded-For', request.headers.get('True-Client-IP', request.remote_addr)))
                if ip_addr and ',' in ip_addr: ip_addr = ip_addr.split(',')[0].strip()
                user_agent = request.headers.get('User-Agent')
                db_connector.create_session_record(
                    conn, session['user_id'], session['session_id'],
                    ip_addr, user_agent, 'User Management', MAX_LIFETIME_MIN
                )
                
                active_apps = list(session['active_apps'])
                active_apps.append('User Management')
                session['active_apps'] = active_apps
            except Exception as e:
                print(f"Session log error in User Management: {e}")
            finally:
                conn.close()
            
        log_audit(session['user_id'], "Accessed User Management Application", "User Management")

@app.route('/api/heartbeat', methods=['GET', 'POST'])
def heartbeat():
    if 'user_id' not in session or not session.get('session_id'):
        return jsonify({'status': 'expired', 'message': 'Sesi tidak ditemukan'}), 401
    
    conn = get_db_connection()
    user_timeout = 15
    if conn:
        try:
            user_timeout = db_connector.get_user_session_timeout(conn, session['user_id'], default_minutes=INACTIVITY_TIMEOUT_MIN)
        finally:
            conn.close()

    is_unlimited = (user_timeout == 0)
    return jsonify({
        'status': 'active',
        'user': session.get('username'),
        'inactivity_timeout_minutes': None if is_unlimited else user_timeout,
        'max_lifetime_minutes': None if is_unlimited else MAX_LIFETIME_MIN
    })

@app.route('/')
def index():
    conn = get_db_connection()
    users, roles, authorities, role_auths, applications, audits, sessions = [], [], [], {}, [], [], []
    if conn:
        try:
            users = db_connector.execute_query(conn, """
                SELECT u.id, u.username, u.full_name, u.position, u.email, u.session_timeout_minutes, r.role_name 
                FROM users u 
                LEFT JOIN user_app_roles uar ON u.id = uar.user_id AND uar.app_id = 1
                LEFT JOIN roles r ON uar.role_id = r.id AND r.app_id = 1
            """)
            
            applications = db_connector.execute_query(conn, "SELECT * FROM applications")
            roles = db_connector.execute_query(conn, "SELECT r.*, a.app_name FROM roles r LEFT JOIN applications a ON r.app_id = a.id")
            authorities = db_connector.execute_query(conn, "SELECT au.*, a.app_name FROM authorities au LEFT JOIN applications a ON au.app_id = a.id")
            ras = db_connector.execute_query(conn, "SELECT * FROM role_authorities")
            
            audits = db_connector.execute_query(conn, "SELECT top 500 a.*, u.username FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.timestamp DESC")
            sessions = db_connector.execute_query(conn, "SELECT top 500 s.*, u.username FROM session_logs s LEFT JOIN users u ON s.user_id = u.id ORDER BY s.login_time DESC")

            ra_map = defaultdict(list)
            for row in ras:
                ra_map[row['role_id']].append(row['authority_id'])
            role_auths = dict(ra_map)
        except Exception as e:
            print(f"Error in User Management index: {e}")
        finally:
            conn.close()
        
    return render_template('admin.html',
        full_name=session.get('full_name'), 
        users=users, roles=roles, authorities=authorities, role_auths=role_auths, applications=applications, audits=audits, sessions=sessions)

@app.route('/api/user/session_timeout', methods=['POST'])
def set_user_session_timeout():
    if 'user_id' not in session or not has_authority(session['user_id'], 'manage_system'):
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.json if request.is_json else request.form
    target_user_id = data.get('user_id')
    timeout_raw = data.get('timeout_minutes')

    if target_user_id is None or timeout_raw is None:
        return jsonify({'error': 'user_id and timeout_minutes are required'}), 400

    try:
        timeout_val = int(timeout_raw)
        if timeout_val < 0:
            return jsonify({'error': 'timeout_minutes must be >= 0'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid number for timeout_minutes'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database error'}), 500

    try:
        u_rows = db_connector.execute_query(conn, "SELECT username FROM users WHERE id = %s", (target_user_id,))
        if not u_rows:
            return jsonify({'error': 'User not found'}), 404
        target_username = u_rows[0]['username']

        db_connector.execute_query(
            conn, 
            "UPDATE users SET session_timeout_minutes = %s WHERE id = %s", 
            (timeout_val, target_user_id), 
            commit=True
        )

        timeout_desc = "Unlimited (tanpa batas)" if timeout_val == 0 else f"{timeout_val} menit"
        log_audit(
            session['user_id'], 
            f"Set session timeout user '{target_username}' (ID: {target_user_id}) ke {timeout_desc}", 
            "User Management"
        )
        return jsonify({
            'success': True, 
            'timeout_minutes': timeout_val,
            'message': f"Session timeout user '{target_username}' berhasil diubah ke {timeout_desc}."
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/user_permissions/<int:user_id>', methods=['GET', 'POST'])
def user_permissions(user_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500

    if request.method == 'GET':
        try:
            apps = db_connector.execute_query(conn, "SELECT * FROM applications")
            curs = db_connector.execute_query(conn, "SELECT app_id, role_id FROM user_app_roles WHERE user_id = %s", (user_id,))
            current = {r['app_id']: r['role_id'] for r in curs}
            all_roles = db_connector.execute_query(conn, "SELECT id, role_name, app_id FROM roles")
            
            return jsonify({
                'applications': apps,
                'current_permissions': current,
                'all_roles': all_roles
            })
        finally:
            conn.close()
    
    else:  # POST
        try:
            data = request.json  # Expecting {app_id: role_id, ...}
            db_connector.execute_query(conn, "DELETE FROM user_app_roles WHERE user_id = %s", (user_id,))
            for app_name_id, role_id in data.items():
                if role_id:
                    db_connector.execute_query(conn, "INSERT INTO user_app_roles (user_id, app_id, role_id) VALUES (%s, %s, %s)",
                        (user_id, int(app_name_id), int(role_id)))
            log_audit(session['user_id'], f"Updated permissions for User ID: {user_id}")
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            conn.close()

@app.route('/api/admin/<entity>', methods=['POST'])
def admin_api(entity):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    action = request.form.get('action')
    item_id = request.form.get('id')
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'DB error'}), 500
    
    try:
        if entity == 'users':
            if action == 'add':
                username = request.form['username'].strip()
                existing = db_connector.execute_query(conn, "SELECT 1 FROM users WHERE username = %s", (username,))
                if existing:
                    return jsonify({'error': f"Username '{username}' sudah digunakan oleh pengguna lain."}), 400

                hashed_pw = generate_password_hash(request.form['password'])
                position = request.form.get('position', 'Staff')
                email = request.form.get('email', '').strip() or None
                db_connector.execute_insert(conn, "INSERT INTO users (username, password_hash, full_name, position, email, is_active) VALUES (%s, %s, %s, %s, %s, 1)",
                    (username, hashed_pw, request.form['full_name'], position, email))
                log_audit(session['user_id'], f"Added User: {username}")
            
            elif action == 'edit':
                username = request.form['username'].strip()
                existing = db_connector.execute_query(conn, "SELECT 1 FROM users WHERE username = %s AND id != %s", (username, item_id))
                if existing:
                    return jsonify({'error': f"Username '{username}' sudah digunakan oleh pengguna lain."}), 400

                fullname = request.form['full_name']
                position = request.form.get('position', 'Staff')
                email = request.form.get('email', '').strip() or None
                password = request.form.get('password', '')
                
                if password and password.strip():
                    hashed_pw = generate_password_hash(password)
                    db_connector.execute_query(conn, """
                        UPDATE users 
                        SET username = %s, password_hash = %s, full_name = %s, position = %s, email = %s
                        WHERE id = %s
                    """, (username, hashed_pw, fullname, position, email, item_id))
                else:
                    db_connector.execute_query(conn, """
                        UPDATE users 
                        SET username = %s, full_name = %s, position = %s, email = %s
                        WHERE id = %s
                    """, (username, fullname, position, email, item_id))
                log_audit(session['user_id'], f"Edited User: {username} (ID: {item_id})")
                        
            elif action == 'delete':
                if int(item_id) == session['user_id']:
                    raise Exception("Cannot delete yourself")
                db_connector.execute_query(conn, "DELETE FROM users WHERE id=%s", (item_id,))
                log_audit(session['user_id'], f"Deleted User ID: {item_id}")
                
        elif entity == 'applications':
            if action == 'add':
                db_connector.execute_insert(conn, "INSERT INTO applications (app_name, url_path, description, icon_class) VALUES (%s, %s, %s, %s)",
                    (request.form['app_name'], request.form['url_path'], request.form['description'], request.form['icon_class']))
                log_audit(session['user_id'], f"Added Application: {request.form['app_name']}")
            elif action == 'delete':
                db_connector.execute_query(conn, "DELETE FROM applications WHERE id=%s", (item_id,))
                log_audit(session['user_id'], f"Deleted Application ID: {item_id}")

        elif entity == 'roles':
            if action == 'add':
                new_role_id = db_connector.execute_insert(conn, "INSERT INTO roles (app_id, role_name, description) VALUES (%s, %s, %s)",
                    (request.form['app_id'], request.form['role_name'], request.form['description']))
                auths = request.form.getlist('authorities[]')
                for a_id in auths:
                    db_connector.execute_query(conn, "INSERT INTO role_authorities (role_id, authority_id) VALUES (%s, %s)", (new_role_id, a_id))
                log_audit(session['user_id'], f"Added Role: {request.form['role_name']}")
            elif action == 'edit':
                role_id = request.form['role_id']
                db_connector.execute_query(conn, "UPDATE roles SET role_name=%s, description=%s WHERE id=%s",
                    (request.form['role_name'], request.form.get('description', ''), role_id))
                db_connector.execute_query(conn, "DELETE FROM role_authorities WHERE role_id=%s", (role_id,))
                auths = request.form.getlist('authorities[]')
                for a_id in auths:
                    db_connector.execute_query(conn, "INSERT INTO role_authorities (role_id, authority_id) VALUES (%s, %s)", (role_id, a_id))
                log_audit(session['user_id'], f"Edited Role ID: {role_id}")
            elif action == 'delete':
                db_connector.execute_query(conn, "DELETE FROM roles WHERE id=%s", (item_id,))
                log_audit(session['user_id'], f"Deleted Role ID: {item_id}")
                
        elif entity == 'authorities':
            if action == 'add':
                db_connector.execute_insert(conn, "INSERT INTO authorities (app_id, authority_name, description) VALUES (%s, %s, %s)",
                    (request.form['app_id'], request.form['authority_name'], request.form['description']))
                log_audit(session['user_id'], f"Added Authority: {request.form['authority_name']}")
            elif action == 'delete':
                db_connector.execute_query(conn, "DELETE FROM authorities WHERE id=%s", (item_id,))
                log_audit(session['user_id'], f"Deleted Authority ID: {item_id}")
                
        return jsonify({'success': True})
    except pyodbc.IntegrityError as ie:
        err_msg = str(ie)
        if 'UNIQUE KEY' in err_msg or 'duplicate key' in err_msg:
            return jsonify({'error': 'Username atau data unik tersebut sudah digunakan oleh user lain.'}), 400
        return jsonify({'error': 'Terjadi pelanggaran relasi data (Integrity Error).'}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/user/force_logout', methods=['POST'])
def force_logout_user():
    if 'user_id' not in session or not has_authority(session['user_id'], 'manage_system'):
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.json if request.is_json else request.form
    target_user_id = data.get('user_id')
    if not target_user_id:
        return jsonify({'error': 'Target user_id is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database error'}), 500

    try:
        u_rows = db_connector.execute_query(conn, "SELECT username FROM users WHERE id = %s", (target_user_id,))
        target_username = u_rows[0]['username'] if u_rows else f"ID #{target_user_id}"

        db_connector.execute_query(conn, "UPDATE users SET force_logout_at = GETDATE() WHERE id = %s", (target_user_id,), commit=False)
        db_connector.execute_query(conn, """
            UPDATE session_logs 
            SET is_invalidated = 1, logout_time = GETDATE() 
            WHERE user_id = %s AND (logout_time IS NULL OR is_invalidated = 0)
        """, (target_user_id,), commit=True)

        log_audit(session['user_id'], f"Force Logged Out User: {target_username} (ID: {target_user_id})", "User Management")
        return jsonify({'success': True, 'message': f'Berhasil mengeluarkan paksa user {target_username}.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/session/terminate', methods=['POST'])
def terminate_session():
    if 'user_id' not in session or not has_authority(session['user_id'], 'manage_system'):
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.json if request.is_json else request.form
    sess_id = data.get('session_id')
    if not sess_id:
        return jsonify({'error': 'session_id is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database error'}), 500

    try:
        db_connector.execute_query(conn, """
            UPDATE session_logs 
            SET is_invalidated = 1, logout_time = GETDATE() 
            WHERE session_id = %s
        """, (sess_id,), commit=True)

        log_audit(session['user_id'], f"Terminated Active Session: {sess_id}", "User Management")
        return jsonify({'success': True, 'message': 'Sesi berhasil dihentikan.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
