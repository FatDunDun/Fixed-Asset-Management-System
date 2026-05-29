# 固资管家 (AssetWise) - 智能固定资产管理系统

固资管家（AssetWise）是一款极致现代化、轻量高效且视觉美观的**固定资产管理系统**。项目采用前后端分离的现代化架构，前端是基于 HTML5 / Vanilla CSS / ES6 JavaScript 构建的科技风玻璃拟态（Glassmorphism）单页应用（SPA），后端由 Python Flask 提供 RESTful API 路由，并自带轻量型 SQLite 数据库，具备完整的用户认证与资产管理 CRUD 功能。

---

## ✨ 核心特性

- 📱 **极致前卫的 UI/UX**：以深邃暗黑风为主体，搭配半透明毛玻璃材质、炫彩光环背景与流畅的微交互动画。
- 📊 **可视化数据图表**：纯原生 SVG 矢量计算渲染的资产健康饼图（支持零资产空状态优雅降级）与响应式分类估值条形图。
- 🔐 **轻量高安全级认证**：PBKDF2 密码哈希存储、纯 Python 手写的 HMAC-SHA256 签名型安全 JWT（JSON Web Token）无状态令牌鉴权。
- 🛠️ **全功能资产台账**：资产录入、即时多字段模糊检索、类别/状态组合条件过滤、字段排序、行内动态编辑以及带安全弹窗的二次确认物理删除。
- ⚡ **开箱即用，零环境依赖**：后端已集成静态前端页面托管，无需配置 Node.js/npm 开发环境，一条命令一键运行。

---

## 🏗️ 目录结构说明

```
/Users/micylt/Desktop/mangeer/
├── README.md                 # 启动与使用说明文档 (本文件)
├── backend/                  # Flask 后端服务
│   ├── app.py                # 主入口 (API 路由定义 + 前端静态托管)
│   ├── database.py           # SQLite 初始化及数据层操作
│   ├── auth.py               # PBKDF2 密码哈希与 JWT 身份验证
│   └── requirements.txt      # 后端运行依赖列表 (Flask, flask-cors)
└── frontend/                 # 单页前端静态资源
    ├── index.html            # 页面 DOM 结构骨架
    ├── style.css             # 极致现代玻璃拟态样式表
    └── app.js                # 前端交互核心控制引擎
```

---

## 🚀 启动与运行指南

### 1. 准备工作
请确保您的系统中已安装了 **Python 3.9+**。

### 2. 初始化虚拟环境并安装依赖
为了避免污染全局环境，建议在 `backend` 目录下创建并使用 Python 的虚拟环境 (`venv`)：

```bash
# 1. 切换至 backend 目录
cd backend

# 2. 创建 Python 虚拟环境 (仅首次需要)
python3 -m venv venv

# 3. 激活虚拟环境
source venv/bin/activate

# 4. 安装核心依赖
pip install -r requirements.txt
```

### 3. 一键启动服务
在激活虚拟环境的状态下，直接运行 `app.py` 启动完整系统：

```bash
python app.py
```

服务启动后，终端将输出：
`[*] Starting AssetWise Backend on http://127.0.0.1:5000 ...`

---

## 🖥️ 访问与默认凭据

打开浏览器并访问：
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

### 👤 默认管理员账户
系统在首次启动时，会自动创建并注入一个可直接登录的管理员账户，方便您即刻开始体验：
* **用户名**: `admin`
* **密   码**: `admin123`

*(注：您可以在注册界面随时创建全新账户体验多用户并发状态)*

---

# AssetWise - Intelligent Fixed Asset Management System

AssetWise is a modern, lightweight, and visually stunning **Fixed Asset Management System**. 
Featuring a strict frontend-backend decoupled architecture, the frontend is built using standard HTML5, ES6 JavaScript, and Vanilla CSS with an elegant dark glassmorphic layout. The backend is powered by Python 3 + Flask and SQLite, providing absolute stability and an instant out-of-the-box experience.

## ✨ Highlights

* **Ultra-Premium UI/UX**: Dark mode styling with glowing background blobs, frosted glass panels, and smooth micro-animations.
* **SVG Vector Data Analytics**: In-house SVG vector donut chart for asset health ratio status tracking and responsive category value progress charts.
* **Robust Auth Security**: PBKDF2 high-strength salt-hashing for passwords and HMAC-SHA256 signed stateless JWT token validation.
* **Unified Asset Ledger**: Smooth Add, Multi-field Fuzzy Search, Category/Status compound filters, Fields sorting, Row editing, and Safe delete confirmation.
* **Zero Configuration Run**: Serves the static assets natively from Flask. No npm or Node.js compilation required.

## 🚀 How to Run

1. Open your terminal, change directory to `backend/`.
2. Spin up a python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install minimum dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Fire up the application:
   ```bash
   python app.py
   ```
5. Navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your favorite browser.

### 👤 Default Administrator Credentials
* **Username**: `admin`
* **Password**: `admin123`
*(You are free to sign up new accounts in the Register interface)*
