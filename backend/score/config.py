"""
config.py — Input values & weights
=====================================
Fill in all variables here for the score calculation.
Then import in your own script:

    from config import TRIP, WEIGHTS
    from score_calculator import calculate_score

    result = calculate_score(TRIP, WEIGHTS)
    print(result["total"])
"""

from backend.score.scoreCalculator import TripData, Weights


# ─────────────────────────────────────────────
# Trip data
# ─────────────────────────────────────────────

TRIP = TripData(

    # ── Environment ──────────────────────────
    co2_emission_g_per_km   = 2.0,   # float  | CO₂ emission in grams per km
                                     #         | 0 g/km → 100 pts, 300 g/km → 0 pts

    wear_factor             = 2.0,   # float  | Driving behaviour wear [0.0–1.0]
                                     #         | 0.0 = no wear, 1.0 = maximum wear

    # ── Economic ─────────────────────────────
    distance_km             = 2.0,   # float  | Distance travelled in km

    cost_per_km             = 2.0,   # float  | Variable cost per km in euros
                                     #         | e.g. 0.30 = 30 cents per km

    revenue_per_package     = 5.0,   # float  | Revenue per trip in euros
                                     #         | e.g. 8.0

    budget_used_pct         = 7.0,   # float  | Percentage of total budget used [0–100]
                                     #         | e.g. 40 = 40% of budget spent

    # ── Social ───────────────────────────────
    is_rush_hour            = False,   # bool   | Driving during rush hour? True or False

    # school_zone           = False ,   # bool   | To be implemented later

    # ── Energy ───────────────────────────────
    soc_start_pct           = 10.0,   # float  | State of Charge at start of trip [0–100]
                                     #         | e.g. 90 = battery 90% full

    soc_end_pct             = 8.0,   # float  | State of Charge at end of trip [0–100]
                                     #         | e.g. 60 = battery 60% full after trip

    # ── Safety ───────────────────────────────
    pid_crash_value         = 0.0,   # float  | PID deviation for cornering [0.0–10.0]
                                     #         | 0 = perfect steering, 10 = completely off track

    is_wrong_way            = False,   # bool   | Wrong-way driving detected? True or False

    idle_time_sec           = 2.0,   # float  | Unnecessary idle time in seconds
                                     #         | e.g. 10 = idled for 10 seconds unnecessarily

    # ── Maintenance ──────────────────────────
    speed_value             = 30.0,   # float  | Abstract speed value from vehicle [0–100]
                                     #         | 0 = slowest, 100 = fastest; higher = more wear

    pid_wear_value          = 0.0,   # float  | PID correction intensity [0.0–1.0]
                                     #         | 0.0 = stable steering, 1.0 = heavy correction
)


# ─────────────────────────────────────────────
# Weights
# ─────────────────────────────────────────────
# Do not need to sum to 100 — automatically normalised.
# Higher value = category counts more towards the final score.

WEIGHTS = Weights(

    environment  = 2.0,   # float  | Weight for environment score
    economic     = 10.0,   # float  | Weight for economic score
    social       = 1.0,   # float  | Weight for social score
    energy       = 15.0,   # float  | Weight for energy score
    safety       = 3.0,   # float  | Weight for safety score
    maintenance  = 2.0,   # float  | Weight for maintenance score

    rush_penalty = 0.0,   # float  | Point deduction for driving in rush hour [0–100]
                          #         | e.g. 20 = 20 point deduction on social score
)