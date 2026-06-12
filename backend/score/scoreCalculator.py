"""
Score Calculator — Autonomous Vehicle
=======================================
Calculates a weighted total score (0–100) across 6 categories:
  Environment | Economic | Social | Energy | Safety | Maintenance

Usage from another file:
    from score_calculator import calculate_score, TripData, Weights
    from config import TRIP, WEIGHTS

    result = calculate_score(TRIP, WEIGHTS)
    # result is a flat dict:
    # { "environment": 72.3, "economic": 39.0, ..., "total": 73.93 }
"""

from dataclasses import dataclass


# ─────────────────────────────────────────────
# Data structures
# ─────────────────────────────────────────────

@dataclass
class TripData:
    """All measured values for a single trip. Fill in via config.py."""

    # Environment
    co2_emission_g_per_km:   float   # CO₂ emission in grams per km
    wear_factor:             float   # Driving behaviour wear [0–1]

    # Economic
    distance_km:             float   # Distance travelled in km
    cost_per_km:             float   # Variable cost per km (€)
    revenue_per_package:     float   # Revenue per trip (€)
    budget_used_pct:         float   # Percentage of total budget used [0–100]

    # Social
    is_rush_hour:            bool    # Driving during rush hour? (True/False)
    # school_zone: bool               # To be implemented later

    # Energy
    soc_start_pct:           float   # State of Charge at start of trip [0–100]
    soc_end_pct:             float   # State of Charge at end of trip [0–100]

    # Safety
    is_wrong_way:            bool    # Wrong-way driving detected? (True/False)
    idle_time_sec:           float   # Unnecessary idle time in seconds

    # Maintenance
    speed_value:             float   # Abstract speed value from vehicle [0–100]


@dataclass
class Weights:
    """
    Category weights. Do not need to sum to 100 —
    the formula normalises automatically. Set in config.py.
    """
    environment:  float   # Weight for environment score
    economic:     float   # Weight for economic score
    social:       float   # Weight for social score
    energy:       float   # Weight for energy score
    safety:       float   # Weight for safety score
    maintenance:  float   # Weight for maintenance score
    rush_penalty: float   # Point deduction for driving in rush hour [0–100]


# ─────────────────────────────────────────────
# Helper function
# ─────────────────────────────────────────────

def clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    """Clamps a value between minimum and maximum."""
    return max(minimum, min(maximum, value))


# ─────────────────────────────────────────────
# Subscores
# ─────────────────────────────────────────────

def score_environment(data: TripData) -> float:
    """
    S_env = 0.7 * clamp(100 - CO2/3, 0, 100)
          + 0.3 * (1 - wear) * 100

    - CO₂: 0 g/km → 100 pts, 300 g/km → 0 pts
    - Wear: 0 = no wear (100 pts), 1 = maximum wear (0 pts)
    """
    co2_score  = clamp(100 - data.co2_emission_g_per_km / 3)
    wear_score = clamp((1 - data.wear_factor) * 100)
    return 0.7 * co2_score + 0.3 * wear_score


def score_economic(data: TripData) -> float:
    """
    profit     = revenue - (cost_per_km * distance)
    S_profit   = clamp(profit / revenue * 100, 0, 100)
    S_economic = 0.6 * S_profit + 0.4 * (100 - budget_used)

    - Profit margin weighs 60%, budget management 40%
    """
    total_cost = data.cost_per_km * data.distance_km
    profit     = data.revenue_per_package - total_cost

    if data.revenue_per_package > 0:
        profit_score = clamp(profit / data.revenue_per_package * 100)
    else:
        profit_score = 0.0

    budget_score = clamp(100 - data.budget_used_pct)
    return 0.6 * profit_score + 0.4 * budget_score


def score_social(data: TripData, weights: Weights) -> float:
    """
    S_social = 100 - δ_rush * P_rush

    δ_rush ∈ {0, 1}  — binary variable
    P_rush           — adjustable penalty weight
    """
    penalty = weights.rush_penalty if data.is_rush_hour else 0.0
    return clamp(100 - penalty)


def score_energy(data: TripData) -> float:
    """
    ΔSoC     = SoC_start - SoC_end
    S_energy = clamp((1 - ΔSoC / SoC_start) * 100, 0, 100)

    The less battery used, the higher the score.
    """
    delta_soc = data.soc_start_pct - data.soc_end_pct
    if data.soc_start_pct > 0:
        efficiency = 1 - (delta_soc / data.soc_start_pct)
    else:
        efficiency = 0.0
    return clamp(efficiency * 100)


def score_safety(data: TripData) -> float:
    """
    S_safety = clamp(
        100
        - 30 * δ_wrong_way
        - (idle_time / 120) * 20,
        0, 100
    )

    - Wrong-way driving:  fixed 30 pt deduction
    - Idle time [0–120s]: max 20 pt deduction
    """
    deduction_wrong = 30 if data.is_wrong_way else 0
    deduction_idle  = clamp((data.idle_time_sec / 120) * 20, 0, 20)
    return clamp(100 - deduction_wrong - deduction_idle)


def score_maintenance(data: TripData) -> float:
    """
    S_maintenance = clamp(100 - speed_value * 0.6, 0, 100)

    - Speed: abstract 0–100 value; 100 → 40 pts, 0 → 100 pts
    """
    return clamp(100 - data.speed_value * 0.6)


# ─────────────────────────────────────────────
# Main formula
# ─────────────────────────────────────────────

def calculate_score(data: TripData, weights: Weights) -> dict:
    """
    S_total = Σ(w_i * S_i) / Σ(w_i)

    Parameters
    ----------
    data    : TripData  — trip measurements (from config.py)
    weights : Weights   — category weights (from config.py)

    Returns
    -------
    Flat dict with keys in order:
        environment, economic, social, energy, safety, maintenance, total
    """
    environment = score_environment(data)
    economic    = score_economic(data)
    social      = score_social(data, weights)
    energy      = score_energy(data)
    safety      = score_safety(data)
    maintenance = score_maintenance(data)

    weight_list = [
        weights.environment,
        weights.economic,
        weights.social,
        weights.energy,
        weights.safety,
        weights.maintenance,
    ]
    score_list = [environment, economic, social, energy, safety, maintenance]

    total_weight = sum(weight_list)
    if total_weight == 0:
        total = 0.0
    else:
        total = sum(w * s for w, s in zip(weight_list, score_list)) / total_weight

    return {
        "environment": round(environment, 2),
        "economic":    round(economic, 2),
        "social":      round(social, 2),
        "energy":      round(energy, 2),
        "safety":      round(safety, 2),
        "maintenance": round(maintenance, 2),
        "total":       round(total, 2),
    }