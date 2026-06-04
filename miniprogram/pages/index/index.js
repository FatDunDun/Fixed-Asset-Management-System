// pages/index/index.js
const { request } = require('../../utils/util.js');

Page({
  data: {
    userInfo: null,
    avatarLetter: 'U',
    roleText: '用户',
    stats: {
      total_count: 0,
      total_value: 0,
      by_status: {},
      by_category: {}
    },
    formattedTotalValue: '0.00',
    healthScore: 100,
    healthText: '运行正常',
    categoryList: []
  },

  onShow: function () {
    const app = getApp();
    if (!app.globalData.token) {
      wx.reLaunch({
        url: '/pages/login/login'
      });
      return;
    }

    const userInfo = app.globalData.userInfo || {};
    let avatarLetter = 'U';
    if (userInfo.realName) {
      avatarLetter = userInfo.realName.substring(0, 1);
    } else if (userInfo.username) {
      avatarLetter = userInfo.username.substring(0, 1).toUpperCase();
    }

    this.setData({
      userInfo,
      avatarLetter,
      roleText: userInfo.role === 'admin' ? '系统管理员' : '普通用户'
    });

    this.loadDashboardStats();
  },

  onPullDownRefresh: function () {
    this.loadDashboardStats().then(() => {
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadDashboardStats: function () {
    return request('/stats', {
      showLoading: false
    }).then(data => {
      // 1. Format valuation
      const totalVal = data.total_value || 0;
      const formattedTotalValue = totalVal.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      // 2. Health score calculation
      const avail = data.by_status['Available'] || 0;
      const use = data.by_status['In_Use'] || 0;
      const total = data.total_count || 0;
      
      let healthScore = 100;
      let healthText = '运行正常';
      if (total > 0) {
        healthScore = Math.round(((avail + use) / total) * 100);
        if (healthScore >= 90) healthText = '运行正常';
        else if (healthScore >= 70) healthText = '亚健康警示';
        else healthText = '急需维保整备';
      }

      // 3. Categories horizontal progress bars mapping
      const categoryMapping = {
        'Electronics': { name: '电子设备', icon: '🔌' },
        'Furniture': { name: '办公家具', icon: '🛋️' },
        'Software': { name: '软件资产', icon: '💿' },
        'Office': { name: '行政耗材', icon: '📎' }
      };

      const categoryList = Object.entries(categoryMapping).map(([key, config]) => {
        const catData = data.by_category[key] || { count: 0, total_value: 0 };
        const val = catData.total_value || 0;
        const count = catData.count || 0;
        const percentage = totalVal > 0 ? Math.round((val / totalVal) * 100) : 0;
        
        return {
          key,
          ...config,
          count,
          value: val,
          formattedValue: val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          percentage
        };
      }).sort((a, b) => b.value - a.value);

      this.setData({
        stats: data,
        formattedTotalValue,
        healthScore,
        healthText,
        categoryList
      });
    }).catch(err => {
      console.error("Dashboard fetching failure:", err);
    });
  },

  onMetricClick: function (e) {
    const { type } = e.currentTarget.dataset;
    if (type === 'total' || type === 'valuation') {
      wx.switchTab({
        url: '/pages/assets/assets'
      });
    } else {
      // Navigate to asset page with filter status
      wx.navigateTo({
        url: `/pages/assets/assets?status=${type}`
      });
    }
  },

  // WeChat scan QR code / barcode integration
  onScanQRCode: function () {
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['barCode', 'qrCode'],
      success: (res) => {
        const code = res.result;
        if (code) {
          wx.showLoading({
            title: '查询资产中...'
          });
          
          // Verify if it is an asset code format (starts with AST-)
          if (code.startsWith('AST-')) {
            wx.hideLoading();
            wx.navigateTo({
              url: `/pages/asset-detail/asset-detail?code=${code}`
            });
          } else {
            // General query by keyword
            wx.hideLoading();
            wx.navigateTo({
              url: `/pages/assets/assets?q=${encodeURIComponent(code)}`
            });
          }
        }
      },
      fail: (err) => {
        console.warn("Scan cancelled or failed", err);
      }
    });
  },

  onAddAsset: function () {
    wx.navigateTo({
      url: '/pages/asset-edit/asset-edit'
    });
  },

  onGoToApprovals: function () {
    wx.switchTab({
      url: '/pages/approvals/approvals'
    });
  },

  onLogout: function () {
    wx.showModal({
      title: '退出登录',
      content: '确认要安全退出汉中电信资产管理系统吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.globalData.token = '';
          app.globalData.userInfo = null;
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          
          wx.showToast({
            title: '安全退出成功',
            icon: 'success'
          });

          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/login/login'
            });
          }, 1000);
        }
      }
    });
  }
});
