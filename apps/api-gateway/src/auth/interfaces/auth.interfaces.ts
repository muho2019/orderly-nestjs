export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
}
