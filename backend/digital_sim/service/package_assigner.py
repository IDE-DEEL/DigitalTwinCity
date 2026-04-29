from backend.digital_sim.domain.package import PackageStatus


class PackageAssigner:
    """Static class responsible for assigning packages to parked agents."""
    
    @staticmethod
    def assign_packages_to_parked_agents(agents):
        """
        Assign available packages to all parked agents with available cargo space.
        
        Args:
            agents: List of CarAgent objects from the model
        """
        for agent in agents:
            if agent.status.name == "PARKED" and len(agent.packages_in_cargo) < agent.max_packages:
                PackageAssigner._assign_packages_to_agent(agent)
    
    @staticmethod
    def _assign_packages_to_agent(agent):
        """
        Assign available packages from the agent's route to the agent.
        
        Args:
            agent: CarAgent object to assign packages to
        """
        for house in agent.route.houses:
            for package in house.packages:
                # check if package is available and agent has capacity
                if (len(agent.packages_in_cargo) < agent.max_packages and
                    package.status == PackageStatus.IN_DEPOT and
                    package.assigned_car_id is None):
                    
                    # claim the package
                    package.assigned_car_id = agent.unique_id
                    package.status = PackageStatus.IN_TRANSIT
                    agent.packages_in_cargo.append(package)
