import { useState, useRef, useEffect } from "react";
import {
    Chart,
    BarElement, BarController,
    RadarController, RadialLinearScale, PointElement, LineElement,
    CategoryScale, LinearScale,
    Tooltip, Legend, Filler,
} from "chart.js";

// Register all required Chart.js components once
Chart.register(
    BarElement, BarController,
    RadarController, RadialLinearScale, PointElement, LineElement,
    CategoryScale, LinearScale,
    Tooltip, Legend, Filler
);
import axios from "axios";
import { rerankWithGemini } from "../services/geminiReranker";
import "../index.css";
import { generateReport } from "../services/reportGenerator";


// ─── WIZARD STEPS ─────────────────────────────────────────────────────────────
const STEPS = [
    {
        id: "product",
        botText: "Hey! 👋 What kind of product are you packaging?",
        type: "chips",
        options: [
            { label: "🍎 Food / Snacks", value: "food" },
            { label: "📱 Electronics", value: "electronics" },
            { label: "💄 Cosmetics / Beauty", value: "cosmetics" },
            { label: "👕 Clothing / Apparel", value: "clothing" },
            { label: "🧪 Chemicals / Liquids", value: "chemicals" },
            { label: "🔩 Industrial Parts", value: "industrial" },
        ],
        resolver: (val) => ({
            food: { strength: 4, weight_capacity: 4 },
            electronics: { strength: 7, weight_capacity: 5 },
            cosmetics: { strength: 5, weight_capacity: 3 },
            clothing: { strength: 3, weight_capacity: 2 },
            chemicals: { strength: 6, weight_capacity: 7 },
            industrial: { strength: 9, weight_capacity: 9 },
        }[val] ?? {})
    },
    {
        id: "fragility",
        botText: "Is it fragile, or can it handle a few bumps?",
        type: "chips",
        options: [
            { label: "💎 Very fragile", value: "very_fragile" },
            { label: "⚠️ Somewhat delicate", value: "delicate" },
            { label: "💪 Fairly sturdy", value: "sturdy" },
            { label: "🪨 Basically indestructible", value: "tough" },
        ],
        resolver: (val) => ({
            very_fragile: { strength: 9 },
            delicate: { strength: 7 },
            sturdy: { strength: 4 },
            tough: { strength: 2 },
        }[val] ?? {})
    },
    {
        id: "weight",
        botText: "How heavy is one unit of the product?",
        type: "chips",
        options: [
            { label: "🪶 Super light  (< 100 g)", value: "ultralight" },
            { label: "📦 Light  (100 g – 1 kg)", value: "light" },
            { label: "🎒 Medium  (1 – 5 kg)", value: "medium" },
            { label: "🏋️ Heavy  (5 kg +)", value: "heavy" },
        ],
        resolver: (val) => ({
            ultralight: { weight_capacity: 1 },
            light: { weight_capacity: 3 },
            medium: { weight_capacity: 6 },
            heavy: { weight_capacity: 9 },
        }[val] ?? {})
    },
    {
        id: "eco_priority",
        botText: "How much does eco-friendliness matter to your brand?",
        type: "chips",
        options: [
            { label: "🌍 It's our #1 priority", value: "top" },
            { label: "♻️ Very important", value: "high" },
            { label: "👍 Nice to have", value: "medium" },
            { label: "😐 Not really a concern", value: "low" },
        ],
        resolver: (val) => ({
            top: { biodegradability: 9, recyclability: 9 },
            high: { biodegradability: 7, recyclability: 7 },
            medium: { biodegradability: 4, recyclability: 5 },
            low: { biodegradability: 2, recyclability: 2 },
        }[val] ?? {})
    },
    {
        id: "compost",
        botText: "Should the packaging break down naturally after use?",
        type: "chips",
        options: [
            { label: "✅ Must be compostable", value: "must" },
            { label: "🌱 Prefer biodegradable", value: "prefer" },
            { label: "🔄 Recyclable is enough", value: "recycle" },
            { label: "❌ Doesn't matter", value: "none" },
        ],
        resolver: (val) => ({
            must: { biodegradability: 10 },
            prefer: { biodegradability: 7 },
            recycle: { biodegradability: 3, recyclability: 9 },
            none: { biodegradability: 1 },
        }[val] ?? {})
    },
    { id: "confirm", type: "confirm", botText: null },
];

const CONTEXT_LABELS = {
    // product
    food: { product: "food / snacks" },
    electronics: { product: "electronics / devices" },
    cosmetics: { product: "cosmetics / beauty products" },
    clothing: { product: "clothing / apparel" },
    chemicals: { product: "chemicals / liquids" },
    industrial: { product: "industrial / heavy parts" },
    // fragility
    very_fragile: { fragility: "very fragile — needs strong protective packaging" },
    delicate: { fragility: "somewhat delicate" },
    sturdy: { fragility: "fairly sturdy" },
    tough: { fragility: "basically indestructible — minimal protection needed" },
    // weight
    ultralight: { weight: "super light under 100g" },
    light: { weight: "light 100g to 1kg" },
    medium: { weight: "medium 1kg to 5kg" },
    heavy: { weight: "heavy over 5kg" },
    // eco priority
    top: { eco_priority: "eco-friendliness is our #1 priority" },
    high: { eco_priority: "eco-friendliness is very important" },
    medium: { eco_priority: "eco-friendliness is a nice-to-have" },
    low: { eco_priority: "eco-friendliness is not a concern" },
    // compost
    must: { compost: "must be compostable / fully biodegradable" },
    prefer: { compost: "prefer biodegradable materials" },
    recycle: { compost: "recyclable is enough — does not need to biodegrade" },
    none: { compost: "end-of-life breakdown does not matter" },
};

