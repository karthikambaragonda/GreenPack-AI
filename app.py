from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import os

# ─────────────────────────────────────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ─────────────────────────────────────────────────────────────────────────────
# Load models  (once at startup)
# ─────────────────────────────────────────────────────────────────────────────
cost_model      = joblib.load(os.path.join(BASE_DIR, "models", "cost_model.pkl"))
co2_model       = joblib.load(os.path.join(BASE_DIR, "models", "co2_model.pkl"))
cost_classifier = joblib.load(os.path.join(BASE_DIR, "models", "cost_classifier.pkl"))

# ─────────────────────────────────────────────────────────────────────────────
# Load dataset  (loaded once, never mutated at module level)
# ─────────────────────────────────────────────────────────────────────────────
df = pd.read_csv(os.path.join(BASE_DIR, "data", "balanced_dataset.csv"))


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def parse_inputs(payload: dict):
    """
    React sends values on a 1–10 scale.
    Models and scoring expect 0–1.
    Returns (strength, weight_capacity, recyclability, biodegradability).
    """
    return (
        round(float(payload["strength"])         / 10, 3),
        round(float(payload["weight_capacity"])  / 10, 3),
        round(float(payload["recyclability"])    / 10, 3),
        round(float(payload["biodegradability"]) / 10, 3),
    )


def get_category(name: str) -> str:
    n = name.lower()
    if any(k in n for k in ("cardboard", "paper", "pulp", "kraft")):
        return "paper"
    if any(k in n for k in ("plastic", "pla", "poly", "pet", "hdpe")):
        return "plastic"
    if any(k in n for k in ("fiber", "fibre", "bamboo", "hemp", "jute", "coir")):
        return "fiber"
    if any(k in n for k in ("metal", "alumin", "steel", "tin")):
        return "metal"
    if "glass" in n:
        return "glass"
    return "other"


def min_max_norm(series: pd.Series) -> pd.Series:
    lo, hi = series.min(), series.max()
    return (series - lo) / (hi - lo + 1e-9)


def eco_tag(co2_val: float) -> str:
    if co2_val < 0.01:
        return "Ultra Eco"
    if co2_val < 0.05:
        return "Eco Friendly"
    return "Standard"


def build_reason(row, strength: float, filtered_df: pd.DataFrame) -> str:
    tags = []
    if row["strength_final"]         >= strength:                               tags.append("Strong")
    if row["recyclability_final"]    >  0.7:                                    tags.append("Highly recyclable")
    if row["biodegradability_score"] >  0.7:                                    tags.append("Eco-friendly")
    if row["predicted_cost"]         <  filtered_df["predicted_cost"].mean():   tags.append("Cost efficient")
    return ", ".join(tags) if tags else "Balanced"


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/")
def home():
    return "EcoPackAI Backend Running 🚀"


