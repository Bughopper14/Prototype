import json
import os
import sys
import re

try:
    import pymysql
    import pymysql.cursors
except ImportError:
    pymysql = None

try:
    import pyodbc
except ImportError:
    pyodbc = None

def get_connection(config):
    db_cfg = config['database']
    db_type = db_cfg.get('type', 'mssql').lower()
    
    if db_type == 'mysql':
        if not pymysql:
            print("[!] pymysql is not installed.")
            return None
        try:
            return pymysql.connect(
                host=db_cfg.get('host', '127.0.0.1'),
                port=int(db_cfg.get('port', 3306)),
                user=db_cfg.get('user', 'root'),
                password=db_cfg.get('password', ''),
                database=db_cfg.get('name', 'internaltest1'),
                cursorclass=pymysql.cursors.DictCursor,
                autocommit=True,
                charset='utf8mb4'
            )
        except Exception as e:
            print(f"[!] MySQL DB Connection Error: {e}")
            return None
    else:
        if not pyodbc:
            print("[!] pyodbc is not installed.")
            return None
        host = db_cfg['host']
        user = db_cfg['user']
        pwd = db_cfg['password']
        db_name = db_cfg['name']
        port = db_cfg.get('port', 1433)
        drv = db_cfg.get('driver', '{ODBC Driver 17 for SQL Server}')
        
        try:
            server_str = f"{host},{port}" if port else host
            conn_str = f"DRIVER={drv};SERVER={server_str};DATABASE={db_name};UID={user};PWD={pwd};Encrypt=no;TrustServerCertificate=yes;MARS_Connection=yes;"
            return pyodbc.connect(conn_str)
        except Exception as e:
            print(f"[!] DB Connection Error: {e}")
            return None

def normalize_query_for_mysql(query):
    # Replace GETDATE() with NOW()
    q = re.sub(r'\bGETDATE\(\)', 'NOW()', query, flags=re.IGNORECASE)
    # Replace SELECT TOP (\d+) ... with SELECT ... LIMIT \1
    match_top = re.search(r'^\s*SELECT\s+TOP\s+(\d+)\s+(.*)', q, flags=re.IGNORECASE | re.DOTALL)
    if match_top:
        count = match_top.group(1)
        rest = match_top.group(2)
        q = f"SELECT {rest} LIMIT {count}"
    return q

def is_mysql_connection(conn):
    return pymysql and isinstance(conn, pymysql.Connection)

def execute_query(conn, query, params=None, is_dict=True, commit=True):
    is_mysql = is_mysql_connection(conn)
    cursor = conn.cursor()
    
    if is_mysql:
        processed_query = normalize_query_for_mysql(query)
    else:
        processed_query = query.replace('%s', '?')
        
    try:
        if params:
            cursor.execute(processed_query, params)
        else:
            cursor.execute(processed_query)
            
        upper_q = processed_query.strip().upper()
        if upper_q.startswith("SELECT") or upper_q.startswith("IF") or upper_q.startswith("SHOW"):
            if is_mysql:
                rows = cursor.fetchall()
                if not is_dict and rows:
                    return [tuple(r.values()) for r in rows]
                return rows if rows else []
            else:
                if cursor.description:
                    columns = [column[0] for column in cursor.description]
                    rows = cursor.fetchall()
                    if is_dict:
                        return [dict(zip(columns, row)) for row in rows]
                    else:
                        return rows
                return []
        else:
            if commit and not is_mysql:
                conn.commit()
            return cursor.rowcount
    finally:
        cursor.close()

def execute_scalar(conn, query, params=None):
    is_mysql = is_mysql_connection(conn)
    cursor = conn.cursor()
    
    if is_mysql:
        processed_query = normalize_query_for_mysql(query)
    else:
        processed_query = query.replace('%s', '?')
        
    try:
        if params:
            cursor.execute(processed_query, params)
        else:
            cursor.execute(processed_query)
        row = cursor.fetchone()
        if not row:
            return None
        if isinstance(row, dict):
            return list(row.values())[0]
        return row[0]
    finally:
        cursor.close()

def execute_insert(conn, query, params=None, commit=True):
    is_mysql = is_mysql_connection(conn)
    cursor = conn.cursor()
    
    try:
        if is_mysql:
            processed_query = normalize_query_for_mysql(query)
            if params:
                cursor.execute(processed_query, params)
            else:
                cursor.execute(processed_query)
            new_id = cursor.lastrowid
            return new_id
        else:
            processed_query = query.replace('%s', '?')
            full_query = "SET NOCOUNT ON; " + processed_query + "; SELECT SCOPE_IDENTITY();"
            if params:
                cursor.execute(full_query, params)
            else:
                cursor.execute(full_query)
            row = cursor.fetchone()
            new_id = int(row[0]) if row and row[0] is not None else None
            if commit:
                conn.commit()
            return new_id
    except Exception as e:
        print(f"[!] execute_insert error: {e}")
        if commit:
            conn.rollback()
        raise
    finally:
        cursor.close()

