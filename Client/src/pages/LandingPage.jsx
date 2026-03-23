import { useState, useEffect, useRef } from "react";

// ── Particle System ──────────────────────────────────────────────────────────
function Particles() {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let animId;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener("resize", resize);

        const particles = Array.from({ length: 60 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2 + 0.5,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            opacity: Math.random() * 0.5 + 0.1,
        }));

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(134,239,172,${p.opacity})`;
                ctx.fill();
            });
            // Lines between nearby particles
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 120) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(134,239,172,${0.08 * (1 - d / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
    }, []);
    return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

// ── Animated Counter ─────────────────────────────────────────────────────────
function Counter({ target, suffix = "", duration = 2000 }) {
    const [val, setVal] = useState(0);
    const ref = useRef(null);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) {
                let start = null;
                const step = ts => {
                    if (!start) start = ts;
                    const p = Math.min((ts - start) / duration, 1);
                    setVal(Math.floor(p * target));
                    if (p < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
                obs.disconnect();
            }
        }, { threshold: 0.5 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [target, duration]);
    return <span ref={ref}>{val}{suffix}</span>;
}

// ── Typing Effect ─────────────────────────────────────────────────────────────
function Typewriter({ words, speed = 80, pause = 1800 }) {
    const [idx, setIdx] = useState(0);
    const [text, setText] = useState("");
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const current = words[idx];
        const timeout = setTimeout(() => {
            if (!deleting) {
                setText(current.slice(0, text.length + 1));
                if (text.length + 1 === current.length) setTimeout(() => setDeleting(true), pause);
            } else {
                setText(current.slice(0, text.length - 1));
                if (text.length === 0) { setDeleting(false); setIdx((idx + 1) % words.length); }
            }
        }, deleting ? speed / 2 : speed);
        return () => clearTimeout(timeout);
    }, [text, deleting, idx, words, speed, pause]);

    return (
        <span>
            {text}
            <span style={{ animation: "blink 1s step-end infinite", borderRight: "2px solid #4ade80" }}>&nbsp;</span>
        </span>
    );
}

// ── Scroll Reveal Wrapper ─────────────────────────────────────────────────────
function Reveal({ children, delay = 0 }) {
    const ref = useRef(null);
    const [vis, setVis] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.1 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, []);
    return (
        <div ref={ref} style={{
            opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(40px)",
            transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`
        }}>
            {children}
        </div>
    );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function LandingPage({ onEnter }) {
    const [scrolled, setScrolled] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", fn);
        return () => window.removeEventListener("scroll", fn);
    }, []);

    const howSteps = [
        { icon: "📥", title: "Input Product Parameters", desc: "Enter your product's strength, weight capacity, recyclability needs and biodegradability requirements on a simple 1–10 scale." },
        { icon: "🤖", title: "AI/ML Analysis", desc: "Random Forest & XGBoost models predict cost and CO₂ footprint across hundreds of eco-materials filtered to match your exact requirements." },
        { icon: "🌿", title: "Smart Recommendation", desc: "A dynamic scoring engine with eco-boost weighting ranks top materials." },
        { icon: "📊", title: "BI Dashboard Insights", desc: "Explore sustainability analytics: CO₂ savings percentages, cost efficiency charts, material trend analysis and exportable reports." },
    ];

    const features = [
        { icon: "🧠", label: "Random Forest", desc: "Predicts packaging cost with high accuracy across diverse product profiles" },
        { icon: "⚡", label: "XGBoost Regressor", desc: "Estimates CO₂ footprint with gradient-boosted precision" },
        { icon: "🌍", label: "Eco Scoring", desc: "Dynamic weights shift based on your environmental priorities" },
        // { icon: "✨", label: "Gemini Reranking", desc: "Generative AI adds real-world context & reasoning to ML results" },
        { icon: "📈", label: "BI Analytics", desc: "Live dashboard with material usage trends and sustainability KPIs" },
        // { icon: "🗄️", label: "PostgreSQL Backend", desc: "Robust material database with validated eco-material schemas" },
    ];

    const useCases = [
        { icon: "📦", title: "E-Commerce", desc: "Reduce shipping material waste with AI-optimized eco packaging per product category." },
        { icon: "🏭", title: "Manufacturing", desc: "Switch from industrial plastics to biodegradable alternatives without sacrificing durability." },
        { icon: "🍱", title: "Food & FMCG", desc: "Ensure food-grade compliance while minimizing carbon footprint across supply chains." },
        { icon: "💄", title: "Cosmetics", desc: "Align with green beauty standards using recyclable, low-CO₂ luxury packaging options." },
        { icon: "💻", title: "Electronics", desc: "Protect fragile devices with high-strength sustainable materials rated by AI models." },
        { icon: "🏥", title: "Pharma", desc: "Meet sterility and safety standards while improving sustainability compliance scores." },
    ];

    const techStack = [
        { label: "React + Vite", color: "#61dafb" },
        { label: "Flask REST API", color: "#4ade80" },
        { label: "Random Forest", color: "#f59e0b" },
        { label: "XGBoost", color: "#f87171" },
        // { label: "PostgreSQL", color: "#818cf8" },
        // { label: "Gemini AI", color: "#34d399" },
        { label: "Recharts / Plotly", color: "#fb923c" },
        { label: "Python / Pandas", color: "#fbbf24" },
    ];

    return (
        <div style={{
            fontFamily: "'Syne', 'Space Grotesk', system-ui, sans-serif",
            background: "#030d07",
            color: "#e2ffe8",
            minHeight: "100vh",
            overflowX: "hidden",
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes blink { 50% { opacity: 0 } }
        @keyframes float { 0%,100% { transform: translateY(0px) } 50% { transform: translateY(-12px) } }
        @keyframes spin-slow { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 20px rgba(74,222,128,0.3) } 50% { box-shadow: 0 0 50px rgba(74,222,128,0.7), 0 0 80px rgba(74,222,128,0.2) } }
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #030d07; }
        ::-webkit-scrollbar-thumb { background: #4ade80; border-radius: 2px; }
        .nav-link { color: #86efac; text-decoration: none; font-size: 0.85rem; letter-spacing: 0.05em; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #4ade80; }
        .btn-primary {
          background: linear-gradient(135deg, #4ade80, #22c55e);
          color: #030d07; border: none; padding: 14px 36px;
          border-radius: 50px; font-family: inherit; font-weight: 700;
          font-size: 1rem; cursor: pointer; letter-spacing: 0.03em;
          transition: all 0.3s; animation: pulse-glow 2.5s infinite;
          position: relative; overflow: hidden;
        }
        .btn-primary::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        .btn-primary:hover { transform: scale(1.05); filter: brightness(1.1); }
        .btn-outline {
          background: transparent; color: #4ade80;
          border: 1px solid rgba(74,222,128,0.4); padding: 13px 32px;
          border-radius: 50px; font-family: inherit; font-weight: 600;
          font-size: 0.9rem; cursor: pointer; transition: all 0.3s; letter-spacing: 0.03em;
        }
        .btn-outline:hover { background: rgba(74,222,128,0.08); border-color: #4ade80; }
        .card-hover { transition: transform 0.3s, box-shadow 0.3s; }
        .card-hover:hover { transform: translateY(-6px); box-shadow: 0 20px 60px rgba(74,222,128,0.12); }
        .tab-btn { background: none; border: none; font-family: inherit; cursor: pointer; padding: 10px 20px; border-radius: 30px; font-size: 0.85rem; font-weight: 600; letter-spacing: 0.04em; transition: all 0.3s; }
      `}</style>

            <Particles />

            {/* ── NAV ── */}
            <nav style={{
                position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
                padding: "16px 48px",
                background: scrolled ? "rgba(3,13,7,0.92)" : "transparent",
                backdropFilter: scrolled ? "blur(20px)" : "none",
                borderBottom: scrolled ? "1px solid rgba(74,222,128,0.1)" : "none",
                transition: "all 0.4s",
                display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: "linear-gradient(135deg, #4ade80, #16a34a)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, animation: "spin-slow 8s linear infinite",
                    }}>♻</div>
                    <span style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
                        Eco<span style={{ color: "#4ade80" }}>Pack</span>AI
                    </span>
                </div>
                <div style={{ display: "flex", gap: 32 }}>
                    {["How It Works", "Features", "Use Cases", "Tech Stack"].map(l => (
                        <a key={l} href={`#${l.replace(/\s+/g, "").toLowerCase()}`} className="nav-link">{l}</a>
                    ))}
                </div>
                <button className="btn-primary" style={{ padding: "10px 24px", fontSize: "0.85rem", animation: "none" }} onClick={onEnter}>
                    Open Dashboard →
                </button>
            </nav>

            {/* ── HERO ── */}
            <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px", textAlign: "center", position: "relative", zIndex: 1 }}>
                {/* Glow blob */}
                <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />

                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 30, padding: "6px 18px", marginBottom: 32, fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.1em", color: "#4ade80", textTransform: "uppercase" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block", animation: "pulse-glow 1.5s infinite" }} />
                    AI-Powered Sustainable Packaging
                </div>

                <h1 style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 16, maxWidth: 900 }}>
                    Package Smarter.<br />
                    <span style={{ background: "linear-gradient(135deg, #4ade80 0%, #86efac 50%, #22d3ee 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Pollute Less.
                    </span>
                </h1>

                <p style={{ fontSize: "1.25rem", color: "#86efac", marginBottom: 12, fontWeight: 300, letterSpacing: "0.01em" }}>
                    Recommend <Typewriter words={["bamboo fiber", "recycled cardboard", "bioplastics", "mycelium foam", "hemp kraft paper"]} />
                </p>

                <p style={{ maxWidth: 560, color: "#6ee7a0", opacity: 0.75, lineHeight: 1.7, marginBottom: 48, fontFamily: "'DM Sans', sans-serif", fontSize: "1.05rem" }}>
                    EcoPackAI uses Random Forest & XGBoost ML models to analyse hundreds of sustainable materials and surface the perfect packaging for your product — ranked by cost, carbon footprint, and match score.
                </p>

                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
                    <button className="btn-primary" style={{ fontSize: "1.05rem", padding: "16px 44px" }} onClick={onEnter}>
                        🚀 Launch Dashboard
                    </button>
                    <button className="btn-outline" onClick={() => document.getElementById("howitworks").scrollIntoView({ behavior: "smooth" })}>
                        See How It Works ↓
                    </button>
                </div>

                {/* Hero stats */}
                <div style={{ display: "flex", gap: 48, marginTop: 80, flexWrap: "wrap", justifyContent: "center" }}>
                    {[
                        { num: 95, suf: "%", label: "Model Accuracy" },
                        { num: 80, suf: "+", label: "Eco Materials" },
                        { num: 40, suf: "%", label: "CO₂ Reduction Avg" },
                    ].map(s => (
                        <div key={s.label} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "2.8rem", fontWeight: 800, color: "#4ade80", letterSpacing: "-0.04em" }}>
                                <Counter target={s.num} suffix={s.suf} />
                            </div>
                            <div style={{ color: "#86efac", opacity: 0.65, fontSize: "0.85rem", marginTop: 4, letterSpacing: "0.04em" }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Scroll cue */}
                <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", animation: "float 2s ease-in-out infinite", color: "#4ade80", opacity: 0.5, fontSize: "1.5rem" }}>↓</div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="howitworks" style={{ padding: "100px 48px", maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
                <Reveal>
                    <p style={{ color: "#4ade80", fontWeight: 700, letterSpacing: "0.15em", fontSize: "0.78rem", textTransform: "uppercase", marginBottom: 12 }}>Process</p>
                    <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16 }}>How It Works</h2>
                    <p style={{ color: "#86efac", opacity: 0.65, maxWidth: 520, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", marginBottom: 64 }}>
                        Four intelligent steps from product parameters to ranked sustainable packaging recommendations.
                    </p>
                </Reveal>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
                    {howSteps.map((s, i) => (
                        <Reveal key={s.title} delay={i * 120}>
                            <div className="card-hover" style={{
                                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(74,222,128,0.12)",
                                borderRadius: 20, padding: "32px 28px", height: "100%",
                            }}>
                                <div style={{ fontSize: "2.2rem", marginBottom: 18 }}>{s.icon}</div>
                                <div style={{ color: "#4ade80", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", marginBottom: 8, textTransform: "uppercase" }}>Step {i + 1}</div>
                                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>{s.title}</h3>
                                <p style={{ color: "#86efac", opacity: 0.65, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem" }}>{s.desc}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section id="features" style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    <Reveal>
                        <p style={{ color: "#4ade80", fontWeight: 700, letterSpacing: "0.15em", fontSize: "0.78rem", textTransform: "uppercase", marginBottom: 12 }}>Capabilities</p>
                        <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 64 }}>AI & ML at Its Core</h2>
                    </Reveal>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
                        {features.map((f, i) => (
                            <Reveal key={f.label} delay={i * 80}>
                                <div className="card-hover" style={{
                                    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(74,222,128,0.1)",
                                    borderRadius: 16, padding: "28px 24px", display: "flex", gap: 18, alignItems: "flex-start",
                                }}>
                                    <div style={{ fontSize: "1.8rem", flexShrink: 0 }}>{f.icon}</div>
                                    <div>
                                        <div style={{ fontWeight: 700, marginBottom: 6, fontSize: "1rem" }}>{f.label}</div>
                                        <div style={{ color: "#86efac", opacity: 0.6, fontSize: "0.875rem", lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>{f.desc}</div>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PIPELINE VISUAL ── */}
            <section style={{ padding: "80px 48px", position: "relative", zIndex: 1 }}>
                <div style={{ maxWidth: 900, margin: "0 auto" }}>
                    <Reveal>
                        <div style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 24, padding: "40px 48px" }}>
                            <p style={{ color: "#4ade80", fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>ML Pipeline</p>
                            <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 32 }}>From Raw Data → Ranked Recommendation</h3>
                            <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap", rowGap: 16 }}>
                                {[
                                    { label: "Product Input", color: "#4ade80" },
                                    { label: "Feature Engineering", color: "#34d399" },
                                    { label: "RF + XGBoost", color: "#22d3ee" },
                                    { label: "Eco Scoring", color: "#818cf8" },
                                    // { label: "Gemini Rerank", color: "#f59e0b" },
                                    { label: "Top 5 Results", color: "#f472b6" },
                                ].map((step, i, arr) => (
                                    <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
                                        <div style={{ background: `${step.color}18`, border: `1px solid ${step.color}40`, borderRadius: 10, padding: "10px 16px", fontSize: "0.82rem", fontWeight: 600, color: step.color, whiteSpace: "nowrap" }}>
                                            {step.label}
                                        </div>
                                        {i < arr.length - 1 && <div style={{ color: "#4ade8050", fontSize: "1.2rem", padding: "0 8px" }}>→</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── USE CASES ── */}
            <section id="usecases" style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    <Reveal>
                        <p style={{ color: "#4ade80", fontWeight: 700, letterSpacing: "0.15em", fontSize: "0.78rem", textTransform: "uppercase", marginBottom: 12 }}>Industries</p>
                        <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 64 }}>Who Is It For?</h2>
                    </Reveal>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                        {useCases.map((u, i) => (
                            <Reveal key={u.title} delay={i * 80}>
                                <div className="card-hover" style={{
                                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(74,222,128,0.1)",
                                    borderRadius: 16, padding: "28px 24px",
                                }}>
                                    <div style={{ fontSize: "2rem", marginBottom: 14 }}>{u.icon}</div>
                                    <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: "1.05rem" }}>{u.title}</h3>
                                    <p style={{ color: "#86efac", opacity: 0.6, fontSize: "0.875rem", lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>{u.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TECH STACK ── */}
            <section id="techstack" style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}>
                <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
                    <Reveal>
                        <p style={{ color: "#4ade80", fontWeight: 700, letterSpacing: "0.15em", fontSize: "0.78rem", textTransform: "uppercase", marginBottom: 12 }}>Built With</p>
                        <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 48 }}>Tech Stack</h2>
                    </Reveal>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
                        {techStack.map((t, i) => (
                            <Reveal key={t.label} delay={i * 60}>
                                <div style={{
                                    background: `${t.color}12`, border: `1px solid ${t.color}35`,
                                    color: t.color, borderRadius: 50, padding: "10px 22px",
                                    fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.03em",
                                    transition: "all 0.3s", cursor: "default",
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.background = `${t.color}25`; e.currentTarget.style.transform = "scale(1.08)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = `${t.color}12`; e.currentTarget.style.transform = "scale(1)"; }}
                                >
                                    {t.label}
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}>
                <Reveal>
                    <div style={{
                        maxWidth: 780, margin: "0 auto", textAlign: "center",
                        background: "linear-gradient(135deg, rgba(74,222,128,0.07), rgba(34,211,238,0.04))",
                        border: "1px solid rgba(74,222,128,0.2)", borderRadius: 32, padding: "80px 48px",
                        position: "relative", overflow: "hidden",
                    }}>
                        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
                        <div style={{ fontSize: "3rem", marginBottom: 20, animation: "float 3s ease-in-out infinite" }}>🌿</div>
                        <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16 }}>
                            Ready to go greener?
                        </h2>
                        <p style={{ color: "#86efac", opacity: 0.7, lineHeight: 1.7, marginBottom: 40, fontFamily: "'DM Sans', sans-serif", fontSize: "1.05rem" }}>
                            Enter the EcoPackAI dashboard and get your first AI-powered sustainable packaging recommendation in under 30 seconds.
                        </p>
                        <button className="btn-primary" style={{ fontSize: "1.1rem", padding: "18px 52px" }} onClick={onEnter}>
                            🚀 Enter Dashboard
                        </button>
                    </div>
                </Reveal>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ borderTop: "1px solid rgba(74,222,128,0.1)", padding: "32px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "1.2rem" }}>♻</span>
                    <span style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>Eco<span style={{ color: "#4ade80" }}>Pack</span>AI</span>
                    <span style={{ color: "#4ade80", fontSize: "0.75rem", opacity: 0.5 }}>v2.0</span>
                </div>
                <div style={{ color: "#86efac", opacity: 0.4, fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif" }}>
                    AI-Powered Sustainable Packaging Recommendation System
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: "6px 14px", fontSize: "0.78rem", color: "#4ade80" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block", animation: "pulse-glow 1.5s infinite" }} />
                    API Connected
                </div>
            </footer>
        </div>
    );
}