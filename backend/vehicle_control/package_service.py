"""Package bookkeeping and loading commands for physical vehicles."""

import threading
import time


def resume_after_wait(client, car_id, total_time):
    time.sleep((total_time / 1000) + 1)
    client.publish(f"car/{car_id}/cmd/Screen", 0)
    client.publish(f"car/{car_id}/cmd/Start", "True")


def schedule_resume(client, car_id, total_time):
    threading.Thread(target=resume_after_wait,
                     args=(client, car_id, total_time), daemon=True).start()


class PackageService:
    def __init__(self, state, get_client, schedule=schedule_resume):
        self.state = state
        self.get_client = get_client
        self.schedule = schedule

    def load_packages(self, car_id, packages, ms_per_package, package_action):
        client = self.get_client()
        if package_action == "load":
            action = 1
            self.state.packets[car_id] += packages
        elif package_action == "unload":
            action = 2
            self.state.packets[car_id] -= packages
            if self.state.packets[car_id] < 0:
                self.state.packets[car_id] = 0
        else:
            action = 0
        client.publish(f"car/{car_id}/cmd/Start", "False")
        total_time = packages * ms_per_package
        client.publish(f"car/{car_id}/cmd/TransferTime", total_time)
        client.publish(f"car/{car_id}/cmd/Package", packages)
        client.publish(f"car/{car_id}/cmd/Screen", action)
        self.schedule(client, car_id, total_time)

    def deliver_at(self, car_id, rfid):
        for tag in self.state.houses_requested:
            if tag == rfid:
                needed = self.state.houses_requested[tag] - self.state.houses_receaved[tag]
                if needed > 0:
                    available = self.state.packets[car_id]
                    if available > 0:
                        amount = min(needed, available)
                        self.state.houses_receaved[tag] += amount
                        if self.state.houses_receaved[tag] == self.state.houses_requested[tag]:
                            self.state.completed_houses[car_id] += 1
                        self.load_packages(car_id, amount, 1500, "unload")

    def retrieve_packages_per_house(self):
        return [
            {"tag_id": tag,
             "remaining": self.state.houses_requested[tag] - self.state.houses_receaved.get(tag, 0)}
            for tag in self.state.houses_requested
        ]
