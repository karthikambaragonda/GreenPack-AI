// src/services/reportGenerator.js
//
// Generates a professional PDF sustainability report using jsPDF + autoTable.
// Install:  npm install jspdf jspdf-autotable
//
// Usage:
//   import { generateReport } from "../services/reportGenerator";
//   await generateReport(materials, params, rankSource, wizardContext);

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Colour palette (matches EcoPackAI dark theme) ──────────────────────────
const C = {
    accent: [0, 255, 213],   // #00ffd5
    dark: [6, 13, 19],    // #060d13
    surface: [15, 30, 45],    // card surface
    muted: [100, 116, 139],   // #64748b
    white: [240, 244, 248],   // #f0f4f8
    blue: [76, 201, 240],   // #4cc9f0
    yellow: [255, 209, 102],   // #ffd166
    red: [255, 77, 109],   // #ff4d6d
    green: [34, 197, 94],    // #22c55e
    rank: [
        [0, 255, 213],
        [76, 201, 240],
        [255, 209, 102],
        [100, 116, 139],
        [100, 116, 139],
    ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const rgb = (arr) => ({ r: arr[0], g: arr[1], b: arr[2] });
const hex = (arr) => "#" + arr.map(v => v.toString(16).padStart(2, "0")).join("");

function setFill(doc, arr) { doc.setFillColor(...arr); }
function setDraw(doc, arr) { doc.setDrawColor(...arr); }
function setFont(doc, arr) { doc.setTextColor(...arr); }

function hLine(doc, y, x1 = 14, x2 = 196, color = C.accent, lw = 0.4) {
    setDraw(doc, color);
    doc.setLineWidth(lw);
    doc.line(x1, y, x2, y);
}

function badge(doc, x, y, label, bgColor, textColor = C.dark) {
    const pad = 4;
    doc.setFontSize(8);
    const w = doc.getTextWidth(label) + pad * 2;
    setFill(doc, bgColor);
    doc.roundedRect(x, y - 5, w, 7, 1.5, 1.5, "F");
    setFont(doc, textColor);
    doc.text(label, x + pad, y);
    return w;
}

function ecoTagColor(tag) {
    if (!tag) return C.muted;
    const t = tag.toLowerCase();
    if (t.includes("ultra")) return C.accent;
    if (t.includes("eco")) return C.green;
    return C.muted;
}

function scoreBar(doc, x, y, value, maxVal, barW = 60, barH = 3, color = C.accent) {
    const pct = Math.min(1, value / (maxVal || 1));
    setFill(doc, [30, 50, 65]);
    doc.roundedRect(x, y, barW, barH, 1, 1, "F");
    if (pct > 0) {
        setFill(doc, color);
        doc.roundedRect(x, y, barW * pct, barH, 1, 1, "F");
    }
}

// ─── Page helpers ────────────────────────────────────────────────────────────
function addPageBackground(doc) {
    setFill(doc, C.dark);
    doc.rect(0, 0, 210, 297, "F");
    // subtle grid overlay
    setDraw(doc, [255, 255, 255]);
    doc.setLineWidth(0.05);
    doc.setGState(new doc.GState({ opacity: 0.03 }));
    for (let x = 0; x <= 210; x += 20) doc.line(x, 0, x, 297);
    for (let y = 0; y <= 297; y += 20) doc.line(0, y, 210, y);
    doc.setGState(new doc.GState({ opacity: 1 }));
}

function pageFooter(doc, pageNum, total) {
    const y = 287;
    hLine(doc, y - 4, 14, 196, C.surface, 0.3);
    doc.setFontSize(8);
    setFont(doc, C.muted);
    doc.text("EcoPackAI — Sustainability Report", 14, y);
    doc.text(`Page ${pageNum} of ${total}`, 196, y, { align: "right" });
    doc.text(new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), 105, y, { align: "center" });
}

function sectionHeading(doc, y, icon, title) {
    setFont(doc, C.accent);
    doc.setFontSize(9);
    doc.setFont("courier", "bold");
    doc.text(`${icon}  ${title.toUpperCase()}`, 14, y);
    hLine(doc, y + 2, 14, 196, C.accent, 0.3);
    return y + 10;
}

// ─── Cover page ──────────────────────────────────────────────────────────────
function buildCoverPage(doc, materials, params, rankSource, wizardContext) {
    addPageBackground(doc);

    // Accent bar left
    setFill(doc, C.accent);
    doc.rect(0, 0, 4, 297, "F");

    // Logo area
    doc.setFontSize(9);
    setFont(doc, C.accent);
    doc.setFont("courier", "bold");
    doc.text("ECOPACKAI", 20, 22);
    doc.setFontSize(7);
    doc.setFont("courier", "normal");
    setFont(doc, C.muted);
    doc.text("v2.0  •  AI-POWERED PACKAGING INTELLIGENCE", 20, 28);


    if (rankSource) {
        badge(doc, 150, 24, `Ranked by ${rankSource}`,
            rankSource === "EcoPAck AI Model" ? C.blue : C.muted, C.dark);
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

    // Subtitle
    doc.setFontSize(10);
    setFont(doc, [150, 170, 190]);
    doc.setFont("helvetica", "normal");
    doc.text("AI-powered packaging material analysis & recommendation", 14, 100);

    // Divider
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
                doc.text(wizardContext[key], 55, cy);
                cy += 7;
            }
        });
        cy += 4;
    }

    // Params pills row
    if (params) {
        hLine(doc, cy, 14, 196, C.surface, 0.5);
        cy += 8;
        doc.setFontSize(8);
        doc.setFont("courier", "bold");
        setFont(doc, C.accent);
        doc.text("ANALYSIS PARAMETERS (1–10 SCALE)", 14, cy);
        cy += 8;

        const paramLabels = {
            strength: "Strength",
            weight_capacity: "Weight Capacity",
            biodegradability: "Biodegradability",
            recyclability: "Recyclability",
        };
        let px = 14;
        Object.entries(paramLabels).forEach(([k, label]) => {
            if (params[k] !== undefined) {
                setFill(doc, C.surface);
                doc.roundedRect(px, cy - 5, 42, 14, 2, 2, "F");
                setDraw(doc, C.accent);
                doc.setLineWidth(0.2);
                doc.roundedRect(px, cy - 5, 42, 14, 2, 2, "S");
                setFont(doc, C.muted);
                doc.setFontSize(7);
                doc.setFont("helvetica", "normal");
                doc.text(label, px + 3, cy + 1);
                setFont(doc, C.accent);
                doc.setFont("courier", "bold");
                doc.setFontSize(12);
                doc.text(`${params[k]}`, px + 3, cy + 8);
                px += 46;
            }
        });
        cy += 22;
    }

    // Top material highlight
    if (materials.length) {
        hLine(doc, cy, 14, 196, C.surface, 0.5);
        cy += 10;
        setFill(doc, [8, 25, 38]);
        doc.roundedRect(14, cy - 6, 182, 30, 3, 3, "F");
        setDraw(doc, C.accent);
        doc.setLineWidth(0.4);
        doc.roundedRect(14, cy - 6, 182, 30, 3, 3, "S");

        doc.setFontSize(8);
        setFont(doc, C.muted);
        doc.setFont("helvetica", "normal");
        doc.text("TOP RECOMMENDATION", 22, cy + 2);

        setFont(doc, C.accent);
        doc.setFont("courier", "bold");
        doc.setFontSize(14);
        doc.text(materials[0].material_name, 22, cy + 13);

        setFont(doc, C.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`₹${materials[0].predicted_cost}  ·  CO₂: ${materials[0].predicted_co2}  ·  Savings: ${materials[0].co2_savings_percent}%`, 22, cy + 20);

        // eco tag
        if (materials[0].eco_tag) {
            badge(doc, 160, cy + 15, materials[0].eco_tag, ecoTagColor(materials[0].eco_tag), C.dark);
        }
        cy += 38;
    }

    // Date & generated line
    setFont(doc, C.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${new Date().toLocaleString("en-IN")}`, 14, 278);
    doc.text("EcoPackAI  |  AI-Powered Sustainable Packaging Platform", 14, 284);
}

// ─── Materials detail page ───────────────────────────────────────────────────
function buildMaterialsPage(doc, materials, params) {
    doc.addPage();
    addPageBackground(doc);

    let y = sectionHeading(doc, 18, "◆", "Material Recommendations");

    const maxCO2 = Math.max(...materials.map(m => m.predicted_co2));
    const maxCost = Math.max(...materials.map(m => m.predicted_cost));

    materials.forEach((m, i) => {
        if (y > 255) {
            pageFooter(doc, doc.internal.getNumberOfPages(), "—");
            doc.addPage();
            addPageBackground(doc);
            y = 18;
        }

        const cardH = 44;

        // Card background
        setFill(doc, [10, 22, 35]);
        doc.roundedRect(14, y, 182, cardH, 3, 3, "F");

        // Rank badge
        setFill(doc, C.rank[i] || C.muted);
        doc.roundedRect(14, y, 14, cardH, 3, 3, "F");
        doc.rect(20, y, 8, cardH, "F");  // square off right edge of badge
        setFont(doc, C.dark);
        doc.setFont("courier", "bold");
        doc.setFontSize(9);
        doc.text(`#${m.rank}`, 15, y + 25);

        // Material name
        setFont(doc, C.white);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(m.material_name, 32, y + 10);

        // Eco tag + category
        if (m.eco_tag) {
            badge(doc, 32, y + 18, m.eco_tag, ecoTagColor(m.eco_tag), C.dark);
        }
        setFont(doc, C.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(m.category?.toUpperCase() || "", 32, y + 26);

        // Reason
        if (m.reason) {
            setFont(doc, [140, 160, 180]);
            doc.setFontSize(7.5);
            doc.text(m.reason, 32, y + 34);
        }

        // Stats — right side
        const sx = 120;
        const stats = [
            { label: "Cost", val: `₹${m.predicted_cost}`, bar: m.predicted_cost, max: maxCost, color: C.yellow },
            { label: "CO₂", val: `${m.predicted_co2}`, bar: m.predicted_co2, max: maxCO2, color: C.accent },
            { label: "Savings", val: `${m.co2_savings_percent}%`, bar: m.co2_savings_percent, max: 100, color: C.green },
        ];

        stats.forEach((s, si) => {
            const sy = y + 8 + si * 12;
            setFont(doc, C.muted);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.text(s.label, sx, sy);
            setFont(doc, C.white);
            doc.setFont("courier", "bold");
            doc.setFontSize(8);
            doc.text(s.val, sx + 16, sy);
            scoreBar(doc, sx + 38, sy - 3.5, s.bar, s.max, 52, 3.5, s.color);
        });

        // Eco scores — recyclability + biodegradability
        const ecoY = y + 38;
        setFont(doc, C.muted);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("Recyclability", sx, ecoY);
        scoreBar(doc, sx + 28, ecoY - 3.5, m.recyclability, 100, 32, 3.5, C.accent);
        setFont(doc, C.white);
        doc.setFontSize(7.5);
        doc.setFont("courier", "bold");
        doc.text(`${m.recyclability}%`, sx + 62, ecoY);

        doc.setFontSize(7);
        setFont(doc, C.muted);
        doc.setFont("helvetica", "normal");
        doc.text("Biodegradability", sx + 76, ecoY);
        scoreBar(doc, sx + 108, ecoY - 3.5, m.biodegradability, 100, 32, 3.5, C.blue);
        setFont(doc, C.white);
        doc.setFontSize(7.5);
        doc.setFont("courier", "bold");
        doc.text(`${m.biodegradability}%`, sx + 142, ecoY);

        // Card border
        setDraw(doc, [20, 45, 65]);
        doc.setLineWidth(0.3);
        doc.roundedRect(14, y, 182, cardH, 3, 3, "S");

        y += cardH + 6;
    });

    return y;
}

