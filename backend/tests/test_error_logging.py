import asyncio
import json
import logging
import unittest
from concurrent.futures import Future
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI, HTTPException, WebSocketDisconnect
from fastapi.testclient import TestClient

from backend.core.error_handling import add_error_handling
from backend.core.error_logging import log_unexpected_error
from backend.api.manager import ConnectionManager
from backend.digital_sim.controller.v1 import digital_sim_api
from backend.digital_sim.service.simulation_service import SimulationService, SimulationExportError
from backend.tests.test_demo_configuration import start_parameters
from backend.tests.test_simulation_pause_resume import TestSocket
from backend.vehicle_control.mqtt_client import MQTTClient
from backend.vehicle_control.state import VehicleState


class ErrorLoggingTests(unittest.TestCase):
    @staticmethod
    def formatted(records):
        return "\n".join(logging.Formatter().format(record) for record in records)

    def test_traceback_excludes_messages_source_lines_locals_and_chains(self):
        logger = logging.getLogger("backend.tests.safe_error")
        secret = "private-access-token"
        with self.assertLogs(logger, level="ERROR") as captured:
            try:
                try:
                    raise ValueError(secret)
                except ValueError as cause:
                    raise RuntimeError(secret) from cause
            except RuntimeError as error:
                log_unexpected_error(logger, "Test operation failed", error)
        output = self.formatted(captured.records)
        self.assertEqual(len(captured.records), 1)
        self.assertIn("Traceback", output)
        self.assertIn("test_traceback_excludes", output)
        self.assertIn("Exception type: RuntimeError", output)
        self.assertNotIn(secret, output)
        self.assertNotIn("raise RuntimeError", output)
        self.assertNotIn("ValueError", output)

    def test_unexpected_http_error_is_logged_once_and_returns_generic_response(self):
        app = FastAPI()
        add_error_handling(app)
        secret = "secret-query-value"

        @app.get("/fail")
        def fail():
            raise RuntimeError(secret)

        with TestClient(app) as client, self.assertLogs("backend.core.error_handling", level="ERROR") as logs:
            response = client.get("/fail", params={"token": secret})
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Internal server error"})
        self.assertEqual(len(logs.records), 1)
        self.assertNotIn(secret, self.formatted(logs.records))
        self.assertNotIn(secret, response.text)

    def test_expected_http_error_is_not_logged_as_unexpected(self):
        app = FastAPI()
        add_error_handling(app)

        @app.get("/missing")
        def missing():
            raise HTTPException(status_code=404, detail="Not found")

        with TestClient(app) as client, self.assertNoLogs("backend.core.error_handling", level="WARNING"):
            response = client.get("/missing")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Not found"})

    def test_export_failure_is_distinct_from_missing_data_and_logged_once(self):
        service = SimulationService()
        self.assertIsNone(service.export_data_as_csv())
        service.model = MagicMock()
        service.model.datacollector.get_agent_vars_dataframe.side_effect = RuntimeError("export-secret")
        with self.assertLogs("backend.digital_sim.service.simulation_service", level="ERROR") as logs:
            with self.assertRaises(SimulationExportError):
                service.export_data_as_csv()
        self.assertEqual(len(logs.records), 1)
        self.assertNotIn("export-secret", self.formatted(logs.records))

    def test_failed_listener_is_logged_and_other_listeners_still_run(self):
        state = VehicleState()
        failing = MagicMock(side_effect=RuntimeError("listener-secret"))
        good = MagicMock()
        state.add_listener(failing)
        state.add_listener(good)
        with self.assertLogs("backend.vehicle_control.state", level="ERROR") as logs:
            state.record_scan("auto_A", "rfid-secret")
        good.assert_called_once_with(state.car_data)
        self.assertEqual(len(logs.records), 1)
        self.assertNotIn("listener-secret", self.formatted(logs.records))
        self.assertNotIn("rfid-secret", self.formatted(logs.records))

    def test_mqtt_start_failure_clears_client_and_allows_retry(self):
        settings = SimpleNamespace(MQTT_HOST="test.invalid", MQTT_PORT=443)
        transport = MQTTClient(MagicMock(), settings=settings)
        bad, good = MagicMock(), MagicMock()
        bad.connect.side_effect = OSError("password-secret")
        good.connect.return_value = 0
        good.loop_start.return_value = 0
        with patch.object(transport, "create", side_effect=[bad, good]):
            with self.assertRaises(OSError):
                transport.start()
            self.assertIsNone(transport.client)
            bad.loop_stop.assert_called_once()
            bad.disconnect.assert_called_once()
            self.assertIs(transport.start(), good)
            self.assertIs(transport.start(), good)
            good.connect.assert_called_once()
            transport.stop()

    def test_mqtt_loop_start_failure_and_cleanup_failure_preserve_original_error(self):
        transport = MQTTClient(MagicMock(), settings=SimpleNamespace(MQTT_HOST="test.invalid", MQTT_PORT=443))
        client = MagicMock()
        client.connect.return_value = 0
        original = RuntimeError("loop failure")
        client.loop_start.side_effect = original
        client.loop_stop.side_effect = RuntimeError("cleanup failure")
        with patch.object(transport, "create", return_value=client):
            with self.assertRaises(RuntimeError) as caught:
                transport.start()
        self.assertIs(caught.exception, original)
        self.assertIsNone(transport.client)
        client.disconnect.assert_called_once()

    def test_mqtt_nonzero_connect_result_is_not_accepted(self):
        transport = MQTTClient(MagicMock(), settings=SimpleNamespace(MQTT_HOST="test.invalid", MQTT_PORT=443))
        client = MagicMock()
        client.connect.return_value = 1
        with patch.object(transport, "create", return_value=client):
            with self.assertRaises(ConnectionError):
                transport.start()
        self.assertIsNone(transport.client)
        client.loop_start.assert_not_called()

    def test_failed_mqtt_subscription_is_logged_without_topic(self):
        client = MagicMock()
        client.subscribe.side_effect = [(1, 1)] + [(0, 1)] * 4
        with self.assertLogs("backend.vehicle_control.mqtt_client", level="ERROR") as logs:
            MQTTClient.on_connect(client, None, None, 0, None)
        self.assertEqual(client.subscribe.call_count, 5)
        self.assertEqual(len(logs.records), 1)
        self.assertNotIn("car/", self.formatted(logs.records))

    def test_mqtt_callback_failure_is_handled_once_without_payload(self):
        handler = MagicMock(side_effect=RuntimeError("message-secret"))
        transport = MQTTClient(handler)
        message = SimpleNamespace(payload=b"payload-secret")
        with self.assertLogs("backend.vehicle_control.mqtt_client", level="ERROR") as logs:
            transport._handle_message(None, None, message)
        handler.assert_called_once_with(None, None, message)
        self.assertEqual(len(logs.records), 1)
        self.assertNotIn("secret", self.formatted(logs.records))

    def test_delayed_resume_failure_is_logged_without_car_identifier(self):
        from backend.vehicle_control.package_service import resume_after_wait
        client = MagicMock()
        client.publish.side_effect = RuntimeError("publish-secret")
        with patch("backend.vehicle_control.package_service.time.sleep"), self.assertLogs(
                "backend.vehicle_control.package_service", level="ERROR") as logs:
            resume_after_wait(client, "car-secret", 10)
        self.assertEqual(len(logs.records), 1)
        self.assertNotIn("secret", self.formatted(logs.records))

    def test_multiple_subscription_failures_are_one_error_record(self):
        client = MagicMock()
        client.subscribe.return_value = (1, 1)
        with self.assertLogs("backend.vehicle_control.mqtt_client", level="ERROR") as logs:
            MQTTClient.on_connect(client, None, None, 0, None)
        self.assertEqual(client.subscribe.call_count, 5)
        self.assertEqual(len(logs.records), 1)
        self.assertIn("5 of 5", logs.records[0].getMessage())

    def test_websocket_can_restart_after_background_step_failure(self):
        service = SimulationService()
        original_step = service.execute_step
        first_step = True

        def fail_once():
            nonlocal first_step
            if first_step:
                first_step = False
                raise RuntimeError("background-secret")
            return original_step()

        parameters = start_parameters(demo=True)
        parameters["simulationSpeed"] = 1
        app = FastAPI()
        app.include_router(digital_sim_api.router, prefix="/api/v1")
        with patch.object(digital_sim_api, "SimulationService", return_value=service), \
                patch.object(service, "execute_step", side_effect=fail_once), \
                self.assertLogs("backend.digital_sim.controller.v1.digital_sim_api", level="ERROR") as logs, \
                TestClient(app) as client:
            with client.websocket_connect("/api/v1/digital-sim/ws/simulation") as socket:
                socket.send_json({"command": "start", "parameters": parameters})
                self.assertEqual(socket.receive_json()["command"], "simulation_started")
                failed = socket.receive_json()
                self.assertEqual(failed["result"]["type"], "simulation_error")
                first_model = service.model
                self.assertFalse(service.is_running)
                socket.send_json({"command": "start", "parameters": parameters})
                self.assertEqual(socket.receive_json()["command"], "simulation_started")
                self.assertEqual(socket.receive_json()["command"], "simulation_update")
                self.assertIsNot(service.model, first_model)
                socket.send_json({"command": "stop"})
                for _ in range(5):
                    if socket.receive_json()["command"] == "simulation_stopped":
                        break
                else:
                    self.fail("Simulation did not acknowledge stop")
        self.assertEqual(len(logs.records), 1)
        self.assertNotIn("background-secret", self.formatted(logs.records))
        self.assertIsNone(service.model)


class AuthErrorLoggingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import os
        settings = {
            "POSTGRES_USER": "test", "POSTGRES_PASSWORD": "test", "POSTGRES_DB": "test",
            "DATABASE_URL": "sqlite://", "ADMIN_USERNAME": "test", "ADMIN_PASSWORD": "test",
            "SECRET_KEY": "test-only", "MQTT_HOST": "test.invalid",
            "MQTT_USERNAME": "test", "MQTT_PASSWORD": "test",
        }
        with patch.dict(os.environ, settings):
            from backend.services.auth_service import AuthService
            from backend.schemas.auth import LoginRequest
        cls.AuthService = AuthService
        cls.LoginRequest = LoginRequest

    def test_invalid_credentials_keep_401_without_extra_log(self):
        repository = MagicMock()
        repository.find_active_code_by_lookup_hash.return_value = None
        service = self.AuthService(repository)
        with self.assertNoLogs("backend.services.auth_service", level="WARNING"):
            with self.assertRaises(HTTPException) as caught:
                service.verify_and_login(self.LoginRequest(code="invalid"))
        self.assertEqual(caught.exception.status_code, 401)

    def test_corrupt_hash_logs_once_without_hash_or_code(self):
        repository = MagicMock()
        repository.find_active_code_by_lookup_hash.return_value = SimpleNamespace(code_hash="private-hash")
        service = self.AuthService(repository)
        with patch("backend.services.auth_service.bcrypt.checkpw", side_effect=ValueError("private-hash")), \
                self.assertLogs("backend.services.auth_service", level="ERROR") as logs:
            with self.assertRaises(HTTPException) as caught:
                service.verify_and_login(self.LoginRequest(code="private-code"))
        self.assertEqual(caught.exception.status_code, 401)
        self.assertEqual(len(logs.records), 1)
        output = ErrorLoggingTests.formatted(logs.records)
        self.assertNotIn("private-hash", output)
        self.assertNotIn("private-code", output)


