// pages/assets/assets.js
const { request } = require('../../utils/util.js');

Page({
  data: {
    apiDomain: '',
    assets: [],
    fullAssetsList: [], // Holds full list retrieved from server
    loading: false,
    noMoreData: false,
    currentPage: 1,
    pageSize: 10,
    searchQuery: '',
    selectedCategory: '',
    selectedStatus: '',
    
    // Config filters
    categories: [
      { label: '全部类别', value: '' },
      { label: '🔌 电子设备', value: 'Electronics' },
      { label: '🛋️ 办公家具', value: 'Furniture' },
      { label: '💿 软件资产', value: 'Software' },
      { label: '📎 行政耗材', value: 'Office' }
    ],
    statuses: [
      { label: '全部状态', value: '' },
      { label: '闲置在库', value: 'Available' },
      { label: '分配在用', value: 'In_Use' },
      { label: '维保检测', value: 'Maintenance' },
      { label: '报废处置', value: 'Scrapped' }
    ],

    // Sorting config
    sortFields: [
      { label: '创建时间', value: 'id' },
      { label: '资产价格', value: 'price' },
      { label: '采购日期', value: 'purchase_date' },
      { label: '资产名称', value: 'name' }
    ],
    selectedSortIndex: 0,
    sortOrder: 'desc' // 'asc' or 'desc'
  },

  onLoad: function (options) {
    const app = getApp();
    // Parse backend base URL to extract domain for prepending to relative upload URLs
    const apiBase = app.globalData.apiBase;
    const apiDomain = apiBase.substring(0, apiBase.lastIndexOf('/api'));
    
    this.setData({
      apiDomain
    });

    // Handle incoming parameters from Dashboard (like status or search query)
    if (options.status) {
      this.setData({
        selectedStatus: options.status
      });
    }
    if (options.q) {
      this.setData({
        searchQuery: decodeURIComponent(options.q)
      });
    }

    this.refreshAssetsList();
  },

  onPullDownRefresh: function () {
    this.refreshAssetsList().then(() => {
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom: function () {
    if (this.data.noMoreData || this.data.loading) return;
    
    this.loadNextLocalPage();
  },

  refreshAssetsList: function () {
    this.setData({
      currentPage: 1,
      noMoreData: false,
      assets: []
    });
    return this.fetchAssetsFromServer();
  },

  // Fetch full list matching filters from server, then paginate locally
  fetchAssetsFromServer: function () {
    this.setData({ loading: true });
    
    const { searchQuery, selectedCategory, selectedStatus, sortFields, selectedSortIndex, sortOrder } = this.data;
    const sortBy = sortFields[selectedSortIndex].value;

    return request(`/assets?q=${encodeURIComponent(searchQuery)}&category=${selectedCategory}&status=${selectedStatus}&sort_by=${sortBy}&sort_order=${sortOrder}`)
      .then(data => {
        // Map display values
        const mappedList = data.map(item => {
          let statusText = '未知';
          let statusClass = 'info';
          if (item.status === 'Available') { statusText = '闲置在库'; statusClass = 'success'; }
          else if (item.status === 'In_Use') { statusText = '分配在用'; statusClass = 'primary'; }
          else if (item.status === 'Maintenance') { statusText = '维保检测'; statusClass = 'warning'; }
          else if (item.status === 'Scrapped') { statusText = '报废处置'; statusClass = 'danger'; }

          return {
            ...item,
            statusText,
            statusClass,
            formattedPrice: (item.price || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          };
        });

        this.setData({
          fullAssetsList: mappedList,
          loading: false
        });

        // Load page 1
        this.loadNextLocalPage(true);
      }).catch(err => {
        this.setData({ loading: false });
        console.error("Fetch assets failed", err);
      });
  },

  loadNextLocalPage: function (isReset = false) {
    const { currentPage, pageSize, fullAssetsList, assets } = this.data;
    const nextPage = isReset ? 1 : currentPage + 1;
    const start = 0;
    const end = nextPage * pageSize;
    
    const paginatedItems = fullAssetsList.slice(start, end);
    const noMoreData = end >= fullAssetsList.length;

    this.setData({
      assets: paginatedItems,
      currentPage: nextPage,
      noMoreData
    });
  },

  // Input listeners
  onSearchInput: function (e) {
    this.setData({
      searchQuery: e.detail.value
    });
  },

  onClearSearch: function () {
    this.setData({
      searchQuery: ''
    });
    this.refreshAssetsList();
  },

  onSearchConfirm: function () {
    this.refreshAssetsList();
  },

  // Tags filter listeners
  onCategorySelect: function (e) {
    const val = e.currentTarget.dataset.value;
    if (this.data.selectedCategory === val) return;
    
    this.setData({
      selectedCategory: val
    });
    this.refreshAssetsList();
  },

  onStatusSelect: function (e) {
    const val = e.currentTarget.dataset.value;
    if (this.data.selectedStatus === val) return;
    
    this.setData({
      selectedStatus: val
    });
    this.refreshAssetsList();
  },

  // Sorting listeners
  onSortChange: function (e) {
    const idx = parseInt(e.detail.value, 10);
    this.setData({
      selectedSortIndex: idx
    });
    this.refreshAssetsList();
  },

  onToggleSortOrder: function () {
    const nextOrder = this.data.sortOrder === 'desc' ? 'asc' : 'desc';
    this.setData({
      sortOrder: nextOrder
    });
    this.refreshAssetsList();
  },

  onAssetClick: function (e) {
    const { id, code } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/asset-detail/asset-detail?id=${id}&code=${code}`
    });
  }
});
