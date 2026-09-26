export type UserRole = 'PLAYER' | 'CREATOR' | 'ADMIN';

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
};
