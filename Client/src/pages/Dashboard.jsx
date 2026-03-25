// import { useState, useRef, useEffect, useCallback } from "react";
// import {
//     Chart,
//     BarElement, BarController,
//     RadarController, RadialLinearScale, PointElement, LineElement,
//     CategoryScale, LinearScale,
//     Tooltip, Legend, Filler,
// } from "chart.js";

// Chart.register(
//     BarElement, BarController,
//     RadarController, RadialLinearScale, PointElement, LineElement,
//     CategoryScale, LinearScale,
//     Tooltip, Legend, Filler
// );

// import axios from "axios";
// import "../index.css";
// import { generateReport } from "../services/reportGenerator";

// // ─── API BASE ─────────────────────────────────────────────────────────────────
// const API_BASE = "http://127.0.0.1:8000";

// // ─── SCALE HELPERS ────────────────────────────────────────────────────────────
// function toApiParams(p) {
//     return {
//         strength: Math.max(1, Math.min(5, parseFloat(((p.strength ?? 5) / 10 * 5).toFixed(2)))),
//         weight_capacity: Math.max(1, Math.min(5, parseFloat(((p.weight_capacity ?? 5) / 10 * 5).toFixed(2)))),
//         biodegradability: Math.max(0, Math.min(100, parseFloat(((p.biodegradability ?? 5) / 10 * 100).toFixed(2)))),
//         recyclability: Math.max(0, Math.min(100, parseFloat(((p.recyclability ?? 5) / 10 * 100).toFixed(2)))),
//         co2_emission: Math.max(0, Math.min(100, parseFloat(((p.co2_emission ?? 5) / 10 * 100).toFixed(2)))),
//     };
// }

// function toApiParamsManual(p) {
//     return {
//         strength: Math.max(1, Math.min(5, parseFloat(p.strength))),
//         weight_capacity: Math.max(1, Math.min(5, parseFloat(p.weight_capacity))),
//         biodegradability: Math.max(0, Math.min(100, parseFloat(p.biodegradability))),
//         recyclability: Math.max(0, Math.min(100, parseFloat(p.recyclability))),
//         co2_emission: Math.max(0, Math.min(100, parseFloat(p.co2_emission))),
//     };
// }

// // ─── NORMALISE API MATERIAL ───────────────────────────────────────────────────
// function normaliseMaterial(m, index) {
//     const props = m.properties ?? {};
//     const sus = m.sustainability ?? {};
//     const flags = m.flags ?? {};
//     return {
//         rank: m.rank ?? (index + 1),
//         material_name: m.material_name,
//         material_type: m.material_type,
//         material_id: m.material_id,
//         match_score: m.match_score ?? 0,
//         similarity_to_request: m.similarity_to_request ?? "—",
//         sustainability_score: sus.score ?? m.sustainability_score ?? 0,
//         sustainability_tier: sus.tier ?? m.sustainability_tier ?? "—",
//         sustainability_rank: sus.rank ?? m.sustainability_rank ?? 0,
//         strength_score: props.strength_score ?? m.strength_score ?? 0,
//         weight_capacity_score: props.weight_capacity_score ?? m.weight_capacity_score ?? 0,
//         biodegradability: props.biodegradability_score ?? m.biodegradability_score ?? 0,
//         recyclability: props.recyclability_percent ?? m.recyclability_percent ?? 0,
//         co2_emission_score: props.co2_emission_score ?? m.co2_emission_score ?? 0,
//         eco_score: props.eco_score ?? m.eco_score ?? 0,
//         performance_score: props.performance_score ?? m.performance_score ?? 0,
//         eco_performance_ratio: props.eco_performance_ratio ?? m.eco_performance_ratio ?? 0,
//         is_biodegradable: flags.is_biodegradable ?? m.is_biodegradable ?? false,
//         is_recyclable: flags.is_recyclable ?? m.is_recyclable ?? false,
//         dual_end_of_life: flags.dual_end_of_life ?? m.dual_end_of_life ?? false,
//         co2_savings_percent: parseFloat((props.co2_emission_score ?? m.co2_emission_score ?? 0).toFixed(1)),
//         final_score: (sus.score ?? m.sustainability_score ?? 0) / 100,
//         eco_tag: m.eco_tag ?? null,
//         reason: m.reason ?? null,
//     };
// }

// // ─── TIER COLOUR MAP ─────────────────────────────────────────────────────────
// const TIER_COLOR = {
//     Excellent: "#00ffd5",
//     Good: "#4cc9f0",
//     Moderate: "#ffd166",
//     Poor: "#ff4d6d",
// };

// // ─── WIZARD STEPS ─────────────────────────────────────────────────────────────
// const STEPS = [
//     {
//         id: "product",
//         botText: "Hey! 👋 What kind of product are you packaging?",
//         subText: "This sets the baseline strength and load requirements for your packaging.",
//         type: "chips",
//         options: [
//             { label: "🍎 Food / Snacks", value: "food", desc: "Moderate protection, food-safe barrier needed", impact: "Strength ↑ · Weight capacity ↑" },
//             { label: "📱 Electronics", value: "electronics", desc: "High shock protection, anti-static considerations", impact: "Strength ↑↑ · Weight capacity ↑" },
//             { label: "💄 Cosmetics / Beauty", value: "cosmetics", desc: "Light but presentable, premium feel", impact: "Strength ↑ · Weight capacity low" },
//             { label: "👕 Clothing / Apparel", value: "clothing", desc: "Minimal protection, lightweight", impact: "Strength low · Weight capacity low" },
//             { label: "🧪 Chemicals / Liquids", value: "chemicals", desc: "Chemical-resistant, leak-proof barrier", impact: "Strength ↑↑ · Weight capacity ↑↑" },
//             { label: "🔩 Industrial Parts", value: "industrial", desc: "Maximum durability, heavy load support", impact: "Strength MAX · Weight capacity MAX" },
//         ],
//         resolver: (val) => ({
//             food: { strength: 4, weight_capacity: 4 }, electronics: { strength: 7, weight_capacity: 5 },
//             cosmetics: { strength: 5, weight_capacity: 3 }, clothing: { strength: 3, weight_capacity: 2 },
//             chemicals: { strength: 6, weight_capacity: 7 }, industrial: { strength: 9, weight_capacity: 9 },
//         }[val] ?? {})
//     },
//     {
//         id: "fragility",
//         botText: "Is it fragile, or can it handle a few bumps?",
//         subText: "This fine-tunes the structural strength requirement of your packaging.",
//         type: "chips",
//         options: [
//             { label: "💎 Very fragile", value: "very_fragile", desc: "e.g. glassware, precision instruments", impact: "Strength → 2/5 — soft, cushioned materials preferred" },
//             { label: "⚠️ Somewhat delicate", value: "delicate", desc: "e.g. ceramics, printed electronics", impact: "Strength → 4/5 — moderate rigidity" },
//             { label: "💪 Fairly sturdy", value: "sturdy", desc: "e.g. shoes, books, boxed goods", impact: "Strength → 7/5 — firm packaging OK" },
//             { label: "🪨 Basically indestructible", value: "tough", desc: "e.g. metal tools, auto parts", impact: "Strength → 9/5 — heavy-duty materials" },
//         ],
//         resolver: (val) => ({ very_fragile: { strength: 2 }, delicate: { strength: 4 }, sturdy: { strength: 7 }, tough: { strength: 9 } }[val] ?? {})
//     },
//     {
//         id: "weight",
//         botText: "How heavy is one unit of the product?",
//         subText: "Heavier products need packaging with a higher load-bearing capacity.",
//         type: "chips",
//         options: [
//             { label: "🪶 Super light (< 100 g)", value: "ultralight", desc: "e.g. jewellery, sachets, SIM cards", impact: "Weight capacity → 1/5 — thin films & light boxes" },
//             { label: "📦 Light (100 g – 1 kg)", value: "light", desc: "e.g. cosmetics, phone accessories", impact: "Weight capacity → 3/5 — standard cartons" },
//             { label: "🎒 Medium (1 – 5 kg)", value: "medium", desc: "e.g. laptops, shoes, food jars", impact: "Weight capacity → 6/5 — corrugated or rigid boxes" },
//             { label: "🏋️ Heavy (5 kg +)", value: "heavy", desc: "e.g. machinery, bulk food, tools", impact: "Weight capacity → 9/5 — industrial crates & pallets" },
//         ],
//         resolver: (val) => ({ ultralight: { weight_capacity: 1 }, light: { weight_capacity: 3 }, medium: { weight_capacity: 6 }, heavy: { weight_capacity: 9 } }[val] ?? {})
//     },
//     {
//         id: "eco_priority",
//         botText: "How much does eco-friendliness matter to your brand?",
//         subText: "Sets the baseline for biodegradability, recyclability, and CO₂ targets.",
//         type: "chips",
//         options: [
//             { label: "🌍 It's our #1 priority", value: "top", desc: "Net-zero commitments, circular economy brand", impact: "Bio 90% · Recyclability 90% · CO₂ score 90%" },
//             { label: "♻️ Very important", value: "high", desc: "ESG reporting, sustainability leadership", impact: "Bio 70% · Recyclability 70% · CO₂ score 70%" },
//             { label: "👍 Nice to have", value: "medium", desc: "Eco-aware but cost-sensitive", impact: "Bio 40% · Recyclability 50% · CO₂ score 50%" },
//             { label: "😐 Not really a concern", value: "low", desc: "Performance and cost are the priority", impact: "Bio 20% · Recyclability 20% · CO₂ score 20%" },
//         ],
//         resolver: (val) => ({
//             top: { biodegradability: 9, recyclability: 9, co2_emission: 9 },
//             high: { biodegradability: 7, recyclability: 7, co2_emission: 7 },
//             medium: { biodegradability: 4, recyclability: 5, co2_emission: 5 },
//             low: { biodegradability: 2, recyclability: 2, co2_emission: 2 },
//         }[val] ?? {})
//     },
//     {
//         id: "compost",
//         botText: "Should the packaging break down naturally after use?",
//         subText: "Fine-tunes the end-of-life preference — composting vs recycling vs neither.",
//         type: "chips",
//         options: [
//             { label: "✅ Must be compostable", value: "must", desc: "Certified industrial or home compostable", impact: "Biodegradability MAX · CO₂ score ↑↑" },
//             { label: "🌱 Prefer biodegradable", value: "prefer", desc: "Natural breakdown preferred, not mandatory", impact: "Biodegradability ↑↑" },
//             { label: "🔄 Recyclable is enough", value: "recycle", desc: "Standard kerbside recycling stream", impact: "Recyclability ↑↑ · Biodegradability low" },
//             { label: "❌ Doesn't matter", value: "none", desc: "No end-of-life requirement", impact: "Biodegradability set low — performance focused" },
//         ],
//         resolver: (val) => ({
//             must: { biodegradability: 10, co2_emission: 9 }, prefer: { biodegradability: 7 },
//             recycle: { biodegradability: 3, recyclability: 9 }, none: { biodegradability: 1 },
//         }[val] ?? {})
//     },
//     { id: "confirm", type: "confirm", botText: null },
// ];
// const CONTEXT_LABELS = {
//     food: { product: "food / snacks" }, electronics: { product: "electronics / devices" },
//     cosmetics: { product: "cosmetics / beauty products" }, clothing: { product: "clothing / apparel" },
//     chemicals: { product: "chemicals / liquids" }, industrial: { product: "industrial / heavy parts" },
//     very_fragile: { fragility: "very fragile" }, delicate: { fragility: "somewhat delicate" },
//     sturdy: { fragility: "fairly sturdy" }, tough: { fragility: "basically indestructible" },
//     ultralight: { weight: "super light <100g" }, light: { weight: "light 100g–1kg" },
//     medium: { weight: "medium 1–5kg" }, heavy: { weight: "heavy 5kg+" },
//     top: { eco_priority: "eco #1 priority" }, high: { eco_priority: "very eco-conscious" },
//     low: { eco_priority: "not eco-focused" },
//     must: { compost: "must compost" }, prefer: { compost: "prefer biodegradable" },
//     recycle: { compost: "recyclable ok" }, none: { compost: "no preference" },
// };

// function clamp10(v) { return Math.max(1, Math.min(10, Math.round(v ?? 5))); }
// function finaliseWizard(p) {
//     return {
//         strength: clamp10(p.strength), weight_capacity: clamp10(p.weight_capacity),
//         biodegradability: clamp10(p.biodegradability), recyclability: clamp10(p.recyclability),
//         co2_emission: clamp10(p.co2_emission ?? 5),
//     };
// }

// // ─── PIPELINE ─────────────────────────────────────────────────────────────────
// async function runFullPipeline(apiParams) {
//     const res = await axios.post(`${API_BASE}/recommend`, { ...apiParams, top_n: 5 });
//     const raw = res.data.recommendations ?? [];
//     return {
//         results: raw.map((m, i) => normaliseMaterial(m, i)),
//         source: "GreenPack AI Model",
//         userProfile: res.data.user_profile ?? null,
//     };
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // COMPONENT: API STATUS BAR  —  GET /health
// // ═══════════════════════════════════════════════════════════════════════════════
// function ApiStatusBar() {
//     const [health, setHealth] = useState(null);
//     const [status, setStatus] = useState("loading");

//     useEffect(() => {
//         axios.get(`${API_BASE}/health`)
//             .then(r => { setHealth(r.data); setStatus("ok"); })
//             .catch(() => setStatus("error"));
//     }, []);

//     if (status === "loading") return (
//         <div className="api-status-bar loading">
//             <i className="bi bi-arrow-repeat spin"></i>&nbsp;Connecting to GreenPack API…
//         </div>
//     );
//     if (status === "error") return (
//         <div className="api-status-bar error">
//             <i className="bi bi-exclamation-triangle-fill"></i>&nbsp;
//             API offline — start Flask on port 5000 to use the app
//         </div>
//     );

//     const { model, uptime_seconds } = health;
//     const upMins = Math.floor(uptime_seconds / 60);
//     const upSecs = uptime_seconds % 60;

//     return (
//         <div className="api-status-bar ok">
//             <span className="status-dot"></span>
//             <span className="status-item"><strong>API Online</strong></span>
//             <span className="status-sep">·</span>
//             <span className="status-item"><i className="bi bi-box-seam"></i> <strong>{model.materials_in_catalogue}</strong> materials</span>
//             <span className="status-sep">·</span>
//             <span className="status-item"><i className="bi bi-graph-up"></i> R² <strong>{(model.cv_r2 * 100).toFixed(1)}%</strong></span>
//             <span className="status-sep">·</span>
//             <span className="status-item"><i className="bi bi-cpu"></i> Accuracy <strong>{(model.cv_accuracy * 100).toFixed(1)}%</strong></span>
//             <span className="status-sep">·</span>
//             <span className="status-item"><i className="bi bi-clock"></i> Up {upMins}m {upSecs}s</span>
//         </div>
//     );
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // COMPONENT: MATERIAL DETAIL MODAL  —  GET /materials/<id>
// // ═══════════════════════════════════════════════════════════════════════════════
// function MaterialDetailModal({ materialId, onClose }) {
//     const [detail, setDetail] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState("");

//     useEffect(() => {
//         if (!materialId) return;
//         setLoading(true); setError(""); setDetail(null);
//         axios.get(`${API_BASE}/materials/${materialId}`)
//             .then(r => { setDetail(r.data.material); setLoading(false); })
//             .catch(() => { setError("Could not load material details."); setLoading(false); });
//     }, [materialId]);

//     if (!materialId) return null;

//     const props = detail?.properties ?? {};
//     const sus = detail?.sustainability ?? {};
//     const flags = detail?.flags ?? {};
//     const tierColor = TIER_COLOR[sus.tier] ?? "#8b94a3";

//     const propBars = [
//         { label: "Biodegradability", value: props.biodegradability_score, max: 100, color: "#00ffd5", suffix: "%" },
//         { label: "Recyclability", value: props.recyclability_percent, max: 100, color: "#4cc9f0", suffix: "%" },
//         { label: "CO₂ Eco-Score", value: props.co2_emission_score, max: 100, color: "#ffd166", suffix: "%" },
//         { label: "Eco Score", value: props.eco_score, max: 100, color: "#a78bfa", suffix: "" },
//         { label: "Strength", value: props.strength_score, max: 5, color: "#f97316", suffix: "/5" },
//         { label: "Weight Capacity", value: props.weight_capacity_score, max: 5, color: "#fb7185", suffix: "/5" },
//     ];

