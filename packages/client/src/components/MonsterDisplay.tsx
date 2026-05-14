import { MonsterState } from '@mournival/shared';
import { HAND_LABEL } from '@mournival/shared';

interface Props {
  monster: MonsterState;
  floor: number;
  room: number;
}

export function MonsterDisplay({ monster, floor, room }: Props) {
  const { definition: def, currentHP, actionIndex } = monster;
  const action = def.attackPattern[actionIndex % def.attackPattern.length];
  const hpPct = (currentHP / def.maxHP) * 100;

  const actionLabel = (() => {
    if (action.type === 'attack') return `⚔️ Attack — ${action.damage} dmg`;
    if (action.type === 'attack-all') return `💥 AOE Attack — ${action.damage} dmg to all`;
    if (action.type === 'buff-self') return `🛡️ ${action.label}`;
    if (action.type === 'debuff-player') return `😈 ${action.label}`;
    return '?';
  })();

  return (
    <div className="monster-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span className="monster-name">{def.name}</span>
        {def.isBoss && <span className="badge badge-boss">BOSS</span>}
        {def.weakness && <span className="badge badge-weakness">Weak: {HAND_LABEL[def.weakness]}</span>}
        {def.immunity && <span className="badge badge-immunity">Immune: {HAND_LABEL[def.immunity]}</span>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '2px 0' }}>
        Floor {floor} · Room {room}
      </div>
      <div className="hp-bar" style={{ margin: '8px 0' }}>
        <div className="hp-fill" style={{ width: `${hpPct}%` }} />
      </div>
      <div style={{ fontSize: 13, marginBottom: 4 }}>
        HP: <strong>{currentHP}</strong> / {def.maxHP}
        {monster.shieldHP > 0 && <span style={{ color: 'var(--blue)', marginLeft: 8 }}>🛡 {monster.shieldHP}</span>}
      </div>
      <div className="monster-action">Next: {actionLabel}</div>
    </div>
  );
}