function clamp(v) { return Math.max(1, Math.min(10, Math.round(v ?? 5))); }
function finalise(p) {
    return {
        strength: clamp(p.strength),
        weight_capacity: clamp(p.weight_capacity),
        biodegradability: clamp(p.biodegradability),
        recyclability: clamp(p.recyclability),
    };
}

// ─── SHARED PIPELINE ──────────────────────────────────────────────────────────
// Used by both Manual and Guided modes.
// Calls Flask →  reranker → returns { results, source }
async function runFullPipeline(params, wizardContext = {}) {
    // params are on 1-10 scale (raw user values)
    const flaskRes = await axios.post("http://127.0.0.1:5000/recommend", {
        ...params,
        top_n: 30,
    });
    const mlResults = flaskRes.data.recommendations ?? [];


    const userNorm = {
        strength: params.strength / 10,
        weight_capacity: params.weight_capacity / 10,
        biodegradability: params.biodegradability / 10,
        recyclability: params.recyclability / 10,
    };

    // Pass wizard context so  knows the real product description
    const gemini = await rerankWithGemini(userNorm, mlResults, wizardContext);
    return {
        results: gemini ?? mlResults.slice(0, 5),
        source: gemini ? "EcoPack AI" : "EcoPackAI model",
    };
}

// ─── CHAT WIZARD ──────────────────────────────────────────────────────────────
function ChatGuide({ onResultsReady }) {
    const [stepIndex, setStepIndex] = useState(0);
    const [params, setParams] = useState({});
    const [wizardContext, setWizardContext] = useState({});   // human-readable answers
    const [messages, setMessages] = useState([
        { role: "bot", text: STEPS[0].botText },
    ]);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, status]);

    const push = (prev, role, text, extra = {}) =>
        [...prev, { role, text, ...extra }];

    const handleChipClick = (option) => {
        const step = STEPS[stepIndex];
        const patch = step.resolver(option.value);
        const merged = { ...params, ...patch };
        setParams(merged);

        // Record the human-readable answer for this step into wizardContext
        const ctxPatch = CONTEXT_LABELS[option.value] ?? {};
        setWizardContext(prev => ({ ...prev, ...ctxPatch }));

        let next = push(messages, "user", option.label);
        const nextIdx = stepIndex + 1;
        const nextStep = STEPS[nextIdx];

        if (nextStep) {
            let botText = nextStep.botText;
            if (nextStep.type === "confirm") {
                const fp = finalise(merged);
                botText =
                    `Got it! Here's what I worked out:\n\n` +
                    `Strength: ${fp.strength}/10 · Weight: ${fp.weight_capacity}/10\n` +
                    `Biodegradability: ${fp.biodegradability}/10 · Recyclability: ${fp.recyclability}/10\n\n` +
                    `Ready to find your best materials?`;
            }
            next = push(next, "bot", botText);
        }

        setMessages(next);
        setStepIndex(nextIdx);
    };

    const handleConfirm = async () => {
        const fp = finalise(params);
        let msgs = push(messages, "user", "Yes, let's go!");

        // Step indicator messages
        msgs = push(msgs, "bot", "Fetching ML candidates… 🤖", { loading: true });
        setMessages(msgs);
        setStatus("calling-flask");
        setError("");

        try {
            msgs = msgs.filter(m => !m.loading);
            msgs = push(msgs, "bot", "Analyzing...", { loading: true });
            setMessages(msgs);
            setStatus("calling-gemini");

            const { results, source } = await runFullPipeline(fp, wizardContext);

            msgs = msgs.filter(m => !m.loading);
            msgs = push(msgs, "bot", `Done! Top 5 selected via ${source}. 🌿`);
            setMessages(msgs);
            setStatus("done");

            onResultsReady(results, fp, source, wizardContext);
        } catch {
            setError("Couldn't reach Flask on port 5000. Is the server running?");
            setStatus("error");
        }
    };

    const handleRetake = () => {
        setStepIndex(0);
        setParams({});
        setWizardContext({});
        setStatus("idle");
        setError("");
        setMessages([{ role: "bot", text: STEPS[0].botText }]);
    };

    const currentStep = STEPS[stepIndex];
    const busy = status === "calling-flask" || status === "calling-gemini";
    const showChips = !busy && currentStep?.type === "chips" && status !== "done";
    const showConfirm = !busy && currentStep?.type === "confirm" && status !== "done";

    return (
        <div className="chat-guide-wrapper">
            <div className="wizard-progress">
                <div
                    className="wizard-progress-fill"
                    style={{ width: `${Math.min(100, (stepIndex / (STEPS.length - 1)) * 100)}%` }}
                />
            </div>

            <div className="chat-messages">
                {messages.map((m, i) => (
                    <div key={i} className={`chat-bubble-wrap ${m.role === "user" ? "user-wrap" : "bot-wrap"}`}>
                        {m.role === "bot" && (
                            <div className="bot-avatar"><i className="bi bi-recycle"></i></div>
                        )}
                        <div className={`chat-bubble ${m.role === "user" ? "bubble-user" : "bubble-bot"} ${m.loading ? "bubble-loading" : ""}`}>
                            {m.loading
                                ? <><i className="bi bi-arrow-repeat spin"></i>&nbsp;{m.text}</>
                                : m.text.split("\n").map((line, j, arr) => (
                                    <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                                ))
                            }
                        </div>
                    </div>
                ))}

                {busy && (
                    <div className="chat-bubble-wrap bot-wrap">
                        <div className="bot-avatar"><i className="bi bi-recycle"></i></div>
                        <div className="chat-bubble bubble-bot typing-indicator">
                            <span /><span /><span />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="chat-error">
                        <i className="bi bi-exclamation-triangle-fill"></i> {error}
                        <button className="btn-ghost" style={{ marginLeft: "auto", padding: "4px 10px", fontSize: "0.75rem" }} onClick={handleRetake}>
                            Retry
                        </button>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {showChips && (
                <div className="chip-grid">
                    {currentStep.options.map(opt => (
                        <button key={opt.value} className="wizard-chip" onClick={() => handleChipClick(opt)}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}

            {showConfirm && (
                <div className="confirm-row">
                    <button className="btn-primary-eco" onClick={handleConfirm}>
                        <i className="bi bi-lightning-charge-fill"></i> Find my materials!
                    </button>
                    <button className="btn-ghost" onClick={handleRetake}>
                        <i className="bi bi-arrow-counterclockwise"></i> Start over
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── RESULTS PANEL ────────────────────────────────────────────────────────────
function ResultsPanel({ materials, params, source, onReset }) {
    return (
        <div className="card-glass">
            <div className="card-label">
                <i className="bi bi-award"></i> Recommended Materials
                {source && (
                    <span className={`source-badge ${source === "EcoPack AI" ? "badge-gemini" : "badge-ml"}`}>
                        <i className={`bi ${source === "Gemini AI" ? "bi-stars" : "bi-cpu"}`}></i>
                        {source}
                    </span>
                )}
                <button className="reset-btn" onClick={onReset}>
                    <i className="bi bi-arrow-counterclockwise"></i> New Analysis
                </button>
            </div>

            {params && (
                <div className="param-pills">
                    {Object.entries(params).map(([k, v]) => (
                        <span key={k} className="param-pill">
                            {k.replace(/_/g, " ")}: <strong>{v}</strong>
                        </span>
                    ))}
                </div>
            )}

            <div className="materials-list">
                {materials.length === 0 && (
                    <div className="empty-state">
                        <i className="bi bi-box-seam"></i>
                        <span>No results — run an analysis first</span>
                    </div>
                )}

                {materials.map((m) => (
                    <div className="material-card" key={m.rank}>
                        <div className={`material-rank r${m.rank}`}>#{m.rank}</div>
                        <div className="material-info">
                            <div className="material-name">{m.material_name}</div>
                            {m.eco_tag && <div className="eco-tag">{m.eco_tag}</div>}
                            {m.reason && <div className="material-reason">{m.reason}</div>}
                        </div>
                        <div className="material-stats">
                            {/* <div className="material-stat">
                                <span>Cost</span>
                                <strong>₹{m.predicted_cost}</strong>
                            </div>
                            <div className="material-stat">
                                <span>CO₂</span>
                                <strong>{m.predicted_co2}</strong>
                            </div> */}
                            <div className="material-stat">
                                <span>Savings</span>
                                <strong>{m.co2_savings_percent}%</strong>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── BI DASHBOARD ─────────────────────────────────────────────────────────────
function BIDashboard({ materials }) {
    const refs = {
        co2: useRef(null),
        cost: useRef(null),
        eco: useRef(null),
        savings: useRef(null),
        radar: useRef(null),
    };
    const instances = useRef({});

    // Truncate long names for axis labels
    const labels = materials.map(m =>
        m.material_name.length > 15 ? m.material_name.slice(0, 14) + "…" : m.material_name
    );

    // Per-bar accent colours matching the rank badges
    const COLORS = ["#00ffd5", "#4cc9f0", "#ffd166", "#ff4d6d", "#8b94a3"];
    const MUTED = (i) => COLORS[i] + "99";

    useEffect(() => {
        if (!materials.length) return;

        // Shared style tokens
        const TICK = "#64748b";
        const GRID = "rgba(255,255,255,0.06)";
        const axis = (title) => ({
            ticks: { color: TICK, font: { size: 11 } },
            grid: { color: GRID },
            ...(title ? { title: { display: true, text: title, color: TICK, font: { size: 11 } } } : {}),
        });
        const tooltip = {
            plugins: {
                tooltip: {
                    backgroundColor: "rgba(6,13,19,0.92)",
                    borderColor: "rgba(0,255,213,0.3)",
                    borderWidth: 1,
                    titleColor: "#f0f4f8",
                    bodyColor: "#64748b",
                    padding: 10,
                },
                legend: { display: false },
            },
        };
        const base = { responsive: true, maintainAspectRatio: false, ...tooltip };

        const mk = (key, cfg) => {
            instances.current[key]?.destroy();
            if (refs[key].current)
                instances.current[key] = new Chart(refs[key].current, cfg);
        };

        // ── 1. CO2 Footprint ──────────────────────────────────────────────────
        mk("co2", {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "CO₂",
                    data: materials.map(m => m.predicted_co2),
                    backgroundColor: COLORS,
                    borderRadius: 6, borderSkipped: false,
                }],
            },
            options: { ...base, scales: { x: axis(), y: { ...axis("CO₂"), beginAtZero: true } } },
        });

        // // ── 2. Predicted Cost ─────────────────────────────────────────────────
        // mk("cost", {
        //     type: "bar",
        //     data: {
        //         labels,
        //         datasets: [{
        //             label: "Cost (₹)",
        //             data: materials.map(m => m.predicted_cost),
        //             backgroundColor: COLORS,
        //             borderRadius: 6, borderSkipped: false,
        //         }],
        //     },
        //     options: {
        //         ...base,
        //         scales: { x: axis(), y: { ...axis("₹"), beginAtZero: true } },
        //         plugins: {
        //             ...tooltip.plugins,
        //             tooltip: {
        //                 ...tooltip.plugins.tooltip,
        //                 callbacks: { label: ctx => ` ₹${ctx.parsed.y.toFixed(2)}` },
        //             },
        //         },
        //     },
        // });

        // ── 3. Recyclability vs Biodegradability (grouped) ────────────────────
        mk("eco", {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Recyclability %",
                        data: materials.map(m => m.recyclability),
                        backgroundColor: "rgba(0,255,213,0.75)",
                        borderRadius: 4, borderSkipped: false,
                    },
                    {
                        label: "Biodegradability %",
                        data: materials.map(m => m.biodegradability),
                        backgroundColor: "rgba(76,201,240,0.75)",
                        borderRadius: 4, borderSkipped: false,
                    },
                ],
            },
            options: {
                ...base,
                plugins: {
                    ...tooltip.plugins,
                    legend: {
                        display: true,
                        labels: { color: TICK, font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 14 },
                    },
                },
                scales: { x: axis(), y: { ...axis("%"), beginAtZero: true, max: 100 } },
            },
        });

        // ── 4. CO2 Savings — horizontal bar ───────────────────────────────────
        mk("savings", {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "CO₂ Savings %",
                    data: materials.map(m => m.co2_savings_percent),
                    backgroundColor: materials.map((_, i) => i === 0 ? "#00ffd5" : MUTED(i)),
                    borderRadius: 6, borderSkipped: false,
                }],
            },
            options: {
                ...base,
                indexAxis: "y",
                scales: {
                    x: { ...axis("% saved vs worst"), beginAtZero: true, max: 100 },
                    y: axis(),
                },
                plugins: {
                    ...tooltip.plugins,
                    tooltip: {
                        ...tooltip.plugins.tooltip,
                        callbacks: { label: ctx => ` ${ctx.parsed.x.toFixed(1)}% CO₂ saved` },
                    },
                },
            },
        });

        // ── 5. Radar — overall profile ────────────────────────────────────────
        mk("radar", {
            type: "radar",
            data: {
                labels: ["Recyclability", "Biodegradability", "CO₂ Savings", "Eco Score", "Affordability"],
                datasets: materials.map((m, i) => {
                    const maxCost = Math.max(...materials.map(x => x.predicted_cost));
                    return {
                        label: m.material_name,
                        data: [
                            m.recyclability,
                            m.biodegradability,
                            m.co2_savings_percent,
                            m.final_score * 100,
                            maxCost > 0 ? ((maxCost - m.predicted_cost) / maxCost) * 100 : 50,
                        ],
                        borderColor: COLORS[i],
                        backgroundColor: COLORS[i] + "22",
                        borderWidth: 2,
                        pointBackgroundColor: COLORS[i],
                        pointRadius: 3,
                    };
                }),
            },
            options: {
                ...base,
                scales: {
                    r: {
                        beginAtZero: true, min: 0, max: 100,
                        ticks: { color: TICK, font: { size: 10 }, stepSize: 25, backdropColor: "transparent" },
                        grid: { color: GRID },
                        pointLabels: { color: "#94a3b8", font: { size: 11 } },
                        angleLines: { color: GRID },
                    },
                },
                plugins: {
                    ...tooltip.plugins,
                    legend: {
                        display: true,
                        position: "bottom",
                        labels: { color: TICK, font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 12 },
                    },
                },
            },
        });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [materials]);

    // Cleanup on unmount only
    useEffect(() => {
        return () => Object.values(instances.current).forEach(c => c?.destroy());
    }, []);

    if (!materials.length) return null;

    // Summary winner cards
    const best = {
        co2: [...materials].sort((a, b) => a.predicted_co2 - b.predicted_co2)[0],
        cost: [...materials].sort((a, b) => a.predicted_cost - b.predicted_cost)[0],
        recycle: [...materials].sort((a, b) => b.recyclability - a.recyclability)[0],
        bio: [...materials].sort((a, b) => b.biodegradability - a.biodegradability)[0],
    };

    return (
        <div className="bi-dashboard">

            {/* ── Summary metric cards ── */}
            <div className="card-glass bi-header-card">
                <div className="card-label">
                    <i className="bi bi-bar-chart-line"></i> Sustainability Analytics
                </div>
                <div className="bi-metrics">
                    <div className="bi-metric">
                        <span>Lowest CO₂</span>
                        <strong>{best.co2?.material_name}</strong>
                        {/* <em>{best.co2?.predicted_co2} kg</em> */}
                    </div>
                    <div className="bi-metric">
                        <span>Most Affordable</span>
                        <strong>{best.cost?.material_name}</strong>
                        {/* <em>₹{best.cost?.predicted_cost}</em> */}
                    </div>
                    <div className="bi-metric">
                        <span>Most Recyclable</span>
                        <strong>{best.recycle?.material_name}</strong>
                        {/* <em>{best.recycle?.recyclability}%</em> */}
                    </div>
                    <div className="bi-metric">
                        <span>Most Biodegradable</span>
                        <strong>{best.bio?.material_name}</strong>
                        {/* <em>{best.bio?.biodegradability}%</em> */}
                    </div>
                </div>
            </div>

            {/* ── Charts grid ── */}
            <div className="bi-charts-grid">

                <div className="card-glass bi-chart-card">
                    <div className="bi-chart-title">
                        <i className="bi bi-cloud-haze2"></i> CO₂ Footprint
                    </div>
                    <div className="bi-chart-wrap"><canvas ref={refs.co2} /></div>
                </div>

                {/* <div className="card-glass bi-chart-card">
                    <div className="bi-chart-title">
                        <i className="bi bi-currency-rupee"></i> Predicted Cost
                    </div>
                    <div className="bi-chart-wrap"><canvas ref={refs.cost} /></div>
                </div> */}

                <div className="card-glass bi-chart-card bi-chart-wide">
                    <div className="bi-chart-title">
                        <i className="bi bi-recycle"></i> Recyclability vs Biodegradability
                    </div>
                    <div className="bi-chart-wrap"><canvas ref={refs.eco} /></div>
                </div>

                <div className="card-glass bi-chart-card bi-chart-wide">
                    <div className="bi-chart-title">
                        <i className="bi bi-bar-chart-steps"></i> CO₂ Savings vs Worst Option
                    </div>
                    <div style={{ height: `${materials.length * 56 + 24}px` }}>
                        <canvas ref={refs.savings} />
                    </div>
                </div>

                <div className="card-glass bi-chart-card bi-chart-wide">
                    <div className="bi-chart-title">
                        <i className="bi bi-star-half"></i> Overall Sustainability Profile
                        <span className="bi-chart-subtitle">radar comparison across all 5 materials</span>
                    </div>
                    <div className="bi-chart-wrap bi-chart-radar"><canvas ref={refs.radar} /></div>
                </div>

            </div>
        </div>
    );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
// export default function Dashboard() {
//     const [mode, setMode] = useState(null);
//     const [data, setData] = useState({ strength: "", weight_capacity: "", biodegradability: "", recyclability: "" });
//     const [materials, setMaterials] = useState([]);
//     const [lastParams, setLastParams] = useState(null);
//     const [rankSource, setRankSource] = useState(null);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState("");
//     const [showResults, setShowResults] = useState(false);
//     const [reportLoading, setReportLoading] = useState(false);
//     const [wizardCtx, setWizardCtx] = useState({});


//     const handleManualPredict = async () => {
//         setLoading(true);
//         setError("");
//         try {
//             const payload = {
//                 strength: parseFloat(data.strength),
//                 weight_capacity: parseFloat(data.weight_capacity),
//                 recyclability: parseFloat(data.recyclability),
//                 biodegradability: parseFloat(data.biodegradability),
//             };
//             const { results, source } = await runFullPipeline(payload);
//             setMaterials(results);
//             setLastParams(payload);
//             setRankSource(source);
//             setShowResults(true);
//         } catch {
//             setError("Could not reach Flask on port 5000. Make sure it's running.");
//         } finally {
//             setLoading(false);
//         }
//     };

//     const resetAll = () => {
//         setShowResults(false);
//         setMaterials([]);
//         setLastParams(null);
//         setRankSource(null);
//         setMode(null);
//         setWizardCtx({});
//     };
//     const handleGenerateReport = async () => {
//         setReportLoading(true);
//         try {
//             await generateReport(materials, lastParams, rankSource, wizardCtx);
//         } finally {
//             setReportLoading(false);
//         }
//     };

//     return (
//         <>
//             <div className="page-header">
//                 <div>
//                     <h1>Sustainability <span>Intelligence</span></h1>
//                     <p>AI-powered packaging material analysis &amp; recommendation</p>
//                 </div>
//                 <div className="header-badge">
//                     <i className="bi bi-lightning-charge-fill"></i>
//                     Real-time Analysis
//                 </div>
//             </div>

//             {/* MODE PICKER */}
//             {!mode && !showResults && (
//                 <div className="mode-picker-section">
//                     <div className="card-glass mode-picker-card" onClick={() => setMode("guide")}>
//                         <div className="mode-icon-wrap accent">
//                             <i className="bi bi-chat-dots-fill"></i>
//                         </div>
//                         <div className="mode-body">
//                             <div className="mode-title">
//                                 Guided Wizard
//                                 <span className="mode-badge">Recommended</span>
//                             </div>
//                             <div className="mode-desc">
//                                 Answer a few plain-English questions — tap to pick, no typing needed.
//                             </div>
//                         </div>
//                         <i className="bi bi-arrow-right mode-arrow"></i>
//                     </div>

//                     <div className="mode-picker-divider">or</div>

//                     <div className="card-glass mode-picker-card mode-manual" onClick={() => setMode("manual")}>
//                         <div className="mode-icon-wrap muted">
//                             <i className="bi bi-sliders"></i>
//                         </div>
//                         <div className="mode-body">
//                             <div className="mode-title">Manual Input</div>
//                             <div className="mode-desc">
//                                 Enter exact values (1–10) if you know the technical parameters.
//                             </div>
//                         </div>
//                         <i className="bi bi-arrow-right mode-arrow"></i>
//                     </div>
//                 </div>
//             )}

//             {/* GUIDED WIZARD */}
//             {mode === "guide" && !showResults && (
//                 <div className="card-glass">
//                     <div className="card-label">
//                         <i className="bi bi-chat-dots-fill"></i> Packaging Wizard
//                         <button className="reset-btn" onClick={() => setMode(null)}>
//                             <i className="bi bi-arrow-left"></i> Back
//                         </button>
//                     </div>
//                     <ChatGuide onResultsReady={(mats, fp, src, ctx) => {
//                         setMaterials(mats);
//                         setLastParams(fp);
//                         setRankSource(src);
//                         setWizardCtx(ctx || {});
//                         setShowResults(true);
//                     }} />
//                 </div>
//             )}

//             {/* MANUAL */}
//             {/* hi */}
//             {/*
//             {mode === "manual" && !showResults && (
//                 <div className="card-glass">
//                     <div className="card-label">
//                         <i className="bi bi-sliders"></i> Packaging Parameters
//                         <button className="reset-btn" onClick={() => setMode(null)}>
//                             <i className="bi bi-arrow-left"></i> Back
//                         </button>
//                     </div>
//                     <div className="input-grid">
//                         {[
//                             { key: "weight_capacity", label: "Weight Capacity", hint: "How heavy is the product?" },
//                             { key: "strength", label: "Strength", hint: "How durable does it need to be?" },
//                             { key: "biodegradability", label: "Biodegradability", hint: "How important is natural breakdown?" },
//                             { key: "recyclability", label: "Recyclability", hint: "How important is recyclability?" },
//                         ].map(({ key, label, hint }) => (
//                             <div className="input-group-custom" key={key}>
//                                 <label>{label} <span className="range-badge">1–10</span></label>
//                                 <input
//                                     className="form-control"
//                                     placeholder={hint}
//                                     type="number" min="1" max="10"
//                                     value={data[key]}
//                                     onChange={e => setData({ ...data, [key]: e.target.value })}
//                                 />
//                             </div>
//                         ))}
//                     </div>
//                     {error && (
//                         <div className="api-error">
//                             <i className="bi bi-exclamation-triangle-fill"></i> {error}
//                         </div>
//                     )}
//                     <button className="btn-primary-eco" onClick={handleManualPredict} disabled={loading}>
//                         <i className={`bi ${loading ? "bi-arrow-repeat spin" : "bi-lightning-charge-fill"}`}></i>
//                         {loading ? "Analyzing…" : "Run AI Analysis"}
//                     </button>
//                 </div>
//             )}
//             */}
//             {/* MANUAL */}
//             {mode === "manual" && !showResults && (
//                 <div className="card-glass">
//                     <div className="card-label">
//                         <i className="bi bi-sliders"></i> Packaging Parameters
//                         <button className="reset-btn" onClick={() => setMode(null)}>
//                             <i className="bi bi-arrow-left"></i> Back
//                         </button>
//                     </div>
//                     <div className="input-grid">
//                         {[
//                             { key: "weight_capacity", label: "Weight Capacity", hint: "How heavy is the product?" },
//                             { key: "strength", label: "Strength", hint: "How durable does it need to be?" },
//                             { key: "biodegradability", label: "Biodegradability", hint: "How important is natural breakdown?" },
//                             { key: "recyclability", label: "Recyclability", hint: "How important is recyclability?" },
//                         ].map(({ key, label, hint }) => (
//                             <div className="input-group-custom" key={key}>
//                                 <label>{label} <span className="range-badge">1–10</span></label>
//                                 <input
//                                     className="form-control"
//                                     placeholder={hint}
//                                     type="number" min="1" max="10" required
//                                     value={data[key]}
//                                     onChange={e => {
//                                         let val = e.target.value;
//                                         // Allow empty string for backspacing, but clamp numbers between 1 and 10
//                                         if (val !== "") {
//                                             const num = parseInt(val, 10);
//                                             if (num < 1) val = "1";
//                                             else if (num > 10) val = "10";
//                                             else val = num.toString();
//                                         }
//                                         setData({ ...data, [key]: val });
//                                     }}
//                                 />
//                             </div>
//                         ))}
//                     </div>
//                     {error && (
//                         <div className="api-error">
//                             <i className="bi bi-exclamation-triangle-fill"></i> {error}
//                         </div>
//                     )}
//                     <button
//                         className="btn-primary-eco"
//                         onClick={handleManualPredict}
//                         disabled={
//                             loading ||
//                             !data.strength ||
//                             !data.weight_capacity ||
//                             !data.biodegradability ||
//                             !data.recyclability
//                         }
//                     >
//                         <i className={`bi ${loading ? "bi-arrow-repeat spin" : "bi-lightning-charge-fill"}`}></i>
//                         {loading ? "Analyzing…" : "Run AI Analysis"}
//                     </button>
//                 </div>
//             )}

//             {/* RESULTS */}
//             {showResults && (
//                 <>
//                     <ResultsPanel
//                         materials={materials}
//                         params={lastParams}
//                         source={rankSource}
//                         onReset={resetAll}
//                     />
//                     <BIDashboard materials={materials} />
//                     {/* ── Generate Report button ── */}
//                     <div className="report-cta-wrapper">
//                         <div className="report-cta-text">
//                             <i className="bi bi-file-earmark-pdf-fill"></i>
//                             <div>
//                                 <strong>Download Sustainability Report</strong>
//                                 <span>Full 3-page PDF — materials, analytics, and insights</span>
//                             </div>
//                         </div>
//                         <button
//                             className="btn-report"
//                             onClick={handleGenerateReport}
//                             disabled={reportLoading}
//                         >
//                             {reportLoading
//                                 ? <><i className="bi bi-arrow-repeat spin"></i> Generating…</>
//                                 : <><i className="bi bi-download"></i> Generate Report</>
//                             }
//                         </button>
//                     </div>
//                 </>
//             )}
//         </>
//     );
// }
// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
// Now receives activePage and setActivePage from Layout.jsx
export default function Dashboard({ activePage = "overview", setActivePage = () => { } }) {
    const [mode, setMode] = useState(null);
    const [data, setData] = useState({ strength: "", weight_capacity: "", biodegradability: "", recyclability: "" });
    const [materials, setMaterials] = useState([]);
    const [lastParams, setLastParams] = useState(null);
    const [rankSource, setRankSource] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showResults, setShowResults] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [wizardCtx, setWizardCtx] = useState({});

    const handleManualPredict = async () => {
        setLoading(true);
        setError("");
        try {
            const payload = {
                strength: parseFloat(data.strength),
                weight_capacity: parseFloat(data.weight_capacity),
                recyclability: parseFloat(data.recyclability),
                biodegradability: parseFloat(data.biodegradability),
            };
            const { results, source } = await runFullPipeline(payload);
            setMaterials(results);
            setLastParams(payload);
            setRankSource(source);
            setShowResults(true);
            setActivePage("results"); // Auto-navigate to Results Tab
        } catch {
            setError("Could not reach Flask on port 5000. Make sure it's running.");
        } finally {
            setLoading(false);
        }
    };

    const resetAll = () => {
        setShowResults(false);
        setMaterials([]);
        setLastParams(null);
        setRankSource(null);
        setMode(null);
        setWizardCtx({});
        setActivePage("overview"); // Redirect back to parameters
    };

    const handleGenerateReport = async () => {
        setReportLoading(true);
        try {
            await generateReport(materials, lastParams, rankSource, wizardCtx);
        } finally {
            setReportLoading(false);
        }
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Sustainability <span>Intelligence</span></h1>
                    <p>AI-powered packaging material analysis &amp; recommendation</p>
                </div>
                <div className="header-badge">
                    <i className="bi bi-lightning-charge-fill"></i>
                    Real-time Analysis
                </div>
            </div>

            {/* TAB 1: PARAMETERS (OVERVIEW) */}
            {activePage === "overview" && (
                <>
                    {/* MODE PICKER */}
                    {!mode && (
                        <div className="mode-picker-section">
                            <div className="card-glass mode-picker-card" onClick={() => setMode("guide")}>
                                <div className="mode-icon-wrap accent">
                                    <i className="bi bi-chat-dots-fill"></i>
                                </div>
                                <div className="mode-body">
                                    <div className="mode-title">
                                        Guided Wizard
                                        <span className="mode-badge">Recommended</span>
                                    </div>
                                    <div className="mode-desc">
                                        Answer a few plain-English questions — tap to pick, no typing needed.
                                    </div>
                                </div>
                                <i className="bi bi-arrow-right mode-arrow"></i>
                            </div>

                            <div className="mode-picker-divider">or</div>

                            <div className="card-glass mode-picker-card mode-manual" onClick={() => setMode("manual")}>
                                <div className="mode-icon-wrap muted">
                                    <i className="bi bi-sliders"></i>
                                </div>
                                <div className="mode-body">
                                    <div className="mode-title">Manual Input</div>
                                    <div className="mode-desc">
                                        Enter exact values (1–10) if you know the technical parameters.
                                    </div>
                                </div>
                                <i className="bi bi-arrow-right mode-arrow"></i>
                            </div>
                        </div>
                    )}

                    {/* GUIDED WIZARD */}
                    {mode === "guide" && (
                        <div className="card-glass">
                            <div className="card-label">
                                <i className="bi bi-chat-dots-fill"></i> Packaging Wizard
                                <button className="reset-btn" onClick={() => setMode(null)}>
                                    <i className="bi bi-arrow-left"></i> Back
                                </button>
                            </div>
                            <ChatGuide onResultsReady={(mats, fp, src, ctx) => {
                                setMaterials(mats);
                                setLastParams(fp);
                                setRankSource(src);
                                setWizardCtx(ctx || {});
                                setShowResults(true);
                                setActivePage("results"); // Auto-navigate to Results Tab
                            }} />
                        </div>
                    )}

                    {/* MANUAL INPUT */}
                    {mode === "manual" && (
                        <div className="card-glass">
                            <div className="card-label">
                                <i className="bi bi-sliders"></i> Packaging Parameters
                                <button className="reset-btn" onClick={() => setMode(null)}>
                                    <i className="bi bi-arrow-left"></i> Back
                                </button>
                            </div>
                            <div className="input-grid">
                                {[
                                    { key: "weight_capacity", label: "Weight Capacity", hint: "How heavy is the product?" },
                                    { key: "strength", label: "Strength", hint: "How durable does it need to be?" },
                                    { key: "biodegradability", label: "Biodegradability", hint: "How important is natural breakdown?" },
                                    { key: "recyclability", label: "Recyclability", hint: "How important is recyclability?" },
                                ].map(({ key, label, hint }) => (
                                    <div className="input-group-custom" key={key}>
                                        <label>{label} <span className="range-badge">1–10</span></label>
                                        <input
                                            className="form-control"
                                            placeholder={hint}
                                            type="number" min="1" max="10" required
                                            value={data[key]}
                                            onChange={e => {
                                                let val = e.target.value;
                                                if (val !== "") {
                                                    const num = parseInt(val, 10);
                                                    if (num < 1) val = "1";
                                                    else if (num > 10) val = "10";
                                                    else val = num.toString();
                                                }
                                                setData({ ...data, [key]: val });
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                            {error && (
                                <div className="api-error">
                                    <i className="bi bi-exclamation-triangle-fill"></i> {error}
                                </div>
                            )}
                            <button
                                className="btn-primary-eco"
                                onClick={handleManualPredict}
                                disabled={
                                    loading ||
                                    !data.strength ||
                                    !data.weight_capacity ||
                                    !data.biodegradability ||
                                    !data.recyclability
                                }
                            >
                                <i className={`bi ${loading ? "bi-arrow-repeat spin" : "bi-lightning-charge-fill"}`}></i>
                                {loading ? "Analyzing…" : "Run AI Analysis"}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* TAB 2: RESULTS */}
            {activePage === "results" && (
                <>
                    {!showResults ? (
                        <div className="card-glass empty-state" style={{ padding: "80px 0" }}>
                            <i className="bi bi-box-seam"></i>
                            <span style={{ marginTop: "10px" }}>No recommendations yet. Complete an analysis first.</span>
                            <button className="btn-primary-eco" style={{ marginTop: "20px" }} onClick={() => setActivePage("overview")}>
                                Go to Parameters
                            </button>
                        </div>
                    ) : (
                        <ResultsPanel
                            materials={materials}
                            params={lastParams}
                            source={rankSource}
                            onReset={resetAll}
                        />
                    )}
                </>
            )}

            {/* TAB 3: ANALYTICS & BI DASHBOARD */}
            {activePage === "analytics" && (
                <>
                    {!showResults ? (
                        <div className="card-glass empty-state" style={{ padding: "80px 0" }}>
                            <i className="bi bi-bar-chart-line"></i>
                            <span style={{ marginTop: "10px" }}>Dashboard requires data. Complete an analysis first.</span>
                            <button className="btn-primary-eco" style={{ marginTop: "20px" }} onClick={() => setActivePage("overview")}>
                                Go to Parameters
                            </button>
                        </div>
                    ) : (
                        <>
                            <BIDashboard materials={materials} />

                            {/* Generate Report Button at the bottom of the Dashboard */}
                            <div className="report-cta-wrapper">
                                <div className="report-cta-text">
                                    <i className="bi bi-file-earmark-pdf-fill"></i>
                                    <div>
                                        <strong>Download Sustainability Report</strong>
                                        <span>Full 3-page PDF — materials, analytics, and insights</span>
                                    </div>
                                </div>
                                <button
                                    className="btn-report"
                                    onClick={handleGenerateReport}
                                    disabled={reportLoading}
                                >
                                    {reportLoading
                                        ? <><i className="bi bi-arrow-repeat spin"></i> Generating…</>
                                        : <><i className="bi bi-download"></i> Generate Report</>
                                    }
                                </button>
                            </div>
                        </>
                    )}
                </>
            )}
        </>
    );
}