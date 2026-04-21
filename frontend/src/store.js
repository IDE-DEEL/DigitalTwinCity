import { reactive } from 'vue'
import axios from 'axios'

export const store = reactive({
  // De gedeelde data

  table_data: [
    {"auto_id": "Auto 1", "pakketje": 2, "route": "Route 1", "visueel": true},
    {"auto_id": "Auto 2", "pakketje": 4, "route": "Route 3", "visueel": false},
    {"auto_id": "Auto 3", "pakketje": 1, "route": "Route 2", "visueel": true},
    {"auto_id": "Auto 4", "pakketje": 2, "route": "Route 1", "visueel": false}
  ],

  routes: [
    "Route 1",
    "Route 2",
    "Route 3"
  ],

  scenarios: [
    "Placeholder 1",
    "Placeholder 2",
    "Placeholder 3"
  ],
  chosen_scenario: '',
  speed: 50,

  fetch_speed() {
    const result = null;
    
    axios.get('localhost:8000/api/v1/car/speed')
      .then(data => result.value = data)

    return result
  },

  socket: null
})

export const connect = () => {
// Methode om de socket te verbinden
  store.socket = new WebSocket("ws://localhost:8000/digital_twin/ws");
  
  store.socket.onopen = () => console.log("WebSocket verbonden!");
  store.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Optioneel: update de store met data van FastAPI
      store.table_data = data.table_data;
      store.routes = data.routes;
      store.scenarios = data.scenarios;
      store.chosen_scenario = data.scenario;
      store.speed = data.speed;
  };
}

export const send_data = () => {
  if (store.socket && store.socket.readyState === WebSocket.OPEN) {
      const payload = {
        table_data: store.table_data,
        routes: store.routes,
        scenarios: store.scenarios,
        scenario: store.chosen_scenario,
        speed: store.speed
      };
      store.socket.send(JSON.stringify(payload));
    } else {
      console.error("Socket is niet open!");
    }
}