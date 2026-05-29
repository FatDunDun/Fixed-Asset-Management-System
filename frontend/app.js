/* ==========================================================================
   AssetWise SPA Application Core Engine (ES6 Module Structure)
   ========================================================================== */

const API_BASE = '/api';

// --- HTML Escaping for XSS Prevention ---
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// --- Department Loading & Dynamic Dropdown Selections [NEW] ---
async function loadDepartments() {
    try {
        const depts = await fetchAPI('/departments');
        state.departments = depts;
        
        // Populate the register form dropdown immediately
        const registerDept = document.getElementById('register-dept');
        if (registerDept) {
            populateDeptDropdown(registerDept, '', true, '请选择所属部门...');
        }
    } catch (err) {
        console.error("Failed to load standard departments list:", err);
    }
}

function populateDeptDropdown(selectElem, currentValue, isRequired = false, placeholderText = '请选择部门...') {
    if (!selectElem) return;
    selectElem.innerHTML = '';
    
    // Default/Placeholder option
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = placeholderText;
    if (isRequired) {
        defaultOpt.disabled = true;
    }
    if (!currentValue) {
        defaultOpt.selected = true;
    }
    selectElem.appendChild(defaultOpt);
    
    let currentInList = false;
    (state.departments || []).forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept;
        opt.textContent = dept;
        if (dept === currentValue) {
            opt.selected = true;
            currentInList = true;
        }
        selectElem.appendChild(opt);
    });
    
    // Append the legacy department if it is active but not in standard departments
    if (currentValue && !currentInList) {
        const legacyOpt = document.createElement('option');
        legacyOpt.value = currentValue;
        legacyOpt.textContent = `${currentValue} (历史数据)`;
        legacyOpt.selected = true;
        selectElem.appendChild(legacyOpt);
    }
}

function buildDeptOptionsHtml(currentValue, isRequired = false, placeholderText = '请选择部门...') {
    let html = `<option value="" ${isRequired ? 'disabled' : ''} ${!currentValue ? 'selected' : ''}>${escapeHTML(placeholderText)}</option>`;
    let found = false;
    (state.departments || []).forEach(dept => {
        const isSelected = (dept === currentValue);
        if (isSelected) found = true;
        html += `<option value="${escapeHTML(dept)}" ${isSelected ? 'selected' : ''}>${escapeHTML(dept)}</option>`;
    });
    if (currentValue && !found) {
        html += `<option value="${escapeHTML(currentValue)}" selected>${escapeHTML(currentValue)} (历史数据)</option>`;
    }
    return html;
}

// --- State Management ---
const state = {
    token: sessionStorage.getItem('token') || '',
    username: sessionStorage.getItem('username') || '',
    realName: sessionStorage.getItem('realName') || '',
    role: sessionStorage.getItem('role') || 'admin',
    currentPanel: 'panel-dashboard',
    assets: [],
    stats: null,
    approvals: [],
    sortField: 'id',
    sortAscending: false, // Default desc
    deleteAssetId: null,
    uploadedImages: [], // Track uploaded image URLs during modal lifecycle
    departments: [] // Standardized allowed departments list
};

// --- DOM References Cache ---
const DOM = {
    authSection: document.getElementById('auth-section'),
    appContainer: document.getElementById('app-container'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    goToRegister: document.getElementById('go-to-register'),
    goToLogin: document.getElementById('go-to-login'),
    
    // Nav Items
    navItems: document.querySelectorAll('.nav-item'),
    panels: document.querySelectorAll('.content-panel'),
    pageTitle: document.getElementById('page-title'),
    pageSubtitle: document.getElementById('page-subtitle'),
    
    // User profile in sidebar
    userDisplayName: document.getElementById('user-display-name'),
    userDisplayRole: document.getElementById('user-display-role'),
    btnLogout: document.getElementById('btn-logout'),
    
    // Time ticker
    systemTime: document.getElementById('system-time'),
    
    // Stats elements
    statTotalCount: document.getElementById('stat-total-count'),
    statTotalValue: document.getElementById('stat-total-value'),
    statInUse: document.getElementById('stat-in-use'),
    statMaintenance: document.getElementById('stat-maintenance'),
    
    // Donut elements
    donutCenterPercentage: document.getElementById('donut-center-percentage'),
    donutCenterLabel: document.getElementById('donut-center-label'),
    countAvail: document.getElementById('count-avail'),
    countUse: document.getElementById('count-use'),
    countMaint: document.getElementById('count-maint'),
    countScrap: document.getElementById('count-scrap'),
    donutTrack: document.querySelector('.donut-track'),
    donutSvg: document.querySelector('.donut-svg'),
    
    // Category list
    categoryBars: document.getElementById('category-bars'),
    
    // Filter controls
    searchInput: document.getElementById('search-input'),
    filterCategory: document.getElementById('filter-category'),
    filterStatus: document.getElementById('filter-status'),
    sortBy: document.getElementById('sort-by'),
    btnSortOrder: document.getElementById('btn-sort-order'),
    btnAddAsset: document.getElementById('btn-add-asset'),
    btnEmptyAddAsset: document.getElementById('btn-empty-add-asset'),
    btnExportAssets: document.getElementById('btn-export-assets'),
    
    // Asset Table
    assetsTableBody: document.getElementById('assets-table-body'),
    tableEmptyState: document.getElementById('table-empty-state'),
    
    // Approvals elements
    navApprovals: document.getElementById('nav-approvals'),
    btnExportApprovals: document.getElementById('btn-export-approvals'),
    approvalBadgeCount: document.getElementById('approval-badge-count'),
    approvalsAdminSection: document.getElementById('approvals-admin-section'),
    approvalsUserSection: document.getElementById('approvals-user-section'),
    approvalsAdminList: document.getElementById('approvals-admin-list'),
    approvalsUserTableBody: document.getElementById('approvals-user-table-body'),
    approvalsAdminEmpty: document.getElementById('approvals-admin-empty'),
    approvalsUserEmpty: document.getElementById('approvals-user-empty'),
    
    // Asset Modal
    assetModal: document.getElementById('asset-modal'),
    assetForm: document.getElementById('asset-form'),
    modalTitle: document.getElementById('modal-title'),
    assetId: document.getElementById('asset-id'),
    assetCode: document.getElementById('asset-code'),
    assetName: document.getElementById('asset-name'),
    assetCategory: document.getElementById('asset-category'),
    assetPrice: document.getElementById('asset-price'),
    assetDate: document.getElementById('asset-date'),
    assetStatus: document.getElementById('asset-status'),
    assetDept: document.getElementById('asset-dept'),
    assetUsername: document.getElementById('asset-username'),
    assetDesc: document.getElementById('asset-desc'),
    
    // Delete Modal
    deleteModal: document.getElementById('delete-modal'),
    deleteAssetName: document.getElementById('delete-asset-name'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete'),
    
    // Account management [NEW]
    navUsers: document.getElementById('nav-users'),
    panelUsers: document.getElementById('panel-users'),
    usersTableBody: document.getElementById('users-table-body'),
    usersEmpty: document.getElementById('users-empty'),
    userEditModal: document.getElementById('user-edit-modal'),
    userEditForm: document.getElementById('user-edit-form'),
    
    // Lifecycle timeline [NEW]
    lifecycleModal: document.getElementById('lifecycle-modal'),
    lifecycleTimeline: document.getElementById('lifecycle-timeline'),
    lifecycleAssetCode: document.getElementById('lifecycle-asset-code'),
    lifecycleAssetName: document.getElementById('lifecycle-asset-name'),
    
    // Asset details [NEW]
    detailsModal: document.getElementById('asset-details-modal'),
    detailImg: document.getElementById('detail-asset-img'),
    detailImgPlaceholder: document.getElementById('detail-asset-img-placeholder'),
    detailName: document.getElementById('detail-asset-name'),
    detailCode: document.getElementById('detail-asset-code'),
    detailCategory: document.getElementById('detail-asset-category'),
    detailPrice: document.getElementById('detail-asset-price'),
    detailDate: document.getElementById('detail-asset-date'),
    detailStatus: document.getElementById('detail-asset-status'),
    detailDept: document.getElementById('detail-asset-dept'),
    detailUsername: document.getElementById('detail-asset-username'),
    detailDesc: document.getElementById('detail-asset-desc'),
    detailTimeline: document.getElementById('detail-asset-timeline'),
    
    // Close Modal triggers
    btnCloseModals: document.querySelectorAll('.btn-close-modal')
};

// ==========================================================================
// 1. Toast Alerts Engine
// ==========================================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-xmark';
    if (type === 'info') iconClass = 'fa-circle-info';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon"></i>
        <span>${escapeHTML(message)}</span>
    `;
    
    container.appendChild(toast);
    
    // Automatic removal with sliding exit animation
    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, 3500);
}

// ==========================================================================
// 2. Global Headers & API Fetch Wrapper (Includes Auth handling)
// ==========================================================================
async function fetchAPI(endpoint, options = {}) {
    // Inject JWT authentication header
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }
    
    const fetchOptions = {
        ...options,
        headers
    };
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);
        
        // Handle Session Expiration / Unauthorized
        if (response.status === 401 && endpoint !== '/login') {
            showToast('您的会话已过期，请重新登录！', 'error');
            logout();
            throw new Error('Unauthorized');
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || '请求失败，请稍后重试！');
        }
        
        return data;
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            showToast(error.message, 'error');
        }
        throw error;
    }
}

// ==========================================================================
// 3. User Authentication Flows
// ==========================================================================
function setupAuthEvents() {
    // Toggle View triggers
    DOM.goToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        DOM.loginForm.classList.remove('active');
        document.querySelector('.auth-card').classList.add('register-mode');
        setTimeout(() => {
            DOM.registerForm.classList.add('active');
            document.getElementById('auth-subtitle').textContent = '申请注册企业普通员工账户';
        }, 150);
    });
    
    DOM.goToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        DOM.registerForm.classList.remove('active');
        document.querySelector('.auth-card').classList.remove('register-mode');
        setTimeout(() => {
            DOM.loginForm.classList.add('active');
            document.getElementById('auth-subtitle').textContent = '轻松掌控您的企业固定资产';
        }, 150);
    });
    
    // Forgot Password Transition Triggers [NEW]
    const goToForgot = document.getElementById('go-to-forgot');
    const goToLoginFromForgot = document.getElementById('go-to-login-from-forgot');
    const forgotForm = document.getElementById('forgot-form');
    
    if (goToForgot && forgotForm) {
        goToForgot.addEventListener('click', (e) => {
            e.preventDefault();
            DOM.loginForm.classList.remove('active');
            document.querySelector('.auth-card').classList.remove('register-mode');
            setTimeout(() => {
                forgotForm.classList.add('active');
                document.getElementById('auth-subtitle').textContent = '安全自助找回与重置员工账户密码';
            }, 150);
        });
    }
    
    if (goToLoginFromForgot && forgotForm) {
        goToLoginFromForgot.addEventListener('click', (e) => {
            e.preventDefault();
            forgotForm.classList.remove('active');
            document.querySelector('.auth-card').classList.remove('register-mode');
            setTimeout(() => {
                DOM.loginForm.classList.add('active');
                document.getElementById('auth-subtitle').textContent = '轻松掌控您的企业固定资产';
            }, 150);
        });
    }
    
    // Submit Forgot Password Flow [NEW]
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('forgot-username').value.trim();
            const real_name = document.getElementById('forgot-realname').value.trim();
            const phone = document.getElementById('forgot-phone').value.trim();
            const id_card = document.getElementById('forgot-idcard').value.trim();
            const new_password = document.getElementById('forgot-password').value;
            const confirm_password = document.getElementById('forgot-confirm-password').value;
            
            if (new_password !== confirm_password) {
                showToast('两次新密码输入不一致，请检查！', 'error');
                return;
            }
            
            try {
                const res = await fetchAPI('/forgot_password', {
                    method: 'POST',
                    body: JSON.stringify({ username, real_name, phone, id_card, new_password })
                });
                showToast(res.message || '密码已成功重置，请登录！', 'success');
                
                forgotForm.reset();
                forgotForm.classList.remove('active');
                setTimeout(() => {
                    DOM.loginForm.classList.add('active');
                    document.getElementById('auth-subtitle').textContent = '轻松掌控您的企业固定资产';
                }, 150);
            } catch (err) {
                // Handled
            }
        });
    }
    
    // Live Password Strength Auditing Engine
    const regPassword = document.getElementById('register-password');
    const regConfirmPassword = document.getElementById('register-confirm-password');
    const submitBtn = document.getElementById('btn-submit-register');
    
    function validatePasswordStrength() {
        const pwd = regPassword.value;
        const confirmPwd = regConfirmPassword.value;
        
        const hasLength = pwd.length >= 8;
        const hasUpper = /[A-Z]/.test(pwd);
        const hasLower = /[a-z]/.test(pwd);
        const hasNumber = /[0-9]/.test(pwd);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\|/~`';]/.test(pwd);
        const matches = pwd === confirmPwd && pwd.length > 0;
        
        function updateRule(elementId, iconId, isValid) {
            const el = document.getElementById(elementId);
            const ico = document.getElementById(iconId);
            if (!el || !ico) return;
            if (isValid) {
                el.classList.add('valid');
                ico.className = 'fa-solid fa-circle-check';
            } else {
                el.classList.remove('valid');
                ico.className = 'fa-regular fa-circle';
            }
        }
        
        updateRule('req-length', 'ico-length', hasLength);
        updateRule('req-upper', 'ico-upper', hasUpper);
        updateRule('req-lower', 'ico-lower', hasLower);
        updateRule('req-number', 'ico-number', hasNumber);
        updateRule('req-special', 'ico-special', hasSpecial);
        updateRule('req-match', 'ico-match', matches);
        
        let score = 0;
        if (hasLength) score += 20;
        if (hasUpper) score += 20;
        if (hasLower) score += 20;
        if (hasNumber) score += 20;
        if (hasSpecial) score += 20;
        
        const bar = document.getElementById('password-strength-bar');
        const txt = document.getElementById('strength-text');
        
        if (bar && txt) {
            bar.style.width = `${score}%`;
            if (score <= 40) {
                bar.style.backgroundColor = 'var(--danger)';
                txt.textContent = '弱';
                txt.style.color = 'var(--danger)';
            } else if (score <= 80) {
                bar.style.backgroundColor = 'var(--orange)';
                txt.textContent = '中';
                txt.style.color = 'var(--orange)';
            } else {
                bar.style.backgroundColor = 'var(--green)';
                txt.textContent = '强';
                txt.style.color = 'var(--green)';
            }
        }
        
        if (hasLength && hasUpper && hasLower && hasNumber && hasSpecial && matches) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }
    
    if (regPassword && regConfirmPassword) {
        regPassword.addEventListener('input', validatePasswordStrength);
        regConfirmPassword.addEventListener('input', validatePasswordStrength);
    }
    
    // Register submission
    DOM.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const password = regPassword.value;
        const real_name = document.getElementById('register-realname').value.trim();
        const phone = document.getElementById('register-phone').value.trim();
        const id_card = document.getElementById('register-idcard').value.trim();
        const department = document.getElementById('register-dept').value.trim();
        
        try {
            await fetchAPI('/register', {
                method: 'POST',
                body: JSON.stringify({ username, password, real_name, phone, id_card, department })
            });
            showToast('申请提交成功！正在等待管理员审核启用...', 'success');
            DOM.registerForm.reset();
            validatePasswordStrength();
            DOM.goToLogin.click();
        } catch (err) {
            // Handled
        }
    });
    
    // Login submission
    DOM.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        
        try {
            const data = await fetchAPI('/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            
            // Save Session State
            state.token = data.token;
            state.username = data.username;
            state.realName = data.real_name;
            state.role = data.role;
            
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('username', data.username);
            sessionStorage.setItem('realName', data.real_name);
            sessionStorage.setItem('role', data.role);
            
            showToast(`欢迎回来，${data.real_name || data.username}！`, 'success');
            DOM.loginForm.reset();
            
            enterApplication();
        } catch (err) {
            // Error already handled
        }
    });
    
    // Logout trigger
    DOM.btnLogout.addEventListener('click', () => {
        logout();
        showToast('已安全退出汉中电信固定资产管理系统！', 'info');
    });
}

