"""
EcoPacking Recommendation Model — Training Script
==================================================
Input features (from API POST):
    strength        → desired strength level (1–5)
    weight_capacity → desired weight capacity (1–5)
    biodegradability→ minimum biodegradability required (0–100)
    recyclability   → minimum recyclability required (0–100)
    co2_emission    → CO2 eco-score required (0–100, higher = greener)

Output:
    Top-N recommended materials ranked by sustainability_score
    with similarity to user requirements

Models trained:
    1. RandomForestRegressor  → predicts sustainability_score
    2. RandomForestClassifier → predicts sustainability_tier (Excellent/Good/Moderate/Poor)

Saved artifacts:
    ecopacking_regressor.pkl   → score predictor
    ecopacking_classifier.pkl  → tier predictor
    ecopacking_scaler.pkl      → input scaler
    ecopacking_metadata.pkl    → material lookup table for recommendations
"""

import pandas as pd
import numpy as np
import pickle
import warnings
warnings.filterwarnings("ignore")

from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from sklearn.model_selection import cross_val_score, StratifiedKFold, KFold
from sklearn.metrics import (
    mean_absolute_error, r2_score,
    classification_report, accuracy_score
)

# ─────────────────────────────────────────────────────────────────
# 1. LOAD DATA
# ─────────────────────────────────────────────────────────────────
print("=" * 60)
print("  ECOPACKING MODEL TRAINING")
print("=" * 60)

df = pd.read_csv("data/features_tree_models_sustainability.csv")
print(f"\n  Dataset loaded: {df.shape[0]} materials, {df.shape[1]} columns")

# ─────────────────────────────────────────────────────────────────
# 2. DEFINE FEATURE COLUMNS
#    These 5 match exactly what the API POST will receive
# ─────────────────────────────────────────────────────────────────
API_FEATURES = [
    "strength_score",
    "weight_capacity_score",
    "biodegradability_score",
    "co2_emission_score",
    "recyclability_percent",
]

# Extended features used internally during training
# (gives the model richer context; API inputs are mapped to these)
TRAIN_FEATURES = API_FEATURES + [
    "eco_score",
    "performance_score",
    "eco_performance_ratio",
    "is_biodegradable",
    "is_recyclable",
    "dual_end_of_life",
    "material_type_encoded",
]

TARGET_REG   = "sustainability_score"   # regression target
TARGET_CLF   = "sustainability_tier"    # classification target

X = df[TRAIN_FEATURES].copy()
y_reg = df[TARGET_REG].copy()
y_clf = df[TARGET_CLF].copy()

print(f"\n  Training features : {TRAIN_FEATURES}")
print(f"  Regression target : {TARGET_REG}  (range {y_reg.min():.1f}–{y_reg.max():.1f})")
print(f"  Classifier target : {TARGET_CLF}  ({y_clf.value_counts().to_dict()})")

# ─────────────────────────────────────────────────────────────────
# 3. SCALE FEATURES
# ─────────────────────────────────────────────────────────────────
scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(X)
X_scaled_df = pd.DataFrame(X_scaled, columns=TRAIN_FEATURES)

# ─────────────────────────────────────────────────────────────────
# 4. ENCODE CLASSIFICATION TARGET
# ─────────────────────────────────────────────────────────────────
tier_order = {"Poor": 0, "Moderate": 1, "Good": 2, "Excellent": 3}
y_clf_encoded = y_clf.map(tier_order)

# ─────────────────────────────────────────────────────────────────
# 5. TRAIN — REGRESSION MODEL (sustainability score predictor)
# ─────────────────────────────────────────────────────────────────
print("\n" + "─" * 60)
print("  [1/2] Training RandomForest Regressor ...")

regressor = RandomForestRegressor(
    n_estimators    = 300,
    max_depth       = 10,
    min_samples_leaf= 2,
    max_features    = "sqrt",
    random_state    = 42,
    n_jobs          = -1,
)
regressor.fit(X_scaled, y_reg)

# Cross-validation
cv_reg = KFold(n_splits=5, shuffle=True, random_state=42)
cv_mae  = -cross_val_score(regressor, X_scaled, y_reg, cv=cv_reg, scoring="neg_mean_absolute_error")
cv_r2   =  cross_val_score(regressor, X_scaled, y_reg, cv=cv_reg, scoring="r2")

print(f"  CV MAE  : {cv_mae.mean():.3f} ± {cv_mae.std():.3f}")
print(f"  CV R²   : {cv_r2.mean():.3f} ± {cv_r2.std():.3f}")

# Train-set metrics
y_pred_reg = regressor.predict(X_scaled)
print(f"  Train MAE : {mean_absolute_error(y_reg, y_pred_reg):.3f}")
print(f"  Train R²  : {r2_score(y_reg, y_pred_reg):.4f}")

