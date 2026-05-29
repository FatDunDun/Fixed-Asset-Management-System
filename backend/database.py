import sqlite3
import os
from auth import hash_password

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets.db")

class PostgreSQLCursorAdapter:
    def __init__(self, cursor):
        self._cursor = cursor
        self._lastrowid = None

    def execute(self, query, params=None):
        # Convert SQLite column info check
        if "PRAGMA table_info" in query:
            try:
                table_name = query.split("(")[1].split(")")[0].replace("'", "").replace('"', '').strip()
            except Exception:
                table_name = "users"
            query = f"""
                SELECT column_name AS name 
                FROM information_schema.columns 
                WHERE table_name = '{table_name}'
            """
            
        # Convert AUTOINCREMENT to SERIAL for table creation
        if "AUTOINCREMENT" in query:
            query = query.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
            query = query.replace("AUTOINCREMENT", "")
        
        # Convert SQLite datetime('now') to CURRENT_TIMESTAMP
        if "datetime('now')" in query:
            query = query.replace("datetime('now')", "CURRENT_TIMESTAMP")
            
        # Convert SQLite PRAGMA journal_mode=WAL
        if "PRAGMA journal_mode" in query:
            return self
            
        # Convert SQLite ? placeholders to PostgreSQL %s placeholders
        if "?" in query:
            query = query.replace("?", "%s")
            
        # Handle lastrowid emulation for INSERTs
        is_insert = query.strip().upper().startswith("INSERT")
        if is_insert and "RETURNING" not in query.upper():
            query = query.rstrip().rstrip(';') + " RETURNING id"
            
        self._cursor.execute(query, params)
        
        if is_insert:
            try:
                row = self._cursor.fetchone()
                if row and 'id' in row:
                    self._lastrowid = row['id']
                elif row and isinstance(row, dict) and 'id' in row:
                    self._lastrowid = row['id']
                elif row:
                    self._lastrowid = list(row.values())[0] if hasattr(row, 'values') else row[0]
            except Exception:
                pass
        return self

    def executemany(self, query, params_list):
        if "?" in query:
            query = query.replace("?", "%s")
        self._cursor.executemany(query, params_list)
        return self

    @property
    def lastrowid(self):
        return self._lastrowid

    def fetchone(self):
        try:
            return self._cursor.fetchone()
        except Exception:
            return None

    def fetchall(self):
        try:
            return self._cursor.fetchall()
        except Exception:
            return []

    def close(self):
        self._cursor.close()

    def __iter__(self):
        return iter(self._cursor)

    def __getattr__(self, name):
        return getattr(self._cursor, name)


class PostgreSQLConnectionAdapter:
    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        return PostgreSQLCursorAdapter(self._conn.cursor())

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()

    def execute(self, query, params=None):
        cur = self.cursor()
        cur.execute(query, params)
        return cur

    def __getattr__(self, name):
        return getattr(self._conn, name)


def get_db_connection():
    """Establish a connection to the database. Supports SQLite locally and PostgreSQL in production."""
    db_host = os.getenv("DB_HOST")
    if db_host:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        db_port = os.getenv("DB_PORT", "5432")
        db_name = os.getenv("DB_NAME", "telecom_assets")
        db_user = os.getenv("DB_USER", "postgres")
        db_pass = os.getenv("DB_PASSWORD", "")
        
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_pass,
            cursor_factory=RealDictCursor
        )
        return PostgreSQLConnectionAdapter(conn)
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("PRAGMA busy_timeout = 5000;")
        conn.row_factory = sqlite3.Row
        return conn

