'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArenaGameService,
  GameState,
  BoostData
} from '@/services/arenaGameService';

type BoostHistoryEntry = BoostData & { timestamp?: string };

interface BoostSystemProps {
  gameService: ArenaGameService;
  gameState: GameState;
  boostHistory: BoostHistoryEntry[];
  onBoostSuccess: (data: BoostData) => void;
}

const BOOST_AMOUNTS = [25, 50, 100, 200, 500];

export const BoostSystem: React.FC<BoostSystemProps> = ({
  gameService,
  gameState,
  boostHistory,
  onBoostSuccess
}) => {
  const players = useMemo(
    () => gameState?.evaGameDetails?.players ?? [],
    [gameState]
  );
  
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [boostAmount, setBoostAmount] = useState<number>(BOOST_AMOUNTS[1]);
  const [boosterUsername, setBoosterUsername] = useState<string>('');
  const [isBoosting, setIsBoosting] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    if (!selectedPlayer && players.length > 0) {
      setSelectedPlayer(players[0].id);
    }
  }, [players, selectedPlayer]);

  const handleBoostPlayer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!selectedPlayer || !boosterUsername.trim()) {
      setError('Please select a player and enter the booster username.');
      return;
    }

    if (!gameState?.gameId) {
      setError('Arena game is not initialized yet.');
      return;
    }

    try {
      setIsBoosting(true);
      const response = await gameService.boostPlayer(
        gameState.gameId,
        selectedPlayer,
        boostAmount,
        boosterUsername.trim()
      );

      if (response.success && response.data) {
        onBoostSuccess(response.data);
        setSuccessMessage(
          `${response.data.playerName} boosted by +${response.data.boostAmount} points!`
        );
        setBoosterUsername('');
      } else {
        setError(response.error || 'Failed to boost player.');
      }
    } catch (err) {
      console.error('Boost failed:', err);
      setError('Unexpected error while boosting player.');
    } finally {
      setIsBoosting(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          ⚡ Player Boost System
        </h2>
        <span className="px-3 py-1 text-xs rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/50">
          Cycle: {gameState?.evaGameDetails?.numberOfCycles ?? '—'}
        </span>
      </div>

      <form onSubmit={handleBoostPlayer} className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-gray-300">Select Player</span>
          <select
            value={selectedPlayer}
            onChange={(event) => setSelectedPlayer(event.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Choose a player</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-gray-300">Boost Amount</span>
          <select
            value={boostAmount}
            onChange={(event) => setBoostAmount(Number(event.target.value))}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {BOOST_AMOUNTS.map((amount) => (
              <option key={amount} value={amount}>
                {amount} points ({amount} coins)
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-gray-300">Booster Username</span>
          <input
            type="text"
            value={boosterUsername}
            onChange={(event) => setBoosterUsername(event.target.value)}
            placeholder="Enter viewer username"
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </label>

        <div className="md:col-span-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={isBoosting || !selectedPlayer}
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/60 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {isBoosting ? 'Processing...' : `Boost Player (+${boostAmount})`}
          </button>
          {successMessage && (
            <span className="text-sm text-green-400">{successMessage}</span>
          )}
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">Recent Boosts</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {boostHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No boosts yet. Be the first to support a player!
              </p>
            ) : (
              boostHistory.map((boost, index) => (
                <div
                  key={`${boost.playerId}-${boost.timestamp}-${index}`}
                  className="bg-gray-800/60 border border-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{boost.playerName}</span>
                    <span className="text-green-400 font-semibold">
                      +{boost.boostAmount}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p>Booster: {boost.boosterUsername || 'Anonymous'}</p>
                    <p>Total Points: {boost.playerTotalPoints}</p>
                    <p>Coins Spent: {boost.arenaCoinsSpent}</p>
                  </div>
                  {boost.timestamp && (
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(boost.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-purple-300 mb-3">
            Registered Players
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {players.map((player) => (
              <div
                key={player.id}
                className="bg-gray-800/60 border border-gray-700 rounded-lg p-3"
              >
                <p className="text-white font-medium">{player.name}</p>
                <p className="text-xs text-gray-400 mt-1 break-all">
                  ID: {player.id}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Joined: {new Date(player.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {players.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No players registered for this arena game yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoostSystem;
