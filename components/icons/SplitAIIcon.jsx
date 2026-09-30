import Svg, { Circle, Path } from "react-native-svg";

/**
 * SplitEase AI mark — the app's own icon for its assistant.
 *
 * A speech bubble (an assistant you talk to) holding a divide sign (÷ — what
 * SplitEase does: split money). The top dot of the ÷ is a small spark, which
 * marks the "smart" part without the generic AI sparkles.
 *
 * Drop-in for lucide icons: same 24×24 grid and props (size, color,
 * strokeWidth), so it sits naturally next to them in the tab bar.
 */
export default function SplitAIIcon({ size = 24, color = "#000", strokeWidth = 2, ...rest }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
            {/* Bubble: rounded rectangle with a tail at bottom-left */}
            <Path
                d="M8 4H16A5 5 0 0 1 21 9V12A5 5 0 0 1 16 17H10.5L6.5 20.4V16.4A5 5 0 0 1 3 12V9A5 5 0 0 1 8 4Z"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
            />
            {/* ÷ bar */}
            <Path d="M8.4 10.6H15.6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
            {/* ÷ top dot → spark */}
            <Path
                d="M12 5.9C12.15 7 12.5 7.35 13.6 7.5C12.5 7.65 12.15 8 12 9.1C11.85 8 11.5 7.65 10.4 7.5C11.5 7.35 11.85 7 12 5.9Z"
                fill={color}
            />
            {/* ÷ bottom dot */}
            <Circle cx="12" cy="13.6" r="1.15" fill={color} />
        </Svg>
    );
}
