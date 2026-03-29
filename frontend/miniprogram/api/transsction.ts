import { request } from '../utils/api';

export function getTransactionList(params: { page?: number; limit?: number }) {
  return request('/transactions', 'GET', params);
}