let approvalsInterval = null;

function startApprovalsPolling() {
    loadApprovalsBadge();
    clearInterval(approvalsInterval);
    approvalsInterval = setInterval(loadApprovalsBadge, 15000); // Poll every 15s
}

function enterApplication() {
    DOM.authSection.classList.add('hidden');
    DOM.appContainer.classList.remove('hidden');
    
    // Bind Sidebar Profile Info
    DOM.userDisplayName.textContent = state.realName || state.username;
    DOM.userDisplayRole.textContent = state.role === 'admin' ? '系统管理员' : '普通用户';
    DOM.userDisplayRole.className = `badge badge-${state.role}`;
    
    // Set initial date helper for add asset input field
    DOM.assetDate.value = new Date().toISOString().split('T')[0];
    
    // Fetch stats and lists
    loadDashboardData();
    loadAssets();
    
    if (state.role === 'admin') {
        startApprovalsPolling();
        if (DOM.navUsers) DOM.navUsers.classList.remove('hidden');
    } else {
        DOM.approvalBadgeCount.classList.add('hidden');
        if (DOM.navUsers) DOM.navUsers.classList.add('hidden');
    }
}

function logout() {
    state.token = '';
    state.username = '';
    state.realName = '';
    state.role = '';
    sessionStorage.clear();
    clearInterval(approvalsInterval);
    
    if (DOM.navUsers) DOM.navUsers.classList.add('hidden');
    DOM.appContainer.classList.add('hidden');
    DOM.authSection.classList.remove('hidden');
    DOM.goToLogin.click();
}

// ==========================================================================
// 4. SPA Navigation Controller (Routing)
// ==========================================================================
function setupNavigation() {
    DOM.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPanelId = item.getAttribute('data-target');
            
            // Toggle sidebar active highlights
            DOM.navItems.forEach(ni => ni.classList.remove('active'));
            item.classList.add('active');
            
            // Toggle Main Panel visibility
            DOM.panels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === targetPanelId) {
                    panel.classList.add('active');
                }
            });
            
            // Sync page titles
            state.currentPanel = targetPanelId;
            if (targetPanelId === 'panel-dashboard') {
                DOM.pageTitle.textContent = '资产监控中心';
                DOM.pageSubtitle.textContent = '实时反馈企业资产健康状况与分配统计';
                loadDashboardData(); // Refresh metrics whenever returning to dashboard
            } else if (targetPanelId === 'panel-assets') {
                DOM.pageTitle.textContent = '资产台账管理';
                DOM.pageSubtitle.textContent = '进行资产录入、修改信息、折旧分析与报废销账';
                loadAssets(); // Refresh asset list
            } else if (targetPanelId === 'panel-approvals') {
                DOM.pageTitle.textContent = '资产变更审批中心';
                DOM.pageSubtitle.textContent = '提交或审核资产登记、修改信息与注销报废的审批单';
                loadApprovals(); // Refresh approvals list
            } else if (targetPanelId === 'panel-users') {
                DOM.pageTitle.textContent = '员工账号管理中心';
                DOM.pageSubtitle.textContent = '审核新员工账号准入，分配系统角色及锁定/删除账号操作';
                loadAllUsers(); // Refresh users list
            }
        });
    });
}

// ==========================================================================
// 5. Dashboard Charts & Visual Telemetry Engine
// ==========================================================================
async function loadDashboardData() {
    try {
        const stats = await fetchAPI('/stats');
        state.stats = stats;
        
        // 1. Render numeric counters
        animateCounter('stat-total-count', stats.total_count);
        animateValue('stat-total-value', stats.total_value);
        animateCounter('stat-in-use', stats.by_status['In_Use'] || 0);
        animateCounter('stat-maintenance', stats.by_status['Maintenance'] || 0);
        
        // 2. Load Status circular charts
        renderStatusDonut(stats);
        
        // 3. Load Category stacked bar charts
        renderCategoryValuations(stats);
    } catch (err) {
        console.error("Dashboard fetching failure:", err);
    }
}

// Math animation wrappers
function animateCounter(elementId, targetVal) {
    const el = document.getElementById(elementId);
    let start = 0;
    const duration = 800; // ms
    const increment = Math.ceil(targetVal / (duration / 16));
    
    if (targetVal === 0) {
        el.textContent = "0";
        return;
    }
    
    const timer = setInterval(() => {
        start += increment;
        if (start >= targetVal) {
            clearInterval(timer);
            el.textContent = targetVal.toLocaleString('zh-CN');
        } else {
            el.textContent = start.toLocaleString('zh-CN');
        }
    }, 16);
}

