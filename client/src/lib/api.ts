import { apiConfig, getApiUrl } from '../../../config/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = apiConfig.baseUrl;
    this.timeout = apiConfig.timeout;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    params?: Record<string, string>
  ): Promise<T> {
    const url = getApiUrl(endpoint, params);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      
      throw new Error('Network error');
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, params);
  }

  async post<T>(endpoint: string, data?: any, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, params);
  }

  async put<T>(endpoint: string, data?: any, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, params);
  }

  async patch<T>(endpoint: string, data?: any, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }, params);
  }

  async delete<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, params);
  }

  async upload<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    params?: Record<string, string>
  ): Promise<T> {
    const url = getApiUrl(endpoint, params);
    
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Upload timeout');
        }
        throw error;
      }
      
      throw new Error('Upload failed');
    }
  }

  // Method to download files (like CSV exports)
  async download(endpoint: string, filename?: string, params?: Record<string, string>): Promise<void> {
    const url = getApiUrl(endpoint, params);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      throw new Error('Download failed');
    }
  }
}

export const apiClient = new ApiClient();

// Export configured endpoint methods
export const api = {
  // Auth endpoints
  auth: {
    login: (data: { email: string; password: string }) => 
      apiClient.post(apiConfig.endpoints.auth.login, data),
    register: (data: { name: string; email: string; password: string; role: string }) => 
      apiClient.post(apiConfig.endpoints.auth.register, data),
  },

  // Groups endpoints
  groups: {
    list: () => apiClient.get(apiConfig.endpoints.groups.list),
    create: (data: { name: string }) => apiClient.post(apiConfig.endpoints.groups.create, data),
    getById: (id: string) => apiClient.get(apiConfig.endpoints.groups.getById, { id }),
    join: (data: { joinCode: string }) => apiClient.post(apiConfig.endpoints.groups.join, data),
    leave: (id: string) => apiClient.post(apiConfig.endpoints.groups.leave, {}, { id }),
    getMembers: (id: string) => apiClient.get(apiConfig.endpoints.groups.getMembers, { id }),
  },

  // Tasks endpoints
  tasks: {
    list: (groupId: string) => apiClient.get(apiConfig.endpoints.tasks.list, { groupId }),
    create: (groupId: string, data: any, file?: File) => {
      if (file) {
        return apiClient.upload(apiConfig.endpoints.tasks.create, file, data, { groupId });
      }
      return apiClient.post(apiConfig.endpoints.tasks.create, data, { groupId });
    },
    getById: (id: string) => apiClient.get(apiConfig.endpoints.tasks.getById, { id }),
    submit: (taskId: string, data: { textContent?: string }, file?: File) => {
      if (file) {
        return apiClient.upload(apiConfig.endpoints.tasks.submit, file, data, { taskId });
      }
      return apiClient.post(apiConfig.endpoints.tasks.submit, data, { taskId });
    },
    getSubmissions: (taskId: string) => apiClient.get(apiConfig.endpoints.tasks.getSubmissions, { taskId }),
    upcoming: () => apiClient.get(apiConfig.endpoints.tasks.upcoming),
    all: () => apiClient.get(apiConfig.endpoints.tasks.all),
  },

  // Submissions endpoints
  submissions: {
    all: () => apiClient.get(apiConfig.endpoints.submissions.all),
    pending: () => apiClient.get(apiConfig.endpoints.submissions.pending),
    updateScore: (id: string, score: number) => 
      apiClient.patch(apiConfig.endpoints.submissions.updateScore, { score }, { id }),
  },

  // Announcements endpoints
  announcements: {
    create: (data: { groupId: string; message: string }) => 
      apiClient.post(apiConfig.endpoints.announcements.create, data),
    getByGroup: (groupId: string) => apiClient.get(apiConfig.endpoints.announcements.getByGroup, { groupId }),
    all: () => apiClient.get(apiConfig.endpoints.announcements.all),
    markRead: (announcementId: string) => 
      apiClient.post(apiConfig.endpoints.announcements.markRead, {}, { announcementId }),
  },

  // Analytics endpoints
  analytics: {
    get: () => apiClient.get(apiConfig.endpoints.analytics.get),
    exportCSV: (groupId?: string) => {
      const endpoint = groupId ? `${apiConfig.endpoints.analytics.exportCSV}/${groupId}` : apiConfig.endpoints.analytics.exportCSV;
      return apiClient.download(endpoint, `grades-report${groupId ? `-${groupId}` : ''}.csv`);
    },
  },

  // Stats endpoint
  stats: () => apiClient.get(apiConfig.endpoints.stats),
};

export default api;