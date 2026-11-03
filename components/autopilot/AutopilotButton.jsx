/**
 * The way into Autopilot from screen headers (never floating over content): just the
 * 3D Autopilot icon, no label. Hidden when the server has Autopilot switched off.
 */
import Autopilot3DIcon from "@/components/icons/Autopilot3DIcon";
import { api } from "@/lib/api";
import { openAutopilot } from "@/lib/autopilotNav";
import { memo, useEffect, useState } from "react";
import { TouchableOpacity } from "react-native";

// One capability check per app session, shared by every header that shows the button.
let availability = null;
const isAvailable = () => {
    availability ||= api.get("/agent/capabilities").then(() => true, (err) => {
        availability = null; // a network blip retries next time
        return err?.response?.data?.code !== "AUTOPILOT_DISABLED";
    });
    return availability;
};

function AutopilotButton({ groupId, size = 44 }) {
    const [available, setAvailable] = useState(true);
    useEffect(() => {
        let live = true;
        isAvailable().then((ok) => { if (live) setAvailable(ok); });
        return () => { live = false; };
    }, []);
    if (!available) return null;
    return (
        <TouchableOpacity
            onPress={() => openAutopilot({ groupId })}
            activeOpacity={0.8}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Open Autopilot"
        >
            <Autopilot3DIcon size={size} />
        </TouchableOpacity>
    );
}

export default memo(AutopilotButton);
