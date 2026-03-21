import { API_BASE_URL } from './config';

// 新增：登录跳转锁，防止重复跳转
let isNavigatingToLogin = false;

// 获取存储的token
const getToken = () => {
    return wx.getStorageSync('token') || '';
};

// 封装请求方法
const request = (url, method, data, needAuth = true) => {
    // 显示加载提示
    wx.showLoading({
        title: '加载中...',
        mask: true // 防止点击穿透
    });

    return new Promise((resolve, reject) => {
        const header = {};
        // 鉴权逻辑：需要鉴权但无token时，直接拒绝并跳转登录
        if (needAuth) {
            const token = getToken();
            if (!token) {
                wx.hideLoading();
                // 加锁：避免重复跳转
                if (!isNavigatingToLogin) {
                    isNavigatingToLogin = true;
                    wx.navigateTo({
                        url: '/pages/login/login',
                        complete: () => {
                            isNavigatingToLogin = false; // 跳转完成后解锁
                        }
                    });
                }
                reject(new Error('未登录，请先登录'));
                return; // 终止后续逻辑
            }
            header['Authorization'] = `Bearer ${token}`;
        }

        wx.request({
            url: `${API_BASE_URL}${url}`,
            method: method,
            data: data,
            header: header,
            timeout: 10000, // 新增：设置10秒超时
            success: (res) => {
                // 处理成功状态码：200-299都视为成功
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(res.data);
                } else {
                    // 统一处理常见错误状态码
                    if (res.statusCode === 401) {
                        // token过期/无效，清除token并跳转登录
                        wx.removeStorageSync('token');
                        wx.showToast({
                            title: '登录已过期，请重新登录',
                            icon: 'none'
                        });
                        // 加锁：避免重复跳转
                        if (!isNavigatingToLogin) {
                            isNavigatingToLogin = true;
                            wx.navigateTo({
                                url: '/pages/login/login',
                                complete: () => {
                                    isNavigatingToLogin = false;
                                }
                            });
                        }
                    } else if (res.statusCode === 500) {
                        wx.showToast({
                            title: '服务器错误，请稍后重试',
                            icon: 'none'
                        });
                    }
                    reject(res);
                }
            },
            fail: (err) => {
                // 网络错误提示
                wx.showToast({
                    title: '网络异常，请检查网络',
                    icon: 'none'
                });
                reject(err);
            },
            complete: () => {
                // 无论成功/失败，都隐藏加载提示
                wx.hideLoading();
            }
        });
    });
};

export default {
    get: (url, data, needAuth = true) => request(url, 'GET', data, needAuth),
    post: (url, data, needAuth = true) => request(url, 'POST', data, needAuth),
    put: (url, data, needAuth = true) => request(url, 'PUT', data, needAuth),
    del: (url, data, needAuth = true) => request(url, 'DELETE', data, needAuth)
};