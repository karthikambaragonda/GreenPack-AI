import { useState, useRef, useEffect, useCallback } from "react";
import {
    Chart,
    BarElement, BarController,
    RadarController, RadialLinearScale, PointElement, LineElement,
    CategoryScale, LinearScale,
    Tooltip, Legend, Filler,
} from "chart.js";

Chart.register(
    BarElement, BarController,
    RadarController, RadialLinearScale, PointElement, LineElement,
    CategoryScale, LinearScale,
    Tooltip, Legend, Filler
);

import axios from "axios";
import "../index.css";
import { generateReport } from "../services/reportGenerator";

// ─── API BASE ─────────────────────────────────────────────────────────────────
const API_BASE = "https://greenpackai.azurewebsites.net/";

// ─── SCALE HELPERS ────────────────────────────────────────────────────────────
function toApiParams(p) {
    return {
        strength: Math.max(1, Math.min(5, parseFloat(((p.strength ?? 5) / 10 * 5).toFixed(2)))),
        weight_capacity: Math.max(1, Math.min(5, parseFloat(((p.weight_capacity ?? 5) / 10 * 5).toFixed(2)))),
        biodegradability: Math.max(0, Math.min(100, parseFloat(((p.biodegradability ?? 5) / 10 * 100).toFixed(2)))),
        recyclability: Math.max(0, Math.min(100, parseFloat(((p.recyclability ?? 5) / 10 * 100).toFixed(2)))),
        co2_emission: Math.max(0, Math.min(100, parseFloat(((p.co2_emission ?? 5) / 10 * 100).toFixed(2)))),
    };
}

function toApiParamsManual(p) {
    return {
        strength: Math.max(1, Math.min(5, parseFloat(p.strength))),
        weight_capacity: Math.max(1, Math.min(5, parseFloat(p.weight_capacity))),
        biodegradability: Math.max(0, Math.min(100, parseFloat(p.biodegradability))),
        recyclability: Math.max(0, Math.min(100, parseFloat(p.recyclability))),
        co2_emission: Math.max(0, Math.min(100, parseFloat(p.co2_emission))),
    };
}

// ─── NORMALISE API MATERIAL ───────────────────────────────────────────────────
function normaliseMaterial(m, index) {
    const props = m.properties ?? {};
    const sus = m.sustainability ?? {};
    const flags = m.flags ?? {};
    return {
        rank: m.rank ?? (index + 1),
        material_name: m.material_name,
        material_type: m.material_type,
        material_id: m.material_id,
        match_score: m.match_score ?? 0,
        similarity_to_request: m.similarity_to_request ?? "—",
        sustainability_score: sus.score ?? m.sustainability_score ?? 0,
        sustainability_tier: sus.tier ?? m.sustainability_tier ?? "—",
        sustainability_rank: sus.rank ?? m.sustainability_rank ?? 0,
        strength_score: props.strength_score ?? m.strength_score ?? 0,
        weight_capacity_score: props.weight_capacity_score ?? m.weight_capacity_score ?? 0,
        biodegradability: props.biodegradability_score ?? m.biodegradability_score ?? 0,
        recyclability: props.recyclability_percent ?? m.recyclability_percent ?? 0,
        co2_emission_score: props.co2_emission_score ?? m.co2_emission_score ?? 0,
        eco_score: props.eco_score ?? m.eco_score ?? 0,
        performance_score: props.performance_score ?? m.performance_score ?? 0,
        eco_performance_ratio: props.eco_performance_ratio ?? m.eco_performance_ratio ?? 0,
        is_biodegradable: flags.is_biodegradable ?? m.is_biodegradable ?? false,
        is_recyclable: flags.is_recyclable ?? m.is_recyclable ?? false,
        dual_end_of_life: flags.dual_end_of_life ?? m.dual_end_of_life ?? false,
        co2_savings_percent: parseFloat((props.co2_emission_score ?? m.co2_emission_score ?? 0).toFixed(1)),
        final_score: (sus.score ?? m.sustainability_score ?? 0) / 100,
        eco_tag: m.eco_tag ?? null,
        reason: m.reason ?? null,
    };
}

// ─── TIER COLOUR MAP ─────────────────────────────────────────────────────────
const TIER_COLOR = {
    Excellent: "#00ffd5",
    Good: "#4cc9f0",
    Moderate: "#ffd166",
    Poor: "#ff4d6d",
};

