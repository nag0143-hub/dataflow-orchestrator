const API_BASE = '/api';

function createEntityProxy(entityName) {
  const entityUrl = `${API_BASE}/entities/${entityName}`;

  return {
    async list(sort, limit, skip) {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', String(limit));
      if (skip) params.set('skip', String(skip));
      const url = `${entityUrl}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to list ${entityName}: ${res.status}`);
      return res.json();
    },

    async filter(query, sort, limit, skip) {
      const res = await fetch(`${entityUrl}/filter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sort, limit, skip })
      });
      if (!res.ok) throw new Error(`Failed to filter ${entityName}: ${res.status}`);
      return res.json();
    },

    async get(id) {
      const res = await fetch(`${entityUrl}/${id}`);
      if (!res.ok) throw new Error(`Failed to get ${entityName}/${id}: ${res.status}`);
      return res.json();
    },

    async read(id) {
      return this.get(id);
    },

    async create(data) {
      const res = await fetch(entityUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(`Failed to create ${entityName}: ${res.status}`);
      return res.json();
    },

    async update(id, data) {
      const res = await fetch(`${entityUrl}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(`Failed to update ${entityName}/${id}: ${res.status}`);
      return res.json();
    },

    async delete(id) {
      const res = await fetch(`${entityUrl}/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`Failed to delete ${entityName}/${id}: ${res.status}`);
      return res.json();
    },

    async bulkCreate(items) {
      try {
        const res = await fetch(`${entityUrl}/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items })
        });
        if (!res.ok) throw new Error(`Batch create failed: ${res.status}`);
        return res.json();
      } catch (err) {
        const results = [];
        for (const item of items) {
          results.push(await this.create(item));
        }
        return results;
      }
    },

    async listWithCursor(cursor, limit) {
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', String(cursor));
      if (limit) params.set('limit', String(limit));
      const url = `${entityUrl}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to list ${entityName} with cursor: ${res.status}`);
      return res.json();
    },

    async deleteMany(query) {
      const items = await this.filter(query);
      for (const item of items) {
        await this.delete(item.id);
      }
      return { deleted: items.length };
    },

    subscribe(callback) {
      return () => {};
    },

    importEntities() {
      console.warn('importEntities not supported in local mode');
    }
  };
}

export function createClient() {
  const entitiesCache = {};

  const entities = new Proxy({}, {
    get(target, entityName) {
      if (typeof entityName !== 'string') return undefined;
      if (!entitiesCache[entityName]) {
        entitiesCache[entityName] = createEntityProxy(entityName);
      }
      return entitiesCache[entityName];
    }
  });

  const auth = {
    async me() {
      const res = await fetch(`${API_BASE}/auth/me`);
      if (!res.ok) throw new Error('Auth failed');
      return res.json();
    },
    async logout() {
      return { success: true };
    },
    redirectToLogin() {
      console.log('Login redirect not needed in local mode');
    },
    async loginViaEmailPassword() {
      return auth.me();
    },
    async updateMe() {
      return auth.me();
    },
    async register() {
      return auth.me();
    },
    async inviteUser() {
      return { success: true };
    },
    async resetPasswordRequest() {
      return { success: true };
    },
    async verifyOtp() {
      return { success: true };
    }
  };

  const functions = {
    async invoke(functionName, data) {
      const res = await fetch(`${API_BASE}/functions/${functionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {})
      });
      if (!res.ok) throw new Error(`Function ${functionName} failed: ${res.status}`);
      return res.json();
    }
  };

  const integrations = {
    Core: {
      async UploadFile(file) {
        return { url: URL.createObjectURL(file), name: file.name };
      },
      async UploadPrivateFile(file) {
        return { url: URL.createObjectURL(file), name: file.name };
      },
      async ExtractDataFromUploadedFile() {
        return { data: [] };
      },
      async InvokeLLM() {
        return { text: 'LLM not configured in local mode' };
      },
      async GenerateImage() {
        return { url: '' };
      },
      async SendEmail() {
        return { success: true };
      }
    },
    custom: {
      async call() {
        return {};
      }
    }
  };

  const appLogs = {
    logUserInApp() { return Promise.resolve(); }
  };

  const analytics = {
    track() {},
    identify() {}
  };

  const agents = {
    async createConversation() { return { id: '1' }; },
    async addMessage() { return { text: '' }; },
    async getConversation() { return { id: '1', messages: [] }; },
    async listConversations() { return []; },
    subscribeToConversation() { return () => {}; }
  };

  const client = {
    entities,
    auth,
    functions,
    integrations,
    agents,
    analytics,
    appLogs,
    setToken() {},
    cleanup() {},
    get asServiceRole() {
      return client;
    }
  };

  return client;
}

export function createClientFromRequest() {
  return createClient();
}