//     return (
//         <div className="modal-overlay" onClick={onClose}>
//             <div className="modal-drawer" onClick={e => e.stopPropagation()}>
//                 <button className="modal-close" onClick={onClose}>
//                     <i className="bi bi-x-lg"></i>
//                 </button>

//                 {loading && <div className="modal-loading"><i className="bi bi-arrow-repeat spin"></i> Loading material…</div>}
//                 {error && <div className="modal-error">{error}</div>}

//                 {detail && !loading && (
//                     <>
//                         <div className="modal-header">
//                             <div className="modal-type-badge">{detail.material_type}</div>
//                             <h2 className="modal-title">{detail.material_name}</h2>
//                             <div className="modal-meta">
//                                 <span className="modal-tier" style={{ color: tierColor, borderColor: tierColor }}>{sus.tier}</span>
//                                 <span className="modal-score-big" style={{ color: tierColor }}>{sus.score?.toFixed(1)}</span>
//                                 <span className="modal-score-label">Sustainability Score</span>
//                                 <span className="modal-rank">Global Rank #{sus.rank}</span>
//                             </div>
//                         </div>

//                         <div className="modal-flags">
//                             {[
//                                 { key: "is_biodegradable", label: "Biodegradable", icon: "bi-leaf", on: flags.is_biodegradable },
//                                 { key: "is_recyclable", label: "Recyclable", icon: "bi-recycle", on: flags.is_recyclable },
//                                 { key: "dual_end_of_life", label: "Dual EOL", icon: "bi-arrow-repeat", on: flags.dual_end_of_life },
//                             ].map(f => (
//                                 <span key={f.key} className={`modal-flag ${f.on ? "flag-on" : "flag-off"}`}>
//                                     <i className={`bi ${f.icon}`}></i> {f.label}
//                                 </span>
//                             ))}
//                         </div>

//                         <div className="modal-bars">
//                             {propBars.map(b => b.value !== undefined && (
//                                 <div className="modal-bar-row" key={b.label}>
//                                     <span className="modal-bar-label">{b.label}</span>
//                                     <div className="modal-bar-track">
//                                         <div className="modal-bar-fill" style={{ width: `${(b.value / b.max) * 100}%`, background: b.color }} />
//                                     </div>
//                                     <span className="modal-bar-value">{b.value?.toFixed(1)}{b.suffix}</span>
//                                 </div>
//                             ))}
//                         </div>

//                         <div className="modal-derived">
//                             <div className="modal-derived-item">
//                                 <span>Performance Score</span>
//                                 <strong>{props.performance_score?.toFixed(2)}</strong>
//                             </div>
//                             <div className="modal-derived-item">
//                                 <span>Eco/Performance Ratio</span>
//                                 <strong>{props.eco_performance_ratio?.toFixed(2)}</strong>
//                             </div>
//                         </div>
//                     </>
//                 )}
//             </div>
//         </div>
//     );
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // COMPONENT: LIVE SCORE PREDICTOR  —  POST /predict-score
// // ═══════════════════════════════════════════════════════════════════════════════
// function ScorePredictor({ params }) {
//     const [result, setResult] = useState(null);
//     const [loading, setLoading] = useState(false);
//     const debounceRef = useRef(null);

//     useEffect(() => {
//         const allValid = (
//             params.strength && params.weight_capacity &&
//             params.biodegradability && params.recyclability && params.co2_emission
//         );
//         if (!allValid) { setResult(null); return; }
//         clearTimeout(debounceRef.current);
//         debounceRef.current = setTimeout(async () => {
//             setLoading(true);
//             try {
//                 const r = await axios.post(`${API_BASE}/predict-score`, toApiParamsManual(params));
//                 setResult(r.data);
//             } catch { setResult(null); }
//             finally { setLoading(false); }
//         }, 600);
//         return () => clearTimeout(debounceRef.current);
//     }, [params.strength, params.weight_capacity, params.biodegradability, params.recyclability, params.co2_emission]);

//     if (!result && !loading) return null;

//     const tierColor = TIER_COLOR[result?.sustainability_tier] ?? "#8b94a3";
//     const score = result?.sustainability_score ?? 0;
//     // Arc: semicircle path length ≈ 157
//     const arcLen = (score / 100) * 157;

//     return (
//         <div className="score-predictor">
//             <div className="score-predictor-label">
//                 <i className="bi bi-stars"></i> Live Score Preview
//                 <span className="score-predictor-hint">Updates as you type</span>
//             </div>
//             {loading ? (
//                 <div className="score-predictor-loading"><i className="bi bi-arrow-repeat spin"></i> Calculating…</div>
//             ) : result && (
//                 <div className="score-predictor-result">
//                     <div className="score-gauge-wrap">
//                         <svg viewBox="0 0 120 70" className="score-gauge-svg">
//                             <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" />
//                             <path
//                                 d="M10,60 A50,50 0 0,1 110,60"
//                                 fill="none" stroke={tierColor} strokeWidth="10" strokeLinecap="round"
//                                 strokeDasharray={`${arcLen} 157`}
//                                 style={{ filter: `drop-shadow(0 0 6px ${tierColor})`, transition: "stroke-dasharray 0.5s ease" }}
//                             />
//                             <text x="60" y="56" textAnchor="middle" fill={tierColor} fontSize="20" fontWeight="700">{score.toFixed(0)}</text>
//                             <text x="60" y="67" textAnchor="middle" fill="#64748b" fontSize="7">out of 100</text>
//                         </svg>
//                     </div>
//                     <div className="score-tier-info">
//                         <div className="score-tier-badge" style={{ color: tierColor, borderColor: tierColor }}>
//                             {result.sustainability_tier}
//                         </div>
//                         <div className="score-tier-guide">{result.tier_guide?.[result.sustainability_tier]}</div>
//                         <div className="score-tier-all">
//                             {/* {Object.entries(result.tier_guide ?? {}).map(([tier, desc]) => (
//                                 <div key={tier} className={`tier-row ${tier === result.sustainability_tier ? "tier-active" : ""}`}
//                                     style={{ borderLeftColor: TIER_COLOR[tier] ?? "#8b94a3" }}>
//                                     <strong style={{ color: TIER_COLOR[tier] }}>{tier}</strong>
//                                     <span>{desc}</span>
//                                 </div>
//                             ))} */}
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // COMPONENT: MATERIAL CATALOGUE  —  GET /materials (filter, sort, paginate)
// // ═══════════════════════════════════════════════════════════════════════════════
// function CatalogueBrowser({ onMaterialClick }) {
//     const [materials, setMaterials] = useState([]);
//     const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, per_page: 15 });
//     const [filters, setFilters] = useState({ type: "", tier: "" });
//     const [sort, setSort] = useState({ by: "sustainability_rank", order: "asc" });
//     const [loading, setLoading] = useState(false);
//     const [search, setSearch] = useState("");

//     const TIERS = ["", "Excellent", "Good", "Moderate", "Poor"];
//     const TYPES = ["", "Bioplastic", "Paper", "Metal", "Glass", "Plastic", "Composite", "Natural Fiber", "Foam"];
//     const SORTS = [
//         { value: "sustainability_rank", label: "Sustainability Rank" },
//         { value: "sustainability_score", label: "Sustainability Score" },
//         { value: "biodegradability_score", label: "Biodegradability" },
//         { value: "recyclability_percent", label: "Recyclability" },
//         { value: "co2_emission_score", label: "CO₂ Score" },
//         { value: "material_name", label: "Name A–Z" },
//     ];

//     const fetchMaterials = useCallback(async (page = 1) => {
//         setLoading(true);
//         try {
//             const params = { page, per_page: pagination.per_page, sort_by: sort.by, order: sort.order };
//             if (filters.type) params.type = filters.type;
//             if (filters.tier) params.tier = filters.tier;
//             const r = await axios.get(`${API_BASE}/materials`, { params });
//             setMaterials(r.data.materials ?? []);
//             setPagination(prev => ({ ...prev, total: r.data.total, page: r.data.page, pages: r.data.pages }));
//         } catch { /* silent */ }
//         finally { setLoading(false); }
//     }, [filters.type, filters.tier, sort.by, sort.order, pagination.per_page]);

//     useEffect(() => { fetchMaterials(1); }, [filters.type, filters.tier, sort.by, sort.order]);

//     const visible = search
//         ? materials.filter(m => m.material_name.toLowerCase().includes(search.toLowerCase()))
//         : materials;

//     const tc = (tier) => TIER_COLOR[tier] ?? "#8b94a3";

//     return (
//         <div className="catalogue-browser">
//             {/* Controls */}
//             <div className="catalogue-controls">
//                 <div className="catalogue-search">
//                     <i className="bi bi-search"></i>
//                     <input type="text" placeholder="Search materials…" value={search} onChange={e => setSearch(e.target.value)} />
//                 </div>
//                 <select className="catalogue-select" value={filters.tier} onChange={e => setFilters(f => ({ ...f, tier: e.target.value }))}>
//                     {TIERS.map(t => <option key={t} value={t}>{t || "All Tiers"}</option>)}
//                 </select>
//                 <select className="catalogue-select" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
//                     {TYPES.map(t => <option key={t} value={t}>{t || "All Types"}</option>)}
//                 </select>
//                 <select className="catalogue-select" value={sort.by} onChange={e => setSort(s => ({ ...s, by: e.target.value }))}>
//                     {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
//                 </select>
//                 <button
//                     className="catalogue-sort-toggle"
//                     onClick={() => setSort(s => ({ ...s, order: s.order === "asc" ? "desc" : "asc" }))}
//                     title={sort.order === "asc" ? "Ascending — click to reverse" : "Descending — click to reverse"}
//                 >
//                     <i className={`bi bi-sort-${sort.order === "asc" ? "down" : "up"}`}></i>
//                 </button>
//             </div>

//             {/* Stats strip */}
//             <div className="catalogue-stats">
//                 <span>{pagination.total} materials</span>
//                 {filters.tier && <span className="stat-filter-tag">Tier: {filters.tier}</span>}
//                 {filters.type && <span className="stat-filter-tag">Type: {filters.type}</span>}
//                 {search && <span className="stat-filter-tag">Search: "{search}"</span>}
//             </div>

//             {loading ? (
//                 <div className="catalogue-loading"><i className="bi bi-arrow-repeat spin"></i> Loading catalogue…</div>
//             ) : (
//                 <div className="catalogue-table-wrap">
//                     <table className="catalogue-table">
//                         <thead>
//                             <tr>
//                                 <th>Rank</th>
//                                 <th>Material</th>
//                                 <th>Type</th>
//                                 <th>Score</th>
//                                 <th>Tier</th>
//                                 <th>CO₂</th>
//                                 <th>Recycle %</th>
//                                 <th>Bio %</th>
//                                 <th>Flags</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {visible.map(m => (
//                                 <tr key={m.material_id} className="catalogue-row" onClick={() => onMaterialClick(m.material_id)} title="Click for full details">
//                                     <td className="cat-rank">{m.sustainability_rank}</td>
//                                     <td className="cat-name">{m.material_name}</td>
//                                     <td><span className="cat-type-badge">{m.material_type}</span></td>
//                                     <td>
//                                         <div className="cat-score-bar">
//                                             <div className="cat-score-fill" style={{ width: `${m.sustainability_score}%`, background: tc(m.sustainability_tier) }} />
//                                             <span>{m.sustainability_score.toFixed(1)}</span>
//                                         </div>
//                                     </td>
//                                     <td><span className="cat-tier" style={{ color: tc(m.sustainability_tier) }}>{m.sustainability_tier}</span></td>
//                                     <td>{m.co2_emission_score.toFixed(1)}</td>
//                                     <td>{m.recyclability_percent.toFixed(0)}%</td>
//                                     <td>{m.biodegradability_score.toFixed(0)}%</td>
//                                     <td className="cat-flags">
//                                         {m.is_biodegradable && <span className="flag-pill bio" title="Biodegradable">🌱</span>}
//                                         {m.is_recyclable && <span className="flag-pill rec" title="Recyclable">♻️</span>}
//                                         {m.dual_end_of_life && <span className="flag-pill dual" title="Dual End-of-Life">✨</span>}
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                     {visible.length === 0 && <div className="catalogue-empty">No materials match your filters.</div>}
//                 </div>
//             )}

//             {/* Pagination */}
//             {pagination.pages > 1 && (
//                 <div className="catalogue-pagination">
//                     <button className="page-btn" disabled={pagination.page <= 1} onClick={() => fetchMaterials(pagination.page - 1)}>
//                         <i className="bi bi-chevron-left"></i>
//                     </button>
//                     {Array.from({ length: pagination.pages }, (_, i) => i + 1)
//                         .filter(p => Math.abs(p - pagination.page) <= 2)
//                         .map(p => (
//                             <button key={p} className={`page-btn ${p === pagination.page ? "page-active" : ""}`} onClick={() => fetchMaterials(p)}>{p}</button>
//                         ))}
//                     <button className="page-btn" disabled={pagination.page >= pagination.pages} onClick={() => fetchMaterials(pagination.page + 1)}>
//                         <i className="bi bi-chevron-right"></i>
//                     </button>
//                     <span className="page-info">Page {pagination.page} of {pagination.pages} · {pagination.total} total</span>
//                 </div>
//             )}
//         </div>
//     );
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // COMPONENT: CHAT WIZARD
// // ═══════════════════════════════════════════════════════════════════════════════

// // Live parameter mini-bar shown in the sidebar tracker
// function ParamBar({ label, value, max, color }) {
//     const pct = Math.min(100, Math.round((value / max) * 100));
//     return (
//         <div style={{ marginBottom: "8px" }}>
//             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#94a3b8", marginBottom: "3px" }}>
//                 <span>{label}</span>
//                 <span style={{ color }}>{value}<span style={{ color: "#475569" }}>/{max}</span></span>
//             </div>
//             <div style={{ height: "5px", borderRadius: "99px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
//                 <div style={{
//                     height: "100%", borderRadius: "99px", width: `${pct}%`,
//                     background: color, transition: "width 0.45s ease",
//                     boxShadow: `0 0 6px ${color}88`
//                 }} />
//             </div>
//         </div>
//     );
// }

// function ChatGuide({ onResultsReady }) {
//     const [stepIndex, setStepIndex] = useState(0);
//     const [params, setParams] = useState({});
//     const [wizardContext, setWizardContext] = useState({});
//     const [messages, setMessages] = useState([{ role: "bot", text: STEPS[0].botText, subText: STEPS[0].subText }]);
//     const [status, setStatus] = useState("idle");
//     const [error, setError] = useState("");
//     const [hoveredOption, setHoveredOption] = useState(null);
//     const bottomRef = useRef(null);

//     useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, status]);
//     const push = (prev, role, text, extra = {}) => [...prev, { role, text, ...extra }];

//     // Preview params when hovering an option before clicking
//     const previewParams = hoveredOption
//         ? { ...params, ...STEPS[stepIndex]?.resolver?.(hoveredOption) }
//         : params;

//     const handleChipClick = (option) => {
//         setHoveredOption(null);
//         const step = STEPS[stepIndex];
//         const patch = step.resolver(option.value);
//         const merged = { ...params, ...patch };
//         setParams(merged);
//         const ctxPatch = step.id === "eco_priority" && option.value === "medium"
//             ? { eco_priority: "eco-friendliness is a nice-to-have" }
//             : (CONTEXT_LABELS[option.value] ?? {});
//         setWizardContext(prev => ({ ...prev, ...ctxPatch }));
//         let next = push(messages, "user", option.label);
//         const nextIdx = stepIndex + 1;
//         const nextStep = STEPS[nextIdx];
//         if (nextStep) {
//             let botText = nextStep.botText;
//             if (nextStep.type === "confirm") {
//                 const api = toApiParams(finaliseWizard(merged));
//                 botText = `Got it! Here's what I worked out:\n\nStrength: ${api.strength}/5 · Weight: ${api.weight_capacity}/5\nBiodegradability: ${api.biodegradability}% · Recyclability: ${api.recyclability}%\nCO₂ Eco-score: ${api.co2_emission}%\n\nReady to find your best materials?`;
//             }
//             next = push(next, "bot", botText, nextStep.subText ? { subText: nextStep.subText } : {});
//         }
//         setMessages(next);
//         setStepIndex(nextIdx);
//     };