// ─── Analytics summary page ──────────────────────────────────────────────────
function buildAnalyticsPage(doc, materials) {
    doc.addPage();
    addPageBackground(doc);

    let y = sectionHeading(doc, 18, "◆", "Analytics Summary");

    // ── Comparison table ──────────────────────────────────────────────────────
    autoTable(doc, {
        startY: y,
        head: [["Rank", "Material", "Category", "Cost (₹)", "CO₂", "Savings %", "Recyclability", "Biodegradability", "Eco Score"]],
        body: materials.map(m => [
            `#${m.rank}`,
            m.material_name,
            m.category || "—",
            `₹${m.predicted_cost}`,
            m.predicted_co2,
            `${m.co2_savings_percent}%`,
            `${m.recyclability}%`,
            `${m.biodegradability}%`,
            (m.final_score * 100).toFixed(1),
        ]),
        styles: {
            font: "helvetica",
            fontSize: 8,
            textColor: [200, 215, 230],
            fillColor: [10, 22, 35],
            lineColor: [20, 45, 65],
            lineWidth: 0.2,
        },
        headStyles: {
            font: "courier",
            fontSize: 7.5,
            textColor: C.accent,
            fillColor: [6, 18, 28],
            fontStyle: "bold",
        },
        alternateRowStyles: {
            fillColor: [14, 28, 42],
        },
        columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 40 },
            2: { cellWidth: 20 },
            3: { cellWidth: 18, halign: "right" },
            4: { cellWidth: 16, halign: "right" },
            5: { cellWidth: 16, halign: "right" },
            6: { cellWidth: 22, halign: "right" },
            7: { cellWidth: 22, halign: "right" },
            8: { cellWidth: 16, halign: "right" },
        },
        margin: { left: 14, right: 14 },
    });

    y = doc.lastAutoTable.finalY + 14;

    // ── Insight callouts ──────────────────────────────────────────────────────
    y = sectionHeading(doc, y, "◆", "Key Insights");

    const best = {
        co2: [...materials].sort((a, b) => a.predicted_co2 - b.predicted_co2)[0],
        cost: [...materials].sort((a, b) => a.predicted_cost - b.predicted_cost)[0],
        recycle: [...materials].sort((a, b) => b.recyclability - a.recyclability)[0],
        bio: [...materials].sort((a, b) => b.biodegradability - a.biodegradability)[0],
    };

    const insights = [
        {
            icon: "◉",
            color: C.accent,
            title: "Lowest CO₂ Impact",
            body: `${best.co2?.material_name} has the lowest predicted CO₂ footprint at ${best.co2?.predicted_co2} — making it the most climate-friendly option in this selection.`,
        },
        {
            icon: "◉",
            color: C.yellow,
            title: "Most Cost-Effective",
            body: `${best.cost?.material_name} is the most affordable option at ₹${best.cost?.predicted_cost}, offering strong value for cost-conscious operations.`,
        },
        {
            icon: "◉",
            color: C.blue,
            title: "Best Recyclability",
            body: `${best.recycle?.material_name} leads on recyclability at ${best.recycle?.recyclability}%, supporting circular economy compliance.`,
        },
        {
            icon: "◉",
            color: C.green,
            title: "Most Biodegradable",
            body: `${best.bio?.material_name} scores highest on biodegradability at ${best.bio?.biodegradability}%, ideal for compostability requirements.`,
        },
    ];

    insights.forEach((ins) => {
        if (y > 260) {
            pageFooter(doc, doc.internal.getNumberOfPages(), "—");
            doc.addPage();
            addPageBackground(doc);
            y = 18;
        }
        // Icon dot
        setFill(doc, ins.color);
        doc.circle(17, y - 1.5, 2, "F");

        setFont(doc, ins.color);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(ins.title, 22, y);

        setFont(doc, [170, 190, 210]);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(ins.body, 168);
        doc.text(lines, 22, y + 6);
        y += 6 + lines.length * 5 + 6;
    });

    return y;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function generateReport(materials, params, rankSource, wizardContext = {}) {
    if (!materials?.length) return;

    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

    // ── Page 1: Cover ─────────────────────────────────────────────────────────
    buildCoverPage(doc, materials, params, rankSource, wizardContext);
    pageFooter(doc, 1, 3);

    // ── Page 2: Material Cards ────────────────────────────────────────────────
    buildMaterialsPage(doc, materials, params);
    pageFooter(doc, 2, 3);

    // ── Page 3: Analytics Table + Insights ────────────────────────────────────
    buildAnalyticsPage(doc, materials);
    pageFooter(doc, 3, 3);

    // ── Save ──────────────────────────────────────────────────────────────────
    const ts = new Date().toISOString().slice(0, 10);
    const name = `EcoPackAI_Report_${ts}.pdf`;
    doc.save(name);
}