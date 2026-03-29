import { request } from '../utils/api';

// 注册
export function register(data: {
  username: string;
  password: string;
  confirmPassword: string;
  nickname?: string;
  avatar?: string;
  signature?: string;
}) {
  return request('/users', 'POST', data, { noAuth: true });
}

// 登录
export function login(data: { username: string; password: string }) {
  return request('/auth/login', 'POST', data, { noAuth: true });
}

// 获取个人信息
export function getProfile() {
  return request('/users/profile', 'GET');
}

// 更新个人信息
export function updateProfile(data: { nickname?: string; avatar?: string; signature?: string }) {
  return request('/users/profile', 'PUT', data);
}

// 修改密码
export function changePassword(data: { oldPassword: string; newPassword: string }) {
  return request('/users/password', 'PUT', data);
}