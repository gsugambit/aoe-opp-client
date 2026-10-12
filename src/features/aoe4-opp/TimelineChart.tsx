import React, { useState, useRef, useId } from 'react';
import type { PlayerTimeline, TimelineDataPoint } from './aoe4OppApi';
import { DEFAULT_PLAYER_COLORS } from './timelineConstants';

interface TimelineChartProps {
  title: string;
  metricKey: 'villagerCount' | 'militaryCount';
  players: PlayerTimeline[];
  playerColors?: string[];
  durationSeconds?: number;
  hiddenPlayerKeys?: Set<string>;
  onTogglePlayer?: (playerKey: string) => void;
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const TimelineChart: React.FC<TimelineChartProps> = ({
  title,
  metricKey,
  players,
  playerColors = DEFAULT_PLAYER_COLORS,
  durationSeconds = 0,
  hiddenPlayerKeys,
  onTogglePlayer,
}) => {
  const chartId = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [internalHiddenKeys, setInternalHiddenKeys] = useState<Set<string>>(new Set());

  const effectiveHiddenKeys = hiddenPlayerKeys ?? internalHiddenKeys;

  const getPlayerKey = (player: PlayerTimeline, idx: number): string =>
    player.profileId || player.name || String(idx);

  const handleToggle = (playerKey: string) => {
    if (onTogglePlayer) {
      onTogglePlayer(playerKey);
    } else {
      setInternalHiddenKeys((prev) => {
        const next = new Set(prev);
        if (next.has(playerKey)) {
          next.delete(playerKey);
        } else {
          next.add(playerKey);
        }
        return next;
      });
    }
  };

  const visiblePlayersWithIndices = players
    .map((p, idx) => ({
      player: p,
      originalIndex: idx,
      key: getPlayerKey(p, idx),
      color: playerColors[idx % playerColors.length],
    }))
    .filter((item) => !effectiveHiddenKeys.has(item.key));

  // Chart dimensions inside SVG viewBox
  const viewBoxWidth = 850;
  const viewBoxHeight = 350;
  const padding = { top: 30, right: 35, bottom: 45, left: 55 };
  const plotWidth = viewBoxWidth - padding.left - padding.right;
  const plotHeight = viewBoxHeight - padding.top - padding.bottom;

  // Calculate max timestamp and max value
  const allTimestamps = players.flatMap((p) => p.dataPoints.map((d) => d.timestamp));
  const maxTimestampRaw = Math.max(durationSeconds, ...allTimestamps, 60);
  // Round up maxTimestamp to next clean 60s
  const maxTime = Math.ceil(maxTimestampRaw / 60) * 60;

  // Scale Y max based on visible players (falling back to all players if none are visible)
  const targetPlayersForY =
    visiblePlayersWithIndices.length > 0
      ? visiblePlayersWithIndices.map((i) => i.player)
      : players;
  const allValues = targetPlayersForY.flatMap((p) => p.dataPoints.map((d) => d[metricKey] ?? 0));
  const rawMaxValue = Math.max(10, ...allValues);
  // Pick nice Y axis max
  const getNiceYMax = (max: number) => {
    if (max <= 20) return Math.ceil(max / 5) * 5 || 20;
    if (max <= 50) return Math.ceil(max / 10) * 10;
    if (max <= 150) return Math.ceil(max / 25) * 25;
    return Math.ceil(max / 50) * 50;
  };
  const maxY = getNiceYMax(rawMaxValue);

  // Coordinate scales
  const scaleX = (t: number) => padding.left + (Math.max(0, Math.min(t, maxTime)) / maxTime) * plotWidth;
  const scaleY = (v: number) => padding.top + plotHeight - (Math.max(0, Math.min(v, maxY)) / maxY) * plotHeight;

  // Generate Y-axis grid ticks (5 intervals)
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => Math.round((maxY / yTickCount) * i));

  // Generate X-axis ticks (intervals of 1, 2, 5, 10 minutes depending on match length)
  const totalMinutes = maxTime / 60;
  const minuteStep = totalMinutes <= 10 ? 2 : totalMinutes <= 25 ? 5 : totalMinutes <= 50 ? 10 : 15;
  const xTicks: number[] = [];
  for (let t = 0; t <= maxTime; t += minuteStep * 60) {
    xTicks.push(t);
  }
  if (xTicks[xTicks.length - 1] < maxTime && maxTime - xTicks[xTicks.length - 1] > (minuteStep * 60) / 2) {
    xTicks.push(maxTime);
  }

