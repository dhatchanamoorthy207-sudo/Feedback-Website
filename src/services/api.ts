import { Survey, Question, UserAccount, AuditLogItem } from '../types/survey';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  mustChangePassword: boolean;
}

const API_BASE = '/api';

function getStoredToken(): string | null {
  return localStorage.getItem('pf_jwt_token');
}

function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem('pf_jwt_token', token);
  } else {
    localStorage.removeItem('pf_jwt_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    async register(name: string, email: string, password: string): Promise<{ user: UserSession; token: string }> {
      const data = await request<{ user: UserSession; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setStoredToken(data.token);
      return data;
    },

    async login(email: string, password: string): Promise<{ user: UserSession; token: string }> {
      const data = await request<{ user: UserSession; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setStoredToken(data.token);
      return data;
    },

    async changePassword(newPassword: string, currentPassword?: string): Promise<{ user: UserSession; token: string }> {
      const data = await request<{ user: UserSession; token: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword, currentPassword }),
      });
      setStoredToken(data.token);
      return data;
    },

    async logout(): Promise<void> {
      try {
        await request('/auth/logout', { method: 'POST' });
      } catch (e) {
        // Ignore network errors on logout
      }
      setStoredToken(null);
    },

    async getMe(): Promise<UserSession | null> {
      const token = getStoredToken();
      if (!token) return null;
      try {
        const data = await request<{ user: UserSession }>('/auth/me');
        return data.user;
      } catch (err) {
        setStoredToken(null);
        return null;
      }
    },
  },

  // Surveys
  surveys: {
    async getAll(): Promise<Survey[]> {
      const data = await request<{ surveys: Survey[] }>('/surveys');
      return data.surveys;
    },

    async create(survey: Partial<Survey>): Promise<Survey> {
      const data = await request<{ survey: Survey }>('/surveys', {
        method: 'POST',
        body: JSON.stringify(survey),
      });
      return data.survey;
    },

    async update(id: string, survey: Partial<Survey>): Promise<void> {
      await request(`/surveys/${id}`, {
        method: 'PUT',
        body: JSON.stringify(survey),
      });
    },

    async delete(id: string): Promise<void> {
      await request(`/surveys/${id}`, {
        method: 'DELETE',
      });
    },

    async getAnalytics(id: string): Promise<any> {
      return await request(`/surveys/${id}/analytics`);
    },
  },

  // Public Participation
  publicSurveys: {
    async getBySlug(slug: string): Promise<Survey> {
      const data = await request<{ survey: Survey }>(`/public/surveys/${slug}`);
      return data.survey;
    },

    async submit(slug: string, answers: Record<string, any>, respondentId?: string): Promise<{ responseId: string; message: string }> {
      return await request<{ responseId: string; message: string }>(`/public/surveys/${slug}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers, respondentId }),
      });
    },
  },

  // Administrator Portal
  admin: {
    async getOverview(): Promise<{
      totalUsers: number;
      totalSurveys: number;
      totalResponses: number;
      surveyStats: any[];
      system: any;
    }> {
      return await request('/admin/overview');
    },

    async getUsers(): Promise<UserAccount[]> {
      const data = await request<{ users: any[] }>('/admin/users');
      return data.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role === 'admin' ? 'Super Admin' : 'Standard User',
        status: 'Active',
        surveysCount: u.surveysCount,
        responsesCount: u.responsesCount,
        twoFactorEnabled: true,
        twoFactorMethod: 'TOTP Enforced',
        avatarInitials: u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'US',
      }));
    },

    async updateUserRole(id: string, role: 'admin' | 'user'): Promise<void> {
      await request(`/admin/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
    },

    async getAuditLogs(): Promise<AuditLogItem[]> {
      const data = await request<{ auditLogs: any[] }>('/admin/audit-logs');
      return data.auditLogs.map((l) => ({
        id: l.id,
        eventType: l.event_type,
        timeAgo: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        description: l.description,
        actor: l.user_id ? 'Authenticated User' : 'System',
        ipOrDetail: `IP: ${l.ip_address}`,
      }));
    },

    async resetResponses(): Promise<{
      message: string;
      backupFile: string;
      deletedResponsesCount: number;
      deletedAnswersCount: number;
    }> {
      return await request('/admin/reset-responses', {
        method: 'POST',
      });
    },
  },
};
