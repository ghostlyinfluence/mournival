import { useEffect, useRef } from 'react';

interface Props {
  entries: string[];
}

export function GameLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="game-log">
      <h4>COMBAT LOG</h4>
      {entries.slice(-40).map((e, i) => (
        <div key={i} className="log-entry">{e}</div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
