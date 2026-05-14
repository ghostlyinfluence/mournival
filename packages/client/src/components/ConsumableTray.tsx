import { ConsumableCard, Player } from '@mournival/shared';
import { useGameStore } from '../store/gameStore';

interface Props {
  player: Player;
  inShop?: boolean;
}

export function ConsumableTray({ player, inShop }: Props) {
  const { activeConsumableId, setActiveConsumable, useConsumable } = useGameStore();

  if (player.consumables.length === 0) return null;

  const handleClick = (c: ConsumableCard) => {
    if (c.maxTargets === 0) {
      // No targets needed — use immediately
      useConsumable(c.id, []);
    } else {
      // Enter targeting mode
      setActiveConsumable(activeConsumableId === c.id ? null : c.id);
    }
  };

  return (
    <div className="consumable-tray">
      <span className="tray-label">{inShop ? 'Held' : 'Arcana & Stones'}</span>
      {player.consumables.map(c => (
        <div
          key={c.id}
          className={`consumable-card ${c.type}${activeConsumableId === c.id ? ' active' : ''}`}
          onClick={() => handleClick(c)}
          title={`${c.description}\n\n${c.flavour}`}
        >
          <span className="consumable-icon">{c.type === 'arcana' ? '🎴' : '💠'}</span>
          <span className="consumable-name">{c.name}</span>
          {c.type === 'celestial' && c.levelsHandType && (
            <span className="consumable-hint">{c.levelsHandType.replace(/-/g, ' ')}</span>
          )}
          {c.type === 'arcana' && c.maxTargets > 0 && (
            <span className="consumable-hint">{c.minTargets}–{c.maxTargets} targets</span>
          )}
        </div>
      ))}
    </div>
  );
}
