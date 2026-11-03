import sys
import os
import json
import socket
from werkzeug.middleware.dispatcher import DispatcherMiddleware
from werkzeug.middleware.proxy_fix import ProxyFix
from waitress import serve

# Import Portal Hub application
from portal import app as portal_app
from database_init import init_database

# Include User Management App
sys.path.append(os.path.join(os.path.dirname(__file__), 'User_Management'))
from User_Management.app import app as user_mgmt_app

# Include CRM Dashboard App
sys.path.append(os.path.join(os.path.dirname(__file__), 'CRM_Dashboard'))
from CRM_Dashboard.app import app as crm_dashboard_app

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == '__main__':
    try:
        # Load configuration
        executable_dir = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(executable_dir, 'config.json')

        if not os.path.exists(config_path):
            base_dir = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
            config_path = os.path.join(base_dir, 'config.json')

        print(f"[*] Loading config from: {config_path}")
        with open(config_path, 'r') as f:
            config = json.load(f)

        # Auto-initialize Database on startup
        print("[*] Checking Database connection & schema...")
        db_success = init_database(config)
        if not db_success:
            print("\n[!] CRITICAL: Gagal menginisialisasi database.")
            print("[!] Pastikan database berjalan dan konfigurasi di config.json sudah benar.")
            if sys.stdin and sys.stdin.isatty():
                try: input("\nTekan ENTER untuk menutup...")
                except Exception: pass
            sys.exit(1)

        # Mount applications into DispatcherMiddleware
        application = DispatcherMiddleware(portal_app, {
            '/user-management': user_mgmt_app,
            '/crm-dashboard': crm_dashboard_app,
            '/los-dashboard': crm_dashboard_app,
            '/crm': crm_dashboard_app
        })

        # Ensure CRM backend service is running
        try:
            from CRM_Dashboard.app import ensure_backend_running
            ensure_backend_running()
        except Exception as e:
            print(f"[!] Warning checking CRM backend: {e}")

        # Apply ProxyFix for reverse proxies
        application = ProxyFix(application, x_for=1, x_proto=1, x_host=1, x_prefix=1)

        port = config['server'].get('port', 8086)
        local_ip = get_local_ip()
        
        print("\n" + "="*55)
        print("   LIUGONG APPS CORE (LOGIN & USER MANAGEMENT)")
        print("="*55)
        print(f"Local Access:   http://localhost:{port}")
        print(f"Network Access: http://{local_ip}:{port}")
        print("="*55)
        print("[Press Ctrl+C to stop the server]\n", flush=True)
        
        serve(application, host='0.0.0.0', port=port, threads=16)
    except BaseException as e:
        if isinstance(e, (KeyboardInterrupt, SystemExit)):
            print(f"[*] Server stopped by {type(e).__name__}")
        else:
            print("\n" + "!"*50)
            print(f"FATAL ERROR IN SERVER: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            print("!"*50)
        sys.exit(0 if isinstance(e, (KeyboardInterrupt, SystemExit)) else 1)