function animateValue(elementId, targetVal) {
    const el = document.getElementById(elementId);
    let start = 0;
    const duration = 800;
    const increment = targetVal / (duration / 16);
    
    if (targetVal === 0) {
        el.textContent = "¥0.00";
        return;
    }
    
    const timer = setInterval(() => {
        start += increment;
        if (start >= targetVal) {
            clearInterval(timer);
            el.textContent = `¥${targetVal.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
            el.textContent = `¥${start.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    }, 16);
}

function renderStatusDonut(stats) {
    const total = stats.total_count;
    
    // Inject status counts to legend cards
    const avail = stats.by_status['Available'] || 0;
    const use = stats.by_status['In_Use'] || 0;
    const maint = stats.by_status['Maintenance'] || 0;
    const scrap = stats.by_status['Scrapped'] || 0;
    
    DOM.countAvail.textContent = avail;
    DOM.countUse.textContent = use;
    DOM.countMaint.textContent = maint;
    DOM.countScrap.textContent = scrap;
    
    // Clear dynamic segments first
    const dynamicSegments = DOM.donutSvg.querySelectorAll('.donut-segment');
    dynamicSegments.forEach(s => s.remove());
    
    if (total === 0) {
        DOM.donutTrack.style.stroke = "rgba(255, 255, 255, 0.05)";
        DOM.donutCenterPercentage.textContent = "0%";
        DOM.donutCenterLabel.textContent = "暂无实物资产";
        return;
    }
    
    DOM.donutTrack.style.stroke = "rgba(255, 255, 255, 0.03)";
    
    // Circle math parameters
    const r = 80;
    const circumference = 2 * Math.PI * r; // 502.65
    
    const statuses = [
        { key: 'Available', color: 'var(--green)', glow: 'var(--green-glow)', count: avail },
        { key: 'In_Use', color: 'var(--cyan)', glow: 'var(--cyan-glow)', count: use },
        { key: 'Maintenance', color: 'var(--orange)', glow: 'var(--orange-glow)', count: maint },
        { key: 'Scrapped', color: 'var(--danger)', glow: 'var(--danger-glow)', count: scrap }
    ];
    
    let currentOffset = 0;
    
    statuses.forEach(status => {
        if (status.count === 0) return;
        
        const ratio = status.count / total;
        const strokeLength = circumference * ratio;
        const strokeSpace = circumference - strokeLength;
        const strokeOffset = circumference - currentOffset;
        
        // Create an SVG circle element representing the segment
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", "110");
        circle.setAttribute("cy", "110");
        circle.setAttribute("r", r.toString());
        circle.className.baseVal = "donut-segment";
        circle.style.stroke = status.color;
        circle.style.filter = `drop-shadow(0 0 6px ${status.glow})`;
        
        // Apply dash offset calculations
        circle.style.strokeDasharray = `${strokeLength} ${strokeSpace}`;
        circle.style.strokeDashoffset = strokeOffset.toString();
        
        DOM.donutSvg.appendChild(circle);
        
        currentOffset += strokeLength;
    });
    
    // Set Center Telemetry Score (Available + In_Use counts represent overall enterprise health)
    const normalCount = avail + use;
    const healthPercentage = Math.round((normalCount / total) * 100);
    
    DOM.donutCenterPercentage.textContent = `${healthPercentage}%`;
    
    if (healthPercentage >= 90) DOM.donutCenterLabel.textContent = "运行正常";
    else if (healthPercentage >= 70) DOM.donutCenterLabel.textContent = "亚健康警示";
    else DOM.donutCenterLabel.textContent = "急需维保整备";
}

function renderCategoryValuations(stats) {
    DOM.categoryBars.innerHTML = '';
    
    const categoryMapping = {
        'Electronics': { name: '电子设备', icon: '🔌', fillClass: 'fill-electronics' },
        'Furniture': { name: '办公家具', icon: '🛋️', fillClass: 'fill-furniture' },
        'Software': { name: '软件资产', icon: '💿', fillClass: 'fill-software' },
        'Office': { name: '行政耗材', icon: '📎', fillClass: 'fill-office' }
    };
    
    const totalVal = stats.total_value;
    
    if (stats.total_count === 0) {
        DOM.categoryBars.innerHTML = `
            <div class="empty-state-small text-muted flex-center">
                <i class="fa-regular fa-folder-open"></i> 暂无分类数据，录入资产后将自动统计
            </div>
        `;
        return;
    }
    
    // Sort categories by aggregate valuation to show ranking
    const sortedCats = Object.entries(categoryMapping).map(([key, config]) => {
        // Calculate total value and count for this category from backend stats
        const catData = stats.by_category[key] || { count: 0, total_value: 0.0 };
        const value = catData.total_value || 0.0;
        const count = catData.count || 0;
        return { key, ...config, value, count };
    }).sort((a, b) => b.value - a.value);
    
    sortedCats.forEach(cat => {
        const percentage = totalVal > 0 ? Math.round((cat.value / totalVal) * 100) : 0;
        
        const card = document.createElement('div');
        card.className = 'category-bar-row';
        card.innerHTML = `
            <div class="bar-row-info">
                <span class="cat-label">${cat.icon} ${cat.name} (${cat.count}台)</span>
                <span class="cat-value">
                    <strong>¥${cat.value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    <span class="text-muted">| ${percentage}%</span>
                </span>
            </div>
            <div class="progress-track">
                <div class="progress-bar-fill ${cat.fillClass}" style="width: 0%"></div>
            </div>
        `;
        
        DOM.categoryBars.appendChild(card);
        
        // Trigger smooth loading animations in microtask queue
        setTimeout(() => {
            const bar = card.querySelector('.progress-bar-fill');
            if (bar) bar.style.width = `${percentage}%`;
        }, 50);
    });
}

// ==========================================================================
// 6. Assets Ledger CRUD Operations
// ==========================================================================
async function loadAssets() {
    const q = DOM.searchInput.value.trim();
    const category = DOM.filterCategory.value;
    const status = DOM.filterStatus.value;
    const sortBy = DOM.sortBy.value;
    const sortOrder = state.sortAscending ? 'asc' : 'desc';
    
    // 1. Construct URL search parameters
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    params.append('sort_by', sortBy);
    params.append('sort_order', sortOrder);
    
    try {
        const assets = await fetchAPI(`/assets?${params.toString()}`);
        state.assets = assets;
        
        renderAssetsTable();
    } catch (err) {
        console.error("Asset loading failure:", err);
    }
}

function renderAssetsTable() {
    DOM.assetsTableBody.innerHTML = '';
    
    if (state.assets.length === 0) {
        DOM.assetsTableBody.parentElement.classList.add('hidden');
        DOM.tableEmptyState.classList.remove('hidden');
        return;
    }
    
    DOM.assetsTableBody.parentElement.classList.remove('hidden');
    DOM.tableEmptyState.classList.add('hidden');
    
    const categoryBadges = {
        'Electronics': '🔌 电子设备',
        'Furniture': '🛋️ 办公家具',
        'Software': '💿 软件资产',
        'Office': '📎 行政耗材'
    };
    
    const statusBadges = {
        'Available': { text: '闲置在库', class: 'badge-available' },
        'In_Use': { text: '分配在用', class: 'badge-in-use' },
        'Maintenance': { text: '维保检测', class: 'badge-maintenance' },
        'Scrapped': { text: '报废处置', class: 'badge-scrapped' }
    };
    
    state.assets.forEach(asset => {
        const tr = document.createElement('tr');
        tr.id = `row-asset-${asset.id}`;
        
        const priceStr = asset.price.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const statConfig = statusBadges[asset.status] || { text: asset.status, class: 'badge-secondary' };
        
        let firstImg = '';
        let imgCount = 0;
        if (asset.image_url) {
            const urls = asset.image_url.split(',').filter(u => u.trim() !== '');
            if (urls.length > 0) {
                firstImg = urls[0];
                imgCount = urls.length;
            }
        }
        
        const imgCell = firstImg 
            ? `<div class="table-thumbnail-wrapper" style="cursor: pointer;" onclick="viewAssetDetails(${asset.id})" title="点击查看资产详情">
                 <img src="${firstImg}" class="table-thumbnail" alt="实物图">
                 ${imgCount > 1 ? `<span class="img-count-badge" style="position: absolute; bottom: -2px; right: -2px; background: var(--purple); color: white; border-radius: 6px; font-size: 0.62rem; padding: 0.5px 4px; font-weight: 700; border: 1px solid white; box-shadow: var(--shadow-sm); z-index: 10;">+${imgCount}</span>` : ''}
               </div>` 
            : `<div class="table-thumbnail-placeholder" style="cursor: pointer;" onclick="viewAssetDetails(${asset.id})" title="点击查看资产详情"><i class="fa-solid fa-camera"></i></div>`;
        
        // Build action buttons — scrapped assets are permanently locked
        let actionButtons;
        if (asset.status === 'Scrapped') {
            actionButtons = `
                <span style="display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;
                             color:var(--text-muted);background:rgba(239,68,68,0.08);
                             border:1px solid rgba(239,68,68,0.22);border-radius:6px;
                             padding:3px 8px;cursor:default;"
                       title="该资产已报废，生命周期终结，禁止任何修改">
                    <i class="fa-solid fa-lock" style="color:var(--danger);font-size:0.68rem;"></i>&nbsp;已报废·锁定
                </span>`;
        } else {
            actionButtons = `
                <button class="btn-row-action btn-edit" onclick="handleEditAsset(${asset.id})" title="编辑资产">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-row-action btn-delete" data-name="${escapeHTML(asset.name)}" onclick="handleDeleteAsset(${asset.id}, this.getAttribute('data-name'))" title="删除资产">
                    <i class="fa-solid fa-trash"></i>
                </button>`;
        }
            
        tr.innerHTML = `
            <td><span class="asset-id-tag font-outfit" style="font-weight: 600; cursor: pointer; color: var(--purple);" onclick="viewAssetDetails(${asset.id})" title="点击查看资产详情">${escapeHTML(asset.asset_code)}</span></td>
            <td>${imgCell}</td>
            <td>
                <div class="asset-primary-cell">
                    <span class="asset-title" style="cursor: pointer; color: var(--text-main); font-weight: 600;" onclick="viewAssetDetails(${asset.id})" title="点击查看资产详情">${escapeHTML(asset.name)}</span>
                </div>
            </td>
            <td><span class="badge badge-cat">${escapeHTML(categoryBadges[asset.category] || asset.category)}</span></td>
            <td><span class="cell-price">¥${priceStr}</span></td>
            <td><span class="font-outfit text-muted">${escapeHTML(asset.purchase_date)}</span></td>
            <td><span class="badge badge-status ${statConfig.class}">${statConfig.text}</span></td>
            <td><span class="text-sm">${asset.department ? escapeHTML(asset.department) : '<span class="text-muted">-</span>'}</span></td>
            <td>
                <span class="custodian-tag">
                    <i class="fa-solid fa-user-tag text-xs"></i> 
                    ${asset.user_name ? escapeHTML(asset.user_name) : '<span class="text-muted">-</span>'}
                </span>
            </td>
            <td>
                <div class="row-actions">
                    <button class="btn-row-action btn-edit" style="color: var(--blue);" onclick="viewAssetDetails(${asset.id})" title="查看详细档案">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="btn-row-action btn-edit" style="color: var(--purple);" data-code="${escapeHTML(asset.asset_code)}" data-name="${escapeHTML(asset.name)}" onclick="viewAssetLifecycle(this.getAttribute('data-code'), this.getAttribute('data-name'))" title="资产生命周期变更树">
                        <i class="fa-solid fa-timeline"></i>
                    </button>
                    ${actionButtons}
                </div>
            </td>
        `;
        
        DOM.assetsTableBody.appendChild(tr);
    });
}

// Setup event listeners for forms, filter bars, modals, etc.
function setupAssetEvents() {
    // Live Search (with lightweight debounce)
    let searchTimeout = null;
    DOM.searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadAssets();
        }, 300);
    });
    
    // Categorical filters
    DOM.filterCategory.addEventListener('change', loadAssets);
    DOM.filterStatus.addEventListener('change', loadAssets);
    DOM.sortBy.addEventListener('change', loadAssets);
    
    // Sorting order button toggle
    DOM.btnSortOrder.addEventListener('click', () => {
        state.sortAscending = !state.sortAscending;
        
        // Dynamic icons toggle
        const icon = DOM.btnSortOrder.querySelector('i');
        if (state.sortAscending) {
            icon.className = 'fa-solid fa-sort-amount-up-alt';
            DOM.btnSortOrder.setAttribute('title', '升序排列');
        } else {
            icon.className = 'fa-solid fa-sort-amount-down';
            DOM.btnSortOrder.setAttribute('title', '降序排列');
        }
        
        loadAssets();
    });
    
    // Modal toggle triggers
    DOM.btnAddAsset.addEventListener('click', () => openAssetModal());
    DOM.btnEmptyAddAsset.addEventListener('click', () => openAssetModal());
    
    // Excel Exports
    if (DOM.btnExportAssets) {
        DOM.btnExportAssets.addEventListener('click', handleExportAssets);
    }
    if (DOM.btnExportApprovals) {
        DOM.btnExportApprovals.addEventListener('click', handleExportApprovals);
    }
    
    // Close modal triggers
    DOM.btnCloseModals.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            closeAllModals();
        });
    });
    
    // Image Upload Zone Interactions
    const uploadWrapper = document.getElementById('image-upload-wrapper');
    const imageFileInput = document.getElementById('asset-image-file');
    const imageUrlInput = document.getElementById('asset-image-url');
    const defaultState = document.getElementById('upload-default-state');
    const loadingState = document.getElementById('upload-loading-state');
    
    if (uploadWrapper && imageFileInput) {
        uploadWrapper.addEventListener('click', (e) => {
            if (e.target.closest('.btn-remove-thumb')) return;
            imageFileInput.click();
        });
        
        uploadWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadWrapper.classList.add('dragover');
        });
        
        uploadWrapper.addEventListener('dragleave', () => {
            uploadWrapper.classList.remove('dragover');
        });
        
        uploadWrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadWrapper.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleMultipleFilesUpload(files);
            }
        });
        
        imageFileInput.addEventListener('change', () => {
            if (imageFileInput.files.length > 0) {
                handleMultipleFilesUpload(imageFileInput.files);
            }
        });
    }
    
    async function handleMultipleFilesUpload(filesList) {
        if (filesList.length === 0) return;
        
        if (loadingState) loadingState.classList.remove('hidden');
        if (defaultState) defaultState.classList.add('hidden');
        
        let successCount = 0;
        let failCount = 0;
        
        for (const file of filesList) {
            if (!file.type.startsWith('image/')) {
                showToast(`文件 "${file.name}" 不是有效的图片格式！`, 'error');
                failCount++;
                continue;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                showToast(`图片 "${file.name}" 超过 5MB 限制！`, 'error');
                failCount++;
                continue;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const response = await fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': state.token ? `Bearer ${state.token}` : ''
                    },
                    body: formData
                });
                
                if (response.status === 401) {
                    showToast('登录已过期，请重新登录！', 'error');
                    logout();
                    return;
                }
                
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.message || '上传失败');
                }
                
                state.uploadedImages.push(result.image_url);
                successCount++;
            } catch (error) {
                console.error("Upload error:", error);
                showToast(`图片 "${file.name}" 上传失败: ${error.message}`, 'error');
                failCount++;
            }
        }
        
        if (loadingState) loadingState.classList.add('hidden');
        if (defaultState) defaultState.classList.remove('hidden');
        
        if (successCount > 0) {
            showToast(`成功上传了 ${successCount} 张资产实物图！`, 'success');
            renderUploadedThumbnails();
        }
    }
    
    // Note: renderUploadedThumbnails is defined at module scope below for use by openAssetModal
    renderUploadedThumbnails();

    window.removeUploadedImage = function(index) {
        state.uploadedImages.splice(index, 1);
        renderUploadedThumbnails();
        showToast('已移除该照片。', 'info');
    };
    
    // Modal Overlay clicks to dim miss closes
    DOM.assetModal.addEventListener('click', (e) => {
        if (e.target === DOM.assetModal) closeAllModals();
    });
    DOM.deleteModal.addEventListener('click', (e) => {
        if (e.target === DOM.deleteModal) closeAllModals();
    });
    if (DOM.lifecycleModal) {
        DOM.lifecycleModal.addEventListener('click', (e) => {
            if (e.target === DOM.lifecycleModal) closeAllModals();
        });
    }
    if (DOM.userEditModal) {
        DOM.userEditModal.addEventListener('click', (e) => {
            if (e.target === DOM.userEditModal) closeAllModals();
        });
    }
    if (DOM.detailsModal) {
        DOM.detailsModal.addEventListener('click', (e) => {
            if (e.target === DOM.detailsModal) closeAllModals();
        });
    }
    
    // Submit asset creation / update
    DOM.assetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = DOM.assetId.value;
        const asset_code = DOM.assetCode.value.trim();
        const name = DOM.assetName.value.trim();
        const category = DOM.assetCategory.value;
        const price = parseFloat(DOM.assetPrice.value);
        const purchase_date = DOM.assetDate.value;
        const status = DOM.assetStatus.value;
        const department = DOM.assetDept.value.trim();
        const user_name = DOM.assetUsername.value.trim();
        const description = DOM.assetDesc.value.trim();
        const image_url = document.getElementById('asset-image-url').value;
        
        const payload = {
            asset_code, name, category, price, purchase_date, status, department, user_name, description, image_url
        };
        
        try {
            if (id) {
                // Update Asset
                const response = await fetchAPI(`/assets/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                if (response.approval_required) {
                    showToast(response.message, 'info');
                } else {
                    showToast(`资产 "${name}" 信息更新成功！`, 'success');
                }
            } else {
                // Create Asset
                const response = await fetchAPI('/assets', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (response.approval_required) {
                    showToast(response.message, 'info');
                } else {
                    showToast(`新资产 "${name}" 成功登记入账！`, 'success');
                }
            }
            
            closeAllModals();
            loadAssets();
            if (state.role === 'admin') loadApprovalsBadge();
            if (state.currentPanel === 'panel-dashboard') loadDashboardData();
            if (state.currentPanel === 'panel-approvals') loadApprovals();
        } catch (err) {
            // Handled
        }
    });
    
    // Delete action confirmations
    DOM.btnConfirmDelete.addEventListener('click', async () => {
        if (!state.deleteAssetId) return;
        
        const assetId = state.deleteAssetId;
        const row = document.getElementById(`row-asset-${assetId}`);
        
        try {
            const response = await fetchAPI(`/assets/${assetId}`, {
                method: 'DELETE'
            });
            
            if (response.approval_required) {
                showToast(response.message, 'info');
                closeAllModals();
            } else {
                showToast('该固定资产已被成功清除注销。', 'success');
                closeAllModals();
                
                // Render nice slide out animations
                if (row) {
                    row.classList.add('row-deleted-anim');
                    row.addEventListener('transitionend', () => {
                        loadAssets();
                        if (state.currentPanel === 'panel-dashboard') loadDashboardData();
                    });
                } else {
                    loadAssets();
                    if (state.currentPanel === 'panel-dashboard') loadDashboardData();
                }
            }
            if (state.role === 'admin') loadApprovalsBadge();
            if (state.currentPanel === 'panel-approvals') loadApprovals();
        } catch (err) {
            // Handled
        }
    });
}

// ==========================================================================
// Module-scope image thumbnail renderer (must be outside setupAssetEvents so
// openAssetModal can call it without a dependency on the closure)
// ==========================================================================
function renderUploadedThumbnails() {
    const container = document.getElementById('uploaded-images-container');
    if (!container) return;
    container.innerHTML = '';

    const imageUrlInput = document.getElementById('asset-image-url');
    const defaultState = document.getElementById('upload-default-state');

    // Save to hidden input field as comma-joined string
    if (imageUrlInput) {
        imageUrlInput.value = state.uploadedImages.join(',');
    }

    if (state.uploadedImages.length === 0) {
        if (defaultState) defaultState.classList.remove('hidden');
        return;
    }

    if (defaultState) defaultState.classList.remove('hidden'); // Keep upload button visible

    state.uploadedImages.forEach((url, index) => {
        const card = document.createElement('div');
        card.className = 'uploaded-thumb-card animate-pop';
        card.style.cssText = 'position: relative; width: 64px; height: 64px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #f8fafc; box-shadow: var(--shadow-sm);';

        card.innerHTML = `
            <img src="${escapeHTML(url)}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" data-url="${escapeHTML(url)}" onclick="window.open(this.getAttribute('data-url'), '_blank')">
            <button type="button" class="btn-remove-thumb" onclick="window.removeUploadedImage(${index})" style="position: absolute; top: 2px; right: 2px; background: rgba(239, 68, 68, 0.85); color: white; border: none; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; cursor: pointer; transition: all 0.2s ease; z-index: 5;" title="删除图片">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        container.appendChild(card);
    });
}