def ensure_force_logout_schema(conn):
    """Ensure required columns for force logout exist in DB."""
    try:
        if is_mysql_connection(conn):
            with conn.cursor() as cur:
                cur.execute("SHOW COLUMNS FROM users LIKE 'force_logout_at'")
                if not cur.fetchone():
                    cur.execute("ALTER TABLE users ADD COLUMN force_logout_at DATETIME NULL")
                cur.execute("SHOW COLUMNS FROM session_logs LIKE 'is_invalidated'")
                if not cur.fetchone():
                    cur.execute("ALTER TABLE session_logs ADD COLUMN is_invalidated TINYINT(1) DEFAULT 0")
        else:
            execute_query(conn, "IF COL_LENGTH('users', 'force_logout_at') IS NULL ALTER TABLE users ADD force_logout_at DATETIME NULL", commit=True)
            execute_query(conn, "IF COL_LENGTH('session_logs', 'is_invalidated') IS NULL ALTER TABLE session_logs ADD is_invalidated BIT DEFAULT 0", commit=True)
    except Exception as e:
        print(f"[!] Force logout schema migration note: {e}")

def check_session_invalidated(conn, user_id, session_id=None):
    """
    Check if a session (or user) has been force logged out / invalidated.
    Returns True if session is invalidated (must log out user), False otherwise.
    """
    if not user_id:
        return True
    try:
        ensure_force_logout_schema(conn)
        
        # 1. Check if specific session ID is invalidated
        if session_id:
            rows = execute_query(conn, """
                SELECT 1 FROM session_logs 
                WHERE session_id = %s AND (is_invalidated = 1 OR logout_time IS NOT NULL)
            """, (session_id,))
            if rows:
                return True
                
        # 2. Check if user's force_logout_at flag is set
        user_rows = execute_query(conn, "SELECT force_logout_at FROM users WHERE id = %s AND force_logout_at IS NOT NULL", (user_id,))
        if user_rows:
            return True
            
        return False
    except Exception as e:
        print(f"[!] check_session_invalidated error: {e}")
        return False

def ensure_session_timeout_schema(conn):
    """Ensure required columns for force logout and inactivity timeout exist in DB."""
    try:
        ensure_force_logout_schema(conn)
        if is_mysql_connection(conn):
            with conn.cursor() as cur:
                cur.execute("SHOW COLUMNS FROM session_logs LIKE 'last_activity'")
                if not cur.fetchone():
                    cur.execute("ALTER TABLE session_logs ADD COLUMN last_activity DATETIME DEFAULT CURRENT_TIMESTAMP")
                cur.execute("SHOW COLUMNS FROM session_logs LIKE 'expires_at'")
                if not cur.fetchone():
                    cur.execute("ALTER TABLE session_logs ADD COLUMN expires_at DATETIME NULL")
                cur.execute("SHOW COLUMNS FROM users LIKE 'session_timeout_minutes'")
                if not cur.fetchone():
                    cur.execute("ALTER TABLE users ADD COLUMN session_timeout_minutes INT NULL DEFAULT 15")
        else:
            execute_query(conn, "IF COL_LENGTH('session_logs', 'last_activity') IS NULL ALTER TABLE session_logs ADD last_activity DATETIME DEFAULT CURRENT_TIMESTAMP", commit=True)
            execute_query(conn, "IF COL_LENGTH('session_logs', 'expires_at') IS NULL ALTER TABLE session_logs ADD expires_at DATETIME NULL", commit=True)
            execute_query(conn, "IF COL_LENGTH('users', 'session_timeout_minutes') IS NULL ALTER TABLE users ADD session_timeout_minutes INT NULL DEFAULT 15", commit=True)
    except Exception as e:
        print(f"[!] Session timeout schema note: {e}")

def is_admin_user(conn, user_id):
    """Checks whether the user has administrator privileges (Developer/Admin unlimited session)."""
    if not user_id:
        return False
    try:
        rows = execute_query(conn, """
            SELECT u.username, r.role_name
            FROM users u
            LEFT JOIN user_app_roles uar ON u.id = uar.user_id
            LEFT JOIN roles r ON uar.role_id = r.id
            WHERE u.id = %s
        """, (user_id,))
        for r in rows:
            uname = (r.get('username') or '').lower()
            rname = (r.get('role_name') or '').lower()
            if uname in ['admin', 'axel@liugongfinance.com'] or 'admin' in rname or 'super' in rname:
                return True
        return False
    except Exception as e:
        print(f"[!] is_admin_user check error: {e}")
        return False

def get_user_session_timeout(conn, user_id, default_minutes=15):
    """
    Returns user-specific session timeout in minutes.
    0 = Unlimited (no expiration).
    > 0 = Inactivity timeout in minutes.
    """
    if not user_id:
        return default_minutes
    try:
        rows = execute_query(conn, "SELECT username, session_timeout_minutes FROM users WHERE id = %s", (user_id,))
        if rows:
            r = rows[0]
            if is_admin_user(conn, user_id) and (r.get('session_timeout_minutes') is None or r.get('session_timeout_minutes') == 0):
                return 0
            if r.get('session_timeout_minutes') is not None:
                return int(r['session_timeout_minutes'])
        return default_minutes
    except Exception as e:
        print(f"[!] get_user_session_timeout error: {e}")
        return default_minutes

