import unittest
from backend.services.graph_builder import build_road_graph
from backend.domain.graph import RoadGraph, Node, Edge

# ---- Mock map cell class ----

class MapCell:

    def __init__(self, x, y, type, connections):
        self.x = x
        self.y = y
        self.type = type
        self.pathConnections = connections
        self.isRoad = (type != 'empty')

# ---- Test cases ----       
class TestGraphBuilder(unittest.TestCase):
    
    # --- Set up ---
    def setUp(self):
        """ kleine 3x3 map"""
        self.grid = [
            [ MapCell(0, 0, 'empty', []),  MapCell(1, 0, 'curve', ['E', 'S']),     MapCell(2, 0, 't_split', ['W', 'S', 'E']) ],
            [ MapCell(0, 1, 'empty', []),  MapCell(1, 1, 'straight', ['N', 'S']),  MapCell(2, 1, 'straight', ['N', 'S']) ],
            [ MapCell(0, 2, 'empty', []),  MapCell(1, 2, 'straight', ['N', 'S']),  MapCell(2, 2, 'empty', []) ]
        ]
 
    def test1_two_way_edge_count(self):
        """Test of het totale aantal edges klopt."""
        graph = build_road_graph(self.grid)
        self.assertEqual(len(graph.edges), 8, "graph needs to have 8 edges")
        
    def test2_node_count(self):
        """Test of het aantal nodes klopt."""
        graph = build_road_graph(self.grid)
        self.assertEqual(len(graph.nodes), 8, "graph needs to have 8 nodes")

    def test3_specific_two_way_connection(self):
        """Test of verbinding correct gespiegeld is."""
        graph = build_road_graph(self.grid)
    
        id_a = "1-0-E"  
        id_b = "2-0-W"  
        
        edge_exists_ab = any(e.start_node.id == id_a and e.end_node.id == id_b for e in graph.edges)
        edge_exists_ba = any(e.start_node.id == id_b and e.end_node.id == id_a for e in graph.edges)

        self.assertTrue(edge_exists_ab, "Two-way Edge 1-0-E -> 2-0-W ontbreekt.")
        self.assertTrue(edge_exists_ba, "Two-way Edge 2-0-W -> 1-0-E ontbreekt.")

if __name__ == '__main__':
    unittest.main()
