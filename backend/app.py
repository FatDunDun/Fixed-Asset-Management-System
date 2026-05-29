from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import os
import sqlite3
from auth import hash_password, verify_password, generate_token, verify_token
from database import get_db_connection, init_db

# Initialize database on startup
init_db()

def mask_id_card(id_card_str: str) -> str:
    """Mask 18-digit identity card number to 1101**********1234."""
    if not id_card_str:
        return ""
    id_card_str = id_card_str.strip()
    if len(id_card_str) == 18:
        return id_card_str[:4] + "*" * 10 + id_card_str[-4:]
    return id_card_str


import threading
import time

class LoginRateLimiter:
    def __init__(self):
        self.lock = threading.Lock()
        self.attempts = {}  # key: ip -> [timestamps]
        self.locks = {}     # key: ip -> lock_release_timestamp
        
    def check_rate_limit(self, key: str) -> tuple:
        """Check if rate limit is exceeded. Returns (is_blocked, time_remaining)."""
        now = time.time()
        with self.lock:
            # 1. Clean up old locks
            release_time = self.locks.get(key, 0)
            if release_time > now:
                return True, int(release_time - now)
            elif release_time > 0:
                # Lock expired, remove it
                del self.locks[key]
                self.attempts[key] = []
                
            # 2. Clean up attempts older than 5 minutes (300 seconds)
            timestamps = self.attempts.get(key, [])
            timestamps = [t for t in timestamps if now - t < 300]
            self.attempts[key] = timestamps
            
            # 3. If attempts >= 5, lock it for 15 minutes (900 seconds)
            if len(timestamps) >= 5:
                lock_until = now + 900
                self.locks[key] = lock_until
                return True, 900
                
            return False, 0
            
    def record_attempt(self, key: str, success: bool):
        """Record a login attempt. Clears attempts on success, records timestamp on failure."""
        now = time.time()
        with self.lock:
            if success:
                # Clear all failure history for this key on success
                self.attempts.pop(key, None)
                self.locks.pop(key, None)
            else:
                timestamps = self.attempts.get(key, [])
                timestamps.append(now)
                self.attempts[key] = timestamps
                
                # Check if this failure triggers a new lock
                if len(timestamps) >= 5:
                    self.locks[key] = now + 900

login_limiter = LoginRateLimiter() # In-memory rate limiter for loopback/IP limits

ALLOWED_DEPARTMENTS = [
    "办公室",
    "市场经营部",
    "政企客户事业部",
    "全渠道运营部",
    "客户服务部",
    "经开营维中心",
    "云网运营部",
    "网络操作维护中心（智能服务运营中心ISOC）",
    "无线网络维护优化中心",
    "信息技术支撑中心（研发中心二部）",
    "综合维护支撑中心",
    "采购供应链中心",
    "传输线路维护中心",
    "人力资源部",
    "财务部",
    "企业管理部（法律事务部）",
    "党群工作部",
    "工会",
    "城固县分公司",
    "佛坪县分公司",
    "留坝县分公司",
    "略阳县分公司",
    "勉县分公司",
    "南郑县分公司",
    "宁强县分公司",
    "西乡县分公司",
    "洋县分公司",
    "镇巴县分公司",
    "大河坎营维中心",
    "纪检监察室",
    "安保后勤部",
    "业务支撑中心",
    "滨江营维中心",
    "兴汉营维中心",
    "云中台（研发中心一部）",
    "万号汉中分中心",
    "客户经营中心"
]

# Configure Flask app to serve the frontend folder as static content
app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app, resources={r"/api/*": {"origins": ["http://127.0.0.1:5000", "http://localhost:5000"]}}) # Allow CORS restricted strictly to loopback host