//     const handleConfirm = async () => {
//         const fp = finaliseWizard(params);
//         const apiParams = toApiParams(fp);
//         let msgs = push(messages, "user", "Yes, let's go!");
//         msgs = push(msgs, "bot", "Fetching recommendations… 🤖", { loading: true });
//         setMessages(msgs); setStatus("calling-api"); setError("");
//         try {
//             const { results, source, userProfile } = await runFullPipeline(apiParams);
//             msgs = msgs.filter(m => !m.loading);
//             msgs = push(msgs, "bot", `Done! Top 5 selected via ${source}. 🌿`);
//             setMessages(msgs); setStatus("done");
//             onResultsReady(results, apiParams, source, wizardContext, userProfile);
//         } catch (e) {
//             console.error(e);
//             setError("Couldn't reach the API on port 5000. Is the Flask server running?");
//             setStatus("error");
//         }
//     };

//     const handleRetake = () => {
//         setStepIndex(0); setParams({}); setWizardContext({});
//         setStatus("idle"); setError(""); setHoveredOption(null);
//         setMessages([{ role: "bot", text: STEPS[0].botText, subText: STEPS[0].subText }]);
//     };

//     const busy = status === "calling-api";
//     const currentStep = STEPS[stepIndex];
//     const showChips = !busy && currentStep?.type === "chips" && status !== "done";
//     const showConfirm = !busy && currentStep?.type === "confirm" && status !== "done";

//     // Normalise params for display (scale 1-10 → display ranges)
//     const dispStrength = previewParams.strength ?? 0;
//     const dispWeight = previewParams.weight_capacity ?? 0;
//     const dispBio = previewParams.biodegradability ?? 0;
//     const dispRec = previewParams.recyclability ?? 0;
//     const dispCO2 = previewParams.co2_emission ?? 0;

//     const hasAnyParam = dispStrength || dispWeight || dispBio || dispRec || dispCO2;
//     const completedSteps = stepIndex;
//     const totalSteps = STEPS.length - 1; // exclude confirm

//     return (
//         <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>

//             {/* ── Main chat column ── */}
//             <div className="chat-guide-wrapper" style={{ flex: 1, minWidth: 0 }}>
//                 {/* Progress bar */}
//                 <div className="wizard-progress">
//                     <div className="wizard-progress-fill" style={{ width: `${Math.min(100, (stepIndex / (STEPS.length - 1)) * 100)}%` }} />
//                 </div>
//                 <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#475569", padding: "4px 2px 10px" }}>
//                     <span>Step {Math.min(stepIndex + 1, STEPS.length)} of {STEPS.length}</span>
//                     <span>{completedSteps} of {totalSteps} questions answered</span>
//                 </div>

//                 {/* Messages */}
//                 <div className="chat-messages">
//                     {messages.map((m, i) => (
//                         <div key={i} className={`chat-bubble-wrap ${m.role === "user" ? "user-wrap" : "bot-wrap"}`}>
//                             {m.role === "bot" && <div className="bot-avatar"><i className="bi bi-recycle"></i></div>}
//                             <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: m.role === "user" ? undefined : "100%" }}>
//                                 <div className={`chat-bubble ${m.role === "user" ? "bubble-user" : "bubble-bot"} ${m.loading ? "bubble-loading" : ""}`}>
//                                     {m.loading
//                                         ? <><i className="bi bi-arrow-repeat spin"></i>&nbsp;{m.text}</>
//                                         : m.text.split("\n").map((line, j, arr) => <span key={j}>{line}{j < arr.length - 1 && <br />}</span>)}
//                                 </div>
//                                 {m.role === "bot" && m.subText && (
//                                     <div style={{
//                                         fontSize: "0.75rem", color: "#64748b", paddingLeft: "4px",
//                                         display: "flex", alignItems: "center", gap: "5px"
//                                     }}>
//                                         <i className="bi bi-info-circle" style={{ color: "#4cc9f0", fontSize: "0.7rem" }}></i>
//                                         {m.subText}
//                                     </div>
//                                 )}
//                             </div>
//                         </div>
//                     ))}
//                     {busy && (
//                         <div className="chat-bubble-wrap bot-wrap">
//                             <div className="bot-avatar"><i className="bi bi-recycle"></i></div>
//                             <div className="chat-bubble bubble-bot typing-indicator"><span /><span /><span /></div>
//                         </div>
//                     )}
//                     {error && (
//                         <div className="chat-error">
//                             <i className="bi bi-exclamation-triangle-fill"></i> {error}
//                             <button className="btn-ghost" style={{ marginLeft: "auto", padding: "4px 10px", fontSize: "0.75rem" }} onClick={handleRetake}>Retry</button>
//                         </div>
//                     )}
//                     <div ref={bottomRef} />
//                 </div>

//                 {/* Option chips — enhanced with desc + impact */}
//                 {showChips && (
//                     <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
//                         {/* Hover hint */}
//                         <div style={{ fontSize: "0.73rem", color: "#475569", textAlign: "center", paddingBottom: "2px" }}>
//                             <i className="bi bi-hand-index"></i> Hover an option to preview its effect on parameters, then click to select
//                         </div>
//                         <div className="chip-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "8px" }}>
//                             {currentStep.options.map(opt => (
//                                 <button
//                                     key={opt.value}
//                                     className="wizard-chip"
//                                     style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", padding: "10px 14px", textAlign: "left", height: "auto" }}
//                                     onMouseEnter={() => setHoveredOption(opt.value)}
//                                     onMouseLeave={() => setHoveredOption(null)}
//                                     onClick={() => handleChipClick(opt)}
//                                 >
//                                     <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{opt.label}</span>
//                                     {opt.desc && <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 400, lineHeight: 1.4 }}>{opt.desc}</span>}
//                                     {opt.impact && (
//                                         <span style={{ fontSize: "0.68rem", color: "#4cc9f0", fontWeight: 500, marginTop: "2px" }}>
//                                             <i className="bi bi-lightning-charge-fill" style={{ marginRight: "3px" }}></i>{opt.impact}
//                                         </span>
//                                     )}
//                                 </button>
//                             ))}
//                         </div>
//                     </div>
//                 )}

//                 {showConfirm && (
//                     <div className="confirm-row">
//                         <button className="btn-primary-eco" onClick={handleConfirm}><i className="bi bi-lightning-charge-fill"></i> Find my materials!</button>
//                         <button className="btn-ghost" onClick={handleRetake}><i className="bi bi-arrow-counterclockwise"></i> Start over</button>
//                     </div>
//                 )}
//             </div>

//             {/* ── Live parameter tracker sidebar ── */}
//             {hasAnyParam && (
//                 <div style={{
//                     width: "200px", flexShrink: 0,
//                     background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
//                     borderRadius: "12px", padding: "14px 16px",
//                     position: "sticky", top: "20px"
//                 }}>
//                     <div style={{ fontSize: "0.73rem", color: "#4cc9f0", fontWeight: 600, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
//                         <i className="bi bi-sliders2"></i>
//                         {hoveredOption ? "Preview (hover)" : "Your parameters"}
//                     </div>

//                     <ParamBar label="Strength" value={dispStrength} max={10} color="#f97316" />
//                     <ParamBar label="Weight Cap." value={dispWeight} max={10} color="#fb7185" />
//                     <ParamBar label="Biodegradability" value={dispBio} max={10} color="#00ffd5" />
//                     <ParamBar label="Recyclability" value={dispRec} max={10} color="#4cc9f0" />
//                     <ParamBar label="CO₂ Eco-Score" value={dispCO2} max={10} color="#ffd166" />

//                     {hoveredOption && (
//                         <div style={{ marginTop: "10px", fontSize: "0.68rem", color: "#64748b", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px" }}>
//                             <i className="bi bi-cursor-fill" style={{ color: "#4cc9f0", marginRight: "4px" }}></i>
//                             Bars show values <em>after</em> selecting this option
//                         </div>
//                     )}

//                     {stepIndex >= STEPS.length - 1 && (
//                         <div style={{ marginTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
//                             {(() => {
//                                 const api = toApiParams(finaliseWizard(params));
//                                 return (
//                                     <div style={{ fontSize: "0.68rem", color: "#64748b", lineHeight: 1.6 }}>
//                                         <div><strong style={{ color: "#94a3b8" }}>API values</strong></div>
//                                         <div>Strength: <span style={{ color: "#f97316" }}>{api.strength}/5</span></div>
//                                         <div>Weight: <span style={{ color: "#fb7185" }}>{api.weight_capacity}/5</span></div>
//                                         <div>Bio: <span style={{ color: "#00ffd5" }}>{api.biodegradability}%</span></div>
//                                         <div>Recycle: <span style={{ color: "#4cc9f0" }}>{api.recyclability}%</span></div>
//                                         <div>CO₂: <span style={{ color: "#ffd166" }}>{api.co2_emission}%</span></div>
//                                     </div>
//                                 );
//                             })()}
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );
// }
// // ═══════════════════════════════════════════════════════════════════════════════
// // COMPONENT: RESULTS PANEL
// // ═══════════════════════════════════════════════════════════════════════════════
// function ResultsPanel({ materials, params, source, userProfile, onReset, onMaterialClick }) {
//     const tc = (tier) => TIER_COLOR[tier] ?? "#8b94a3";
//     return (
//         <div className="card-glass">
//             <div className="card-label">
//                 <i className="bi bi-award"></i> Recommended Materials
//                 {source && <span className="source-badge badge-gemini"><i className="bi bi-cpu"></i> {source}</span>}
//                 <button className="reset-btn" onClick={onReset}><i className="bi bi-arrow-counterclockwise"></i> New Analysis</button>
//             </div>

//             {userProfile && (
//                 <div className="user-profile-strip">
//                     <div className="up-item">
//                         <span>Your Profile Score</span>
//                         <strong style={{ color: tc(userProfile.predicted_sustainability_tier) }}>{userProfile.predicted_sustainability_score}</strong>
//                     </div>
//                     <div className="up-item">
//                         <span>Predicted Tier</span>
//                         <strong style={{ color: tc(userProfile.predicted_sustainability_tier) }}>{userProfile.predicted_sustainability_tier}</strong>
//                     </div>
//                     {params && Object.entries(params).map(([k, v]) => (
//                         <div key={k} className="up-item"><span>{k.replace(/_/g, " ")}</span><strong>{v}</strong></div>
//                     ))}
//                 </div>
//             )}

//             <div className="materials-list">
//                 {materials.length === 0 && (
//                     <div className="empty-state"><i className="bi bi-box-seam"></i><span>No results — run an analysis first</span></div>
//                 )}
//                 {materials.map((m) => (
//                     <div className="material-card" key={m.rank} onClick={() => onMaterialClick(m.material_id)} style={{ cursor: "pointer" }} title="Click for full details">
//                         <div className={`material-rank r${m.rank}`}>#{m.rank}</div>
//                         <div className="material-info">
//                             <div className="material-name">{m.material_name}</div>
//                             <div className="material-type-badge">{m.material_type}</div>
//                             {m.eco_tag && <div className="eco-tag">{m.eco_tag}</div>}
//                             {m.reason && <div className="material-reason">{m.reason}</div>}
//                             <div className="material-flags-inline">
//                                 {m.is_biodegradable && <span className="flag-pill bio">🌱 Bio</span>}
//                                 {m.is_recyclable && <span className="flag-pill rec">♻️ Recycle</span>}
//                                 {m.dual_end_of_life && <span className="flag-pill dual">✨ Dual EOL</span>}
//                             </div>
//                         </div>
//                         <div className="material-stats">
//                             {/* <div className="material-stat"><span>Score</span><strong style={{ color: tc(m.sustainability_tier) }}>{m.sustainability_score.toFixed(1)}</strong></div> */}
//                             {/* <div className="material-stat"><span>Tier</span><strong style={{ color: tc(m.sustainability_tier) }}>{m.sustainability_tier}</strong></div> */}
//                             {/* <div className="material-stat"><span>Match</span><strong>{m.match_score.toFixed(1)}</strong></div> */}
//                             {/* <div className="material-stat"><span>Similarity</span><strong>{m.similarity_to_request}</strong></div> */}
//                             {/* <div className="material-stat"><span>CO₂ Score</span><strong>{m.co2_emission_score.toFixed(1)}%</strong></div> */}
//                         </div>
//                         <div className="material-detail-hint"><i className="bi bi-arrow-right-circle"></i></div>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // COMPONENT: BI DASHBOARD
// // ═══════════════════════════════════════════════════════════════════════════════
// function BIDashboard({ materials, onMaterialClick }) {
//     const refs = { co2: useRef(null), eco: useRef(null), savings: useRef(null), radar: useRef(null) };
//     const instances = useRef({});
//     const labels = materials.map(m => m.material_name.length > 15 ? m.material_name.slice(0, 14) + "…" : m.material_name);
//     const COLORS = ["#00ffd5", "#4cc9f0", "#ffd166", "#ff4d6d", "#8b94a3"];
//     const MUTED = (i) => COLORS[i] + "99";

//     useEffect(() => {
//         if (!materials.length) return;
//         const TICK = "#64748b"; const GRID = "rgba(255,255,255,0.06)";
//         const axis = (title) => ({ ticks: { color: TICK, font: { size: 11 } }, grid: { color: GRID }, ...(title ? { title: { display: true, text: title, color: TICK, font: { size: 11 } } } : {}) });
//         const tooltipBase = { backgroundColor: "rgba(6,13,19,0.92)", borderColor: "rgba(0,255,213,0.3)", borderWidth: 1, titleColor: "#f0f4f8", bodyColor: "#64748b", padding: 10 };
//         const base = { responsive: true, maintainAspectRatio: false, plugins: { tooltip: tooltipBase, legend: { display: false } } };
//         const mk = (key, cfg) => { instances.current[key]?.destroy(); if (refs[key].current) instances.current[key] = new Chart(refs[key].current, cfg); };

//         mk("co2", {
//             type: "bar",
//             data: { labels, datasets: [{ label: "CO₂ Eco-Score", data: materials.map(m => m.co2_emission_score), backgroundColor: COLORS, borderRadius: 6, borderSkipped: false }] },
//             options: { ...base, scales: { x: axis(), y: { ...axis("CO₂ Eco-Score (0–100)"), beginAtZero: true, max: 100 } } },
//         });
//         mk("eco", {
//             type: "bar",
//             data: {
//                 labels, datasets: [
//                     { label: "Recyclability %", data: materials.map(m => m.recyclability), backgroundColor: "rgba(0,255,213,0.75)", borderRadius: 4, borderSkipped: false },
//                     { label: "Biodegradability %", data: materials.map(m => m.biodegradability), backgroundColor: "rgba(76,201,240,0.75)", borderRadius: 4, borderSkipped: false },
//                 ]
//             },
//             options: { ...base, plugins: { tooltip: tooltipBase, legend: { display: true, labels: { color: TICK, font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 14 } } }, scales: { x: axis(), y: { ...axis("%"), beginAtZero: true, max: 100 } } },
//         });
//         mk("savings", {
//             type: "bar",
//             data: { labels, datasets: [{ label: "Sustainability Score", data: materials.map(m => m.sustainability_score), backgroundColor: materials.map((_, i) => i === 0 ? "#00ffd5" : MUTED(i)), borderRadius: 6, borderSkipped: false }] },
//             options: { ...base, indexAxis: "y", scales: { x: { ...axis("Sustainability Score (0–100)"), beginAtZero: true, max: 100 }, y: axis() } },
//         });
//         mk("radar", {
//             type: "radar",
//             data: {
//                 labels: ["Recyclability", "Biodegradability", "CO₂ Score", "Sustainability", "Match Score"],
//                 datasets: materials.map((m, i) => ({
//                     label: m.material_name, data: [m.recyclability, m.biodegradability, m.co2_emission_score, m.sustainability_score, m.match_score],
//                     borderColor: COLORS[i], backgroundColor: COLORS[i] + "22", borderWidth: 2, pointBackgroundColor: COLORS[i], pointRadius: 3,
//                 })),
//             },
//             options: {
//                 ...base,
//                 scales: { r: { beginAtZero: true, min: 0, max: 100, ticks: { color: TICK, font: { size: 10 }, stepSize: 25, backdropColor: "transparent" }, grid: { color: GRID }, pointLabels: { color: "#94a3b8", font: { size: 11 } }, angleLines: { color: GRID } } },
//                 plugins: { tooltip: tooltipBase, legend: { display: true, position: "bottom", labels: { color: TICK, font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 12 } } },
//             },
//         });
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [materials]);

//     useEffect(() => () => Object.values(instances.current).forEach(c => c?.destroy()), []);

//     if (!materials.length) return null;

//     const best = {
//         co2: [...materials].sort((a, b) => b.co2_emission_score - a.co2_emission_score)[0],
//         sus: [...materials].sort((a, b) => b.sustainability_score - a.sustainability_score)[0],
//         recycle: [...materials].sort((a, b) => b.recyclability - a.recyclability)[0],
//         bio: [...materials].sort((a, b) => b.biodegradability - a.biodegradability)[0],
//     };