  // Handle hover mouse move
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseSvgX = ((e.clientX - rect.left) / rect.width) * viewBoxWidth;
    if (mouseSvgX >= padding.left && mouseSvgX <= padding.left + plotWidth) {
      setHoverX(mouseSvgX);
    } else {
      setHoverX(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverX(null);
  };

  // Interpolate or find nearest value at current hovered time
  const hoveredTime =
    hoverX !== null ? Math.round(((hoverX - padding.left) / plotWidth) * maxTime) : null;

  const getPlayerValueAtTime = (player: PlayerTimeline, time: number): number => {
    const points = player.dataPoints;
    if (!points || points.length === 0) return 0;
    // Points are typically chronological
    if (time <= points[0].timestamp) return points[0][metricKey] ?? 0;
    if (time >= points[points.length - 1].timestamp) {
      return points[points.length - 1][metricKey] ?? 0;
    }
    // Find surrounding points for linear step/interpolation
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (time >= p1.timestamp && time <= p2.timestamp) {
        if (p2.timestamp === p1.timestamp) return p1[metricKey] ?? 0;
        // Step or linear interpolation
        const ratio = (time - p1.timestamp) / (p2.timestamp - p1.timestamp);
        const v1 = p1[metricKey] ?? 0;
        const v2 = p2[metricKey] ?? 0;
        return Math.round(v1 + (v2 - v1) * ratio);
      }
    }
    return 0;
  };