class AsyncErrorLoggingTests(unittest.IsolatedAsyncioTestCase):
    async def test_step_failure_stops_loop_and_sends_safe_error_once(self):
        service = SimulationService()
        service.start_simulation(start_parameters(demo=True))
        socket = TestSocket()
        with patch.object(service, "execute_step", side_effect=RuntimeError("simulation-secret")), \
                patch.object(service, "stop_simulation", side_effect=RuntimeError("statistics-secret")), \
                self.assertLogs("backend.digital_sim.controller.v1.digital_sim_api", level="ERROR") as logs:
            await asyncio.wait_for(digital_sim_api._run_simulation_loop(
                socket, service, {"steps_multiplier": 1}), timeout=2)
        self.assertFalse(service.is_running)
        self.assertFalse(service.is_paused)
        response = await socket.receive("error")
        self.assertEqual(response["result"]["type"], "simulation_error")
        self.assertEqual(len(logs.records), 1)
        self.assertNotIn("secret", str(response))
        self.assertNotIn("simulation-secret", ErrorLoggingTests.formatted(logs.records))

    async def test_failed_socket_does_not_produce_a_second_error_log(self):
        service = SimulationService()
        service.start_simulation(start_parameters(demo=True))
        socket = SimpleNamespace(send_json=AsyncMock(side_effect=WebSocketDisconnect()))
        with patch.object(service, "execute_step", side_effect=RuntimeError("secret")), \
                self.assertLogs("backend.digital_sim.controller.v1.digital_sim_api", level="ERROR") as logs:
            await digital_sim_api._run_simulation_loop(socket, service, {"steps_multiplier": 1})
        self.assertEqual(len(logs.records), 1)
        self.assertFalse(service.is_running)

    async def test_normal_update_disconnect_is_not_logged_as_failure(self):
        service = SimulationService()
        service.start_simulation(start_parameters(demo=True))
        socket = SimpleNamespace(send_json=AsyncMock(side_effect=WebSocketDisconnect()))
        with self.assertNoLogs("backend.digital_sim.controller.v1.digital_sim_api", level="WARNING"):
            await digital_sim_api._run_simulation_loop(socket, service, {"steps_multiplier": 1})
        self.assertFalse(service.is_running)

    async def test_invalid_start_is_reported_without_logging_input(self):
        socket = TestSocket()
        await socket.commands.put({"command": "start", "parameters": {"carTargetSpeed": "secret-input"}})
        await socket.commands.put(None)
        with self.assertNoLogs("backend.digital_sim.controller.v1.digital_sim_api", level="WARNING"):
            await asyncio.wait_for(digital_sim_api.websocket_simulation_endpoint(socket), timeout=2)
        response = await socket.receive("error")
        self.assertEqual(response["result"], {"type": "validation_error"})
        self.assertNotIn("secret-input", str(response))

    async def test_invalid_parameter_container_is_a_validation_error(self):
        socket = TestSocket()
        await socket.commands.put({"command": "start", "parameters": ["secret"]})
        await socket.commands.put(None)
        with self.assertNoLogs("backend.digital_sim.controller.v1.digital_sim_api", level="WARNING"):
            await asyncio.wait_for(digital_sim_api.websocket_simulation_endpoint(socket), timeout=2)
        response = await socket.receive("error")
        self.assertEqual(response["result"], {"type": "validation_error"})

    async def test_export_error_is_mapped_without_duplicate_logging(self):
        socket = TestSocket()
        service = SimulationService()
        await socket.commands.put({"command": "export_data"})
        await socket.commands.put(None)
        with patch.object(digital_sim_api, "SimulationService", return_value=service), \
                patch.object(service, "export_data_as_csv", side_effect=SimulationExportError()), \
                self.assertNoLogs("backend.digital_sim.controller.v1.digital_sim_api", level="WARNING"):
            await asyncio.wait_for(digital_sim_api.websocket_simulation_endpoint(socket), timeout=2)
        response = await socket.receive("export_data")
        self.assertEqual(response["status"], "error")
        self.assertEqual(response["message"], "Simulation data could not be exported")

    async def test_broken_broadcast_client_does_not_block_other_clients(self):
        manager = ConnectionManager()
        bad = SimpleNamespace(send_json=AsyncMock(side_effect=RuntimeError("broadcast-secret")))
        good = SimpleNamespace(send_json=AsyncMock())
        manager.active_connections = [bad, good]
        with self.assertLogs("backend.api.manager", level="ERROR") as logs:
            await manager.broadcast_update("car_data", [{"payload": "private"}])
        good.send_json.assert_awaited_once()
        self.assertEqual(manager.active_connections, [good])
        self.assertEqual(len(logs.records), 1)
        self.assertNotIn("private", ErrorLoggingTests.formatted(logs.records))
        self.assertNotIn("broadcast-secret", ErrorLoggingTests.formatted(logs.records))
        manager.disconnect(bad)

    async def test_cancelled_broadcast_future_is_not_an_error(self):
        from backend.api.v1.digital_twin import _check_broadcast_result
        future = Future()
        future.cancel()
        with self.assertNoLogs("backend.api.v1.digital_twin", level="WARNING"):
            _check_broadcast_result(future)


if __name__ == "__main__":
    unittest.main()
