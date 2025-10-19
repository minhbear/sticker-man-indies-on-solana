import axios from "axios";
import Cookies from "js-cookie";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_SERVER_URL ||
  "https://vorld-auth.onrender.com/api";
const VORLD_APP_ID = process.env.NEXT_PUBLIC_VORLD_APP_ID || "";

// SHA-256 hash function for password
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

export interface UserProfile {
  email: string;
  username: string;
  verified: boolean;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: UserProfile;
  };
  error?: string;
}

export class VorldAuthService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      "x-vorld-app-id": VORLD_APP_ID,
    },
    withCredentials: true,
  });

  private userToken: string = "";
  private userProfile: UserProfile | null = null;

  constructor() {
    // Try to load existing token from cookies
    this.userToken = Cookies.get("vorld_token") || "";
  }

  // Email/Password Authentication
  async loginWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      // Hash password with SHA-256 before sending to backend
      const hashedPassword = await sha256(password);

      const response = await this.api.post("/auth/login", {
        email,
        password: hashedPassword,
      });

      if (response.data.success && response.data.data.token) {
        this.userToken = response.data.data.token;
        Cookies.set("vorld_token", this.userToken, { expires: 7 }); // 7 days

        // Get user profile after successful login
        const profileResult = await this.getProfile();
        if (profileResult.success) {
          this.userProfile = profileResult.data?.user || null;
        }
      }

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    }
  }

  // OTP Verification
  async verifyOTP(email: string, otp: string): Promise<AuthResponse> {
    try {
      const response = await this.api.post("/auth/verify-otp", {
        email,
        otp,
      });

      if (response.data.success && response.data.data.token) {
        this.userToken = response.data.data.token;
        Cookies.set("vorld_token", this.userToken, { expires: 7 });

        // Get user profile after successful OTP verification
        const profileResult = await this.getProfile();
        if (profileResult.success) {
          this.userProfile = profileResult.data?.user || null;
        }
      }

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "OTP verification failed",
      };
    }
  }

  // Get User Profile
  async getProfile(): Promise<AuthResponse> {
    try {
      if (!this.userToken) {
        return {
          success: false,
          error: "No authentication token",
        };
      }

      const response = await this.api.get("/user/profile", {
        headers: {
          Authorization: `Bearer ${this.userToken}`,
        },
      });

      if (response.data.success) {
        this.userProfile = response.data.data.profile;
      }

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to get profile",
      };
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      if (this.userToken) {
        await this.api.post(
          "/auth/logout",
          {},
          {
            headers: {
              Authorization: `Bearer ${this.userToken}`,
            },
          }
        );
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.userToken = "";
      this.userProfile = null;
      Cookies.remove("vorld_token");
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.userToken;
  }

  // Get current user token
  getToken(): string {
    return this.userToken;
  }

  // Get current user profile
  getCurrentProfile(): UserProfile | null {
    return this.userProfile;
  }

  // Verify token validity
  async verifyToken(): Promise<boolean> {
    if (!this.userToken) return false;

    try {
      const response = await this.getProfile();
      return response.success;
    } catch {
      return false;
    }
  }
}

// Create singleton instance
const vorldAuthService = new VorldAuthService();
export default vorldAuthService;
