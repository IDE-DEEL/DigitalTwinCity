from backend.score.scoreCalculator import TripData, calculate_score
from backend.score.config import WEIGHTS, TRIP


def calculate_simulation_scores(model) -> dict | None:
    """Calculate one aggregated score for the entire simulation run,
    based on combined data from all agents."""
    if not model or not model.agents:
        return None

    agents = model.agents
    num_agents = len(agents)

    # ── Sum ──────────────────────────────
    total_distance_km = sum(agent.distance_travelled_km for agent in agents)
    total_packages_delivered = sum(agent.packages_delivered for agent in agents)
    total_idle_time = sum(agent.time_delivering_seconds for agent in agents)

    # ── Averages ───────────────────────────
    avg_soc_start = sum(agent.initial_state_of_charge for agent in agents) / num_agents
    avg_soc_end = sum(agent.state_of_charge for agent in agents) / num_agents
    avg_target_speed = model.car_target_speed

    # ── Cost/revenue over the entire run ────
    total_cost = TRIP.cost_per_km * total_distance_km
    total_revenue = TRIP.revenue_per_package * total_packages_delivered

    #  ── Emissions over the entire run ──────
    total_emissions = TRIP.co2_emission_g_per_km * total_distance_km

    # ── Booleans: if 1 agent = true, count for the run ──
    any_wrong_way = any(agent.went_out_of_lane for agent in agents)

    trip = TripData(
        co2_emission_g_per_km    = total_emissions,
        distance_km              = total_distance_km,
        cost_per_km              = TRIP.cost_per_km,
        revenue_per_package      = total_revenue,
        start_budget             = TRIP.start_budget,
        budget_spent             = total_cost,
        is_rush_hour             = TRIP.is_rush_hour,
        soc_start_pct            = avg_soc_start,
        soc_end_pct              = avg_soc_end,
        is_wrong_way             = any_wrong_way,
        idle_time_sec            = total_idle_time,
        speed_value              = avg_target_speed * 100,
        pid_crash_value          = TRIP.pid_crash_value,
        pid_wear_value           = TRIP.pid_wear_value
    )

    score = calculate_score(trip, WEIGHTS)

    return score
