from backend.digital_sim.constants import (
    AGENT_DISTANCE_TRAVELLED_KM_KEY,
    AGENT_TIME_DRIVING_SECONDS_KEY,
    AGENT_PACKAGES_DELIVERED_KEY,
    CAR_MAIN_ID_KEY,
)


def get_simulation_statistics(model) -> dict | None:
    """Return per-agent stats from the current simulation.

    Returns:
        Dict with stats or None if no simulation is active.

        Structure:
        {
            "step_count": int,
            "agents": [
                {
                    "id": agent.id,
                    "distance_travelled_km": float,
                    "packages_delivered": int,
                    "time_driving_seconds": float,
                },
                ...
            ],
            "totals": {
                "total_distance": float,
                "total_packages_delivered": int,
                "total_time_driving": float,
            }
        }
    """
    if not model:
        print("[SimulationService] get_current_stats: No model available")
        return None

    if not hasattr(model, 'agents') or not model.agents:
        print("[SimulationService] get_current_stats: No agents in model")
        return None

    stats = {
        "step_count": model.steps,
        "agents": [],
        "totals": {
            "total_distance": 0.0,
            "total_packages_delivered": 0,
            "total_time_driving": 0.0,
        }
    }

    for agent in model.agents:
        agent_stat = {
            CAR_MAIN_ID_KEY: getattr(agent, CAR_MAIN_ID_KEY),
            AGENT_DISTANCE_TRAVELLED_KM_KEY: round(getattr(agent, AGENT_DISTANCE_TRAVELLED_KM_KEY), 2),
            AGENT_TIME_DRIVING_SECONDS_KEY: round(getattr(agent, AGENT_TIME_DRIVING_SECONDS_KEY), 2),
            AGENT_PACKAGES_DELIVERED_KEY: getattr(agent, AGENT_PACKAGES_DELIVERED_KEY),
        }
        stats["agents"].append(agent_stat)
        stats["totals"]["total_distance"] += getattr(agent, AGENT_DISTANCE_TRAVELLED_KM_KEY)
        stats["totals"]["total_packages_delivered"] += getattr(agent, AGENT_PACKAGES_DELIVERED_KEY)
        stats["totals"]["total_time_driving"] += getattr(agent, AGENT_TIME_DRIVING_SECONDS_KEY)

    # Round totals to 2 decimal places
    stats["totals"]["total_distance"] = round(stats["totals"]["total_distance"], 2)
    stats["totals"]["total_time_driving"] = round(stats["totals"]["total_time_driving"], 2)
    stats["totals"]["total_undelivered_packages"] = model.get_total_packages_undelivered() 

    return stats
