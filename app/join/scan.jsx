import { PillButton, RoundButton, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { WEB_URL } from "@/lib/config";
import { parseScannedInvite } from "@/lib/inviteCode";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { Camera, ChevronLeft, Flashlight, FlashlightOff, ImageIcon, KeyRound } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Scan a group invite QR code with the camera, or read one from a photo
// (QR codes often arrive as a WhatsApp screenshot, which the same phone's
// camera can't scan). Only SplitEase invites are accepted; anything else
// shows a message and scanning carries on.

// expo-camera is a native module. An installed build made before it was added
// doesn't contain it, and a plain `import` would crash this whole route. Load
// it safely instead, and show a "type the code" fallback when it's missing.
let CameraKit = null;
try {
    CameraKit = require("expo-camera");
} catch {
    CameraKit = null;
}
const { CameraView, scanFromURLAsync, useCameraPermissions } = CameraKit || {};

const webHost = (() => { try { return new URL(WEB_URL).host; } catch { return ""; } })();

function ScanInviteScreen() {
    const { colors } = useDesign();
    const [permission, requestPermission] = useCameraPermissions();
    const [torch, setTorch] = useState(false);
    const [active, setActive] = useState(true); // camera only runs while this screen is focused
    const [message, setMessage] = useState("");
    const handled = useRef(false);
    const lastBad = useRef({ data: "", at: 0 });
    const msgTimer = useRef(null);

    useFocusEffect(useCallback(() => {
        setActive(true);
        handled.current = false;
        return () => { setActive(false); setTorch(false); };
    }, []));
    useEffect(() => () => clearTimeout(msgTimer.current), []);

    const flash = (text) => {
        setMessage(text);
        clearTimeout(msgTimer.current);
        msgTimer.current = setTimeout(() => setMessage(""), 2600);
    };

    const handle = useCallback((data) => {
        if (handled.current) return;
        const result = parseScannedInvite(data, webHost ? [webHost] : []);
        if (result.code) {
            handled.current = true; // the camera reports the same code many times a second
            setActive(false);
            router.replace(`/join/${encodeURIComponent(result.code)}`);
            return;
        }
        // Don't keep flashing the same wrong code while it stays in view.
        const now = Date.now();
        if (lastBad.current.data === data && now - lastBad.current.at < 3000) return;
        lastBad.current = { data, at: now };
        flash(result.error);
    }, []);

    const pickFromPhotos = async () => {
        try {
            const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
            if (res.canceled || !res.assets?.[0]?.uri) return;
            const found = await scanFromURLAsync(res.assets[0].uri, ["qr"]);
            if (!found?.length) {
                flash("No QR code found in that photo. Try a clearer screenshot.");
                return;
            }
            handle(found[0].data);
        } catch {
            flash("Couldn't read that photo. Try another one, or type the code.");
        }
    };

    const styles = getStyles(colors);
    const granted = permission?.granted;

    return (
        <View style={styles.root}>
            {granted && active && (
                <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    enableTorch={torch}
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    onBarcodeScanned={({ data }) => handle(data)}
                />
            )}

            <SafeAreaView style={styles.overlay} edges={["top", "bottom"]}>
                <View style={styles.topBar}>
                    <RoundButton onPress={() => router.back()} label="Back" size={44}>
                        <ChevronLeft size={22} color={colors.text} />
                    </RoundButton>
                    <Text style={[styles.topTitle, granted && styles.onCamera]}>Scan invite QR</Text>
                    {granted ? (
                        <RoundButton onPress={() => setTorch((v) => !v)} label={torch ? "Turn off light" : "Turn on light"} size={44} active={torch}>
                            {torch ? <FlashlightOff size={19} color={colors.onPrimary} /> : <Flashlight size={19} color={colors.text} />}
                        </RoundButton>
                    ) : <View style={{ width: 44 }} />}
                </View>

                {permission && !granted ? (
                    <View style={styles.permission}>
                        <View style={styles.permIcon}><Camera size={28} color={colors.text} /></View>
                        <Text style={styles.permTitle}>Allow camera to scan</Text>
                        <Text style={styles.permText}>
                            SplitEase only uses the camera here, to read the group{"'"}s invite QR code.
                        </Text>
                        {permission.canAskAgain ? (
                            <PillButton label="Allow camera" onPress={requestPermission} style={styles.fullBtn} />
                        ) : (
                            <PillButton label="Open settings" onPress={() => Linking.openSettings()} style={styles.fullBtn} />
                        )}
                        <PillButton label="Choose a photo instead" variant="secondary" onPress={pickFromPhotos}
                            icon={<ImageIcon size={16} color={colors.text} />} style={styles.fullBtn} />
                    </View>
                ) : (
                    <View style={styles.frameWrap} pointerEvents="none">
                        <View style={styles.frame}>
                            <View style={[styles.corner, styles.tl]} />
                            <View style={[styles.corner, styles.tr]} />
                            <View style={[styles.corner, styles.bl]} />
                            <View style={[styles.corner, styles.br]} />
                        </View>
                        <Text style={[styles.hint, styles.onCamera]}>Point at the QR code from the group&apos;s invite</Text>
                    </View>
                )}

                <View style={styles.bottom}>
                    {!!message && (
                        <View style={styles.toast}><Text style={styles.toastText}>{message}</Text></View>
                    )}
                    {granted && (
                        <View style={styles.row}>
                            <PillButton label="From photos" variant="secondary" onPress={pickFromPhotos}
                                icon={<ImageIcon size={16} color={colors.text} />} style={styles.flexBtn} />
                            <PillButton label="Type code" variant="secondary" onPress={() => router.replace("/join")}
                                icon={<KeyRound size={16} color={colors.text} />} style={styles.flexBtn} />
                        </View>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}

/** Shown when this installed build has no camera module (needs a newer build). */
function ScanUnavailableScreen() {
    const { colors } = useDesign();
    const styles = getStyles(colors);
    return (
        <View style={styles.root}>
            <SafeAreaView style={styles.overlay} edges={["top", "bottom"]}>
                <View style={styles.topBar}>
                    <RoundButton onPress={() => router.back()} label="Back" size={44}>
                        <ChevronLeft size={22} color={colors.text} />
                    </RoundButton>
                    <Text style={[styles.topTitle, styles.onCamera]}>Scan invite QR</Text>
                    <View style={{ width: 44 }} />
                </View>
                <View style={styles.permission}>
                    <View style={styles.permIcon}><Camera size={28} color={colors.text} /></View>
                    <Text style={styles.permTitle}>Scanning needs an app update</Text>
                    <Text style={styles.permText}>
                        This version of the app can{"'"}t open the camera yet. Update SplitEase, or type the invite code instead.
                    </Text>
                    <PillButton label="Type the code" onPress={() => router.replace("/join")}
                        icon={<KeyRound size={16} color={colors.onPrimary} />} style={styles.fullBtn} />
                </View>
                <View />
            </SafeAreaView>
        </View>
    );
}

export default function ScanRoute() {
    return CameraView && useCameraPermissions ? <ScanInviteScreen /> : <ScanUnavailableScreen />;
}

const FRAME = 248;
const getStyles = (colors) => StyleSheet.create({
    root: { flex: 1, backgroundColor: "#000" },
    overlay: { flex: 1, justifyContent: "space-between" },
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 8 : 0 },
    topTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
    onCamera: { color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 },
    frameWrap: { alignItems: "center", gap: 18 },
    frame: { width: FRAME, height: FRAME },
    corner: { position: "absolute", width: 36, height: 36, borderColor: "#FFFFFF" },
    tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 },
    tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 },
    br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 },
    hint: { fontSize: 14, fontWeight: "600", textAlign: "center", paddingHorizontal: 32 },
    permission: {
        marginHorizontal: 20, padding: 22, borderRadius: 24, backgroundColor: colors.background,
        alignItems: "center", gap: 10,
    },
    permIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
    permTitle: { fontSize: 19, fontWeight: "800", color: colors.text },
    permText: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
    fullBtn: { alignSelf: "stretch", marginTop: 4 },
    bottom: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
    toast: { alignSelf: "center", backgroundColor: "rgba(17,17,17,0.88)", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, maxWidth: 360 },
    toastText: { color: "#FFFFFF", fontSize: 13.5, textAlign: "center" },
    row: { flexDirection: "row", gap: 10 },
    flexBtn: { flex: 1 },
});
