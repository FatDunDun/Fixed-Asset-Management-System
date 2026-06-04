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

---

## 📱 微信小程序接入与部署指南 (WeChat Mini Program Guide)

本项目已针对微信小程序进行了全面适配改造，支持传统账户登录绑定、微信快捷登录、移动端数据看板统计、扫码查资产、拍照上传图片及移动端审批。

### 一、本地开发与调试步骤

如果你是首次开发微信小程序，请按照以下步骤在您的 Mac 上运行：

#### 1. 准备开发工具
1. 下载并安装官方 **[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)**。
2. （可选）在 **[微信公众平台](https://mp.weixin.qq.com)** 注册一个“小程序”账号，获取您的 `AppID`。如果没有账号，可以使用开发者工具的**测试号（游客模式）**进行开发体验。

#### 2. 导入小程序项目
1. 打开“微信开发者工具”，点击主界面的 **“导入”** 按钮。
2. 目录路径选择当前项目下的 **`miniprogram`** 文件夹（即 `/Users/micylt/Desktop/mangeer/miniprogram`）。
3. AppID 填写您注册得到的 AppID，或者直接点击选择 **“测试号”**（进入游客开发模式），项目名称可自定义为 `固资管家小程序`。
4. 点击“导入”完成加载。

#### 3. 配置本地开发“不校验”设置（极其重要 ⚠️）
由于本地 Flask 后端运行在 `https://127.0.0.1:5001` 上并使用自签名的 SSL 证书，微信小程序默认会拦截此类连接。我们需要在工具中将其关闭：
1. 在微信开发者工具右上角，点击 **“详情”** 按钮。
2. 在弹出的侧边栏中选择 **“本地设置”**。
3. 勾选 **“不校验合法域名、web-view（业务域名）、TLS版本以及HTTPS证书”** 选项。

#### 4. 运行后端服务
在终端中进入项目后端目录，并启动 Flask 后端：
```bash
cd /Users/micylt/Desktop/mangeer/backend
source venv/bin/activate
python app.py
```
后端会开始运行，打印出类似于 `[*] Starting 汉中电信固定资产管理系统 Backend on https://127.0.0.1:5001 ...` 级别的提示。

#### 5. 小程序内测试与绑定
1. 在开发者工具左侧的“小程序模拟器”中，点击 **“微信一键快捷登录”**。
2. 因为本地运行，后端会自动启动**沙盒开发模式**，生成一个虚拟的 OpenID。
3. 模拟器将提示“您的微信账号尚未绑定系统员工账号”。此时在表单中输入系统预设的管理员账户 `admin` / `admin123`（或者员工账号 `staff` / `staff123`），点击 **“绑定并登录”**。
4. 绑定成功后，即可自动进入工作台看板，查阅数据，体验微信扫码、资产拍照上传等全部功能！

---

### 二、线上正式发布与上线部署

当您准备将系统部署到云端服务器正式对外上线时，需要完成以下工作：

#### 1. 服务器与 HTTPS 证书配置
- 微信小程序在线上只支持真正的域名通信，不支持 IP 地址，且域名必须配置正规的 CA 商业机构签发的 SSL 证书（HTTPS）。
- 请在您的云服务器（如腾讯云、阿里云）上部署 Flask 后端，并使用 Nginx 代理域名（如 `https://yourdomain.com`），配置好 HTTPS 证书。

#### 2. 配置后端微信登录环境变量
在您的云服务器后端运行环境中，配置以下环境变量，使后端能够安全请求微信官方接口获取用户真实 OpenID：
- `WX_APPID`: 您的小程序 AppID。
- `WX_SECRET`: 您的小程序 AppSecret（在微信公众平台的 开发管理 -> 开发设置 中获取并保护）。

#### 3. 配置微信小程序后台合法域名白名单
1. 登录 **[微信公众平台](https://mp.weixin.qq.com)**，进入您小程序的管理后台。
2. 选择左侧导航栏 **“开发” -> “开发管理” -> “开发设置”**。
3. 找到 **“服务器域名”** 选项，在 `request合法域名` 和 `uploadFile合法域名` 中添加您的服务器域名（例如 `https://yourdomain.com`）。

#### 4. 修改小程序前端 API 域名指向
1. 打开小程序项目中的 [miniprogram/app.js](file:///Users/micylt/Desktop/mangeer/miniprogram/app.js) 文件。
2. 将 `globalData` 中的 `apiBase` 修改为您云服务器的真实 API 接口地址：
   ```javascript
   globalData: {
     apiBase: 'https://yourdomain.com/api', // 改为您线上的真实 HTTPS 域名 api 路径
     token: '',
     userInfo: null,
     openid: ''
   }
   ```

#### 5. 编译与上传审核
1. 在“微信开发者工具”顶部工具栏中，点击 **“上传”** 按钮。
2. 填写版本号（如 `1.0.0`）与备注（如 `首个版本发布`），点击上传。
3. 登录小程序管理后台，进入 **“版本管理”**，可以看到您刚刚上传的开发版本。
4. 点击 **“提交审核”**，等待微信官方审核通过后，即可点击 **“发布”**，所有员工即可在微信中搜索到您的小程序并扫码使用！

