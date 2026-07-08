import { memo } from "react";
import Svg, {
    Circle,
    Defs,
    G,
    Line,
    LinearGradient,
    Path,
    Stop,
    Text as SvgText,
} from "react-native-svg";

// ── Smooth Catmull-Rom → cubic bezier path ──────────────────────────────────
function smoothPath(points) {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;
        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return d;
}

const niceCeil = (v) => {
    if (v <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * pow;
};

const shortK = (v) =>
    v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `${Math.round(v)}`;

/**
 * Spending Trajectory — gradient area chart.
 * data: [{ month: "Jan", amount: 123 }]
 */
export const SpendingAreaChart = memo(function SpendingAreaChart({ data = [], width, height = 210, color = "#0891B2", colors }) {
    const padL = 34;
    const padR = 10;
    const padT = 14;
    const padB = 26;
    const plotW = Math.max(1, width - padL - padR);
    const plotH = Math.max(1, height - padT - padB);

    const amounts = data.map((d) => Number(d.amount) || 0);
    const max = niceCeil(Math.max(...amounts, 1));

    const points = data.map((d, i) => ({
        x: padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW),
        y: padT + plotH - ((Number(d.amount) || 0) / max) * plotH,
    }));

    const line = smoothPath(points);
    const area =
        points.length > 1
            ? `${line} L ${points[points.length - 1].x} ${padT + plotH} L ${points[0].x} ${padT + plotH} Z`
            : "";

    const gridLines = 4;
    const grid = colors?.border || "rgba(148,163,184,0.25)";
    const axisText = colors?.textSecondary || "#94a3b8";

    return (
        <Svg width={width} height={height}>
            <Defs>
                <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={color} stopOpacity={0.32} />
                    <Stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </LinearGradient>
            </Defs>

            {/* Horizontal grid + Y labels */}
            {Array.from({ length: gridLines + 1 }).map((_, i) => {
                const y = padT + (i / gridLines) * plotH;
                const val = max * (1 - i / gridLines);
                return (
                    <G key={i}>
                        <Line
                            x1={padL} y1={y} x2={width - padR} y2={y}
                            stroke={grid} strokeWidth={1} strokeDasharray="3 4"
                        />
                        <SvgText x={padL - 6} y={y + 3} fontSize={9} fill={axisText} textAnchor="end">
                            {shortK(val)}
                        </SvgText>
                    </G>
                );
            })}

            {/* Area + line */}
            {area ? <Path d={area} fill="url(#areaFill)" /> : null}
            {line ? <Path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" /> : null}

            {/* Dots */}
            {points.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
            ))}

            {/* X labels */}
            {data.map((d, i) => (
                <SvgText
                    key={i}
                    x={points[i].x}
                    y={height - 8}
                    fontSize={9}
                    fill={axisText}
                    textAnchor="middle"
                >
                    {d.month}
                </SvgText>
            ))}
        </Svg>
    );
});

/**
 * Donut ring for category allocations.
 * data: [{ value, color }]
 */
export const DonutRing = memo(function DonutRing({ data = [], size = 150, strokeWidth = 18, trackColor }) {
    const r = (size - strokeWidth) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const C = 2 * Math.PI * r;
    const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0) || 1;
    const gap = data.length > 1 ? 0.012 * C : 0; // small spacing between segments

    let offset = 0;
    return (
        <Svg width={size} height={size}>
            <G rotation={-90} origin={`${cx}, ${cy}`}>
                <Circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
                {data.map((d, i) => {
                    const frac = (Number(d.value) || 0) / total;
                    const len = Math.max(0, frac * C - gap);
                    const seg = (
                        <Circle
                            key={i}
                            cx={cx}
                            cy={cy}
                            r={r}
                            stroke={d.color}
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${len} ${C - len}`}
                            strokeDashoffset={-offset}
                        />
                    );
                    offset += frac * C;
                    return seg;
                })}
            </G>
        </Svg>
    );
});
