App({
  onLaunch: function () {
    // Check for existing token and userInfo in local storage
    const token = wx.getStorageSync('token') || '';
    const userInfo = wx.getStorageSync('userInfo') || null;
    const openid = wx.getStorageSync('openid') || '';

    if (token) {
      this.globalData.token = token;
    }
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
    if (openid) {
      this.globalData.openid = openid;
    }
  },
  
  globalData: {
    // Local Flask development backend (on port 5001)
    // Note: In WeChat DevTools, check the "Do not verify validity of domain names, web-view, TLS, and HTTPS cert" checkbox.
    apiBase: 'http://10.100.171.198:5001/api',
    token: '',
    userInfo: null,
    openid: ''
  }
});