// Modal window states
function openAssetModal(asset = null) {
    DOM.assetForm.reset();
    
    // Reset image preview state in form
    const imgUrlInput = document.getElementById('asset-image-url');
    const defaultState = document.getElementById('upload-default-state');
    const loadingState = document.getElementById('upload-loading-state');
    
    if (imgUrlInput && defaultState && loadingState) {
        imgUrlInput.value = '';
        defaultState.classList.remove('hidden');
        loadingState.classList.add('hidden');
    }
    
    state.uploadedImages = [];
    
    if (asset) {
        DOM.modalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> 修改资产信息`;
        DOM.assetId.value = asset.id;
        DOM.assetCode.value = asset.asset_code;
        DOM.assetCode.disabled = true; // Business code read-only on edit
        DOM.assetName.value = asset.name;
        DOM.assetCategory.value = asset.category;
        DOM.assetPrice.value = asset.price;
        DOM.assetDate.value = asset.purchase_date;
        DOM.assetStatus.value = asset.status;
        populateDeptDropdown(DOM.assetDept, asset.department || '', false, '请选择使用部门...');
        DOM.assetUsername.value = asset.user_name || '';
        DOM.assetDesc.value = asset.description || '';
        
        // Load image urls if it exists
        if (asset.image_url) {
            state.uploadedImages = asset.image_url.split(',').filter(u => u.trim() !== '');
        }
    } else {
        DOM.modalTitle.innerHTML = `<i class="fa-solid fa-circle-plus"></i> 新增固定资产`;
        DOM.assetId.value = '';
        DOM.assetCode.value = '';
        DOM.assetCode.disabled = false;
        populateDeptDropdown(DOM.assetDept, '', false, '请选择使用部门...');
        DOM.assetDate.value = new Date().toISOString().split('T')[0];
        DOM.assetStatus.value = 'Available';
    }
    
    renderUploadedThumbnails();
    DOM.assetModal.classList.add('active');
}

function closeAllModals() {
    DOM.assetModal.classList.remove('active');
    DOM.deleteModal.classList.remove('active');
    if (DOM.lifecycleModal) DOM.lifecycleModal.classList.remove('active');
    if (DOM.userEditModal) DOM.userEditModal.classList.remove('active');
    if (DOM.detailsModal) DOM.detailsModal.classList.remove('active');
    state.deleteAssetId = null;
}

// Bind to window to allow button onclick integrations
window.handleEditAsset = function(assetId) {
    const asset = state.assets.find(a => a.id === assetId);
    if (!asset) return;
    // Scrapped assets are permanently locked
    if (asset.status === 'Scrapped') {
        showToast('该资产已报废，生命周期终结，禁止任何修改操作！', 'error');
        return;
    }
    openAssetModal(asset);
};

window.handleDeleteAsset = function(assetId, assetName) {
    state.deleteAssetId = assetId;
    DOM.deleteAssetName.textContent = `"${assetName}"`;
    DOM.deleteModal.classList.add('active');
};

// ==========================================================================
// 6a. Approvals Processing & Badge Sync Operations [NEW]
// ==========================================================================
state.approvalsTab = 'assets';
state.pendingUsers = [];

async function loadApprovals() {
    try {
        const approvals = await fetchAPI('/approvals');
        state.approvals = approvals;
        
        if (state.role === 'admin') {
            await loadPendingUsers();
        }
        
        renderApprovals();
    } catch (err) {
        console.error("Failed loading approvals list:", err);
    }
}

async function loadPendingUsers() {
    if (state.role !== 'admin') return;
    try {
        const pendingUsers = await fetchAPI('/admin/pending_users');
        state.pendingUsers = pendingUsers;
    } catch (err) {
        console.error("Failed loading pending users list:", err);
    }
}

async function loadApprovalsBadge() {
    if (state.role !== 'admin' || !state.token) return;
    try {
        const approvals = await fetchAPI('/approvals');
        const pendingAssets = approvals.filter(a => a.status === 'pending' && a.action_type !== 'register').length;
        
        const pendingUsers = await fetchAPI('/admin/pending_users');
        const pendingUsersCount = pendingUsers.length;
        
        const totalPending = pendingAssets + pendingUsersCount;
        
        if (totalPending > 0) {
            DOM.approvalBadgeCount.textContent = totalPending;
            DOM.approvalBadgeCount.classList.remove('hidden');
        } else {
            DOM.approvalBadgeCount.classList.add('hidden');
        }
        
        // Sync tabs badges
        const badgeAsset = document.getElementById('badge-asset-approvals');
        const badgeUser = document.getElementById('badge-user-approvals');
        
        if (badgeAsset) {
            if (pendingAssets > 0) {
                badgeAsset.textContent = pendingAssets;
                badgeAsset.style.display = 'inline-block';
            } else {
                badgeAsset.style.display = 'none';
            }
        }
        
        if (badgeUser) {
            if (pendingUsersCount > 0) {
                badgeUser.textContent = pendingUsersCount;
                badgeUser.style.display = 'inline-block';
            } else {
                badgeUser.style.display = 'none';
            }
        }
    } catch (err) {
        // Suppress background errors
    }
}

function renderApprovals() {
    const tabsBar = document.getElementById('approvals-tabs-bar');
    const userRegSection = document.getElementById('approvals-user-reg-section');
    const userRegList = document.getElementById('approvals-user-reg-list');
    const userRegEmpty = document.getElementById('approvals-user-reg-empty');
    
    const btnTabAssets = document.getElementById('btn-tab-assets');
    const btnTabUsers = document.getElementById('btn-tab-users');
    const btnTabHistory = document.getElementById('btn-tab-history');
    
    const approvalsHistorySection = document.getElementById('approvals-history-section');
    const approvalsHistoryTableBody = document.getElementById('approvals-history-table-body');
    const approvalsHistoryEmpty = document.getElementById('approvals-history-empty');
    
    // Bind Tab Click Handlers if not already bound
    if (btnTabAssets && btnTabUsers && btnTabHistory && !btnTabAssets.dataset.bound) {
        btnTabAssets.dataset.bound = "true";
        btnTabAssets.addEventListener('click', () => {
            state.approvalsTab = 'assets';
            btnTabAssets.classList.add('active');
            btnTabAssets.style.color = 'var(--text-main)';
            btnTabUsers.classList.remove('active');
            btnTabUsers.style.color = 'var(--text-muted)';
            if (btnTabHistory) {
                btnTabHistory.classList.remove('active');
                btnTabHistory.style.color = 'var(--text-muted)';
            }
            renderApprovals();
        });
        
        btnTabUsers.dataset.bound = "true";
        btnTabUsers.addEventListener('click', () => {
            state.approvalsTab = 'users';
            btnTabUsers.classList.add('active');
            btnTabUsers.style.color = 'var(--text-main)';
            btnTabAssets.classList.remove('active');
            btnTabAssets.style.color = 'var(--text-muted)';
            if (btnTabHistory) {
                btnTabHistory.classList.remove('active');
                btnTabHistory.style.color = 'var(--text-muted)';
            }
            renderApprovals();
        });
        
        btnTabHistory.dataset.bound = "true";
        btnTabHistory.addEventListener('click', () => {
            state.approvalsTab = 'history';
            btnTabHistory.classList.add('active');
            btnTabHistory.style.color = 'var(--text-main)';
            btnTabAssets.classList.remove('active');
            btnTabAssets.style.color = 'var(--text-muted)';
            btnTabUsers.classList.remove('active');
            btnTabUsers.style.color = 'var(--text-muted)';
            renderApprovals();
        });
    }

    if (state.role === 'admin') {
        if (tabsBar) tabsBar.classList.remove('hidden');
        DOM.approvalsUserSection.classList.add('hidden');
        
        if (state.approvalsTab === 'assets') {
            if (userRegSection) userRegSection.classList.add('hidden');
            if (approvalsHistorySection) approvalsHistorySection.classList.add('hidden');
            DOM.approvalsAdminSection.classList.remove('hidden');
            DOM.approvalsAdminList.innerHTML = '';
            
            const pending = state.approvals.filter(a => a.status === 'pending' && a.action_type !== 'register');
            if (pending.length === 0) {
                DOM.approvalsAdminList.classList.add('hidden');
                DOM.approvalsAdminEmpty.classList.remove('hidden');
                return;
            }
            
            DOM.approvalsAdminList.classList.remove('hidden');
            DOM.approvalsAdminEmpty.classList.add('hidden');
            
            // Helper: parse comma-separated image_url and render a mini gallery
            const buildImgGallery = (imageUrlStr, altText = '无') => {
                if (!imageUrlStr) return `<span class="text-muted">${altText}</span>`;
                const urls = imageUrlStr.split(',').filter(u => u.trim() !== '');
                if (urls.length === 0) return `<span class="text-muted">${altText}</span>`;
                const thumbs = urls.map((url, i) => {
                    const trimmedUrl = url.trim();
                    return `<img src="${escapeHTML(trimmedUrl)}" 
                          style="height:48px; width:48px; object-fit:cover; border-radius:6px; border:1px solid #cbd5e1; background:#fff; margin-right:4px; cursor:pointer;"
                          title="点击查看大图"
                          data-url="${escapeHTML(trimmedUrl)}"
                          onclick="window.open(this.getAttribute('data-url'),'_blank')">`;
                }).join('');
                const badge = urls.length > 1 ? `<span style="font-size:0.72rem; color: var(--purple); margin-left:4px; font-weight:700;">${urls.length}张</span>` : '';
                return `<div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px;">${thumbs}${badge}</div>`;
            };
            
            const actionNames = { 'create': '登记资产', 'update': '修改资产', 'delete': '注销报废' };
            const actionClasses = { 'create': 'action-create', 'update': 'action-update', 'delete': 'action-delete' };
            const categoryNames = { 'Electronics': '🔌 电子设备', 'Furniture': '🛋️ 办公家具', 'Software': '💿 软件资产', 'Office': '📎 行政耗材' };
            const statusNames = { 'Available': '🟢 闲置在库', 'In_Use': '🔵 分配在用', 'Maintenance': '🟡 维保检测', 'Scrapped': '🔴 报废处置' };
            
            pending.forEach(appr => {
                const proposed = JSON.parse(appr.proposed_data);
                const card = document.createElement('div');
                card.className = 'approval-card glassmorphism';
                
                let diffHtml = '';
                if (appr.action_type === 'create') {
                    diffHtml = `
                        <table class="diff-table">
                            <tr><th width="80">字段</th><th>登记申请值</th></tr>
                            <tr><td>实物图</td><td>${buildImgGallery(proposed.image_url, '未上传')}</td></tr>
                            <tr><td>资产编码</td><td><span class="diff-new">${escapeHTML(proposed.asset_code)}</span></td></tr>
                            <tr><td>资产名称</td><td><span class="diff-new">${escapeHTML(proposed.name)}</span></td></tr>
                            <tr><td>资产类别</td><td><span class="diff-new">${escapeHTML(categoryNames[proposed.category] || proposed.category)}</span></td></tr>
                            <tr><td>采购单价</td><td><span class="diff-new">¥${proposed.price.toLocaleString('zh-CN', {minimumFractionDigits: 2})}</span></td></tr>
                            <tr><td>采购时间</td><td><span class="diff-new">${escapeHTML(proposed.purchase_date)}</span></td></tr>
                            <tr><td>资产状态</td><td><span class="diff-new">${escapeHTML(statusNames[proposed.status] || proposed.status)}</span></td></tr>
                            <tr><td>使用部门</td><td><span class="diff-new">${escapeHTML(proposed.department || '-')}</span></td></tr>
                            <tr><td>保管人员</td><td><span class="diff-new">${escapeHTML(proposed.user_name || '-')}</span></td></tr>
                            <tr><td>备注说明</td><td><span class="diff-new">${escapeHTML(proposed.description || '-')}</span></td></tr>
                        </table>
                    `;
                } else if (appr.action_type === 'update') {
                    const old = state.assets.find(a => a.id === appr.asset_id) || {};
                    const buildDiffRow = (label, oldVal, newVal, formatter = v => v || '-') => {
                        if (oldVal === newVal) return '';
                        return `
                            <tr>
                                <td>${escapeHTML(label)}</td>
                                <td>
                                    <div class="diff-change-line">
                                        <span class="diff-old">${escapeHTML(formatter(oldVal))}</span>
                                        <i class="fa-solid fa-arrow-right text-xs text-muted"></i>
                                        <span class="diff-new">${escapeHTML(formatter(newVal))}</span>
                                    </div>
                                </td>
                            </tr>
                        `;
                    };
                    
                    let imgDiffRow = '';
                    const oldImgUrls = (old.image_url || '').split(',').filter(u => u.trim() !== '');
                    const newImgUrls = (proposed.image_url || '').split(',').filter(u => u.trim() !== '');
                    const oldSet = new Set(oldImgUrls);
                    const newSet = new Set(newImgUrls);
                    const addedCount = [...newSet].filter(u => !oldSet.has(u)).length;
                    const removedCount = [...oldSet].filter(u => !newSet.has(u)).length;
                    const imagesChanged = addedCount > 0 || removedCount > 0;

                    // Always show the image row so approver can see the photos
                    if (imagesChanged) {
                        const changeBadges = [];
                        if (addedCount > 0) changeBadges.push(`<span style="color:var(--green);font-weight:700;font-size:0.75rem;">+${addedCount}张新增</span>`);
                        if (removedCount > 0) changeBadges.push(`<span style="color:var(--danger);font-weight:700;font-size:0.75rem;">-${removedCount}张删除</span>`);
                        
                        imgDiffRow = `
                            <tr>
                                <td>实物图</td>
                                <td>
                                    <div style="display:flex; flex-direction:column; gap:8px;">
                                        <div style="display:flex; align-items:flex-start; gap:6px; flex-wrap:wrap;">
                                            <span style="font-size:0.72rem; color:var(--text-muted); min-width:72px; padding-top:4px;">变更前(${oldImgUrls.length}张):</span>
                                            ${buildImgGallery(old.image_url, '无')}
                                        </div>
                                        <div style="display:flex; align-items:flex-start; gap:6px; flex-wrap:wrap;">
                                            <span style="font-size:0.72rem; min-width:72px; padding-top:4px; display:flex; align-items:center; gap:3px; color:var(--text-muted);"><i class="fa-solid fa-arrow-down" style="font-size:0.65rem;"></i>变更后(${newImgUrls.length}张):</span>
                                            ${buildImgGallery(proposed.image_url, '无')}
                                        </div>
                                        <div style="display:flex; gap:6px;">${changeBadges.join('')}</div>
                                    </div>
                                </td>
                            </tr>
                        `;
                    } else {
                        // Images unchanged — still show them so approver can review
                        const imgCount = newImgUrls.length;
                        imgDiffRow = `
                            <tr>
                                <td>实物图</td>
                                <td>
                                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                        ${buildImgGallery(proposed.image_url, '未上传')}
                                        ${imgCount > 0 ? `<span style="font-size:0.72rem; color:var(--text-muted);">(${imgCount}张，图片未变更)</span>` : '<span style="font-size:0.72rem; color:var(--text-muted);">未上传实物图</span>'}
                                    </div>
                                </td>
                            </tr>
                        `;
                    }
                    
                    diffHtml = `
                        <table class="diff-table">
                            <tr><th width="80">变更字段</th><th>值变化对比</th></tr>
                            ${imgDiffRow}
                            ${buildDiffRow('资产编码', old.asset_code, proposed.asset_code)}
                            ${buildDiffRow('资产名称', old.name, proposed.name)}
                            ${buildDiffRow('资产类别', old.category, proposed.category, v => categoryNames[v] || v)}
                            ${buildDiffRow('采购价格', old.price, proposed.price, v => '¥' + (v || 0).toLocaleString('zh-CN', {minimumFractionDigits: 2}))}
                            ${buildDiffRow('采购日期', old.purchase_date, proposed.purchase_date)}
                            ${buildDiffRow('资产状态', old.status, proposed.status, v => statusNames[v] || v)}
                            ${buildDiffRow('使用部门', old.department, proposed.department)}
                            ${buildDiffRow('保管人员', old.user_name, proposed.user_name)}
                            ${buildDiffRow('备注说明', old.description, proposed.description)}
                        </table>
                    `;
                } else if (appr.action_type === 'delete') {
                    diffHtml = `
                        <table class="diff-table">
                            <tr><th width="80">销账字段</th><th>对应资产数据</th></tr>
                            <tr><td>实物图</td><td>${buildImgGallery(proposed.image_url, '无')}</td></tr>
                            <tr><td>资产编码</td><td><span class="text-danger">${escapeHTML(proposed.asset_code)}</span></td></tr>
                            <tr><td>资产名称</td><td><span class="text-danger">${escapeHTML(proposed.name)}</span></td></tr>
                            <tr><td>采购价格</td><td><span class="text-danger">¥${proposed.price.toLocaleString('zh-CN', {minimumFractionDigits: 2})}</span></td></tr>
                            <tr><td>保管人员</td><td><span class="text-danger">${escapeHTML(proposed.user_name || '-')}</span></td></tr>
                        </table>
                    `;
                }
                
                card.innerHTML = `
                    <div class="approval-card-header">
                        <span class="approval-title"><i class="fa-solid fa-stamp"></i> 待办单号: <span class="font-outfit" style="color: var(--purple); font-weight: 700; letter-spacing: 0.5px; font-size: 0.95rem; margin-left: 2px;">${escapeHTML(appr.approval_code || '')}</span></span>
                        <span class="approval-action-badge ${actionClasses[appr.action_type]}">${actionNames[appr.action_type]}</span>
                    </div>
                    <div class="approval-card-body">
                        <div class="approval-meta-info">
                            <span><i class="fa-solid fa-user"></i> 申请账号: <strong>${escapeHTML(appr.requester)}</strong></span>
                            <span><i class="fa-regular fa-clock"></i> ${escapeHTML(appr.created_at)}</span>
                        </div>
                        <div class="approval-diff-box">
                            ${diffHtml}
                        </div>
                        <textarea class="review-notes-input" id="notes-approval-${appr.id}" rows="2" placeholder="输入审批同意或驳回意见备注(选填)..."></textarea>
                        <div class="approval-btn-group">
                            <button class="btn btn-secondary btn-block" onclick="submitReview(${appr.id}, 'rejected')">
                                <i class="fa-solid fa-xmark text-danger"></i> 驳 回
                            </button>
                            <button class="btn btn-primary" btn-block" onclick="submitReview(${appr.id}, 'approved')">
                                <i class="fa-solid fa-check"></i> 准 予
                            </button>
                        </div>
                    </div>
                `;
                DOM.approvalsAdminList.appendChild(card);
            });
        } else if (state.approvalsTab === 'users') {
            DOM.approvalsAdminSection.classList.add('hidden');
            if (approvalsHistorySection) approvalsHistorySection.classList.add('hidden');
            if (userRegSection) userRegSection.classList.remove('hidden');
            if (userRegList) userRegList.innerHTML = '';
            
            if (state.pendingUsers.length === 0) {
                if (userRegList) userRegList.classList.add('hidden');
                if (userRegEmpty) userRegEmpty.classList.remove('hidden');
                return;
            }
            
            if (userRegList) userRegList.classList.remove('hidden');
            if (userRegEmpty) userRegEmpty.classList.add('hidden');
            
            state.pendingUsers.forEach(u => {
                const card = document.createElement('div');
                card.className = 'pending-user-card';
                card.innerHTML = `
                    <div class="pending-user-header">
                        <span class="pending-user-title">
                            <i class="fa-solid fa-user-tag" style="color: var(--purple);"></i>
                            <span>账号注册申请 (单号: <strong style="color: var(--purple); font-family: Outfit;">${escapeHTML(u.approval_code || '')}</strong>): <strong style="color: var(--purple); font-weight: 700; margin-left: 2px;">${escapeHTML(u.username)}</strong></span>
                        </span>
                        <span class="pending-user-time">
                            <i class="fa-regular fa-clock"></i>
                            <span>${escapeHTML(u.created_at)}</span>
                        </span>
                    </div>
                    <div class="pending-user-body">
                        <div class="pending-user-field">
                            <label>真实姓名</label>
                            <input type="text" id="usr-name-${escapeHTML(u.username)}" value="${escapeHTML(u.real_name || '')}" placeholder="真实姓名">
                        </div>
                        <div class="pending-user-field">
                            <label>联系电话</label>
                            <input type="text" id="usr-phone-${escapeHTML(u.username)}" value="${escapeHTML(u.phone || '')}" placeholder="11位手机号">
                        </div>
                        <div class="pending-user-field">
                            <label>身份证号</label>
                            <input type="text" id="usr-idcard-${escapeHTML(u.username)}" value="${escapeHTML(u.id_card || '')}" placeholder="18位身份证号">
                        </div>
                        <div class="pending-user-field">
                            <label>所属部门</label>
                            <select id="usr-dept-${escapeHTML(u.username)}" style="background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-size: 0.85rem; width: 100%;">
                                ${buildDeptOptionsHtml(u.department, true, '请选择所属部门...')}
                            </select>
                        </div>
                    </div>
                    <textarea class="review-notes-input" id="notes-usr-${escapeHTML(u.username)}" rows="2" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-size: 0.85rem; font-family: inherit; margin-top: 8px; resize: none;" placeholder="输入账号审查批准或拒绝备注说明(选填)..."></textarea>
                    <div class="pending-user-actions">
                        <button class="btn btn-secondary" data-username="${escapeHTML(u.username)}" onclick="submitUserReview(this.getAttribute('data-username'), 'reject')">
                            <i class="fa-solid fa-user-xmark" style="color: var(--danger);"></i> 拒绝驳回
                        </button>
                        <button class="btn btn-primary" data-username="${escapeHTML(u.username)}" onclick="submitUserReview(this.getAttribute('data-username'), 'approve')">
                            <i class="fa-solid fa-user-check"></i> 批准并激活账号
                        </button>
                    </div>
                `;
                userRegList.appendChild(card);
            });
        } else if (state.approvalsTab === 'history') {
            DOM.approvalsAdminSection.classList.add('hidden');
            if (userRegSection) userRegSection.classList.add('hidden');
            if (approvalsHistorySection) approvalsHistorySection.classList.remove('hidden');
            if (approvalsHistoryTableBody) approvalsHistoryTableBody.innerHTML = '';
            
            const completed = state.approvals.filter(a => a.status !== 'pending');
            
            if (completed.length === 0) {
                if (approvalsHistoryTableBody) approvalsHistoryTableBody.parentElement.classList.add('hidden');
                if (approvalsHistoryEmpty) approvalsHistoryEmpty.classList.remove('hidden');
                return;
            }
            
            if (approvalsHistoryTableBody) approvalsHistoryTableBody.parentElement.classList.remove('hidden');
            if (approvalsHistoryEmpty) approvalsHistoryEmpty.classList.add('hidden');
            
            const actionNames = { 'create': '🆕 登记资产', 'update': '📝 属性变更', 'delete': '❌ 注销报废', 'register': '👤 账号注册' };
            const statusBadges = {
                'approved': { text: '🟢 已批准', class: 'badge-approved' },
                'rejected': { text: '🔴 已驳回', class: 'badge-rejected' }
            };
            
            completed.forEach(appr => {
                const tr = document.createElement('tr');
                const proposed = JSON.parse(appr.proposed_data);
                const stat = statusBadges[appr.status] || { text: appr.status, class: 'badge-secondary' };
                
                let objectHtml = '';
                if (appr.action_type === 'register') {
                    objectHtml = `姓名: <strong style="color: var(--purple);">${escapeHTML(proposed.real_name || '-')}</strong> | 部门: <strong>${escapeHTML(proposed.department || '-')}</strong> | 手机: <span class="font-outfit text-xs">${escapeHTML(proposed.phone || '-')}</span>`;
                } else {
                    objectHtml = `编码: <span class="asset-id-tag font-outfit">${escapeHTML(proposed.asset_code || '-')}</span> | 名称: <strong>${escapeHTML(proposed.name || '-')}</strong>`;
                }
                
                tr.innerHTML = `
                    <td><span class="font-semibold">${actionNames[appr.action_type] || appr.action_type}</span><br><span style="font-size:0.7rem; color: var(--text-muted); font-family: Outfit; font-weight: normal;">单号: ${escapeHTML(appr.approval_code || '-')}</span></td>
                    <td>
                        <span class="custodian-tag" style="margin-bottom: 2px;">
                            <i class="fa-solid fa-user"></i> ${escapeHTML(appr.requester)}
                        </span>
                        <div style="font-size: 0.72rem; color: var(--text-muted); font-family: Outfit; display: flex; flex-direction: column; gap: 1px; padding-left: 4px;">
                            <span>账号: <strong style="color: var(--text-main);">${escapeHTML(appr.requester_username || '')}</strong></span>
                            <span>ID: <strong style="color: var(--purple); font-weight: 600;">${escapeHTML(appr.requester_user_id || '-')}</strong></span>
                        </div>
                    </td>
                    <td><div style="font-size:0.85rem; line-height:1.5;">${objectHtml}</div></td>
                    <td><span class="badge ${stat.class}">${stat.text}</span></td>
                    <td><span class="custodian-tag"><i class="fa-solid fa-user-shield text-xs"></i> ${escapeHTML(appr.reviewer || 'system')}</span></td>
                    <td><span class="text-sm" title="${escapeHTML(appr.review_notes || '')}" style="max-width: 200px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${appr.review_notes ? escapeHTML(appr.review_notes) : '<span class="text-muted">-</span>'}</span></td>
                    <td><span class="font-outfit text-muted text-xs">${escapeHTML(appr.reviewed_at || appr.created_at)}</span></td>
                `;
                approvalsHistoryTableBody.appendChild(tr);
            });
        }
    } else {
        if (tabsBar) tabsBar.classList.add('hidden');
        if (userRegSection) userRegSection.classList.add('hidden');
        if (approvalsHistorySection) approvalsHistorySection.classList.add('hidden');
        DOM.approvalsAdminSection.classList.add('hidden');
        DOM.approvalsUserSection.classList.remove('hidden');
        DOM.approvalsUserTableBody.innerHTML = '';
        
        if (state.approvals.length === 0) {
            DOM.approvalsUserSection.classList.add('hidden');
            DOM.approvalsUserEmpty.classList.remove('hidden');
            return;
        }
        
        DOM.approvalsUserSection.classList.remove('hidden');
        DOM.approvalsUserEmpty.classList.add('hidden');
        
        const actionNames = { 'create': '🆕 登记新资产', 'update': '📝 修改变动', 'delete': '❌ 注销报废' };
        const statusBadges = {
            'pending': { text: '⏳ 审核中', class: 'badge-pending' },
            'approved': { text: '🟢 已批准', class: 'badge-approved' },
            'rejected': { text: '🔴 被驳回', class: 'badge-rejected' }
        };
        
        state.approvals.forEach(appr => {
            if (appr.action_type === 'register') return; // Don't show register approvals in assets lists
            const proposed = JSON.parse(appr.proposed_data);
            const tr = document.createElement('tr');
            const stat = statusBadges[appr.status] || { text: appr.status, class: 'badge-secondary' };
            
            tr.innerHTML = `
                <td><span class="font-semibold">${actionNames[appr.action_type] || appr.action_type}</span><br><span style="font-size:0.7rem; color: var(--text-muted); font-family: Outfit; font-weight: normal;">单号: ${escapeHTML(appr.approval_code || '-')}</span></td>
                <td><span class="asset-id-tag font-outfit">${escapeHTML(proposed.asset_code)}</span></td>
                <td><span class="font-semibold" title="${escapeHTML(proposed.description || '')}">${escapeHTML(proposed.name)}</span></td>
                <td><span class="cell-price">¥${proposed.price.toLocaleString('zh-CN', {minimumFractionDigits: 2})}</span></td>
                <td><span class="font-outfit text-muted text-xs">${escapeHTML(appr.created_at)}</span></td>
                <td><span class="badge ${stat.class}">${stat.text}</span></td>
                <td><span class="custodian-tag"><i class="fa-solid fa-user-shield text-xs"></i> ${escapeHTML(appr.reviewer || '-')}</span></td>
                <td><span class="text-sm" title="${escapeHTML(appr.review_notes || '')}">${appr.review_notes ? escapeHTML(appr.review_notes) : '<span class="text-muted">-</span>'}</span></td>
            `;
            DOM.approvalsUserTableBody.appendChild(tr);
        });
    }
}

