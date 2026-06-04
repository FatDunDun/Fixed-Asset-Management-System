// pages/register/register.js
const { request, checkPasswordStrength } = require('../../utils/util.js');

Page({
  data: {
    departments: [],
    deptIndex: -1,
    openid: '',
    
    // Password auditing
    password: '',
    confirmPassword: '',
    strengthScore: 0,
    strengthText: '无',
    strengthClass: 'danger',
    reqs: {
      length: false,
      upper: false,
      lower: false,
      number: false,
      special: false
    },
    reqsMatch: false,
    formValid: false
  },

  onLoad: function (options) {
    if (options.openid) {
      this.setData({
        openid: options.openid
      });
    }
    
    // Load department list from backend
    this.loadDepartments();
  },

  loadDepartments: function () {
    request('/departments', {
      showLoading: false
    }).then(data => {
      this.setData({
        departments: data
      });
    }).catch(err => {
      console.error("Failed to load departments", err);
    });
  },

  onDeptChange: function (e) {
    this.setData({
      deptIndex: parseInt(e.detail.value, 10)
    });
  },

  onPasswordInput: function (e) {
    const password = e.detail.value;
    const strength = checkPasswordStrength(password);
    
    let strengthClass = 'danger';
    if (strength.score > 40 && strength.score <= 80) strengthClass = 'warning';
    else if (strength.score > 80) strengthClass = 'success';

    const reqsMatch = password === this.data.confirmPassword && password.length > 0;

    this.setData({
      password,
      strengthScore: strength.score,
      strengthText: strength.text,
      strengthClass,
      reqs: strength.criteria,
      reqsMatch,
      formValid: strength.valid && reqsMatch
    });
  },

  onConfirmPasswordInput: function (e) {
    const confirmPassword = e.detail.value;
    const reqsMatch = this.data.password === confirmPassword && confirmPassword.length > 0;
    
    const strength = checkPasswordStrength(this.data.password);

    this.setData({
      confirmPassword,
      reqsMatch,
      formValid: strength.valid && reqsMatch
    });
  },

  onSubmitRegister: function (e) {
    const { username, realname, phone, idcard, password } = e.detail.value;
    const { departments, deptIndex, openid } = this.data;

    // Validate fields
    if (!username || !realname || !phone || !idcard || !password) {
      wx.showToast({
        title: '所有带*字段均为必填！',
        icon: 'none'
      });
      return;
    }

    if (deptIndex === -1) {
      wx.showToast({
        title: '请选择所属部门',
        icon: 'none'
      });
      return;
    }

    // Regex check matching backend
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '手机号码格式不正确！',
        icon: 'none'
      });
      return;
    }

    if (!/^\d{17}[\dXx]$/.test(idcard)) {
      wx.showToast({
        title: '身份证号格式不正确！',
        icon: 'none'
      });
      return;
    }

    request('/register', {
      method: 'POST',
      data: {
        username,
        password,
        real_name: realname,
        phone,
        id_card: idcard,
        department: departments[deptIndex],
        openid: openid || undefined // Optional binding OpenID
      },
      loadingText: '提交注册申请中...'
    }).then(res => {
      wx.showModal({
        title: '提交成功',
        content: res.message || '注册申请提交成功！请等待管理员审核。',
        showCancel: false,
        success: () => {
          // Go back to login
          wx.navigateTo({
            url: `/pages/login/login?openid=${openid}`
          });
        }
      });
    }).catch(err => {
      console.error("Register request failed", err);
    });
  },

  goToLogin: function () {
    wx.navigateTo({
      url: `/pages/login/login?openid=${this.data.openid}`
    });
  }
});
