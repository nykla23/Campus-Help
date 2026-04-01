import { request } from '../utils/api';

export function publishTask(data: {
  title: string;
  description: string;
  reward: number;
  location?: string;
  type?: number;
  deadline?: string;
}) {
  return request('/tasks', 'POST', data);
}

export function getTaskList(params: {
  page?: number;
  limit?: number;
  status?: number;
  type?: number;
  sort?: string;
  // publisher_id?: number;
  // acceptor_id?: number;
}) {
  return request('/tasks', 'GET', params);
}

export function getTaskDetail(taskId: number) {
  return request(`/tasks/${taskId}`, 'GET');
}

export function acceptTask(taskId: number) {
  return request(`/tasks/${taskId}/accept`, 'POST');
}

export function completeTask(taskId: number) {
  return request(`/tasks/${taskId}/complete`, 'POST');
}

export function cancelTask(taskId: number) {
  return request(`/tasks/${taskId}/cancel`, 'POST');
}