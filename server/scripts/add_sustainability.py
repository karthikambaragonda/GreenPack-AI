import pandas as pd
import numpy as np

# ─────────────────────────────────────────────────────────────────
# ADD SUSTAINABILITY SCORE TO features_tree_models.csv
#
# Sustainability Score (0–100):
#   A single ranked signal that captures how eco-friendly AND
#   practically viable each material is for packaging.
#
# Formula (weighted components):
#   Component                  Weight   Rationale
#   ─────────────────────────────────────────────
#   co2_emission_score           30%    Carbon footprint — primary env. impact
#   biodegradability_score       25%    End-of-life decomposition
#   recyclability_percent        20%    Circular economy potential
#   eco_performance_ratio        15%    Green value per unit of structural use
#   dual_end_of_life (bonus)     10%    Both biodegradable + recyclable = premium
#
# Score is then:
#   1. Normalized to 0–100 range across the dataset
#   2. Ranked (rank 1 = most sustainable)
#   3. Assigned a label tier: Excellent / Good / Moderate / Poor
# ─────────────────────────────────────────────────────────────────

df = pd.read_csv("data/features_tree_models.csv")

# ─────────────────────────────────────────────────────────────────
# STEP 1 — Normalize each component to 0–100
#          (some are already 0–100, eco_performance_ratio is not)
# ─────────────────────────────────────────────────────────────────

def normalize(series):
    """Min-max normalize a series to 0–100."""
    mn, mx = series.min(), series.max()
    if mx == mn:
        return pd.Series([50.0] * len(series), index=series.index)
    return ((series - mn) / (mx - mn)) * 100

co2_norm         = normalize(df["co2_emission_score"])       # already 0–100, re-normalize across dataset
bio_norm         = normalize(df["biodegradability_score"])   # already 0–100
recycle_norm     = normalize(df["recyclability_percent"])    # already 0–100
eco_perf_norm    = normalize(df["eco_performance_ratio"])    # ratio — needs normalization
dual_eol         = df["dual_end_of_life"] * 100              # binary 0/1 → 0 or 100

# ─────────────────────────────────────────────────────────────────
# STEP 2 — Weighted composite sustainability score
# ─────────────────────────────────────────────────────────────────

df["sustainability_score"] = (
    co2_norm      * 0.30 +
    bio_norm      * 0.25 +
    recycle_norm  * 0.20 +
    eco_perf_norm * 0.15 +
    dual_eol      * 0.10
).round(2)

# ─────────────────────────────────────────────────────────────────
# STEP 3 — Rank (1 = most sustainable material in dataset)
# ─────────────────────────────────────────────────────────────────

df["sustainability_rank"] = df["sustainability_score"].rank(
    ascending=False, method="min"
).astype(int)

# ─────────────────────────────────────────────────────────────────
# STEP 4 — Tier label for model classification target / filtering
#   Excellent  → top 25%   (score ≥ 75th percentile)
#   Good       → 50–75th percentile
#   Moderate   → 25–50th percentile
#   Poor       → bottom 25%
# ─────────────────────────────────────────────────────────────────

p25 = df["sustainability_score"].quantile(0.25)
p50 = df["sustainability_score"].quantile(0.50)
p75 = df["sustainability_score"].quantile(0.75)

def assign_tier(score):
    if score >= p75:
        return "Excellent"
    elif score >= p50:
        return "Good"
    elif score >= p25:
        return "Moderate"
    else:
        return "Poor"

df["sustainability_tier"] = df["sustainability_score"].apply(assign_tier)

# ─────────────────────────────────────────────────────────────────
# STEP 5 — Save
# ─────────────────────────────────────────────────────────────────

df.to_csv("data/features_tree_models_sustainability.csv", index=False)

# ─────────────────────────────────────────────────────────────────
# STEP 6 — Summary report
# ─────────────────────────────────────────────────────────────────

print("=" * 58)
print("  SUSTAINABILITY SCORE — SUMMARY")
print("=" * 58)
print(f"\n  Score range : {df['sustainability_score'].min():.2f}  →  {df['sustainability_score'].max():.2f}")
print(f"  Mean score  : {df['sustainability_score'].mean():.2f}")
print(f"  Std dev     : {df['sustainability_score'].std():.2f}")

print("\n  Tier thresholds:")
print(f"    Excellent  ≥ {p75:.2f}")
print(f"    Good       ≥ {p50:.2f}")
print(f"    Moderate   ≥ {p25:.2f}")
print(f"    Poor       <  {p25:.2f}")

print("\n  Tier distribution:")
print(df["sustainability_tier"].value_counts().to_string())

print("\n  Top 10 most sustainable materials:")
top10 = df[["sustainability_rank", "material_name", "material_type",
            "sustainability_score", "sustainability_tier"]].sort_values("sustainability_rank").head(10)
print(top10.to_string(index=False))

print("\n  Bottom 5 least sustainable materials:")
bot5 = df[["sustainability_rank", "material_name", "material_type",
           "sustainability_score", "sustainability_tier"]].sort_values("sustainability_rank", ascending=False).head(5)
print(bot5.to_string(index=False))

print("\n  New columns added to features_tree_models.csv:")
print("    • sustainability_score  (float, 0–100)")
print("    • sustainability_rank   (int,   1 = best)")
print("    • sustainability_tier   (str,   Excellent/Good/Moderate/Poor)")
print("\n  ✓ Saved → features_tree_models.csv")