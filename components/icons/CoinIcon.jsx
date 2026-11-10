import { useId } from "react";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";

const STAR = "M32.00 21.50 L34.59 28.44 L41.99 28.76 L36.18 33.36 L38.17 40.49 L32.00 36.40 L25.83 40.49 L27.82 33.36 L22.01 28.76 L29.41 28.44 Z";

/**
 * A minted gold coin: thick edge, raised rim, shaded face, embossed star and
 * a soft highlight. Used wherever reward coins are shown (same drawing as the
 * web app's CoinIcon). `size` is the width/height in points.
 */
export default function CoinIcon({ size = 20, style }) {
    const id = useId().replace(/[^a-zA-Z0-9]/g, "");
    const rim = `rim${id}`, face = `face${id}`, edge = `edge${id}`;
    return (
        <Svg width={size} height={size} viewBox="0 0 64 64" style={style} accessibilityElementsHidden importantForAccessibility="no">
            <Defs>
                <LinearGradient id={rim} x1="0.15" y1="0" x2="0.85" y2="1">
                    <Stop offset="0" stopColor="#FFF0B8" />
                    <Stop offset="0.45" stopColor="#F6B93B" />
                    <Stop offset="1" stopColor="#B4690E" />
                </LinearGradient>
                <RadialGradient id={face} cx="0.38" cy="0.32" r="0.75">
                    <Stop offset="0" stopColor="#FFF4C7" />
                    <Stop offset="0.5" stopColor="#FBC94A" />
                    <Stop offset="1" stopColor="#D88C12" />
                </RadialGradient>
                <LinearGradient id={edge} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#A9620B" />
                    <Stop offset="1" stopColor="#74400A" />
                </LinearGradient>
            </Defs>

            {/* thickness: the coin's edge peeking out underneath */}
            <Circle cx="32" cy="35.5" r="27" fill={`url(#${edge})`} />
            {/* raised rim */}
            <Circle cx="32" cy="31.5" r="27" fill={`url(#${rim})`} />
            {/* groove between rim and face */}
            <Circle cx="32" cy="31.5" r="22.4" fill="none" stroke="#9A5A08" strokeOpacity="0.55" strokeWidth="1.2" />
            {/* face */}
            <Circle cx="32" cy="31.5" r="21.4" fill={`url(#${face})`} />
            <Circle cx="32" cy="31.5" r="20.6" fill="none" stroke="#FFF7DB" strokeOpacity="0.55" strokeWidth="0.9" />

            {/* embossed star: light edge below, dark body on top */}
            <Path d={STAR} fill="#FFF3C4" fillOpacity="0.75" transform="translate(0 0.6)" />
            <Path d={STAR} fill="#B26B0B" transform="translate(0 -0.5)" />

            {/* soft highlight, upper left */}
            <Ellipse cx="23" cy="19" rx="11" ry="5" fill="#FFFFFF" fillOpacity="0.32" transform="rotate(-32 23 19)" />
        </Svg>
    );
}