window.submitReview = async function(approvalId, status) {
    const notesArea = document.getElementById(`notes-approval-${approvalId}`);
    const review_notes = notesArea ? notesArea.value.trim() : '';
    
    try {
        await fetchAPI(`/approvals/${approvalId}/review`, {
            method: 'POST',
            body: JSON.stringify({ status, review_notes })
        });
        showToast(status === 'approved' ? '已准予该审批申请，相关资产数据已入账台账！' : '已驳回拒绝该资产审批申请。', 'success');
        
        loadApprovals();
        loadApprovalsBadge();
        loadDashboardData();
    } catch (err) {
        // Handled
    }
};

window.submitUserReview = async function(username, action) {
    const real_name = document.getElementById(`usr-name-${username}`).value.trim();
    const phone = document.getElementById(`usr-phone-${username}`).value.trim();
    const id_card = document.getElementById(`usr-idcard-${username}`).value.trim();
    const department = document.getElementById(`usr-dept-${username}`).value.trim();
    
    const notesElem = document.getElementById(`notes-usr-${username}`);
    const review_notes = notesElem ? notesElem.value.trim() : '';
    
    if (action === 'approve') {
        if (!real_name) {
            showToast('真实姓名不能为空！', 'error');
            return;
        }
        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
            showToast('手机号码格式不正确，必须为11位中国手机号！', 'error');
            return;
        }
        const isMaskedIdCard = id_card.includes('*') && id_card.length === 18;
        if (!id_card || (!isMaskedIdCard && !/^\d{17}[\dXx]$/.test(id_card))) {
            showToast('身份证号格式不正确，必须为18位身份证号！', 'error');
            return;
        }
        if (!department) {
            showToast('部门不能为空！', 'error');
            return;
        }
    }
    
    try {
        await fetchAPI('/admin/review_user', {
            method: 'POST',
            body: JSON.stringify({ username, action, real_name, phone, id_card, department, review_notes })
        });
        showToast(action === 'approve' ? `已成功批准激活用户 "${username}"！` : `已成功驳回注册请求 "${username}"。`, 'success');
        
        await loadApprovals();
        await loadApprovalsBadge();
    } catch (err) {
        // Handled
    }
};

