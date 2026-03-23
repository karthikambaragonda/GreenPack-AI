// src/services/geminiReranker.js
// .env:  VITE_GEMINI_API_KEY=AIza...

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? "";
const GEMINI_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`;

// ── Prompt ────────────────────────────────────────────────────────────────────
function buildPrompt(userInputs, candidates, wizardContext = {}) {
    const nameList = candidates
        .slice(0, 40)
        .map((c, i) => `${i + 1}. "${c.material_name}"`)
        .join("\n");

    // Build plain-English product description from wizard answers
    const ctxLines = [
        wizardContext.product && `Product type:    ${wizardContext.product}`,
        wizardContext.fragility && `Fragility:       ${wizardContext.fragility}`,
        wizardContext.weight && `Weight per unit: ${wizardContext.weight}`,
        wizardContext.eco_priority && `Eco priority:    ${wizardContext.eco_priority}`,
        wizardContext.compost && `End-of-life:     ${wizardContext.compost}`,
    ].filter(Boolean).join("\n");

    const contextSection = ctxLines
        ? `PRODUCT CONTEXT (from user wizard)\n${ctxLines}\n\n`
        : "";

    return `You are a real-world sustainable packaging expert.\n\n${contextSection}NUMERIC REQUIREMENTS (0.0-1.0, higher = more critical):\nstrength=${userInputs.strength} weight_capacity=${userInputs.weight_capacity} biodegradability=${userInputs.biodegradability} recyclability=${userInputs.recyclability}\n\n
    CANDIDATE POOL - choose ONLY from this list, copy names EXACTLY:\n${nameList}\n\n
    RANKING RULES (use real-world knowledge, NOT ML scores):\n
    1. Use the product context above to understand the actual use case\n
    2. Prefer low CO2 lifecycle footprint and commercial-scale cost-effectiveness\n
    3. If biodegradability > 0.7 or end-of-life says compostable: heavily favour natural/compostable materials\n
    4. If recyclability > 0.7: favour materials in mainstream global recycling streams\n
    5. If strength > 0.7 or product is fragile: only pick structurally capable materials\n
    6. All 5 picks must be DIFFERENT materials with unique names from the list\n\n
    OUTPUT: raw JSON array only, no markdown, no explanation, start with [ end with ].\n
    ━━━ STEP 2 — USER REQUIREMENTS ━━━
The user needs packaging optimised for these priorities (scale 0.0 to 1.0, higher = more critical):

  Strength needed:      ${userInputs.strength} ← 1 is less strenght material needed to pack as material is strong and 10 is high strenght packaging material needed for fragile parts mainly 
  Weight to carry:      ${userInputs.weight_capacity}← 1 is low weight capacity material/products and 10 is higher
  Biodegradability:     ${userInputs.biodegradability}   ← how urgently must it break down naturally 1 is slow and 10 is highly degradable
  Recyclability:        ${userInputs.recyclability}   ← how urgently must it be easily recyclable

    [{"material_name":"<exact name>"},{"material_name":"<exact name>"},
    {"material_name":"<exact name>"},
    {"material_name":"<exact name>"},
    {"material_name":"<exact name>"}]`;
}


// ── Strategy 1: outermost [ ... ] ─────────────────────────────────────────────
function tryExtractArray(text) {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) return null;
    let slice = text.slice(start, end + 1);
    slice = slice.replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(slice);
}

// ── Strategy 2: collect every { ... } object individually ────────────────────
function tryCollectObjects(text) {
    const objects = [];
    let depth = 0, start = -1;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === "{") { if (depth === 0) start = i; depth++; }
        else if (text[i] === "}") {
            depth--;
            if (depth === 0 && start !== -1) {
                try {
                    let chunk = text.slice(start, i + 1).replace(/,\s*([}\]])/g, "$1");
                    objects.push(JSON.parse(chunk));
                } catch { /* skip malformed */ }
                start = -1;
            }
        }
    }
    return objects.length ? objects : null;
}

function extractJSON(raw) {
    if (!raw) throw new Error("Empty response");
    let text = raw.trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();

    console.log("[GeminiReranker] Raw response:\n", text);

    try {
        const r = tryExtractArray(text);
        if (Array.isArray(r) && r.length) return r;
    } catch (e) { console.debug("Strategy 1 failed:", e.message); }

    try {
        const r = tryCollectObjects(text);
        if (Array.isArray(r) && r.length) return r;
    } catch (e) { console.debug("Strategy 2 failed:", e.message); }

    throw new Error(`No JSON found. Response: "${text.slice(0, 200)}"`);
}

// ── Merge — no duplicates, always returns 5 ──────────────────────────────────
function mergePicks(picks, candidates) {
    const usedIndices = new Set();
    const exactIndex = Object.fromEntries(
        candidates.map((c, idx) => [c.material_name.toLowerCase().trim(), idx])
    );
    const results = [];

    for (const pick of picks.slice(0, 5)) {
        const pickName = (pick.material_name ?? "").toLowerCase().trim();

        let mlIdx = exactIndex[pickName] ?? -1;

        // Fuzzy fallback — only against unused candidates
        if (mlIdx === -1 || usedIndices.has(mlIdx)) {
            mlIdx = candidates.findIndex((c, idx) => {
                if (usedIndices.has(idx)) return false;
                const cName = c.material_name.toLowerCase();
                return cName.includes(pickName) || pickName.includes(cName);
            });
        }

        if (mlIdx === -1 || usedIndices.has(mlIdx)) {
            console.warn(`[GeminiReranker] No match for "${pick.material_name}"`);
            continue;
        }

        usedIndices.add(mlIdx);
        const ml = candidates[mlIdx];

        results.push({
            ...ml,
            rank: results.length + 1,
            reason: pick.reason ?? ml.reason,
            eco_tag: pick.eco_tag ?? ml.eco_tag,
            explanation: `Rank ${results.length + 1}: Validated by Gemini AI`,
        });
    }

    // Gap-fill so we always return exactly 5
    if (results.length < 5) {
        console.warn(`[GeminiReranker] ${results.length} matched — padding with ML candidates`);
        for (const [idx, c] of candidates.entries()) {
            if (usedIndices.has(idx)) continue;
            usedIndices.add(idx);
            results.push({
                ...c,
                rank: results.length + 1,
                explanation: `Rank ${results.length + 1}: ML model selection`,
            });
            if (results.length === 5) break;
        }
    }

    return results.slice(0, 5).map((r, i) => ({ ...r, rank: i + 1 }));
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function rerankWithGemini(userInputs, candidates, wizardContext = {}) {
    if (!GEMINI_KEY || GEMINI_KEY.startsWith("YOUR")) {
        console.warn("[GeminiReranker] No API key — skipping.");
        return null;
    }
    if (!candidates?.length) return null;

    try {
        const res = await fetch(GEMINI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: buildPrompt(userInputs, candidates, wizardContext) }] }],
                generationConfig: {
                    temperature: 0.0,
                    maxOutputTokens: 1024,
                },
            }),
            signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) {
            console.warn(`[GeminiReranker] HTTP ${res.status}:`, (await res.text()).slice(0, 200));
            return null;
        }

        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        if (!rawText) {
            console.warn("[GeminiReranker] Empty text. finishReason:",
                data?.candidates?.[0]?.finishReason);
            return null;
        }

        const picks = extractJSON(rawText);
        const merged = mergePicks(picks, candidates);

        console.info(`[GeminiReranker] ✓ Final count: ${merged.length}`);
        return merged.length ? merged : null;

    } catch (err) {
        console.warn("[GeminiReranker] Failed — ML fallback.", err.message);
        return null;
    }
}