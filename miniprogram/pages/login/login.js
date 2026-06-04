// pages/login/login.js
const { request } = require('../../utils/util.js');

Page({
  data: {
    username: '',
    password: '',
    openid: '',
    bound: false
  },

  onLoad: function (options) {
    // If redirected from registration or other parts
    if (options.openid) {
      this.setData({
        openid: options.openid
      });
    }
  },

  onShow: function () {
    // If token exists, skip login
    const app = getApp();
    if (app.globalData.token) {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  // WeChat One-click Quick Login
  onWeChatQuickLogin: function () {
    wx.login({
      success: (res) => {
        if (res.code) {
          request('/wechat/login', {
            method: 'POST',
            data: { code: res.code },
            loadingText: '微信快捷登录中...'
          }).then(data => {
            const app = getApp();
            if (data.bound) {
              // Bound successfully, perform login
              app.globalData.token = data.token;
              app.globalData.userInfo = {
                username: data.username,
                realName: data.real_name,
                role: data.role
              };
              app.globalData.openid = data.openid || '';
              
              wx.setStorageSync('token', data.token);
              wx.setStorageSync('userInfo', app.globalData.userInfo);
              
              wx.showToast({
                title: '快捷登录成功',
                icon: 'success',
                duration: 1500
              });
              
              setTimeout(() => {
                wx.switchTab({
                  url: '/pages/index/index'
                });
              }, 1000);
            } else {
              // Unbound account
              this.setData({
                openid: data.openid,
                bound: false
              });
              app.globalData.openid = data.openid;
              wx.setStorageSync('openid', data.openid);
              
              wx.showModal({
                title: '提示',
                content: '您的微信账号尚未绑定系统员工账号。请在下方输入已有账密完成绑定，或点击下方链接申请新账号。',
                showCancel: false
              });
            }
          }).catch(err => {
            console.error("WeChat login error", err);
          });
        } else {
          wx.showToast({
            title: '微信授权失败: ' + res.errMsg,
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '微信登录接口调用失败',
          icon: 'none'
        });
      }
    });
  },

  // Handle Bind & Login or Regular Login form submit
  onSubmitLogin: function (e) {
    const { username, password } = e.detail.value;
    
    if (!username || !password) {
      wx.showToast({
        title: '请输入用户名和密码',
        icon: 'none'
      });
      return;
    }

    const { openid } = this.data;
    const app = getApp();

    if (openid) {
      // Binding flow
      request('/wechat/bind', {
        method: 'POST',
        data: {
          username,
          password,
          openid
        },
        loadingText: '账号绑定中...'
      }).then(data => {
        app.globalData.token = data.token;
        app.globalData.userInfo = {
          username: data.username,
          realName: data.real_name,
          role: data.role
        };
        
        wx.setStorageSync('token', data.token);
        wx.setStorageSync('userInfo', app.globalData.userInfo);
        
        wx.showToast({
          title: '账号绑定并登录成功',
          icon: 'success',
          duration: 1500
        });

        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1000);
      }).catch(err => {
        console.error("Binding failed", err);
      });
    } else {
      // Regular Web-style login
      request('/login', {
        method: 'POST',
        data: {
          username,
          password
        },
        loadingText: '登录中...'
      }).then(data => {
        app.globalData.token = data.token;
        app.globalData.userInfo = {
          username: data.username,
          realName: data.real_name,
          role: data.role
        };
        
        wx.setStorageSync('token', data.token);
        wx.setStorageSync('userInfo', app.globalData.userInfo);
        
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        });

        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1000);
      }).catch(err => {
        console.error("Login failed", err);
      });
    }
  },

  goToRegister: function () {
    const { openid } = this.data;
    wx.navigateTo({
      url: `/pages/register/register?openid=${openid}`
    });
  }
});