// ==========================================================================
// 6b. Asset Lifecycle Timeline Tree Operations [NEW]
// ==========================================================================

window.viewAssetLifecycle = async function(assetCode, assetName) {
    DOM.lifecycleAssetCode.textContent = assetCode;
    DOM.lifecycleAssetName.textContent = assetName;
    DOM.lifecycleTimeline.innerHTML = '<div class="text-center p-4"><i class="fa-solid fa-spinner fa-spin text-lg" style="color: var(--purple);"></i> 正在拉取固资流转历史...</div>';
    DOM.lifecycleModal.classList.add('active');
    
    try {
        const history = await fetchAPI(`/assets/${assetCode}/history`);
        DOM.lifecycleTimeline.innerHTML = '';
        
        if (history.length === 0) {
            DOM.lifecycleTimeline.innerHTML = '<div class="text-muted text-center p-4">该资产暂无生命周期演进记录。</div>';
            return;
        }
        
        const actionLabels = { 'create': '登记入账', 'update': '属性变更', 'delete': '注销报废' };
        const actionIcons = { 'create': 'fa-solid fa-circle-plus', 'update': 'fa-solid fa-pen-to-square', 'delete': 'fa-solid fa-trash' };
        
        history.forEach(n => {
            const node = document.createElement('div');
            node.className = `lifecycle-node node-${n.action_type}`;
            
            const icon = actionIcons[n.action_type] || 'fa-solid fa-circle';
            const label = actionLabels[n.action_type] || n.action_type;
            
            node.innerHTML = `
                <div class="lifecycle-node-meta">
                    <span class="lifecycle-node-operator"><i class="fa-solid fa-user-shield"></i> ${escapeHTML(n.operator)}</span>
                    <span class="font-outfit"><i class="fa-regular fa-clock"></i> ${escapeHTML(n.created_at)}</span>
                </div>
                <div class="lifecycle-node-card animate-slide-in">
                    <h4 class="lifecycle-node-title"><i class="${icon}"></i> ${label}</h4>
                    <p class="lifecycle-node-desc">${escapeHTML(n.details)}</p>
                </div>
            `;
            DOM.lifecycleTimeline.appendChild(node);
        });
    } catch (err) {
        DOM.lifecycleTimeline.innerHTML = `<div class="text-danger text-center p-4">拉取历史记录失败: ${err.message}</div>`;
    }
};

