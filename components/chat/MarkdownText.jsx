import { Text } from "@/components/ui/Typography";
import { FONTS } from "@/constants/typography";
import { Fragment, useMemo } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";

/**
 * Tiny, dependency-free Markdown renderer for AI answers.
 *
 * AI models reply in Markdown (**bold**, lists, headings, tables…). Shown as
 * plain text those asterisks look broken, so this turns them into real
 * formatting. Supported:
 *   blocks : # / ## / ### headings · - * • bullets · 1. numbered lists ·
 *            > quotes · ``` code blocks ``` · | tables | · --- dividers ·
 *            blank-line paragraphs
 *   inline : **bold** · __bold__ · *italic* · `code` · [link](url)
 * Anything unrecognised renders as normal text, and stray markers (an
 * unmatched ** or #) are cleaned up instead of shown.
 */

// ── Inline ──────────────────────────────────────────────────────────────────
// (No lookbehind: keeps the regex safe on every JS engine. _single_ underscores
// are NOT treated as italics — they show up in names/ids far more often.)
const INLINE_SRC = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|`[^`\n]+?`|\[[^\]\n]+?\]\([^)\s]+?\)|\*[^*\s][^*\n]*?\*)/g;

const cleanStray = (s) => s.replace(/\*\*|__/g, "").replace(/(^|\s)\*(\s|$)/g, "$1$2");

function renderInline(text, st, keyBase = "i") {
    // A fresh RegExp per call: renderInline recurses (bold inside a line), and a
    // shared /g regex would have its lastIndex reset by the inner call → endless loop.
    const re = new RegExp(INLINE_SRC.source, "g");
    const out = [];
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
        if (m.index > last) out.push(cleanStray(text.slice(last, m.index)));
        const tok = m[0];
        const k = `${keyBase}-${m.index}`;
        if (tok.startsWith("**") || tok.startsWith("__")) {
            out.push(<Text key={k} style={st.bold}>{renderInline(tok.slice(2, -2), st, k)}</Text>);
        } else if (tok.startsWith("`")) {
            out.push(<Text key={k} style={st.codeInline}>{tok.slice(1, -1)}</Text>);
        } else if (tok.startsWith("[")) {
            const [, label, url] = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/) || [];
            const safe = /^https?:\/\//i.test(url || "");
            out.push(
                <Text key={k} style={safe ? st.link : null} onPress={safe ? () => Linking.openURL(url) : undefined}>
                    {label}
                </Text>
            );
        } else {
            out.push(<Text key={k} style={st.italic}>{tok.slice(1, -1)}</Text>);
        }
        last = m.index + tok.length;
    }
    if (last < text.length) out.push(cleanStray(text.slice(last)));
    return out;
}