def init_db():
    """Initialize the SQLite database schema and seed a default admin user."""
    conn = get_db_connection()
    conn.execute("PRAGMA journal_mode=WAL;")
    cursor = conn.cursor()
    
    # 1. Create users table with extended fields
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        real_name TEXT,
        phone TEXT,
        id_card TEXT,
        department TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        role TEXT NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 2. Create assets table with asset_code unique key and image_url column
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        purchase_date TEXT NOT NULL,
        status TEXT NOT NULL,
        department TEXT,
        user_name TEXT,
        description TEXT,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 3. Create approvals table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS approvals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        approval_code TEXT UNIQUE,
        action_type TEXT NOT NULL,
        asset_id INTEGER,
        proposed_data TEXT NOT NULL,
        requester TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reviewer TEXT,
        review_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_at DATETIME
    )
    """)
    
    # 4. Create asset_history table [NEW]
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS asset_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_code TEXT NOT NULL,
        action_type TEXT NOT NULL,
        operator TEXT NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Check if user_id column exists in users table, if not, add it [NEW]
    cursor.execute("PRAGMA table_info(users)")
    u_cols = [col['name'] for col in cursor.fetchall()]
    if 'user_id' not in u_cols:
        print("[*] Migrating users table: adding user_id column...")
        cursor.execute("ALTER TABLE users ADD COLUMN user_id TEXT")
        conn.commit()
        
        # Backfill existing users
        cursor.execute("SELECT id, username FROM users WHERE user_id IS NULL")
        rows = cursor.fetchall()
        if rows:
            print(f"[*] Backfilling unique user_id for {len(rows)} legacy users...")
            import random
            for r in rows:
                if r['username'] == 'admin':
                    uid = 'UID-888888'
                elif r['username'] == 'staff':
                    uid = 'UID-666666'
                else:
                    while True:
                        rand_digits = "".join(random.choices("0123456789", k=6))
                        uid = f"UID-{rand_digits}"
                        cursor.execute("SELECT COUNT(*) as count FROM users WHERE user_id = ?", (uid,))
                        if cursor.fetchone()["count"] == 0:
                            break
                cursor.execute("UPDATE users SET user_id = ? WHERE id = ?", (uid, r['id']))
            print("[*] Users backfill completed successfully!")
            
        # Create UNIQUE INDEX to enforce uniqueness
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_user_id ON users(user_id)")
        print("[*] Created unique index idx_user_id on users.")
        conn.commit()
        
    # Check if approval_code column exists, if not, add it [NEW]
    cursor.execute("PRAGMA table_info(approvals)")
    columns = [col['name'] for col in cursor.fetchall()]
    if 'approval_code' not in columns:
        print("[*] Migrating approvals table: adding approval_code column...")
        cursor.execute("ALTER TABLE approvals ADD COLUMN approval_code TEXT")
        conn.commit()
        
        # Create unique index to enforce uniqueness
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_code ON approvals(approval_code)")
        print("[*] Created unique index idx_approval_code on approvals.")
        conn.commit()
        
    # Re-backfill all approvals to use the new globally unique user_id format [NEW]
    cursor.execute("SELECT id, requester, created_at, approval_code FROM approvals")
    approvals_rows = cursor.fetchall()
    if approvals_rows:
        print(f"[*] Re-backfilling approval codes to use the new globally unique user_id format for {len(approvals_rows)} records...")
        import random
        for ar in approvals_rows:
            req = ar['requester']
            # Query user_id of requester
            cursor.execute("SELECT user_id FROM users WHERE username = ?", (req,))
            u_row = cursor.fetchone()
            if u_row and u_row['user_id']:
                user_uid_digits = u_row['user_id'].replace("UID-", "")
            else:
                user_uid_digits = "999999"
                
            try:
                dt_str = ar['created_at'].split(' ')[0].replace('-', '')
            except Exception:
                dt_str = "20260527"
                
            # Check if current code already uses the correct user_uid_digits (format: date(8) + uid(6) + rand(4) = 18 chars)
            current_code = ar['approval_code']
            if current_code and len(current_code) == 18 and current_code[8:14] == user_uid_digits:
                continue
                
            while True:
                rand_val = "".join(random.choices("0123456789", k=4))
                new_code = f"{dt_str}{user_uid_digits}{rand_val}"
                cursor.execute("SELECT COUNT(*) as count FROM approvals WHERE approval_code = ? AND id != ?", (new_code, ar['id']))
                if cursor.fetchone()["count"] == 0:
                    cursor.execute("UPDATE approvals SET approval_code = ? WHERE id = ?", (new_code, ar['id']))
                    break
        print("[*] Approvals re-backfill completed successfully!")
        
    conn.commit()
    
    # 5. Seed default admin & staff users if empty
    cursor.execute("SELECT COUNT(*) as count FROM users")
    if cursor.fetchone()["count"] == 0:
        default_admin_username = "admin"
        default_admin_password = "admin123"
        hashed_admin = hash_password(default_admin_password)
        cursor.execute(
            """INSERT INTO users (user_id, username, password, real_name, phone, id_card, department, status, role) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            ("UID-888888", default_admin_username, hashed_admin, "系统管理员", "13800000000", "110101199001011234", "办公室", "approved", "admin")
        )
        
        default_user_username = "staff"
        default_user_password = "staff123"
        hashed_user = hash_password(default_user_password)
        cursor.execute(
            """INSERT INTO users (user_id, username, password, real_name, phone, id_card, department, status, role) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            ("UID-666666", default_user_username, hashed_user, "普通员工", "13900000000", "110101199001015678", "云中台（研发中心一部）", "approved", "user")
        )
        conn.commit()
        print("[*] Database initialized. Seeded default 'admin' (admin123) and 'staff' (staff123) users.")
    else:
        print("[*] Database connection verified.")
        
    # Ensure registration approvals exist for existing users if approvals for 'register' are empty
    cursor.execute("SELECT COUNT(*) as count FROM approvals WHERE action_type = 'register'")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("SELECT username, real_name, phone, id_card, department, status FROM users")
        existing_users = cursor.fetchall()
        for eu in existing_users:
            rev_status = eu['status']
            notes = '系统初始化自动同步'
            reviewer = 'system'
            if eu['username'] == 'admin':
                notes = '系统自动生成超级管理员'
            elif eu['username'] == 'staff':
                notes = '系统初始导入种子员工'
                reviewer = 'admin'
            cursor.execute(
                """INSERT INTO approvals (action_type, asset_id, proposed_data, requester, status, reviewer, review_notes, created_at, reviewed_at) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)""",
                ('register', None, f'{{"real_name": "{eu["real_name"]}", "phone": "{eu["phone"]}", "id_card": "{eu["id_card"]}", "department": "{eu["department"]}"}}', eu['username'], rev_status, reviewer, notes)
            )
        conn.commit()
        print(f"[*] Seeded registration approvals for {len(existing_users)} existing users.")
        
    # 6. Seed default assets if assets table is empty
    cursor.execute("SELECT COUNT(*) as count FROM assets")
    if cursor.fetchone()["count"] == 0:
        seed_assets = [
            ("AST-20251015-001", "MacBook Pro 16\" M3 Max", "Electronics", 24999.00, "2025-10-15", "In_Use", "云中台（研发中心一部）", "张建国", "开发主推高配笔记本，带防眩光贴膜及保护壳", ""),
            ("AST-20251120-002", "Herman Miller Aeron Ergonomic Chair", "Furniture", 11500.00, "2025-11-20", "In_Use", "安保后勤部", "李梅", "B尺寸顶配人体工学办公椅", ""),
            ("AST-20260110-003", "IntelliJ IDEA Ultimate Yearly Subscription", "Software", 4500.00, "2026-01-10", "Available", "云中台（研发中心一部）", "", "年度订阅激活码，剩余3个授权闲置在库", ""),
            ("AST-20251205-004", "Dell UltraSharp 27\" 4K Monitor", "Electronics", 3500.00, "2025-12-05", "Maintenance", "信息技术支撑中心（研发中心二部）", "王强", "屏幕边缘出现偏色，送厂维保检测中", ""),
            ("AST-20240518-005", "Conference Room Mahogany Table", "Furniture", 8800.00, "2024-05-18", "In_Use", "办公室", "陈总经理", "1号会议室大型实木会议桌", ""),
            ("AST-20260301-006", "Adobe Creative Cloud All Apps Suite", "Software", 7200.00, "2026-03-01", "In_Use", "信息技术支撑中心（研发中心二部）", "赵静", "设计部共享多媒体创意套件授权", ""),
            ("AST-20210612-007", "Broken iPad Air 4", "Electronics", 4200.00, "2021-06-12", "Scrapped", "市场经营部", "孙丽", "屏幕粉碎且主板烧毁，已通过报废评估，准备正式注销销账", "")
        ]
        cursor.executemany(
            """INSERT INTO assets (asset_code, name, category, price, purchase_date, status, department, user_name, description, image_url) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            seed_assets
        )
        conn.commit()
        print(f"[*] Database seeded with {len(seed_assets)} assets with unique codes.")
        
    # Ensure asset_history is seeded for existing assets if history is empty
    cursor.execute("SELECT COUNT(*) as count FROM asset_history")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("SELECT asset_code, name, category, price, purchase_date, status, department, user_name, description FROM assets")
        existing_assets = cursor.fetchall()
        for ea in existing_assets:
            cursor.execute(
                """INSERT INTO asset_history (asset_code, action_type, operator, details, created_at) 
                   VALUES (?, ?, ?, ?, ?)""",
                (ea['asset_code'], 'create', 'system', f"系统初始化导入，类别：{ea['category']}，价格：¥{ea['price']}，初始状态：{ea['status']}，保管人：{ea['user_name'] or '无'}", ea['purchase_date'] + " 00:00:00")
            )
        conn.commit()
        print(f"[*] Seeded history for {len(existing_assets)} existing assets.")
        
    # 7. Ensure uploads directory exists in frontend
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
    uploads_dir = os.path.join(frontend_dir, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    print(f"[*] Ensured physical upload directory exists at: {uploads_dir}")
    
    conn.close()

if __name__ == "__main__":
    init_db()