window.viewAssetDetails = async function(assetId) {
    const asset = state.assets.find(a => a.id === assetId);
    if (!asset) return;
    
    // Fill basic info
    DOM.detailName.textContent = asset.name;
    DOM.detailCode.textContent = asset.asset_code;
    
    const categoryBadges = {
        'Electronics': '🔌 电子设备',
        'Furniture': '🛋️ 办公家具',
        'Software': '💿 软件资产',
        'Office': '📎 行政耗材'
    };
    DOM.detailCategory.textContent = categoryBadges[asset.category] || asset.category;
    DOM.detailCategory.className = 'badge badge-cat';
    
    const priceStr = asset.price.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    DOM.detailPrice.textContent = `¥${priceStr}`;
    DOM.detailDate.textContent = asset.purchase_date;
    
    const statusBadges = {
        'Available': { text: '闲置在库', class: 'badge-available' },
        'In_Use': { text: '分配在用', class: 'badge-in-use' },
        'Maintenance': { text: '维保检测', class: 'badge-maintenance' },
        'Scrapped': { text: '报废处置', class: 'badge-scrapped' }
    };
    const statConfig = statusBadges[asset.status] || { text: asset.status, class: 'badge-secondary' };
    DOM.detailStatus.textContent = statConfig.text;
    DOM.detailStatus.className = `badge badge-status ${statConfig.class}`;
    
    DOM.detailDept.innerHTML = asset.department ? escapeHTML(asset.department) : '<span class="text-muted">-</span>';
    DOM.detailUsername.innerHTML = asset.user_name 
        ? `<i class="fa-solid fa-user-tag text-xs" style="margin-right: 4px;"></i> ${escapeHTML(asset.user_name)}`
        : '<span class="text-muted">-</span>';
    DOM.detailDesc.textContent = asset.description || '无备注说明';
    
    // Physical image handling (supports multiple images gallery)
    const galleryContainer = document.getElementById('detail-asset-img-gallery');
    if (asset.image_url) {
        const urls = asset.image_url.split(',').filter(u => u.trim() !== '');
        if (urls.length > 0) {
            DOM.detailImg.src = urls[0];
            DOM.detailImg.style.display = 'block';
            DOM.detailImgPlaceholder.style.display = 'none';
            
            if (urls.length > 1 && galleryContainer) {
                galleryContainer.innerHTML = '';
                galleryContainer.style.display = 'flex';
                
                urls.forEach((url, i) => {
                    const thumb = document.createElement('img');
                    thumb.src = url;
                    thumb.style.cssText = 'width: 40px; height: 40px; border-radius: 6px; object-fit: cover; border: 2px solid #cbd5e1; cursor: pointer; transition: all 0.2s ease;';
                    if (i === 0) {
                        thumb.style.borderColor = 'var(--purple)';
                    }
                    
                    thumb.addEventListener('click', () => {
                        // Switch active image
                        DOM.detailImg.src = url;
                        // Clear borders
                        Array.from(galleryContainer.children).forEach(c => c.style.borderColor = '#cbd5e1');
                        // Add active border
                        thumb.style.borderColor = 'var(--purple)';
                    });
                    
                    galleryContainer.appendChild(thumb);
                });
            } else if (galleryContainer) {
                galleryContainer.style.display = 'none';
            }
        } else {
            DOM.detailImg.src = '';
            DOM.detailImg.style.display = 'none';
            DOM.detailImgPlaceholder.style.display = 'flex';
            if (galleryContainer) galleryContainer.style.display = 'none';
        }
    } else {
        DOM.detailImg.src = '';
        DOM.detailImg.style.display = 'none';
        DOM.detailImgPlaceholder.style.display = 'flex';
        if (galleryContainer) galleryContainer.style.display = 'none';
    }
    
    // Mini vertical timeline fetching inside details modal
    DOM.detailTimeline.innerHTML = '<div class="text-center p-2 text-xs"><i class="fa-solid fa-spinner fa-spin" style="color: var(--purple);"></i> 正在拉取流转历史...</div>';
    
    // Show details modal
    DOM.detailsModal.classList.add('active');
    
    try {
        const history = await fetchAPI(`/assets/${asset.asset_code}/history`);
        DOM.detailTimeline.innerHTML = '';
        
        if (history.length === 0) {
            DOM.detailTimeline.innerHTML = '<div class="text-muted text-center p-2 text-xs">该资产暂无生命周期演进记录。</div>';
            return;
        }
        
        const actionLabels = { 'create': '登记入账', 'update': '属性变更', 'delete': '注销报废' };
        const actionIcons = { 'create': 'fa-solid fa-circle-plus', 'update': 'fa-solid fa-pen-to-square', 'delete': 'fa-solid fa-trash' };
        
        history.forEach(n => {
            const node = document.createElement('div');
            node.className = `lifecycle-node node-${n.action_type}`;
            node.style.paddingLeft = '20px';
            node.style.marginBottom = '16px';
            
            const icon = actionIcons[n.action_type] || 'fa-solid fa-circle';
            const label = actionLabels[n.action_type] || n.action_type;
            
            node.innerHTML = `
                <div class="lifecycle-node-meta" style="margin-bottom: 4px;">
                    <span class="lifecycle-node-operator" style="font-size: 0.7rem;"><i class="fa-solid fa-user-shield"></i> ${escapeHTML(n.operator)}</span>
                    <span class="font-outfit" style="font-size: 0.7rem;"><i class="fa-regular fa-clock"></i> ${escapeHTML(n.created_at)}</span>
                </div>
                <div class="lifecycle-node-card animate-slide-in" style="padding: 8px 12px; border-radius: 8px;">
                    <h5 class="lifecycle-node-title" style="font-size: 0.78rem; margin-bottom: 2px;"><i class="${icon}" style="font-size: 0.75rem;"></i> ${label}</h5>
                    <p class="lifecycle-node-desc" style="font-size: 0.75rem; line-height: 1.3;">${escapeHTML(n.details)}</p>
                </div>
            `;
            DOM.detailTimeline.appendChild(node);
        });
    } catch (err) {
        DOM.detailTimeline.innerHTML = `<div class="text-danger text-center p-2 text-xs">拉取历史记录失败: ${err.message}</div>`;
    }
};

// ==========================================================================
// 6c. Administrative User Account Management Panel Operations [NEW]
// ==========================================================================
state.systemUsers = [];

window.loadAllUsers = async function() {
    if (state.role !== 'admin') return;
    DOM.usersTableBody.innerHTML = '<tr><td colspan="9" class="text-center p-4"><i class="fa-solid fa-spinner fa-spin text-lg" style="color: var(--purple);"></i> 正在拉取员工数据...</td></tr>';
    
    try {
        const users = await fetchAPI('/admin/users');
        state.systemUsers = users;
        renderUsersTable();
    } catch (err) {
        showToast('拉取账户列表失败: ' + err.message, 'error');
    }
};

function renderUsersTable() {
    DOM.usersTableBody.innerHTML = '';
    const users = state.systemUsers;
    
    if (users.length === 0) {
        DOM.usersEmpty.classList.remove('hidden');
        return;
    }
    DOM.usersEmpty.classList.add('hidden');
    
    const roleBadges = {
        'admin': '<span class="badge badge-admin">管理员</span>',
        'user': '<span class="badge badge-user" style="background:#f1f5f9; color:#475569; border-color:#cbd5e1;">普通员工</span>'
    };
    
    const statusBadges = {
        'approved': '<span class="badge badge-approved">🟢 已启用</span>',
        'pending': '<span class="badge badge-pending">⏳ 待审批</span>',
        'suspended': '<span class="badge badge-suspended">🟠 已禁用</span>',
        'rejected': '<span class="badge badge-rejected">🔴 已驳回</span>'
    };
    
    users.forEach(u => {
        const tr = document.createElement('tr');
        
        // Hide delete actions on built-in admin
        const deleteBtn = u.username === 'admin' 
            ? '<span class="text-muted">-</span>' 
            : `<button class="btn-row-action btn-delete" data-username="${escapeHTML(u.username)}" onclick="handleDeleteUser(this.getAttribute('data-username'))" title="彻底注销账号"><i class="fa-solid fa-user-minus"></i></button>`;
            
        tr.innerHTML = `
            <td><strong class="font-outfit" style="color: var(--purple);">${escapeHTML(u.username)}</strong></td>
            <td><span class="font-semibold">${u.real_name ? escapeHTML(u.real_name) : '<span class="text-muted">-</span>'}</span></td>
            <td><span class="font-outfit text-xs">${u.phone ? escapeHTML(u.phone) : '<span class="text-muted">-</span>'}</span></td>
            <td><span class="font-outfit text-xs text-muted">${u.id_card ? escapeHTML(u.id_card) : '<span class="text-muted">-</span>'}</span></td>
            <td><span class="custodian-tag">${u.department ? escapeHTML(u.department) : '<span class="text-muted">-</span>'}</span></td>
            <td>${roleBadges[u.role] || escapeHTML(u.role)}</td>
            <td>${statusBadges[u.status] || escapeHTML(u.status)}</td>
            <td><span class="font-outfit text-muted text-xs">${escapeHTML(u.created_at)}</span></td>
            <td>
                <div class="row-actions">
                    <button class="btn-row-action btn-edit" style="color: var(--purple);" data-username="${escapeHTML(u.username)}" onclick="handleEditUser(this.getAttribute('data-username'))" title="编辑账户/角色"><i class="fa-solid fa-user-gear"></i></button>
                    ${deleteBtn}
                </div>
            </td>
        `;
        DOM.usersTableBody.appendChild(tr);
    });
}

