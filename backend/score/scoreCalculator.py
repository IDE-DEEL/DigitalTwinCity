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
    from scoreCalculator import calculate_score, TripData, Weights
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

    # ── Economic ─────────────────────────────────────────────────────
    distance_km:             float   # Distance travelled in km
    cost_per_km:             float   # Variable cost per km (€)
    revenue_per_package:     float   # Revenue per trip (€)
    start_budget:            float   # Total budget available for the fleet/period (€)
    budget_spent:            float   # Total amount spent so far from the budget (€)

    # ── Social ───────────────────────────────────────────────────────
    is_rush_hour:            bool    # Driving during rush hour? (True/False)
    # school_zone: bool               # To be implemented later

    # ── Energy ───────────────────────────────────────────────────────
    soc_start_pct:           float   # State of Charge at start of trip [0–100]
    soc_end_pct:             float   # State of Charge at end of trip [0–100]

    # ── Safety ───────────────────────────────────────────────────────
    pid_crash_value:         float   # PID deviation related to cornering [0–10]
    is_wrong_way:            bool    # Wrong-way driving detected? (True/False)
    idle_time_sec:           float   # Unnecessary idle time in seconds

    # ── Maintenance ──────────────────────────────────────────────────
    speed_value:             float   # Abstract speed value from vehicle [0–100]
    pid_wear_value:          float   # PID correction intensity [0–1]


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

def score_environment(data: TripData, route_length_km: float | None = None) -> float:
    """
    Converts CO₂ emission into a 0–100 score.
    Optionally applies a route-length penalty when route_length_km is provided.

    CO₂ score:
        S_env = clamp(100 - co2_emission / 3)

        Dividing by 3 maps the realistic CO₂ range (0–300 g/km) onto
        the 0–100 point scale. A petrol car typically emits ~150 g/km
        (score 50), while an electric vehicle emits 0 g/km (score 100).
        300 g/km is used as the upper bound (score 0) because that
        represents very heavy, inefficient combustion — anything beyond
        that is capped at 0 by clamp().

    Route-length penalty (optional):
        route_penalty = clamp((route_length_km / 50) * 40, 0, 40)

        Only applied when route_length_km is provided (i.e. when a
        car_id is passed to calculate_score). Longer routes mean more
        total CO₂ emitted over the journey, even at the same g/km rate,
        so they carry a stronger environmental penalty than economic or
        maintenance. The ceiling of 40 points reflects that distance is
        the primary driver of total emissions.

            route   0 km → no deduction        (zero extra emissions)
            route  25 km → 20-point deduction   (moderate total output)
            route  50 km → 40-point deduction   (maximum penalty)
    """
    base_score = clamp(100 - data.co2_emission_g_per_km / 3)

    if route_length_km is not None:
        # Scale route length to a max deduction of 40 pts over a 50 km window.
        # Environment gets the largest cap because total CO₂ output scales
        # directly with distance — twice the route means twice the emissions.
        route_penalty = clamp((route_length_km / 50) * 40, 0, 40)
        return clamp(base_score - route_penalty)

    return base_score


