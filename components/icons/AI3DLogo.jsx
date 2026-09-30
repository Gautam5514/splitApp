import { useId } from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

/**
 * SplitEase AI — 3D black logo.
 *
 * A glossy black sphere (radial shading + specular highlight + rim light +
 * soft bounce light) with the SplitEase AI mark — the ÷ speech bubble with a
 * spark — embossed on it in brushed silver. Pure SVG (react-native-svg), so it
 * is crisp at any size, works in light and dark mode, and needs no image files.
 *
 * `shadow` adds the soft contact shadow underneath (use it for large, free-
 * standing placements; turn it off inside tight rows).
 */
export default function AI3DLogo({ size = 48, shadow = true, variant = "dark" }) {
    // Unique gradient ids per instance (several logos on screen at once).
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const id = (n) => `${n}-${uid}`;
    const url = (n) => `url(#${id(n)})`;

    const light = variant === "light";

    // Drawn on a 120×120 canvas; sphere centre (60,56) r=44. The extra room at
    // the bottom holds the contact shadow.
    return (
        <Svg width={size} height={shadow ? size * (112 / 100) : size} viewBox={shadow ? "10 6 100 112" : "14 10 92 92"}>
            <Defs>
                {light ? (
                    <RadialGradient id={id("body")} cx="36%" cy="30%" r="75%">
                        <Stop offset="0" stopColor="#FFFFFF" />
                        <Stop offset="0.35" stopColor="#F2F3F6" />
                        <Stop offset="0.72" stopColor="#D7DAE2" />
                        <Stop offset="1" stopColor="#B4B9C6" />
                    </RadialGradient>
                ) : (
                    <RadialGradient id={id("body")} cx="36%" cy="30%" r="75%">
                        <Stop offset="0" stopColor="#6B6D73" />
                        <Stop offset="0.28" stopColor="#2A2B30" />
                        <Stop offset="0.7" stopColor="#0E0E11" />
                        <Stop offset="1" stopColor="#030304" />
                    </RadialGradient>
                )}
                <LinearGradient id={id("rim")} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
                    <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.05" />
                    <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.22" />
                </LinearGradient>
                <RadialGradient id={id("spec")} cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.75" />
                    <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id={id("bounce")} cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor="#9AA3B5" stopOpacity="0.35" />
                    <Stop offset="1" stopColor="#9AA3B5" stopOpacity="0" />
                </RadialGradient>
                {/* userSpaceOnUse: the ÷ bar is flat, so a bounding-box gradient would collapse */}
                {light ? (
                    <LinearGradient id={id("metal")} gradientUnits="userSpaceOnUse" x1="6" y1="3" x2="10" y2="21">
                        <Stop offset="0" stopColor="#4A4E58" />
                        <Stop offset="0.55" stopColor="#2C2F37" />
                        <Stop offset="1" stopColor="#16181D" />
                    </LinearGradient>
                ) : (
                    <LinearGradient id={id("metal")} gradientUnits="userSpaceOnUse" x1="6" y1="3" x2="10" y2="21">
                        <Stop offset="0" stopColor="#FFFFFF" />
                        <Stop offset="0.55" stopColor="#D9DCE3" />
                        <Stop offset="1" stopColor="#9EA3AE" />
                    </LinearGradient>
                )}
                <RadialGradient id={id("ground")} cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor="#000000" stopOpacity="0.35" />
                    <Stop offset="1" stopColor="#000000" stopOpacity="0" />
                </RadialGradient>
            </Defs>

            {shadow && <Ellipse cx="60" cy="104" rx="34" ry="6" fill={url("ground")} />}
            <Circle cx="60" cy="56" r="44" fill={url("body")} />
            <Ellipse cx="60" cy="90" rx="26" ry="9" fill={url("bounce")} />
            <Circle cx="60" cy="56" r="43.4" fill="none" stroke={url("rim")} strokeWidth="1.2" />

            {/* Embossed mark: offset copy for depth + face on top. On the light
                sphere the depth copy is a soft white so it reads as engraved. */}
            <G transform="translate(35.5,31.5) scale(2.05)">
                <G transform="translate(0,0.55)" opacity={light ? 0.5 : 0.65}>
                    <Path d={BUBBLE} fill="none" stroke={light ? "#FFFFFF" : "#000000"} strokeWidth="2.1" strokeLinejoin="round" />
                    <Rect x="7.35" y="9.55" width="9.3" height="2.1" rx="1.05" fill={light ? "#FFFFFF" : "#000000"} />
                    <Circle cx="12" cy="13.6" r="1.15" fill={light ? "#FFFFFF" : "#000000"} />
                </G>
                <Path d={BUBBLE} fill="none" stroke={url("metal")} strokeWidth="2.1" strokeLinejoin="round" />
                <Rect x="7.35" y="9.55" width="9.3" height="2.1" rx="1.05" fill={url("metal")} />
                <Path d={SPARK} fill={url("metal")} />
                <Circle cx="12" cy="13.6" r="1.15" fill={url("metal")} />
            </G>

            {/* Specular highlight on top */}
            <Ellipse cx="44" cy="28" rx="18" ry="10" fill={url("spec")} transform="rotate(-28 44 28)" />
        </Svg>
    );
}

const BUBBLE = "M8 4H16A5 5 0 0 1 21 9V12A5 5 0 0 1 16 17H10.5L6.5 20.4V16.4A5 5 0 0 1 3 12V9A5 5 0 0 1 8 4Z";
const SPARK = "M12 5.9C12.15 7 12.5 7.35 13.6 7.5C12.5 7.65 12.15 8 12 9.1C11.85 8 11.5 7.65 10.4 7.5C11.5 7.35 11.85 7 12 5.9Z";
