import { reactive } from 'vue'
import { wsUrl } from './config/api'

export const TAG_POSITION_SCALE = 5.33;
export const MAP_PIXEL_SIZE = 100 * TAG_POSITION_SCALE;

export const normalizeTagId = (tagId) => {
  return String(tagId ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

const normalizeCarData = (payload) => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((car) => ({
    ...car,
    tag_id: normalizeTagId(car.tag_id ?? car.rfid_tag ?? car.tag),
  })).filter((car) => car.tag_id);
}

export const store = reactive({
  // De gedeelde data

  table_data: [
    {"auto_id": "Auto 1", "pakketje": 2, "route": "Route 1", "visueel": true},
    {"auto_id": "Auto 2", "pakketje": 4, "route": "Route 3", "visueel": false},
    {"auto_id": "Auto 3", "pakketje": 1, "route": "Route 2", "visueel": true},
    {"auto_id": "Auto 4", "pakketje": 2, "route": "Route 1", "visueel": false}
  ],

  car_data: [
    {"auto_id": "auto_B", "tag_id": "53:3F:11:F7:32:00:01"},
  ],

  tag_positions: [
    {"tag_id": "53:3F:11:F7:32:00:01", "tag_pos": {"x": 93.5*TAG_POSITION_SCALE, "y": 53*TAG_POSITION_SCALE}},
    {"tag_id": "53:2A:27:F7:32:00:01", "tag_pos": {"x": 84*TAG_POSITION_SCALE, "y": 31*TAG_POSITION_SCALE}},
    {"tag_id": "53:5F:2D:F7:32:00:01", "tag_pos": {"x": 61.5*TAG_POSITION_SCALE, "y": 21*TAG_POSITION_SCALE}},
    
    {"tag_id": "CF:8D:0A:3E", "tag_pos": {"x": 53*TAG_POSITION_SCALE, "y": 21*TAG_POSITION_SCALE}},
    {"tag_id": "3A:6E:0A:3E", "tag_pos": {"x": 30*TAG_POSITION_SCALE, "y": 31*TAG_POSITION_SCALE}},
    {"tag_id": "10:8E:0A:3E", "tag_pos": {"x": 21*TAG_POSITION_SCALE, "y": 53*TAG_POSITION_SCALE}},
    
    {"tag_id": "53:D7:78:F6:32:00:01", "tag_pos": {"x": 21*TAG_POSITION_SCALE, "y": 61*TAG_POSITION_SCALE}},
    {"tag_id": "53:0C:5F:F6:32:00:01", "tag_pos": {"x": 31*TAG_POSITION_SCALE, "y": 84*TAG_POSITION_SCALE}},
    {"tag_id": "53:71:61:6A:62:00:01", "tag_pos": {"x": 53*TAG_POSITION_SCALE, "y": 93.5*TAG_POSITION_SCALE}},
    
    {"tag_id": "53:66:C0:F5:32:00:01", "tag_pos": {"x": 61.5*TAG_POSITION_SCALE, "y": 93.5*TAG_POSITION_SCALE}},
    {"tag_id": "53:78:C7:F5:32:00:01", "tag_pos": {"x": 84*TAG_POSITION_SCALE, "y": 84*TAG_POSITION_SCALE}},
    {"tag_id": "53:B2:D1:F5:32:00:01", "tag_pos": {"x": 93.5*TAG_POSITION_SCALE, "y": 61.5*TAG_POSITION_SCALE}}
  ],

  routes: [
    {"route": "Route 1"},
    {"route": "Route 2"},
    {"route": "Route 3"}
  ],

  scenarios: [
    "Placeholder 1",
    "Placeholder 2",
    "Placeholder 3"
  ],
  
  chosen_scenario: '',
  speed: 50,
  sim_speed: 20,
  max_packages: 12,
  score: 0,
  active: false,
  time: "00:00",

  socket: null
})

export const connect = () => {
// Methode om de socket te verbinden
  store.socket = new WebSocket(wsUrl("/api/v1/ws/digital_twin"));
  
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

        case "activation":
            if (payload === "start") {
              store.active = true;
            } else if (payload === "stop") {
              store.active = false;
            }
        break;

        case "car_data":
            store.car_data = normalizeCarData(payload);
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