def score_economic(data: TripData, route_length_km: float | None = None) -> float:
    """
    Combines profit margin and budget usage into a single 0–100 score.
    Optionally applies a route-length penalty when route_length_km is provided.

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
        budget_used_pct = (budget_spent / start_budget) * 100
        budget_score     = clamp(100 - budget_used_pct)

        The percentage used is calculated directly from start_budget
        (the total available budget, set in config.py) and budget_spent
        (actual euros spent so far). This means you only need to track
        real spending in euros — the percentage is derived automatically
        rather than requiring you to calculate it yourself beforehand.
        Using 0% of the budget → 100 pts, using 100% (or more) → 0 pts.
        If start_budget is 0, budget_score defaults to 0 to avoid
        division by zero.

    Weighting (0.6 / 0.4):
        Profit margin is slightly more important (60%) because it
        directly measures the revenue efficiency of a trip. Budget
        management (40%) reflects longer-term financial health.

    Route-length penalty (optional):
        route_penalty = clamp((route_length_km / 50) * 30, 0, 30)

        Only applied when route_length_km is provided (i.e. when a
        car_id is passed to calculate_score). Longer routes reduce the
        economic score because they increase operating costs, raise the
        risk of delays, and consume more resources per delivery.

        Dividing by 50 maps the reference range [0–50 km] onto [0–1],
        then multiplying by 30 scales that to a maximum deduction of
        30 points. A route of 50 km or longer always incurs the full
        30-point deduction; anything above that is capped by clamp().

            route   0 km → no deduction       (100% efficient)
            route  25 km → 15-point deduction  (moderate impact)
            route  50 km → 30-point deduction  (maximum penalty)
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

    if data.start_budget > 0:
        # Derive the percentage used directly from euros spent vs.
        # the configured start budget, instead of requiring the caller
        # to pre-calculate a percentage.
        budget_used_pct = (data.budget_spent / data.start_budget) * 100
    else:
        # No budget configured means no meaningful ratio can be calculated.
        budget_used_pct = 100.0

    budget_score = clamp(100 - budget_used_pct)
    base_score   = 0.6 * profit_score + 0.4 * budget_score

    if route_length_km is not None:
        # Scale route length to a max deduction of 30 pts over a 50 km window.
        # Dividing by 50 normalises km to [0–1]; multiplying by 30
        # maps that onto the [0–30] deduction range.
        route_penalty = clamp((route_length_km / 50) * 30, 0, 30)
        return clamp(base_score - route_penalty)

    return base_score


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


def score_energy(data: TripData, route_length_km: float | None = None) -> float:
    """
    Measures how efficiently the battery was used during the trip.
    Optionally applies a route-length penalty when route_length_km is provided.

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

    Route-length penalty (optional):
        route_penalty = clamp((route_length_km / 50) * 25, 0, 25)

        Only applied when route_length_km is provided (i.e. when a
        car_id is passed to calculate_score). Longer routes drain more
        total charge from the battery regardless of per-km efficiency,
        increasing the risk of arriving with insufficient charge and
        reducing fleet flexibility. The ceiling is set to 25 points —
        moderate, since the SoC delta already captures much of the
        distance effect directly through the efficiency formula.

            route   0 km → no deduction        (no extra drain expected)
            route  25 km → 12.5-point deduction (moderate extra drain)
            route  50 km → 25-point deduction   (maximum penalty)
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

    base_score = clamp(efficiency * 100)

    if route_length_km is not None:
        # Scale route length to a max deduction of 25 pts over a 50 km window.
        # Kept lower than environment (40) since SoC delta already partly
        # reflects how much distance was covered.
        route_penalty = clamp((route_length_km / 50) * 25, 0, 25)
        return clamp(base_score - route_penalty)

    return base_score


def score_safety(data: TripData) -> float:
    """
    Starts at a perfect 100 and applies deductions for detected
    safety violations.

    PID crash error (up to 80 pt deduction):
        deduction_pid = clamp(8 * pid_crash_value, 0, 80)

        The vehicle's steering system uses PID control to stay on the
        planned path. High PID values indicate large deviations — the
        vehicle is constantly over/under-correcting, which suggests
        unsafe, erratic driving (e.g. swerving through curves).

        Multiplying by 8 maps the range [0–10] to [0–80] pts deduction.
        pid_crash_value of 10 (worst case) loses 80 points, leaving a
        minimum score of 20. A score of 0 would imply the vehicle is
        completely broken, not just driving erratically.

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

    The three deductions are intentionally kept separate so they can be
    adjusted independently in the future.
    """
    # Scale PID crash error to a max deduction of 80 pts over a [0–10] range.
    deduction_pid   = clamp(8 * data.pid_crash_value, 0, 80)

    # Fixed penalty for wrong-way driving — binary event, no scaling needed.
    deduction_wrong = 30 if data.is_wrong_way else 0

    # Scale idle time to a max deduction of 20 pts over a 120-second window.
    # Dividing by 120 normalises seconds to [0–1]; multiplying by 20
    # maps that onto the [0–20] deduction range.
    deduction_idle  = clamp((data.idle_time_sec / 120) * 20, 0, 20)

    return clamp(100 - deduction_pid - deduction_wrong - deduction_idle)


