// pages/asset-detail/asset-detail.js
const { request } = require('../../utils/util.js');

Page({
  data: {
    assetId: null,
    assetCode: '',
    asset: null,
    imageUrls: [],
    categoryText: '',
    history: [],
    isAdmin: false,
    apiDomain: ''
  },

  onLoad: function (options) {
    const app = getApp();
    const apiBase = app.globalData.apiBase;
    const apiDomain = apiBase.substring(0, apiBase.lastIndexOf('/api'));

    const isAdmin = app.globalData.userInfo && app.globalData.userInfo.role === 'admin';

    this.setData({
      assetId: options.id || null,
      assetCode: options.code || '',
      isAdmin,
      apiDomain
    });
  },

  onShow: function () {
    this.loadAssetDetails();
  },

  loadAssetDetails: function () {
    const { assetId, assetCode, apiDomain } = this.data;
    let url = '';
    
    if (assetId) {
      url = `/assets/id/${assetId}`;
    } else if (assetCode) {
      url = `/assets/detail/${assetCode}`;
    } else {
      wx.showToast({
        title: '缺少查询参数',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '加载资产详情...' });

    request(url)
      .then(data => {
        // Map category
        const categoryMap = {
          'Electronics': '🔌 电子设备',
          'Furniture': '🛋️ 办公家具',
          'Software': '💿 软件资产',
          'Office': '📎 行政耗材'
        };

        // Map status
        let statusText = '未知';
        let statusClass = 'info';
        if (data.status === 'Available') { statusText = '闲置在库'; statusClass = 'success'; }
        else if (data.status === 'In_Use') { statusText = '分配在用'; statusClass = 'primary'; }
        else if (data.status === 'Maintenance') { statusText = '维保检测'; statusClass = 'warning'; }
        else if (data.status === 'Scrapped') { statusText = '报废处置'; statusClass = 'danger'; }

        // Process images
        let imageUrls = [];
        if (data.image_url) {
          imageUrls = data.image_url.split(',')
            .filter(url => url.trim().length > 0)
            .map(url => url.startsWith('http') ? url : (apiDomain + url));
        }

        const asset = {
          ...data,
          statusText,
          statusClass,
          formattedPrice: (data.price || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
        };

        this.setData({
          asset,
          assetId: data.id,
          assetCode: data.asset_code,
          imageUrls,
          categoryText: categoryMap[data.category] || data.category
        });

        // Load lifecycle history
        this.loadAssetHistory(data.asset_code);
      })
      .catch(err => {
        wx.hideLoading();
        console.error("Fetch asset details failed", err);
        wx.showModal({
          title: '查询失败',
          content: err.message || '未找到该资产，或者您没有该资产的使用部门查看权限。',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      });
  },

  loadAssetHistory: function (code) {
    request(`/assets/${code}/history`, {
      showLoading: false
    }).then(data => {
      const mappedHistory = data.map(item => {
        let actionText = '未知操作';
        let typeClass = 'info';
        if (item.action_type === 'create') { actionText = '资产建档入库'; typeClass = 'create'; }
        else if (item.action_type === 'update') { actionText = '资产属性变更'; typeClass = 'update'; }
        else if (item.action_type === 'delete') { actionText = '报废下架处置'; typeClass = 'delete'; }

        return {
          ...item,
          actionText,
          typeClass
        };
      });

      this.setData({
        history: mappedHistory
      });
      wx.hideLoading();
    }).catch(err => {
      console.error("Fetch history failed", err);
      wx.hideLoading();
    });
  },

  // Preview full image
  onPreviewImage: function (e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.imageUrls
    });
  },

  onCopyCode: function () {
    wx.setClipboardData({
      data: this.data.assetCode,
      success: () => {
        wx.showToast({
          title: '编码已复制',
          icon: 'success'
        });
      }
    });
  },

  onEditAsset: function () {
    wx.navigateTo({
      url: `/pages/asset-edit/asset-edit?id=${this.data.assetId}`
    });
  },

  onDeleteAsset: function () {
    const { assetId, isAdmin } = this.data;
    const title = isAdmin ? '直接注销资产' : '申请报废资产';
    const content = isAdmin 
      ? '确定要直接注销并从库中清出该固定资产吗？该操作将直接记入时光机且不可撤销！'
      : '确定要提交该固定资产的报废处置申请吗？提交后需等待管理员审批。';

    wx.showModal({
      title,
      content,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          
          request(`/assets/${assetId}`, {
            method: 'DELETE'
          }).then(res => {
            wx.hideLoading();
            if (res.approval_required) {
              wx.showModal({
                title: '申请已提交',
                content: res.message || '报废申请提交成功，请等待管理员审核。',
                showCancel: false,
                success: () => {
                  wx.navigateBack();
                }
              });
            } else {
              wx.showToast({
                title: '资产已注销销账',
                icon: 'success',
                duration: 1500
              });
              setTimeout(() => {
                wx.navigateBack();
              }, 1000);
            }
          }).catch(err => {
            wx.hideLoading();
            console.error("Delete asset request failed", err);
          });
        }
      }
    });
  }
});
