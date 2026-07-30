import axios from 'axios';

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${hostname}:4000/api/v1`;
  }
  return 'http://localhost:4000/api/v1';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject active company/tenant ID
api.interceptors.request.use((config) => {
  const activeCompanyId = localStorage.getItem('activeCompanyId') || '11111111-1111-1111-1111-111111111111';
  config.headers['x-company-id'] = activeCompanyId;
  return config;
});

export default api;
