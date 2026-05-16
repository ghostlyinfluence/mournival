import { JokerDefinition } from '@mournival/shared';

interface Props {
  jokers: JokerDefinition[];
}

export function JokerBar({ jokers }: Props) {
  return (
    <div className="joker-bar">
      <span className="joker-bar-label">Jokers</span>
      <div className="joker-bar-items">
        {jokers.length === 0 ? (
          <span className="joker-bar-empty">None held — buy some in the next shop</span>
        ) : (
          jokers.map(j => (
            <div
              key={j.id}
              className={`joker-chip joker-chip-${j.rarity}`}
              title={j.description}
            >
              <div className="joker-chip-header">
                <span className="joker-chip-name">{j.name}</span>
                <span className={`joker-chip-rarity rarity-${j.rarity}`}>{j.rarity}</span>
              </div>
              <div className="joker-chip-desc">{j.description}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
