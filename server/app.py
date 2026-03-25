"""
EcoPacking Recommendation API
==============================
Flask REST API that serves the trained EcoPacking model.

Endpoints:
    POST /recommend         → top-N material recommendations
    POST /predict-score     → sustainability score for a material profile
    GET  /materials         → full material catalogue
    GET  /materials/<id>    → single material detail
    GET  /health            → health check

Run:
    pip install flask scikit-learn pandas numpy
    python app.py

Environment variables (optional):
    PORT        → default 5000
    DEBUG       → default False
    TOP_N       → default 5 (max recommendations returned)
"""

import os
import pickle
import numpy as np
import pandas as pd
from functools import wraps
from datetime import datetime
from flask_cors import CORS

from flask import Flask, request, jsonify

# ─────────────────────────────────────────────────────────────────
# APP INIT
# ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
app.config["JSON_SORT_KEYS"] = False

START_TIME = datetime.utcnow()

# ─────────────────────────────────────────────────────────────────
# LOAD MODEL ARTIFACTS
# ─────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_artifact(filename):
    path = os.path.join(BASE_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model artifact not found: {path}")
    with open(path, "rb") as f:
        return pickle.load(f)

print("Loading model artifacts ...")
try:
    regressor  = load_artifact(os.path.join(BASE_DIR, "models", "ecopacking_regressor.pkl"))
    classifier = load_artifact(os.path.join(BASE_DIR, "models", "ecopacking_classifier.pkl"))
    scaler     = load_artifact(os.path.join(BASE_DIR, "models", "ecopacking_scaler.pkl"))
    config     = load_artifact(os.path.join(BASE_DIR, "models", "ecopacking_metadata.pkl"))
    print("  ✓ All artifacts loaded")
except FileNotFoundError as e:
    print(f"  ✗ {e}")
    print("  Run train_model.py first to generate the model files.")
    raise SystemExit(1)

METADATA       = config["metadata"]
TRAIN_FEATURES = config["train_features"]
API_FEATURES   = config["api_features"]
INV_TIER       = config["inv_tier"]
CV_METRICS     = config["cv_metrics"]
TOP_N_DEFAULT  = int(os.environ.get("TOP_N", 5))

# ─────────────────────────────────────────────────────────────────
# VALIDATION HELPERS
# ─────────────────────────────────────────────────────────────────
FIELD_RULES = {
    "strength"        : {"type": float, "min": 1,   "max": 5,   "label": "Strength score (1–5)"},
    "weight_capacity" : {"type": float, "min": 1,   "max": 5,   "label": "Weight capacity score (1–5)"},
    "biodegradability": {"type": float, "min": 0,   "max": 100, "label": "Biodegradability score (0–100)"},
    "recyclability"   : {"type": float, "min": 0,   "max": 100, "label": "Recyclability percent (0–100)"},
    "co2_emission"    : {"type": float, "min": 0,   "max": 100, "label": "CO2 eco-score (0–100, higher = greener)"},
}

def validate_input(data):
    """Validate and coerce POST body. Returns (clean_dict, errors_list)."""
    errors = []
    clean  = {}

    for field, rules in FIELD_RULES.items():
        if field not in data:
            errors.append(f"Missing required field: '{field}' — {rules['label']}")
            continue
        try:
            val = rules["type"](data[field])
        except (TypeError, ValueError):
            errors.append(f"'{field}' must be a number — {rules['label']}")
            continue
        if not (rules["min"] <= val <= rules["max"]):
            errors.append(
                f"'{field}' = {val} is out of range "
                f"[{rules['min']}–{rules['max']}] — {rules['label']}"
            )
            continue
        clean[field] = val

    return clean, errors

# ─────────────────────────────────────────────────────────────────
# CORE RECOMMENDATION ENGINE
# ─────────────────────────────────────────────────────────────────
def build_input_row(user_input):
    """
    Map 5 API fields → full feature vector the model expects.
    Derives the engineered features on-the-fly.
    """
    s  = user_input["strength"]
    w  = user_input["weight_capacity"]
    bd = user_input["biodegradability"]
    co = user_input["co2_emission"]
    rc = user_input["recyclability"]

    eco_score         = round(bd * 0.35 + co * 0.40 + rc * 0.25, 4)
    performance_score = round((s * 0.5 + w * 0.5), 4)
    eco_perf_ratio    = round(eco_score / max(performance_score, 0.01), 4)

    row = {
        "strength_score"        : s,
        "weight_capacity_score" : w,
        "biodegradability_score": bd,
        "co2_emission_score"    : co,
        "recyclability_percent" : rc,
        "eco_score"             : eco_score,
        "performance_score"     : performance_score,
        "eco_performance_ratio" : eco_perf_ratio,
        "is_biodegradable"      : int(bd > 20),
        "is_recyclable"         : int(rc > 15),
        "dual_end_of_life"      : int(bd > 20 and rc > 15),
        "material_type_encoded" : 0,
    }
    return pd.DataFrame([row])[TRAIN_FEATURES]


def get_recommendations(user_input, top_n=TOP_N_DEFAULT):
    """
    Core logic:
      1. Predict sustainability score + tier for user's profile
      2. Compute similarity of every material to user requirements
      3. Rank by combined score (60% sustainability + 40% similarity)
      4. Return top_n results
    """
    input_df     = build_input_row(user_input)
    input_scaled = scaler.transform(input_df)

    # Predicted score & tier for the user's ideal profile
    pred_score      = float(regressor.predict(input_scaled)[0])
    pred_tier_code  = int(classifier.predict(input_scaled)[0])
    pred_tier       = INV_TIER[pred_tier_code]

    # ── Similarity: Euclidean distance on 5 core features (normalised 0–1) ──
    user_vec = np.array([
        user_input["strength"]         / 5.0,
        user_input["weight_capacity"]  / 5.0,
        user_input["biodegradability"] / 100.0,
        user_input["co2_emission"]     / 100.0,
        user_input["recyclability"]    / 100.0,
    ])

    mat_matrix = METADATA[[
        "strength_score",
        "weight_capacity_score",
        "biodegradability_score",
        "co2_emission_score",
        "recyclability_percent",
    ]].values / np.array([5.0, 5.0, 100.0, 100.0, 100.0])

    distances        = np.linalg.norm(mat_matrix - user_vec, axis=1)
    max_dist         = distances.max() if distances.max() > 0 else 1
    similarity_score = (1 - distances / max_dist) * 100

    # ── Combined match score ──
    result_df = METADATA.copy()
    result_df["similarity_score"] = similarity_score.round(2)
    result_df["match_score"]      = (
        result_df["sustainability_score"] * 0.60 +
        result_df["similarity_score"]     * 0.40
    ).round(2)

    top = result_df.sort_values("match_score", ascending=False).head(top_n)

    recommendations = []
    for rank, (_, row) in enumerate(top.iterrows(), start=1):
        recommendations.append({
            "rank"                  : rank,
            "material_id"           : int(row["material_id"]),
            "material_name"         : row["material_name"],
            "material_type"         : row["material_type"],
            "match_score"           : float(row["match_score"]),
            "similarity_to_request" : f"{row['similarity_score']:.1f}%",
            "sustainability"        : {
                "score" : float(row["sustainability_score"]),
                "rank"  : int(row["sustainability_rank"]),
                "tier"  : row["sustainability_tier"],
            },
            "properties"            : {
                "strength_score"        : float(row["strength_score"]),
                "weight_capacity_score" : float(row["weight_capacity_score"]),
                "biodegradability_score": float(row["biodegradability_score"]),
                "co2_emission_score"    : float(row["co2_emission_score"]),
                "recyclability_percent" : float(row["recyclability_percent"]),
            },
            "flags"                 : {
                "is_biodegradable" : bool(row["is_biodegradable"]),
                "is_recyclable"    : bool(row["is_recyclable"]),
                "dual_end_of_life" : bool(row["dual_end_of_life"]),
            },
        })

    return {
        "user_profile": {
            "predicted_sustainability_score": round(pred_score, 2),
            "predicted_sustainability_tier" : pred_tier,
            "input"                         : user_input,
        },
        "total_materials_evaluated": len(result_df),
        "recommendations_returned" : len(recommendations),
        "recommendations"          : recommendations,
    }


# ─────────────────────────────────────────────────────────────────
# ERROR RESPONSE HELPER
# ─────────────────────────────────────────────────────────────────
def error_response(message, status=400, details=None):
    body = {"success": False, "error": message}
    if details:
        body["details"] = details
    return jsonify(body), status


# ─────────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────────

# ── POST /recommend ──────────────────────────────────────────────
@app.route("/recommend", methods=["POST"])
def recommend():
    """
    Get top-N eco-packaging material recommendations.

    Request body (JSON):
        {
            "strength"        : 3,      // 1–5
            "weight_capacity" : 4,      // 1–5
            "biodegradability": 85,     // 0–100
            "recyclability"   : 80,     // 0–100
            "co2_emission"    : 90,     // 0–100  (higher = greener)
            "top_n"           : 5       // optional, default 5, max 20
        }

    Response (200):
        {
            "success": true,
            "user_profile": { ... },
            "recommendations": [ { rank, material_name, match_score, ... }, ... ]
        }
    """
    data = request.get_json(silent=True)
    if not data:
        return error_response("Request body must be valid JSON with Content-Type: application/json")

    clean, errors = validate_input(data)
    if errors:
        return error_response("Invalid input parameters", details=errors)

    top_n = int(data.get("top_n", TOP_N_DEFAULT))
    top_n = max(1, min(top_n, 20))          # clamp between 1 and 20

    try:
        result = get_recommendations(clean, top_n=top_n)
    except Exception as e:
        return error_response("Model inference failed", status=500, details=str(e))

    return jsonify({"success": True, **result}), 200


# ── POST /predict-score ──────────────────────────────────────────
@app.route("/predict-score", methods=["POST"])
def predict_score():
    """
    Predict the sustainability score and tier for a given material profile
    without returning recommendations — useful for scoring custom materials.

    Request / Response same field structure as /recommend.
    """
    data = request.get_json(silent=True)
    if not data:
        return error_response("Request body must be valid JSON")

    clean, errors = validate_input(data)
    if errors:
        return error_response("Invalid input parameters", details=errors)

    try:
        input_df     = build_input_row(clean)
        input_scaled = scaler.transform(input_df)
        pred_score   = float(regressor.predict(input_scaled)[0])
        pred_tier    = INV_TIER[int(classifier.predict(input_scaled)[0])]
    except Exception as e:
        return error_response("Model inference failed", status=500, details=str(e))

    return jsonify({
        "success"              : True,
        "input"                : clean,
        "sustainability_score" : round(pred_score, 2),
        "sustainability_tier"  : pred_tier,
        "score_range"          : {"min": 0, "max": 100},
        "tier_guide"           : {
            "Excellent": "Top 25% — highly sustainable",
            "Good"     : "50–75th percentile",
            "Moderate" : "25–50th percentile",
            "Poor"     : "Bottom 25% — low sustainability",
        },
    }), 200


# ── GET /materials ───────────────────────────────────────────────
@app.route("/materials", methods=["GET"])
def get_materials():
    """
    Return the full catalogue of 111 materials.

    Query params:
        type     → filter by material_type  (e.g. ?type=Bioplastic)
        tier     → filter by sustainability tier (e.g. ?tier=Excellent)
        sort_by  → field to sort by (default: sustainability_rank)
        order    → asc | desc (default: asc)
        page     → page number (default: 1)
        per_page → items per page (default: 20, max: 111)
    """
    mat_df = METADATA.copy()

    # Filters
    type_filter = request.args.get("type")
    tier_filter = request.args.get("tier")
    if type_filter:
        mat_df = mat_df[mat_df["material_type"].str.lower() == type_filter.lower()]
    if tier_filter:
        mat_df = mat_df[mat_df["sustainability_tier"].str.lower() == tier_filter.lower()]

    # Sort
    sort_by = request.args.get("sort_by", "sustainability_rank")
    order   = request.args.get("order", "asc").lower()
    valid_sort_cols = list(METADATA.columns)
    if sort_by not in valid_sort_cols:
        sort_by = "sustainability_rank"
    mat_df = mat_df.sort_values(sort_by, ascending=(order != "desc"))

    # Pagination
    try:
        page     = max(1, int(request.args.get("page", 1)))
        per_page = min(111, max(1, int(request.args.get("per_page", 20))))
    except ValueError:
        page, per_page = 1, 20

    total   = len(mat_df)
    start   = (page - 1) * per_page
    end     = start + per_page
    paged   = mat_df.iloc[start:end]

    materials = []
    for _, row in paged.iterrows():
        materials.append({
            "material_id"           : int(row["material_id"]),
            "material_name"         : row["material_name"],
            "material_type"         : row["material_type"],
            "sustainability_score"  : float(row["sustainability_score"]),
            "sustainability_rank"   : int(row["sustainability_rank"]),
            "sustainability_tier"   : row["sustainability_tier"],
            "strength_score"        : float(row["strength_score"]),
            "weight_capacity_score" : float(row["weight_capacity_score"]),
            "biodegradability_score": float(row["biodegradability_score"]),
            "co2_emission_score"    : float(row["co2_emission_score"]),
            "recyclability_percent" : float(row["recyclability_percent"]),
            "is_biodegradable"      : bool(row["is_biodegradable"]),
            "is_recyclable"         : bool(row["is_recyclable"]),
            "dual_end_of_life"      : bool(row["dual_end_of_life"]),
        })

    return jsonify({
        "success"   : True,
        "total"     : total,
        "page"      : page,
        "per_page"  : per_page,
        "pages"     : (total + per_page - 1) // per_page,
        "filters"   : {"type": type_filter, "tier": tier_filter},
        "materials" : materials,
    }), 200


# ── GET /materials/<id> ──────────────────────────────────────────
@app.route("/materials/<int:material_id>", methods=["GET"])
def get_material(material_id):
    """Return full detail for a single material by ID."""
    row = METADATA[METADATA["material_id"] == material_id]
    if row.empty:
        return error_response(f"Material with id={material_id} not found", status=404)

    row = row.iloc[0]
    return jsonify({
        "success"     : True,
        "material"    : {
            "material_id"           : int(row["material_id"]),
            "material_name"         : row["material_name"],
            "material_type"         : row["material_type"],
            "sustainability"        : {
                "score" : float(row["sustainability_score"]),
                "rank"  : int(row["sustainability_rank"]),
                "tier"  : row["sustainability_tier"],
            },
            "properties"            : {
                "strength_score"        : float(row["strength_score"]),
                "weight_capacity_score" : float(row["weight_capacity_score"]),
                "biodegradability_score": float(row["biodegradability_score"]),
                "co2_emission_score"    : float(row["co2_emission_score"]),
                "recyclability_percent" : float(row["recyclability_percent"]),
                "eco_score"             : float(row["eco_score"]),
                "performance_score"     : float(row["performance_score"]),
                "eco_performance_ratio" : float(row["eco_performance_ratio"]),
            },
            "flags"                 : {
                "is_biodegradable" : bool(row["is_biodegradable"]),
                "is_recyclable"    : bool(row["is_recyclable"]),
                "dual_end_of_life" : bool(row["dual_end_of_life"]),
            },
        },
    }), 200


# ── GET /health ──────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    """Health check — confirms API and model are running."""
    uptime = (datetime.utcnow() - START_TIME).seconds
    return jsonify({
        "success"       : True,
        "status"        : "healthy",
        "uptime_seconds": uptime,
        "model"         : {
            "materials_in_catalogue": len(METADATA),
            "features_used"         : len(TRAIN_FEATURES),
            "cv_r2"                 : CV_METRICS["regressor_r2_mean"],
            "cv_accuracy"           : CV_METRICS["classifier_acc_mean"],
        },
        "endpoints"     : {
            "POST /recommend"       : "Get top-N material recommendations",
            "POST /predict-score"   : "Predict sustainability score for a profile",
            "GET  /materials"       : "Browse full material catalogue",
            "GET  /materials/<id>"  : "Get single material detail",
            "GET  /health"          : "Health check",
        },
    }), 200


# ── 404 handler ──────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return error_response("Endpoint not found", status=404)


@app.errorhandler(405)
def method_not_allowed(e):
    return error_response("Method not allowed on this endpoint", status=405)


@app.errorhandler(500)
def internal_error(e):
    return error_response("Internal server error", status=500)


# ─────────────────────────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port  = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("DEBUG", "false").lower() == "true"
    print(f"\n  EcoPacking API running on http://localhost:{port}")
    print(f"  Debug mode : {debug}")
    print(f"  Catalogue  : {len(METADATA)} materials\n")
    app.run(host="0.0.0.0", port=8000)