# ── /predict ──────────────────────────────────────────────────────────────────
# Single-point prediction for a given set of parameters.
@app.route("/predict", methods=["POST"])
def predict():
    try:
        payload = request.get_json()
        strength, weight_capacity, recyclability, biodegradability = parse_inputs(payload)

        features = np.array([[strength, weight_capacity, recyclability, biodegradability]])

        cost     = float(cost_model.predict(features)[0])
        co2      = float(co2_model.predict(features)[0])
        category = str(cost_classifier.predict(features)[0])

        return jsonify({
            "predicted_cost":  round((cost + 1) * 50, 2),
            "co2_footprint":   round(max(0.0, co2), 4),
            "cost_category":   category,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ── /recommend ────────────────────────────────────────────────────────────────
# Main endpoint consumed by the React app + geminiReranker.
#
# React payload:
#   {
#     "strength": 7,           ← 1–10 scale
#     "weight_capacity": 5,
#     "recyclability": 8,
#     "biodegradability": 9,
#     "top_n": 10              ← optional; how many candidates for Gemini
#   }
#
# Response shape (fields consumed by geminiReranker.js + ResultsPanel):
#   {
#     "recommendations": [
#       {
#         "rank", "material_name", "category", "eco_tag", "final_score",
#         "predicted_cost", "predicted_co2", "co2_savings_percent",
#         "reason", "explanation"
#       }, ...
#     ]
#   }
@app.route("/recommend", methods=["POST"])
def recommend():
    try:
        payload = request.get_json()
        strength, weight_capacity, recyclability, biodegradability = parse_inputs(payload)

        # top_n: React asks for 10 so geminiReranker has enough to choose from.
        # Clamped 5–20 for safety.
        top_n = max(5, min(int(payload.get("top_n", 80)), 100))

        # ── 1. Clean copy — never mutate the global df ────────────────────────
        work = df.copy()
        work["material_name"] = work["material_name"].str.lower().str.strip()
        work["category"]      = work["material_name"].apply(get_category)

        # ── 2. Filter to materials that can handle the load ───────────────────
        mask = (
            (work["strength_final"]        >= strength        * 0.8) &
            (work["weight_capacity_final"] >= weight_capacity * 0.8)
        )
        filtered = work[mask].copy()   # explicit .copy() prevents SettingWithCopyWarning
        if filtered.empty:
            filtered = work.copy()     # fallback: use all materials

        # ── 3. ML predictions ─────────────────────────────────────────────────
        X = filtered[["strength_final", "weight_capacity_final",
                       "recyclability_final", "biodegradability_score"]]

        filtered["predicted_cost"] = cost_model.predict(X)
        filtered["predicted_co2"]  = np.clip(co2_model.predict(X), 0, None)

        # ── 4. Normalise to 0–1 before scoring ───────────────────────────────
        #      Raw model output can be any scale; (1 - value) only makes sense
        #      when value is bounded to 0–1.
        filtered["cost_norm"] = min_max_norm(filtered["predicted_cost"])
        filtered["co2_norm"]  = min_max_norm(filtered["predicted_co2"])
        filtered["sus_norm"]  = min_max_norm(filtered["sustainability_score"])

        # ── 5. Match score — how close each material is to user requirements ──
        filtered["match_score"] = (
            (1 - abs(filtered["strength_final"]         - strength))        +
            (1 - abs(filtered["weight_capacity_final"]  - weight_capacity)) +
            (1 - abs(filtered["recyclability_final"]    - recyclability))   +
            (1 - abs(filtered["biodegradability_score"] - biodegradability))
        ) / 4

        # ── 6. Eco boost — weighted by user's own eco priorities ──────────────
        eco_denom = recyclability + biodegradability + 1e-9
        filtered["eco_boost"] = (
            recyclability    * filtered["recyclability_final"] +
            biodegradability * filtered["biodegradability_score"]
        ) / eco_denom

        # ── 7. Dynamic weights — shift emphasis based on user priorities ──────
        avg_eco = (biodegradability + recyclability) / 2
        w_eco   = round(0.30 + 0.15 * avg_eco, 3)
        w_cost  = round(max(0.03, 0.10 - 0.05 * avg_eco), 3)
        w_match = 0.20
        w_boost = round(0.10 + 0.10 * avg_eco, 3)
        w_sus   = round(max(0.04, 1.0 - w_eco - w_cost - w_match - w_boost), 3)

        filtered["final_score"] = (
            w_eco   * (1 - filtered["co2_norm"])  +
            w_cost  * (1 - filtered["cost_norm"]) +
            w_sus   * filtered["sus_norm"]         +
            w_match * filtered["match_score"]      +
            w_boost * filtered["eco_boost"]
        )

        # Small bonus for genuinely ultra-low CO2 materials
        filtered.loc[filtered["predicted_co2"] < 0.01, "final_score"] += 0.05

        # ── 8. Pure score-based selection — no forced category diversity ─────
        # Forcing one-per-category was silently injecting low-scoring materials
        # into the candidate pool. If three fiber materials score highest for
        # this user, that IS the correct answer — the ML scored them that way.
        # Gemini reranker in React handles real-world diversity on top.
        candidates = (
            filtered
            .sort_values("final_score", ascending=False)
            .drop_duplicates(subset="material_name")
            .head(top_n)
        )
        max_co2    = filtered["predicted_co2"].max()

        # ── 9. Build response ─────────────────────────────────────────────────
        results = []
        for rank, (_, row) in enumerate(candidates.iterrows(), start=1):
            co2_saving = max(0.0, min(100.0,
                ((max_co2 - row["predicted_co2"]) / (max_co2 + 1e-9)) * 100
            ))

            results.append({
                 "rank":                rank,
                "material_name":       row["material_name"].title(),
                "category":            row["category"],
                "eco_tag":             eco_tag(row["predicted_co2"]),
                "final_score":         round(float(row["final_score"]),                    4),
                # "predicted_cost":      round(float((row["predicted_cost"] + 1) * 50),     2),
                "predicted_co2":       round(float(row["predicted_co2"]),                 4),
                "co2_savings_percent": round(float(co2_saving),                           2),
                "recyclability":       round(float(row["recyclability_final"])    * 100,  1),
                "biodegradability":    round(float(row["biodegradability_score"]) * 100,  1),
                "reason":              build_reason(row, strength, filtered),
                "explanation":         f"Rank {rank}: ML scored — ready for Gemini reranking",
            })

        return jsonify({"recommendations": results})

    except KeyError as e:
        return jsonify({"error": f"Missing field in request: {e}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Run
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=5000)