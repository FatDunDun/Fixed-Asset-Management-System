// pages/asset-edit/asset-edit.js
const { request } = require('../../utils/util.js');

Page({
  data: {
    isEdit: false,
    assetId: null,
    isAdmin: false,
    apiBase: '',
    apiDomain: '',

    // Form inputs
    assetCode: '',
    name: '',
    price: '',
    purchaseDate: '',
    userName: '',
    description: '',
    
    // Lists for pickers
    categories: [
      { label: '🔌 电子设备', value: 'Electronics' },
      { label: '🛋️ 办公家具', value: 'Furniture' },
      { label: '💿 软件资产', value: 'Software' },
      { label: '📎 行政耗材', value: 'Office' }
    ],
    categoryIndex: -1,
    
    statuses: [
      { label: '闲置在库', value: 'Available' },
      { label: '分配在用', value: 'In_Use' },
      { label: '维保检测', value: 'Maintenance' }
    ],
    statusIndex: 0, // Default to Available
    
    departments: [],
    deptIndex: -1,

    // Image tracking
    imageUrls: [], // Full URLs for image swiper/thumbnails preview
    rawUploadedUrls: [] // Relative URLs (/uploads/...) to save to DB
  },

  onLoad: function (options) {
    const app = getApp();
    const apiBase = app.globalData.apiBase;
    const apiDomain = apiBase.substring(0, apiBase.lastIndexOf('/api'));
    const isAdmin = app.globalData.userInfo && app.globalData.userInfo.role === 'admin';

    this.setData({
      apiBase,
      apiDomain,
      isAdmin,
      isEdit: !!options.id,
      assetId: options.id || null
    });

    // Set default date for today in create mode
    if (!this.data.isEdit) {
      const today = new Date().toISOString().split('T')[0];
      this.setData({
        purchaseDate: today
      });
    }

    // Load static departments list, then load asset data if edit mode
    this.loadDepartments().then(() => {
      if (this.data.isEdit) {
        this.loadAssetData(options.id);
      }
    });
  },

  loadDepartments: function () {
    return request('/departments', {
      showLoading: false
    }).then(data => {
      this.setData({
        departments: data
      });
    }).catch(err => {
      console.error("Failed to load departments", err);
    });
  },

  loadAssetData: function (id) {
    wx.showLoading({ title: '加载资产数据...' });
    
    request(`/assets/id/${id}`)
      .then(data => {
        wx.hideLoading();
        
        // Find category index
        const categoryIndex = this.data.categories.findIndex(c => c.value === data.category);
        
        // Find status index
        const statusIndex = this.data.statuses.findIndex(s => s.value === data.status);
        
        // Find dept index
        const deptIndex = this.data.departments.indexOf(data.department);

        // Process images
        let imageUrls = [];
        let rawUploadedUrls = [];
        if (data.image_url) {
          rawUploadedUrls = data.image_url.split(',').filter(url => url.trim().length > 0);
          imageUrls = rawUploadedUrls.map(url => url.startsWith('http') ? url : (this.data.apiDomain + url));
        }

        this.setData({
          assetCode: data.asset_code,
          name: data.name,
          price: data.price.toString(),
          purchaseDate: data.purchase_date,
          userName: data.user_name || '',
          description: data.description || '',
          categoryIndex,
          statusIndex: statusIndex === -1 ? 0 : statusIndex,
          deptIndex,
          imageUrls,
          rawUploadedUrls
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error("Failed to load asset details for editing", err);
        wx.showModal({
          title: '加载失败',
          content: '未找到资产或无权编辑。',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      });
  },

  // Picker change handlers
  onCategoryChange: function (e) {
    this.setData({
      categoryIndex: parseInt(e.detail.value, 10)
    });
  },

  onStatusChange: function (e) {
    this.setData({
      statusIndex: parseInt(e.detail.value, 10)
    });
  },

  onDeptChange: function (e) {
    this.setData({
      deptIndex: parseInt(e.detail.value, 10)
    });
  },

  onDateChange: function (e) {
    this.setData({
      purchaseDate: e.detail.value
    });
  },

  // Image Upload Pipeline
  onChooseImage: function () {
    const app = getApp();
    const token = app.globalData.token;
    
    wx.chooseImage({
      count: 5 - this.data.imageUrls.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePaths = res.tempFilePaths;
        
        // Upload each selected file
        filePaths.forEach(filePath => {
          wx.showLoading({ title: '图片上传中...' });
          
          wx.uploadFile({
            url: `${this.data.apiBase}/upload`,
            filePath: filePath,
            name: 'file',
            header: {
              'Authorization': `Bearer ${token}`
            },
            success: (uploadRes) => {
              wx.hideLoading();
              
              if (uploadRes.statusCode >= 200 && uploadRes.statusCode < 300) {
                const resData = JSON.parse(uploadRes.data);
                const relativeUrl = resData.image_url;
                const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : (this.data.apiDomain + relativeUrl);
                
                this.setData({
                  imageUrls: [...this.data.imageUrls, fullUrl],
                  rawUploadedUrls: [...this.data.rawUploadedUrls, relativeUrl]
                });
                
                wx.showToast({ title: '图片上传成功', icon: 'success' });
              } else {
                const errJson = JSON.parse(uploadRes.data);
                wx.showToast({
                  title: errJson.message || '上传失败',
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              console.error("Upload failed", err);
              wx.showToast({ title: '网络上传故障', icon: 'none' });
            }
          });
        });
      }
    });
  },

  onRemoveImage: function (e) {
    const idx = e.currentTarget.dataset.index;
    const imageUrls = [...this.data.imageUrls];
    const rawUploadedUrls = [...this.data.rawUploadedUrls];
    
    imageUrls.splice(idx, 1);
    rawUploadedUrls.splice(idx, 1);
    
    this.setData({
      imageUrls,
      rawUploadedUrls
    });
  },

  onPreviewImage: function (e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.imageUrls
    });
  },

  onSubmitAsset: function (e) {
    const { asset_code, name, price, description, user_name } = e.detail.value;
    const { isEdit, assetId, categories, categoryIndex, statuses, statusIndex, departments, deptIndex, purchaseDate, rawUploadedUrls } = this.data;

    // Validate fields
    if (!name) {
      wx.showToast({ title: '请输入资产名称', icon: 'none' });
      return;
    }
    if (categoryIndex === -1) {
      wx.showToast({ title: '请选择资产分类', icon: 'none' });
      return;
    }
    if (!price || isNaN(parseFloat(price))) {
      wx.showToast({ title: '请输入有效的采购单价', icon: 'none' });
      return;
    }
    if (!purchaseDate) {
      wx.showToast({ title: '请选择采购日期', icon: 'none' });
      return;
    }

    const payload = {
      name: name.trim(),
      category: categories[categoryIndex].value,
      price: parseFloat(price),
      purchase_date: purchaseDate,
      status: statuses[statusIndex].value,
      department: deptIndex !== -1 ? departments[deptIndex] : '',
      user_name: user_name.trim(),
      description: description.trim(),
      image_url: rawUploadedUrls.join(',')
    };

    if (asset_code && asset_code.trim()) {
      payload.asset_code = asset_code.trim();
    }

    wx.showLoading({ title: '保存中...' });

    let method = 'POST';
    let url = '/assets';
    if (isEdit) {
      method = 'PUT';
      url = `/assets/${assetId}`;
    }

    request(url, {
      method,
      data: payload
    }).then(res => {
      wx.hideLoading();
      
      if (res.approval_required) {
        // Non-admin approval required dialog
        wx.showModal({
          title: '已提交审核',
          content: res.message || '申请提交成功，请等待管理员审核启用。',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      } else {
        wx.showToast({
          title: '资产信息保存成功',
          icon: 'success',
          duration: 1500
        });
        
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      }
    }).catch(err => {
      wx.hideLoading();
      console.error("Save asset failed", err);
    });
  }
});
