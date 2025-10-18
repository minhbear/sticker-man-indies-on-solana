import { sha256 } from '@/utils';
import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_AUTH_SERVER_URL;
const VORLD_APP_ID = process.env.NEXT_PUBLIC_VORLD_APP_ID;

export class VorldAuthService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'x-vorld-app-id': VORLD_APP_ID,
    },
    withCredentials: true,
  });

  // Email/Password Authentication
  async loginWithEmail(email: string, password: string) {
    try {
      // Hash password with SHA-256 before sending to backend
      const hashedPassword = sha256(password);
      
      const response = await this.api.post('/auth/login', {
        email,
        password: hashedPassword
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed'
      };
    }
  }



  // Get User Profile
  async getProfile() {
    try {
      const response = await this.api.get('/user/profile');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get profile'
      };
    }
  }
}