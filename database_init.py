import json
import os
import sys

def init_mysql_database(db_cfg, base_dir):
    try:
        import pymysql
    except ImportError:
        print("[!] pymysql is not installed. Please install it via pip install pymysql")
        return False
        
    host = db_cfg.get('host', '127.0.0.1')
    port = int(db_cfg.get('port', 3306))
    user = db_cfg.get('user', 'root')
    password = db_cfg.get('password', '')
    db_name = db_cfg.get('name', 'liugongapps_db')
    
    print(f"[*] Connecting to MySQL server at {host}:{port}...")
    try:
        conn = pymysql.connect(host=host, port=port, user=user, password=password, autocommit=True)
        with conn.cursor() as cur:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        conn.close()
        print(f"[+] Database `{db_name}` ready.")
    except Exception as e:
        print(f"[!] MySQL server connection error: {e}")
        return False
        
    try:
        conn = pymysql.connect(host=host, port=port, user=user, password=password, database=db_name, autocommit=True)
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM information_schema.tables WHERE table_schema=%s AND table_name='users'", (db_name,))
            table_exists = cur.fetchone()
            
            if not table_exists:
                print(f"[*] Database '{db_name}' is uninitialized. Running setup from MYSQL_SETUP.sql...")
                sql_path = os.path.join(base_dir, 'MYSQL_SETUP.sql')
                if not os.path.exists(sql_path):
                    sql_path = 'MYSQL_SETUP.sql'
                    
                if os.path.exists(sql_path):
                    with open(sql_path, 'r', encoding='utf-8') as f:
                        sql_content = f.read()
                        
                    # Split statements by semicolon
                    statements = [s.strip() for s in sql_content.split(';') if s.strip()]
                    for stmt in statements:
                        clean_lines = [l for l in stmt.splitlines() if not l.strip().startswith('--')]
                        clean_stmt = '\n'.join(clean_lines).strip()
                        if clean_stmt:
                            try:
                                cur.execute(clean_stmt)
                            except Exception as se:
                                print(f"[!] Warning executing SQL statement: {se}")
                    print("[+] MySQL Core schema initialization complete!")
                else:
                    print(f"[!] Could not find MYSQL_SETUP.sql at {sql_path}")
            else:
                print(f"[+] Database '{db_name}' is already initialized.")
                
            # Verify and ensure default admin user
            from werkzeug.security import generate_password_hash
            admin_hash = generate_password_hash("admin123")
            cur.execute("SELECT id FROM users WHERE username = 'admin'")
            admin_row = cur.fetchone()
            if not admin_row:
                cur.execute("INSERT INTO users (username, password_hash, full_name, is_active) VALUES ('admin', %s, 'System Admin', 1)", (admin_hash,))
                cur.execute("SELECT id FROM users WHERE username = 'admin'")
                admin_row = cur.fetchone()
            admin_id = admin_row[0] if admin_row else 1
            
            # Map default roles/apps to admin
            cur.execute("SELECT id FROM applications")
            apps = cur.fetchall()
            cur.execute("SELECT id, app_id FROM roles")
            roles = cur.fetchall()
            for app_row in apps:
                app_id = app_row[0]
                role_id = None
                for r in roles:
                    if r[1] == app_id:
                        role_id = r[0]
                        break
                if role_id:
                    cur.execute("INSERT IGNORE INTO user_app_roles (user_id, app_id, role_id) VALUES (%s, %s, %s)", (admin_id, app_id, role_id))
            print("[+] Default admin account verified (username: admin, password: admin123)")
        conn.close()
        return True
    except Exception as e:
        print(f"[!] MySQL Database init error: {e}")
        return False

