import axios from 'axios';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

const extractBearerToken = (headers) => {
  if (!headers) return null;
  const raw =
    typeof headers.get === 'function'
      ? headers.get('Authorization') ?? headers.get('authorization')
      : headers.Authorization ?? headers.authorization;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) return null;
  return trimmed.slice(7).trim() || null;
};

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vognix_token');
    if (token) {
      if (typeof config.headers?.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to format errors and retry transient 401s once before session expiry
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const data = error.response?.data;
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isAuthEndpoint = requestUrl.includes('/auth/');
    const sentToken = extractBearerToken(error.config?.headers);
    const currentToken = localStorage.getItem('vognix_token');
    const matchesActiveSession = Boolean(sentToken && currentToken && sentToken === currentToken);

    // If a protected request received 401 with an active token, retry once before concluding the session is dead
    if (status === 401 && !isAuthEndpoint && matchesActiveSession && !error.config?._retry) {
      error.config._retry = true;
      try {
        await new Promise((r) => setTimeout(r, 600));
        return await api(error.config);
      } catch (retryErr) {
        // Fall through to error handler if retry also failed
      }
    }

    let message = null;

    if (data && typeof data === 'object') {
      if (data.fieldErrors && typeof data.fieldErrors === 'object') {
        const details = Object.values(data.fieldErrors).filter(Boolean);
        if (details.length > 0) {
          message = details.join('. ');
        }
      }
      if (!message) {
        message = data.message || data.error;
      }
    }

    if (status === 401 && !isAuthEndpoint && matchesActiveSession) {
      message = message || 'Your session expired or was reset on the server. Please sign in again.';
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('vognix:session-expired', { detail: { status, url: requestUrl, message } })
        );
      }
    }

    if (!message && (!error.response || status === 502 || status === 503 || status === 504 || (status === 500 && !data))) {
      message = 'Cannot connect to VOGNIX backend API. Please ensure the backend service is running.';
    }

    const formattedError = new Error(message || 'An unexpected error occurred. Please try again.');
    formattedError.status = status ?? 0;
    formattedError.isNetworkError = !error.response;
    formattedError.isTransient = !error.response || status === 502 || status === 503 || status === 504;
    formattedError.data = data;
    return Promise.reject(formattedError);
  }
);

// 1. Auth APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-password', data),
};

// 2. Address APIs
export const addressAPI = {
  getAddresses: () => api.get('/users/addresses'),
  addAddress: (data) => api.post('/users/addresses', data),
  updateAddress: (id, data) => api.put(`/users/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/users/addresses/${id}`),
  setDefault: (id) => api.put(`/users/addresses/${id}/default`),
};

// 3. Product APIs
export const productAPI = {
  getProducts: (params) => api.get('/products', { params }),
  getProductById: (id) => api.get(`/products/${id}`),
  getProductBySlug: (slug) => api.get(`/products/slug/${slug}`),
  getFeatured: () => api.get('/products/featured'),
  getCategories: () => api.get('/categories'),
  getBrands: () => api.get('/brands'),
  addReview: (productId, data) => api.post(`/products/${productId}/reviews`, data),
};

// 4. Cart APIs
export const cartAPI = {
  getCart: (couponCode) => api.get('/cart', { params: couponCode ? { couponCode } : undefined }),
  addItem: (data, couponCode) => api.post('/cart/items', data, { params: couponCode ? { couponCode } : undefined }),
  updateQuantity: (itemId, quantity, couponCode) =>
    api.put(`/cart/items/${itemId}`, { quantity }, { params: couponCode ? { couponCode } : undefined }),
  removeItem: (itemId, couponCode) =>
    api.delete(`/cart/items/${itemId}`, { params: couponCode ? { couponCode } : undefined }),
  applyCoupon: (couponCode) => api.post('/cart/apply-coupon', { couponCode }),
};

// 5. Wishlist APIs
export const wishlistAPI = {
  getWishlist: () => api.get('/wishlist'),
  toggleWishlist: (productId) => api.post(`/wishlist/${productId}`),
  removeItem: (productId) => api.delete(`/wishlist/${productId}`),
  moveToCart: (productId, variantId) => api.post(`/wishlist/${productId}/move-to-cart`, null, { params: { variantId } }),
};

// 6. Checkout & Order APIs
export const orderAPI = {
  validateCheckout: (data) => api.post('/checkout/validate', data),
  placeOrder: (data, idempotencyKey) =>
    api.post('/orders', data, {
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {},
    }),
  getOrders: (params) => api.get('/orders', { params }),
  getOrderById: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id, reason) => api.put(`/orders/${id}/cancel`, { reason }),
};

// 7. Payment APIs
export const paymentAPI = {
  getConfig: () => api.get('/payments/config'),
  createOrder: (data, idempotencyKey) =>
    api.post('/payments/create-order', data, {
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {},
    }),
  initiate: (data, idempotencyKey) =>
    api.post('/payments/initiate', data, {
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {},
    }),
  confirm: (data) => api.post('/payments/confirm', data),
  verify: (data) => api.post('/payments/verify', data),
  recordFailure: (data) => api.post('/payments/failure', data),
  getStatus: (paymentId, sync = false) =>
    api.get(`/payments/${paymentId}/status`, { params: sync ? { sync: true } : undefined }),
  retry: (paymentId) => api.post(`/payments/${paymentId}/retry`),
  getHistory: () => api.get('/payments'),
};

// 8. Admin APIs
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  getProducts: (params) => api.get('/admin/products', { params }),
  getAllOrders: (params) => api.get('/admin/orders', { params }),
  updateOrderStatus: (id, data) => api.put(`/admin/orders/${id}/status`, data),
  markCodPaymentCollected: (paymentId) => api.put(`/admin/payments/${paymentId}/cod-collected`),
  createProduct: (data) => api.post('/admin/products', data),
  updateProduct: (id, data) => api.put(`/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  updateStock: (variantId, stockQuantity) => api.put(`/admin/inventory/${variantId}`, { stockQuantity }),
  getCategories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  getBrands: () => api.get('/admin/brands'),
  createBrand: (data) => api.post('/admin/brands', data),
  updateBrand: (id, data) => api.put(`/admin/brands/${id}`, data),
  getCustomers: (params) => api.get('/admin/customers', { params }),
  createCustomer: (data) => api.post('/admin/customers', data),
  updateCustomerStatus: (id, isActive) => api.put(`/admin/customers/${id}/status`, { isActive }),
  updateCustomerRoles: (id, roles) => api.put(`/admin/customers/${id}/roles`, { roles }),
  resetCustomerPassword: (id, newPassword) => api.put(`/admin/customers/${id}/password`, { newPassword }),
  getReports: () => api.get('/admin/reports'),
  getCoupons: () => api.get('/admin/coupons'),
  createCoupon: (data) => api.post('/admin/coupons', data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

export default api;
