"""
Score Calculator — Autonomous Vehicle
=======================================
Calculates a weighted total score (0–100) across 6 categories:
  Environment | Economic | Social | Energy | Safety | Maintenance

The final score is a weighted average of all category subscores.
Each subscore is independently calculated on a 0–100 scale so that
categories stay comparable regardless of their units (grams, euros,
seconds, etc.). Weights let you tune how much each category matters
without touching the formulas themselves.

Usage from another file:
    from score_calculator import calculate_score, TripData, Weights
    from config import TRIP, WEIGHTS

    result = calculate_score(TRIP, WEIGHTS, "car_01")
    # Returns a flat dict:
    # { "car_id": "car_01", "environment": 72.3, ..., "total": 73.93 }
"""

from dataclasses import dataclass


# ─────────────────────────────────────────────
# Data structures
# ─────────────────────────────────────────────

@dataclass
class TripData:
    """
    All measured values for a single trip. Fill in via config.py.

    Using a dataclass keeps all inputs in one place and makes it
    immediately clear what the calculator expects. It also allows
    type hints so mistakes (e.g. passing a string instead of a float)
    are easier to catch early.
    """

    # ── Environment ──────────────────────────────────────────────────
    co2_emission_g_per_km:   float   # CO₂ emission in grams per km
    wear_factor:             float   # Driving behaviour wear [0–1]

    # ── Economic ─────────────────────────────────────────────────────
    distance_km:             float   # Distance travelled in km
    cost_per_km:             float   # Variable cost per km (€)
    revenue_per_package:     float   # Revenue per trip (€)
    budget_used_pct:         float   # Percentage of total budget used [0–100]

    # ── Social ───────────────────────────────────────────────────────
    is_rush_hour:            bool    # Driving during rush hour? (True/False)
    # school_zone: bool               # To be implemented later

    # ── Energy ───────────────────────────────────────────────────────
    soc_start_pct:           float   # State of Charge at start of trip [0–100]
    soc_end_pct:             float   # State of Charge at end of trip [0–100]

    # ── Safety ───────────────────────────────────────────────────────
    is_wrong_way:            bool    # Wrong-way driving detected? (True/False)
    idle_time_sec:           float   # Unnecessary idle time in seconds

    # ── Maintenance ──────────────────────────────────────────────────
    speed_value:             float   # Abstract speed value from vehicle [0–100]


@dataclass
class Weights:
    """
    Category weights that control how much each subscore contributes
    to the final total. They do not need to sum to 100 — the formula
    divides by the sum of all weights, so only the relative ratios
    matter. Example: weights of 20/20/10 give the same result as
    40/40/20.

    rush_penalty is not a category weight but a penalty magnitude:
    it defines how many points are deducted from the social score
    when the vehicle drives during rush hour.
    """
    environment:  float   # Weight for environment score
    economic:     float   # Weight for economic score
    social:       float   # Weight for social score
    energy:       float   # Weight for energy score
    safety:       float   # Weight for safety score
    maintenance:  float   # Weight for maintenance score
    rush_penalty: float   # Point deduction applied to social score during rush hour [0–100]


# ─────────────────────────────────────────────
# Helper function
# ─────────────────────────────────────────────

def clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    """
    Keeps a value within [minimum, maximum].

    Used throughout the subscores to prevent results from going below
    0 or above 100. Without clamping, extreme inputs (e.g. very high
    CO₂ or a trip that earns no revenue) would produce negative scores
    or scores above 100, which would break the weighted average.
    """
    return max(minimum, min(maximum, value))


# ─────────────────────────────────────────────
# Subscores
# ─────────────────────────────────────────────

def score_environment(data: TripData) -> float:
    """
    Combines CO₂ emission and physical wear into a single 0–100 score.

    CO₂ score:
        co2_score = clamp(100 - co2_emission / 3)

        Dividing by 3 maps the realistic CO₂ range (0–300 g/km) onto
        the 0–100 point scale. A petrol car typically emits ~150 g/km
        (score 50), while an electric vehicle emits 0 g/km (score 100).
        300 g/km is used as the upper bound (score 0) because that
        represents very heavy, inefficient combustion — anything beyond
        that is capped at 0 by clamp().

    Wear score:
        wear_score = clamp((1 - wear_factor) * 100)

        wear_factor is already normalised to [0–1] so we simply invert
        it: 0 wear → 100 pts, maximum wear → 0 pts.

    Weighting (0.7 / 0.3):
        CO₂ emission is weighted more heavily (70%) because it is a
        direct, measurable environmental impact. Wear contributes 30%
        as a secondary environmental concern (tyre/brake particles).
    """
    co2_score  = clamp(100 - data.co2_emission_g_per_km / 3)
    wear_score = clamp((1 - data.wear_factor) * 100)
    return 0.7 * co2_score + 0.3 * wear_score