// ─── WIZARD STEPS ─────────────────────────────────────────────────────────────
const STEPS = [
    {
        id: "product", botText: "Hey! 👋 What kind of product are you packaging?", type: "chips",
        options: [
            { label: "🍎 Food / Snacks", value: "food" },
            { label: "📱 Electronics", value: "electronics" },
            { label: "💄 Cosmetics / Beauty", value: "cosmetics" },
            { label: "👕 Clothing / Apparel", value: "clothing" },
            { label: "🧪 Chemicals / Liquids", value: "chemicals" },
            { label: "🔩 Industrial Parts", value: "industrial" },
        ],
        resolver: (val) => ({
            food: { strength: 4, weight_capacity: 4 }, electronics: { strength: 7, weight_capacity: 5 },
            cosmetics: { strength: 5, weight_capacity: 3 }, clothing: { strength: 3, weight_capacity: 2 },
            chemicals: { strength: 6, weight_capacity: 7 }, industrial: { strength: 9, weight_capacity: 9 },
        }[val] ?? {})
    },
    {
        id: "fragility", botText: "Is it fragile, or can it handle a few bumps?", type: "chips",
        options: [
            { label: "💎 Very fragile", value: "very_fragile" }, { label: "⚠️ Somewhat delicate", value: "delicate" },
            { label: "💪 Fairly sturdy", value: "sturdy" }, { label: "🪨 Basically indestructible", value: "tough" },
        ],
        resolver: (val) => ({ very_fragile: { strength: 2 }, delicate: { strength: 4 }, sturdy: { strength: 7 }, tough: { strength: 9 } }[val] ?? {})
    },
    {
        id: "weight", botText: "How heavy is one unit of the product?", type: "chips",
        options: [
            { label: "🪶 Super light (< 100 g)", value: "ultralight" }, { label: "📦 Light (100 g – 1 kg)", value: "light" },
            { label: "🎒 Medium (1 – 5 kg)", value: "medium" }, { label: "🏋️ Heavy (5 kg +)", value: "heavy" },
        ],
        resolver: (val) => ({ ultralight: { weight_capacity: 1 }, light: { weight_capacity: 3 }, medium: { weight_capacity: 6 }, heavy: { weight_capacity: 9 } }[val] ?? {})
    },
    {
        id: "eco_priority", botText: "How much does eco-friendliness matter to your brand?", type: "chips",
        options: [
            { label: "🌍 It's our #1 priority", value: "top" }, { label: "♻️ Very important", value: "high" },
            { label: "👍 Nice to have", value: "medium" }, { label: "😐 Not really a concern", value: "low" },
        ],
        resolver: (val) => ({
            top: { biodegradability: 9, recyclability: 9, co2_emission: 9 },
            high: { biodegradability: 7, recyclability: 7, co2_emission: 7 },
            medium: { biodegradability: 4, recyclability: 5, co2_emission: 5 },
            low: { biodegradability: 2, recyclability: 2, co2_emission: 2 },
        }[val] ?? {})
    },
    {
        id: "compost", botText: "Should the packaging break down naturally after use?", type: "chips",
        options: [
            { label: "✅ Must be compostable", value: "must" }, { label: "🌱 Prefer biodegradable", value: "prefer" },
            { label: "🔄 Recyclable is enough", value: "recycle" }, { label: "❌ Doesn't matter", value: "none" },
        ],
        resolver: (val) => ({
            must: { biodegradability: 10, co2_emission: 9 }, prefer: { biodegradability: 7 },
            recycle: { biodegradability: 3, recyclability: 9 }, none: { biodegradability: 1 },
        }[val] ?? {})
    },
    { id: "confirm", type: "confirm", botText: null },
];

const CONTEXT_LABELS = {
    food: { product: "food / snacks" }, electronics: { product: "electronics / devices" },
    cosmetics: { product: "cosmetics / beauty products" }, clothing: { product: "clothing / apparel" },
    chemicals: { product: "chemicals / liquids" }, industrial: { product: "industrial / heavy parts" },
    very_fragile: { fragility: "very fragile" }, delicate: { fragility: "somewhat delicate" },
    sturdy: { fragility: "fairly sturdy" }, tough: { fragility: "basically indestructible" },
    ultralight: { weight: "super light <100g" }, light: { weight: "light 100g–1kg" },
    medium: { weight: "medium 1–5kg" }, heavy: { weight: "heavy 5kg+" },
    top: { eco_priority: "eco #1 priority" }, high: { eco_priority: "very eco-conscious" },
    low: { eco_priority: "not eco-focused" },
    must: { compost: "must compost" }, prefer: { compost: "prefer biodegradable" },
    recycle: { compost: "recyclable ok" }, none: { compost: "no preference" },
};

