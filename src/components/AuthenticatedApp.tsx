'use client';

import { useState, useEffect } from 'react';
import GamePage from '@/components/GamePage';
import EmailLogin from '@/components/EmailLogin';
import vorldAuthService, { UserProfile } from '@/libs/Vorld/authService';
import { ArenaGameService } from '@/services/arenaGameService';

export default function AuthenticatedApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userToken, setUserToken] = useState<string>('');
  const [arenaService, setArenaService] = useState<ArenaGameService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    setLoading(true);
    try {
      const isValid = await vorldAuthService.verifyToken();
      if (isValid) {
        const profile = vorldAuthService.getCurrentProfile();
        const token = vorldAuthService.getToken();
        
        if (profile && token) {
          setUserProfile(profile);
          setUserToken(token);
          setIsAuthenticated(true);
          
          // Initialize Arena Game Service
          const service = new ArenaGameService(token);
          setArenaService(service);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (profile: UserProfile, token: string) => {
    setUserProfile(profile);
    setUserToken(token);
    setIsAuthenticated(true);
    setError('');
    
    // Initialize Arena Game Service
    const service = new ArenaGameService(token);
    setArenaService(service);
  };

  const handleLoginError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleLogout = async () => {
    await vorldAuthService.logout();
    setIsAuthenticated(false);
    setUserProfile(null);
    setUserToken('');
    setArenaService(null);
    setError('');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🥊 Sticker Man Arena</h1>
          <p className="text-gray-400 text-lg">Multiplayer Fighting Game with Live Stream Integration</p>
        </div>
        
        {error && (
          <div className="mb-4 max-w-md w-full">
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          </div>
        )}
        
        <EmailLogin 
          onLoginSuccess={handleLoginSuccess}
          onError={handleLoginError}
        />
        
        <div className="mt-8 text-center max-w-md">
          <p className="text-gray-500 text-sm">
            Sign in with your Vorld account to access the multiplayer fighting arena and enable streaming integration.
          </p>
        </div>
      </div>
    );
  }

  // Authenticated - show game
  return (
    <div className="min-h-screen bg-gray-900">
      {/* User Info Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-white">🥊 Sticker Man Arena</h1>
            <div className="h-6 w-px bg-gray-600"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">{userProfile?.username}</p>
                <p className="text-gray-400 text-xs">{userProfile?.email}</p>
              </div>
            </div>
          </div>
          
         
        </div>
      </div>
      
      {/* Game Content */}
      <GamePage 
        userProfile={userProfile}
        userToken={userToken}
        arenaService={arenaService}
      />
    </div>
  );
}