def score_maintenance(data: TripData, route_length_km: float | None = None) -> float:
    """
    Estimates wear on the vehicle based on driving speed and steering control.
    Optionally applies a route-length penalty when route_length_km is provided.

    Speed-based wear:
        S_speed = clamp(100 - speed_value * 0.6)

        The vehicle does not report speed in km/h but as an abstract
        value on a 0–100 scale. The factor 0.6 was chosen to map this
        range onto a meaningful score range:

            speed  0  → 100 - (0   * 0.6) = 100 pts  (no wear)
            speed 50  → 100 - (50  * 0.6) =  70 pts  (moderate wear)
            speed 100 → 100 - (100 * 0.6) =  40 pts  (maximum wear)

        The minimum score at full speed is intentionally set to 40 rather
        than 0, because even at maximum speed the vehicle is not causing
        catastrophic damage — it is simply wearing faster than optimal.

    PID-based wear:
        S_pid = clamp((1 - pid_wear_value) * 100)

        The PID correction intensity measures how much the steering system
        must work to keep the vehicle on course. Low PID values (0) indicate
        smooth, stable driving with minimal correction — good for wear.
        High PID values (1) indicate constant steering adjustments, which
        stresses the steering mechanism and causes premature wear.

    Combined maintenance:
        S_maintenance = 0.5 * S_speed + 0.5 * S_pid

        Speed and PID wear are weighted equally (50/50) because both
        directly contribute to mechanical degradation. A vehicle driving
        fast AND constantly correcting steering is in the worst condition.

    Route-length penalty (optional):
        route_penalty = clamp((route_length_km / 50) * 20, 0, 20)

        Only applied when route_length_km is provided (i.e. when a
        car_id is passed to calculate_score). Longer routes accumulate
        more wear on tyres, brakes, and drive components regardless of
        speed or steering style. The ceiling is the lowest of the four
        affected categories (20 pts) because speed and PID already
        capture the primary wear drivers; route length adds only the
        baseline accumulation effect.

            route   0 km → no deduction        (no accumulated wear)
            route  25 km → 10-point deduction   (moderate accumulation)
            route  50 km → 20-point deduction   (maximum penalty)
    """
    # Speed-based wear: higher speed = more engine/brake wear
    speed_score = clamp(100 - data.speed_value * 0.6)

    # PID-based wear: invert pid_wear_value so 0 (stable) → 100 pts,
    # 1 (constant correction) → 0 pts
    pid_score = clamp((1 - data.pid_wear_value) * 100)

    # Combine: both factors matter equally for overall mechanical health
    base_score = 0.5 * speed_score + 0.5 * pid_score

    if route_length_km is not None:
        # Scale route length to a max deduction of 20 pts over a 50 km window.
        # Lowest cap of the four categories — speed/PID already cover the
        # main wear drivers; this adds the raw distance accumulation effect.
        route_penalty = clamp((route_length_km / 50) * 20, 0, 20)
        return clamp(base_score - route_penalty)

    return base_score


# ─────────────────────────────────────────────
# Main formula
# ─────────────────────────────────────────────

def calculate_score(data: TripData, weights: Weights, car_id=None, route_length_km: float | None = None) -> dict:
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

    car_id is optional (default None). If provided, it is included
    in the returned dict so the caller can identify which car a score
    belongs to. If not provided, the result dict will not have a
    car_id field. This allows flexible usage: score a single car
    without needing to track an ID, or score multiple cars with IDs.

    route_length_km is optional (default None). It is only applied when
    car_id is also provided, and affects four categories:

        environment  — max 40 pt deduction  (total CO₂ scales with distance)
        economic     — max 30 pt deduction  (operating costs and delays)
        energy       — max 25 pt deduction  (total charge drain over the route)
        maintenance  — max 20 pt deduction  (accumulated component wear)

    Passing route_length_km without car_id has no effect; the penalty is
    silently skipped. See each score_*() function for its full formula.

    Returns a flat dict so the caller can access any value directly
    with result["total"] or result["safety"] without extra nesting.
    Scores are rounded to 2 decimal places for readability.

    Parameters
    ----------
    data             : TripData          — trip measurements (from config.py)
    weights          : Weights           — category weights (from config.py)
    car_id           : any               — (optional, default None) identifier for the car
    route_length_km  : float | None      — (optional, default None) planned route length in km;
                                           only affects the economic score when car_id is provided

    Returns
    -------
    Flat dict with keys:
        [car_id (if provided)], environment, economic, social, energy, safety, maintenance, total
    """
    # Only pass route_length_km to score_economic when a car_id is present.
    # Without a car_id the caller is doing a generic calculation where
    # route context is not meaningful, so the penalty is skipped.
    effective_route_length = route_length_km if car_id is not None else None

    environment = score_environment(data, effective_route_length)
    economic    = score_economic(data, effective_route_length)
    social      = score_social(data, weights)
    energy      = score_energy(data, effective_route_length)
    safety      = score_safety(data)
    maintenance = score_maintenance(data, effective_route_length)

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

    result = {
        "environment": round(environment, 2),
        "economic":    round(economic, 2),
        "social":      round(social, 2),
        "energy":      round(energy, 2),
        "safety":      round(safety, 2),
        "maintenance": round(maintenance, 2),
        "total":       round(total, 2),
    }

    # Only include car_id in the result if it was provided
    if car_id is not None:
        result = {"car_id": car_id, **result}

    return result


# ═════════════════════════════════════════════════════════════════════════════
# MQTT Integration — Vehicle Telemetry Collection
# ═════════════════════════════════════════════════════════════════════════════
"""
MQTT handler that collects vehicle telemetry data and triggers score
calculations when a trip completes.

