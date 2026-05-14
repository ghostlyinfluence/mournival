import { Card } from '@mournival/shared';
import { SUIT_SYMBOL } from '@mournival/shared';

interface Props {
  card: Card;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function CardComponent({ card, selected, onClick, disabled }: Props) {
  const symbol = SUIT_SYMBOL[card.suit];
  return (
    <div
      className={`card ${card.suit}${selected ? ' selected' : ''}${disabled ? ' dead' : ''}`}
      onClick={disabled ? undefined : onClick}
      title={`${card.rank}${symbol}`}
    >
      <span className="rank-suit">{card.rank}{symbol}</span>
      <span className="center-suit">{symbol}</span>
      <span className="rank-suit-br">{card.rank}{symbol}</span>
    </div>
  );
}