# Feature importance
feat_imp = pd.Series(regressor.feature_importances_, index=TRAIN_FEATURES).sort_values(ascending=False)
print("\n  Feature importances (regressor):")
for feat, imp in feat_imp.items():
    print(f"    {feat:<30} {imp:.4f}")

# ─────────────────────────────────────────────────────────────────
# 6. TRAIN — CLASSIFICATION MODEL (tier predictor)
# ─────────────────────────────────────────────────────────────────
print("\n" + "─" * 60)
print("  [2/2] Training RandomForest Classifier ...")

classifier = RandomForestClassifier(
    n_estimators     = 300,
    max_depth        = 10,
    min_samples_leaf = 2,
    max_features     = "sqrt",
    class_weight     = "balanced",
    random_state     = 42,
    n_jobs           = -1,
)
classifier.fit(X_scaled, y_clf_encoded)

# Cross-validation
cv_clf  = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_acc  = cross_val_score(classifier, X_scaled, y_clf_encoded, cv=cv_clf, scoring="accuracy")
print(f"  CV Accuracy : {cv_acc.mean():.3f} ± {cv_acc.std():.3f}")

y_pred_clf = classifier.predict(X_scaled)
print(f"  Train Accuracy : {accuracy_score(y_clf_encoded, y_pred_clf):.4f}")

# Reverse encode for readable report
inv_tier = {v: k for k, v in tier_order.items()}
y_pred_labels = pd.Series(y_pred_clf).map(inv_tier)
print("\n  Classification Report:")
print(classification_report(y_clf, y_pred_labels, target_names=list(tier_order.keys())))

# ─────────────────────────────────────────────────────────────────
# 7. BUILD MATERIAL METADATA LOOKUP
#    Stored alongside model for recommendation retrieval
# ─────────────────────────────────────────────────────────────────
metadata = df[[
    "material_id",
    "material_name",
    "material_type",
    "strength_score",
    "weight_capacity_score",
    "biodegradability_score",
    "co2_emission_score",
    "recyclability_percent",
    "eco_score",
    "performance_score",
    "eco_performance_ratio",
    "is_biodegradable",
    "is_recyclable",
    "dual_end_of_life",
    "material_type_encoded",
    "sustainability_score",
    "sustainability_rank",
    "sustainability_tier",
]].copy()

# Pre-compute scaled version of metadata for similarity matching at inference
metadata_scaled = scaler.transform(metadata[TRAIN_FEATURES])
metadata["predicted_score"] = regressor.predict(metadata_scaled).round(2)
predicted_tier_encoded = classifier.predict(metadata_scaled)
metadata["predicted_tier"] = pd.Series(predicted_tier_encoded).map(inv_tier).values

# ─────────────────────────────────────────────────────────────────
# 8. SAVE ALL ARTIFACTS
# ─────────────────────────────────────────────────────────────────
print("\n" + "─" * 60)
print("  Saving model artifacts ...")

with open("models/ecopacking_regressor.pkl",  "wb") as f: pickle.dump(regressor,  f)
with open("models/ecopacking_classifier.pkl", "wb") as f: pickle.dump(classifier, f)
with open("models/ecopacking_scaler.pkl",     "wb") as f: pickle.dump(scaler,     f)

# Save metadata + config
model_config = {
    "api_features"     : API_FEATURES,
    "train_features"   : TRAIN_FEATURES,
    "tier_order"       : tier_order,
    "inv_tier"         : inv_tier,
    "metadata"         : metadata,
    "feature_importance": feat_imp.to_dict(),
    "cv_metrics": {
        "regressor_mae_mean": round(cv_mae.mean(), 3),
        "regressor_r2_mean" : round(cv_r2.mean(),  3),
        "classifier_acc_mean": round(cv_acc.mean(), 3),
    }
}
with open("models/ecopacking_metadata.pkl", "wb") as f: pickle.dump(model_config, f)

print("  ✓ ecopacking_regressor.pkl")
print("  ✓ ecopacking_classifier.pkl")
print("  ✓ ecopacking_scaler.pkl")
print("  ✓ ecopacking_metadata.pkl")

# ─────────────────────────────────────────────────────────────────
# 9. QUICK INFERENCE TEST
#    Simulates what the Flask API will do
# ─────────────────────────────────────────────────────────────────
print("\n" + "─" * 60)
print("  INFERENCE TEST — sample POST input:")

sample_input = {
    "strength"        : 3,
    "weight_capacity" : 4,
    "biodegradability": 85,
    "recyclability"   : 80,
    "co2_emission"    : 90,
}
print(f"  {sample_input}")

