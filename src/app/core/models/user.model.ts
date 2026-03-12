export interface UserProfile {
  address: string;
  nickname: string | null;
  displayPreference: 'nickname' | 'address';
  avatarUrl: string | null;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export interface NonceResponse {
  nonce: string;
}