Subscribes to topics like:
  car/{vehicle_name}/data/battery
  car/{vehicle_name}/data/speed
  car/{vehicle_name}/data/LastRFID
  etc.
"""

try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False
    print("  paho-mqtt not installed. MQTT features disabled.")

from dataclasses import dataclass


# ─────────────────────────────────────────────
# MQTT Configuration
# ─────────────────────────────────────────────

MQTT_BROKER = "localhost"       # Replace with your MQTT broker address
MQTT_PORT   = 1883              # Standard MQTT port
MQTT_QOS    = 1                 # Quality of Service

# Topics to subscribe to
MQTT_TOPICS = [
    "car/+/data/LastRFID",
    "car/+/data/battery",
    "car/+/data/charging",
    "car/+/data/speed",
    "car/+/data/lost",
    "car/+/data/pid",
]


# ─────────────────────────────────────────────
# Vehicle State Tracking
# ─────────────────────────────────────────────

@dataclass
class VehicleState:
    """
    Tracks real-time telemetry for one vehicle.

    Accumulates MQTT messages until a complete trip is available,
    then triggers score calculation.
    """
    car_id: str

    # Trip boundaries — set by RFID tags or delivery markers
    trip_start_rfid:     str = None
    trip_end_rfid:       str = None

    # Energy tracking
    soc_start_pct:       float = None
    soc_end_pct:         float = None

    # Distance & cost
    distance_km:         float = 0.0
    cost_per_km:         float = 0.0
    revenue_per_package: float = 0.0

    # Emissions (estimated)
    co2_emission_g_per_km: float = 80.0

    # Budget
    start_budget:        float = 0.0   # Total budget available (set from config)
    budget_spent:        float = 0.0   # Euros spent so far

    # Real-time telemetry
    current_speed:       float = 0.0
    is_charging:         bool = False
    is_lost:             bool = False

    # PID metrics for scoring
    pid_crash_value:     float = 0.0   # Steering deviation [0–10], for safety score
    pid_wear_value:      float = 0.0   # Steering correction intensity [0–1], for maintenance score

    # Trip flags
    is_rush_hour:        bool = False
    is_wrong_way:        bool = False
    idle_time_sec:       float = 0.0


# Store state for all vehicles
vehicle_states = {}


# ─────────────────────────────────────────────
# MQTT Callbacks
# ─────────────────────────────────────────────

def mqtt_on_connect(client, userdata, flags, reason_code, properties):
    """Called when MQTT client connects to broker."""
    if reason_code == 0:
        print(" Connected to MQTT broker")
        for topic in MQTT_TOPICS:
            client.subscribe(topic, MQTT_QOS)
            print(f"   Subscribed: {topic}")
    else:
        print(f"❌ Connection failed: reason_code {reason_code}")


def mqtt_on_message(client, userdata, msg):
    """
    Called when a message arrives on a subscribed topic.
    Parses topic to extract vehicle name and data type, then routes to handler.
    """
    topic = msg.topic
    payload = msg.payload.decode("utf-8").strip()

    # Parse topic: car/{vehicle_name}/data/{metric}
    parts = topic.split('/')
    if len(parts) < 4:
        print(f"  Invalid topic format: {topic}")
        return

    vehicle_name = parts[1]
    data_type    = parts[3]

    # Ensure vehicle state exists
    if vehicle_name not in vehicle_states:
        vehicle_states[vehicle_name] = VehicleState(car_id=vehicle_name)

    # Route to handler
    try:
        if data_type == "LastRFID":
            mqtt_handle_rfid_tag(vehicle_name, payload)
        elif data_type == "battery":
            mqtt_handle_battery_soc(vehicle_name, payload)
        elif data_type == "charging":
            mqtt_handle_charging_state(vehicle_name, payload)
        elif data_type == "speed":
            mqtt_handle_speed(vehicle_name, payload)
        elif data_type == "lost":
            mqtt_handle_lost_signal(vehicle_name, payload)
        elif data_type == "pid":
            mqtt_handle_pid_error(vehicle_name, payload)
    except Exception as e:
        print(f" Error processing {data_type} for {vehicle_name}: {e}")


# ─────────────────────────────────────────────
# Message Handlers
# ─────────────────────────────────────────────

def mqtt_handle_rfid_tag(vehicle_name: str, rfid_uid: str):
    """
    Track RFID tags to mark trip start/end.
    First scan = pickup, second scan = delivery.
    When both are set, attempt score calculation.
    """
    state = vehicle_states[vehicle_name]

    if state.trip_start_rfid is None:
        state.trip_start_rfid = rfid_uid
        print(f" [{vehicle_name}] Trip started at RFID {rfid_uid}")
    else:
        state.trip_end_rfid = rfid_uid
        print(f" [{vehicle_name}] Trip ended at RFID {rfid_uid}")
        mqtt_attempt_score_calculation(vehicle_name)


def mqtt_handle_battery_soc(vehicle_name: str, payload: str):
    """
    Track State of Charge (battery level).
    First non-100% reading marks trip start.
    Always update current ending SoC.
    """
    try:
        soc = float(payload)
    except ValueError:
        print(f"️  Invalid battery value: {payload}")
        return

    state = vehicle_states[vehicle_name]

    if state.soc_start_pct is None and soc < 100:
        state.soc_start_pct = soc
        print(f" [{vehicle_name}] Trip start SoC: {soc}%")

    state.soc_end_pct = soc
    print(f" [{vehicle_name}] Current SoC: {soc}%")


def mqtt_handle_charging_state(vehicle_name: str, payload: str):
    """Track whether the vehicle is plugged in."""
    is_charging = payload.lower() in ("true", "1", "yes", "on")
    state = vehicle_states[vehicle_name]

    if is_charging != state.is_charging:
        state.is_charging = is_charging
        status = " charging" if is_charging else " driving"
        print(f"   [{vehicle_name}] {status}")


def mqtt_handle_speed(vehicle_name: str, payload: str):
    """Track abstract speed [0–100] from vehicle."""
    try:
        speed = float(payload)
    except ValueError:
        print(f"⚠️  Invalid speed value: {payload}")
        return

    state = vehicle_states[vehicle_name]
    state.current_speed = speed


def mqtt_handle_lost_signal(vehicle_name: str, payload: str):
    """
    Track lost signal flag (communication or GPS issue).

    NOTE: This is NOT the same as is_wrong_way (spookrijden). The robot
    sends "lost" for signal/tracking loss, not for wrong-way driving.
    is_wrong_way currently has no MQTT source and stays False unless
    you set it from elsewhere (e.g. a separate detection system, or by
    deciding that a lost signal should count as a safety concern).
    """
    is_lost = payload.lower() in ("true", "1", "yes", "on")
    state = vehicle_states[vehicle_name]

    if is_lost != state.is_lost:
        state.is_lost = is_lost
        icon = " X" if is_lost else "ok"
        status = "signal lost" if is_lost else "signal restored"
        print(f"{icon} [{vehicle_name}] {status}")


def mqtt_handle_pid_error(vehicle_name: str, payload: str):
    """
    Track PID error for both safety and maintenance scoring.

    The car sends a single PID error value (uint8, e.g. 0–255 or 0–100
    depending on firmware — confirm the actual range with the robot's
    documentation). This single value is mapped to BOTH:

      - pid_crash_value [0–10]: used in score_safety() for cornering
        deviation. Raw values are divided by 10 to fit the expected
        [0–10] range (assumes raw PID tops out around 100; adjust the
        divisor if the real range differs).

      - pid_wear_value [0–1]: used in score_maintenance() for steering
        correction wear. Raw values are divided by 100 to fit [0–1]
        (same caveat — confirm the real max value from the robot).

    NOTE: Since only one PID metric is sent by the robot, both scoring
    formulas currently derive from the same raw signal. If the robot's
    real-world PID range turns out to be different (e.g. 0–255), update
    the divisors below accordingly.
    """
    try:
        pid_raw = float(payload)
    except ValueError:
        print(f" Invalid PID value: {payload}")
        return

    state = vehicle_states[vehicle_name]

    # Map raw PID (assumed ~0–100) to [0–10] for safety/crash scoring
    state.pid_crash_value = clamp(pid_raw / 10, 0, 10)

    # Map raw PID (assumed ~0–100) to [0–1] for maintenance/wear scoring
    state.pid_wear_value = clamp(pid_raw / 100, 0, 1)


# ─────────────────────────────────────────────
# Score Calculation
# ─────────────────────────────────────────────

def mqtt_attempt_score_calculation(vehicle_name: str):
    """
    Try to calculate a score when a trip completes.

    Requires:
      - soc_start_pct and soc_end_pct (battery readings)
      - At least one RFID scan (trip marker)
      - Config data (cost, revenue, weights)
    """
    state = vehicle_states[vehicle_name]

    # Check for missing data
    missing = []
    if state.soc_start_pct is None:
        missing.append("soc_start_pct")
    if state.soc_end_pct is None:
        missing.append("soc_end_pct")
    if state.trip_start_rfid is None:
        missing.append("trip_start_rfid")

    if missing:
        print(f"⏳ [{vehicle_name}] Waiting for: {', '.join(missing)}")
        return

    print(f"\n{'='*50}")
    print(f" Calculating score for {vehicle_name}...")
    print(f"{'='*50}")

    # Build TripData from vehicle state.
    #
    # IMPORTANT: Only 7 fields actually come from the car's MQTT messages
    # (battery, speed, pid, charging, lost, LastRFID — 'charging'/'lost'
    # aren't used directly in scoring). The fields below marked "estimate"
    # have NO live data source from the robot and rely on the defaults set
    # in VehicleState (or values you set manually elsewhere in your code).
    try:
        trip = TripData(
            co2_emission_g_per_km   = state.co2_emission_g_per_km,   # estimate — not sent by car
            distance_km             = state.distance_km,             # estimate — not sent by car
            cost_per_km             = state.cost_per_km,             # estimate — not sent by car
            revenue_per_package     = state.revenue_per_package,     # estimate — not sent by car
            start_budget            = state.start_budget,            # from config — not sent by car
            budget_spent            = state.budget_spent,            # estimate — not sent by car
            is_rush_hour            = state.is_rush_hour,            # estimate — not sent by car
            soc_start_pct           = state.soc_start_pct,           # real — from 'battery' topic
            soc_end_pct             = state.soc_end_pct,             # real — from 'battery' topic
            pid_crash_value         = state.pid_crash_value,         # real — derived from 'pid' topic
            is_wrong_way            = state.is_wrong_way,            # estimate — not sent by car (only 'lost' is)
            idle_time_sec           = state.idle_time_sec,           # estimate — not sent by car
            speed_value             = state.current_speed,           # real — from 'speed' topic
            pid_wear_value          = state.pid_wear_value,          # real — derived from 'pid' topic
        )
    except Exception as e:
        print(f" Failed to construct TripData: {e}")
        return

    # Import weights from config
    try:
        from config import WEIGHTS
    except ImportError:
        print(" Could not import WEIGHTS from config.py")
        return

    # Calculate score
    result = calculate_score(trip, WEIGHTS, vehicle_name)

    # Display results
    print(f"Total score:    {result['total']} / 100")
    print(f"  Environment:  {result['environment']}")
    print(f"  Economic:     {result['economic']}")
    print(f"  Social:       {result['social']}")
    print(f"  Energy:       {result['energy']}")
    print(f"  Safety:       {result['safety']}")
    print(f"  Maintenance:  {result['maintenance']}")
    print(f"{'='*50}\n")

    # Reset trip state for next trip
    state.trip_start_rfid = None
    state.trip_end_rfid   = None
    state.soc_start_pct   = None
    state.soc_end_pct     = None


# ─────────────────────────────────────────────
# MQTT Client Initialization
# ─────────────────────────────────────────────

def start_mqtt_client():
    """
    Create and connect the MQTT client.
    Runs indefinitely, listening for vehicle telemetry.

    Usage:
        from score_calculator import start_mqtt_client
        start_mqtt_client()  # Blocks forever
    """
    if not MQTT_AVAILABLE:
        print(" paho-mqtt is not installed. Cannot start MQTT client.")
        print("   Install with: pip install paho-mqtt")
        return

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = mqtt_on_connect
    client.on_message = mqtt_on_message

    print(f"Connecting to MQTT broker: {MQTT_BROKER}:{MQTT_PORT}")
    client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)

    print("Listening for vehicle telemetry...\n")
    client.loop_forever()