// ── Blocks ──────────────────────────────────────────────────────────────────
export function parseBlocks(md) {
    const lines = String(md || "").replace(/\r\n?/g, "\n").split("\n");
    const blocks = [];
    let para = [];
    const flushPara = () => {
        if (para.length) blocks.push({ type: "p", text: para.join("\n") });
        para = [];
    };

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const line = raw.trim();

        if (line.startsWith("```")) {
            flushPara();
            const code = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
            blocks.push({ type: "code", text: code.join("\n") });
            continue;
        }
        if (!line) { flushPara(); continue; }
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) { flushPara(); blocks.push({ type: "hr" }); continue; }

        const h = line.match(/^(#{1,6})\s+(.*)$/);
        if (h) { flushPara(); blocks.push({ type: "h", level: h[1].length, text: h[2].replace(/#+$/, "").trim() }); continue; }

        if (line.startsWith("|")) {
            flushPara();
            const rows = [];
            while (i < lines.length && lines[i].trim().startsWith("|")) {
                const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
                const isSeparator = cells.every((c) => /^:?-{2,}:?$/.test(c));
                if (!isSeparator) rows.push(cells);
                i++;
            }
            i--;
            if (rows.length) blocks.push({ type: "table", rows });
            continue;
        }

        const bullet = raw.match(/^(\s*)[-*•+]\s+(.*)$/);
        if (bullet) {
            flushPara();
            const item = { type: "li", indent: Math.min(Math.floor(bullet[1].length / 2), 3), text: bullet[2] };
            blocks.push(item);
            continue;
        }
        const num = raw.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
        if (num) {
            flushPara();
            blocks.push({ type: "ol", indent: Math.min(Math.floor(num[1].length / 2), 3), n: num[2], text: num[3] });
            continue;
        }
        const quote = line.match(/^>\s?(.*)$/);
        if (quote) { flushPara(); blocks.push({ type: "quote", text: quote[1] }); continue; }

        para.push(line);
    }
    flushPara();
    return blocks;
}

export default function MarkdownText({ children, color, mutedColor, borderColor, surfaceColor, fontSize = 15 }) {
    const st = useMemo(() => makeStyles({ color, mutedColor, borderColor, surfaceColor, fontSize }), [color, mutedColor, borderColor, surfaceColor, fontSize]);
    const blocks = useMemo(() => parseBlocks(children), [children]);

    return (
        <View style={st.root}>
            {blocks.map((b, i) => {
                const k = `b${i}`;
                const spaced = i > 0 ? st.gap : null;
                switch (b.type) {
                    case "h":
                        return <Text key={k} style={[b.level <= 2 ? st.h2 : st.h3, spaced]}>{renderInline(b.text, st, k)}</Text>;
                    case "li":
                    case "ol": {
                        const prev = blocks[i - 1];
                        const tight = prev && (prev.type === "li" || prev.type === "ol");
                        return (
                            <View key={k} style={[st.listRow, { marginLeft: b.indent * 16 }, tight ? st.tight : spaced]}>
                                <Text style={st.marker}>{b.type === "ol" ? `${b.n}.` : "•"}</Text>
                                <Text style={st.listText}>{renderInline(b.text, st, k)}</Text>
                            </View>
                        );
                    }
                    case "quote":
                        return (
                            <View key={k} style={[st.quote, spaced]}>
                                <Text style={st.quoteText}>{renderInline(b.text, st, k)}</Text>
                            </View>
                        );
                    case "code":
                        return (
                            <View key={k} style={[st.codeBlock, spaced]}>
                                <Text style={st.codeText}>{b.text}</Text>
                            </View>
                        );
                    case "table":
                        return (
                            <View key={k} style={[st.table, spaced]}>
                                {b.rows.map((row, r) => (
                                    <View key={r} style={[st.tr, r > 0 && st.trBorder]}>
                                        {row.map((cell, c) => (
                                            <Text key={c} style={[st.td, r === 0 && st.th]}>{renderInline(cell, st, `${k}-${r}-${c}`)}</Text>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        );
                    case "hr":
                        return <View key={k} style={[st.hr, spaced]} />;
                    default:
                        return (
                            <Text key={k} style={[st.p, spaced]}>
                                {b.text.split("\n").map((ln, j) => (
                                    <Fragment key={j}>
                                        {j > 0 ? "\n" : null}
                                        {renderInline(ln, st, `${k}-${j}`)}
                                    </Fragment>
                                ))}
                            </Text>
                        );
                }
            })}
        </View>
    );
}

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

const makeStyles = ({ color, mutedColor, borderColor, surfaceColor, fontSize }) =>
    StyleSheet.create({
        root: {},
        gap: { marginTop: 10 },
        tight: { marginTop: 5 },
        p: { fontSize, lineHeight: fontSize * 1.45, color },
        bold: { fontWeight: "700", fontFamily: FONTS.bold },
        italic: { fontStyle: "italic" },
        link: { textDecorationLine: "underline", fontWeight: "600" },
        codeInline: { fontFamily: MONO, fontSize: fontSize - 1.5, backgroundColor: surfaceColor, color },
        h2: { fontSize: fontSize + 3, lineHeight: (fontSize + 3) * 1.3, fontWeight: "700", color, letterSpacing: -0.2 },
        h3: { fontSize: fontSize + 1, lineHeight: (fontSize + 1) * 1.35, fontWeight: "600", color },
        listRow: { flexDirection: "row", alignItems: "flex-start", paddingRight: 4 },
        marker: { width: 20, fontSize, lineHeight: fontSize * 1.45, color: mutedColor, fontWeight: "600" },
        listText: { flex: 1, fontSize, lineHeight: fontSize * 1.45, color },
        quote: { borderLeftWidth: 3, borderLeftColor: borderColor, paddingLeft: 10 },
        quoteText: { fontSize, lineHeight: fontSize * 1.45, color: mutedColor },
        codeBlock: { backgroundColor: surfaceColor, borderRadius: 12, padding: 12 },
        codeText: { fontFamily: MONO, fontSize: fontSize - 2, lineHeight: (fontSize - 2) * 1.5, color },
        table: { borderWidth: StyleSheet.hairlineWidth, borderColor, borderRadius: 12, overflow: "hidden" },
        tr: { flexDirection: "row" },
        trBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: borderColor },
        td: { flex: 1, paddingHorizontal: 10, paddingVertical: 8, fontSize: fontSize - 1.5, lineHeight: (fontSize - 1.5) * 1.4, color },
        th: { fontWeight: "600", backgroundColor: surfaceColor },
        hr: { height: StyleSheet.hairlineWidth, backgroundColor: borderColor },
    });
