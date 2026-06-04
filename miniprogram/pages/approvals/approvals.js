// pages/approvals/approvals.js
const { request } = require('../../utils/util.js');

Page({
  data: {
    isAdmin: false,
    activeTab: 'assets', // 'assets', 'users', 'history'
    
    // Admin pending lists
    assetApprovals: [],
    userApprovals: [],
    historyApprovals: [],
    
    // Badge counts
    pendingAssetsCount: 0,
    pendingUsersCount: 0,
    
    // Regular user list
    userApplications: [],

    // Review Modal State
    showCommentModal: false,
    reviewType: '', // 'asset' or 'user'
    reviewId: null, // asset approval ID
    reviewTarget: '', // user registration username
    reviewAction: '', // 'approve' or 'reject'
    reviewComment: ''
  },

  onShow: function () {
    const app = getApp();
    if (!app.globalData.token) {
      wx.reLaunch({
        url: '/pages/login/login'
      });
      return;
    }

    const isAdmin = app.globalData.userInfo && app.globalData.userInfo.role === 'admin';
    this.setData({
      isAdmin
    });

    this.refreshData();
  },

  onPullDownRefresh: function () {
    this.refreshData().then(() => {
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  },

  refreshData: function () {
    if (this.data.isAdmin) {
      return this.loadAdminApprovals();
    } else {
      return this.loadUserApplications();
    }
  },

  loadAdminApprovals: function () {
    wx.showLoading({ title: '拉取审批流...' });

    // Fetch approvals list and current assets (for diffing) simultaneously
    const fetchApprovals = request('/approvals');
    const fetchAssets = request('/assets');
    const fetchPendingUsers = request('/admin/pending_users');

    return Promise.all([fetchApprovals, fetchAssets, fetchPendingUsers])
      .then(([approvalsData, assetsData, pendingUsersData]) => {
        wx.hideLoading();

        // 1. Process Asset Approvals and History
        const categoryMap = {
          'Electronics': '🔌 电子设备',
          'Furniture': '🛋️ 办公家具',
          'Software': '💿 软件资产',
          'Office': '📎 行政耗材'
        };
        const statusMap = {
          'Available': '闲置在库',
          'In_Use': '分配在用',
          'Maintenance': '维保检测',
          'Scrapped': '报废处置'
        };

        const assetApprovals = [];
        const historyApprovals = [];

        approvalsData.forEach(item => {
          // If action is register user, skip (we fetch registration requests separately from pending_users)
          if (item.action_type === 'register') {
            if (item.status !== 'pending') {
              // Add to history
              historyApprovals.push({
                ...item,
                typeText: '账号注册',
                typeClass: 'create',
                statusText: item.status === 'approved' ? '已核准' : '已驳回',
                statusClass: item.status === 'approved' ? 'success' : 'danger'
              });
            }
            return;
          }

          let proposed = {};
          try {
            proposed = JSON.parse(item.proposed_data);
          } catch (e) {
            console.error("Failed to parse proposed_data JSON", e);
          }

          const actionTextMap = {
            'create': '资产入账登记',
            'update': '资产信息修改',
            'delete': '资产报废注销'
          };
          
          if (item.status === 'pending') {
            // Calculate diffs for update action
            let diffs = [];
            if (item.action_type === 'update' && item.asset_id) {
              const oldAsset = assetsData.find(a => a.id === item.asset_id);
              if (oldAsset) {
                const fieldsMap = {
                  'asset_code': { label: '编码', formatter: v => v },
                  'name': { label: '名称', formatter: v => v },
                  'category': { label: '分类', formatter: v => categoryMap[v] || v },
                  'price': { label: '单价', formatter: v => '¥' + (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) },
                  'purchase_date': { label: '采购日期', formatter: v => v },
                  'status': { label: '状态', formatter: v => statusMap[v] || v },
                  'department': { label: '部门', formatter: v => v || '无' },
                  'user_name': { label: '保管人', formatter: v => v || '无' },
                  'description': { label: '备注', formatter: v => v || '无' }
                };

                Object.entries(fieldsMap).forEach(([f, cfg]) => {
                  let oldVal = oldAsset[f];
                  let newVal = proposed[f];
                  
                  // Handle float comparisons
                  if (f === 'price') {
                    oldVal = parseFloat(oldVal || 0);
                    newVal = parseFloat(newVal || 0);
                  }

                  if (oldVal !== newVal) {
                    diffs.push({
                      field: f,
                      label: cfg.label,
                      oldVal: cfg.formatter(oldAsset[f]),
                      newVal: cfg.formatter(proposed[f])
                    });
                  }
                });
              }
            }

            assetApprovals.push({
              ...item,
              proposed,
              diffs,
              actionText: actionTextMap[item.action_type] || '资产变动',
              categoryText: categoryMap[proposed.category] || proposed.category
            });
          } else {
            // Approved/Rejected records go to history
            historyApprovals.push({
              ...item,
              typeText: actionTextMap[item.action_type] || '资产变动',
              typeClass: item.action_type === 'create' ? 'create' : (item.action_type === 'update' ? 'update' : 'delete'),
              statusText: item.status === 'approved' ? '已核准' : '已驳回',
              statusClass: item.status === 'approved' ? 'success' : 'danger'
            });
          }
        });

        // 2. Process User Registrations
        const userApprovals = pendingUsersData.filter(u => u.status === 'pending');

        this.setData({
          assetApprovals,
          userApprovals,
          historyApprovals,
          pendingAssetsCount: assetApprovals.length,
          pendingUsersCount: userApprovals.length
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error("Admin approvals load error", err);
      });
  },

  loadUserApplications: function () {
    wx.showLoading({ title: '拉取我的申请...' });

    return request('/approvals')
      .then(data => {
        wx.hideLoading();

        const categoryMap = {
          'Electronics': '🔌 电子设备',
          'Furniture': '🛋️ 办公家具',
          'Software': '💿 软件资产',
          'Office': '📎 行政耗材'
        };

        const userApplications = data.map(item => {
          let proposed = {};
          try {
            proposed = JSON.parse(item.proposed_data);
          } catch (e) {}

          let typeText = '资产变动';
          if (item.action_type === 'create') typeText = '登记新资产';
          else if (item.action_type === 'update') typeText = '修改资产属性';
          else if (item.action_type === 'delete') typeText = '报废处置申请';
          else if (item.action_type === 'register') typeText = '员工注册申请';

          let statusText = '审核中';
          let statusClass = 'warning';
          if (item.status === 'approved') { statusText = '已核准'; statusClass = 'success'; }
          else if (item.status === 'rejected') { statusText = '已驳回'; statusClass = 'danger'; }

          return {
            ...item,
            typeText,
            statusText,
            statusClass,
            assetName: proposed.name || proposed.real_name || '固定资产',
            asset_code: proposed.asset_code || ''
          };
        });

        this.setData({
          userApplications
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error("User applications load error", err);
      });
  },

  onTabSelect: function (e) {
    const tab = e.currentTarget.dataset.tab;
    if (this.data.activeTab === tab) return;

    this.setData({
      activeTab: tab
    });
  },

  // Actions trigger: asset review
  onReviewAsset: function (e) {
    const { id, action } = e.currentTarget.dataset;
    this.setData({
      showCommentModal: true,
      reviewType: 'asset',
      reviewId: id,
      reviewAction: action,
      reviewComment: ''
    });
  },

  // Actions trigger: user registration review
  onReviewUser: function (e) {
    const { username, action } = e.currentTarget.dataset;
    this.setData({
      showCommentModal: true,
      reviewType: 'user',
      reviewTarget: username,
      reviewAction: action,
      reviewComment: ''
    });
  },

  onCommentInput: function (e) {
    this.setData({
      reviewComment: e.detail.value
    });
  },

  onCancelReview: function () {
    this.setData({
      showCommentModal: false,
      reviewType: '',
      reviewId: null,
      reviewTarget: '',
      reviewAction: '',
      reviewComment: ''
    });
  },

  onConfirmReview: function () {
    const { reviewType, reviewId, reviewTarget, reviewAction, reviewComment } = this.data;
    
    wx.showLoading({ title: '正在提交决议...' });

    let promise;
    if (reviewType === 'asset') {
      promise = request(`/approvals/${reviewId}/review`, {
        method: 'POST',
        data: {
          action: reviewAction,
          review_notes: reviewComment
        }
      });
    } else if (reviewType === 'user') {
      promise = request('/admin/review_user', {
        method: 'POST',
        data: {
          username: reviewTarget,
          action: reviewAction,
          review_notes: reviewComment
        }
      });
    }

    promise.then(res => {
      wx.hideLoading();
      wx.showToast({
        title: '处理完成',
        icon: 'success',
        duration: 1500
      });
      
      this.onCancelReview();
      
      // Reload lists
      this.refreshData();
    }).catch(err => {
      wx.hideLoading();
      console.error("Submission failed", err);
    });
  }
});