window.handleEditUser = function(username) {
    const user = state.systemUsers.find(u => u.username === username);
    if (!user) return;
    
    document.getElementById('edit-usr-username').value = user.username;
    document.getElementById('edit-usr-display-username').textContent = user.username;
    document.getElementById('edit-usr-realname').value = user.real_name || '';
    document.getElementById('edit-usr-phone').value = user.phone || '';
    document.getElementById('edit-usr-idcard').value = user.id_card || '';
    populateDeptDropdown(document.getElementById('edit-usr-dept'), user.department || '', true, '请选择所属部门...');
    document.getElementById('edit-usr-role').value = user.role;
    document.getElementById('edit-usr-status').value = user.status;
    document.getElementById('edit-usr-password').value = ''; // Always reset password input to blank on open
    
    // Disable role & status modification for primary admin to protect integrity
    const roleSelect = document.getElementById('edit-usr-role');
    const statusSelect = document.getElementById('edit-usr-status');
    if (username === 'admin') {
        roleSelect.disabled = true;
        statusSelect.disabled = true;
    } else {
        roleSelect.disabled = false;
        statusSelect.disabled = false;
    }
    
    DOM.userEditModal.classList.add('active');
};

// Bind User Edit Form submission
if (DOM.userEditForm) {
    DOM.userEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('edit-usr-username').value;
        const real_name = document.getElementById('edit-usr-realname').value.trim();
        const phone = document.getElementById('edit-usr-phone').value.trim();
        const id_card = document.getElementById('edit-usr-idcard').value.trim();
        const department = document.getElementById('edit-usr-dept').value.trim();
        const role = document.getElementById('edit-usr-role').value;
        const status = document.getElementById('edit-usr-status').value;
        const password = document.getElementById('edit-usr-password').value; // Read optional reset password
        
        if (!real_name) {
            showToast('真实姓名不能为空！', 'error');
            return;
        }
        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
            showToast('手机号码格式不正确，必须为11位中国手机号！', 'error');
            return;
        }
        const isMaskedIdCard = id_card.includes('*') && id_card.length === 18;
        if (!id_card || (!isMaskedIdCard && !/^\d{17}[\dXx]$/.test(id_card))) {
            showToast('身份证号格式不正确，必须为18位身份证号！', 'error');
            return;
        }
        if (!department) {
            showToast('使用部门不能为空！', 'error');
            return;
        }
        
        try {
            await fetchAPI(`/admin/users/${username}`, {
                method: 'PUT',
                body: JSON.stringify({ real_name, phone, id_card, department, role, status, password })
            });
            showToast(`员工 "${username}" 账户信息已成功更新！`, 'success');
            DOM.userEditModal.classList.remove('active');
            
            // Reload user records
            loadAllUsers();
            
            // If the updated user is the current user, sync state
            if (username === state.username) {
                state.role = role;
                enterApplication(); // Re-render sidebar/navigation
            }
        } catch (err) {
            showToast('更新失败: ' + err.message, 'error');
        }
    });
}

window.handleDeleteUser = async function(username) {
    if (username === 'admin') {
        showToast('内置超级管理员账户不可删除！', 'error');
        return;
    }
    
    if (confirm(`确定要永久注销并彻底删除员工账号 "${username}" 吗？此操作无法恢复，该用户将再也无法登录！`)) {
        try {
            await fetchAPI(`/admin/users/${username}`, {
                method: 'DELETE'
            });
            showToast(`账号 "${username}" 已成功从系统中移除！`, 'success');
            loadAllUsers();
        } catch (err) {
            showToast('删除账号失败: ' + err.message, 'error');
        }
    }
};

// ==========================================================================
// 6.5. Excel Export Functions (SheetJS Helper)
// ==========================================================================
function triggerExcelDownload(data, headers, filename) {
    if (!window.XLSX) {
        showToast("Excel 导出库未加载完成，请稍后再试", "error");
        return;
    }
    
    // Create sheet
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    
    // Auto-fit column widths
    const colWidths = headers.map(key => {
        let maxLen = key.toString().length * 2; // header length weight
        data.forEach(row => {
            const val = row[key];
            if (val !== undefined && val !== null) {
                const len = val.toString().length;
                // Double width weight for Chinese characters
                const chineseMatch = val.toString().match(/[\u4e00-\u9fa5]/g);
                const weight = len + (chineseMatch ? chineseMatch.length : 0);
                if (weight > maxLen) maxLen = weight;
            }
        });
        return { wch: Math.min(Math.max(maxLen + 3, 10), 50) }; // cap between 10 and 50 chars
    });
    ws['!cols'] = colWidths;
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "数据明细");
    
    // Download file
    XLSX.writeFile(wb, filename);
    showToast(`Excel 报表已成功导出并在本地开始下载！`, "success");
}

function handleExportAssets() {
    if (!state.assets || state.assets.length === 0) {
        showToast("当前台账列表中没有资产数据可供导出！", "error");
        return;
    }
    
    const categoryNames = { 'Electronics': '电子设备', 'Furniture': '办公家具', 'Software': '软件资产', 'Office': '行政耗材' };
    const statusNames = { 'Available': '闲置在库', 'In_Use': '分配在用', 'Maintenance': '维保检测', 'Scrapped': '报废处置' };
    
    const headers = [
        "资产编码", "资产名称", "资产类别", "采购价格 (元)", "采购日期", 
        "使用状态", "使用部门", "保管人", "备注说明"
    ];
    
    const data = state.assets.map(asset => {
        return {
            "资产编码": asset.asset_code || '-',
            "资产名称": asset.name || '-',
            "资产类别": categoryNames[asset.category] || asset.category || '-',
            "采购价格 (元)": typeof asset.price === 'number' ? asset.price : parseFloat(asset.price || 0),
            "采购日期": asset.purchase_date || '-',
            "使用状态": statusNames[asset.status] || asset.status || '-',
            "使用部门": asset.department || '-',
            "保管人": asset.user_name || '-',
            "备注说明": asset.description || '-'
        };
    });
    
    const timeStr = new Date().toISOString().split('T')[0];
    triggerExcelDownload(data, headers, `汉中电信_资产台账_${timeStr}.xlsx`);
}

function handleExportApprovals() {
    let rawList = [];
    let filename = "";
    
    const actionNames = { 'create': '登记资产', 'update': '修改资产', 'delete': '注销报废', 'register': '账号注册' };
    const statusNames = { 'pending': '⏳ 审核中', 'approved': '🟢 已批准', 'rejected': '🔴 被驳回' };
    const categoryNames = { 'Electronics': '电子设备', 'Furniture': '办公家具', 'Software': '软件资产', 'Office': '行政耗材' };
    
    if (state.role === 'admin') {
        if (state.approvalsTab === 'assets') {
            rawList = state.approvals.filter(a => a.status === 'pending' && a.action_type !== 'register');
            filename = `汉中电信_待审批资产事务台账`;
        } else if (state.approvalsTab === 'users') {
            rawList = state.pendingUsers.map(u => ({
                ...u,
                action_type: 'register',
                status: 'pending',
                requester: u.username,
                proposed_data: JSON.stringify({
                    real_name: u.real_name,
                    phone: u.phone,
                    id_card: u.id_card,
                    department: u.department
                })
            }));
            filename = `汉中电信_待审批注册账号台账`;
        } else if (state.approvalsTab === 'history') {
            rawList = state.approvals.filter(a => a.status !== 'pending');
            filename = `汉中电信_已审批事务历史台账`;
        }
    } else {
        // Regular user exports their own approvals list
        rawList = state.approvals.filter(a => a.action_type !== 'register');
        filename = `汉中电信_我的审批申请台账`;
    }
    
    if (!rawList || rawList.length === 0) {
        showToast("当前视图中没有审批记录可供导出！", "error");
        return;
    }
    
    const headers = [
        "审批单号", "审批类型", "申请账号", 
        "资产编码/注册姓名", "资产名称/注册部门", "采购价格/联系电话", 
        "资产类别/身份证号", "保管人员/所属部门", "审批状态", 
        "审批处理人", "审核批注备注", "申请发起时间", "审核决议时间"
    ];
    
    const data = rawList.map(appr => {
        let proposed = {};
        try {
            proposed = JSON.parse(appr.proposed_data);
        } catch(e) {
            proposed = {};
        }
        
        let colCodeOrRealname = '-';
        let colNameOrDept = '-';
        let colPriceOrPhone = '-';
        let colCategoryOrIdcard = '-';
        let colCustodianOrDept = '-';
        
        if (appr.action_type === 'register') {
            colCodeOrRealname = proposed.real_name || '-';
            colNameOrDept = proposed.department || '-';
            colPriceOrPhone = proposed.phone || '-';
            colCategoryOrIdcard = proposed.id_card ? `'${proposed.id_card}` : '-'; // Single quote to prevent scientific notation
            colCustodianOrDept = proposed.department || '-';
        } else {
            colCodeOrRealname = proposed.asset_code || '-';
            colNameOrDept = proposed.name || '-';
            colPriceOrPhone = typeof proposed.price === 'number' ? proposed.price : parseFloat(proposed.price || 0);
            colCategoryOrIdcard = categoryNames[proposed.category] || proposed.category || '-';
            colCustodianOrDept = proposed.user_name || '-';
        }
        
        return {
            "审批单号": appr.approval_code || '-',
            "审批类型": actionNames[appr.action_type] || appr.action_type || '-',
            "申请账号": appr.requester || '-',
            "资产编码/注册姓名": colCodeOrRealname,
            "资产名称/注册部门": colNameOrDept,
            "采购价格/联系电话": colPriceOrPhone,
            "资产类别/身份证号": colCategoryOrIdcard,
            "保管人员/所属部门": colCustodianOrDept,
            "审批状态": statusNames[appr.status] || appr.status || '-',
            "审批处理人": appr.reviewer || '-',
            "审核批注备注": appr.review_notes || '-',
            "申请发起时间": appr.created_at || '-',
            "审核决议时间": appr.reviewed_at || '-'
        };
    });
    
    const timeStr = new Date().toISOString().split('T')[0];
    triggerExcelDownload(data, headers, `${filename}_${timeStr}.xlsx`);
}

// ==========================================================================
// 7. System Utilities (Time ticker & Setup)
// ==========================================================================
function startSystemTicker() {
    const updateTime = () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        DOM.systemTime.textContent = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    };
    
    updateTime();
    setInterval(updateTime, 1000);
}

// Startup Initializations
document.addEventListener('DOMContentLoaded', () => {
    loadDepartments();
    startSystemTicker();
    setupAuthEvents();
    setupNavigation();
    setupAssetEvents();
    
    // Check Active Session Cache
    if (state.token && state.username) {
        enterApplication();
    } else {
        logout();
    }
});
