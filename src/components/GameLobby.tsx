'use client';

import React, { useState } from 'react';
import gameSocketService from '@/services/gameSocket';

interface GameLobbyProps {
  onRoomJoined: (roomId: string) => void;
  onError: (error: string) => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({ onRoomJoined, onError }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      onError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setIsCreating(true);

    try {
      // Connect to socket first
      await gameSocketService.connect();
      
      // Create room
      const newRoomId = await gameSocketService.createRoom();
      
      // Join the created room
      await gameSocketService.joinRoom(newRoomId, playerName.trim());
      
      onRoomJoined(newRoomId);
    } catch (error) {
      console.error('Failed to create room:', error);
      onError(error instanceof Error ? error.message : 'Failed to create room');
    } finally {
      setIsLoading(false);
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      onError('Please enter your name');
      return;
    }

    if (!roomId.trim()) {
      onError('Please enter a room ID');
      return;
    }

    setIsLoading(true);
    setIsJoining(true);

    try {
      // Connect to socket first
      await gameSocketService.connect();
      
      // Join the room
      await gameSocketService.joinRoom(roomId.trim().toUpperCase(), playerName.trim());
      
      onRoomJoined(roomId.trim().toUpperCase());
    } catch (error) {
      console.error('Failed to join room:', error);
      onError(error instanceof Error ? error.message : 'Failed to join room');
    } finally {
      setIsLoading(false);
      setIsJoining(false);
    }
  };

  const generateRandomName = () => {
    const adjectives = ['Swift', 'Mighty', 'Brave', 'Fierce', 'Lightning', 'Shadow', 'Fire', 'Ice', 'Storm', 'Steel'];
    const nouns = ['Fighter', 'Warrior', 'Champion', 'Hero', 'Legend', 'Master', 'Knight', 'Ninja', 'Samurai', 'Gladiator'];
    
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    
    setPlayerName(`${randomAdjective}${randomNoun}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Game Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🥊 Sticker Fight</h1>
          <p className="text-gray-600">Epic sticker man battles await!</p>
        </div>

        {/* Player Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fighter Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your fighter name"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={20}
              disabled={isLoading}
            />
            <button
              onClick={generateRandomName}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              disabled={isLoading}
            >
              🎲
            </button>
          </div>
        </div>

        {/* Create Room Section */}
        <div className="mb-6">
          <button
            onClick={handleCreateRoom}
            disabled={isLoading || !playerName.trim()}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
          >
            {isCreating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                Creating Room...
              </div>
            ) : (
              '🆕 Create New Room'
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="text-gray-500 text-sm">OR</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        {/* Join Room Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Room ID
          </label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="Enter room ID (e.g., ABC123)"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
            maxLength={10}
            disabled={isLoading}
          />
          <button
            onClick={handleJoinRoom}
            disabled={isLoading || !playerName.trim() || !roomId.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
          >
            {isJoining ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                Joining Room...
              </div>
            ) : (
              '🚀 Join Room'
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">How to Play:</h3>
          <ul className="space-y-1 text-xs">
            <li>• Create a room and share the code with a friend</li>
            <li>• Use WASD or Arrow Keys to move</li>
            <li>• Press SPACE to attack</li>
            <li>• Reduce opponent's health to 0 to win!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;