//     return (
//         <div className="bi-dashboard">
//             <div className="card-glass bi-header-card">
//                 <div className="card-label"><i className="bi bi-bar-chart-line"></i> Sustainability Analytics</div>
//                 <div className="bi-metrics">
//                     {[
//                         { label: "Best CO₂ Score", mat: best.co2, sub: `${best.co2?.co2_emission_score.toFixed(1)}%` },
//                         { label: "Top Sustainability", mat: best.sus, sub: `Score: ${best.sus?.sustainability_score.toFixed(1)}` },
//                         { label: "Most Recyclable", mat: best.recycle, sub: `${best.recycle?.recyclability.toFixed(1)}%` },
//                         { label: "Most Biodegradable", mat: best.bio, sub: `${best.bio?.biodegradability.toFixed(1)}%` },
//                     ].map(({ label, mat, sub }) => (
//                         <div key={label} className="bi-metric clickable-metric" onClick={() => mat && onMaterialClick(mat.material_id)} title="Click for full details">
//                             <span>{label}</span>
//                             <strong>{mat?.material_name}</strong>
//                             <em>{sub}</em>
//                         </div>
//                     ))}
//                 </div>
//             </div>

//             <div className="bi-charts-grid">
//                 <div className="card-glass bi-chart-card">
//                     <div className="bi-chart-title"><i className="bi bi-cloud-haze2"></i> CO₂ Eco-Score <span className="bi-chart-subtitle">higher = greener</span></div>
//                     <div className="bi-chart-wrap"><canvas ref={refs.co2} /></div>
//                 </div>
//                 <div className="card-glass bi-chart-card bi-chart-wide">
//                     <div className="bi-chart-title"><i className="bi bi-recycle"></i> Recyclability vs Biodegradability</div>
//                     <div className="bi-chart-wrap"><canvas ref={refs.eco} /></div>
//                 </div>
//                 <div className="card-glass bi-chart-card bi-chart-wide">
//                     <div className="bi-chart-title"><i className="bi bi-bar-chart-steps"></i> Sustainability Score Ranking</div>
//                     <div style={{ height: `${materials.length * 56 + 24}px` }}><canvas ref={refs.savings} /></div>
//                 </div>
//                 <div className="card-glass bi-chart-card bi-chart-wide">
//                     <div className="bi-chart-title"><i className="bi bi-star-half"></i> Overall Sustainability Profile <span className="bi-chart-subtitle">radar · {materials.length} materials</span></div>
//                     <div className="bi-chart-wrap bi-chart-radar"><canvas ref={refs.radar} /></div>
//                 </div>
//             </div>
//         </div>
//     );
// }

// // ─── MANUAL FIELD CARD ────────────────────────────────────────────────────────
// function ManualFieldCard({ fieldDef, value, onChange }) {
//     const { key, label, hint, min, max, step, unit, icon, description, tooltip, examples, color } = fieldDef;
//     const [showTip, setShowTip] = useState(false);

//     const raw = value;
//     const num = parseFloat(raw);
//     const filled = raw !== "" && !isNaN(num);
//     const valid = filled && num >= min && num <= max;
//     const pct = filled ? Math.max(0, Math.min(100, ((num - min) / (max - min)) * 100)) : 0;

//     return (
//         <div style={{
//             background: "rgba(255,255,255,0.03)",
//             border: `1px solid ${filled ? (valid ? color + "44" : "#ff4d6d55") : "rgba(255,255,255,0.08)"}`,
//             borderRadius: "14px", padding: "18px 20px",
//             transition: "border-color 0.25s",
//         }}>
//             {/* Header row */}
//             <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
//                 <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//                     {/* <i className={`bi ${icon}`} style={{ color, fontSize: "15px" }}></i> */}
//                     <span style={{ fontWeight: 600, fontSize: "14px", color: "#e2e8f0" }}>{label}</span>
//                     <span style={{
//                         fontSize: "10px", padding: "1px 7px", borderRadius: "60px",
//                         background: color + "22", color, border: `1px solid ${color}44`, fontWeight: 600
//                     }}>{unit}</span>
//                 </div>
//                 <div style={{ position: "relative" }}>
//                     <i
//                         className="bi bi-question-circle"
//                         style={{ color: "#64748b", cursor: "pointer", fontSize: "15px" }}
//                         onMouseEnter={() => setShowTip(true)}
//                         onMouseLeave={() => setShowTip(false)}
//                     ></i>
//                     {showTip && (
//                         <div style={{
//                             position: "absolute", right: 0, top: "22px", zIndex: 50,
//                             background: "#1e293b", border: "1px solid rgba(255,255,255,0.12)",
//                             borderRadius: "10px", padding: "12px 14px", width: "240px",
//                             fontSize: "12.5px", color: "#94a3b8", lineHeight: "1.6",
//                             boxShadow: "0 8px 30px rgba(0,0,0,0.4)"
//                         }}>
//                             <strong style={{ color: "#e2e8f0", display: "block", marginBottom: "4px" }}>
//                                 <i className={`bi ${icon}`} style={{ color, marginRight: "6px" }}></i>{label}
//                             </strong>
//                             {tooltip}
//                         </div>
//                     )}
//                 </div>
//             </div>

//             {/* Description */}
//             <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>{description}</div>

//             {/* Input + validation badge */}
//             <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
//                 <input
//                     className="form-control"
//                     placeholder={hint}
//                     type="number" min={min} max={max} step={step} required
//                     value={raw}
//                     style={{ flex: 1, borderColor: filled ? (valid ? color + "66" : "#ff4d6d88") : undefined }}
//                     onChange={e => {
//                         let val = e.target.value;
//                         if (val !== "") {
//                             const n = parseFloat(val);
//                             if (n < min) val = String(min);
//                             else if (n > max) val = String(max);
//                             else val = String(n);
//                         }
//                         onChange(key, val);
//                     }}
//                 />
//                 {filled && (
//                     <span style={{
//                         fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px",
//                         background: valid ? color + "22" : "#ff4d6d22",
//                         color: valid ? color : "#ff4d6d",
//                         border: `1px solid ${valid ? color + "44" : "#ff4d6d44"}`,
//                         whiteSpace: "nowrap"
//                     }}>
//                         {valid ? <><i className="bi bi-check-lg"></i> Valid</> : <><i className="bi bi-exclamation-triangle"></i> Out of range</>}
//                     </span>
//                 )}
//             </div>

//             {/* Range bar */}
//             <div style={{ marginBottom: "12px" }}>
//                 <div style={{ height: "5px", borderRadius: "10px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
//                     <div style={{
//                         height: "100%", width: `${pct}%`, borderRadius: "10px",
//                         background: valid ? color : "#ff4d6d",
//                         transition: "width 0.3s ease, background 0.3s",
//                         boxShadow: valid ? `0 0 8px ${color}88` : "none"
//                     }} />
//                 </div>
//                 <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#475569", marginTop: "3px" }}>
//                     <span>{min} (lowest)</span><span>{max} (highest)</span>
//                 </div>
//             </div>

//             {/* Examples */}
//             <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
//                 {/* <div style={{ fontSize: "11px", color: "#475569", marginBottom: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
//                     Real-world examples
//                 </div> */}
//                 <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
//                     {examples.map(ex => (
//                         <div key={ex.val} style={{ display: "flex", gap: "8px", fontSize: "12px" }}>
//                             <span style={{
//                                 fontWeight: 700, color, minWidth: "50px",
//                                 background: color + "18", borderRadius: "6px",
//                                 padding: "1px 7px", textAlign: "center", fontSize: "11px"
//                             }}>{ex.val}</span>
//                             <span style={{ color: "#64748b" }}>{ex.label}</span>
//                         </div>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // MAIN DASHBOARD
// // ═══════════════════════════════════════════════════════════════════════════════
// export default function Dashboard({ activePage = "overview", setActivePage = () => { } }) {
//     const [mode, setMode] = useState(null);
//     const [data, setData] = useState({ strength: "", weight_capacity: "", biodegradability: "", recyclability: "", co2_emission: "" });
//     const [materials, setMaterials] = useState([]);
//     const [lastParams, setLastParams] = useState(null);
//     const [userProfile, setUserProfile] = useState(null);
//     const [rankSource, setRankSource] = useState(null);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState("");
//     const [showResults, setShowResults] = useState(false);
//     const [reportLoading, setReportLoading] = useState(false);
//     const [wizardCtx, setWizardCtx] = useState({});
//     const [selectedMaterialId, setSelectedMaterialId] = useState(null);

//     const handleManualPredict = async () => {
//         setLoading(true); setError("");
//         try {
//             const apiParams = toApiParamsManual(data);
//             const { results, source, userProfile: up } = await runFullPipeline(apiParams);
//             setMaterials(results); setLastParams(apiParams); setUserProfile(up);
//             setRankSource(source); setShowResults(true);
//             setActivePage("results");
//         } catch (e) {
//             console.error(e);
//             setError("Could not reach the API on port 5000. Make sure Flask is running.");
//         } finally { setLoading(false); }
//     };

//     const resetAll = () => {
//         setShowResults(false); setMaterials([]); setLastParams(null); setUserProfile(null);
//         setRankSource(null); setMode(null); setWizardCtx({});
//         setActivePage("overview");
//     };

//     const handleGenerateReport = async () => {
//         setReportLoading(true);
//         try { await generateReport(materials, lastParams, rankSource, wizardCtx); }
//         finally { setReportLoading(false); }
//     };

//     const manualValid = (
//         data.strength !== "" && parseFloat(data.strength) >= 1 && parseFloat(data.strength) <= 5 &&
//         data.weight_capacity !== "" && parseFloat(data.weight_capacity) >= 1 && parseFloat(data.weight_capacity) <= 5 &&
//         data.biodegradability !== "" && parseFloat(data.biodegradability) >= 0 && parseFloat(data.biodegradability) <= 100 &&
//         data.recyclability !== "" && parseFloat(data.recyclability) >= 0 && parseFloat(data.recyclability) <= 100 &&
//         data.co2_emission !== "" && parseFloat(data.co2_emission) >= 0 && parseFloat(data.co2_emission) <= 100
//     );

//     const MANUAL_FIELDS = [
//         {
//             key: "strength", label: "Strength", hint: "e.g. 3.5", min: 1, max: 5, step: 0.1, unit: "1-5",
//             icon: "bi-shield-fill",
//             description: "Structural durability and protective capability of the packaging.",
//             tooltip: "Rate how tough the packaging needs to be. 1 = very lightweight (e.g. tissue wrap), 5 = heavy-duty industrial casing.",
//             examples: [
//                 // { val: "1–2", label: "Soft goods, tissue, lightweight pouches" },
//                 // { val: "3", label: "Standard cardboard boxes, food containers" },
//                 // { val: "4–5", label: "Electronics, industrial parts, fragile items" },
//             ],
//             color: "#f97316",
//         },
//         {
//             key: "weight_capacity", label: "Weight Capacity", hint: "e.g. 2.5", min: 1, max: 5, step: 0.1, unit: "1-5",
//             icon: "bi-box-seam-fill",
//             description: "Maximum load the packaging must support without deforming.",
//             tooltip: "1 = super light products (< 100 g), 5 = very heavy products (5 kg+). Match this to the weight of one unit.",
//             examples: [
//                 // { val: "1", label: "Jewellery, cosmetics, < 100 g" },
//                 // { val: "2–3", label: "Food, clothing, 100 g – 2 kg" },
//                 // { val: "4–5", label: "Electronics, industrial parts, 2 kg+" },
//             ],
//             color: "#fb7185",
//         },
//         {
//             key: "biodegradability", label: "Biodegradability", hint: "e.g. 75", min: 0, max: 100, step: 1, unit: "0–100 %",
//             icon: "bi-tree-fill",
//             description: "How completely the material breaks down naturally after disposal.",
//             tooltip: "0 = does not biodegrade (e.g. conventional plastic), 100 = fully compostable within weeks (e.g. PLA, cellulose).",
//             examples: [
//                 // { val: "0–20", label: "PET, PVC, polystyrene" },
//                 // { val: "40–70", label: "Paper, cardboard (treated)" },
//                 // { val: "80–100", label: "PLA bioplastic, mushroom packaging" },
//             ],
//             color: "#00ffd5",
//         },
//         {
//             key: "recyclability", label: "Recyclability", hint: "e.g. 85", min: 0, max: 100, step: 1, unit: "0–100 %",
//             icon: "bi-recycle",
//             description: "Percentage of the material that can be recovered and recycled.",
//             tooltip: "Estimate how much of the packaging is accepted in standard recycling streams. Mixed-material laminates score lower.",
//             examples: [
//                 // { val: "0–30", label: "Multi-layer laminates, coated paper" },
//                 // { val: "50–70", label: "Mixed plastics (PP, HDPE)" },
//                 // { val: "80–100", label: "Aluminium, glass, mono-material paper" },
//             ],
//             color: "#4cc9f0",
//         },
//         {
//             key: "co2_emission", label: "CO₂ Eco-Score", hint: "e.g. 60", min: 0, max: 100, step: 1, unit: "0–100",
//             icon: "bi-cloud-haze2-fill",
//             description: "Inverse carbon footprint score — higher means lower emissions during production.",
//             tooltip: "Higher is greener: 100 = near-zero carbon footprint. 0 = very high CO₂ emissions. Consider the full production lifecycle.",
//             examples: [
//                 // { val: "0–30", label: "Virgin plastic, aluminium smelting" },
//                 // { val: "40–65", label: "Recycled plastics, standard paperboard" },
//                 // { val: "70–100", label: "Recycled cardboard, bio-based materials" },
//             ],
//             color: "#ffd166",
//         },
//     ];

//     const ReportCTA = () => (
//         <div className="report-cta-wrapper">
//             <div className="report-cta-text">
//                 <i className="bi bi-file-earmark-pdf-fill"></i>
//                 <div>
//                     <strong>Download Sustainability Report</strong>
//                     <span>Full PDF — materials, analytics, and insights</span>
//                 </div>
//             </div>
//             <button className="btn-report" onClick={handleGenerateReport} disabled={reportLoading}>
//                 {reportLoading ? <><i className="bi bi-arrow-repeat spin"></i> Generating…</> : <><i className="bi bi-download"></i> Generate Report</>}
//             </button>
//         </div>
//     );

//     return (
//         <>
//             {/* ── GET /health → API Status Bar ── */}
//             <ApiStatusBar />

//             <div className="page-header">
//                 <div>
//                     <h1>Sustainability <span>Packaging</span> <>Intelligence</></h1>
//                     <p>AI-powered packaging material analysis &amp; recommendation</p>
//                 </div>
//                 <div className="header-badge">
//                     <i className="bi bi-lightning-charge-fill"></i> Real-time Analysis
//                 </div>
//             </div>

//             {/* ── GET /materials/<id> → Material Detail Modal ── */}
//             <MaterialDetailModal materialId={selectedMaterialId} onClose={() => setSelectedMaterialId(null)} />


//             {activePage === "overview" && (
//                 <>
//                     {!mode && (
//                         <div className="mode-picker-section">
//                             <div className="card-glass mode-picker-card" onClick={() => setMode("guide")}>
//                                 <div className="mode-icon-wrap accent"><i className="bi bi-chat-dots-fill"></i></div>
//                                 <div className="mode-body">
//                                     <div className="mode-title">Guided Wizard <span className="mode-badge">Recommended</span></div>
//                                     <div className="mode-desc">Answer a few plain-English questions — tap to pick, no typing needed.</div>
//                                 </div>
//                                 <i className="bi bi-arrow-right mode-arrow"></i>
//                             </div>
//                             <div className="mode-picker-divider">or</div>
//                             <div className="card-glass mode-picker-card mode-manual" onClick={() => setMode("manual")}>
//                                 <div className="mode-icon-wrap muted"><i className="bi bi-sliders"></i></div>
//                                 <div className="mode-body">
//                                     <div className="mode-title">Manual Input</div>
//                                     <div className="mode-desc">Enter exact values if you know the technical parameters.</div>
//                                 </div>
//                                 <i className="bi bi-arrow-right mode-arrow"></i>
//                             </div>
//                         </div>
//                     )}

