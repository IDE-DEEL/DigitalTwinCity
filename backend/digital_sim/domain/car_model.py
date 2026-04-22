import mesa

from backend.digital_sim.domain.car_agent import CarAgent


class CarModel(mesa.Model):

    def __init__(self, n=5, rng=None):
        super().__init__(rng=rng)

        self.num_agents = n
        CarAgent.create_agents(model=self, n=n)
    
    def step(self):
        self.agents.shuffle_do("say_hi")


if __name__ == "__main__":
    print("Instantiating CarModel")
    model = CarModel(n=3)
    print(f"CarModel instantiated with {model.num_agents} agents.")
    print("Executing a step:")
    model.step()
    print("Step executed")
