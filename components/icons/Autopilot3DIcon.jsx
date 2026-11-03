import { memo, useId } from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";

/**
 * Autopilot — 3D icon. A glossy midnight-blue sphere (radial shading, rim light,
 * cyan bounce light, specular highlight) with the Autopilot compass spark embossed
 * in brushed silver. Distinct from the black "SplitEase AI" orb used for AI chat.
 * Static SVG, no animation or images, memoised: costs nothing to keep on screen.
 */
function Autopilot3DIcon({ size = 44 }) {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const id = (n) => `${n}-${uid}`;
    const url = (n) => `url(#${id(n)})`;
    return (
        <Svg width={size} height={size} viewBox="14 10 92 92">
            <Defs>
                <RadialGradient id={id("body")} cx="34%" cy="28%" r="78%">
                    <Stop offset="0" stopColor="#7C8CFF" />
                    <Stop offset="0.3" stopColor="#3B3FD8" />
                    <Stop offset="0.72" stopColor="#1A1A6E" />
                    <Stop offset="1" stopColor="#0A0A2E" />
                </RadialGradient>
                <LinearGradient id={id("rim")} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.6" />
                    <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.04" />
                    <Stop offset="1" stopColor="#67E8F9" stopOpacity="0.45" />
                </LinearGradient>
                <RadialGradient id={id("bounce")} cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor="#22D3EE" stopOpacity="0.55" />
                    <Stop offset="1" stopColor="#22D3EE" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id={id("spec")} cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.8" />
                    <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </RadialGradient>
                <LinearGradient id={id("metal")} gradientUnits="userSpaceOnUse" x1="6" y1="3" x2="14" y2="25">
                    <Stop offset="0" stopColor="#FFFFFF" />
                    <Stop offset="0.55" stopColor="#E2E6F0" />
                    <Stop offset="1" stopColor="#A9B1C6" />
                </LinearGradient>
            </Defs>

            <Circle cx="60" cy="56" r="44" fill={url("body")} />
            <Ellipse cx="60" cy="88" rx="28" ry="10" fill={url("bounce")} />
            <Circle cx="60" cy="56" r="43.4" fill="none" stroke={url("rim")} strokeWidth="1.3" />

            {/* Compass spark: a dark offset copy for depth, the silver face on top. */}
            <G transform="translate(36.5,32.5) scale(1.7)">
                <G transform="translate(0.4,0.6)" opacity={0.55}>
                    <Path d={NEEDLE} fill="#05051A" />
                    <Path d={STAR} fill="#05051A" />
                </G>
                <Path d={NEEDLE} fill={url("metal")} />
                <Path d={STAR} fill={url("metal")} opacity={0.85} />
            </G>

            <Ellipse cx="44" cy="28" rx="18" ry="9" fill={url("spec")} transform="rotate(-28 44 28)" />
        </Svg>
    );
}

// The same marks as the web Autopilot logo (28×28 canvas).
const NEEDLE = "M16.5 4L14.5 12L22 15L14 16.5L10 24L10.5 15L4 11L12 10L16.5 4Z";
const STAR = "M22 3L22.8 5.2L25 6L22.8 6.8L22 9L21.2 6.8L19 6L21.2 5.2L22 3Z";

export default memo(Autopilot3DIcon);