//                     {mode === "guide" && (
//                         <div className="card-glass">
//                             <div className="card-label">
//                                 <i className="bi bi-chat-dots-fill"></i> Packaging Wizard
//                                 <button className="reset-btn" onClick={() => setMode(null)}><i className="bi bi-arrow-left"></i> Back</button>
//                             </div>
//                             <ChatGuide onResultsReady={(mats, apiParams, src, ctx, up) => {
//                                 setMaterials(mats); setLastParams(apiParams); setUserProfile(up);
//                                 setRankSource(src); setWizardCtx(ctx || {}); setShowResults(true);
//                                 setActivePage("results");
//                             }} />
//                         </div>
//                     )}

//                     {mode === "manual" && (
//                         <div className="card-glass">
//                             <div className="card-label">
//                                 <i className="bi bi-sliders"></i> Packaging Parameters
//                                 <button className="reset-btn" onClick={() => setMode(null)}><i className="bi bi-arrow-left"></i> Back</button>
//                             </div>

//                             {/* ── Intro callout ── */}
//                             <div style={{
//                                 display: "flex", alignItems: "flex-start", gap: "12px",
//                                 background: "rgba(0,255,213,0.06)", border: "1px solid rgba(0,255,213,0.18)",
//                                 borderRadius: "12px", padding: "14px 18px", marginBottom: "24px"
//                             }}>
//                                 <i className="bi bi-info-circle-fill" style={{ color: "#00ffd5", fontSize: "18px", marginTop: "2px", flexShrink: 0 }}></i>
//                                 <div style={{ fontSize: "13.5px", color: "#94a3b8", lineHeight: "1.6" }}>
//                                     <strong style={{ color: "#e2e8f0" }}>Enter your packaging requirements below.</strong>
//                                     {" "}Each field has a tooltip (<i className="bi bi-question-circle" style={{ color: "#64748b" }}></i>) and real-world examples to guide you.
//                                     All five fields are required before running the AI analysis.
//                                 </div>
//                             </div>

//                             {/* ── Two-column layout: fields left, score + button right ── */}
//                             <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>

//                                 {/* Left: input fields + progress */}
//                                 <div style={{ flex: 1, minWidth: 0 }}>
//                                     <div className="input-grid">
//                                         {MANUAL_FIELDS.map((fieldDef) => (
//                                             <ManualFieldCard
//                                                 key={fieldDef.key}
//                                                 fieldDef={fieldDef}
//                                                 value={data[fieldDef.key]}
//                                                 onChange={(key, val) => setData(prev => ({ ...prev, [key]: val }))}
//                                             />
//                                         ))}
//                                     </div>

//                                     {/* Completion progress */}
//                                     {(() => {
//                                         const filledCount = MANUAL_FIELDS.filter(f => data[f.key] !== "" && !isNaN(parseFloat(data[f.key]))).length;
//                                         return (
//                                             <div style={{
//                                                 display: "flex", alignItems: "center", gap: "14px",
//                                                 background: "rgba(255,255,255,0.03)", borderRadius: "12px",
//                                                 padding: "14p1 18px", marginTop: "16px"
//                                             }}>
//                                                 <div style={{ flex: 12 }}>
//                                                     <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
//                                                         <span><strong style={{ color: manualValid ? "#00ffd5" : "#e2e8f0" }}>{filledCount}</strong> of 5 fields filled</span>
//                                                         {manualValid && <span style={{ color: "#00ffd5", fontWeight: 600 }}><i className="bi bi-check-circle-fill"></i> Ready to analyse</span>}
//                                                     </div>
//                                                     <div style={{ height: "6px", borderRadius: "10px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
//                                                         <div style={{
//                                                             height: "100%", width: `${(filledCount / 5) * 100}%`, borderRadius: "10px",
//                                                             background: manualValid ? "#00ffd5" : "#4cc9f0",
//                                                             transition: "width 0.3s ease",
//                                                             boxShadow: manualValid ? "0 0 10px #00ffd588" : "none"
//                                                         }} />
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         );
//                                     })()}
//                                 </div>

//                                 {/* Right: sticky score preview + action button */}
//                                 <div style={{
//                                     width: "200px", flexShrink: 1,
//                                     position: "sticky", top: "80px",
//                                     display: "flex", flexDirection: "column", gap: "12px"
//                                 }}>
//                                     {/* ── POST /predict-score → Live Score Predictor ── */}
//                                     <ScorePredictor params={data} />

//                                     {/* Placeholder when score not yet shown */}
//                                     {!(data.strength && data.weight_capacity && data.biodegradability && data.recyclability && data.co2_emission) && (
//                                         <div style={{
//                                             background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)",
//                                             borderRadius: "14px", padding: "24px 16px",
//                                             textAlign: "center", color: "#475569", fontSize: "13px"
//                                         }}>
//                                             <i className="bi bi-stars" style={{ fontSize: "28px", display: "block", marginBottom: "10px", color: "#334155" }}></i>
//                                             Fill all 5 fields to see your live sustainability score preview here.
//                                         </div>
//                                     )}

//                                     {/* Error */}
//                                     {error && (
//                                         <div className="api-error" style={{ margin: 0 }}>
//                                             <i className="bi bi-exclamation-triangle-fill"></i> {error}
//                                         </div>
//                                     )}

//                                     {/* Run button — always visible in this column */}
//                                     <button
//                                         className="btn-primary-eco"
//                                         style={{ width: "100%", justifyContent: "center" }}
//                                         onClick={handleManualPredict}
//                                         disabled={loading || !manualValid}
//                                     >
//                                         <i className={`bi ${loading ? "bi-arrow-repeat spin" : "bi-lightning-charge-fill"}`}></i>
//                                         {loading ? "Analyzing…" : "Run AI Analysis"}
//                                     </button>

//                                     {!manualValid && (
//                                         <div style={{ fontSize: "11.5px", color: "#475569", textAlign: "center" }}>
//                                             <i className="bi bi-lock" style={{ marginRight: "4px" }}></i>
//                                             Complete all fields to unlock analysis
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>
//                     )}
//                 </>
//             )}

//             {/* ════ TAB: RESULTS  (POST /recommend) ══════════════════════════ */}
//             {activePage === "results" && (
//                 <>
//                     {!showResults ? (
//                         <div className="card-glass empty-state" style={{ padding: "80px 0" }}>
//                             <i className="bi bi-box-seam"></i>
//                             <span style={{ marginTop: "10px" }}>No recommendations yet. Complete an analysis first.</span>
//                             <button className="btn-primary-eco" style={{ marginTop: "20px" }} onClick={() => setActivePage("overview")}>Go to Parameters</button>
//                         </div>
//                     ) : (
//                         <>
//                             <ResultsPanel materials={materials} params={lastParams} source={rankSource} userProfile={userProfile} onReset={resetAll} onMaterialClick={setSelectedMaterialId} />
//                             <BIDashboard materials={materials} onMaterialClick={setSelectedMaterialId} />
//                             <ReportCTA />
//                         </>
//                     )}
//                 </>
//             )}

//             {/* ════ TAB: ANALYTICS ════════════════════════════════════════════ */}
//             {activePage === "analytics" && (
//                 <>
//                     {!showResults ? (
//                         <div className="card-glass empty-state" style={{ padding: "80px 0" }}>
//                             <i className="bi bi-bar-chart-line"></i>
//                             <span style={{ marginTop: "10px" }}>Dashboard requires data. Complete an analysis first.</span>
//                             <button className="btn-primary-eco" style={{ marginTop: "20px" }} onClick={() => setActivePage("overview")}>Go to Parameters</button>
//                         </div>
//                     ) : (
//                         <>
//                             <BIDashboard materials={materials} onMaterialClick={setSelectedMaterialId} />
//                             <ReportCTA />
//                         </>
//                     )}
//                 </>
//             )}

