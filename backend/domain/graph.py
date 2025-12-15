class Node:
    def __init__(self, x, y, direction):
        self.id = f"{x}-{y}-{direction}"
        self.x = x
        self.y = y
        self.direction = direction

class Edge:
    def __init__(self, start_node, end_node, length=1):
        self.start_node = start_node
        self.end_node = end_node
        self.length = length

class RoadGraph:
    def __init__(self):
        self.nodes = {}
        self.edges = []

   
    def add_edge(self, node_a, node_b, length=1):
        # Zorgt voor two-way baan door de verbinding te spiegelen
        edge_ab = Edge(node_a, node_b, length)
        edge_ba = Edge(node_b, node_a, length)
        self.edges.extend([edge_ab, edge_ba])
        
        self.nodes[node_a.id] = node_a
        self.nodes[node_b.id] = node_b