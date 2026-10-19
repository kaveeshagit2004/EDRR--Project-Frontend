import React, { useState, useMemo } from 'react';
import { getStationHistory } from '../utils/waterHistory';

function formatDateTime(date) {
    if (!date) return '';
    try {
        const d = new Date(date);
        return d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return String(date);
    }
}

function formatFullDateTime(date) {
    if (!date) return '';
    try {
        const d = new Date(date);
        return d.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return String(date);
    }
}

const STATUS_COLOR = {
    CRITICAL: { line: '#dc2626', bg: '#fee2e2', text: '#991b1b', label: 'Major Flood' },
    WARNING:  { line: '#ea580c', bg: '#ffedd5', text: '#9a3412', label: 'Minor Flood' },
    ALERT:    { line: '#eab308', bg: '#fef9c3', text: '#854d0e', label: 'Alert Level' },
    NORMAL:   { line: '#235347', bg: '#DAF1DE', text: '#0B2B26', label: 'Normal Flow' }
};

export default function WaterLevelChart({
    station,
    height = 280,
    showSummary = true,
    titleOverride
}) {
    const [hoveredPoint, setHoveredPoint] = useState(null);

    const history = useMemo(() => getStationHistory(station), [station]);

    const major = station?.majorFloodLevel != null
        ? Number(station.majorFloodLevel)
        : (station?.maximumLimit != null ? Number(station.maximumLimit) : 5.0);
    const minor = station?.minorFloodLevel != null
        ? Number(station.minorFloodLevel)
        : Number((major * 0.8).toFixed(2));
    const alert = station?.alertWaterLevel != null
        ? Number(station.alertWaterLevel)
        : Number((major * 0.6).toFixed(2));
    const current = Number(station?.currentLevel || 0);

    // Coordinate space dimensions
    const width = 640;
    const paddingLeft = 56;
    const paddingRight = 40;
    const paddingTop = 28;
    const paddingBottom = 46;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    // Determine Y scale
    const levels = history.map(h => h.level).concat([current, major, minor, alert]);
    const minVal = 0;
    const maxVal = Math.max(...levels, major * 1.15, 4.0);
    const yRange = maxVal - minVal || 1;

    const getY = (val) => {
        const norm = (val - minVal) / yRange;
        return paddingTop + chartH - (norm * chartH);
    };

    // Determine X scale based on timestamp range (7 days)
    const timestamps = history.map(h => h.timestamp.getTime());
    const minTime = timestamps.length > 0 ? Math.min(...timestamps) : Date.now() - 7 * 86400000;
    const maxTime = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
    const timeRange = maxTime - minTime || 1;

    const getX = (t) => {
        const norm = (t.getTime() - minTime) / timeRange;
        return paddingLeft + (norm * chartW);
    };

    // Build polyline points and SVG path
    const points = history.map((pt, i) => ({
        x: getX(pt.timestamp),
        y: getY(pt.level),
        data: pt,
        index: i
    }));

    const pathD = points.length > 0
        ? points.reduce((acc, pt, i) => {
            if (i === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
            // Smooth curve
            const prev = points[i - 1];
            const midX = (prev.x + pt.x) / 2;
            return `${acc} C ${midX.toFixed(1)} ${prev.y.toFixed(1)}, ${midX.toFixed(1)} ${pt.y.toFixed(1)}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        }, '')
        : '';

    const areaD = points.length > 0
        ? `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(paddingTop + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(paddingTop + chartH).toFixed(1)} Z`
        : '';

    // Generate Y-axis grid ticks (e.g. 5 steps from 0 to maxVal)
    const yTickCount = 5;
    const yTicks = [];
    for (let i = 0; i <= yTickCount; i++) {
        const val = minVal + (yRange / yTickCount) * i;
        yTicks.push({
            val: val.toFixed(1),
            y: getY(val)
        });
    }

    // Generate X-axis time ticks across the 7-day span
    const xTickCount = Math.min(Math.max(history.length, 4), 6);
    const xTicks = [];
    if (history.length > 0) {
        const step = Math.max(1, Math.floor((history.length - 1) / (xTickCount - 1)));
        for (let i = 0; i < history.length; i += step) {
            xTicks.push(history[i]);
        }
        // Ensure last point is always labeled
        if (xTicks[xTicks.length - 1] !== history[history.length - 1]) {
            xTicks.push(history[history.length - 1]);
        }
    }

    // 7-day stats
    const historyLevels = history.map(h => h.level);
    const min7Day = historyLevels.length ? Math.min(...historyLevels) : current;
    const max7Day = historyLevels.length ? Math.max(...historyLevels) : current;

    // Threshold lines Y positions
    const yMajor = getY(major);
    const yMinor = getY(minor);
    const yAlert = getY(alert);

    const chartTitle = titleOverride || `${station?.locationName || 'Water Station'} — 7-Day Water Level Trend`;

    return (
        <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #8EB69B',
            borderRadius: 12,
            padding: '16px 16px 12px',
            boxShadow: '0 3px 12px rgba(11, 43, 38, 0.08)',
            marginBottom: 16
        }}>
            {/* Header info bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#235347', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            1-WEEK HYDROGRAPH
                        </span>
                        <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: '#DAF1DE',
                            color: '#0B2B26'
                        }}>
                            7-Day Range
                        </span>
                    </div>
                    <h4 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: '#0B2B26' }}>
                        {chartTitle}
                    </h4>
                </div>

                {showSummary && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 11, color: '#235347', display: 'block' }}>Current Reading</span>
                            <strong style={{ fontSize: 16, color: '#0B2B26' }}>{current} m</strong>
                        </div>
                        <div style={{ textAlign: 'right', borderLeft: '1px solid #8EB69B66', paddingLeft: 12 }}>
                            <span style={{ fontSize: 11, color: '#235347', display: 'block' }}>7-Day Min / Max</span>
                            <strong style={{ fontSize: 13, color: '#235347' }}>{min7Day} m - {max7Day} m</strong>
                        </div>
                    </div>
                )}
            </div>

            {/* Threshold Reference Indicator Legend */}
            <div style={{
                display: 'flex',
                gap: 14,
                flexWrap: 'wrap',
                fontSize: 11,
                fontWeight: 600,
                padding: '6px 10px',
                background: '#f8fafc',
                borderRadius: 8,
                marginBottom: 10,
                border: '1px solid #e2e8f0'
            }}>
                <span style={{ color: '#235347', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#235347', display: 'inline-block' }} />
                    Current Level: <strong>{current}m</strong>
                </span>
                <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 14, height: 2, background: '#dc2626', display: 'inline-block', borderTop: '2px dashed #dc2626' }} />
                    Major Flood: <strong>{major}m</strong>
                </span>
                <span style={{ color: '#ea580c', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 14, height: 2, background: '#ea580c', display: 'inline-block', borderTop: '2px dashed #ea580c' }} />
                    Minor Flood: <strong>{minor}m</strong>
                </span>
                <span style={{ color: '#ca8a04', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 14, height: 2, background: '#eab308', display: 'inline-block', borderTop: '2px dashed #eab308' }} />
                    Alert Level: <strong>{alert}m</strong>
                </span>
            </div>

            {/* SVG Chart Area */}
            <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
                    onMouseLeave={() => setHoveredPoint(null)}
                >
                    <defs>
                        {/* Area gradient under water line */}
                        <linearGradient id={`waterGrad-${station?.id || 'default'}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#235347" stopOpacity="0.35" />
                            <stop offset="60%" stopColor="#8EB69B" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="#DAF1DE" stopOpacity="0.02" />
                        </linearGradient>

                        {/* Drop shadow for hover tooltips */}
                        <filter id="chartDropShadow" x="-10%" y="-10%" width="130%" height="130%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18" />
                        </filter>
                    </defs>

                    {/* Horizontal Grid Lines & Y-axis labels */}
                    {yTicks.map((t, idx) => (
                        <g key={`ytick-${idx}`}>
                            <line
                                x1={paddingLeft}
                                y1={t.y}
                                x2={width - paddingRight}
                                y2={t.y}
                                stroke="#e2e8f0"
                                strokeWidth="1"
                            />
                            <text
                                x={paddingLeft - 8}
                                y={t.y + 4}
                                textAnchor="end"
                                fontSize="11"
                                fill="#64748b"
                                fontWeight="500"
                            >
                                {t.val}m
                            </text>
                        </g>
                    ))}

                    {/* Vertical Axis (Y-Axis line) */}
                    <line
                        x1={paddingLeft}
                        y1={paddingTop}
                        x2={paddingLeft}
                        y2={paddingTop + chartH}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                    />

                    {/* Horizontal Axis (X-Axis baseline) */}
                    <line
                        x1={paddingLeft}
                        y1={paddingTop + chartH}
                        x2={width - paddingRight}
                        y2={paddingTop + chartH}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                    />

                    {/* Axis Labels */}
                    <text
                        x={14}
                        y={paddingTop + chartH / 2}
                        transform={`rotate(-90 14 ${paddingTop + chartH / 2})`}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fill="#235347"
                        letterSpacing="0.4"
                    >
                        WATER LEVEL (METERS)
                    </text>

                    <text
                        x={paddingLeft + chartW / 2}
                        y={height - 6}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fill="#235347"
                        letterSpacing="0.4"
                    >
                        UPDATE TIME &amp; DATE (PAST 7 DAYS)
                    </text>

                    {/* Reference Line: Alert Level (Yellow) */}
                    {yAlert >= paddingTop && yAlert <= paddingTop + chartH && (
                        <g>
                            <line
                                x1={paddingLeft}
                                y1={yAlert}
                                x2={width - paddingRight}
                                y2={yAlert}
                                stroke="#eab308"
                                strokeWidth="1.5"
                                strokeDasharray="4 3"
                            />
                            <rect
                                x={width - paddingRight - 76}
                                y={yAlert - 9}
                                width="74"
                                height="17"
                                rx="4"
                                fill="#fef9c3"
                                stroke="#eab308"
                                strokeWidth="1"
                            />
                            <text
                                x={width - paddingRight - 39}
                                y={yAlert + 3}
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="700"
                                fill="#854d0e"
                            >
                                Alert: {alert}m
                            </text>
                        </g>
                    )}

                    {/* Reference Line: Minor Flood Level (Orange) */}
                    {yMinor >= paddingTop && yMinor <= paddingTop + chartH && (
                        <g>
                            <line
                                x1={paddingLeft}
                                y1={yMinor}
                                x2={width - paddingRight}
                                y2={yMinor}
                                stroke="#ea580c"
                                strokeWidth="1.5"
                                strokeDasharray="5 3"
                            />
                            <rect
                                x={width - paddingRight - 76}
                                y={yMinor - 9}
                                width="74"
                                height="17"
                                rx="4"
                                fill="#ffedd5"
                                stroke="#ea580c"
                                strokeWidth="1"
                            />
                            <text
                                x={width - paddingRight - 39}
                                y={yMinor + 3}
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="700"
                                fill="#9a3412"
                            >
                                Minor: {minor}m
                            </text>
                        </g>
                    )}

                    {/* Reference Line: Major Flood Level (Red) */}
                    {yMajor >= paddingTop && yMajor <= paddingTop + chartH && (
                        <g>
                            <line
                                x1={paddingLeft}
                                y1={yMajor}
                                x2={width - paddingRight}
                                y2={yMajor}
                                stroke="#dc2626"
                                strokeWidth="2"
                                strokeDasharray="5 4"
                            />
                            <rect
                                x={width - paddingRight - 76}
                                y={yMajor - 9}
                                width="74"
                                height="17"
                                rx="4"
                                fill="#fee2e2"
                                stroke="#dc2626"
                                strokeWidth="1"
                            />
                            <text
                                x={width - paddingRight - 39}
                                y={yMajor + 3}
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="800"
                                fill="#991b1b"
                            >
                                Major: {major}m
                            </text>
                        </g>
                    )}

                    {/* Area under curve */}
                    {areaD && (
                        <path
                            d={areaD}
                            fill={`url(#waterGrad-${station?.id || 'default'})`}
                        />
                    )}

                    {/* Water Level Line */}
                    {pathD && (
                        <path
                            d={pathD}
                            fill="none"
                            stroke="#0B2B26"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* X-axis Time & Date Ticks */}
                    {xTicks.map((pt, idx) => {
                        const xPos = getX(pt.timestamp);
                        return (
                            <g key={`xtick-${idx}`}>
                                <line
                                    x1={xPos}
                                    y1={paddingTop + chartH}
                                    x2={xPos}
                                    y2={paddingTop + chartH + 5}
                                    stroke="#64748b"
                                    strokeWidth="1"
                                />
                                <text
                                    x={xPos}
                                    y={paddingTop + chartH + 18}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fontWeight="600"
                                    fill="#475569"
                                >
                                    {formatDateTime(pt.timestamp)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Interactive datapoints */}
                    {points.map((pt, idx) => {
                        const isLatest = idx === points.length - 1;
                        const isHovered = hoveredPoint && hoveredPoint.index === idx;
                        const stColor = STATUS_COLOR[pt.data.status] || STATUS_COLOR.NORMAL;

                        return (
                            <g
                                key={`pt-${idx}`}
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredPoint(pt)}
                                onClick={() => setHoveredPoint(pt)}
                            >
                                {/* Invisible wide hit area for easy hover/touch */}
                                <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r="14"
                                    fill="transparent"
                                />

                                {/* Halo for latest reading */}
                                {isLatest && (
                                    <circle
                                        cx={pt.x}
                                        cy={pt.y}
                                        r="9"
                                        fill="none"
                                        stroke={stColor.line}
                                        strokeWidth="1.5"
                                        opacity="0.55"
                                    />
                                )}

                                {/* Highlight ring when hovered */}
                                {isHovered && (
                                    <circle
                                        cx={pt.x}
                                        cy={pt.y}
                                        r="8"
                                        fill="none"
                                        stroke="#0B2B26"
                                        strokeWidth="2"
                                    />
                                )}

                                {/* Main reading dot */}
                                <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={isLatest ? 5.5 : 4}
                                    fill="#FFFFFF"
                                    stroke={stColor.line}
                                    strokeWidth={isLatest ? 3 : 2.5}
                                />
                            </g>
                        );
                    })}

                    {/* Vertical guideline for hovered point */}
                    {hoveredPoint && (
                        <line
                            x1={hoveredPoint.x}
                            y1={paddingTop}
                            x2={hoveredPoint.x}
                            y2={paddingTop + chartH}
                            stroke="#0B2B26"
                            strokeWidth="1.2"
                            strokeDasharray="3 3"
                            opacity="0.7"
                        />
                    )}
                </svg>

                {/* Floating Tooltip Card */}
                {hoveredPoint && (
                    <div
                        style={{
                            position: 'absolute',
                            left: `${Math.min(Math.max((hoveredPoint.x / width) * 100, 15), 85)}%`,
                            top: `${Math.max(10, Math.min((hoveredPoint.y / height) * 100 - 25, 65))}%`,
                            transform: 'translate(-50%, -100%)',
                            background: '#0B2B26',
                            color: '#DAF1DE',
                            padding: '9px 12px',
                            borderRadius: 8,
                            boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
                            fontSize: 12,
                            pointerEvents: 'none',
                            zIndex: 20,
                            minWidth: 170,
                            whiteSpace: 'nowrap',
                            border: '1px solid #8EB69B'
                        }}
                    >
                        <div style={{ fontSize: 11, color: '#8EB69B', fontWeight: 600, marginBottom: 2 }}>
                            {formatFullDateTime(hoveredPoint.data.timestamp)}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, margin: '2px 0 4px' }}>
                            <span style={{ fontSize: 11 }}>Water Level:</span>
                            <strong style={{ fontSize: 15, color: '#FFFFFF' }}>{hoveredPoint.data.level} m</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <span style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: 10,
                                background: STATUS_COLOR[hoveredPoint.data.status]?.bg || '#DAF1DE',
                                color: STATUS_COLOR[hoveredPoint.data.status]?.text || '#0B2B26'
                            }}>
                                {STATUS_COLOR[hoveredPoint.data.status]?.label || hoveredPoint.data.status}
                            </span>
                            {hoveredPoint.data.officerName && (
                                <span style={{ fontSize: 10, color: '#8EB69B' }}>
                                    &middot; {hoveredPoint.data.officerName}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