def score_economic(data: TripData) -> float:
    """
    Combines profit margin and budget usage into a single 0–100 score.

    Profit score:
        total_cost   = cost_per_km * distance_km
        profit       = revenue - total_cost
        profit_score = clamp(profit / revenue * 100)

        Dividing profit by revenue expresses the margin as a percentage
        of the revenue (0% margin → 0 pts, 100% margin → 100 pts).
        This normalises the score regardless of the absolute euro values,
        so a €2 trip and a €20 trip are judged on the same relative scale.
        If revenue is 0 the profit score is set to 0 to avoid division
        by zero.

    Budget score:
        budget_score = clamp(100 - budget_used_pct)

        budget_used_pct is already on a 0–100 scale, so inverting it
        directly gives the score: using 0% of the budget → 100 pts,
        using 100% → 0 pts.

    Weighting (0.6 / 0.4):
        Profit margin is slightly more important (60%) because it
        directly measures the revenue efficiency of a trip. Budget
        management (40%) reflects longer-term financial health.
    """
    total_cost = data.cost_per_km * data.distance_km
    profit     = data.revenue_per_package - total_cost

    if data.revenue_per_package > 0:
        # Express profit as a percentage of revenue to normalise across
        # trips with different price points.
        profit_score = clamp(profit / data.revenue_per_package * 100)
    else:
        # No revenue means no meaningful profit ratio can be calculated.
        profit_score = 0.0

    budget_score = clamp(100 - data.budget_used_pct)
    return 0.6 * profit_score + 0.4 * budget_score


def score_social(data: TripData, weights: Weights) -> float:
    """
    Applies a configurable penalty when the vehicle drives during
    rush hour.

    Rush hour increases congestion and road risk for other road users,
    so it is considered a negative social impact. The penalty magnitude
    is set via weights.rush_penalty so it can be tuned without changing
    the formula. A penalty of 0 means rush hour has no effect; a
    penalty of 100 would always reduce the score to 0.

    The score starts at a perfect 100 and only decreases if the
    is_rush_hour flag is active, making this a binary on/off penalty
    rather than a continuous variable.

    School zones will be added here in the same way once implemented —
    as an additional binary flag with its own configurable penalty.
    """
    penalty = weights.rush_penalty if data.is_rush_hour else 0.0
    return clamp(100 - penalty)


def score_energy(data: TripData) -> float:
    """
    Measures how efficiently the battery was used during the trip.

    delta_soc  = soc_start - soc_end
    efficiency = 1 - (delta_soc / soc_start)
    S_energy   = clamp(efficiency * 100)

    Dividing delta_soc by soc_start normalises the consumption
    relative to how full the battery was at the start. This is
    important because using 30% of a full battery (90% → 60%) is
    more efficient than using 30% of a half-full battery (50% → 20%),
    and the formula reflects that difference.

    Multiplying by 100 converts the 0–1 efficiency ratio to the
    0–100 point scale. If soc_start is 0 (battery already empty)
    efficiency defaults to 0 to avoid division by zero.
    """
    delta_soc = data.soc_start_pct - data.soc_end_pct
    if data.soc_start_pct > 0:
        # Normalise consumption against starting charge level so that
        # a trip starting on a full battery is not unfairly penalised
        # compared to one starting half-full.
        efficiency = 1 - (delta_soc / data.soc_start_pct)
    else:
        # Cannot compute a meaningful ratio if the battery was empty
        # at the start of the trip.
        efficiency = 0.0
    return clamp(efficiency * 100)


