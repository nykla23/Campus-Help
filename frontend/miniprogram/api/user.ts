import { request } from '../utils/api';

// 注册
export function register(data: {
  username: string;
  password: string;
  confirmPassword: string;
  nickname?: string;
}) {
  return request('/users', 'POST', data, { noAuth: true });
}

// 登录
export function login(data: { username: string; password: string }) {
  return request('/auth/login', 'POST', data, { noAuth: true });
}
