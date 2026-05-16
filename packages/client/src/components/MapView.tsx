import { useEffect, useRef } from 'react';
import { GameState, MapNode, NodeType } from '@mournival/shared';
import { useGameStore } from '../store/gameStore';

interface Props {
  state: GameState;
}

const COL_W = 70;
const ROW_H = 52;
const NODE_R = 17;
const PAD_X = 50;
const PAD_Y = 36;
const NUM_COLS = 6;
const NUM_ROWS = 16; // rows 0–14 + boss at row 15

const SVG_W = PAD_X * 2 + NUM_COLS * COL_W;
const SVG_H = PAD_Y * 2 + NUM_ROWS * ROW_H;

function npos(row: number, col: number) {
  return {
    x: PAD_X + col * COL_W + COL_W / 2,
    y: PAD_Y + (NUM_ROWS - 1 - row) * ROW_H + ROW_H / 2,
  };
}

const TYPE_ICON: Record<NodeType, string> = {
  combat: '⚔',
  elite: '★',
  shop: '$',
  rest: '☕',
  boss: '☠',
};

const TYPE_LABEL: Record<NodeType, string> = {
  combat: 'Combat',
  elite: 'Elite',
  shop: 'Shop',
  rest: 'Rest',
  boss: 'Boss',
};

function SvgNode({
  node,
  currentId,
  onSelect,
}: {
  node: MapNode;
  currentId: string | null;
  onSelect: (id: string) => void;
}) {
  const { x, y } = npos(node.row, node.col);
  const isCurrent = node.id === currentId;
  const isAvail = node.available;
  const isVisited = node.visited;

  let fill: string;
  let stroke: string;
  let strokeW: number;

  if (isCurrent) {
    fill = '#0d3d3d';
    stroke = '#d4aa40';
    strokeW = 3;
  } else if (isAvail) {
    fill = '#0a2e2e';
    stroke = '#4db8b8';
    strokeW = 2.5;
  } else if (isVisited) {
    fill = '#091e1e';
    stroke = '#1e4a4a';
    strokeW = 1.5;
  } else {
    fill = '#0d1520';
    stroke = '#1e2d40';
    strokeW = 1;
  }

  const typeColor: Record<NodeType, string> = {
    combat: '#e15f41',
    elite: '#d4aa40',
    shop: '#2ea043',
    rest: '#e87722',
    boss: '#c0392b',
  };

  return (
    <g
      onClick={isAvail ? () => onSelect(node.id) : undefined}
      style={{ cursor: isAvail ? 'pointer' : 'default' }}
    >
      {isAvail && (
        <circle
          cx={x} cy={y} r={NODE_R + 6}
          fill="none"
          stroke="#4db8b8"
          strokeWidth={1}
          opacity={0.25}
        />
      )}
      <circle
        cx={x} cy={y} r={NODE_R}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeW}
        opacity={isVisited && !isCurrent ? 0.55 : 1}
      />
      {/* Coloured inner dot to indicate node type */}
      <circle
        cx={x} cy={y - NODE_R + 6} r={4}
        fill={typeColor[node.type]}
        opacity={isVisited && !isCurrent ? 0.4 : 0.9}
      />
      <text
        x={x}
        y={y + 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={13}
        opacity={isVisited && !isCurrent ? 0.45 : 1}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {TYPE_ICON[node.type]}
      </text>
    </g>
  );
}

export function MapView({ state }: Props) {
  const { floorMap } = state;
  const { selectNode } = useGameStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Start scrolled to the bottom so row-0 available nodes are visible
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  if (!floorMap) return null;

  return (
    <div className="map-wrap">
      <div className="map-header">
        <span className="map-title">Floor {state.floor} — Choose your path</span>
        <div className="map-legend">
          {(Object.entries(TYPE_LABEL) as [NodeType, string][]).map(([type, label]) => (
            <span key={type} className="map-legend-item">
              {TYPE_ICON[type]} {label}
            </span>
          ))}
        </div>
      </div>

      <div className="map-scroll" ref={scrollRef}>
        <svg width={SVG_W} height={SVG_H} className="map-svg">
          {/* Connection lines */}
          {floorMap.nodes.map(node =>
            node.connections.map(tid => {
              const target = floorMap.nodes.find(n => n.id === tid);
              if (!target) return null;
              const a = npos(node.row, node.col);
              const b = npos(target.row, target.col);
              const active = node.visited && (target.visited || target.available);
              return (
                <line
                  key={`${node.id}>${tid}`}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={active ? '#2a8080' : '#1e2d40'}
                  strokeWidth={active ? 2 : 1}
                  opacity={active ? 0.9 : 0.45}
                />
              );
            })
          )}

          {/* Nodes (rendered on top of lines) */}
          {floorMap.nodes.map(node => (
            <SvgNode
              key={node.id}
              node={node}
              currentId={floorMap.currentNodeId}
              onSelect={selectNode}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
