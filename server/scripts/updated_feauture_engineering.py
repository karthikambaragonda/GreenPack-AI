import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler, LabelEncoder

# ─────────────────────────────────────────────
# 1. LOAD DATA
# ─────────────────────────────────────────────
df = pd.read_csv("data/cleaned_data1.csv")

# ─────────────────────────────────────────────
# 2. DROP NON-FEATURE COLUMNS
# ─────────────────────────────────────────────
# material_id is an identifier, not a feature
# material_name is text — kept separately for display/lookup
df_feat = df.drop(columns=["material_id", "material_name"]).copy()

# ─────────────────────────────────────────────
# 3. ENCODE CATEGORICAL: material_type
# ─────────────────────────────────────────────

# --- 3a. Label Encoding (for tree-based models: XGBoost, Random Forest) ---
le = LabelEncoder()
df_feat["material_type_encoded"] = le.fit_transform(df_feat["material_type"])

# Store the label mapping for reference
label_mapping = dict(zip(le.classes_, le.transform(le.classes_)))
print("Label encoding map:\n", label_mapping)

# --- 3b. One-Hot Encoding (for linear models, neural networks) ---
ohe_cols = pd.get_dummies(df_feat["material_type"], prefix="type", dtype=int)
df_ohe = pd.concat([df_feat.drop(columns=["material_type"]), ohe_cols], axis=1)

# ─────────────────────────────────────────────
# 4. DERIVED FEATURES
# ─────────────────────────────────────────────

# --- 4a. Eco Score: composite sustainability index (0–100) ---
# Weighted average of the three green signals
df_feat["eco_score"] = (
    df_feat["biodegradability_score"] * 0.35 +
    df_feat["co2_emission_score"]     * 0.40 +
    df_feat["recyclability_percent"]  * 0.25
).round(2)

# --- 4b. Performance Score: structural capability index (1–5 scale) ---
df_feat["performance_score"] = (
    (df_feat["strength_score"] * 0.5 +
     df_feat["weight_capacity_score"] * 0.5)
).round(2)

# --- 4c. Eco-Performance Ratio: sustainability per unit of strength ---
# High ratio = strong AND green; useful for recommending best trade-off
df_feat["eco_performance_ratio"] = (
    df_feat["eco_score"] / df_feat["performance_score"]
).round(3)

# --- 4d. Biodegradable flag: binary (1 = biodegradable, 0 = not) ---
# Threshold: score > 20 means meaningfully biodegradable
df_feat["is_biodegradable"] = (df_feat["biodegradability_score"] > 20).astype(int)

# --- 4e. Recyclable flag: binary (1 = recyclable, 0 = not) ---
# Threshold: > 15% recyclability
df_feat["is_recyclable"] = (df_feat["recyclability_percent"] > 15).astype(int)

# --- 4f. Dual-end-of-life flag: both biodegradable AND recyclable ---
df_feat["dual_end_of_life"] = (
    (df_feat["is_biodegradable"] == 1) & (df_feat["is_recyclable"] == 1)
).astype(int)

# --- 4g. Strength tier: bucketed strength for recommendation filtering ---
# 1-2 = lightweight, 3 = medium, 4-5 = heavy-duty
df_feat["strength_tier"] = pd.cut(
    df_feat["strength_score"],
    bins=[0, 2, 3, 5],
    labels=["lightweight", "medium", "heavy_duty"]
)

# --- 4h. CO2 category: binned eco performance ---
df_feat["co2_category"] = pd.cut(
    df_feat["co2_emission_score"],
    bins=[0, 50, 75, 90, 100],
    labels=["high_emission", "moderate", "low_emission", "ultra_low"]
)

# ─────────────────────────────────────────────
# 5. NORMALIZE NUMERICAL FEATURES
# ─────────────────────────────────────────────
# Scale all continuous features to [0, 1] for distance-based or NN models
# Ordinal scores (1–5) are also scaled for consistency

scaler = MinMaxScaler()

cols_to_scale = [
    "strength_score",
    "weight_capacity_score",
    "biodegradability_score",
    "co2_emission_score",
    "recyclability_percent",
    "eco_score",
    "performance_score",
    "eco_performance_ratio",
]

df_feat_scaled = df_feat.copy()
df_feat_scaled[cols_to_scale] = scaler.fit_transform(df_feat[cols_to_scale])

# ─────────────────────────────────────────────
# 6. FINAL FEATURE SETS
# ─────────────────────────────────────────────

# --- 6a. For tree-based models (Random Forest, XGBoost, LightGBM) ---
# Uses label encoding + all derived features
tree_features = [
    "material_type_encoded",
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
]

# --- 6b. For linear / neural network models ---
# Uses one-hot encoding; categorical bins converted to dummies too
ohe_type_cols = [c for c in df_ohe.columns if c.startswith("type_")]

strength_tier_dummies = pd.get_dummies(df_feat["strength_tier"], prefix="strength_tier", dtype=int)
co2_cat_dummies       = pd.get_dummies(df_feat["co2_category"],  prefix="co2_cat",       dtype=int)

df_nn = pd.concat([
    df_ohe[ohe_type_cols],
    df_feat_scaled[cols_to_scale],
    df_feat[["is_biodegradable", "is_recyclable", "dual_end_of_life"]],
    strength_tier_dummies,
    co2_cat_dummies,
], axis=1)

# ─────────────────────────────────────────────
# 7. ATTACH IDENTIFIER COLUMNS BACK
# ─────────────────────────────────────────────
df_feat.insert(0, "material_id",   df["material_id"])
df_feat.insert(1, "material_name", df["material_name"])

df_feat_scaled.insert(0, "material_id",   df["material_id"])
df_feat_scaled.insert(1, "material_name", df["material_name"])

df_nn.insert(0, "material_id",   df["material_id"])
df_nn.insert(1, "material_name", df["material_name"])

# ─────────────────────────────────────────────
# 8. SAVE OUTPUTS
# ─────────────────────────────────────────────
df_feat.to_csv("data/features_tree_models.csv",      index=False)  # for tree-based models
df_feat_scaled.to_csv("data/features_nn_scaled.csv", index=False)  # for neural networks (scaled)
df_nn.to_csv("data/features_nn_ohe.csv",             index=False)  # for NN with one-hot encoding

print("\n✓ Feature engineering complete.")
print(f"  features_tree_models.csv  → {df_feat.shape[1]-2} features, {len(df_feat)} rows")
print(f"  features_nn_scaled.csv   → {df_feat_scaled.shape[1]-2} features, {len(df_feat_scaled)} rows")
print(f"  features_nn_ohe.csv      → {df_nn.shape[1]-2} features, {len(df_nn)} rows")
print(f"\nTree feature columns:\n  {tree_features}")
print(f"\nNN (OHE) feature columns:\n  {list(df_nn.columns[2:])}")