def score_safety(data: TripData) -> float:
    """
    Starts at a perfect 100 and applies deductions for detected
    safety violations.

    Wrong-way driving (fixed 30 pt deduction):
        This is a hard, binary event — the vehicle either drove the
        wrong way or it did not. A fixed 30-point deduction reflects
        that wrong-way driving is a serious safety violation regardless
        of how long it lasted.

    Idle time (up to 20 pt deduction):
        deduction_idle = clamp((idle_time_sec / 120) * 20, 0, 20)

        Dividing by 120 maps the idle range [0–120 seconds] onto
        [0–1], then multiplying by 20 scales it to a maximum deduction
        of 20 points. 120 seconds was chosen as the upper bound because
        anything beyond 2 minutes of unnecessary idling is considered
        the worst-case scenario. Anything above 120 s is capped at the
        maximum 20-point deduction by clamp().

    The two deductions are intentionally kept separate so they can be
    adjusted independently in the future.
    """
    # Fixed penalty for wrong-way driving — binary event, no scaling needed.
    deduction_wrong = 30 if data.is_wrong_way else 0

    # Scale idle time to a max deduction of 20 pts over a 120-second window.
    # Dividing by 120 normalises seconds to [0–1]; multiplying by 20
    # maps that onto the [0–20] deduction range.
    deduction_idle  = clamp((data.idle_time_sec / 120) * 20, 0, 20)

    return clamp(100 - deduction_wrong - deduction_idle)


def score_maintenance(data: TripData) -> float:
    """
    Estimates wear on the vehicle based on driving speed.

    S_maintenance = clamp(100 - speed_value * 0.6)

    The vehicle does not report speed in km/h but as an abstract
    value on a 0–100 scale. The factor 0.6 was chosen to map this
    range onto a meaningful score range:

        speed  0  → 100 - (0   * 0.6) = 100 pts  (no wear)
        speed 50  → 100 - (50  * 0.6) =  70 pts  (moderate wear)
        speed 100 → 100 - (100 * 0.6) =  40 pts  (maximum wear)

    The minimum score at full speed is intentionally set to 40 rather
    than 0, because even at maximum speed the vehicle is not causing
    catastrophic damage — it is simply wearing faster than optimal.
    A score of 0 would imply the vehicle is broken, which is not the
    case. The 0.6 factor directly encodes this design decision.
    """
    # Multiply speed by 0.6 so that the full speed range [0–100] maps
    # to a deduction range of [0–60], keeping the minimum score at 40.
    return clamp(100 - data.speed_value * 0.6)


# ─────────────────────────────────────────────
# Main formula
# ─────────────────────────────────────────────

def calculate_score(data: TripData, weights: Weights, car_id) -> dict:
    """
    Combines all subscores into a single weighted total for one car.

    Formula:
        S_total = Σ(w_i * S_i) / Σ(w_i)

    Dividing by the sum of weights (rather than a fixed 100) means
    the weights do not need to sum to any specific value. Only their
    relative ratios matter. This makes it easier to tune: you can
    double one weight without having to rebalance all the others.

    If the sum of weights is 0 (all weights set to 0), the total
    defaults to 0 to avoid division by zero.

    car_id is passed straight through into the result so the caller
    can tell which car a score belongs to. This matters once multiple
    cars are scored (e.g. a fleet of 5) — without an identifier, the
    results would be indistinguishable once collected into a list.
    car_id is intentionally left untyped (no type hint) since it could
    be an int, a string, or whatever identifier scheme the rest of the
    system uses (e.g. "car_01" or 3).

    Returns a flat dict so the caller can access any value directly
    with result["total"] or result["safety"] without extra nesting.
    Scores are rounded to 2 decimal places for readability.

    Parameters
    ----------
    data    : TripData   — trip measurements (from config.py)
    weights : Weights    — category weights (from config.py)
    car_id  : any        — identifier for the car this score belongs to

    Returns
    -------
    Flat dict with keys in order:
        car_id, environment, economic, social, energy, safety, maintenance, total
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
        # Guard against division by zero if all weights are set to 0.
        total = 0.0
    else:
        total = sum(w * s for w, s in zip(weight_list, score_list)) / total_weight

    return {
        "car_id":      car_id,
        "environment": round(environment, 2),
        "economic":    round(economic, 2),
        "social":      round(social, 2),
        "energy":      round(energy, 2),
        "safety":      round(safety, 2),
        "maintenance": round(maintenance, 2),
        "total":       round(total, 2),
    }