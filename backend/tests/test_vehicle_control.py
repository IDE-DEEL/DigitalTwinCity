import contextlib
import io
import json
import ssl
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from backend.tests.vehicle_control_replay import CurrentAdapter, SCENARIOS, replay
from backend.vehicle_control.mqtt_client import MQTTClient
from backend.vehicle_control.state import CAR_IDS, VehicleState
from backend.vehicle_control import service


class VehicleReplayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.expected = json.loads(Path(__file__).with_name('fixtures').joinpath(
            'vehicle_control_before_refactor.json').read_text())

    def test_rfid_scenarios_match_original_commands_and_state(self):
        for scenario in SCENARIOS:
            with self.subTest(scenario=scenario):
                with contextlib.redirect_stdout(io.StringIO()):
                    if scenario == "malformed_and_listeners":
                        with self.assertLogs("backend.vehicle_control.state", level="ERROR") as logs:
                            actual = replay(CurrentAdapter, scenario)
                        self.assertEqual(len(logs.records), 3)
                    else:
                        actual = replay(CurrentAdapter, scenario)
                self.assertEqual(actual, self.expected[scenario])

    def test_new_instances_do_not_share_vehicle_state(self):
        first, second = VehicleState(), VehicleState()
        first.packets['auto_A'] = 3
        first.car_data.append({'auto_id': 'auto_A', 'tag_id': 'test'})
        self.assertEqual(second.packets['auto_A'], 0)
        self.assertEqual(second.car_data, [])

    def test_api_capacity_survives_reset_and_can_be_changed(self):
        adapter = CurrentAdapter()
        with patch.object(service, 'control', adapter.service):
            service.set_capacity('auto_A', 5)
            self.assertEqual(adapter.state.max_packets['auto_A'], 5)
            service.reset()
            self.assertEqual(adapter.state.max_packets['auto_A'], 0)
            service.set_capacity('auto_A', 2)
            service.load_packages('auto_A', 2, 1500, 'load')
            self.assertEqual(adapter.state.max_packets['auto_A'], 2)
            self.assertEqual(adapter.state.packets['auto_A'], 2)



class MQTTLifecycleTests(unittest.TestCase):
    def make_transport(self):
        settings = SimpleNamespace(MQTT_HOST='test-host', MQTT_PORT=443,
                                   MQTT_PATH='/mqtt', MQTT_USERNAME='test-user',
                                   MQTT_PASSWORD='test-password')
        return MQTTClient(MagicMock(), settings=settings)

    def test_configuration_start_stop_and_restart(self):
        transport = self.make_transport()
        first, second = MagicMock(), MagicMock()
        with patch('backend.vehicle_control.mqtt_client.mqtt.Client',
                   side_effect=[first, second]) as factory:
            self.assertIs(transport.start(), first)
            self.assertIs(transport.start(), first)
            self.assertEqual(factory.call_count, 1)
            first.username_pw_set.assert_called_once_with('test-user', 'test-password')
            first.ws_set_options.assert_called_once_with(path='/mqtt')
            first.tls_set.assert_called_once_with(cert_reqs=ssl.CERT_REQUIRED)
            first.reconnect_delay_set.assert_called_once_with(min_delay=1, max_delay=60)
            first.connect.assert_called_once_with('test-host', 443)
            first.loop_start.assert_called_once_with()
            self.assertEqual(first.on_message, transport._handle_message)
            transport.stop()
            transport.stop()
            first.loop_stop.assert_called_once_with()
            first.disconnect.assert_called_once_with()
            self.assertIsNone(transport.client)
            self.assertIs(transport.start(), second)
            transport.stop()

    def test_subscriptions_for_all_five_vehicles(self):
        transport = self.make_transport()
        client = MagicMock()
        client.subscribe.return_value = (0, 1)
        with contextlib.redirect_stdout(io.StringIO()):
            transport.on_connect(client, None, None, 0, None)
        self.assertEqual([call.args[0] for call in client.subscribe.call_args_list],
                         [f'car/{car_id}/data/LastRFID' for car_id in CAR_IDS])
        client.reset_mock()
        with self.assertLogs("backend.vehicle_control.mqtt_client", level="ERROR") as logs:
            transport.on_connect(client, None, None, 1, None)
        self.assertEqual(len(logs.records), 1)
        client.subscribe.assert_not_called()


if __name__ == '__main__':
    unittest.main()
