'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArenaGameService,
  GameState,
  ItemDrop
} from '@/services/arenaGameService';

interface ItemDropSystemProps {
  gameService: ArenaGameService;
  gameState: GameState;
  dropHistory: Array<ItemDrop & { newBalance?: number }>;
  onItemDropSuccess: (data: ItemDrop & { newBalance?: number }) => void;
}

interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  cost: number;
  type?: string;
  image?: string;
}

export const ItemDropSystem: React.FC<ItemDropSystemProps> = ({
  gameService,
  gameState,
  dropHistory,
  onItemDropSuccess
}) => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [targetPlayer, setTargetPlayer] = useState<string>('');
  const [isDropping, setIsDropping] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const players = useMemo(() => gameState.evaGameDetails.players || [], [gameState]);

  useEffect(() => {
    if (players.length > 0 && !targetPlayer) {
      setTargetPlayer(players[0].id);
    }
  }, [players, targetPlayer]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const result = await gameService.getItemsCatalog();
        if (result.success && result.data?.items) {
          setItems(result.data.items);
        }
      } catch (err) {
        console.error('Failed to fetch items catalog:', err);
        setError('Unable to load item catalog.');
      }
    };

    fetchItems();
  }, [gameService]);

  const handleDropItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!selectedItem || !targetPlayer) {
      setError('Please select an item and player.');
      return;
    }

    try {
      setIsDropping(true);
      const response = await gameService.dropImmediateItem(
        gameState.gameId,
        selectedItem,
        targetPlayer
      );

      if (response.success && response.data) {
        onItemDropSuccess(response.data);
        setSuccessMessage(`Dropped ${response.data.itemName} successfully!`);
        setSelectedItem('');
      } else {
        setError(response.error || 'Failed to drop item.');
      }
    } catch (err) {
      console.error('Item drop failed:', err);
      setError('Unexpected error while dropping item.');
    } finally {
      setIsDropping(false);
    }
  };

  const describeItem = (itemId: string) => {
    const item = items.find((entry) => entry.id === itemId);
    return item?.name || 'Unknown Item';
  };

  const playerName = (playerId: string) => {
    const player = players.find((entry) => entry.id === playerId);
    return player?.name || 'Unknown Player';
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          🎁 Item Drop Control
        </h2>
        <span className="px-3 py-1 text-xs rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-500/50">
          Catalog Items: {items.length}
        </span>
      </div>

      <form onSubmit={handleDropItem} className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm text-gray-300">Select Item</span>
          <select
            value={selectedItem}
            onChange={(event) => setSelectedItem(event.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          >
            <option value="">Choose an item</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} {item.cost ? `(Cost: ${item.cost})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-gray-300">Target Player</span>
          <select
            value={targetPlayer}
            onChange={(event) => setTargetPlayer(event.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

        <div className="md:col-span-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={isDropping || !selectedItem || !targetPlayer}
            className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/60 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {isDropping ? 'Dropping...' : 'Drop Item'}
          </button>
          {successMessage && (
            <span className="text-sm text-green-400">{successMessage}</span>
          )}
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-emerald-300 mb-3">Items Catalog</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No items available in the catalog.
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-800/60 border border-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{item.name}</span>
                    {item.cost !== undefined && (
                      <span className="text-xs text-emerald-300">
                        {item.cost} coins
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-300 line-clamp-3">{item.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2 break-all">ID: {item.id}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">Recent Drops</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {dropHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No item drops recorded yet.
              </p>
            ) : (
              dropHistory.map((drop, index) => (
                <div
                  key={`${drop.itemId}-${drop.timestamp}-${index}`}
                  className="bg-gray-800/60 border border-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">
                      {describeItem(drop.itemId)}
                    </span>
                    {drop.cost !== undefined && (
                      <span className="text-xs text-red-300">-{drop.cost}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p>Target: {playerName(drop.targetPlayer)}</p>
                    {drop.metadata?.type && <p>Type: {drop.metadata.type}</p>}
                    {drop.metadata?.quantity && (
                      <p>Quantity: {drop.metadata.quantity}</p>
                    )}
                    {drop.newBalance !== undefined && (
                      <p>New Balance: {drop.newBalance.toLocaleString()}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {drop.timestamp
                      ? new Date(drop.timestamp).toLocaleString()
                      : 'Timestamp unknown'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDropSystem;