  const hasData = players.some((p) => p.dataPoints && p.dataPoints.length > 0);

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #334155',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '16px',
          gap: '12px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.25em', color: '#f8fafc', fontWeight: 600 }}>
          {title}
        </h3>

        {/* Legend / Player Filter Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {players.map((player, idx) => {
            const color = playerColors[idx % playerColors.length];
            const playerKey = getPlayerKey(player, idx);
            const isHidden = effectiveHiddenKeys.has(playerKey);

            return (
              <button
                key={playerKey}
                type="button"
                onClick={() => handleToggle(playerKey)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85em',
                  color: isHidden ? '#64748b' : '#e2e8f0',
                  backgroundColor: isHidden ? 'rgba(30, 41, 59, 0.6)' : 'rgba(51, 65, 85, 0.5)',
                  border: `1px solid ${isHidden ? '#334155' : `${color}66`}`,
                  borderRadius: '6px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: isHidden ? 0.6 : 1,
                  textDecoration: isHidden ? 'line-through' : 'none',
                  userSelect: 'none',
                }}
                title={`Click to ${isHidden ? 'show' : 'hide'} ${player.name || `Player ${idx + 1}`}`}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: isHidden ? '#475569' : color,
                    boxShadow: isHidden ? 'none' : `0 0 6px ${color}88`,
                    transition: 'all 0.15s ease',
                  }}
                />
                <span style={{ fontWeight: isHidden ? 400 : 500 }}>
                  {player.name || `Player ${idx + 1}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!hasData ? (
        <div
          style={{
            height: '240px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#94a3b8',
            fontSize: '1em',
            border: '1px dashed #475569',
            borderRadius: '8px',
          }}
        >
          No timeline data available for {title.toLowerCase()}.
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            style={{
              width: '100%',
              minWidth: '0',
              height: 'auto',
              display: 'block',
              cursor: 'crosshair',
              userSelect: 'none',
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {/* Clip path for plot area */}
              <clipPath id={`plot-area-${chartId}`}>
                <rect
                  x={padding.left}
                  y={padding.top}
                  width={plotWidth}
                  height={plotHeight}
                />
              </clipPath>
            </defs>

            {/* Background Plot Area */}
            <rect
              x={padding.left}
              y={padding.top}
              width={plotWidth}
              height={plotHeight}
              fill="#0b1120"
              rx="4"
            />

            {/* Background Grid Lines & Y-Axis Labels */}
            {yTicks.map((val) => {
              const y = scaleY(val);
              return (
                <g key={`y-${val}`}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + plotWidth}
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="11"
                    fontFamily="sans-serif"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* X-Axis Grid Lines & Labels (Time in mm:ss) */}
            {xTicks.map((t) => {
              const x = scaleX(t);
              return (
                <g key={`x-${t}`}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + plotHeight}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={padding.top + plotHeight + 18}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="11"
                    fontFamily="sans-serif"
                  >
                    {formatTime(t)}
                  </text>
                </g>
              );
            })}

            {/* Player Lines (No area fill, clean stroke lines) */}
            <g clipPath={`url(#plot-area-${chartId})`}>
              {visiblePlayersWithIndices.map(({ player, originalIndex, color }) => {
                const sortedPoints = [...player.dataPoints].sort(
                  (a: TimelineDataPoint, b: TimelineDataPoint) => a.timestamp - b.timestamp
                );

                if (sortedPoints.length === 0) return null;

                const pathCoords = sortedPoints.map((pt) => ({
                  x: scaleX(pt.timestamp),
                  y: scaleY(pt[metricKey] ?? 0),
                }));

                const lineD = pathCoords.reduce(
                  (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
                  ''
                );

                return (
                  <path
                    key={player.profileId || player.name || originalIndex}
                    d={lineD}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
            </g>

            {/* Hover Crosshair & Indicators */}
            {hoverX !== null && hoveredTime !== null && visiblePlayersWithIndices.length > 0 && (
              <g pointerEvents="none">
                {/* Vertical time line */}
                <line
                  x1={hoverX}
                  y1={padding.top}
                  x2={hoverX}
                  y2={padding.top + plotHeight}
                  stroke="rgba(255, 255, 255, 0.45)"
                  strokeWidth="1.2"
                />

                {/* Dots on curves for visible players */}
                {visiblePlayersWithIndices.map(({ player, originalIndex, color }) => {
                  const val = getPlayerValueAtTime(player, hoveredTime);
                  const cy = scaleY(val);
                  return (
                    <circle
                      key={`dot-${player.profileId || player.name || originalIndex}`}
                      cx={hoverX}
                      cy={cy}
                      r="4"
                      fill={color}
                      stroke="#0b1120"
                      strokeWidth="2"
                    />
                  );
                })}
              </g>
            )}
          </svg>

          {/* Interactive Tooltip Card */}
          {hoverX !== null && hoveredTime !== null && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                backgroundColor: 'rgba(11, 17, 32, 0.95)',
                backdropFilter: 'blur(6px)',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 14px',
                pointerEvents: 'none',
                boxShadow: '0 10px 20px -3px rgba(0, 0, 0, 0.6)',
                fontSize: '0.85em',
                minWidth: '160px',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  color: '#f8fafc',
                  fontWeight: 700,
                  fontSize: '0.95em',
                  marginBottom: '6px',
                  borderBottom: '1px solid #1e293b',
                  paddingBottom: '4px',
                }}
              >
                {formatTime(hoveredTime)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {visiblePlayersWithIndices.length === 0 ? (
                  <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.9em' }}>
                    All players hidden
                  </div>
                ) : (
                  <>
                    {visiblePlayersWithIndices.map(({ player, originalIndex, color }) => {
                      const val = getPlayerValueAtTime(player, hoveredTime);
                      return (
                        <div
                          key={`tip-${player.profileId || player.name || originalIndex}`}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            color: color,
                            fontWeight: 600,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: color,
                              }}
                            />
                            <span
                              style={{
                                maxWidth: '110px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {player.name || `Player ${originalIndex + 1}`}
                            </span>
                          </div>
                          <span>{val}</span>
                        </div>
                      );
                    })}
                    {visiblePlayersWithIndices.length > 1 && (
                      <div
                        style={{
                          marginTop: '4px',
                          paddingTop: '4px',
                          borderTop: '1px solid #1e293b',
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: '#94a3b8',
                          fontSize: '0.9em',
                          fontWeight: 600,
                        }}
                      >
                        <span>Total</span>
                        <span>
                          {visiblePlayersWithIndices.reduce(
                            (sum, { player }) => sum + getPlayerValueAtTime(player, hoveredTime),
                            0
                          )}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
