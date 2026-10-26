import { quotaForDay } from '../config';
import { PROTOCOL_VERSION } from '../network/Protocol';
import type { ShopViewData } from '../ui/UI';
import { applyPurchaseToRun, buildShopItems } from './Shop';
import { cloneLoadout, cloneStats } from './RunState';
import type { Game } from './Game';

export function buildShopView(game: Game): ShopViewData {
  const playerCount =
    game.online && game.network ? game.network.getPlayerCount() : 1;
  return {
    success: game.shopSuccess,
    victory: game.shopVictory,
    infinite: game.run.infinite,
    day: game.run.day,
    carbon: game.run.carbon,
    quota: game.run.quota,
    nextQuota: quotaForDay(game.run.day + 1, playerCount),
    money: game.run.money,
    loadout: game.run.loadout,
    stats: game.run.stats,
    items: buildShopItems(game.run),
    canPurchase: game.phase === 'shop' && game.shopSuccess,
    isHost: game.role !== 'client',
    online: game.online,
  };
}

export function requestPurchase(game: Game, itemId: string): void {
  if (game.phase !== 'shop' || !game.shopSuccess) {
    return;
  }
  if (game.role === 'client') {
    game.network?.sendToHost({
      t: 'purchase',
      v: PROTOCOL_VERSION,
      itemId,
    });
    return;
  }
  if (applyPurchase(game, itemId)) {
    broadcastShopState(game);
  }
}

export function applyPurchase(game: Game, itemId: string): boolean {
  if (game.phase !== 'shop' || !game.shopSuccess) {
    return false;
  }
  const result = applyPurchaseToRun(game.run, itemId);
  if (!result) {
    return false;
  }
  game.audio.playPurchase();
  game.player.setLoadout(game.run.loadout);
  game.syncEquipmentInventory();
  game.ui.notify(`ADQUIRIDO · ${result.label}`, 'positive');
  game.saveRun(false);
  game.ui.updateShop(buildShopView(game));
  return true;
}

export function broadcastShopState(game: Game): void {
  if (!game.online || !game.network || game.role !== 'host') {
    return;
  }
  game.network.broadcast({
    t: 'shop_state',
    v: PROTOCOL_VERSION,
    money: game.run.money,
    loadout: cloneLoadout(game.run.loadout),
    stats: cloneStats(game.run.stats),
    quota: game.run.quota,
    day: game.run.day,
    infinite: game.run.infinite,
  });
}