//             {/* ════ TAB: CATALOGUE  (GET /materials + GET /materials/<id>) ══ */}
//             {activePage === "catalogue" && (
//                 <div className="card-glass">
//                     <div className="card-label">
//                         <i className="bi bi-journal-text"></i> Material Catalogue
//                         <span className="card-label-sub">Browse all materials · click any row for full detail</span>
//                     </div>
//                     <CatalogueBrowser onMaterialClick={setSelectedMaterialId} />
//                 </div>
//             )}
//         </>
//     );
// }

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
const API_BASE = "https://greenpackai.azurewebsites.net";

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
        id: "product",
        botText: "Hey! 👋 What kind of product are you packaging?",
        subText: "This sets the baseline strength and load requirements for your packaging.",
        type: "chips",
        options: [
            { label: "🍎 Food / Snacks", value: "food", desc: "Moderate protection, food-safe barrier needed", impact: "Strength ↑ · Weight capacity ↑" },
            { label: "📱 Electronics", value: "electronics", desc: "High shock protection, anti-static considerations", impact: "Strength ↑↑ · Weight capacity ↑" },
            { label: "💄 Cosmetics / Beauty", value: "cosmetics", desc: "Light but presentable, premium feel", impact: "Strength ↑ · Weight capacity low" },
            { label: "👕 Clothing / Apparel", value: "clothing", desc: "Minimal protection, lightweight", impact: "Strength low · Weight capacity low" },
            { label: "🧪 Chemicals / Liquids", value: "chemicals", desc: "Chemical-resistant, leak-proof barrier", impact: "Strength ↑↑ · Weight capacity ↑↑" },
            { label: "🔩 Industrial Parts", value: "industrial", desc: "Maximum durability, heavy load support", impact: "Strength MAX · Weight capacity MAX" },
        ],
        resolver: (val) => ({
            food: { strength: 4, weight_capacity: 4 }, electronics: { strength: 7, weight_capacity: 5 },
            cosmetics: { strength: 5, weight_capacity: 3 }, clothing: { strength: 3, weight_capacity: 2 },
            chemicals: { strength: 6, weight_capacity: 7 }, industrial: { strength: 9, weight_capacity: 9 },
        }[val] ?? {})
    },
    {
        id: "fragility",
        botText: "Is it fragile, or can it handle a few bumps?",
        subText: "This fine-tunes the structural strength requirement of your packaging.",
        type: "chips",
        options: [
            { label: "💎 Very fragile", value: "very_fragile", desc: "e.g. glassware, precision instruments", impact: "Strength → 2/5 — soft, cushioned materials preferred" },
            { label: "⚠️ Somewhat delicate", value: "delicate", desc: "e.g. ceramics, printed electronics", impact: "Strength → 4/5 — moderate rigidity" },
            { label: "💪 Fairly sturdy", value: "sturdy", desc: "e.g. shoes, books, boxed goods", impact: "Strength → 7/5 — firm packaging OK" },
            { label: "🪨 Basically indestructible", value: "tough", desc: "e.g. metal tools, auto parts", impact: "Strength → 9/5 — heavy-duty materials" },
        ],
        resolver: (val) => ({ very_fragile: { strength: 2 }, delicate: { strength: 4 }, sturdy: { strength: 7 }, tough: { strength: 9 } }[val] ?? {})
    },
    {
        id: "weight",
        botText: "How heavy is one unit of the product?",
        subText: "Heavier products need packaging with a higher load-bearing capacity.",
        type: "chips",
        options: [
            { label: "🪶 Super light (< 100 g)", value: "ultralight", desc: "e.g. jewellery, sachets, SIM cards", impact: "Weight capacity → 1/5 — thin films & light boxes" },
            { label: "📦 Light (100 g – 1 kg)", value: "light", desc: "e.g. cosmetics, phone accessories", impact: "Weight capacity → 3/5 — standard cartons" },
            { label: "🎒 Medium (1 – 5 kg)", value: "medium", desc: "e.g. laptops, shoes, food jars", impact: "Weight capacity → 6/5 — corrugated or rigid boxes" },
            { label: "🏋️ Heavy (5 kg +)", value: "heavy", desc: "e.g. machinery, bulk food, tools", impact: "Weight capacity → 9/5 — industrial crates & pallets" },
        ],
        resolver: (val) => ({ ultralight: { weight_capacity: 1 }, light: { weight_capacity: 3 }, medium: { weight_capacity: 6 }, heavy: { weight_capacity: 9 } }[val] ?? {})
    },
    {
        id: "eco_priority",
        botText: "How much does eco-friendliness matter to your brand?",
        subText: "Sets the baseline for biodegradability, recyclability, and CO₂ targets.",
        type: "chips",
        options: [
            { label: "🌍 It's our #1 priority", value: "top", desc: "Net-zero commitments, circular economy brand", impact: "Bio 90% · Recyclability 90% · CO₂ score 90%" },
            { label: "♻️ Very important", value: "high", desc: "ESG reporting, sustainability leadership", impact: "Bio 70% · Recyclability 70% · CO₂ score 70%" },
            { label: "👍 Nice to have", value: "medium", desc: "Eco-aware but cost-sensitive", impact: "Bio 40% · Recyclability 50% · CO₂ score 50%" },
            { label: "😐 Not really a concern", value: "low", desc: "Performance and cost are the priority", impact: "Bio 20% · Recyclability 20% · CO₂ score 20%" },
        ],
        resolver: (val) => ({
            top: { biodegradability: 9, recyclability: 9, co2_emission: 9 },
            high: { biodegradability: 7, recyclability: 7, co2_emission: 7 },
            medium: { biodegradability: 4, recyclability: 5, co2_emission: 5 },
            low: { biodegradability: 2, recyclability: 2, co2_emission: 2 },
        }[val] ?? {})
    },
    {
        id: "compost",
        botText: "Should the packaging break down naturally after use?",
        subText: "Fine-tunes the end-of-life preference — composting vs recycling vs neither.",
        type: "chips",
        options: [
            { label: "✅ Must be compostable", value: "must", desc: "Certified industrial or home compostable", impact: "Biodegradability MAX · CO₂ score ↑↑" },
            { label: "🌱 Prefer biodegradable", value: "prefer", desc: "Natural breakdown preferred, not mandatory", impact: "Biodegradability ↑↑" },
            { label: "🔄 Recyclable is enough", value: "recycle", desc: "Standard kerbside recycling stream", impact: "Recyclability ↑↑ · Biodegradability low" },
            { label: "❌ Doesn't matter", value: "none", desc: "No end-of-life requirement", impact: "Biodegradability set low — performance focused" },
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
        source: "GreenPack AI Model",
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
            <i className="bi bi-arrow-repeat spin"></i>&nbsp;Connecting to GreenPack API…
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
                            {/* {Object.entries(result.tier_guide ?? {}).map(([tier, desc]) => (
                                <div key={tier} className={`tier-row ${tier === result.sustainability_tier ? "tier-active" : ""}`}
                                    style={{ borderLeftColor: TIER_COLOR[tier] ?? "#8b94a3" }}>
                                    <strong style={{ color: TIER_COLOR[tier] }}>{tier}</strong>
                                    <span>{desc}</span>
                                </div>
                            ))} */}
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

// Live parameter mini-bar shown in the sidebar tracker
function ParamBar({ label, value, max, color }) {
    const pct = Math.min(100, Math.round((value / max) * 100));
    return (
        <div style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#94a3b8", marginBottom: "3px" }}>
                <span>{label}</span>
                <span style={{ color }}>{value}<span style={{ color: "#475569" }}>/{max}</span></span>
            </div>
            <div style={{ height: "5px", borderRadius: "99px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                <div style={{
                    height: "100%", borderRadius: "99px", width: `${pct}%`,
                    background: color, transition: "width 0.45s ease",
                    boxShadow: `0 0 6px ${color}88`
                }} />
            </div>
        </div>
    );
}

function ChatGuide({ onResultsReady }) {
    const [stepIndex, setStepIndex] = useState(0);
    const [params, setParams] = useState({});
    const [wizardContext, setWizardContext] = useState({});
    const [messages, setMessages] = useState([{ role: "bot", text: STEPS[0].botText, subText: STEPS[0].subText }]);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");
    const [hoveredOption, setHoveredOption] = useState(null);
    const bottomRef = useRef(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, status]);
    const push = (prev, role, text, extra = {}) => [...prev, { role, text, ...extra }];

    // Preview params when hovering an option before clicking
    const previewParams = hoveredOption
        ? { ...params, ...STEPS[stepIndex]?.resolver?.(hoveredOption) }
        : params;

    const handleChipClick = (option) => {
        setHoveredOption(null);
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
            next = push(next, "bot", botText, nextStep.subText ? { subText: nextStep.subText } : {});
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
        setStatus("idle"); setError(""); setHoveredOption(null);
        setMessages([{ role: "bot", text: STEPS[0].botText, subText: STEPS[0].subText }]);
    };

    const busy = status === "calling-api";
    const currentStep = STEPS[stepIndex];
    const showChips = !busy && currentStep?.type === "chips" && status !== "done";
    const showConfirm = !busy && currentStep?.type === "confirm" && status !== "done";

    // Normalise params for display (scale 1-10 → display ranges)
    const dispStrength = previewParams.strength ?? 0;
    const dispWeight = previewParams.weight_capacity ?? 0;
    const dispBio = previewParams.biodegradability ?? 0;
    const dispRec = previewParams.recyclability ?? 0;
    const dispCO2 = previewParams.co2_emission ?? 0;

    const hasAnyParam = dispStrength || dispWeight || dispBio || dispRec || dispCO2;
    const completedSteps = stepIndex;
    const totalSteps = STEPS.length - 1; // exclude confirm

    return (
        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>

            {/* ── Main chat column ── */}
            <div className="chat-guide-wrapper" style={{ flex: 1, minWidth: 0 }}>
                {/* Progress bar */}
                <div className="wizard-progress">
                    <div className="wizard-progress-fill" style={{ width: `${Math.min(100, (stepIndex / (STEPS.length - 1)) * 100)}%` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#475569", padding: "4px 2px 10px" }}>
                    <span>Step {Math.min(stepIndex + 1, STEPS.length)} of {STEPS.length}</span>
                    <span>{completedSteps} of {totalSteps} questions answered</span>
                </div>

                {/* Messages */}
                <div className="chat-messages">
                    {messages.map((m, i) => (
                        <div key={i} className={`chat-bubble-wrap ${m.role === "user" ? "user-wrap" : "bot-wrap"}`}>
                            {m.role === "bot" && <div className="bot-avatar"><i className="bi bi-recycle"></i></div>}
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: m.role === "user" ? undefined : "100%" }}>
                                <div className={`chat-bubble ${m.role === "user" ? "bubble-user" : "bubble-bot"} ${m.loading ? "bubble-loading" : ""}`}>
                                    {m.loading
                                        ? <><i className="bi bi-arrow-repeat spin"></i>&nbsp;{m.text}</>
                                        : m.text.split("\n").map((line, j, arr) => <span key={j}>{line}{j < arr.length - 1 && <br />}</span>)}
                                </div>
                                {m.role === "bot" && m.subText && (
                                    <div style={{
                                        fontSize: "0.75rem", color: "#64748b", paddingLeft: "4px",
                                        display: "flex", alignItems: "center", gap: "5px"
                                    }}>
                                        <i className="bi bi-info-circle" style={{ color: "#4cc9f0", fontSize: "0.7rem" }}></i>
                                        {m.subText}
                                    </div>
                                )}
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

                {/* Option chips — enhanced with desc + impact */}
                {showChips && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                        {/* Hover hint */}
                        <div style={{ fontSize: "0.73rem", color: "#475569", textAlign: "center", paddingBottom: "2px" }}>
                            <i className="bi bi-hand-index"></i> Hover an option to preview its effect on parameters, then click to select
                        </div>
                        <div className="chip-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "8px" }}>
                            {currentStep.options.map(opt => (
                                <button
                                    key={opt.value}
                                    className="wizard-chip"
                                    style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", padding: "10px 14px", textAlign: "left", height: "auto" }}
                                    onMouseEnter={() => setHoveredOption(opt.value)}
                                    onMouseLeave={() => setHoveredOption(null)}
                                    onClick={() => handleChipClick(opt)}
                                >
                                    <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{opt.label}</span>
                                    {opt.desc && <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 400, lineHeight: 1.4 }}>{opt.desc}</span>}
                                    {opt.impact && (
                                        <span style={{ fontSize: "0.68rem", color: "#4cc9f0", fontWeight: 500, marginTop: "2px" }}>
                                            <i className="bi bi-lightning-charge-fill" style={{ marginRight: "3px" }}></i>{opt.impact}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {showConfirm && (
                    <div className="confirm-row">
                        <button className="btn-primary-eco" onClick={handleConfirm}><i className="bi bi-lightning-charge-fill"></i> Find my materials!</button>
                        <button className="btn-ghost" onClick={handleRetake}><i className="bi bi-arrow-counterclockwise"></i> Start over</button>
                    </div>
                )}
            </div>

            {/* ── Live parameter tracker sidebar ── */}
            {hasAnyParam && (
                <div style={{
                    width: "200px", flexShrink: 0,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "12px", padding: "14px 16px",
                    position: "sticky", top: "20px"
                }}>
                    <div style={{ fontSize: "0.73rem", color: "#4cc9f0", fontWeight: 600, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <i className="bi bi-sliders2"></i>
                        {hoveredOption ? "Preview (hover)" : "Your parameters"}
                    </div>

                    <ParamBar label="Strength" value={dispStrength} max={10} color="#f97316" />
                    <ParamBar label="Weight Cap." value={dispWeight} max={10} color="#fb7185" />
                    <ParamBar label="Biodegradability" value={dispBio} max={10} color="#00ffd5" />
                    <ParamBar label="Recyclability" value={dispRec} max={10} color="#4cc9f0" />
                    <ParamBar label="CO₂ Eco-Score" value={dispCO2} max={10} color="#ffd166" />

                    {hoveredOption && (
                        <div style={{ marginTop: "10px", fontSize: "0.68rem", color: "#64748b", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px" }}>
                            <i className="bi bi-cursor-fill" style={{ color: "#4cc9f0", marginRight: "4px" }}></i>
                            Bars show values <em>after</em> selecting this option
                        </div>
                    )}

                    {stepIndex >= STEPS.length - 1 && (
                        <div style={{ marginTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
                            {(() => {
                                const api = toApiParams(finaliseWizard(params));
                                return (
                                    <div style={{ fontSize: "0.68rem", color: "#64748b", lineHeight: 1.6 }}>
                                        <div><strong style={{ color: "#94a3b8" }}>API values</strong></div>
                                        <div>Strength: <span style={{ color: "#f97316" }}>{api.strength}/5</span></div>
                                        <div>Weight: <span style={{ color: "#fb7185" }}>{api.weight_capacity}/5</span></div>
                                        <div>Bio: <span style={{ color: "#00ffd5" }}>{api.biodegradability}%</span></div>
                                        <div>Recycle: <span style={{ color: "#4cc9f0" }}>{api.recyclability}%</span></div>
                                        <div>CO₂: <span style={{ color: "#ffd166" }}>{api.co2_emission}%</span></div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
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
                            {/* <div className="material-stat"><span>Score</span><strong style={{ color: tc(m.sustainability_tier) }}>{m.sustainability_score.toFixed(1)}</strong></div> */}
                            {/* <div className="material-stat"><span>Tier</span><strong style={{ color: tc(m.sustainability_tier) }}>{m.sustainability_tier}</strong></div> */}
                            {/* <div className="material-stat"><span>Match</span><strong>{m.match_score.toFixed(1)}</strong></div> */}
                            {/* <div className="material-stat"><span>Similarity</span><strong>{m.similarity_to_request}</strong></div> */}
                            {/* <div className="material-stat"><span>CO₂ Score</span><strong>{m.co2_emission_score.toFixed(1)}%</strong></div> */}
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

// ─── MANUAL FIELD CARD ────────────────────────────────────────────────────────
function ManualFieldCard({ fieldDef, value, onChange }) {
    const { key, label, hint, min, max, step, unit, icon, description, tooltip, examples, color } = fieldDef;
    const [showTip, setShowTip] = useState(false);

    const raw = value;
    const num = parseFloat(raw);
    const filled = raw !== "" && !isNaN(num);
    const valid = filled && num >= min && num <= max;
    const pct = filled ? Math.max(0, Math.min(100, ((num - min) / (max - min)) * 100)) : 0;

    return (
        <div style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${filled ? (valid ? color + "44" : "#ff4d6d55") : "rgba(255,255,255,0.08)"}`,
            borderRadius: "14px", padding: "18px 20px",
            transition: "border-color 0.25s",
        }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* <i className={`bi ${icon}`} style={{ color, fontSize: "15px" }}></i> */}
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "#e2e8f0" }}>{label}</span>
                    <span style={{
                        fontSize: "10px", padding: "1px 7px", borderRadius: "60px",
                        background: color + "22", color, border: `1px solid ${color}44`, fontWeight: 600
                    }}>{unit}</span>
                </div>
                <div style={{ position: "relative" }}>
                    <i
                        className="bi bi-question-circle"
                        style={{ color: "#64748b", cursor: "pointer", fontSize: "15px" }}
                        onMouseEnter={() => setShowTip(true)}
                        onMouseLeave={() => setShowTip(false)}
                    ></i>
                    {showTip && (
                        <div style={{
                            position: "absolute", right: 0, top: "22px", zIndex: 50,
                            background: "#1e293b", border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "10px", padding: "12px 14px", width: "240px",
                            fontSize: "12.5px", color: "#94a3b8", lineHeight: "1.6",
                            boxShadow: "0 8px 30px rgba(0,0,0,0.4)"
                        }}>
                            <strong style={{ color: "#e2e8f0", display: "block", marginBottom: "4px" }}>
                                <i className={`bi ${icon}`} style={{ color, marginRight: "6px" }}></i>{label}
                            </strong>
                            {tooltip}
                        </div>
                    )}
                </div>
            </div>

            {/* Description */}
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>{description}</div>

            {/* Input + validation badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <input
                    className="form-control"
                    placeholder={hint}
                    type="number" min={min} max={max} step={step} required
                    value={raw}
                    style={{ flex: 1, borderColor: filled ? (valid ? color + "66" : "#ff4d6d88") : undefined }}
                    onChange={e => {
                        let val = e.target.value;
                        if (val !== "") {
                            const n = parseFloat(val);
                            if (n < min) val = String(min);
                            else if (n > max) val = String(max);
                            else val = String(n);
                        }
                        onChange(key, val);
                    }}
                />
                {filled && (
                    <span style={{
                        fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px",
                        background: valid ? color + "22" : "#ff4d6d22",
                        color: valid ? color : "#ff4d6d",
                        border: `1px solid ${valid ? color + "44" : "#ff4d6d44"}`,
                        whiteSpace: "nowrap"
                    }}>
                        {valid ? <><i className="bi bi-check-lg"></i> Valid</> : <><i className="bi bi-exclamation-triangle"></i> Out of range</>}
                    </span>
                )}
            </div>

            {/* Range bar */}
            <div style={{ marginBottom: "12px" }}>
                <div style={{ height: "5px", borderRadius: "10px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <div style={{
                        height: "100%", width: `${pct}%`, borderRadius: "10px",
                        background: valid ? color : "#ff4d6d",
                        transition: "width 0.3s ease, background 0.3s",
                        boxShadow: valid ? `0 0 8px ${color}88` : "none"
                    }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#475569", marginTop: "3px" }}>
                    <span>{min} (lowest)</span><span>{max} (highest)</span>
                </div>
            </div>

            {/* Examples */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
                {/* <div style={{ fontSize: "11px", color: "#475569", marginBottom: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Real-world examples
                </div> */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {examples.map(ex => (
                        <div key={ex.val} style={{ display: "flex", gap: "8px", fontSize: "12px" }}>
                            <span style={{
                                fontWeight: 700, color, minWidth: "50px",
                                background: color + "18", borderRadius: "6px",
                                padding: "1px 7px", textAlign: "center", fontSize: "11px"
                            }}>{ex.val}</span>
                            <span style={{ color: "#64748b" }}>{ex.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: COMPARE PAGE
// Compares recommended eco-friendly materials vs. conventional daily-use materials
// ═══════════════════════════════════════════════════════════════════════════════
const CONVENTIONAL_MATERIALS = [
    // ── Original 5 ──────────────────────────────────────────────────────────
    {
        name: "Virgin PET Plastic",
        type: "Plastic",
        category: "General",
        uses: "Water bottles, food trays, blister packs",
        biodegradability: 2,
        recyclability: 30,
        co2Score: 15,
        sustainabilityScore: 12,
        strength: 4,
        weightCapacity: 3,
        is_biodegradable: false,
        is_recyclable: true,
        icon: "🧴",
        color: "#ff4d6d",
    },
    {
        name: "Expanded Polystyrene (EPS)",
        type: "Foam",
        category: "General",
        uses: "Coffee cups, takeaway boxes, cushioning",
        biodegradability: 1,
        recyclability: 8,
        co2Score: 10,
        sustainabilityScore: 8,
        strength: 2,
        weightCapacity: 2,
        is_biodegradable: false,
        is_recyclable: false,
        icon: "☕",
        color: "#ff4d6d",
    },
    {
        name: "Multi-layer Plastic Film",
        type: "Plastic",
        category: "General",
        uses: "Snack bags, pouches, wrappers",
        biodegradability: 1,
        recyclability: 5,
        co2Score: 12,
        sustainabilityScore: 7,
        strength: 3,
        weightCapacity: 2,
        is_biodegradable: false,
        is_recyclable: false,
        icon: "🍟",
        color: "#ff4d6d",
    },
    {
        name: "Aluminium Foil (Virgin)",
        type: "Metal",
        category: "General",
        uses: "Food wrapping, tray seals, sachets",
        biodegradability: 0,
        recyclability: 45,
        co2Score: 8,
        sustainabilityScore: 18,
        strength: 2,
        weightCapacity: 1,
        is_biodegradable: false,
        is_recyclable: true,
        icon: "🫙",
        color: "#ffd166",
    },
    {
        name: "PVC Shrink Wrap",
        type: "Plastic",
        category: "General",
        uses: "Shrink sleeves, cling wrap, overwrap",
        biodegradability: 1,
        recyclability: 4,
        co2Score: 9,
        sustainabilityScore: 6,
        strength: 3,
        weightCapacity: 2,
        is_biodegradable: false,
        is_recyclable: false,
        icon: "📦",
        color: "#ff4d6d",
    },
    // ── E-Commerce ──────────────────────────────────────────────────────────
    {
        name: "Plastic Mailer Bag",
        type: "Plastic",
        category: "E-Commerce",
        uses: "Amazon, Flipkart, Meesho shipments — garments & soft goods",
        biodegradability: 1,
        recyclability: 6,
        co2Score: 11,
        sustainabilityScore: 7,
        strength: 3,
        weightCapacity: 3,
        is_biodegradable: false,
        is_recyclable: false,
        icon: "🛍️",
        color: "#ff4d6d",
    },
    {
        name: "Bubble Wrap (Virgin PE)",
        type: "Plastic",
        category: "E-Commerce",
        uses: "Electronics, fragile product cushioning in e-com boxes",
        biodegradability: 1,
        recyclability: 10,
        co2Score: 13,
        sustainabilityScore: 9,
        strength: 2,
        weightCapacity: 1,
        is_biodegradable: false,
        is_recyclable: false,
        icon: "🫧",
        color: "#ff4d6d",
    },
    {
        name: "Polypropylene (PP) Tape",
        type: "Plastic",
        category: "E-Commerce",
        uses: "Box sealing — used in millions of shipments daily",
        biodegradability: 1,
        recyclability: 3,
        co2Score: 10,
        sustainabilityScore: 5,
        strength: 3,
        weightCapacity: 2,
        is_biodegradable: false,
        is_recyclable: false,
        icon: "📏",
        color: "#ff4d6d",
    },
    {
        name: "Styrofoam Peanuts",
        type: "Foam",
        category: "E-Commerce",
        uses: "Void fill & cushioning in large e-com shipments",
        biodegradability: 1,
        recyclability: 5,
        co2Score: 8,
        sustainabilityScore: 6,
        strength: 1,
        weightCapacity: 1,
        is_biodegradable: false,
        is_recyclable: false,
        icon: "🥜",
        color: "#ff4d6d",
    },
    {
        name: "Laminated Paper Bag",
        type: "Composite",
        category: "E-Commerce",
        uses: "Fashion & lifestyle brand e-com bags — plastic-coated paper",
        biodegradability: 8,
        recyclability: 12,
        co2Score: 20,
        sustainabilityScore: 14,
        strength: 3,
        weightCapacity: 2,
        is_biodegradable: false,
        is_recyclable: false,
        icon: "🛒",
        color: "#ffd166",
    },
    {
        name: "Stretch Wrap / Pallet Film",
        type: "Plastic",
        category: "E-Commerce",
        uses: "Warehouse palletising, bulk e-com fulfilment centres",
        biodegradability: 1,
        recyclability: 14,
        co2Score: 12,
        sustainabilityScore: 9,
        strength: 4,
        weightCapacity: 5,
        is_biodegradable: false,
        is_recyclable: true,
        icon: "🏭",
        color: "#ff4d6d",
    },
    {
        name: "Foam-in-Place Packaging",
        type: "Foam",
        category: "E-Commerce",
        uses: "High-value electronics, custom-moulded protection in shipments",
        biodegradability: 1,
        recyclability: 4,
        co2Score: 7,
        sustainabilityScore: 5,
        strength: 5,
        weightCapacity: 5,
        is_biodegradable: false,
        is_recyclable: false,
        icon: "💻",
        color: "#ff4d6d",
    },
    // ── Quick Commerce ───────────────────────────────────────────────────────
    {
        name: "Single-use Plastic Carry Bag",
        type: "Plastic",
        category: "Quick Commerce",
        uses: "Blinkit, Zepto, Swiggy Instamart delivery bags",
        biodegradability: 2,
        recyclability: 4,
        co2Score: 10,
        sustainabilityScore: 6,
        strength: 2,
        weightCapacity: 2,
        is_biodegradable: false,
        is_recyclable: false,
        icon: "🛵",
        color: "#ff4d6d",
    },
    {
        name: "Plastic Clamshell Container",
        type: "Plastic",
        category: "Quick Commerce",
        uses: "Ready-to-eat meals, salads, cut fruits — Swiggy/Zomato",
        biodegradability: 1,
        recyclability: 15,
        co2Score: 11,
        sustainabilityScore: 9,
        strength: 3,
        weightCapacity: 2,
        is_biodegradable: false,
        is_recyclable: true,
        icon: "🥗",
        color: "#ff4d6d",
    },
    {
        name: "PP Woven Grocery Bag",
        type: "Plastic",
        category: "Quick Commerce",
        uses: "Reusable but non-biodegradable grocery tote — q-com deliveries",
        biodegradability: 3,
        recyclability: 18,
        co2Score: 16,
        sustainabilityScore: 14,
        strength: 4,
        weightCapacity: 4,
        is_biodegradable: false,
        is_recyclable: true,
        icon: "🧺",
        color: "#ffd166",
    },
    {
        name: "EPS Insulated Box",
        type: "Foam",
        category: "Quick Commerce",
        uses: "Cold-chain grocery, dairy & ice cream delivery (Zepto, Blinkit)",
        biodegradability: 1,
        recyclability: 5,
        co2Score: 7,
        sustainabilityScore: 6,
        strength: 3,
        weightCapacity: 4,
        is_biodegradable: false,
        is_recyclable: false,
        icon: "🧊",
        color: "#ff4d6d",
    },
    {
        name: "Plastic Bubble Mailer",
        type: "Composite",
        category: "Quick Commerce",
        uses: "Pharma, small electronics — 10-min delivery apps",
        biodegradability: 1,
        recyclability: 5,
        co2Score: 9,
        sustainabilityScore: 6,
        strength: 3,
        weightCapacity: 2,
        is_biodegradable: false,
        is_recyclable: false,
        icon: "💊",
        color: "#ff4d6d",
    },
    {
        name: "LDPE Produce Bag",
        type: "Plastic",
        category: "Quick Commerce",
        uses: "Fruits & vegetables pre-bagged for q-com picking stations",
        biodegradability: 2,
        recyclability: 8,
        co2Score: 12,
        sustainabilityScore: 8,
        strength: 1,
        weightCapacity: 1,
        is_biodegradable: false,
        is_recyclable: false,
        icon: "🥦",
        color: "#ff4d6d",
    },
    {
        name: "Metalized Mylar Pouch",
        type: "Composite",
        category: "Quick Commerce",
        uses: "Chips, coffee, dry goods — q-com & dark store SKUs",
        biodegradability: 1,
        recyclability: 3,
        co2Score: 10,
        sustainabilityScore: 6,
        strength: 3,
        weightCapacity: 2,
        is_biodegradable: false,
        is_recyclable: false,
        icon: "🍿",
        color: "#ff4d6d",
    },
];

const METRICS = [
    { key: "sustainabilityScore", label: "Sustainability Score", max: 100, color: "#00ffd5", icon: "bi-star-fill", suffix: "" },
    { key: "biodegradability", label: "Biodegradability", max: 100, color: "#4ade80", icon: "bi-tree-fill", suffix: "%" },
    { key: "recyclability", label: "Recyclability", max: 100, color: "#4cc9f0", icon: "bi-recycle", suffix: "%" },
    { key: "co2Score", label: "CO₂ Eco-Score", max: 100, color: "#ffd166", icon: "bi-cloud-haze2-fill", suffix: "" },
    { key: "strength", label: "Strength", max: 5, color: "#f97316", icon: "bi-shield-fill", suffix: "/5" },
    { key: "weightCapacity", label: "Weight Capacity", max: 5, color: "#fb7185", icon: "bi-box-seam-fill", suffix: "/5" },
];

function MiniBar({ value, max, color }) {
    const pct = Math.min(100, Math.round((value / max) * 100));
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ flex: 1, height: "6px", borderRadius: "99px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                <div style={{
                    height: "100%", width: `${pct}%`, borderRadius: "99px",
                    background: color, transition: "width 0.5s ease",
                    boxShadow: `0 0 6px ${color}66`,
                }} />
            </div>
            <span style={{ fontSize: "11px", color, fontWeight: 600, minWidth: "32px", textAlign: "right" }}>{pct}%</span>
        </div>
    );
}

const CONV_CATEGORIES = ["All", "General", "E-Commerce", "Quick Commerce"];
const CATEGORY_META = {
    "All": { icon: "bi-grid-fill", color: "#94a3b8" },
    "General": { icon: "bi-box-seam", color: "#ffd166" },
    "E-Commerce": { icon: "bi-shop", color: "#4cc9f0" },
    "Quick Commerce": { icon: "bi-lightning-charge-fill", color: "#f97316" },
};

function ComparePage({ materials, showResults, onNavigate }) {
    const [selectedEco, setSelectedEco] = useState(0);
    const [selectedConv, setSelectedConv] = useState(0);
    const [convCategory, setConvCategory] = useState("All");
    const [activeMetric, setActiveMetric] = useState("sustainabilityScore");
    const radarRef = useRef(null);
    const radarInstance = useRef(null);

    const ecoMats = materials.length > 0 ? materials : [];
    const eco = ecoMats[selectedEco];

    const filteredConv = convCategory === "All"
        ? CONVENTIONAL_MATERIALS
        : CONVENTIONAL_MATERIALS.filter(m => m.category === convCategory);

    // reset selection when filter changes
    const [convIdx, setConvIdx] = useState(0);
    const handleConvCategory = (cat) => { setConvCategory(cat); setConvIdx(0); };
    const handleConvSelect = (i) => { setConvIdx(i); setSelectedConv(CONVENTIONAL_MATERIALS.indexOf(filteredConv[i])); };

    const conv = filteredConv[convIdx] ?? CONVENTIONAL_MATERIALS[0];

    // Map eco material props to compare keys
    const ecoVal = (key) => {
        const map = {
            sustainabilityScore: eco?.sustainability_score ?? 0,
            biodegradability: eco?.biodegradability ?? 0,
            recyclability: eco?.recyclability ?? 0,
            co2Score: eco?.co2_emission_score ?? 0,
            strength: (eco?.strength_score ?? 0) * (5 / 5),
            weightCapacity: (eco?.weight_capacity_score ?? 0) * (5 / 5),
        };
        return map[key] ?? 0;
    };

    const convVal = (key) => conv?.[key] ?? 0;

    // Draw radar chart
    useEffect(() => {
        if (!radarRef.current || !eco || !conv) return;
        radarInstance.current?.destroy();
        const labels = METRICS.map(m => m.label);
        const ecoData = METRICS.map(m => Math.round((ecoVal(m.key) / m.max) * 100));
        const convData = METRICS.map(m => Math.round((convVal(m.key) / m.max) * 100));
        radarInstance.current = new Chart(radarRef.current, {
            type: "radar",
            data: {
                labels,
                datasets: [
                    {
                        label: eco.material_name,
                        data: ecoData,
                        backgroundColor: "rgba(0,255,213,0.12)",
                        borderColor: "#00ffd5",
                        pointBackgroundColor: "#00ffd5",
                        pointRadius: 4,
                        borderWidth: 2,
                    },
                    {
                        label: conv.name,
                        data: convData,
                        backgroundColor: "rgba(255,77,109,0.1)",
                        borderColor: "#ff4d6d",
                        pointBackgroundColor: "#ff4d6d",
                        pointRadius: 4,
                        borderWidth: 2,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { color: "#94a3b8", font: { size: 11 } } },
                    tooltip: {
                        backgroundColor: "rgba(6,13,19,0.92)",
                        borderColor: "rgba(0,255,213,0.3)",
                        borderWidth: 1,
                        titleColor: "#f0f4f8",
                        bodyColor: "#94a3b8",
                    },
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: "#475569", font: { size: 9 }, stepSize: 25, backdropColor: "transparent" },
                        grid: { color: "rgba(255,255,255,0.06)" },
                        angleLines: { color: "rgba(255,255,255,0.06)" },
                        pointLabels: { color: "#64748b", font: { size: 10 } },
                    },
                },
            },
        });
        return () => radarInstance.current?.destroy();
    }, [selectedEco, convIdx, convCategory, materials]);

    if (!showResults || ecoMats.length === 0) {
        return (
            <div className="card-glass empty-state" style={{ padding: "80px 0" }}>
                <i className="bi bi-arrow-left-right" style={{ fontSize: "48px", color: "#334155" }}></i>
                <span style={{ marginTop: "12px" }}>No recommendation data yet.</span>
                <span style={{ color: "#475569", fontSize: "13px" }}>Run an analysis first to compare your eco materials with conventional alternatives.</span>
                <button className="btn-primary-eco" style={{ marginTop: "20px" }} onClick={() => onNavigate("overview")}>
                    Go to Parameters
                </button>
            </div>
        );
    }

    const winnerEco = METRICS.filter(m => ecoVal(m.key) >= convVal(m.key)).length;
    const winnerConv = METRICS.length - winnerEco;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* ── Header banner ── */}
            <div style={{
                background: "linear-gradient(135deg, rgba(0,255,213,0.07) 0%, rgba(76,201,240,0.05) 100%)",
                border: "1px solid rgba(0,255,213,0.15)", borderRadius: "16px", padding: "20px 24px",
                display: "flex", alignItems: "center", gap: "16px",
            }}>
                <div style={{
                    width: "44px", height: "44px", borderRadius: "12px",
                    background: "rgba(0,255,213,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "22px", flexShrink: 0,
                }}>
                    <i className="bi bi-arrow-left-right" style={{ color: "#00ffd5" }}></i>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" }}>
                        Eco vs. Conventional Materials
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>
                        Compare your AI-recommended sustainable materials against conventional packaging used by e-commerce & quick commerce — see exactly where they win.
                    </div>
                </div>
                {/* Stats pills */}
                <div style={{ display: "flex", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
                    {[
                        { label: "General", count: CONVENTIONAL_MATERIALS.filter(m => m.category === "General").length, color: "#ffd166" },
                        { label: "E-Commerce", count: CONVENTIONAL_MATERIALS.filter(m => m.category === "E-Commerce").length, color: "#4cc9f0" },
                        { label: "Quick Commerce", count: CONVENTIONAL_MATERIALS.filter(m => m.category === "Quick Commerce").length, color: "#f97316" },
                    ].map(s => (
                        <div key={s.label} style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "99px", background: `${s.color}11`, border: `1px solid ${s.color}33`, color: s.color, fontWeight: 600 }}>
                            {s.count} {s.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Selector Row ── */}
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>

                {/* Eco material picker */}
                <div className="card-glass" style={{ flex: 1, minWidth: "260px", padding: "16px 20px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#00ffd5", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
                        <i className="bi bi-leaf-fill" style={{ marginRight: "6px" }}></i>Eco-Friendly Material (AI Recommended)
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {ecoMats.map((m, i) => (
                            <button key={i} onClick={() => setSelectedEco(i)} style={{
                                background: selectedEco === i ? "rgba(0,255,213,0.12)" : "rgba(255,255,255,0.03)",
                                border: selectedEco === i ? "1px solid rgba(0,255,213,0.4)" : "1px solid rgba(255,255,255,0.07)",
                                borderRadius: "10px", padding: "10px 14px", cursor: "pointer",
                                display: "flex", alignItems: "center", gap: "10px", transition: "all 0.2s",
                            }}>
                                <div style={{
                                    width: "24px", height: "24px", borderRadius: "50%",
                                    background: selectedEco === i ? "#00ffd5" : "rgba(255,255,255,0.1)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "11px", fontWeight: 700,
                                    color: selectedEco === i ? "#060d13" : "#64748b", flexShrink: 0,
                                }}>
                                    {m.rank}
                                </div>
                                <div style={{ textAlign: "left" }}>
                                    <div style={{ fontSize: "13px", fontWeight: 600, color: selectedEco === i ? "#e2e8f0" : "#94a3b8" }}>{m.material_name}</div>
                                    <div style={{ fontSize: "11px", color: "#475569" }}>{m.material_type}</div>
                                </div>
                                {m.is_biodegradable && <span style={{ marginLeft: "auto", fontSize: "14px" }}>🌱</span>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* VS divider */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    <div style={{
                        width: "48px", height: "48px", borderRadius: "50%",
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "13px", fontWeight: 800, color: "#475569",
                    }}>VS</div>
                </div>

                {/* Conventional material picker */}
                <div className="card-glass" style={{ flex: 1, minWidth: "260px", padding: "16px 20px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#ff4d6d", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
                        <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: "6px" }}></i>Conventional Material
                        <span style={{ color: "#475569", fontWeight: 400, marginLeft: "6px", textTransform: "none", letterSpacing: 0 }}>({CONVENTIONAL_MATERIALS.length} total)</span>
                    </div>

                    {/* Category filter tabs */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                        {CONV_CATEGORIES.map(cat => {
                            const meta = CATEGORY_META[cat];
                            const active = convCategory === cat;
                            return (
                                <button key={cat} onClick={() => handleConvCategory(cat)} style={{
                                    fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "99px",
                                    cursor: "pointer", transition: "all 0.2s",
                                    background: active ? `${meta.color}18` : "rgba(255,255,255,0.03)",
                                    border: active ? `1px solid ${meta.color}55` : "1px solid rgba(255,255,255,0.07)",
                                    color: active ? meta.color : "#475569",
                                }}>
                                    <i className={`bi ${meta.icon}`} style={{ marginRight: "4px" }}></i>
                                    {cat}
                                    <span style={{ marginLeft: "5px", opacity: 0.6 }}>
                                        {cat === "All" ? CONVENTIONAL_MATERIALS.length : CONVENTIONAL_MATERIALS.filter(m => m.category === cat).length}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Scrollable material list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "340px", overflowY: "auto", paddingRight: "2px" }}>
                        {filteredConv.map((m, i) => (
                            <button key={i} onClick={() => handleConvSelect(i)} style={{
                                background: convIdx === i ? "rgba(255,77,109,0.08)" : "rgba(255,255,255,0.03)",
                                border: convIdx === i ? "1px solid rgba(255,77,109,0.35)" : "1px solid rgba(255,255,255,0.07)",
                                borderRadius: "10px", padding: "10px 14px", cursor: "pointer",
                                display: "flex", alignItems: "center", gap: "10px", transition: "all 0.2s",
                                flexShrink: 0,
                            }}>
                                <span style={{ fontSize: "18px", flexShrink: 0 }}>{m.icon}</span>
                                <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: "13px", fontWeight: 600, color: convIdx === i ? "#e2e8f0" : "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                                    <div style={{ fontSize: "11px", color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.uses}</div>
                                </div>
                                {/* Category pill */}
                                <span style={{
                                    fontSize: "9px", padding: "2px 7px", borderRadius: "99px", flexShrink: 0,
                                    background: `${CATEGORY_META[m.category]?.color}15`,
                                    color: CATEGORY_META[m.category]?.color,
                                    border: `1px solid ${CATEGORY_META[m.category]?.color}30`,
                                    fontWeight: 600,
                                }}>
                                    {m.category === "Quick Commerce" ? "Q-Com" : m.category}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Score Summary Banner ── */}
            {eco && conv && (
                <div style={{
                    display: "flex", gap: "12px", flexWrap: "wrap",
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "14px", padding: "16px 20px", alignItems: "center",
                }}>
                    <div style={{ flex: 1, minWidth: "180px" }}>
                        <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Eco Material Wins</div>
                        <div style={{ fontSize: "28px", fontWeight: 800, color: "#00ffd5" }}>{winnerEco}<span style={{ fontSize: "14px", fontWeight: 400, color: "#475569" }}>/{METRICS.length} metrics</span></div>
                    </div>
                    <div style={{ flex: 1, minWidth: "180px" }}>
                        <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Conventional Wins</div>
                        <div style={{ fontSize: "28px", fontWeight: 800, color: "#ff4d6d" }}>{winnerConv}<span style={{ fontSize: "14px", fontWeight: 400, color: "#475569" }}>/{METRICS.length} metrics</span></div>
                    </div>
                    <div style={{ flex: 2, minWidth: "220px" }}>
                        <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                            {winnerEco >= 5 ? (
                                <><i className="bi bi-check-circle-fill" style={{ color: "#00ffd5", marginRight: "8px" }}></i>
                                    <strong style={{ color: "#00ffd5" }}>{eco.material_name}</strong> significantly outperforms <strong style={{ color: "#ff4d6d" }}>{conv.name}</strong> — a clear eco upgrade.</>
                            ) : winnerEco >= 3 ? (
                                <><i className="bi bi-info-circle-fill" style={{ color: "#ffd166", marginRight: "8px" }}></i>
                                    <strong style={{ color: "#00ffd5" }}>{eco.material_name}</strong> wins on most sustainability metrics, with some trade-offs in performance.</>
                            ) : (
                                <><i className="bi bi-dash-circle-fill" style={{ color: "#ff4d6d", marginRight: "8px" }}></i>
                                    <strong style={{ color: "#ff4d6d" }}>{conv.name}</strong> has higher scores on some performance metrics — but at a major environmental cost.</>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Main Comparison Grid ── */}
            {eco && conv && (
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>

                    {/* Metric bars */}
                    <div className="card-glass" style={{ flex: 2, minWidth: "300px", padding: "20px 24px" }}>
                        <div className="card-label" style={{ marginBottom: "20px" }}>
                            <i className="bi bi-bar-chart-steps"></i> Metric-by-Metric Comparison
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                            {METRICS.map(m => {
                                const eV = ecoVal(m.key);
                                const cV = convVal(m.key);
                                const ePct = Math.min(100, Math.round((eV / m.max) * 100));
                                const cPct = Math.min(100, Math.round((cV / m.max) * 100));
                                const ecoWins = eV >= cV;
                                return (
                                    <div key={m.key} style={{
                                        background: "rgba(255,255,255,0.02)", borderRadius: "12px",
                                        padding: "14px 16px",
                                        border: activeMetric === m.key ? `1px solid ${m.color}44` : "1px solid rgba(255,255,255,0.05)",
                                        cursor: "pointer", transition: "all 0.2s",
                                    }} onClick={() => setActiveMetric(m.key)}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>
                                                <i className={`bi ${m.icon}`} style={{ color: m.color }}></i>
                                                {m.label}
                                            </div>
                                            <span style={{
                                                fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px",
                                                background: ecoWins ? "rgba(0,255,213,0.1)" : "rgba(255,77,109,0.1)",
                                                color: ecoWins ? "#00ffd5" : "#ff4d6d",
                                                border: ecoWins ? "1px solid rgba(0,255,213,0.25)" : "1px solid rgba(255,77,109,0.25)",
                                            }}>
                                                {ecoWins ? "🌱 Eco Wins" : "⚠️ Conv Wins"}
                                            </span>
                                        </div>

                                        {/* Eco bar */}
                                        <div style={{ marginBottom: "8px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>
                                                <span style={{ color: "#00ffd5", fontWeight: 600 }}>{eco.material_name}</span>
                                                <span style={{ color: "#00ffd5" }}>{eV.toFixed(1)}{m.suffix}</span>
                                            </div>
                                            <div style={{ height: "7px", borderRadius: "99px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                                                <div style={{
                                                    height: "100%", width: `${ePct}%`, borderRadius: "99px",
                                                    background: "#00ffd5", boxShadow: "0 0 8px #00ffd566",
                                                    transition: "width 0.5s ease",
                                                }} />
                                            </div>
                                        </div>

                                        {/* Conv bar */}
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>
                                                <span style={{ color: "#ff4d6d", fontWeight: 600 }}>{conv.name}</span>
                                                <span style={{ color: "#ff4d6d" }}>{cV.toFixed(1)}{m.suffix}</span>
                                            </div>
                                            <div style={{ height: "7px", borderRadius: "99px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                                                <div style={{
                                                    height: "100%", width: `${cPct}%`, borderRadius: "99px",
                                                    background: "#ff4d6d", boxShadow: "0 0 8px #ff4d6d66",
                                                    transition: "width 0.5s ease",
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right column: radar + material cards */}
                    <div style={{ flex: 1, minWidth: "280px", display: "flex", flexDirection: "column", gap: "16px" }}>

                        {/* Radar chart */}
                        <div className="card-glass" style={{ padding: "20px 24px" }}>
                            <div className="card-label" style={{ marginBottom: "16px" }}>
                                <i className="bi bi-radar"></i> Radar Overview
                            </div>
                            <div style={{ height: "260px" }}>
                                <canvas ref={radarRef}></canvas>
                            </div>
                        </div>

                        {/* Eco material card */}
                        <div style={{
                            background: "rgba(0,255,213,0.05)", border: "1px solid rgba(0,255,213,0.18)",
                            borderRadius: "14px", padding: "16px 18px",
                        }}>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#00ffd5", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>
                                <i className="bi bi-leaf-fill" style={{ marginRight: "6px" }}></i>Selected Eco Material
                            </div>
                            <div style={{ fontSize: "16px", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" }}>{eco.material_name}</div>
                            <div style={{ fontSize: "12px", color: "#475569", marginBottom: "10px" }}>{eco.material_type}</div>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                                {eco.is_biodegradable && <span className="flag-pill bio">🌱 Biodegradable</span>}
                                {eco.is_recyclable && <span className="flag-pill rec">♻️ Recyclable</span>}
                                {eco.dual_end_of_life && <span className="flag-pill dual">✨ Dual EOL</span>}
                            </div>
                            {eco.reason && (
                                <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px" }}>
                                    "{eco.reason}"
                                </div>
                            )}
                        </div>

                        {/* Conventional material card */}
                        <div style={{
                            background: "rgba(255,77,109,0.05)", border: "1px solid rgba(255,77,109,0.18)",
                            borderRadius: "14px", padding: "16px 18px",
                        }}>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#ff4d6d", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>
                                <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: "6px" }}></i>Conventional Alternative
                            </div>
                            <div style={{ fontSize: "16px", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" }}>{conv.icon} {conv.name}</div>
                            <div style={{ fontSize: "12px", color: "#475569", marginBottom: "10px" }}>{conv.type} · {conv.uses}</div>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "99px", background: "rgba(255,77,109,0.1)", color: "#ff4d6d", border: "1px solid rgba(255,77,109,0.2)" }}>
                                    ❌ {conv.is_biodegradable ? "Biodegradable" : "Not Biodegradable"}
                                </span>
                                <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "99px", background: conv.is_recyclable ? "rgba(76,201,240,0.1)" : "rgba(255,77,109,0.08)", color: conv.is_recyclable ? "#4cc9f0" : "#ff4d6d", border: `1px solid ${conv.is_recyclable ? "rgba(76,201,240,0.2)" : "rgba(255,77,109,0.15)"}` }}>
                                    {conv.is_recyclable ? "♻️ Recyclable" : "❌ Not Recyclable"}
                                </span>
                            </div>
                        </div>

                        {/* Environmental impact callout */}
                        <div style={{
                            background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.15)",
                            borderRadius: "14px", padding: "16px 18px",
                        }}>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>
                                <i className="bi bi-globe2" style={{ marginRight: "6px" }}></i>Why It Matters
                            </div>
                            <div style={{ fontSize: "12.5px", color: "#64748b", lineHeight: 1.7 }}>
                                <strong style={{ color: "#94a3b8" }}>{conv.name}</strong> contributes to plastic pollution and has{" "}
                                <span style={{ color: "#ff4d6d" }}>low end-of-life recovery</span>. Switching to{" "}
                                <strong style={{ color: "#00ffd5" }}>{eco.material_name}</strong> can reduce CO₂ footprint by up to{" "}
                                <span style={{ color: "#00ffd5", fontWeight: 700 }}>
                                    {Math.max(0, Math.round(ecoVal("co2Score") - convVal("co2Score")))} points
                                </span>{" "}
                                and improves biodegradability by{" "}
                                <span style={{ color: "#4ade80", fontWeight: 700 }}>
                                    {Math.max(0, Math.round(ecoVal("biodegradability") - convVal("biodegradability")))}%
                                </span>.
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
        {
            key: "strength", label: "Strength", hint: "e.g. 3.5", min: 1, max: 5, step: 0.1, unit: "1-5",
            icon: "bi-shield-fill",
            description: "Structural durability and protective capability of the packaging.",
            tooltip: "Rate how tough the packaging needs to be. 1 = very lightweight (e.g. tissue wrap), 5 = heavy-duty industrial casing.",
            examples: [
                // { val: "1–2", label: "Soft goods, tissue, lightweight pouches" },
                // { val: "3", label: "Standard cardboard boxes, food containers" },
                // { val: "4–5", label: "Electronics, industrial parts, fragile items" },
            ],
            color: "#f97316",
        },
        {
            key: "weight_capacity", label: "Weight Capacity", hint: "e.g. 2.5", min: 1, max: 5, step: 0.1, unit: "1-5",
            icon: "bi-box-seam-fill",
            description: "Maximum load the packaging must support without deforming.",
            tooltip: "1 = super light products (< 100 g), 5 = very heavy products (5 kg+). Match this to the weight of one unit.",
            examples: [
                // { val: "1", label: "Jewellery, cosmetics, < 100 g" },
                // { val: "2–3", label: "Food, clothing, 100 g – 2 kg" },
                // { val: "4–5", label: "Electronics, industrial parts, 2 kg+" },
            ],
            color: "#fb7185",
        },
        {
            key: "biodegradability", label: "Biodegradability", hint: "e.g. 75", min: 0, max: 100, step: 1, unit: "0–100 %",
            icon: "bi-tree-fill",
            description: "How completely the material breaks down naturally after disposal.",
            tooltip: "0 = does not biodegrade (e.g. conventional plastic), 100 = fully compostable within weeks (e.g. PLA, cellulose).",
            examples: [
                // { val: "0–20", label: "PET, PVC, polystyrene" },
                // { val: "40–70", label: "Paper, cardboard (treated)" },
                // { val: "80–100", label: "PLA bioplastic, mushroom packaging" },
            ],
            color: "#00ffd5",
        },
        {
            key: "recyclability", label: "Recyclability", hint: "e.g. 85", min: 0, max: 100, step: 1, unit: "0–100 %",
            icon: "bi-recycle",
            description: "Percentage of the material that can be recovered and recycled.",
            tooltip: "Estimate how much of the packaging is accepted in standard recycling streams. Mixed-material laminates score lower.",
            examples: [
                // { val: "0–30", label: "Multi-layer laminates, coated paper" },
                // { val: "50–70", label: "Mixed plastics (PP, HDPE)" },
                // { val: "80–100", label: "Aluminium, glass, mono-material paper" },
            ],
            color: "#4cc9f0",
        },
        {
            key: "co2_emission", label: "CO₂ Eco-Score", hint: "e.g. 60", min: 0, max: 100, step: 1, unit: "0–100",
            icon: "bi-cloud-haze2-fill",
            description: "Inverse carbon footprint score — higher means lower emissions during production.",
            tooltip: "Higher is greener: 100 = near-zero carbon footprint. 0 = very high CO₂ emissions. Consider the full production lifecycle.",
            examples: [
                // { val: "0–30", label: "Virgin plastic, aluminium smelting" },
                // { val: "40–65", label: "Recycled plastics, standard paperboard" },
                // { val: "70–100", label: "Recycled cardboard, bio-based materials" },
            ],
            color: "#ffd166",
        },
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

                            {/* ── Intro callout ── */}
                            <div style={{
                                display: "flex", alignItems: "flex-start", gap: "12px",
                                background: "rgba(0,255,213,0.06)", border: "1px solid rgba(0,255,213,0.18)",
                                borderRadius: "12px", padding: "14px 18px", marginBottom: "24px"
                            }}>
                                <i className="bi bi-info-circle-fill" style={{ color: "#00ffd5", fontSize: "18px", marginTop: "2px", flexShrink: 0 }}></i>
                                <div style={{ fontSize: "13.5px", color: "#94a3b8", lineHeight: "1.6" }}>
                                    <strong style={{ color: "#e2e8f0" }}>Enter your packaging requirements below.</strong>
                                    {" "}Each field has a tooltip (<i className="bi bi-question-circle" style={{ color: "#64748b" }}></i>) and real-world examples to guide you.
                                    All five fields are required before running the AI analysis.
                                </div>
                            </div>

                            {/* ── Two-column layout: fields left, score + button right ── */}
                            <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>

                                {/* Left: input fields + progress */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="input-grid">
                                        {MANUAL_FIELDS.map((fieldDef) => (
                                            <ManualFieldCard
                                                key={fieldDef.key}
                                                fieldDef={fieldDef}
                                                value={data[fieldDef.key]}
                                                onChange={(key, val) => setData(prev => ({ ...prev, [key]: val }))}
                                            />
                                        ))}
                                    </div>

                                    {/* Completion progress */}
                                    {(() => {
                                        const filledCount = MANUAL_FIELDS.filter(f => data[f.key] !== "" && !isNaN(parseFloat(data[f.key]))).length;
                                        return (
                                            <div style={{
                                                display: "flex", alignItems: "center", gap: "14px",
                                                background: "rgba(255,255,255,0.03)", borderRadius: "12px",
                                                padding: "14p1 18px", marginTop: "16px"
                                            }}>
                                                <div style={{ flex: 12 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                                                        <span><strong style={{ color: manualValid ? "#00ffd5" : "#e2e8f0" }}>{filledCount}</strong> of 5 fields filled</span>
                                                        {manualValid && <span style={{ color: "#00ffd5", fontWeight: 600 }}><i className="bi bi-check-circle-fill"></i> Ready to analyse</span>}
                                                    </div>
                                                    <div style={{ height: "6px", borderRadius: "10px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                                                        <div style={{
                                                            height: "100%", width: `${(filledCount / 5) * 100}%`, borderRadius: "10px",
                                                            background: manualValid ? "#00ffd5" : "#4cc9f0",
                                                            transition: "width 0.3s ease",
                                                            boxShadow: manualValid ? "0 0 10px #00ffd588" : "none"
                                                        }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Right: sticky score preview + action button */}
                                <div style={{
                                    width: "200px", flexShrink: 1,
                                    position: "sticky", top: "80px",
                                    display: "flex", flexDirection: "column", gap: "12px"
                                }}>
                                    {/* ── POST /predict-score → Live Score Predictor ── */}
                                    <ScorePredictor params={data} />

                                    {/* Placeholder when score not yet shown */}
                                    {!(data.strength && data.weight_capacity && data.biodegradability && data.recyclability && data.co2_emission) && (
                                        <div style={{
                                            background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)",
                                            borderRadius: "14px", padding: "24px 16px",
                                            textAlign: "center", color: "#475569", fontSize: "13px"
                                        }}>
                                            <i className="bi bi-stars" style={{ fontSize: "28px", display: "block", marginBottom: "10px", color: "#334155" }}></i>
                                            Fill all 5 fields to see your live sustainability score preview here.
                                        </div>
                                    )}

                                    {/* Error */}
                                    {error && (
                                        <div className="api-error" style={{ margin: 0 }}>
                                            <i className="bi bi-exclamation-triangle-fill"></i> {error}
                                        </div>
                                    )}

                                    {/* Run button — always visible in this column */}
                                    <button
                                        className="btn-primary-eco"
                                        style={{ width: "100%", justifyContent: "center" }}
                                        onClick={handleManualPredict}
                                        disabled={loading || !manualValid}
                                    >
                                        <i className={`bi ${loading ? "bi-arrow-repeat spin" : "bi-lightning-charge-fill"}`}></i>
                                        {loading ? "Analyzing…" : "Run AI Analysis"}
                                    </button>

                                    {!manualValid && (
                                        <div style={{ fontSize: "11.5px", color: "#475569", textAlign: "center" }}>
                                            <i className="bi bi-lock" style={{ marginRight: "4px" }}></i>
                                            Complete all fields to unlock analysis
                                        </div>
                                    )}
                                </div>
                            </div>
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

            {/* ════ TAB: COMPARE ══════════════════════════════════════════════ */}
            {activePage === "compare" && (
                <ComparePage materials={materials} showResults={showResults} onNavigate={setActivePage} />
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
