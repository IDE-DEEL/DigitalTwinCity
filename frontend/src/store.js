import { reactive } from 'vue'

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
  max_packages: 12,
  score: 0,
  time: "00:00",

  socket: null
})

export const connect = () => {
// Methode om de socket te verbinden
  store.socket = new WebSocket("ws://localhost:8000/api/v1/ws/digital_twin");
  
  store.socket.onopen = () => console.log("WebSocket verbonden!");
  store.socket.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);
      //update de store met data van FastAPI
      switch(type) {
        case "speed":
            store.speed = payload;
        break;

        case "scenario":
            store.scenario = payload;
        break;

        case "car_table":
            store.table_data = payload;
        break;
      }
  };
}

export const send_data = (data_type, data_value) => {
  if (store.socket && store.socket.readyState === WebSocket.OPEN) {
      const payload = {
        type: data_type,
        payload: data_value,
      };
      store.socket.send(JSON.stringify(payload));
    } else {
      console.error("Socket is niet open!");
    }
}