def recommend(user_input, top_n=5):
    """
    Core recommendation function used by Flask API.

    Parameters
    ----------
    user_input : dict with keys:
        strength, weight_capacity, biodegradability, recyclability, co2_emission
    top_n : int — number of recommendations to return

    Returns
    -------
    list of dicts — top_n materials ranked by combined score
    """
    # Map API field names to model feature names
    api_to_feature = {
        "strength"        : "strength_score",
        "weight_capacity" : "weight_capacity_score",
        "biodegradability": "biodegradability_score",
        "co2_emission"    : "co2_emission_score",
        "recyclability"   : "recyclability_percent",
    }

    # Build base row using API inputs for the 5 core fields
    base = {feat: 0.0 for feat in TRAIN_FEATURES}
    for api_key, feat_name in api_to_feature.items():
        base[feat_name] = float(user_input[api_key])

    # Derive the engineered features from the 5 core inputs
    s  = base["strength_score"]
    w  = base["weight_capacity_score"]
    bd = base["biodegradability_score"]
    co = base["co2_emission_score"]
    rc = base["recyclability_percent"]

    base["eco_score"]             = round(bd * 0.35 + co * 0.40 + rc * 0.25, 2)
    base["performance_score"]     = round((s * 0.5 + w * 0.5), 2)
    base["eco_performance_ratio"] = round(base["eco_score"] / max(base["performance_score"], 0.01), 3)
    base["is_biodegradable"]      = int(bd > 20)
    base["is_recyclable"]         = int(rc > 15)
    base["dual_end_of_life"]      = int(bd > 20 and rc > 15)
    base["material_type_encoded"] = 0  # unknown at query time

    input_row = pd.DataFrame([base])[TRAIN_FEATURES]
    input_scaled = scaler.transform(input_row)

    # Predict score for user's ideal material profile
    predicted_score = regressor.predict(input_scaled)[0]
    predicted_tier_code = classifier.predict(input_scaled)[0]
    predicted_tier = inv_tier[predicted_tier_code]

    # ── Similarity matching against all 111 materials ──
    # Score = weighted combo of:
    #   a) sustainability_score  (how green the material actually is)
    #   b) feature proximity     (how close it is to what user asked for)

    meta = metadata.copy()

    # Euclidean distance on the 5 core API features (normalized 0–1)
    user_vals  = np.array([
        s  / 5.0,
        w  / 5.0,
        bd / 100.0,
        co / 100.0,
        rc / 100.0,
    ])
    mat_vals = meta[[
        "strength_score",
        "weight_capacity_score",
        "biodegradability_score",
        "co2_emission_score",
        "recyclability_percent",
    ]].values / np.array([5.0, 5.0, 100.0, 100.0, 100.0])

    distances = np.linalg.norm(mat_vals - user_vals, axis=1)
    similarity_score = (1 - distances / distances.max()) * 100  # 0–100, higher = closer match

    # Final combined score: 60% actual sustainability + 40% similarity to user needs
    meta["match_score"] = (
        meta["sustainability_score"] * 0.60 +
        similarity_score             * 0.40
    ).round(2)

    meta["similarity_pct"] = similarity_score.round(1)

    # Sort by match score
    top = meta.sort_values("match_score", ascending=False).head(top_n)

    results = []
    for _, row in top.iterrows():
        results.append({
            "rank"                  : int(_ + 1),
            "material_name"         : row["material_name"],
            "material_type"         : row["material_type"],
            "match_score"           : float(row["match_score"]),
            "similarity_to_request" : f"{row['similarity_pct']:.1f}%",
            "sustainability_score"  : float(row["sustainability_score"]),
            "sustainability_tier"   : row["sustainability_tier"],
            "strength_score"        : float(row["strength_score"]),
            "weight_capacity_score" : float(row["weight_capacity_score"]),
            "biodegradability_score": float(row["biodegradability_score"]),
            "co2_emission_score"    : float(row["co2_emission_score"]),
            "recyclability_percent" : float(row["recyclability_percent"]),
            "is_biodegradable"      : bool(row["is_biodegradable"]),
            "is_recyclable"         : bool(row["is_recyclable"]),
        })

    return {
        "user_input"              : user_input,
        "predicted_score_for_input": round(predicted_score, 2),
        "predicted_tier_for_input" : predicted_tier,
        "top_recommendations"      : results,
    }

result = recommend(sample_input, top_n=5)

print(f"\n  Predicted score for input : {result['predicted_score_for_input']}")
print(f"  Predicted tier for input  : {result['predicted_tier_for_input']}")
print(f"\n  Top 5 Recommendations:")
for i, mat in enumerate(result["top_recommendations"], 1):
    print(f"    {i}. {mat['material_name']}")
    print(f"       Type        : {mat['material_type']}")
    print(f"       Match Score : {mat['match_score']}")
    print(f"       Similarity  : {mat['similarity_to_request']}")
    print(f"       Sus. Score  : {mat['sustainability_score']}  [{mat['sustainability_tier']}]")

print("\n  ✓ Training complete. Ready for Flask API.")
print("=" * 60)