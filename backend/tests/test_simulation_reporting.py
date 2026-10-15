import unittest
from types import SimpleNamespace
from unittest.mock import patch

from backend.digital_sim.service.simulation_statistics import get_simulation_statistics
from backend.digital_sim.service.simulation_scoring import calculate_simulation_scores
from backend.digital_sim.service.simulation_service import SimulationService


class SimulationReportingTests(unittest.TestCase):
    def test_no_model_preserves_response_shape(self):
        self.assertEqual(SimulationService().get_current_statistics(), {
            "simulation_stats": None, "trip_scores": None,
        })

    def test_empty_model_has_no_statistics_or_scores(self):
        model = SimpleNamespace(agents=[])
        self.assertIsNone(get_simulation_statistics(model))
        self.assertIsNone(calculate_simulation_scores(model))

    def test_totals_are_rounded_after_adding_all_agents(self):
        agents = [SimpleNamespace(id=i, distance_travelled_km=0.004,
                  packages_delivered=2, time_driving_seconds=0.004)
                  for i in (1, 2)]
        model = SimpleNamespace(agents=agents, steps=10,
                                get_total_packages_undelivered=lambda: 3)
        result = get_simulation_statistics(model)
        self.assertEqual(result["agents"][0]["distance_travelled_km"], 0.0)
        self.assertEqual(result["totals"], {
            "total_distance": 0.01, "total_packages_delivered": 4,
            "total_time_driving": 0.01, "total_undelivered_packages": 3,
        })

    def test_score_input_combines_agents_without_changing_calculation(self):
        agents = [SimpleNamespace(
            distance_travelled_km=distance, packages_delivered=packages,
            time_delivering_seconds=idle, initial_state_of_charge=start,
            state_of_charge=end, went_out_of_lane=outside)
            for distance, packages, idle, start, end, outside in [
                (1.0, 2, 3.0, 100.0, 90.0, False),
                (2.0, 4, 5.0, 80.0, 70.0, True),
            ]]
        model = SimpleNamespace(agents=agents, car_target_speed=0.5)
        with patch('backend.digital_sim.service.simulation_scoring.calculate_score') as score:
            score.return_value = {"total": 42}
            self.assertEqual(calculate_simulation_scores(model), {"total": 42})
            score.assert_called_once()
            trip = score.call_args.args[0]
            self.assertEqual(trip.distance_km, 3.0)
            self.assertEqual(trip.idle_time_sec, 8.0)
            self.assertEqual(trip.soc_start_pct, 90.0)
            self.assertEqual(trip.soc_end_pct, 80.0)
            self.assertEqual(trip.speed_value, 50.0)
            self.assertTrue(trip.is_wrong_way)


if __name__ == "__main__":
    unittest.main()
