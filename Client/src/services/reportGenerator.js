import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Colour palette (matches EcoPackAI dark theme) ──────────────────────────
const C = {
    accent: [0, 255, 213],
    dark: [6, 13, 19],
    surface: [15, 30, 45],
    card: [10, 22, 35],
    muted: [100, 116, 139],
    white: [240, 244, 248],
    blue: [76, 201, 240],
    yellow: [255, 209, 102],
    red: [255, 77, 109],
    green: [74, 222, 128],
    rank: [
        [0, 255, 213],
        [76, 201, 240],
        [255, 209, 102],
        [100, 116, 139],
        [80, 96, 115],
    ],
};

// ─── Safe text helper — strips chars jsPDF built-in fonts can't render ───────
// jsPDF's helvetica/courier only covers Latin-1 (ISO-8859-1).
// Anything outside that range (rupee sign U+20B9, special Unicode bullets,
// subscripts, etc.) renders as a box or garbled glyph.
function safe(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        // Rupee sign → "Rs." (U+20B9 not in Latin-1)
        .replace(/₹/g, "Rs.")
        // CO₂ subscript → plain CO2
        .replace(/CO₂/g, "CO2")
        // Unicode bullets / decorative chars used in the old file
        .replace(/◆/g, ">>")
        .replace(/◉/g, "*")
        // em-dash, en-dash
        .replace(/[–—]/g, "-")
        // Smart quotes
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        // Degree sign is OK in Latin-1, leave it
        // Strip anything still outside Latin-1 range
        .replace(/[^\x00-\xFF]/g, "?");
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────
function setFill(doc, arr) { doc.setFillColor(...arr); }
function setDraw(doc, arr) { doc.setDrawColor(...arr); }
function setFont(doc, arr) { doc.setTextColor(...arr); }

function hLine(doc, y, x1 = 14, x2 = 196, color = C.accent, lw = 0.4) {
    setDraw(doc, color);
    doc.setLineWidth(lw);
    doc.line(x1, y, x2, y);
}

function badge(doc, x, y, label, bgColor, textColor = C.dark) {
    const safeLabel = safe(label);
    const pad = 4;
    doc.setFontSize(8);
    const w = doc.getTextWidth(safeLabel) + pad * 2;
    setFill(doc, bgColor);
    doc.roundedRect(x, y - 5, w, 7, 1.5, 1.5, "F");
    setFont(doc, textColor);
    doc.text(safeLabel, x + pad, y);
    return w;
}

function scoreBar(doc, x, y, value, maxVal, barW = 60, barH = 3, color = C.accent) {
    const pct = Math.min(1, (value || 0) / (maxVal || 1));
    setFill(doc, [30, 50, 65]);
    doc.roundedRect(x, y, barW, barH, 1, 1, "F");
    if (pct > 0) {
        setFill(doc, color);
        doc.roundedRect(x, y, barW * pct, barH, 1, 1, "F");
    }
}

function ecoTagColor(tag) {
    if (!tag) return C.muted;
    const t = tag.toLowerCase();
    if (t.includes("ultra")) return C.accent;
    if (t.includes("eco")) return C.green;
    return C.blue;
}

function tierColor(tier) {
    const map = {
        Excellent: C.accent,
        Good: C.blue,
        Moderate: C.yellow,
        Poor: C.red,
    };
    return map[tier] ?? C.muted;
}

// ─── Page helpers ─────────────────────────────────────────────────────────────
function addPageBackground(doc) {
    setFill(doc, C.dark);
    doc.rect(0, 0, 210, 297, "F");
    // subtle grid overlay
    setDraw(doc, [255, 255, 255]);
    doc.setLineWidth(0.05);
    doc.setGState(new doc.GState({ opacity: 0.025 }));
    for (let x = 0; x <= 210; x += 20) doc.line(x, 0, x, 297);
    for (let y = 0; y <= 297; y += 20) doc.line(0, y, 210, y);
    doc.setGState(new doc.GState({ opacity: 1 }));
}

function pageFooter(doc, pageNum, total) {
    const y = 287;
    hLine(doc, y - 4, 14, 196, C.surface, 0.3);
    doc.setFontSize(8);
    setFont(doc, C.muted);
    doc.setFont("helvetica", "normal");
    doc.text("EcoPackAI - Sustainability Report", 14, y);
    doc.text(`Page ${pageNum} of ${total}`, 196, y, { align: "right" });
    doc.text(
        new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        105, y, { align: "center" }
    );
}

function sectionHeading(doc, y, title) {
    // Use plain ">>" prefix — safe for all PDF fonts
    setFont(doc, C.accent);
    doc.setFontSize(9);
    doc.setFont("courier", "bold");
    doc.text(`>> ${title.toUpperCase()}`, 14, y);
    hLine(doc, y + 2, 14, 196, C.accent, 0.3);
    return y + 10;
}

// ─── Normalise a material to safe display values ──────────────────────────────
// The API response (after normaliseMaterial()) uses these keys:
//   material_name, material_type, rank, match_score,
//   sustainability_score, sustainability_tier,
//   strength_score, weight_capacity_score,
//   biodegradability, recyclability, co2_emission_score,
//   eco_score, performance_score, eco_performance_ratio,
//   is_biodegradable, is_recyclable, dual_end_of_life,
//   eco_tag, reason, co2_savings_percent, final_score
function norm(m) {
    return {
        rank: m.rank ?? 0,
        name: safe(m.material_name ?? "Unknown"),
        type: safe(m.material_type ?? "—"),
        sustainabilityScore: parseFloat((m.sustainability_score ?? 0).toFixed(1)),
        sustainabilityTier: safe(m.sustainability_tier ?? "—"),
        strengthScore: parseFloat((m.strength_score ?? 0).toFixed(1)),
        weightCapScore: parseFloat((m.weight_capacity_score ?? 0).toFixed(1)),
        biodegradability: parseFloat((m.biodegradability ?? 0).toFixed(1)),
        recyclability: parseFloat((m.recyclability ?? 0).toFixed(1)),
        co2Score: parseFloat((m.co2_emission_score ?? 0).toFixed(1)),
        ecoScore: parseFloat((m.eco_score ?? 0).toFixed(1)),
        perfScore: parseFloat((m.performance_score ?? 0).toFixed(1)),
        ecoTag: safe(m.eco_tag ?? ""),
        reason: safe(m.reason ?? ""),
        isBio: m.is_biodegradable ?? false,
        isRec: m.is_recyclable ?? false,
        dualEOL: m.dual_end_of_life ?? false,
        co2Savings: parseFloat((m.co2_savings_percent ?? 0).toFixed(1)),
        matchScore: parseFloat((m.match_score ?? 0).toFixed(1)),
        similarityToReq: safe(m.similarity_to_request ?? "—"),
    };
}

// ─── Cover page ──────────────────────────────────────────────────────────────
function buildCoverPage(doc, materials, params, rankSource, wizardContext) {
    addPageBackground(doc);

    // Accent bar — left edge
    setFill(doc, C.accent);
    doc.rect(0, 0, 4, 297, "F");

    // Logo
    doc.setFontSize(10);
    setFont(doc, C.accent);
    doc.setFont("courier", "bold");
    doc.text("ECOPACKAI", 20, 22);
    doc.setFontSize(7);
    doc.setFont("courier", "normal");
    setFont(doc, C.muted);
    doc.text("v2.0  -  AI-POWERED PACKAGING INTELLIGENCE", 20, 28);

    if (rankSource) {
        badge(doc, 148, 24, safe(`Ranked by ${rankSource}`), C.blue, C.dark);
    }

    hLine(doc, 35, 14, 196, C.accent, 0.5);

    // Main title
    doc.setFontSize(28);
    doc.setFont("courier", "bold");
    setFont(doc, C.white);
    doc.text("Sustainability", 14, 62);
    setFont(doc, C.accent);
    doc.text("Intelligence", 14, 78);
    doc.setFontSize(12);
    setFont(doc, C.muted);
    doc.setFont("courier", "normal");
    doc.text("Report", 14, 90);

    doc.setFontSize(10);
    setFont(doc, [150, 170, 190]);
    doc.setFont("helvetica", "normal");
    doc.text("AI-powered packaging material analysis & recommendation", 14, 100);

    hLine(doc, 108, 14, 196, C.surface, 0.8);

    // Wizard context block
    let cy = 118;
    if (wizardContext && Object.keys(wizardContext).length > 0) {
        doc.setFontSize(8);
        doc.setFont("courier", "bold");
        setFont(doc, C.accent);
        doc.text("PRODUCT PROFILE", 14, cy);
        cy += 6;

        const ctxMap = {
            product: "Product Type",
            fragility: "Fragility",
            weight: "Unit Weight",
            eco_priority: "Eco Priority",
            compost: "End-of-Life",
        };

        Object.entries(ctxMap).forEach(([key, label]) => {
            if (wizardContext[key]) {
                setFont(doc, C.muted);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.text(`${label}:`, 14, cy);
                setFont(doc, C.white);
                doc.text(safe(wizardContext[key]), 58, cy);
                cy += 7;
            }
        });
        cy += 4;
    }

    // Parameters pills
    if (params) {
        hLine(doc, cy, 14, 196, C.surface, 0.5);
        cy += 8;
        doc.setFontSize(8);
        doc.setFont("courier", "bold");
        setFont(doc, C.accent);
        doc.text("ANALYSIS PARAMETERS", 14, cy);
        cy += 8;

        const paramDefs = [
            { key: "strength", label: "Strength", unit: "/5" },
            { key: "weight_capacity", label: "Weight Cap.", unit: "/5" },
            { key: "biodegradability", label: "Biodegradability", unit: "%" },
            { key: "recyclability", label: "Recyclability", unit: "%" },
            { key: "co2_emission", label: "CO2 Eco-Score", unit: "%" },
        ];

        let px = 14;
        paramDefs.forEach(({ key, label, unit }) => {
            if (params[key] !== undefined) {
                setFill(doc, C.surface);
                doc.roundedRect(px, cy - 5, 36, 16, 2, 2, "F");
                setDraw(doc, C.accent);
                doc.setLineWidth(0.2);
                doc.roundedRect(px, cy - 5, 36, 16, 2, 2, "S");

                setFont(doc, C.muted);
                doc.setFontSize(6.5);
                doc.setFont("helvetica", "normal");
                doc.text(label, px + 3, cy + 1);

                setFont(doc, C.accent);
                doc.setFont("courier", "bold");
                doc.setFontSize(11);
                doc.text(`${params[key]}${unit}`, px + 3, cy + 9);

                px += 39;
            }
        });
        cy += 24;
    }

    // Top material highlight card
    if (materials.length) {
        const top = norm(materials[0]);
        const tc = tierColor(top.sustainabilityTier);

        hLine(doc, cy, 14, 196, C.surface, 0.5);
        cy += 10;

        setFill(doc, [8, 25, 38]);
        doc.roundedRect(14, cy - 6, 182, 38, 3, 3, "F");
        setDraw(doc, C.accent);
        doc.setLineWidth(0.4);
        doc.roundedRect(14, cy - 6, 182, 38, 3, 3, "S");

        // Top rec label
        doc.setFontSize(7.5);
        setFont(doc, C.muted);
        doc.setFont("helvetica", "normal");
        doc.text("TOP RECOMMENDATION", 22, cy + 2);

        // Material name
        setFont(doc, C.accent);
        doc.setFont("courier", "bold");
        doc.setFontSize(13);
        doc.text(top.name, 22, cy + 12);

        // Type + tier
        setFont(doc, C.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(top.type, 22, cy + 20);

        // Tier badge
        badge(doc, 22, cy + 29, top.sustainabilityTier, tc, C.dark);

        // Right side stats
        const rx = 110;
        const statRows = [
            { label: "Sustainability Score", val: `${top.sustainabilityScore}/100`, bar: top.sustainabilityScore, max: 100, color: C.accent },
            { label: "CO2 Eco-Score", val: `${top.co2Score}/100`, bar: top.co2Score, max: 100, color: C.yellow },
            { label: "Recyclability", val: `${top.recyclability}%`, bar: top.recyclability, max: 100, color: C.blue },
        ];
        statRows.forEach((s, si) => {
            const sy = cy + 3 + si * 11;
            setFont(doc, C.muted);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.text(s.label, rx, sy);
            setFont(doc, C.white);
            doc.setFont("courier", "bold");
            doc.setFontSize(8);
            doc.text(s.val, rx + 44, sy);
            scoreBar(doc, rx, sy + 1.5, s.bar, s.max, 42, 3, s.color);
        });

        // Eco flags
        const flags = [];
        if (top.isBio) flags.push("Biodegradable");
        if (top.isRec) flags.push("Recyclable");
        if (top.dualEOL) flags.push("Dual EOL");
        if (flags.length) {
            let fx = 22;
            flags.forEach(f => {
                fx += badge(doc, fx, cy + 29, f, C.green, C.dark) + 4;
            });
        }

        cy += 42;
    }

    // Footer meta
    setFont(doc, C.muted);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(
        `Generated on ${new Date().toLocaleString("en-IN")}`,
        14, 278
    );
    doc.text("EcoPackAI  |  AI-Powered Sustainable Packaging Platform", 14, 284);
}

// ─── Materials detail page ────────────────────────────────────────────────────
function buildMaterialsPage(doc, materials) {
    doc.addPage();
    addPageBackground(doc);

    let y = sectionHeading(doc, 18, "Material Recommendations");

    materials.forEach((raw, i) => {
        const m = norm(raw);
        const tc = tierColor(m.sustainabilityTier);

        if (y > 252) {
            pageFooter(doc, doc.internal.getNumberOfPages(), "—");
            doc.addPage();
            addPageBackground(doc);
            y = 18;
        }

        const cardH = 52;

        // Card background
        setFill(doc, C.card);
        doc.roundedRect(14, y, 182, cardH, 3, 3, "F");

        // Rank badge stripe
        const rankCol = C.rank[i] ?? C.muted;
        setFill(doc, rankCol);
        doc.roundedRect(14, y, 14, cardH, 3, 3, "F");
        doc.rect(20, y, 8, cardH, "F"); // square off the right side of badge
        setFont(doc, C.dark);
        doc.setFont("courier", "bold");
        doc.setFontSize(10);
        doc.text(`#${m.rank}`, 15.5, y + 28);

        // ── Left column: name, type, flags, reason ──
        const lx = 32;

        setFont(doc, C.white);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.text(m.name, lx, y + 10);

        // Type pill
        setFont(doc, C.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text(m.type, lx, y + 17);

        // Tier badge
        const tierBadgeW = badge(doc, lx, y + 25, m.sustainabilityTier, tc, C.dark);

        // Eco tag
        if (m.ecoTag) {
            badge(doc, lx + tierBadgeW + 4, y + 25, m.ecoTag, ecoTagColor(m.ecoTag), C.dark);
        }

        // Eco flags
        const flags = [];
        if (m.isBio) flags.push("Bio");
        if (m.isRec) flags.push("Rec");
        if (m.dualEOL) flags.push("Dual EOL");
        if (flags.length) {
            setFont(doc, C.green);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.text(flags.join("  |  "), lx, y + 33);
        }

        // Reason text (truncated to single line)
        if (m.reason) {
            const maxW = 76;
            const reasonLines = doc.splitTextToSize(m.reason, maxW);
            setFont(doc, [140, 160, 180]);
            doc.setFontSize(7);
            doc.text(reasonLines[0] + (reasonLines.length > 1 ? "..." : ""), lx, y + 42);
        }

        // ── Right column: metrics ──
        const rx = 115;

        // Sustainability score (prominent)
        setFont(doc, tc);
        doc.setFont("courier", "bold");
        doc.setFontSize(18);
        doc.text(`${m.sustainabilityScore}`, rx, y + 14);
        setFont(doc, C.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text("/ 100  sustainability score", rx + 14, y + 14);

        // Bar metrics
        const metrics = [
            { label: "CO2 Score", val: m.co2Score, max: 100, color: C.yellow, disp: `${m.co2Score}` },
            { label: "Biodegradability", val: m.biodegradability, max: 100, color: C.green, disp: `${m.biodegradability}%` },
            { label: "Recyclability", val: m.recyclability, max: 100, color: C.blue, disp: `${m.recyclability}%` },
            { label: "Eco Score", val: m.ecoScore, max: 100, color: C.accent, disp: `${m.ecoScore}` },
        ];

        metrics.forEach((mt, mi) => {
            const my = y + 22 + mi * 8;
            setFont(doc, C.muted);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.5);
            doc.text(mt.label, rx, my);
            scoreBar(doc, rx + 28, my - 3, mt.val, mt.max, 44, 3.5, mt.color);
            setFont(doc, C.white);
            doc.setFont("courier", "bold");
            doc.setFontSize(7);
            doc.text(mt.disp, rx + 74, my);
        });

        // Card border
        setDraw(doc, [20, 45, 65]);
        doc.setLineWidth(0.3);
        doc.roundedRect(14, y, 182, cardH, 3, 3, "S");

        y += cardH + 5;
    });

    return y;
}

// ─── Analytics summary page ───────────────────────────────────────────────────
function buildAnalyticsPage(doc, materials) {
    doc.addPage();
    addPageBackground(doc);

    let y = sectionHeading(doc, 18, "Analytics Summary");

    // Comparison table — all real fields
    autoTable(doc, {
        startY: y,
        head: [[
            "Rank", "Material", "Type",
            "Sus. Score", "Tier",
            "CO2 Score", "Recycle %", "Bio %",
            "Eco Score", "Perf. Score",
            "Strength", "Wt Cap",
            "Flags",
        ]],
        body: materials.map(raw => {
            const m = norm(raw);
            const flags = [
                m.isBio ? "Bio" : "",
                m.isRec ? "Rec" : "",
                m.dualEOL ? "Dual" : "",
            ].filter(Boolean).join(" | ") || "-";
            return [
                `#${m.rank}`,
                m.name,
                m.type,
                `${m.sustainabilityScore}`,
                m.sustainabilityTier,
                `${m.co2Score}`,
                `${m.recyclability}%`,
                `${m.biodegradability}%`,
                `${m.ecoScore}`,
                `${m.perfScore}`,
                `${m.strengthScore}`,
                `${m.weightCapScore}`,
                flags,
            ];
        }),
        styles: {
            font: "helvetica",
            fontSize: 7,
            textColor: [200, 215, 230],
            fillColor: C.card,
            lineColor: [20, 45, 65],
            lineWidth: 0.2,
            cellPadding: 2,
        },
        headStyles: {
            font: "courier",
            fontSize: 6.5,
            textColor: C.accent,
            fillColor: [6, 18, 28],
            fontStyle: "bold",
        },
        alternateRowStyles: {
            fillColor: [14, 28, 42],
        },
        columnStyles: {
            0: { cellWidth: 9, halign: "center" },
            1: { cellWidth: 34 },
            2: { cellWidth: 18 },
            3: { cellWidth: 15, halign: "right" },
            4: { cellWidth: 16 },
            5: { cellWidth: 14, halign: "right" },
            6: { cellWidth: 15, halign: "right" },
            7: { cellWidth: 13, halign: "right" },
            8: { cellWidth: 14, halign: "right" },
            9: { cellWidth: 14, halign: "right" },
            10: { cellWidth: 13, halign: "right" },
            11: { cellWidth: 13, halign: "right" },
            12: { cellWidth: 18 },
        },
        margin: { left: 14, right: 14 },
        // Row styling: colour tier column
        didParseCell: (data) => {
            if (data.column.index === 4 && data.section === "body") {
                const tier = data.cell.text[0];
                const map = {
                    Excellent: C.accent,
                    Good: C.blue,
                    Moderate: C.yellow,
                    Poor: C.red,
                };
                if (map[tier]) data.cell.styles.textColor = map[tier];
            }
        },
    });

    y = doc.lastAutoTable.finalY + 14;

    // ── Scores breakdown mini-section ─────────────────────────────────────────
    if (y < 230) {
        y = sectionHeading(doc, y, "Score Breakdown per Material");

        materials.forEach((raw, idx) => {
            const m = norm(raw);
            const tc = tierColor(m.sustainabilityTier);

            if (y > 262) {
                pageFooter(doc, doc.internal.getNumberOfPages(), "—");
                doc.addPage();
                addPageBackground(doc);
                y = 18;
            }

            const bx = 14 + (idx % 2) * 95;
            const bw = 88;
            const bh = 28;
            const by = y;

            if (idx % 2 === 0 && idx !== 0) y += bh + 4;
            if (idx === 0) { /* first row starts at current y */ }

            setFill(doc, C.card);
            doc.roundedRect(bx, by, bw, bh, 2, 2, "F");
            setDraw(doc, tc);
            doc.setLineWidth(0.25);
            doc.roundedRect(bx, by, bw, bh, 2, 2, "S");

            setFont(doc, tc);
            doc.setFont("courier", "bold");
            doc.setFontSize(8);
            doc.text(`#${m.rank} ${m.name}`, bx + 3, by + 7);

            const mini = [
                { l: "Sus.", v: m.sustainabilityScore, max: 100, c: C.accent },
                { l: "CO2", v: m.co2Score, max: 100, c: C.yellow },
                { l: "Bio", v: m.biodegradability, max: 100, c: C.green },
                { l: "Rec", v: m.recyclability, max: 100, c: C.blue },
            ];
            mini.forEach((mi, mii) => {
                const mx = bx + 3 + mii * 21;
                setFont(doc, C.muted);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(6);
                doc.text(mi.l, mx, by + 15);
                scoreBar(doc, mx, by + 17, mi.v, mi.max, 18, 3, mi.c);
                setFont(doc, C.white);
                doc.setFont("courier", "bold");
                doc.setFontSize(6.5);
                doc.text(`${mi.v}`, mx, by + 25);
            });

            if (idx % 2 === 1) y += bh + 4;
        });

        if (materials.length % 2 !== 0) y += 28 + 4;
        y += 6;
    }

    // ── Key Insights ──────────────────────────────────────────────────────────
    if (y < 250) {
        y = sectionHeading(doc, y, "Key Insights");

        const sorted = {
            topSus: [...materials].sort((a, b) => (b.sustainability_score ?? 0) - (a.sustainability_score ?? 0))[0],
            topCO2: [...materials].sort((a, b) => (b.co2_emission_score ?? 0) - (a.co2_emission_score ?? 0))[0],
            topRecycle: [...materials].sort((a, b) => (b.recyclability ?? 0) - (a.recyclability ?? 0))[0],
            topBio: [...materials].sort((a, b) => (b.biodegradability ?? 0) - (a.biodegradability ?? 0))[0],
        };

        const insights = [
            {
                color: C.accent,
                title: "Highest Sustainability Score",
                body: `${safe(sorted.topSus?.material_name)} achieved the highest sustainability score of ${(sorted.topSus?.sustainability_score ?? 0).toFixed(1)}/100 (${safe(sorted.topSus?.sustainability_tier ?? "")} tier), making it the top eco choice overall.`,
            },
            {
                color: C.yellow,
                title: "Best CO2 Eco-Score",
                body: `${safe(sorted.topCO2?.material_name)} leads on CO2 impact with a score of ${(sorted.topCO2?.co2_emission_score ?? 0).toFixed(1)}/100 — a higher score means lower carbon footprint during production.`,
            },
            {
                color: C.blue,
                title: "Best Recyclability",
                body: `${safe(sorted.topRecycle?.material_name)} has the highest recyclability at ${(sorted.topRecycle?.recyclability ?? 0).toFixed(1)}%, supporting circular economy and kerbside collection compliance.`,
            },
            {
                color: C.green,
                title: "Most Biodegradable",
                body: `${safe(sorted.topBio?.material_name)} scores highest on biodegradability at ${(sorted.topBio?.biodegradability ?? 0).toFixed(1)}%, making it ideal for composting and natural end-of-life scenarios.`,
            },
        ];

        insights.forEach((ins) => {
            if (y > 262) {
                pageFooter(doc, doc.internal.getNumberOfPages(), "—");
                doc.addPage();
                addPageBackground(doc);
                y = 18;
            }

            // Dot
            setFill(doc, ins.color);
            doc.circle(17, y - 1.5, 2, "F");

            setFont(doc, ins.color);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text(ins.title, 22, y);

            setFont(doc, [170, 190, 210]);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            const lines = doc.splitTextToSize(ins.body, 166);
            doc.text(lines, 22, y + 6);
            y += 6 + lines.length * 5 + 7;
        });
    }

    return y;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generateReport(materials, params, rankSource, wizardContext = {}) {
    if (!materials?.length) return;

    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

    // Page 1 — Cover
    buildCoverPage(doc, materials, params, rankSource, wizardContext);
    pageFooter(doc, 1, 3);

    // Page 2 — Material Cards (full detail)
    buildMaterialsPage(doc, materials);
    pageFooter(doc, 2, 3);

    // Page 3 — Analytics table + score breakdown + insights
    buildAnalyticsPage(doc, materials);
    pageFooter(doc, 3, 3);

    // Save
    const ts = new Date().toISOString().slice(0, 10);
    doc.save(`EcoPackAI_Report_${ts}.pdf`);
}
