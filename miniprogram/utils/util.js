const formatTime = date => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return [year, month, day].map(formatNumber).join('-') + ' ' + [hour, minute, second].map(formatNumber).join(':');
};

const formatNumber = n => {
  n = n.toString();
  return n[1] ? n : '0' + n;
};

// Custom API Request Wrapper
const request = (url, options = {}) => {
  const app = getApp();
  const apiBase = app.globalData.apiBase;
  const token = app.globalData.token;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (options.showLoading !== false) {
    wx.showLoading({
      title: options.loadingText || '加载中...',
      mask: true
    });
  }
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${apiBase}${url}`,
      method: options.method || 'GET',
      data: options.data,
      header: headers,
      timeout: 10000,
      success: (res) => {
        if (options.showLoading !== false) {
          wx.hideLoading();
        }
        
        // Handle Session Expiration / Unauthorized
        if (res.statusCode === 401) {
          app.globalData.token = '';
          app.globalData.userInfo = null;
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          
          wx.showToast({
            title: '登录过期，请重新登录',
            icon: 'none',
            duration: 2000
          });
          
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/login/login'
            });
          }, 1500);
          
          reject(new Error('Unauthorized'));
          return;
        }
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const errMsg = res.data && res.data.message ? res.data.message : '服务器内部错误';
          wx.showToast({
            title: errMsg,
            icon: 'none',
            duration: 2500
          });
          reject(new Error(errMsg));
        }
      },
      fail: (err) => {
        if (options.showLoading !== false) {
          wx.hideLoading();
        }
        wx.showToast({
          title: '网络连接失败，请检查网络设置',
          icon: 'none',
          duration: 3000
        });
        reject(err);
      }
    });
  });
};

const checkPasswordStrength = (pwd) => {
  if (!pwd) return { score: 0, text: '无', valid: false };
  
  const hasLength = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\|/~`';]/.test(pwd);
  
  let score = 0;
  if (hasLength) score += 20;
  if (hasUpper) score += 20;
  if (hasLower) score += 20;
  if (hasNumber) score += 20;
  if (hasSpecial) score += 20;
  
  let text = '极弱';
  if (score > 40 && score <= 80) text = '中等';
  else if (score > 80) text = '强';
  
  const valid = hasLength && hasUpper && hasLower && hasNumber && hasSpecial;
  
  return {
    score,
    text,
    valid,
    criteria: {
      length: hasLength,
      upper: hasUpper,
      lower: hasLower,
      number: hasNumber,
      special: hasSpecial
    }
  };
};

module.exports = {
  formatTime,
  request,
  checkPasswordStrength
};