def init_mssql_database(db_cfg, base_dir):
    try:
        import pyodbc
    except ImportError:
        print("[!] pyodbc is not installed.")
        return False
        
    server = db_cfg['host']
    port = db_cfg.get('port', 1433)
    db_name = db_cfg['name']
    user = db_cfg['user']
    password = db_cfg['password']
    drv = db_cfg.get('driver', '{ODBC Driver 17 for SQL Server}')
    
    # 1. Connect to master database
    try:
        print(f"[*] Connecting to SQL Server at {server},{port}...")
        conn_str = f"DRIVER={drv};SERVER={server},{port};DATABASE=master;UID={user};PWD={password};Encrypt=no;TrustServerCertificate=yes;"
        master_conn = pyodbc.connect(conn_str, autocommit=True)
        print(f"[+] Connected to master database successfully!")
    except Exception as e:
        print(f"[!] Failed to connect to SQL Server master: {e}")
        return False

    try:
        cursor = master_conn.cursor()
        cursor.execute(f"IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '{db_name}') CREATE DATABASE {db_name}")
        cursor.close()
        master_conn.close()
        
        # 2. Connect to specific application database
        conn_str = f"DRIVER={drv};SERVER={server},{port};DATABASE={db_name};UID={user};PWD={password};Encrypt=no;TrustServerCertificate=yes;"
        conn = pyodbc.connect(conn_str, autocommit=True)
        cursor = conn.cursor()
        
        # 3. Check if 'users' table exists
        cursor.execute("IF OBJECT_ID('users', 'U') IS NOT NULL SELECT 1 ELSE SELECT 0")
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print(f"[*] Database '{db_name}' is uninitialized. Running setup from MSSQL_SETUP.sql...")
            sql_path = os.path.join(base_dir, 'MSSQL_SETUP.sql')
            if not os.path.exists(sql_path):
                sql_path = 'MSSQL_SETUP.sql'
                
            if os.path.exists(sql_path):
                with open(sql_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    import re
                    blocks = re.split(r'\nGO\s*\n', content, flags=re.IGNORECASE)
                    
                    for block in blocks:
                        clean_block = block.strip()
                        if clean_block:
                            try:
                                cursor.execute(clean_block)
                            except Exception as e:
                                print(f"[!] Warning executing SQL block: {e}")
                
                print("[+] MSSQL Core schema initialization complete!")
                
                # Ensure default admin user with hash exists
                from werkzeug.security import generate_password_hash
                admin_hash = generate_password_hash("admin123")
                try:
                    cursor.execute("IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin') "
                                   "INSERT INTO users (username, password_hash, full_name, is_active) VALUES (?, ?, ?, 1) "
                                   "ELSE UPDATE users SET password_hash = ? WHERE username = 'admin'",
                                   ('admin', admin_hash, 'System Admin', admin_hash))
                    
                    cursor.execute("SELECT id FROM users WHERE username = 'admin'")
                    admin_row = cursor.fetchone()
                    if admin_row:
                        admin_id = admin_row[0]
                        cursor.execute("SELECT id FROM applications")
                        apps = cursor.fetchall()
                        cursor.execute("SELECT id, app_id FROM roles")
                        roles = cursor.fetchall()
                        
                        for app_row in apps:
                            app_id = app_row[0]
                            role_id = None
                            for r in roles:
                                if r[1] == app_id:
                                    role_id = r[0]
                                    break
                            if role_id:
                                cursor.execute("IF NOT EXISTS (SELECT 1 FROM user_app_roles WHERE user_id = ? AND app_id = ?) "
                                               "INSERT INTO user_app_roles (user_id, app_id, role_id) VALUES (?, ?, ?)",
                                               (admin_id, app_id, admin_id, app_id, role_id))
                    
                    print("[+] Default admin account verified (username: admin, password: admin123)")
                except Exception as e:
                    print(f"[!] Note while creating default admin: {e}")
            else:
                print(f"[!] Could not find MSSQL_SETUP.sql at {sql_path}")
        else:
            print(f"[+] Database '{db_name}' is already initialized.")
            
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"[!] MSSQL Database connection/init error: {e}")
        return False

def init_database(config):
    base_dir = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    db_cfg = config['database']
    db_type = db_cfg.get('type', 'mssql').lower()
    
    if db_type == 'mysql':
        return init_mysql_database(db_cfg, base_dir)
    elif db_type == 'mssql':
        return init_mssql_database(db_cfg, base_dir)
    else:
        print(f"[!] Unsupported DB type: {db_type}")
        return False

if __name__ == "__main__":
    cfg_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json')
    with open(cfg_file, 'r') as f:
        config = json.load(f)
    init_database(config)
