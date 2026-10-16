import unittest

from backend.digital_sim.domain.movement_controller import MovementController


class MovementControllerTests(unittest.TestCase):
    def test_one_step_moves_car_forward_and_updates_distance(self):
        controller = MovementController(
            waypoints=[{"x": 1.0, "y": 2.0}, {"x": 11.0, "y": 2.0}],
            target_speed=0.5,
            dt=0.2,
        )
        # Save a separate position snapshot before updating the controller.
        position_before = controller.position_dict
        distance_before = controller.distance_travelled

        controller.update()

        position_after = controller.position_dict
        # A straight step at 0.5 units/second for 0.2 seconds covers 0.1 units.
        self.assertNotEqual(position_after, position_before)
        self.assertAlmostEqual(position_after["x"], position_before["x"] + 0.1)
        self.assertAlmostEqual(position_after["y"], position_before["y"])
        self.assertAlmostEqual(controller.distance_travelled - distance_before, 0.1)
        self.assertFalse(controller.finished)


if __name__ == "__main__":
    unittest.main()
