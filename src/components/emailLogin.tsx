"use client";

import { useState } from "react";
import vorldAuthService, { UserProfile } from "@/libs/Vorld/authService";

interface EmailLoginProps {
  onLoginSuccess: (profile: UserProfile, token: string) => void;
  onError: (error: string) => void;
}

export default function EmailLogin({
  onLoginSuccess,
  onError,
}: EmailLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await vorldAuthService.loginWithEmail(email, password);
      console.log("🚀 ~ handleLogin ~ result:", result);

      if (result.success) {
        setUsername(result.data!.user.username);
        
        // Call the success callback to transition to game
        const profile: UserProfile = {
          email: result.data!.user.email,
          username: result.data!.user.username,
          verified: result.data!.user.verified
        };
        
        onLoginSuccess(profile, result.data!.accessToken);
      } else {
        onError(result.error || "Login failed");
      }
    } catch (error) {
      onError("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-gray-800 rounded-lg shadow-lg">
      <form onSubmit={handleLogin}>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Login to Vorld</h2>
          <p className="text-gray-400 text-sm">
            Authenticate to access the fighting arena
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="Enter your email"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-300 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="Enter your password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Logging in...
            </div>
          ) : (
            "Login"
          )}
        </button>
      </form>
    </div>
  );
}
