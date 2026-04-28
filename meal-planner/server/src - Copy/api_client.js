// services/api.js
const raw = import.meta.env.VITE_API_BASE_URL;
const base = raw.replace(/\/+$/, '');
const API_BASE_URL = base.endsWith('/api') ? base : `${base}/api`;


class ApiService {
  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };
    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        // Attempt to parse error
        let errText = `HTTP error! status: ${response.status}`;
        try {
          const body = await response.json();
          if (body?.error) errText = body.error;
          if (body?.message) errText = body.message;
        } catch { /* empty */ }
        throw new Error(errText);
      }
      // No content
      if (response.status === 204) return null;
      return response.json();
    } catch (error) {
      console.error(`API request to ${url} failed:`, error);
      throw error;
    }
  }

  // --- users ---
  async createUser(payload) {
    return this.request('/user', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateUser(userId, userData) {
    return this.request(`/user/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId) {
    return this.request(`/user/${userId}`, {
      method: 'DELETE',
    });
  }

  // Auth endpoints
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // --- ingredients ---
  async getUserIngredients(userId) {
    return this.request(`/user/${userId}/ingredients`, { method: 'GET' });
  }

  async createIngredient(userId, ingredient) {
    return this.request(`/user/${userId}/ingredients`, {
      method: 'POST',
      body: JSON.stringify(ingredient),
    });
  }

  // partial update (qty/unit)
  async updateIngredient(ingredientId, partial) {
    // server route is non-scoped: /api/ingredients/:id
    return this.request(`/ingredients/${ingredientId}`, {
      method: 'PATCH',
      body: JSON.stringify(partial),
    });
  }


  async deleteIngredient(userId, ingredientId) {
    return this.request(`/user/${userId}/ingredients/${ingredientId}`, {
      method: 'DELETE',
    });
  }

  // --- meal plan generation / accept ---
  async generateMealPlan(payload) {
    return this.request('/meal-plans/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async acceptMealPlan(payload) {
    return this.request('/meal-plans/accept', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // add this new method
  async getUserMealPlans(userId, status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/user/${userId}/meal-plans${q}`, { method: 'GET' });
  }

  // fix this existing method to hit the correct endpoint
  async listFavoritePlans(userId) {
    return this.request(`/user/${userId}/favorites`, { method: 'GET' });
  }

  async favoriteMealPlan(userId, planId) {
    return this.request(`/meal-plans/${planId}/favorite`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async unfavoriteMealPlan(userId, planId) {
    // server uses query param for userId on DELETE
    return this.request(`/meal-plans/${planId}/favorite?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
  }

  // --- receipts ---
  async parseReceipt(file) {
    const fd = new FormData();
    fd.append('file', file);
    const resp = await fetch(`${API_BASE_URL}/receipts/parse`, {
      method: 'POST',
      body: fd
    });
    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
    return resp.json();
  }

  // bulk create ingredients
  async bulkCreateIngredients(userId, items) {
    return this.request(`/user/${userId}/ingredients/bulk`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }
}

// Export a single instance
export const apiService = new ApiService();
