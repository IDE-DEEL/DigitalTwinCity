import asyncio
import unittest
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import WebSocketDisconnect

from backend.digital_sim.controller.v1 import digital_sim_api
from backend.digital_sim.service.simulation_service import SimulationService
from backend.tests.test_demo_configuration import start_parameters


class ControlledClock:
    """Advance the real simulation loop without waiting for wall-clock time."""

    def __init__(self):
        self.waits = asyncio.Queue()

    async def sleep(self, seconds):
        gate = asyncio.Event()
        await self.waits.put(gate)
        await gate.wait()

    async def next_wait(self):
        return await asyncio.wait_for(self.waits.get(), timeout=2)


class TestSocket:
    """Exercise the endpoint with queued commands and recorded responses."""

    def __init__(self):
        self.commands = asyncio.Queue()
        self.responses = asyncio.Queue()

    async def accept(self):
        pass

    async def receive_json(self):
        command = await self.commands.get()
        if command is None:
            raise WebSocketDisconnect()
        return command

    async def send_json(self, response):
        await self.responses.put(deepcopy(response))

    async def receive(self, expected_command):
        response = await asyncio.wait_for(self.responses.get(), timeout=2)
        if response.get("command") != expected_command:
            raise AssertionError(f"Expected {expected_command!r}, received {response!r}")
        return response


class SimulationPauseResumeTests(unittest.IsolatedAsyncioTestCase):
    async def check_pause_resume(self, demo):
        service = SimulationService()
        clock = ControlledClock()
        socket = TestSocket()
        # Replace only this module's timing API, not asyncio globally.
        controlled_asyncio = SimpleNamespace(
            sleep=clock.sleep,
            create_task=asyncio.create_task,
            CancelledError=asyncio.CancelledError,
        )
        parameters = start_parameters(demo=demo)
        parameters["simulationSpeed"] = 1

        with (patch.object(digital_sim_api, "SimulationService", return_value=service) as factory,
              patch.object(digital_sim_api, "asyncio", controlled_asyncio)):
            endpoint = asyncio.create_task(
                digital_sim_api.websocket_simulation_endpoint(socket))
            try:
                await socket.commands.put({"command": "start", "parameters": parameters})
                await socket.receive("simulation_started")
                update = await socket.receive("simulation_update")
                gate = await clock.next_wait()
                model = service.model
                agent = next(iter(model.agents))
                start_position = deepcopy(agent.position)

                # In normal mode, let package loading finish before pausing.
                for _ in range(20):
                    if agent.position != start_position:
                        break
                    gate.set()
                    update = await socket.receive("simulation_update")
                    gate = await clock.next_wait()
                self.assertNotEqual(agent.position, start_position)

                # Repeat the cycle to catch failures after the first resume.
                for _ in range(2):
                    await socket.commands.put({"command": "pause"})
                    paused = await socket.receive("simulation_paused")
                    self.assertEqual(paused["result"]["status"], "simulation_paused")
                    self.assertTrue(service.is_paused)
                    self.assertTrue(service.is_running)
                    before = deepcopy(model.get_simulation_state())
                    distance = agent.distance_travelled
                    before_position = deepcopy(agent.position)

                    # Give the loop three opportunities to advance while paused.
                    for _ in range(3):
                        gate.set()
                        gate = await clock.next_wait()
                        self.assertEqual(model.get_simulation_state(), before)
                        self.assertEqual(agent.distance_travelled, distance)
                        self.assertTrue(socket.responses.empty())
                        self.assertFalse(endpoint.done())

                    # Commands must remain usable while the simulation is paused.
                    await socket.commands.put({"command": "get_stats"})
                    statistics = await socket.receive("get_stats")
                    self.assertEqual(statistics["data"]["simulation_stats"]["step_count"],
                                     before["step"])

                    await socket.commands.put({"command": "resume"})
                    resumed = await socket.receive("simulation_resumed")
                    self.assertEqual(resumed["result"]["status"], "simulation_running")
                    self.assertFalse(service.is_paused)
                    gate.set()
                    update = await socket.receive("simulation_update")
                    gate = await clock.next_wait()
                    self.assertIs(service.model, model)
                    self.assertIs(next(iter(model.agents)), agent)
                    self.assertGreater(update["result"]["step"], before["step"])
                    self.assertGreater(model.simulation_time, before["sim_time_seconds"])
                    self.assertNotEqual(agent.position, before_position)
                    self.assertGreater(agent.distance_travelled, distance)
                    factory.assert_called_once()

                await socket.commands.put({"command": "stop"})
                await socket.receive("simulation_stopped")
                self.assertFalse(service.is_running)
                self.assertFalse(service.is_paused)
            finally:
                await socket.commands.put(None)
                try:
                    await asyncio.wait_for(endpoint, timeout=2)
                finally:
                    if not endpoint.done():
                        endpoint.cancel()
                        await asyncio.gather(endpoint, return_exceptions=True)
            self.assertIsNone(service.model)

    async def test_pause_resume_preserves_normal_simulation(self):
        await self.check_pause_resume(demo=False)

    async def test_pause_resume_preserves_demo_simulation(self):
        await self.check_pause_resume(demo=True)


if __name__ == "__main__":
    unittest.main()