function clamp10(v) { return Math.max(1, Math.min(10, Math.round(v ?? 5))); }
function finaliseWizard(p) {
    return {
        strength: clamp10(p.strength), weight_capacity: clamp10(p.weight_capacity),
        biodegradability: clamp10(p.biodegradability), recyclability: clamp10(p.recyclability),
        co2_emission: clamp10(p.co2_emission ?? 5),
    };
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────
async function runFullPipeline(apiParams) {
    const res = await axios.post(`${API_BASE}/recommend`, { ...apiParams, top_n: 5 });
    const raw = res.data.recommendations ?? [];
    return {
        results: raw.map((m, i) => normaliseMaterial(m, i)),
        source: "EcoPack AI",
        userProfile: res.data.user_profile ?? null,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: API STATUS BAR  —  GET /health
// ═══════════════════════════════════════════════════════════════════════════════
function ApiStatusBar() {
    const [health, setHealth] = useState(null);
    const [status, setStatus] = useState("loading");

    useEffect(() => {
        axios.get(`${API_BASE}/health`)
            .then(r => { setHealth(r.data); setStatus("ok"); })
            .catch(() => setStatus("error"));
    }, []);

    if (status === "loading") return (
        <div className="api-status-bar loading">
            <i className="bi bi-arrow-repeat spin"></i>&nbsp;Connecting to EcoPacking API…
        </div>
    );
    if (status === "error") return (
        <div className="api-status-bar error">
            <i className="bi bi-exclamation-triangle-fill"></i>&nbsp;
            API offline — start Flask on port 5000 to use the app
        </div>
    );

    const { model, uptime_seconds } = health;
    const upMins = Math.floor(uptime_seconds / 60);
    const upSecs = uptime_seconds % 60;

    return (
        <div className="api-status-bar ok">
            <span className="status-dot"></span>
            <span className="status-item"><strong>API Online</strong></span>
            <span className="status-sep">·</span>
            <span className="status-item"><i className="bi bi-box-seam"></i> <strong>{model.materials_in_catalogue}</strong> materials</span>
            <span className="status-sep">·</span>
            <span className="status-item"><i className="bi bi-graph-up"></i> R² <strong>{(model.cv_r2 * 100).toFixed(1)}%</strong></span>
            <span className="status-sep">·</span>
            <span className="status-item"><i className="bi bi-cpu"></i> Accuracy <strong>{(model.cv_accuracy * 100).toFixed(1)}%</strong></span>
            <span className="status-sep">·</span>
            <span className="status-item"><i className="bi bi-clock"></i> Up {upMins}m {upSecs}s</span>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: MATERIAL DETAIL MODAL  —  GET /materials/<id>
// ═══════════════════════════════════════════════════════════════════════════════
function MaterialDetailModal({ materialId, onClose }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!materialId) return;
        setLoading(true); setError(""); setDetail(null);
        axios.get(`${API_BASE}/materials/${materialId}`)
            .then(r => { setDetail(r.data.material); setLoading(false); })
            .catch(() => { setError("Could not load material details."); setLoading(false); });
    }, [materialId]);

    if (!materialId) return null;

    const props = detail?.properties ?? {};
    const sus = detail?.sustainability ?? {};
    const flags = detail?.flags ?? {};
    const tierColor = TIER_COLOR[sus.tier] ?? "#8b94a3";

    const propBars = [
        { label: "Biodegradability", value: props.biodegradability_score, max: 100, color: "#00ffd5", suffix: "%" },
        { label: "Recyclability", value: props.recyclability_percent, max: 100, color: "#4cc9f0", suffix: "%" },
        { label: "CO₂ Eco-Score", value: props.co2_emission_score, max: 100, color: "#ffd166", suffix: "%" },
        { label: "Eco Score", value: props.eco_score, max: 100, color: "#a78bfa", suffix: "" },
        { label: "Strength", value: props.strength_score, max: 5, color: "#f97316", suffix: "/5" },
        { label: "Weight Capacity", value: props.weight_capacity_score, max: 5, color: "#fb7185", suffix: "/5" },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-drawer" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <i className="bi bi-x-lg"></i>
                </button>

                {loading && <div className="modal-loading"><i className="bi bi-arrow-repeat spin"></i> Loading material…</div>}
                {error && <div className="modal-error">{error}</div>}

                {detail && !loading && (
                    <>
                        <div className="modal-header">
                            <div className="modal-type-badge">{detail.material_type}</div>
                            <h2 className="modal-title">{detail.material_name}</h2>
                            <div className="modal-meta">
                                <span className="modal-tier" style={{ color: tierColor, borderColor: tierColor }}>{sus.tier}</span>
                                <span className="modal-score-big" style={{ color: tierColor }}>{sus.score?.toFixed(1)}</span>
                                <span className="modal-score-label">Sustainability Score</span>
                                <span className="modal-rank">Global Rank #{sus.rank}</span>
                            </div>
                        </div>

                        <div className="modal-flags">
                            {[
                                { key: "is_biodegradable", label: "Biodegradable", icon: "bi-leaf", on: flags.is_biodegradable },
                                { key: "is_recyclable", label: "Recyclable", icon: "bi-recycle", on: flags.is_recyclable },
                                { key: "dual_end_of_life", label: "Dual EOL", icon: "bi-arrow-repeat", on: flags.dual_end_of_life },
                            ].map(f => (
                                <span key={f.key} className={`modal-flag ${f.on ? "flag-on" : "flag-off"}`}>
                                    <i className={`bi ${f.icon}`}></i> {f.label}
                                </span>
                            ))}
                        </div>

                        <div className="modal-bars">
                            {propBars.map(b => b.value !== undefined && (
                                <div className="modal-bar-row" key={b.label}>
                                    <span className="modal-bar-label">{b.label}</span>
                                    <div className="modal-bar-track">
                                        <div className="modal-bar-fill" style={{ width: `${(b.value / b.max) * 100}%`, background: b.color }} />
                                    </div>
                                    <span className="modal-bar-value">{b.value?.toFixed(1)}{b.suffix}</span>
                                </div>
                            ))}
                        </div>

                        <div className="modal-derived">
                            <div className="modal-derived-item">
                                <span>Performance Score</span>
                                <strong>{props.performance_score?.toFixed(2)}</strong>
                            </div>
                            <div className="modal-derived-item">
                                <span>Eco/Performance Ratio</span>
                                <strong>{props.eco_performance_ratio?.toFixed(2)}</strong>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: LIVE SCORE PREDICTOR  —  POST /predict-score
// ═══════════════════════════════════════════════════════════════════════════════
function ScorePredictor({ params }) {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);

    useEffect(() => {
        const allValid = (
            params.strength && params.weight_capacity &&
            params.biodegradability && params.recyclability && params.co2_emission
        );
        if (!allValid) { setResult(null); return; }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const r = await axios.post(`${API_BASE}/predict-score`, toApiParamsManual(params));
                setResult(r.data);
            } catch { setResult(null); }
            finally { setLoading(false); }
        }, 600);
        return () => clearTimeout(debounceRef.current);
    }, [params.strength, params.weight_capacity, params.biodegradability, params.recyclability, params.co2_emission]);

    if (!result && !loading) return null;

    const tierColor = TIER_COLOR[result?.sustainability_tier] ?? "#8b94a3";
    const score = result?.sustainability_score ?? 0;
    // Arc: semicircle path length ≈ 157
    const arcLen = (score / 100) * 157;

    return (
        <div className="score-predictor">
            <div className="score-predictor-label">
                <i className="bi bi-stars"></i> Live Score Preview
                <span className="score-predictor-hint">Updates as you type</span>
            </div>
            {loading ? (
                <div className="score-predictor-loading"><i className="bi bi-arrow-repeat spin"></i> Calculating…</div>
            ) : result && (
                <div className="score-predictor-result">
                    <div className="score-gauge-wrap">
                        <svg viewBox="0 0 120 70" className="score-gauge-svg">
                            <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" />
                            <path
                                d="M10,60 A50,50 0 0,1 110,60"
                                fill="none" stroke={tierColor} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${arcLen} 157`}
                                style={{ filter: `drop-shadow(0 0 6px ${tierColor})`, transition: "stroke-dasharray 0.5s ease" }}
                            />
                            <text x="60" y="56" textAnchor="middle" fill={tierColor} fontSize="20" fontWeight="700">{score.toFixed(0)}</text>
                            <text x="60" y="67" textAnchor="middle" fill="#64748b" fontSize="7">out of 100</text>
                        </svg>
                    </div>
                    <div className="score-tier-info">
                        <div className="score-tier-badge" style={{ color: tierColor, borderColor: tierColor }}>
                            {result.sustainability_tier}
                        </div>
                        <div className="score-tier-guide">{result.tier_guide?.[result.sustainability_tier]}</div>
                        <div className="score-tier-all">
                            {Object.entries(result.tier_guide ?? {}).map(([tier, desc]) => (
                                <div key={tier} className={`tier-row ${tier === result.sustainability_tier ? "tier-active" : ""}`}
                                    style={{ borderLeftColor: TIER_COLOR[tier] ?? "#8b94a3" }}>
                                    <strong style={{ color: TIER_COLOR[tier] }}>{tier}</strong>
                                    <span>{desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: MATERIAL CATALOGUE  —  GET /materials (filter, sort, paginate)
// ═══════════════════════════════════════════════════════════════════════════════
function CatalogueBrowser({ onMaterialClick }) {
    const [materials, setMaterials] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, per_page: 15 });
    const [filters, setFilters] = useState({ type: "", tier: "" });
    const [sort, setSort] = useState({ by: "sustainability_rank", order: "asc" });
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    const TIERS = ["", "Excellent", "Good", "Moderate", "Poor"];
    const TYPES = ["", "Bioplastic", "Paper", "Metal", "Glass", "Plastic", "Composite", "Natural Fiber", "Foam"];
    const SORTS = [
        { value: "sustainability_rank", label: "Sustainability Rank" },
        { value: "sustainability_score", label: "Sustainability Score" },
        { value: "biodegradability_score", label: "Biodegradability" },
        { value: "recyclability_percent", label: "Recyclability" },
        { value: "co2_emission_score", label: "CO₂ Score" },
        { value: "material_name", label: "Name A–Z" },
    ];

    const fetchMaterials = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, per_page: pagination.per_page, sort_by: sort.by, order: sort.order };
            if (filters.type) params.type = filters.type;
            if (filters.tier) params.tier = filters.tier;
            const r = await axios.get(`${API_BASE}/materials`, { params });
            setMaterials(r.data.materials ?? []);
            setPagination(prev => ({ ...prev, total: r.data.total, page: r.data.page, pages: r.data.pages }));
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [filters.type, filters.tier, sort.by, sort.order, pagination.per_page]);

    useEffect(() => { fetchMaterials(1); }, [filters.type, filters.tier, sort.by, sort.order]);

    const visible = search
        ? materials.filter(m => m.material_name.toLowerCase().includes(search.toLowerCase()))
        : materials;

    const tc = (tier) => TIER_COLOR[tier] ?? "#8b94a3";

    return (
        <div className="catalogue-browser">
            {/* Controls */}
            <div className="catalogue-controls">
                <div className="catalogue-search">
                    <i className="bi bi-search"></i>
                    <input type="text" placeholder="Search materials…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="catalogue-select" value={filters.tier} onChange={e => setFilters(f => ({ ...f, tier: e.target.value }))}>
                    {TIERS.map(t => <option key={t} value={t}>{t || "All Tiers"}</option>)}
                </select>
                <select className="catalogue-select" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
                    {TYPES.map(t => <option key={t} value={t}>{t || "All Types"}</option>)}
                </select>
                <select className="catalogue-select" value={sort.by} onChange={e => setSort(s => ({ ...s, by: e.target.value }))}>
                    {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <button
                    className="catalogue-sort-toggle"
                    onClick={() => setSort(s => ({ ...s, order: s.order === "asc" ? "desc" : "asc" }))}
                    title={sort.order === "asc" ? "Ascending — click to reverse" : "Descending — click to reverse"}
                >
                    <i className={`bi bi-sort-${sort.order === "asc" ? "down" : "up"}`}></i>
                </button>
            </div>

            {/* Stats strip */}
            <div className="catalogue-stats">
                <span>{pagination.total} materials</span>
                {filters.tier && <span className="stat-filter-tag">Tier: {filters.tier}</span>}
                {filters.type && <span className="stat-filter-tag">Type: {filters.type}</span>}
                {search && <span className="stat-filter-tag">Search: "{search}"</span>}
            </div>

            {loading ? (
                <div className="catalogue-loading"><i className="bi bi-arrow-repeat spin"></i> Loading catalogue…</div>
            ) : (
                <div className="catalogue-table-wrap">
                    <table className="catalogue-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Material</th>
                                <th>Type</th>
                                <th>Score</th>
                                <th>Tier</th>
                                <th>CO₂</th>
                                <th>Recycle %</th>
                                <th>Bio %</th>
                                <th>Flags</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map(m => (
                                <tr key={m.material_id} className="catalogue-row" onClick={() => onMaterialClick(m.material_id)} title="Click for full details">
                                    <td className="cat-rank">{m.sustainability_rank}</td>
                                    <td className="cat-name">{m.material_name}</td>
                                    <td><span className="cat-type-badge">{m.material_type}</span></td>
                                    <td>
                                        <div className="cat-score-bar">
                                            <div className="cat-score-fill" style={{ width: `${m.sustainability_score}%`, background: tc(m.sustainability_tier) }} />
                                            <span>{m.sustainability_score.toFixed(1)}</span>
                                        </div>
                                    </td>
                                    <td><span className="cat-tier" style={{ color: tc(m.sustainability_tier) }}>{m.sustainability_tier}</span></td>
                                    <td>{m.co2_emission_score.toFixed(1)}</td>
                                    <td>{m.recyclability_percent.toFixed(0)}%</td>
                                    <td>{m.biodegradability_score.toFixed(0)}%</td>
                                    <td className="cat-flags">
                                        {m.is_biodegradable && <span className="flag-pill bio" title="Biodegradable">🌱</span>}
                                        {m.is_recyclable && <span className="flag-pill rec" title="Recyclable">♻️</span>}
                                        {m.dual_end_of_life && <span className="flag-pill dual" title="Dual End-of-Life">✨</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {visible.length === 0 && <div className="catalogue-empty">No materials match your filters.</div>}
                </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="catalogue-pagination">
                    <button className="page-btn" disabled={pagination.page <= 1} onClick={() => fetchMaterials(pagination.page - 1)}>
                        <i className="bi bi-chevron-left"></i>
                    </button>
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                        .filter(p => Math.abs(p - pagination.page) <= 2)
                        .map(p => (
                            <button key={p} className={`page-btn ${p === pagination.page ? "page-active" : ""}`} onClick={() => fetchMaterials(p)}>{p}</button>
                        ))}
                    <button className="page-btn" disabled={pagination.page >= pagination.pages} onClick={() => fetchMaterials(pagination.page + 1)}>
                        <i className="bi bi-chevron-right"></i>
                    </button>
                    <span className="page-info">Page {pagination.page} of {pagination.pages} · {pagination.total} total</span>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: CHAT WIZARD
// ═══════════════════════════════════════════════════════════════════════════════
function ChatGuide({ onResultsReady }) {
    const [stepIndex, setStepIndex] = useState(0);
    const [params, setParams] = useState({});
    const [wizardContext, setWizardContext] = useState({});
    const [messages, setMessages] = useState([{ role: "bot", text: STEPS[0].botText }]);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");
    const bottomRef = useRef(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, status]);
    const push = (prev, role, text, extra = {}) => [...prev, { role, text, ...extra }];

    const handleChipClick = (option) => {
        const step = STEPS[stepIndex];
        const patch = step.resolver(option.value);
        const merged = { ...params, ...patch };
        setParams(merged);
        const ctxPatch = step.id === "eco_priority" && option.value === "medium"
            ? { eco_priority: "eco-friendliness is a nice-to-have" }
            : (CONTEXT_LABELS[option.value] ?? {});
        setWizardContext(prev => ({ ...prev, ...ctxPatch }));
        let next = push(messages, "user", option.label);
        const nextIdx = stepIndex + 1;
        const nextStep = STEPS[nextIdx];
        if (nextStep) {
            let botText = nextStep.botText;
            if (nextStep.type === "confirm") {
                const api = toApiParams(finaliseWizard(merged));
                botText = `Got it! Here's what I worked out:\n\nStrength: ${api.strength}/5 · Weight: ${api.weight_capacity}/5\nBiodegradability: ${api.biodegradability}% · Recyclability: ${api.recyclability}%\nCO₂ Eco-score: ${api.co2_emission}%\n\nReady to find your best materials?`;
            }
            next = push(next, "bot", botText);
        }
        setMessages(next);
        setStepIndex(nextIdx);
    };

    const handleConfirm = async () => {
        const fp = finaliseWizard(params);
        const apiParams = toApiParams(fp);
        let msgs = push(messages, "user", "Yes, let's go!");
        msgs = push(msgs, "bot", "Fetching recommendations… 🤖", { loading: true });
        setMessages(msgs); setStatus("calling-api"); setError("");
        try {
            const { results, source, userProfile } = await runFullPipeline(apiParams);
            msgs = msgs.filter(m => !m.loading);
            msgs = push(msgs, "bot", `Done! Top 5 selected via ${source}. 🌿`);
            setMessages(msgs); setStatus("done");
            onResultsReady(results, apiParams, source, wizardContext, userProfile);
        } catch (e) {
            console.error(e);
            setError("Couldn't reach the API on port 5000. Is the Flask server running?");
            setStatus("error");
        }
    };

    const handleRetake = () => {
        setStepIndex(0); setParams({}); setWizardContext({});
        setStatus("idle"); setError("");
        setMessages([{ role: "bot", text: STEPS[0].botText }]);
    };

    const busy = status === "calling-api";
    const currentStep = STEPS[stepIndex];
    const showChips = !busy && currentStep?.type === "chips" && status !== "done";
    const showConfirm = !busy && currentStep?.type === "confirm" && status !== "done";

    return (
        <div className="chat-guide-wrapper">
            <div className="wizard-progress">
                <div className="wizard-progress-fill" style={{ width: `${Math.min(100, (stepIndex / (STEPS.length - 1)) * 100)}%` }} />
            </div>
            <div className="chat-messages">
                {messages.map((m, i) => (
                    <div key={i} className={`chat-bubble-wrap ${m.role === "user" ? "user-wrap" : "bot-wrap"}`}>
                        {m.role === "bot" && <div className="bot-avatar"><i className="bi bi-recycle"></i></div>}
                        <div className={`chat-bubble ${m.role === "user" ? "bubble-user" : "bubble-bot"} ${m.loading ? "bubble-loading" : ""}`}>
                            {m.loading
                                ? <><i className="bi bi-arrow-repeat spin"></i>&nbsp;{m.text}</>
                                : m.text.split("\n").map((line, j, arr) => <span key={j}>{line}{j < arr.length - 1 && <br />}</span>)}
                        </div>
                    </div>
                ))}
                {busy && (
                    <div className="chat-bubble-wrap bot-wrap">
                        <div className="bot-avatar"><i className="bi bi-recycle"></i></div>
                        <div className="chat-bubble bubble-bot typing-indicator"><span /><span /><span /></div>
                    </div>
                )}
                {error && (
                    <div className="chat-error">
                        <i className="bi bi-exclamation-triangle-fill"></i> {error}
                        <button className="btn-ghost" style={{ marginLeft: "auto", padding: "4px 10px", fontSize: "0.75rem" }} onClick={handleRetake}>Retry</button>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
            {showChips && (
                <div className="chip-grid">
                    {currentStep.options.map(opt => (
                        <button key={opt.value} className="wizard-chip" onClick={() => handleChipClick(opt)}>{opt.label}</button>
                    ))}
                </div>
            )}
            {showConfirm && (
                <div className="confirm-row">
                    <button className="btn-primary-eco" onClick={handleConfirm}><i className="bi bi-lightning-charge-fill"></i> Find my materials!</button>
                    <button className="btn-ghost" onClick={handleRetake}><i className="bi bi-arrow-counterclockwise"></i> Start over</button>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: RESULTS PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function ResultsPanel({ materials, params, source, userProfile, onReset, onMaterialClick }) {
    const tc = (tier) => TIER_COLOR[tier] ?? "#8b94a3";
    return (
        <div className="card-glass">
            <div className="card-label">
                <i className="bi bi-award"></i> Recommended Materials
                {source && <span className="source-badge badge-gemini"><i className="bi bi-cpu"></i> {source}</span>}
                <button className="reset-btn" onClick={onReset}><i className="bi bi-arrow-counterclockwise"></i> New Analysis</button>
            </div>

            {userProfile && (
                <div className="user-profile-strip">
                    <div className="up-item">
                        <span>Your Profile Score</span>
                        <strong style={{ color: tc(userProfile.predicted_sustainability_tier) }}>{userProfile.predicted_sustainability_score}</strong>
                    </div>
                    <div className="up-item">
                        <span>Predicted Tier</span>
                        <strong style={{ color: tc(userProfile.predicted_sustainability_tier) }}>{userProfile.predicted_sustainability_tier}</strong>
                    </div>
                    {params && Object.entries(params).map(([k, v]) => (
                        <div key={k} className="up-item"><span>{k.replace(/_/g, " ")}</span><strong>{v}</strong></div>
                    ))}
                </div>
            )}

            <div className="materials-list">
                {materials.length === 0 && (
                    <div className="empty-state"><i className="bi bi-box-seam"></i><span>No results — run an analysis first</span></div>
                )}
                {materials.map((m) => (
                    <div className="material-card" key={m.rank} onClick={() => onMaterialClick(m.material_id)} style={{ cursor: "pointer" }} title="Click for full details">
                        <div className={`material-rank r${m.rank}`}>#{m.rank}</div>
                        <div className="material-info">
                            <div className="material-name">{m.material_name}</div>
                            <div className="material-type-badge">{m.material_type}</div>
                            {m.eco_tag && <div className="eco-tag">{m.eco_tag}</div>}
                            {m.reason && <div className="material-reason">{m.reason}</div>}
                            <div className="material-flags-inline">
                                {m.is_biodegradable && <span className="flag-pill bio">🌱 Bio</span>}
                                {m.is_recyclable && <span className="flag-pill rec">♻️ Recycle</span>}
                                {m.dual_end_of_life && <span className="flag-pill dual">✨ Dual EOL</span>}
                            </div>
                        </div>
                        <div className="material-stats">
                            <div className="material-stat"><span>Score</span><strong style={{ color: tc(m.sustainability_tier) }}>{m.sustainability_score.toFixed(1)}</strong></div>
                            <div className="material-stat"><span>Tier</span><strong style={{ color: tc(m.sustainability_tier) }}>{m.sustainability_tier}</strong></div>
                            <div className="material-stat"><span>Match</span><strong>{m.match_score.toFixed(1)}</strong></div>
                            <div className="material-stat"><span>Similarity</span><strong>{m.similarity_to_request}</strong></div>
                            <div className="material-stat"><span>CO₂ Score</span><strong>{m.co2_emission_score.toFixed(1)}%</strong></div>
                        </div>
                        <div className="material-detail-hint"><i className="bi bi-arrow-right-circle"></i></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: BI DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function BIDashboard({ materials, onMaterialClick }) {
    const refs = { co2: useRef(null), eco: useRef(null), savings: useRef(null), radar: useRef(null) };
    const instances = useRef({});
    const labels = materials.map(m => m.material_name.length > 15 ? m.material_name.slice(0, 14) + "…" : m.material_name);
    const COLORS = ["#00ffd5", "#4cc9f0", "#ffd166", "#ff4d6d", "#8b94a3"];
    const MUTED = (i) => COLORS[i] + "99";

    useEffect(() => {
        if (!materials.length) return;
        const TICK = "#64748b"; const GRID = "rgba(255,255,255,0.06)";
        const axis = (title) => ({ ticks: { color: TICK, font: { size: 11 } }, grid: { color: GRID }, ...(title ? { title: { display: true, text: title, color: TICK, font: { size: 11 } } } : {}) });
        const tooltipBase = { backgroundColor: "rgba(6,13,19,0.92)", borderColor: "rgba(0,255,213,0.3)", borderWidth: 1, titleColor: "#f0f4f8", bodyColor: "#64748b", padding: 10 };
        const base = { responsive: true, maintainAspectRatio: false, plugins: { tooltip: tooltipBase, legend: { display: false } } };
        const mk = (key, cfg) => { instances.current[key]?.destroy(); if (refs[key].current) instances.current[key] = new Chart(refs[key].current, cfg); };

        mk("co2", {
            type: "bar",
            data: { labels, datasets: [{ label: "CO₂ Eco-Score", data: materials.map(m => m.co2_emission_score), backgroundColor: COLORS, borderRadius: 6, borderSkipped: false }] },
            options: { ...base, scales: { x: axis(), y: { ...axis("CO₂ Eco-Score (0–100)"), beginAtZero: true, max: 100 } } },
        });
        mk("eco", {
            type: "bar",
            data: {
                labels, datasets: [
                    { label: "Recyclability %", data: materials.map(m => m.recyclability), backgroundColor: "rgba(0,255,213,0.75)", borderRadius: 4, borderSkipped: false },
                    { label: "Biodegradability %", data: materials.map(m => m.biodegradability), backgroundColor: "rgba(76,201,240,0.75)", borderRadius: 4, borderSkipped: false },
                ]
            },
            options: { ...base, plugins: { tooltip: tooltipBase, legend: { display: true, labels: { color: TICK, font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 14 } } }, scales: { x: axis(), y: { ...axis("%"), beginAtZero: true, max: 100 } } },
        });
        mk("savings", {
            type: "bar",
            data: { labels, datasets: [{ label: "Sustainability Score", data: materials.map(m => m.sustainability_score), backgroundColor: materials.map((_, i) => i === 0 ? "#00ffd5" : MUTED(i)), borderRadius: 6, borderSkipped: false }] },
            options: { ...base, indexAxis: "y", scales: { x: { ...axis("Sustainability Score (0–100)"), beginAtZero: true, max: 100 }, y: axis() } },
        });
        mk("radar", {
            type: "radar",
            data: {
                labels: ["Recyclability", "Biodegradability", "CO₂ Score", "Sustainability", "Match Score"],
                datasets: materials.map((m, i) => ({
                    label: m.material_name, data: [m.recyclability, m.biodegradability, m.co2_emission_score, m.sustainability_score, m.match_score],
                    borderColor: COLORS[i], backgroundColor: COLORS[i] + "22", borderWidth: 2, pointBackgroundColor: COLORS[i], pointRadius: 3,
                })),
            },
            options: {
                ...base,
                scales: { r: { beginAtZero: true, min: 0, max: 100, ticks: { color: TICK, font: { size: 10 }, stepSize: 25, backdropColor: "transparent" }, grid: { color: GRID }, pointLabels: { color: "#94a3b8", font: { size: 11 } }, angleLines: { color: GRID } } },
                plugins: { tooltip: tooltipBase, legend: { display: true, position: "bottom", labels: { color: TICK, font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 12 } } },
            },
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [materials]);

    useEffect(() => () => Object.values(instances.current).forEach(c => c?.destroy()), []);

    if (!materials.length) return null;

    const best = {
        co2: [...materials].sort((a, b) => b.co2_emission_score - a.co2_emission_score)[0],
        sus: [...materials].sort((a, b) => b.sustainability_score - a.sustainability_score)[0],
        recycle: [...materials].sort((a, b) => b.recyclability - a.recyclability)[0],
        bio: [...materials].sort((a, b) => b.biodegradability - a.biodegradability)[0],
    };

    return (
        <div className="bi-dashboard">
            <div className="card-glass bi-header-card">
                <div className="card-label"><i className="bi bi-bar-chart-line"></i> Sustainability Analytics</div>
                <div className="bi-metrics">
                    {[
                        { label: "Best CO₂ Score", mat: best.co2, sub: `${best.co2?.co2_emission_score.toFixed(1)}%` },
                        { label: "Top Sustainability", mat: best.sus, sub: `Score: ${best.sus?.sustainability_score.toFixed(1)}` },
                        { label: "Most Recyclable", mat: best.recycle, sub: `${best.recycle?.recyclability.toFixed(1)}%` },
                        { label: "Most Biodegradable", mat: best.bio, sub: `${best.bio?.biodegradability.toFixed(1)}%` },
                    ].map(({ label, mat, sub }) => (
                        <div key={label} className="bi-metric clickable-metric" onClick={() => mat && onMaterialClick(mat.material_id)} title="Click for full details">
                            <span>{label}</span>
                            <strong>{mat?.material_name}</strong>
                            <em>{sub}</em>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bi-charts-grid">
                <div className="card-glass bi-chart-card">
                    <div className="bi-chart-title"><i className="bi bi-cloud-haze2"></i> CO₂ Eco-Score <span className="bi-chart-subtitle">higher = greener</span></div>
                    <div className="bi-chart-wrap"><canvas ref={refs.co2} /></div>
                </div>
                <div className="card-glass bi-chart-card bi-chart-wide">
                    <div className="bi-chart-title"><i className="bi bi-recycle"></i> Recyclability vs Biodegradability</div>
                    <div className="bi-chart-wrap"><canvas ref={refs.eco} /></div>
                </div>
                <div className="card-glass bi-chart-card bi-chart-wide">
                    <div className="bi-chart-title"><i className="bi bi-bar-chart-steps"></i> Sustainability Score Ranking</div>
                    <div style={{ height: `${materials.length * 56 + 24}px` }}><canvas ref={refs.savings} /></div>
                </div>
                <div className="card-glass bi-chart-card bi-chart-wide">
                    <div className="bi-chart-title"><i className="bi bi-star-half"></i> Overall Sustainability Profile <span className="bi-chart-subtitle">radar · {materials.length} materials</span></div>
                    <div className="bi-chart-wrap bi-chart-radar"><canvas ref={refs.radar} /></div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard({ activePage = "overview", setActivePage = () => { } }) {
    const [mode, setMode] = useState(null);
    const [data, setData] = useState({ strength: "", weight_capacity: "", biodegradability: "", recyclability: "", co2_emission: "" });
    const [materials, setMaterials] = useState([]);
    const [lastParams, setLastParams] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [rankSource, setRankSource] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showResults, setShowResults] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [wizardCtx, setWizardCtx] = useState({});
    const [selectedMaterialId, setSelectedMaterialId] = useState(null);

    const handleManualPredict = async () => {
        setLoading(true); setError("");
        try {
            const apiParams = toApiParamsManual(data);
            const { results, source, userProfile: up } = await runFullPipeline(apiParams);
            setMaterials(results); setLastParams(apiParams); setUserProfile(up);
            setRankSource(source); setShowResults(true);
            setActivePage("results");
        } catch (e) {
            console.error(e);
            setError("Could not reach the API on port 5000. Make sure Flask is running.");
        } finally { setLoading(false); }
    };

    const resetAll = () => {
        setShowResults(false); setMaterials([]); setLastParams(null); setUserProfile(null);
        setRankSource(null); setMode(null); setWizardCtx({});
        setActivePage("overview");
    };

    const handleGenerateReport = async () => {
        setReportLoading(true);
        try { await generateReport(materials, lastParams, rankSource, wizardCtx); }
        finally { setReportLoading(false); }
    };

    const manualValid = (
        data.strength !== "" && parseFloat(data.strength) >= 1 && parseFloat(data.strength) <= 5 &&
        data.weight_capacity !== "" && parseFloat(data.weight_capacity) >= 1 && parseFloat(data.weight_capacity) <= 5 &&
        data.biodegradability !== "" && parseFloat(data.biodegradability) >= 0 && parseFloat(data.biodegradability) <= 100 &&
        data.recyclability !== "" && parseFloat(data.recyclability) >= 0 && parseFloat(data.recyclability) <= 100 &&
        data.co2_emission !== "" && parseFloat(data.co2_emission) >= 0 && parseFloat(data.co2_emission) <= 100
    );

    const MANUAL_FIELDS = [
        { key: "strength", label: "Strength", hint: "How durable / protective?", min: 1, max: 5, step: 0.1, unit: "1–5" },
        { key: "weight_capacity", label: "Weight Capacity", hint: "How heavy is the product?", min: 1, max: 5, step: 0.1, unit: "1–5" },
        { key: "biodegradability", label: "Biodegradability", hint: "Natural breakdown ability", min: 0, max: 100, step: 1, unit: "0–100" },
        { key: "recyclability", label: "Recyclability", hint: "Can be recycled (%)", min: 0, max: 100, step: 1, unit: "0–100" },
        { key: "co2_emission", label: "CO₂ Eco-Score", hint: "Higher = greener (0=worst, 100=best)", min: 0, max: 100, step: 1, unit: "0–100" },
    ];

    const ReportCTA = () => (
        <div className="report-cta-wrapper">
            <div className="report-cta-text">
                <i className="bi bi-file-earmark-pdf-fill"></i>
                <div>
                    <strong>Download Sustainability Report</strong>
                    <span>Full PDF — materials, analytics, and insights</span>
                </div>
            </div>
            <button className="btn-report" onClick={handleGenerateReport} disabled={reportLoading}>
                {reportLoading ? <><i className="bi bi-arrow-repeat spin"></i> Generating…</> : <><i className="bi bi-download"></i> Generate Report</>}
            </button>
        </div>
    );

    return (
        <>
            {/* ── GET /health → API Status Bar ── */}
            <ApiStatusBar />

            <div className="page-header">
                <div>
                    <h1>Sustainability <span>Packaging</span> <>Intelligence</></h1>
                    <p>AI-powered packaging material analysis &amp; recommendation</p>
                </div>
                <div className="header-badge">
                    <i className="bi bi-lightning-charge-fill"></i> Real-time Analysis
                </div>
            </div>

            {/* ── GET /materials/<id> → Material Detail Modal ── */}
            <MaterialDetailModal materialId={selectedMaterialId} onClose={() => setSelectedMaterialId(null)} />

            {/* ════ TAB: OVERVIEW / WIZARD / MANUAL ══════════════════════════ */}
            {activePage === "overview" && (
                <>
                    {!mode && (
                        <div className="mode-picker-section">
                            <div className="card-glass mode-picker-card" onClick={() => setMode("guide")}>
                                <div className="mode-icon-wrap accent"><i className="bi bi-chat-dots-fill"></i></div>
                                <div className="mode-body">
                                    <div className="mode-title">Guided Wizard <span className="mode-badge">Recommended</span></div>
                                    <div className="mode-desc">Answer a few plain-English questions — tap to pick, no typing needed.</div>
                                </div>
                                <i className="bi bi-arrow-right mode-arrow"></i>
                            </div>
                            <div className="mode-picker-divider">or</div>
                            <div className="card-glass mode-picker-card mode-manual" onClick={() => setMode("manual")}>
                                <div className="mode-icon-wrap muted"><i className="bi bi-sliders"></i></div>
                                <div className="mode-body">
                                    <div className="mode-title">Manual Input</div>
                                    <div className="mode-desc">Enter exact values if you know the technical parameters.</div>
                                </div>
                                <i className="bi bi-arrow-right mode-arrow"></i>
                            </div>
                        </div>
                    )}

                    {mode === "guide" && (
                        <div className="card-glass">
                            <div className="card-label">
                                <i className="bi bi-chat-dots-fill"></i> Packaging Wizard
                                <button className="reset-btn" onClick={() => setMode(null)}><i className="bi bi-arrow-left"></i> Back</button>
                            </div>
                            <ChatGuide onResultsReady={(mats, apiParams, src, ctx, up) => {
                                setMaterials(mats); setLastParams(apiParams); setUserProfile(up);
                                setRankSource(src); setWizardCtx(ctx || {}); setShowResults(true);
                                setActivePage("results");
                            }} />
                        </div>
                    )}

                    {mode === "manual" && (
                        <div className="card-glass">
                            <div className="card-label">
                                <i className="bi bi-sliders"></i> Packaging Parameters
                                <button className="reset-btn" onClick={() => setMode(null)}><i className="bi bi-arrow-left"></i> Back</button>
                            </div>
                            <div className="input-grid">
                                {MANUAL_FIELDS.map(({ key, label, hint, min, max, step, unit }) => (
                                    <div className="input-group-custom" key={key}>
                                        <label>{label} <span className="range-badge">{unit}</span></label>
                                        <input
                                            className="form-control" placeholder={hint}
                                            type="number" min={min} max={max} step={step} required
                                            value={data[key]}
                                            onChange={e => {
                                                let val = e.target.value;
                                                if (val !== "") {
                                                    const num = parseFloat(val);
                                                    if (num < min) val = String(min);
                                                    else if (num > max) val = String(max);
                                                    else val = String(num);
                                                }
                                                setData({ ...data, [key]: val });
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* ── POST /predict-score → Live Score Predictor ── */}
                            <ScorePredictor params={data} />

                            {error && <div className="api-error"><i className="bi bi-exclamation-triangle-fill"></i> {error}</div>}
                            <button className="btn-primary-eco" onClick={handleManualPredict} disabled={loading || !manualValid}>
                                <i className={`bi ${loading ? "bi-arrow-repeat spin" : "bi-lightning-charge-fill"}`}></i>
                                {loading ? "Analyzing…" : "Run AI Analysis"}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* ════ TAB: RESULTS  (POST /recommend) ══════════════════════════ */}
            {activePage === "results" && (
                <>
                    {!showResults ? (
                        <div className="card-glass empty-state" style={{ padding: "80px 0" }}>
                            <i className="bi bi-box-seam"></i>
                            <span style={{ marginTop: "10px" }}>No recommendations yet. Complete an analysis first.</span>
                            <button className="btn-primary-eco" style={{ marginTop: "20px" }} onClick={() => setActivePage("overview")}>Go to Parameters</button>
                        </div>
                    ) : (
                        <>
                            <ResultsPanel materials={materials} params={lastParams} source={rankSource} userProfile={userProfile} onReset={resetAll} onMaterialClick={setSelectedMaterialId} />
                            <BIDashboard materials={materials} onMaterialClick={setSelectedMaterialId} />
                            <ReportCTA />
                        </>
                    )}
                </>
            )}

            {/* ════ TAB: ANALYTICS ════════════════════════════════════════════ */}
            {activePage === "analytics" && (
                <>
                    {!showResults ? (
                        <div className="card-glass empty-state" style={{ padding: "80px 0" }}>
                            <i className="bi bi-bar-chart-line"></i>
                            <span style={{ marginTop: "10px" }}>Dashboard requires data. Complete an analysis first.</span>
                            <button className="btn-primary-eco" style={{ marginTop: "20px" }} onClick={() => setActivePage("overview")}>Go to Parameters</button>
                        </div>
                    ) : (
                        <>
                            <BIDashboard materials={materials} onMaterialClick={setSelectedMaterialId} />
                            <ReportCTA />
                        </>
                    )}
                </>
            )}

            {/* ════ TAB: CATALOGUE  (GET /materials + GET /materials/<id>) ══ */}
            {activePage === "catalogue" && (
                <div className="card-glass">
                    <div className="card-label">
                        <i className="bi bi-journal-text"></i> Material Catalogue
                        <span className="card-label-sub">Browse all materials · click any row for full detail</span>
                    </div>
                    <CatalogueBrowser onMaterialClick={setSelectedMaterialId} />
                </div>
            )}
        </>
    );
}
