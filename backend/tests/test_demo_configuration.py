import unittest

from backend.digital_sim.domain.car_model import CarModel
from backend.digital_sim.service.simulation_service import SimulationService


def start_parameters(demo=False, unreachable=False):
    zone_x = 10 if unreachable else 0.5
    return {
        "demoMode": demo,
        "carTargetSpeed": 50,
        "mapRows": 7,
        "cars": [{"id": 1, "maxPackages": 1, "routeName": "A",
                  "routeWaypoints": [{"x": 0, "y": 7}, {"x": 2, "y": 7}]}],
        "scenario": {"name": "test", "houses": [{
            "houseInstanceId": "H1", "expectedPackages": 2,
            "roadCoords": [{"x": zone_x, "y": 6.8},
                           {"x": zone_x + 0.5, "y": 6.8},
                           {"x": zone_x + 0.5, "y": 7.2},
                           {"x": zone_x, "y": 7.2}]}]},
        "housesOnRoutes": {"A": ["H1"]},
        "demoRoutes": [
            {"carId": 1, "routeName": "A", "routeWaypoints": [
                {"x": 0, "y": 7}, {"x": 2, "y": 7}]},
            {"carId": 1, "routeName": "B", "routeWaypoints": [
                {"x": 0, "y": 7}, {"x": 3, "y": 7}]},
        ],
    }


class DemoConfigurationTests(unittest.TestCase):
    def test_direct_model_has_independent_normal_defaults(self):
        first = CarModel([], 50, "test", [], 7)
        second = CarModel([], 50, "test", [], 7)
        self.assertFalse(first.demo_mode)
        self.assertEqual(first.demo_routes, {})
        self.assertIsNot(first.demo_routes, second.demo_routes)

    def test_missing_demo_routes_are_rejected_by_model(self):
        car = start_parameters()["cars"][0]
        with self.assertRaisesRegex(ValueError, "No demo routes supplied for car 1"):
            CarModel([car], 50, "test", [], 7, demo_mode=True)

    def test_service_converts_demo_routes_before_model_creation(self):
        service = SimulationService()
        service.start_simulation(start_parameters(demo=True))
        self.assertTrue(service.model.demo_mode)
        self.assertEqual(service.model.demo_routes[1][0]["waypoints"],
                         [{"x": 0, "y": 0}, {"x": 2, "y": 0}])

    def test_normal_mode_delivers_multiple_loads_and_completes(self):
        service = SimulationService()
        service.start_simulation(start_parameters())
        for _ in range(500):
            result = service.execute_step()
            if not service.is_running:
                break
        self.assertEqual(result["status"], "simulation_completed")
        self.assertEqual(result["agents"][0]["packages_delivered"], 2)
        self.assertEqual(result["agents"][0]["depot_load_count"], 2)
        self.assertIsInstance(service.export_data_as_csv(), str)

    def test_unreachable_delivery_still_deadlocks(self):
        service = SimulationService()
        service.start_simulation(start_parameters(unreachable=True))
        for _ in range(200):
            result = service.execute_step()
            if not service.is_running:
                break
        self.assertEqual(result["status"], "simulation_deadlocked")

    def test_demo_switches_routes_and_preserves_distance(self):
        service = SimulationService()
        service.start_simulation(start_parameters(demo=True))
        previous_distance = 0
        previous_route = "A"
        changes = 0
        for _ in range(500):
            result = service.execute_step()
            agent = next(iter(service.model.agents))
            self.assertGreaterEqual(agent.distance_travelled, previous_distance)
            previous_distance = agent.distance_travelled
            if agent.route.name != previous_route:
                changes += 1
                previous_route = agent.route.name
            self.assertEqual(result["status"], "simulation_running")
            self.assertEqual(agent.packages_delivered, 0)
        self.assertGreaterEqual(changes, 3)
        service.stop_simulation()
        service.start_simulation(start_parameters())
        self.assertFalse(service.model.demo_mode)
        self.assertEqual(service.model.demo_routes, {})


if __name__ == "__main__":
    unittest.main()
