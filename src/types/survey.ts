export type QuestionType =
  | 'single'
  | 'multi'
  | 'rating'
  | 'dropdown'
  | 'yesno'
  | 'text';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  required: boolean;
  options?: string[];
  minRating?: number;
  maxRating?: number;
  minLabel?: string;
  maxLabel?: string;
  placeholder?: string;
  characterLimit?: number;
}

export interface Survey {
  id: string;
  title: string;
  slug: string;
  status: 'published' | 'draft' | 'closed';
  responsesCount: number;
  completionRate: number;
  editedAt: string;
  welcomeMessage: string;
  anonymousResponses: boolean;
  showProgressBar: boolean;
  randomizeOrder: boolean;
  oneResponsePerUser: boolean;
  iconName: string;
  questions: Question[];
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Researcher' | 'Standard User';
  status: 'Active' | 'Suspended';
  surveysCount: number;
  responsesCount: number;
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  avatarInitials: string;
}

export interface AuditLogItem {
  id: string;
  eventType: 'ROLE_CHANGED' | 'SURVEY_PURGED' | 'SESSION_REGENERATED' | 'SQLITE_BACKUP_COMPLETED' | 'ACCOUNT_LOCKED';
  timeAgo: string;
  description: string;
  actor: string;
  ipOrDetail: string;
}

export interface ActivityStreamItem {
  id: string;
  type: 'response' | 'publish' | 'download' | 'share';
  title: string;
  surveyTitle: string;
  timestamp: string;
  meta: string;
}
