import mesa

class CarAgent(mesa.Agent):
    def __init__(self, model):
        super().__init__(model)

        self.packages = 1
    
    def say_hi(self):
        print(f"Hi, I am an agent, you can call me {self.unique_id!s}.")