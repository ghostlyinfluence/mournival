import { Card } from '@mournival/shared';
import { SUIT_SYMBOL } from '@mournival/shared';

const ENHANCEMENT_LABEL: Record<string, { symbol: string; className: string; title: string }> = {
  bonus:  { symbol: '+', className: 'enh-bonus',  title: '+30 chips when scoring'       },
  mult:   { symbol: '×', className: 'enh-mult',   title: '+4 mult when scoring'         },
  glass:  { symbol: '◆', className: 'enh-glass',  title: '×2 mult; 25% chance to break' },
  steel:  { symbol: '⚙', className: 'enh-steel',  title: '×1.5 mult while held unplayed' },
  gold:   { symbol: '●', className: 'enh-gold',   title: '+3 gold when scoring'          },
  wild:   { symbol: '★', className: 'enh-wild',   title: 'Counts as any suit'            },
};

interface Props {
  card: Card;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function CardComponent({ card, selected, onClick, disabled }: Props) {
  const symbol = SUIT_SYMBOL[card.suit];
  const enh = card.enhancement ? ENHANCEMENT_LABEL[card.enhancement] : null;

  return (
    <div
      className={`card ${card.suit}${selected ? ' selected' : ''}${disabled ? ' dead' : ''}${enh ? ` card-${enh.className}` : ''}`}
      onClick={disabled ? undefined : onClick}
      title={`${card.rank}${symbol}${enh ? ` · ${enh.title}` : ''}`}
    >
      <span className="rank-suit">{card.rank}{symbol}</span>
      <span className="center-suit">{symbol}</span>
      <span className="rank-suit-br">{card.rank}{symbol}</span>
      {enh && (
        <span className={`card-enh ${enh.className}`} title={enh.title}>
          {enh.symbol}
        </span>
      )}
    </div>
  );
}
