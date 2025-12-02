export interface APIConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  endpoints: {
    auth: {
      login: string;
      register: string;
    };
    groups: {
      list: string;
      create: string;
      getById: string;
      join: string;
      leave: string;
      getMembers: string;
    };
    tasks: {
      list: string;
      create: string;
      getById: string;
      submit: string;
      getSubmissions: string;
      upcoming: string;
      all: string;
    };
    submissions: {
      all: string;
      pending: string;
      updateScore: string;
    };
    announcements: {
      create: string;
      getByGroup: string;
      all: string;
      markRead: string;
    };
    analytics: {
      get: string;
      exportCSV: string;
    };
    stats: string;
    uploads: string;
  };
}

const getAPIConfig = (): APIConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  // Determine base URL based on environment
  let baseUrl = process.env.REACT_APP_API_URL || process.env.VITE_API_URL || 'http://localhost:5000';
  
  if (env === 'production' && !baseUrl) {
    // In production, use the same origin or configured production URL
    baseUrl = window.location.origin;
  }

  const config: APIConfig = {
    baseUrl,
    timeout: parseInt(process.env.API_TIMEOUT || '10000'),
    retries: parseInt(process.env.API_RETRIES || '3'),
    
    endpoints: {
      auth: {
        login: '/api/auth/login',
        register: '/api/auth/register',
      },
      groups: {
        list: '/api/groups',
        create: '/api/groups',
        getById: '/api/groups/:id',
        join: '/api/groups/join',
        leave: '/api/groups/:id/leave',
        getMembers: '/api/groups/:id/members',
      },
      tasks: {
        list: '/api/groups/:groupId/tasks',
        create: '/api/groups/:groupId/tasks',
        getById: '/api/tasks/:id',
        submit: '/api/tasks/:taskId/submit',
        getSubmissions: '/api/tasks/:taskId/submissions',
        upcoming: '/api/tasks/upcoming',
        all: '/api/tasks/all',
      },
      submissions: {
        all: '/api/submissions/all',
        pending: '/api/submissions/pending',
        updateScore: '/api/submissions/:id/score',
      },
      announcements: {
        create: '/api/announcements',
        getByGroup: '/api/announcements/:groupId',
        all: '/api/announcements/all',
        markRead: '/api/announcements/:announcementId/read',
      },
      analytics: {
        get: '/api/analytics',
        exportCSV: '/api/analytics/export-csv',
      },
      stats: '/api/stats',
      uploads: '/uploads',
    },
  };

  return config;
};

export const apiConfig = getAPIConfig();

// Helper function to build URLs
export const buildUrl = (endpoint: string, params?: Record<string, string>): string => {
  let url = endpoint;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, encodeURIComponent(value));
    });
  }
  
  return url;
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string, params?: Record<string, string>): string => {
  const builtUrl = buildUrl(endpoint, params);
  return `${apiConfig.baseUrl}${builtUrl}`;
};

export default apiConfig;