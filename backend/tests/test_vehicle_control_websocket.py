import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.api.manager import ConnectionManager
from backend.api.v1 import digital_twin
from backend.tests.vehicle_control_replay import CurrentAdapter
from backend.vehicle_control import service


class VehicleWebSocketTests(unittest.TestCase):
    def test_commands_broadcasts_reset_and_reconnect(self):
        adapter = CurrentAdapter()
        manager = ConnectionManager()
        app = FastAPI()
        app.include_router(digital_twin.router, prefix='/api/v1')
        with (patch.object(service, 'control', adapter.service),
              patch.object(digital_twin, 'state', adapter.session),
              patch.object(digital_twin, 'manager', manager),
              patch.object(digital_twin, '_car_data_listener_registered', False),
              patch.object(digital_twin, 'calculate_score', return_value={'total': 42}),
              TestClient(app) as client):
            with client.websocket_connect('/api/v1/ws/digital_twin') as ws:
                self.assertEqual(ws.receive_json(), {'type': 'car_data', 'payload': []})
                ws.send_json({'type': 'route', 'payload': {'car_id': 'auto_A', 'route': 'route_2'}})
                self.assertEqual(ws.receive_json()['type'], 'houses')
                self.assertEqual(ws.receive_json(), {'type': 'route', 'payload': {
                    'car_id': 'auto_A', 'route': 'route_2'}})
                self.assertEqual(adapter.session.chosen_route['auto_A'], 'route_2')

                ws.send_json({'type': 'load_max_packages', 'payload': [
                    {'auto_id': 'auto_A', 'pakketje': 3}]})
                self.assertEqual(ws.receive_json()['type'], 'houses')
                # A following command is also a barrier for the loading request.
                ws.send_json({'type': 'car_data', 'payload': None})
                self.assertEqual(ws.receive_json()['type'], 'houses')
                self.assertEqual(ws.receive_json()['type'], 'car_data')
                self.assertEqual(adapter.state.max_packets['auto_A'], 3)
                self.assertEqual(adapter.state.packets['auto_A'], 3)

                before_activation = len(adapter.client.commands)
                ws.send_json({'type': 'activation', 'payload': True})
                self.assertEqual(ws.receive_json()['type'], 'houses')
                self.assertEqual(ws.receive_json(), {'type': 'activation', 'payload': True})
                self.assertTrue(adapter.session.start)
                self.assertEqual(adapter.client.commands[before_activation:], [
                    [f'car/auto_{car}/cmd/Start', 'True'] for car in 'ABCDE'])

                adapter.scan('auto_A', 'rfid-from-mqtt')
                update = ws.receive_json()
                self.assertEqual(update, {'type': 'car_data', 'payload': [
                    {'auto_id': 'auto_A', 'tag_id': 'rfid-from-mqtt'}]})

                before_stop = len(adapter.client.commands)
                ws.send_json({'type': 'activation', 'payload': False})
                self.assertEqual(ws.receive_json()['type'], 'houses')
                self.assertEqual(ws.receive_json(), {'type': 'activation', 'payload': False})
                self.assertEqual(ws.receive_json(), {'type': 'results', 'payload': {'total': 42}})
                self.assertEqual(adapter.client.commands[before_stop:], [
                    [f'car/auto_{car}/cmd/Start', 'False'] for car in 'ABCDE'])

                ws.send_json({'type': 'reset', 'payload': None})
                self.assertEqual(ws.receive_json()['type'], 'houses')
                reset = ws.receive_json()
                self.assertEqual(reset['type'], 'car_data')
                self.assertEqual(len(reset['payload']), 5)
                self.assertEqual(adapter.state.packets['auto_A'], 0)
                self.assertEqual(adapter.state.max_packets['auto_A'], 0)

            with client.websocket_connect('/api/v1/ws/digital_twin') as ws:
                self.assertEqual(len(ws.receive_json()['payload']), 5)
                adapter.scan('auto_B', 'after-reconnect')
                self.assertEqual(ws.receive_json()['type'], 'car_data')
                self.assertEqual(len(adapter.state.car_data_listeners), 1)

    def test_forwarded_updates_reach_all_clients_with_original_payload(self):
        adapter = CurrentAdapter()
        manager = ConnectionManager()
        app = FastAPI()
        app.include_router(digital_twin.router, prefix='/api/v1')
        with (patch.object(service, 'control', adapter.service),
              patch.object(digital_twin, 'manager', manager),
              patch.object(digital_twin, '_car_data_listener_registered', False),
              TestClient(app) as client):
            with client.websocket_connect('/api/v1/ws/digital_twin') as first:
                self.assertEqual(first.receive_json()['type'], 'car_data')
                with client.websocket_connect('/api/v1/ws/digital_twin') as second:
                    self.assertEqual(first.receive_json()['type'], 'car_data')
                    self.assertEqual(second.receive_json()['type'], 'car_data')
                    for kind, payload in (
                        ('speed', 3),
                        ('scenario', {'name': 'test', 'houses': []}),
                        ('car_packages', [{'auto_id': 'auto_A', 'pakketje': 2}]),
                        ('car_status', {'auto_A': 'driving'}),
                        ('car_energy', {'auto_A': 75.5}),
                    ):
                        with self.subTest(kind=kind):
                            message = {'type': kind, 'payload': payload}
                            first.send_json(message)
                            for socket in (first, second):
                                self.assertEqual(socket.receive_json()['type'], 'houses')
                                self.assertEqual(socket.receive_json(), message)

                    # A following update proves unknown commands are not forwarded.
                    first.send_json({'type': 'unknown', 'payload': {'ignored': True}})
                    first.send_json({'type': 'speed', 'payload': 1})
                    for socket in (first, second):
                        self.assertEqual(socket.receive_json()['type'], 'houses')
                        self.assertEqual(socket.receive_json()['type'], 'houses')
                        self.assertEqual(socket.receive_json(), {'type': 'speed', 'payload': 1})


if __name__ == '__main__':
    unittest.main()