@app.after_request
def add_security_headers(response):
    """Add secure HTTP response headers to defend against multiple web vulnerabilities."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Strict CSP: only allow self assets, Google Fonts, and FontAwesome styles/fonts
    csp_policy = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; "
        "img-src 'self' data:; "
        "frame-ancestors 'none';"
    )
    response.headers['Content-Security-Policy'] = csp_policy
    return response

# Middleware decorator to require JWT Token for API endpoints
def token_required(f):
    def decorator(*args, **kwargs):
        token = None
        # Check authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Authorization token is missing!'}), 401
            
        decoded = verify_token(token)
        if not decoded:
            return jsonify({'message': 'Authorization token is invalid or expired!'}), 401
            
        # Pass the decoded user info to the route
        request.current_user = decoded
        return f(*args, **kwargs)
        
    decorator.__name__ = f.__name__
    return decorator

# --- Static Frontend Routes ---
@app.route('/')
def index():
    """Serve the single page application home page."""
    return app.send_static_file('index.html')

@app.route('/api/departments', methods=['GET'])
def get_departments():
    """Retrieve the standardized list of allowed departments."""
    return jsonify(ALLOWED_DEPARTMENTS), 200

# --- Authentication APIs ---

# --- Authentication APIs ---

import re

def is_strong_password(password):
    if len(password) < 8:
        return False, "密码长度必须至少为8位！"
    if not re.search(r"[A-Z]", password):
        return False, "密码必须包含至少一个大写字母！"
    if not re.search(r"[a-z]", password):
        return False, "密码必须包含至少一个小写字母！"
    if not re.search(r"[0-9]", password):
        return False, "密码必须包含至少一个数字！"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\|/~`';]", password):
        return False, "密码必须包含至少一个特殊字符 (如 @, #, $, %, !, *, ? 等)！"
    return True, ""

import datetime
import random

def generate_unique_user_id(cursor):
    """Generate a globally unique User ID in format UID-XXXXXX."""
    while True:
        rand_digits = "".join(random.choices("0123456789", k=6))
        uid = f"UID-{rand_digits}"
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE user_id = ?", (uid,))
        if cursor.fetchone()["count"] == 0:
            return uid

def generate_unique_approval_code(cursor, user_id):
    """Generate a unique approval code in format YYYYMMDD + user_id (pure digits) + 4 random digits."""
    date_str = datetime.datetime.now().strftime("%Y%m%d")
    user_uid_clean = user_id.replace("UID-", "").replace("-", "")
    while True:
        rand_val = "".join(random.choices("0123456789", k=4))
        code = f"{date_str}{user_uid_clean}{rand_val}"
        
        # Check uniqueness in approvals table
        cursor.execute("SELECT COUNT(*) as count FROM approvals WHERE approval_code = ?", (code,))
        if cursor.fetchone()["count"] == 0:
            return code

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password') or not data.get('real_name') or not data.get('phone') or not data.get('id_card') or not data.get('department'):
        return jsonify({'message': '所有字段均为必填项！(用户名, 密码, 真实姓名, 手机号, 身份证号, 所属部门)'}), 400
        
    username = data.get('username').strip()
    password = data.get('password')
    real_name = data.get('real_name').strip()
    phone = data.get('phone').strip()
    id_card = data.get('id_card').strip()
    department = data.get('department').strip()
    
    if len(username) < 3:
        return jsonify({'message': '用户名长度必须至少为3位！'}), 400
        
    # Strong password validation
    is_strong, strength_msg = is_strong_password(password)
    if not is_strong:
        return jsonify({'message': strength_msg}), 400
        
    # Phone number format validation (11-digit regex)
    if not re.match(r"^1[3-9]\d{9}$", phone):
        return jsonify({'message': '手机号码格式不正确，必须为11位中国手机号！'}), 400
        
    # ID card format validation (18-digit regex)
    if not re.match(r"^\d{17}[\dXx]$", id_card):
        return jsonify({'message': '身份证号格式不正确，必须为18位身份证号！'}), 400

    if department not in ALLOWED_DEPARTMENTS:
        return jsonify({'message': '选择的部门不合法！请从标准部门列表中选择。'}), 400
        
    role = 'user'
    status = 'pending'
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if username.lower() == 'admin':
            return jsonify({'message': '不能注册超级管理员用户名！'}), 409
            
        hashed = hash_password(password)
        
        import json
        proposed_data = json.dumps({
            'real_name': real_name,
            'phone': phone,
            'id_card': id_card,
            'department': department
        })
        
        user_uid = generate_unique_user_id(cursor)
        cursor.execute(
            """INSERT INTO users (user_id, username, password, real_name, phone, id_card, department, status, role) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_uid, username, hashed, real_name, phone, id_card, department, status, role)
        )
        approval_code = generate_unique_approval_code(cursor, user_uid)
        
        cursor.execute(
            """INSERT INTO approvals (approval_code, action_type, asset_id, proposed_data, requester, status) 
               VALUES (?, ?, ?, ?, ?, ?)""",
            (approval_code, 'register', None, proposed_data, username, 'pending')
        )
        
        conn.commit()
        return jsonify({'message': '注册申请提交成功！请等待管理员审核。'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'message': '用户名已存在！'}), 409
    except Exception as e:
        return jsonify({'message': f'服务器错误: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    ip_addr = request.remote_addr
    is_blocked, remaining = login_limiter.check_rate_limit(ip_addr)
    if is_blocked:
        return jsonify({'message': f'登录失败次数过多，该IP已被临时锁定！请在 {remaining} 秒后再试。'}), 429

    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Username and password are required!'}), 400
        
    username = data.get('username').strip()
    password = data.get('password')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        if user and verify_password(user['password'], password):
            # Check user registration status
            status = user['status']
            if status == 'pending':
                return jsonify({'message': '您的账户申请正在审批中，请联系管理员。'}), 403
            elif status == 'rejected':
                return jsonify({'message': '您的账户申请已被管理员拒绝。'}), 403
            elif status == 'suspended':
                return jsonify({'message': '您的账户已被管理员禁用，请联系管理员启用！'}), 403
                
            login_limiter.record_attempt(ip_addr, True)
            token = generate_token(user['username'], user['role'], user['real_name'])
            return jsonify({
                'token': token,
                'username': user['username'],
                'real_name': user['real_name'],
                'role': user['role']
            }), 200
        else:
            login_limiter.record_attempt(ip_addr, False)
            return jsonify({'message': 'Invalid username or password!'}), 401
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/forgot_password', methods=['POST'])
def forgot_password():
    """Verify registration fields and reset employee user password securely."""
    data = request.get_json()
    if not data or not data.get('username') or not data.get('real_name') or not data.get('phone') or not data.get('id_card') or not data.get('new_password'):
        return jsonify({'message': '所有字段均为必填项！(用户名, 真实姓名, 手机号, 身份证号, 新密码)'}), 400
        
    username = data.get('username').strip()
    real_name = data.get('real_name').strip()
    phone = data.get('phone').strip()
    id_card = data.get('id_card').strip()
    new_password = data.get('new_password')
    
    # Validate password strength
    is_strong, strength_msg = is_strong_password(new_password)
    if not is_strong:
        return jsonify({'message': strength_msg}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'message': '用户名或身份验证信息不匹配！'}), 400
            
        # Verify matching name, phone, and id card
        if user['real_name'] != real_name or user['phone'] != phone or user['id_card'] != id_card:
            return jsonify({'message': '用户名或身份验证信息不匹配！'}), 400
            
        # Built-in super admin cannot be reset publicly to protect system integrity
        if username.lower() == 'admin':
            return jsonify({'message': '超级管理员密码不能通过此通道重置，请联系系统支持！'}), 403
            
        hashed = hash_password(new_password)
        cursor.execute("UPDATE users SET password = ? WHERE username = ?", (hashed, username))
        conn.commit()
        return jsonify({'message': '密码重置成功，请使用新密码登录！'}), 200
    except Exception as e:
        return jsonify({'message': f'服务器错误: {str(e)}'}), 500
    finally:
        conn.close()

# --- Asset Management APIs (CRUD) ---

@app.route('/api/assets', methods=['GET'])
@token_required
def get_assets():
    # Parse query filters
    search_query = request.args.get('q', '').strip()
    category = request.args.get('category', '').strip()
    status = request.args.get('status', '').strip()
    
    # Sorting
    sort_by = request.args.get('sort_by', 'id').strip()
    sort_order = request.args.get('sort_order', 'desc').strip()
    
    # Whitelist sorting fields
    allowed_sort_fields = {'id': 'id', 'name': 'name', 'price': 'price', 'purchase_date': 'purchase_date', 'status': 'status'}
    if sort_by not in allowed_sort_fields:
        sort_by = 'id'
    sort_order = 'desc' if sort_order.lower() == 'desc' else 'asc'
    
    current_user = request.current_user
    role = current_user.get('role', 'user')
    username = current_user.get('sub')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get user department for regular employees
    user_dept = None
    if role != 'admin':
        cursor.execute("SELECT department FROM users WHERE username = ?", (username,))
        u_row = cursor.fetchone()
        if u_row:
            user_dept = u_row['department']
            
    query = "SELECT * FROM assets WHERE 1=1"
    params = []
    
    # Restrict to user's department if they are not an administrator
    if role != 'admin':
        query += " AND department = ?"
        params.append(user_dept or "")
        
    if search_query:
        query += " AND (name LIKE ? OR department LIKE ? OR user_name LIKE ? OR description LIKE ?)"
        like_expr = f"%{search_query}%"
        params.extend([like_expr, like_expr, like_expr, like_expr])
        
    if category:
        query += " AND category = ?"
        params.append(category)
        
    if status:
        query += " AND status = ?"
        params.append(status)
        
    query += f" ORDER BY {sort_by} {sort_order}"
    
    try:
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        assets = []
        for r in rows:
            assets.append({
                'id': r['id'],
                'asset_code': r['asset_code'],
                'name': r['name'],
                'category': r['category'],
                'price': r['price'],
                'purchase_date': r['purchase_date'],
                'status': r['status'],
                'department': r['department'],
                'user_name': r['user_name'],
                'description': r['description'],
                'image_url': r['image_url'],
                'created_at': r['created_at']
            })
            
        return jsonify(assets), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/assets', methods=['POST'])
@token_required
def create_asset():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('category') or data.get('price') is None or not data.get('purchase_date') or not data.get('status'):
        return jsonify({'message': 'Missing required fields! (name, category, price, purchase_date, status)'}), 400
        
    name = data.get('name').strip()
    category = data.get('category').strip()
    try:
        price = float(data.get('price'))
    except ValueError:
        return jsonify({'message': 'Price must be a valid number!'}), 400
        
    purchase_date = data.get('purchase_date').strip()
    status = data.get('status').strip()
    department = data.get('department', '').strip()
    user_name = data.get('user_name', '').strip()
    description = data.get('description', '').strip()
    image_url = data.get('image_url', '').strip()
    
    if department and department not in ALLOWED_DEPARTMENTS:
        return jsonify({'message': '选择的部门不合法！请从标准部门列表中选择。'}), 400
    
    current_user = request.current_user
    role = current_user.get('role', 'user')
    username = current_user.get('sub')
    operator_name = current_user.get('name') or username
    
    import random
    asset_code = data.get('asset_code', '').strip()
    if not asset_code:
        # Generate AST-YYYYMMDD-XXXX
        date_str = purchase_date.replace('-', '')
        rand_suffix = ''.join(random.choices('0123456789', k=4))
        asset_code = f"AST-{date_str}-{rand_suffix}"
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Validate uniqueness in assets table
        cursor.execute("SELECT COUNT(*) as count FROM assets WHERE asset_code = ?", (asset_code,))
        if cursor.fetchone()["count"] > 0:
            return jsonify({'message': f'资产编码 "{asset_code}" 已被其他资产占用，请输入唯一编码！'}), 400
            
        # Validate uniqueness in pending approvals
        cursor.execute("""
            SELECT COUNT(*) as count FROM approvals 
            WHERE status = 'pending' AND action_type = 'create' AND proposed_data LIKE ?
        """, (f'%"asset_code": "{asset_code}"%',))
        if cursor.fetchone()["count"] > 0:
            return jsonify({'message': f'资产编码 "{asset_code}" 已存在待审批的登记申请！'}), 400
            
        if role == 'admin':
            cursor.execute("""
                INSERT INTO assets (asset_code, name, category, price, purchase_date, status, department, user_name, description, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (asset_code, name, category, price, purchase_date, status, department, user_name, description, image_url))
            
            # Log to asset_history [NEW]
            hist_details = f"管理员直接登记入账。类别：{category}，单价：¥{price}，初始状态：{status}，保管人：{user_name or '无'}"
            cursor.execute("""
                INSERT INTO asset_history (asset_code, action_type, operator, details)
                VALUES (?, ?, ?, ?)
            """, (asset_code, 'create', operator_name, hist_details))
            
            conn.commit()
            asset_id = cursor.lastrowid
            
            return jsonify({
                'id': asset_id,
                'asset_code': asset_code,
                'name': name,
                'category': category,
                'price': price,
                'purchase_date': purchase_date,
                'status': status,
                'department': department,
                'user_name': user_name,
                'description': description,
                'image_url': image_url
            }), 201 # Resource created successfully
        else:
            # Regular user submits an approval request
            import json
            proposed_data = json.dumps({
                'asset_code': asset_code,
                'name': name,
                'category': category,
                'price': price,
                'purchase_date': purchase_date,
                'status': status,
                'department': department,
                'user_name': user_name,
                'description': description,
                'image_url': image_url
            }, ensure_ascii=False)
            
            cursor.execute("SELECT user_id FROM users WHERE username = ?", (username,))
            u_row = cursor.fetchone()
            user_uid = u_row['user_id'] if u_row else "UID-999999"
            approval_code = generate_unique_approval_code(cursor, user_uid)
            
            cursor.execute("""
                INSERT INTO approvals (approval_code, action_type, asset_id, proposed_data, requester, status)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (approval_code, 'create', None, proposed_data, username, 'pending'))
            conn.commit()
            
            return jsonify({
                'approval_required': True,
                'message': '登记新资产申请已提交审批，等待管理员审核。',
                'action_type': 'create'
            }), 202
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/assets/<int:asset_id>', methods=['PUT'])
@token_required
def update_asset(asset_id):
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided!'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM assets WHERE id = ?", (asset_id,))
        asset = cursor.fetchone()
        if not asset:
            return jsonify({'message': 'Asset not found!'}), 404
            
        current_user = request.current_user
        role = current_user.get('role', 'user')
        username = current_user.get('sub')
        
        # Verify department-level permission for regular employees (IDOR check)
        if role != 'admin':
            cursor.execute("SELECT department FROM users WHERE username = ?", (username,))
            u_row = cursor.fetchone()
            user_dept = u_row['department'] if u_row else None
            if asset['department'] != user_dept:
                return jsonify({'message': '无权修改其他部门的资产！'}), 403
                
        asset_code = data.get('asset_code', asset['asset_code']).strip()
        name = data.get('name', asset['name']).strip()
        category = data.get('category', asset['category']).strip()
        try:
            price = float(data.get('price', asset['price']))
        except ValueError:
            return jsonify({'message': 'Price must be a valid number!'}), 400
            
        purchase_date = data.get('purchase_date', asset['purchase_date']).strip()
        status = data.get('status', asset['status']).strip()
        department = data.get('department', asset['department']).strip()
        user_name = data.get('user_name', asset['user_name']).strip()
        description = data.get('description', asset['description']).strip()
        image_url = data.get('image_url', asset['image_url']).strip()
        
        if department and department not in ALLOWED_DEPARTMENTS and department != (asset['department'] or '').strip():
            return jsonify({'message': '选择的部门不合法！请从标准部门列表中选择。'}), 400
        
        current_user = request.current_user
        role = current_user.get('role', 'user')
        username = current_user.get('sub')
        operator_name = current_user.get('name') or username
        
        # 报废资产生命周期终结，任何人都不得再修改
        if asset['status'] == 'Scrapped':
            return jsonify({'message': '该资产已被标记为「报废处置」状态，生命周期已终结，不允许对其进行任何修改操作！'}), 403
        
        # Check code uniqueness
        if asset_code != asset['asset_code']:
            cursor.execute("SELECT COUNT(*) as count FROM assets WHERE asset_code = ? AND id != ?", (asset_code, asset_id))
            if cursor.fetchone()["count"] > 0:
                return jsonify({'message': f'资产编码 "{asset_code}" 已被其他资产占用！'}), 400
                
        if role == 'admin':
            cursor.execute("""
                UPDATE assets 
                SET asset_code = ?, name = ?, category = ?, price = ?, purchase_date = ?, status = ?, department = ?, user_name = ?, description = ?, image_url = ?
                WHERE id = ?
            """, (asset_code, name, category, price, purchase_date, status, department, user_name, description, image_url, asset_id))
            
            # Compare fields for detailed history log [NEW]
            changes = []
            fields_map = {
                'asset_code': '资产编码', 'name': '资产名称', 'category': '资产分类',
                'price': '单价', 'purchase_date': '采购日期', 'status': '资产状态',
                'department': '使用部门', 'user_name': '保管人员', 'description': '备注说明',
                'image_url': '实物图'
            }
            category_names = { 'Electronics': '电子设备', 'Furniture': '办公家具', 'Software': '软件资产', 'Office': '行政耗材' }
            status_names = { 'Available': '闲置在库', 'In_Use': '分配在用', 'Maintenance': '维保检测', 'Scrapped': '报废处置' }
            
            for f, label in fields_map.items():
                old_val = asset[f]
                if f == 'asset_code': new_val = asset_code
                elif f == 'name': new_val = name
                elif f == 'category': new_val = category
                elif f == 'price': new_val = price
                elif f == 'purchase_date': new_val = purchase_date
                elif f == 'status': new_val = status
                elif f == 'department': new_val = department
                elif f == 'user_name': new_val = user_name
                elif f == 'description': new_val = description
                elif f == 'image_url': new_val = image_url
                
                if old_val != new_val:
                    if f == 'category':
                        old_disp = category_names.get(old_val, old_val)
                        new_disp = category_names.get(new_val, new_val)
                    elif f == 'status':
                        old_disp = status_names.get(old_val, old_val)
                        new_disp = status_names.get(new_val, new_val)
                    elif f == 'price':
                        old_disp = f"¥{old_val}"
                        new_disp = f"¥{new_val}"
                    elif f == 'image_url':
                        old_urls = set(filter(None, (old_val or '').split(',')))
                        new_urls = set(filter(None, (new_val or '').split(',')))
                        added = len(new_urls - old_urls)
                        removed = len(old_urls - new_urls)
                        parts = []
                        if added: parts.append(f'新增{added}张图片')
                        if removed: parts.append(f'删除{removed}张图片')
                        if not parts: continue  # identical sets, skip
                        old_disp = f'{len(old_urls)}张' if old_urls else '无'
                        new_disp = f'{len(new_urls)}张' if new_urls else '无'
                        changes.append(f"{label}({old_disp}→{new_disp}，{'，'.join(parts)})")                        
                        continue
                    else:
                        old_disp = old_val or '无'
                        new_disp = new_val or '无'
                    changes.append(f"{label} ({old_disp} ➔ {new_disp})")
            
            hist_details = "管理员直接变更属性：" + ", ".join(changes) if changes else "无属性实质变更"
            cursor.execute("""
                INSERT INTO asset_history (asset_code, action_type, operator, details)
                VALUES (?, ?, ?, ?)
            """, (asset_code, 'update', operator_name, hist_details))
            
            conn.commit()
            
            return jsonify({
                'id': asset_id,
                'asset_code': asset_code,
                'name': name,
                'category': category,
                'price': price,
                'purchase_date': purchase_date,
                'status': status,
                'department': department,
                'user_name': user_name,
                'description': description,
                'image_url': image_url
            }), 200
        else:
            # Regular user submits an update request
            import json
            proposed_data = json.dumps({
                'asset_code': asset_code,
                'name': name,
                'category': category,
                'price': price,
                'purchase_date': purchase_date,
                'status': status,
                'department': department,
                'user_name': user_name,
                'description': description,
                'image_url': image_url
            }, ensure_ascii=False)
            
            cursor.execute("SELECT user_id FROM users WHERE username = ?", (username,))
            u_row = cursor.fetchone()
            user_uid = u_row['user_id'] if u_row else "UID-999999"
            approval_code = generate_unique_approval_code(cursor, user_uid)
            
            cursor.execute("""
                INSERT INTO approvals (approval_code, action_type, asset_id, proposed_data, requester, status)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (approval_code, 'update', asset_id, proposed_data, username, 'pending'))
            conn.commit()
            
            return jsonify({
                'approval_required': True,
                'message': '资产修改申请已提交审批，等待管理员审核。',
                'action_type': 'update'
            }), 202
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/assets/<int:asset_id>', methods=['DELETE'])
@token_required
def delete_asset(asset_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM assets WHERE id = ?", (asset_id,))
        asset = cursor.fetchone()
        if not asset:
            return jsonify({'message': 'Asset not found!'}), 404
            
        current_user = request.current_user
        role = current_user.get('role', 'user')
        username = current_user.get('sub')
        
        # Verify department-level permission for regular employees (IDOR check)
        if role != 'admin':
            cursor.execute("SELECT department FROM users WHERE username = ?", (username,))
            u_row = cursor.fetchone()
            user_dept = u_row['department'] if u_row else None
            if asset['department'] != user_dept:
                return jsonify({'message': '无权注销其他部门的资产！'}), 403
        operator_name = current_user.get('name') or username
        
        # 报废资产生命周期终结，任何人都不得再删除（应通过历史记录查询）
        if asset['status'] == 'Scrapped':
            return jsonify({'message': '该资产已被标记为「报废处置」状态，生命周期已终结，不允许对其进行任何删除操作！'}), 403
        
        if role == 'admin':
            # Log to asset_history [NEW]
            hist_details = f"管理员直接注销报废，清出资产库。原使用部门：{asset['department'] or '无'}，保管人：{asset['user_name'] or '无'}"
            cursor.execute("""
                INSERT INTO asset_history (asset_code, action_type, operator, details)
                VALUES (?, ?, ?, ?)
            """, (asset['asset_code'], 'delete', operator_name, hist_details))
            
            cursor.execute("DELETE FROM assets WHERE id = ?", (asset_id,))
            conn.commit()
            return jsonify({'message': 'Asset deleted successfully!'}), 200
        else:
            # Regular user submits a delete request
            import json
            proposed_data = json.dumps({
                'asset_code': asset['asset_code'],
                'name': asset['name'],
                'category': asset['category'],
                'price': asset['price'],
                'purchase_date': asset['purchase_date'],
                'status': asset['status'],
                'department': asset['department'],
                'user_name': asset['user_name'],
                'description': asset['description'],
                'image_url': asset['image_url']
            }, ensure_ascii=False)
            
            cursor.execute("SELECT user_id FROM users WHERE username = ?", (username,))
            u_row = cursor.fetchone()
            user_uid = u_row['user_id'] if u_row else "UID-999999"
            approval_code = generate_unique_approval_code(cursor, user_uid)
            
            cursor.execute("""
                INSERT INTO approvals (approval_code, action_type, asset_id, proposed_data, requester, status)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (approval_code, 'delete', asset_id, proposed_data, username, 'pending'))
            conn.commit()
            
            return jsonify({
                'approval_required': True,
                'message': '资产注销删除申请已提交审批，等待管理员审核。',
                'action_type': 'delete'
            }), 202
            
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

# --- Approval Management APIs [NEW] ---

@app.route('/api/approvals', methods=['GET'])
@token_required
def get_approvals():
    current_user = request.current_user
    role = current_user.get('role', 'user')
    username = current_user.get('sub')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if role == 'admin':
            cursor.execute("""
                SELECT a.*, u1.real_name AS requester_real_name, u1.user_id AS requester_user_id, u2.real_name AS reviewer_real_name
                FROM approvals a
                LEFT JOIN users u1 ON a.requester = u1.username
                LEFT JOIN users u2 ON a.reviewer = u2.username
                ORDER BY a.id DESC
            """)
        else:
            cursor.execute("""
                SELECT a.*, u1.real_name AS requester_real_name, u1.user_id AS requester_user_id, u2.real_name AS reviewer_real_name
                FROM approvals a
                LEFT JOIN users u1 ON a.requester = u1.username
                LEFT JOIN users u2 ON a.reviewer = u2.username
                WHERE a.requester = ?
                ORDER BY a.id DESC
            """, (username,))
            
        rows = cursor.fetchall()
        approvals = []
        for r in rows:
            approvals.append({
                'id': r['id'],
                'approval_code': r['approval_code'],
                'action_type': r['action_type'],
                'asset_id': r['asset_id'],
                'proposed_data': r['proposed_data'],
                'requester': r['requester_real_name'] or r['requester'],
                'requester_username': r['requester'],
                'requester_user_id': r['requester_user_id'] or '-',
                'status': r['status'],
                'reviewer': r['reviewer_real_name'] or r['reviewer'],
                'review_notes': r['review_notes'],
                'created_at': r['created_at'],
                'reviewed_at': r['reviewed_at']
            })
        return jsonify(approvals), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/approvals/<int:approval_id>/review', methods=['POST'])
@token_required
def review_approval(approval_id):
    current_user = request.current_user
    role = current_user.get('role', 'user')
    username = current_user.get('sub')
    operator_name = current_user.get('name') or username
    
    if role != 'admin':
        return jsonify({'message': 'Permission denied! Administrators only.'}), 403
        
    data = request.get_json()
    if not data or not data.get('status'):
        return jsonify({'message': 'Review status is required!'}), 400
        
    status = data.get('status').strip()
    review_notes = data.get('review_notes', '').strip()
    
    if status not in ('approved', 'rejected'):
        return jsonify({'message': 'Status must be either approved or rejected!'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM approvals WHERE id = ?", (approval_id,))
        approval = cursor.fetchone()
        if not approval:
            return jsonify({'message': 'Approval request not found!'}), 404
            
        if approval['status'] != 'pending':
            return jsonify({'message': 'This request has already been reviewed!'}), 400
            
        import json
        import datetime
        now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        if status == 'approved':
            proposed = json.loads(approval['proposed_data'])
            action = approval['action_type']
            asset_id = approval['asset_id']
            
            if action == 'create':
                # Check code uniqueness
                cursor.execute("SELECT COUNT(*) as count FROM assets WHERE asset_code = ?", (proposed['asset_code'],))
                if cursor.fetchone()["count"] > 0:
                    return jsonify({'message': f'资产编码 "{proposed["asset_code"]}" 已被其他资产占用，无法通过此审批！'}), 400
                    
                cursor.execute("""
                    INSERT INTO assets (asset_code, name, category, price, purchase_date, status, department, user_name, description, image_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (proposed['asset_code'], proposed['name'], proposed['category'], proposed['price'],
                      proposed['purchase_date'], proposed['status'], proposed['department'], proposed['user_name'],
                      proposed['description'], proposed.get('image_url', '')))
                
                # Log to asset_history
                hist_details = f"管理员核准登记入账. 类别：{proposed['category']}，单价：¥{proposed['price']}，初始状态：{proposed['status']}，保管人：{proposed['user_name'] or '无'}"
                cursor.execute("""
                    INSERT INTO asset_history (asset_code, action_type, operator, details)
                    VALUES (?, ?, ?, ?)
                """, (proposed['asset_code'], 'create', operator_name, hist_details))
                      
            elif action == 'update':
                cursor.execute("SELECT * FROM assets WHERE id = ?", (asset_id,))
                old = cursor.fetchone()
                if not old:
                    return jsonify({'message': 'Target asset no longer exists!'}), 400
                    
                # Check code uniqueness
                cursor.execute("SELECT COUNT(*) as count FROM assets WHERE asset_code = ? AND id != ?", (proposed['asset_code'], asset_id))
                if cursor.fetchone()["count"] > 0:
                    return jsonify({'message': f'资产编码 "{proposed["asset_code"]}" 已被其他资产占用，无法通过此审批！'}), 400
                    
                cursor.execute("""
                    UPDATE assets 
                    SET asset_code = ?, name = ?, category = ?, price = ?, purchase_date = ?, status = ?, department = ?, user_name = ?, description = ?, image_url = ?
                    WHERE id = ?
                """, (proposed['asset_code'], proposed['name'], proposed['category'], proposed['price'],
                      proposed['purchase_date'], proposed['status'], proposed['department'], proposed['user_name'],
                      proposed['description'], proposed.get('image_url', ''), asset_id))
                
                # Compare fields for detailed history log
                changes = []
                fields_map = {
                    'asset_code': '资产编码', 'name': '资产名称', 'category': '资产分类',
                    'price': '单价', 'purchase_date': '采购日期', 'status': '资产状态',
                    'department': '使用部门', 'user_name': '保管人员', 'description': '备注说明',
                    'image_url': '实物图'
                }
                category_names = { 'Electronics': '电子设备', 'Furniture': '办公家具', 'Software': '软件资产', 'Office': '行政耗材' }
                status_names = { 'Available': '闲置在库', 'In_Use': '分配在用', 'Maintenance': '维保检测', 'Scrapped': '报废处置' }
                
                for f, label in fields_map.items():
                    old_val = old[f]
                    new_val = proposed.get(f)
                    if old_val != new_val:
                        if f == 'category':
                            old_disp = category_names.get(old_val, old_val)
                            new_disp = category_names.get(new_val, new_val)
                        elif f == 'status':
                            old_disp = status_names.get(old_val, old_val)
                            new_disp = status_names.get(new_val, new_val)
                        elif f == 'price':
                            old_disp = f"¥{old_val}"
                            new_disp = f"¥{new_val}"
                        elif f == 'image_url':
                            old_urls = set(filter(None, (old_val or '').split(',')))
                            new_urls = set(filter(None, (new_val or '').split(',')))
                            added = len(new_urls - old_urls)
                            removed = len(old_urls - new_urls)
                            parts = []
                            if added: parts.append(f'新增{added}张图片')
                            if removed: parts.append(f'删除{removed}张图片')
                            if not parts: continue  # identical sets, skip
                            old_disp = f'{len(old_urls)}张' if old_urls else '无'
                            new_disp = f'{len(new_urls)}张' if new_urls else '无'
                            changes.append(f"{label}({old_disp}→{new_disp}，{'，'.join(parts)})")                            
                            continue
                        else:
                            old_disp = old_val or '无'
                            new_disp = new_val or '无'
                        changes.append(f"{label} ({old_disp} ➔ {new_disp})")
                
                hist_details = "变更属性：" + ", ".join(changes) if changes else "无属性实质变更"
                cursor.execute("""
                    INSERT INTO asset_history (asset_code, action_type, operator, details)
                    VALUES (?, ?, ?, ?)
                """, (proposed['asset_code'], 'update', operator_name, hist_details))
                      
            elif action == 'delete':
                cursor.execute("SELECT * FROM assets WHERE id = ?", (asset_id,))
                old = cursor.fetchone()
                code = old['asset_code'] if old else proposed['asset_code']
                
                cursor.execute("DELETE FROM assets WHERE id = ?", (asset_id,))
                
                hist_details = f"管理员核准注销报废，清出资产库。原保管人：{proposed.get('user_name') or '无'}"
                cursor.execute("""
                    INSERT INTO asset_history (asset_code, action_type, operator, details)
                    VALUES (?, ?, ?, ?)
                """, (code, 'delete', operator_name, hist_details))
                
        # Update approvals entry
        cursor.execute("""
            UPDATE approvals 
            SET status = ?, reviewer = ?, review_notes = ?, reviewed_at = ?
            WHERE id = ?
        """, (status, operator_name, review_notes, now_str, approval_id))
        
        conn.commit()
        return jsonify({'message': f'Approval request successfully {status}!'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

# --- Asset Physical Image Upload API ---

import uuid

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def verify_image_signature(file_stream) -> bool:
    """Verify that the file content actually matches an allowed image file signature (Magic Bytes)."""
    try:
        # Read the first 12 bytes
        header = file_stream.read(12)
        # Seek back to start
        file_stream.seek(0)
        
        if len(header) < 4:
            return False
            
        # 1. PNG Check
        if header.startswith(b'\x89PNG\r\n\x1a\n'):
            return True
            
        # 2. JPEG Check
        if header.startswith(b'\xff\xd8\xff'):
            return True
            
        # 3. GIF Check
        if header.startswith(b'GIF89a') or header.startswith(b'GIF87a'):
            return True
            
        # 4. WEBP Check
        if header.startswith(b'RIFF') and len(header) >= 12 and header[8:12] == b'WEBP':
            return True
            
        return False
    except Exception:
        return False

@app.route('/api/upload', methods=['POST'])
@token_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({'message': 'No file part in the request!'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file!'}), 400
        
    if file and allowed_file(file.filename):
        # 1. Enforce MIME type check
        allowed_mimes = {'image/png', 'image/jpeg', 'image/pjpeg', 'image/gif', 'image/webp'}
        if file.content_type not in allowed_mimes:
            return jsonify({'message': '上传文件的MIME类型不正确 (仅支持 png, jpg, jpeg, gif, webp)！'}), 400
            
        # 2. Enforce binary signature (Magic Bytes) check
        if not verify_image_signature(file.stream):
            return jsonify({'message': '图片文件已损坏或包含不受支持的二进制格式！'}), 400

        # Enforce 5MB limit
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > 5 * 1024 * 1024:
            return jsonify({'message': '图片大小超过限制，最高 5MB！'}), 400
            
        ext = file.filename.rsplit('.', 1)[1].lower()
        new_filename = f"img_{uuid.uuid4().hex}.{ext}"
        
        frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
        uploads_dir = os.path.join(frontend_dir, "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        
        file.save(os.path.join(uploads_dir, new_filename))
        return jsonify({'image_url': f'/uploads/{new_filename}'}), 200
    else:
        return jsonify({'message': '不支持的文件格式 (支持 png, jpg, jpeg, gif, webp)！'}), 400

# --- Admin User Registration Approvals APIs ---

@app.route('/api/admin/pending_users', methods=['GET'])
@token_required
def get_pending_users():
    current_user = request.current_user
    role = current_user.get('role', 'user')
    
    if role != 'admin':
        return jsonify({'message': 'Permission denied! Administrators only.'}), 403
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT u.id, u.user_id, u.username, u.real_name, u.phone, u.id_card, u.department, u.status, u.role, u.created_at,
                   a.approval_code
            FROM users u
            LEFT JOIN approvals a ON a.action_type = 'register' AND a.requester = u.username AND a.status = 'pending'
            WHERE u.status = 'pending' 
            ORDER BY u.id DESC
        """)
        rows = cursor.fetchall()
        users = []
        for r in rows:
            users.append({
                'id': r['id'],
                'username': r['username'],
                'real_name': r['real_name'],
                'phone': r['phone'],
                'id_card': mask_id_card(r['id_card']),
                'department': r['department'],
                'status': r['status'],
                'role': r['role'],
                'created_at': r['created_at'],
                'approval_code': r['approval_code'],
                'user_id': r['user_id']
            })
        return jsonify(users), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/admin/review_user', methods=['POST'])
@token_required
def review_user():
    current_user = request.current_user
    role = current_user.get('role', 'user')
    
    if role != 'admin':
        return jsonify({'message': 'Permission denied! Administrators only.'}), 403
        
    data = request.get_json()
    if not data or not data.get('username') or not data.get('action'):
        return jsonify({'message': 'Username and action (approve/reject) are required!'}), 400
        
    target_username = data.get('username').strip()
    action = data.get('action').strip()
    
    if action not in ('approve', 'reject'):
        return jsonify({'message': 'Action must be either approve or reject!'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE username = ?", (target_username,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'message': 'Target user not found!'}), 404
            
        if user['status'] != 'pending':
            return jsonify({'message': 'This user application has already been processed!'}), 400
            
        new_status = 'approved' if action == 'approve' else 'rejected'
        
        # Read optional admin edits
        real_name = data.get('real_name', user['real_name']).strip()
        phone = data.get('phone', user['phone']).strip()
        id_card = data.get('id_card', user['id_card']).strip()
        department = data.get('department', user['department']).strip()
        
        if '*' in id_card:
            id_card = user['id_card']
        
        if action == 'approve':
            if not re.match(r"^1[3-9]\d{9}$", phone):
                return jsonify({'message': '手机号码格式不正确，必须为11位中国手机号！'}), 400
            if not re.match(r"^\d{17}[\dXx]$", id_card):
                return jsonify({'message': '身份证号格式不正确，必须为18位身份证号！'}), 400
            if department not in ALLOWED_DEPARTMENTS and department != (user['department'] or '').strip():
                return jsonify({'message': '选择的部门不合法！请从标准部门列表中选择。'}), 400
                
        cursor.execute("""
            UPDATE users 
            SET status = ?, real_name = ?, phone = ?, id_card = ?, department = ? 
            WHERE username = ?
        """, (new_status, real_name, phone, id_card, department, target_username))
        
        import datetime
        import json
        now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        review_notes = data.get('review_notes', '').strip()
        reviewer_name = current_user.get('name') or current_user.get('sub', 'admin')
        
        updated_proposed = json.dumps({
            'real_name': real_name,
            'phone': phone,
            'id_card': id_card,
            'department': department
        })
        
        cursor.execute("""
            UPDATE approvals 
            SET status = ?, reviewer = ?, review_notes = ?, reviewed_at = ?, proposed_data = ?
            WHERE action_type = 'register' AND requester = ? AND status = 'pending'
        """, (new_status, reviewer_name, review_notes, now_str, updated_proposed, target_username))
        
        conn.commit()
        
        action_msg = "批准启用" if action == 'approve' else "拒绝驳回"
        return jsonify({'message': f'已成功 {action_msg} 用户 "{target_username}"。'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

# --- Telemetry/Dashboard Statistics API ---

@app.route('/api/stats', methods=['GET'])
@token_required
def get_stats():
    current_user = request.current_user
    role = current_user.get('role', 'user')
    username = current_user.get('sub')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    user_dept = None
    if role != 'admin':
        cursor.execute("SELECT department FROM users WHERE username = ?", (username,))
        u_row = cursor.fetchone()
        if u_row:
            user_dept = u_row['department']
            
    try:
        # Total asset count and total value
        if role == 'admin':
            cursor.execute("SELECT COUNT(*) as count, SUM(price) as total_val FROM assets")
            general = cursor.fetchone()
            
            # Count by status
            cursor.execute("SELECT status, COUNT(*) as count FROM assets GROUP BY status")
            status_rows = cursor.fetchall()
            
            # Count and total valuation by category
            cursor.execute("SELECT category, COUNT(*) as count, SUM(price) as total_val FROM assets GROUP BY category")
            cat_rows = cursor.fetchall()
        else:
            dept_val = user_dept or ""
            cursor.execute("SELECT COUNT(*) as count, SUM(price) as total_val FROM assets WHERE department = ?", (dept_val,))
            general = cursor.fetchone()
            
            cursor.execute("SELECT status, COUNT(*) as count FROM assets WHERE department = ? GROUP BY status", (dept_val,))
            status_rows = cursor.fetchall()
            
            cursor.execute("SELECT category, COUNT(*) as count, SUM(price) as total_val FROM assets WHERE department = ? GROUP BY category", (dept_val,))
            cat_rows = cursor.fetchall()
            
        total_count = general['count'] or 0
        total_value = general['total_val'] or 0.0
        
        status_map = {row['status']: row['count'] for row in status_rows}
        cat_map = {row['category']: {'count': row['count'], 'total_value': row['total_val'] or 0.0} for row in cat_rows}
        
        return jsonify({
            'total_count': total_count,
            'total_value': total_value,
            'by_status': status_map,
            'by_category': cat_map
        }), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

# --- Asset History / Lifecycle Log API [NEW] ---

@app.route('/api/assets/<string:asset_code>/history', methods=['GET'])
@token_required
def get_asset_history(asset_code):
    current_user = request.current_user
    role = current_user.get('role', 'user')
    username = current_user.get('sub')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check permissions for regular users (IDOR check)
        if role != 'admin':
            # Get user department
            cursor.execute("SELECT department FROM users WHERE username = ?", (username,))
            u_row = cursor.fetchone()
            user_dept = u_row['department'] if u_row else None
            
            # Get asset department
            cursor.execute("SELECT department FROM assets WHERE asset_code = ?", (asset_code,))
            a_row = cursor.fetchone()
            if not a_row or a_row['department'] != user_dept:
                return jsonify({'message': '无权访问该资产的生命周期记录！'}), 403
                
        cursor.execute("SELECT * FROM asset_history WHERE asset_code = ? ORDER BY created_at ASC", (asset_code,))
        rows = cursor.fetchall()
        history = []
        for r in rows:
            history.append({
                'id': r['id'],
                'asset_code': r['asset_code'],
                'action_type': r['action_type'],
                'operator': r['operator'],
                'details': r['details'],
                'created_at': r['created_at']
            })
        return jsonify(history), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

# --- Admin Account Management Console APIs [NEW] ---

@app.route('/api/admin/users', methods=['GET'])
@token_required
def get_all_users():
    current_user = request.current_user
    role = current_user.get('role', 'user')
    
    if role != 'admin':
        return jsonify({'message': 'Permission denied! Administrators only.'}), 403
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, username, real_name, phone, id_card, department, status, role, created_at 
            FROM users 
            ORDER BY id ASC
        """)
        rows = cursor.fetchall()
        users = []
        for r in rows:
            users.append({
                'id': r['id'],
                'username': r['username'],
                'real_name': r['real_name'],
                'phone': r['phone'],
                'id_card': mask_id_card(r['id_card']),
                'department': r['department'],
                'status': r['status'],
                'role': r['role'],
                'created_at': r['created_at']
            })
        return jsonify(users), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/admin/users/<string:username>', methods=['PUT'])
@token_required
def update_user_by_admin(username):
    current_user = request.current_user
    role = current_user.get('role', 'user')
    
    if role != 'admin':
        return jsonify({'message': 'Permission denied! Administrators only.'}), 403
        
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided!'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'message': 'User not found!'}), 404
            
        if username == 'admin':
            if data.get('role', 'admin') != 'admin' or data.get('status', 'approved') != 'approved':
                return jsonify({'message': '不能修改内置超级管理员的管理员角色或启用状态！'}), 400
                
        real_name = data.get('real_name', user['real_name']).strip()
        phone = data.get('phone', user['phone']).strip()
        id_card = data.get('id_card', user['id_card']).strip()
        department = data.get('department', user['department']).strip()
        new_role = data.get('role', user['role']).strip()
        new_status = data.get('status', user['status']).strip()
        password = data.get('password') # optional password reset
        
        if '*' in id_card:
            id_card = user['id_card']
        
        if new_role not in ('admin', 'user'):
            return jsonify({'message': '角色必须为 admin 或 user！'}), 400
            
        if new_status not in ('approved', 'pending', 'rejected', 'suspended'):
            return jsonify({'message': '状态必须为 approved, pending, rejected 或 suspended！'}), 400
            
        if not re.match(r"^1[3-9]\d{9}$", phone):
            return jsonify({'message': '手机号码格式不正确，必须为11位中国手机号！'}), 400
            
        if not re.match(r"^\d{17}[\dXx]$", id_card):
            return jsonify({'message': '身份证号格式不正确，必须为18位身份证号！'}), 400
            
        if department not in ALLOWED_DEPARTMENTS and department != (user['department'] or '').strip():
            return jsonify({'message': '选择的部门不合法！请从标准部门列表中选择。'}), 400
            
        hashed_password = None
        if password:
            is_strong, strength_msg = is_strong_password(password)
            if not is_strong:
                return jsonify({'message': strength_msg}), 400
            hashed_password = hash_password(password)
            
        if hashed_password:
            cursor.execute("""
                UPDATE users 
                SET real_name = ?, phone = ?, id_card = ?, department = ?, role = ?, status = ?, password = ? 
                WHERE username = ?
            """, (real_name, phone, id_card, department, new_role, new_status, hashed_password, username))
        else:
            cursor.execute("""
                UPDATE users 
                SET real_name = ?, phone = ?, id_card = ?, department = ?, role = ?, status = ? 
                WHERE username = ?
            """, (real_name, phone, id_card, department, new_role, new_status, username))
            
        conn.commit()
        return jsonify({'message': f'用户 "{username}" 账户信息已成功更新。'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/admin/users/<string:username>', methods=['DELETE'])
@token_required
def delete_user_by_admin(username):
    current_user = request.current_user
    role = current_user.get('role', 'user')
    
    if role != 'admin':
        return jsonify({'message': 'Permission denied! Administrators only.'}), 403
        
    if username == 'admin':
        return jsonify({'message': '不能删除内置超级管理员账号！'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        if not cursor.fetchone():
            return jsonify({'message': 'User not found!'}), 404
            
        cursor.execute("DELETE FROM users WHERE username = ?", (username,))
        conn.commit()
        return jsonify({'message': f'已成功删除用户账号 "{username}"。'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    # Start on port 5000, multi-threaded for responsiveness
    print("[*] Starting 汉中电信固定资产管理系统 Backend on http://127.0.0.1:5000 ...")
    app.run(host='127.0.0.1', port=5000, debug=True)