def create_session_record(conn, user_id, session_id, ip_addr, user_agent, app_name, max_lifetime_minutes=120):
    """Creates a new session log with explicit expiration and activity timestamps in the database."""
    ensure_session_timeout_schema(conn)
    try:
        user_timeout = get_user_session_timeout(conn, user_id, 15)
        if is_admin_user(conn, user_id) or user_timeout == 0:
            # Unlimited session lifetime (10 years)
            max_lifetime_minutes = 5256000
        elif user_timeout > 0:
            max_lifetime_minutes = max(max_lifetime_minutes, user_timeout * 4)

        if is_mysql_connection(conn):
            execute_query(conn, """
                INSERT INTO session_logs (user_id, session_id, ip_address, user_agent, app_name, login_time, last_activity, expires_at)
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL %s MINUTE))
            """, (user_id, session_id, ip_addr, user_agent, app_name, max_lifetime_minutes))
        else:
            execute_query(conn, """
                INSERT INTO session_logs (user_id, session_id, ip_address, user_agent, app_name, login_time, last_activity, expires_at)
                VALUES (%s, %s, %s, %s, %s, GETDATE(), GETDATE(), DATEADD(minute, %s, GETDATE()))
            """, (user_id, session_id, ip_addr, user_agent, app_name, max_lifetime_minutes))
    except Exception as e:
        print(f"[!] create_session_record error: {e}")

def validate_and_touch_session(conn, user_id, session_id, inactivity_minutes=15, max_lifetime_minutes=120):
    """
    Validates user session against:
    1. Force logout flag in users table.
    2. Explicit invalidation or logout in session_logs table.
    3. Maximum session duration (max_lifetime_minutes) stored in database.
    4. Inactivity timeout (inactivity_minutes) since last user movement/request.
    * Note: Admin / Developer or users with session_timeout_minutes = 0 have UNLIMITED session.

    Returns: (is_valid: bool, reason: str)
    If valid, updates last_activity = NOW() in the database.
    If invalid, marks session as invalidated in the database.
    """
    if not user_id or not session_id:
        return False, "Sesi tidak ditemukan"

    try:
        ensure_session_timeout_schema(conn)

        # 1. Check user force_logout_at
        user_rows = execute_query(conn, "SELECT force_logout_at FROM users WHERE id = %s AND force_logout_at IS NOT NULL", (user_id,))
        if user_rows:
            return False, "Sesi dihentikan oleh administrator."

        # Check if user has Unlimited session configured (0 or admin)
        user_timeout = get_user_session_timeout(conn, user_id, inactivity_minutes)
        if is_admin_user(conn, user_id) or user_timeout == 0:
            execute_query(conn, "UPDATE session_logs SET last_activity = NOW() WHERE session_id = %s", (session_id,))
            return True, "active"

        inactivity_minutes = user_timeout

        # 2. Check session record in database
        sess_rows = execute_query(conn, """
            SELECT id, last_activity, expires_at, login_time, is_invalidated, logout_time,
                   TIMESTAMPDIFF(SECOND, last_activity, NOW()) as idle_seconds,
                   TIMESTAMPDIFF(SECOND, NOW(), expires_at) as remaining_lifetime_seconds
            FROM session_logs
            WHERE session_id = %s
            ORDER BY id DESC LIMIT 1
        """, (session_id,))

        if not sess_rows:
            # If no record exists yet, register it
            create_session_record(conn, user_id, session_id, None, None, 'Portal Apps', max_lifetime_minutes)
            return True, "active"

        sess = sess_rows[0]
        if sess.get('is_invalidated') or sess.get('logout_time'):
            return False, "Sesi telah diakhiri."

        # 3. Check Max Session Lifetime (Maksimal seberapa lama user berada di sana)
        if sess.get('expires_at') and sess.get('remaining_lifetime_seconds') is not None:
            if sess['remaining_lifetime_seconds'] <= 0:
                execute_query(conn, "UPDATE session_logs SET is_invalidated = 1, logout_time = NOW() WHERE session_id = %s", (session_id,))
                return False, f"Batas waktu maksimal login ({max_lifetime_minutes} menit) telah berakhir. Silakan login kembali."

        # 4. Check Inactivity Timeout (Ketika tidak ada pergerakan selama seberapa lama)
        idle_seconds = sess.get('idle_seconds') or 0
        if idle_seconds > (inactivity_minutes * 60):
            execute_query(conn, "UPDATE session_logs SET is_invalidated = 1, logout_time = NOW() WHERE session_id = %s", (session_id,))
            return False, f"Sesi telah berakhir karena tidak ada aktivitas/pergerakan selama {inactivity_minutes} menit. Silakan login kembali."

        # 5. Session is valid -> touch last_activity in database to record movement
        execute_query(conn, "UPDATE session_logs SET last_activity = NOW() WHERE session_id = %s", (session_id,))
        return True, "active"

    except Exception as e:
        print(f"[!] validate_and_touch_session error: {e}")
        return True, "error_fallback"
