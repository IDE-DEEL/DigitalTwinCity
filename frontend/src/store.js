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
    {"status": true, "auto_id": "Auto A", "energie": 100, "pakketje": 2, "route": "Route 1", "visueel": true},
    {"status": true, "auto_id": "Auto B", "energie": 100, "pakketje": 4, "route": "Route 3", "visueel": false},
    {"status": true, "auto_id": "Auto C", "energie": 100, "pakketje": 1, "route": "Route 2", "visueel": true},
    {"status": true, "auto_id": "Auto D", "energie": 100, "pakketje": 2, "route": "Route 1", "visueel": false},
    {"status": true, "auto_id": "Auto E", "energie": 100, "pakketje": 2, "route": "Route 1", "visueel": false}
  ],

  car_data: [
    {"auto_id": "auto_B", "tag_id": "1A"},
  ],

  /*tag_positions: [
    {"tag_id": "53:3F:11:F7:32:00:01", "tag_pos": {"x": 93.5, "y": 53}},
    {"tag_id": "53:2A:27:F7:32:00:01", "tag_pos": {"x": 84, "y": 31}},
    {"tag_id": "53:5F:2D:F7:32:00:01", "tag_pos": {"x": 61.5, "y": 21}},
    
    {"tag_id": "CF:8D:0A:3E", "tag_pos": {"x": 53, "y": 21}},
    {"tag_id": "3A:6E:0A:3E", "tag_pos": {"x": 30, "y": 31}},
    {"tag_id": "10:8E:0A:3E", "tag_pos": {"x": 21, "y": 53}},
    
    {"tag_id": "53:D7:78:F6:32:00:01", "tag_pos": {"x": 21, "y": 61}},
    {"tag_id": "53:0C:5F:F6:32:00:01", "tag_pos": {"x": 31, "y": 84}},
    {"tag_id": "53:71:61:6A:62:00:01", "tag_pos": {"x": 53, "y": 93.5}},
    
    {"tag_id": "53:66:C0:F5:32:00:01​", "tag_pos": {"x": 61.5, "y": 93.5}},
    {"tag_id": "53:78:C7:F5:32:00:01", "tag_pos": {"x": 84, "y": 84}},
    {"tag_id": "53:B2:D1:F5:32:00:01", "tag_pos": {"x": 93.5, "y": 61.5}}
  ],*/

  tag_positions: [
    //Tile 1
    {"tag_id": "1A", "tag_pos": {"x": 155, "y": 350}},
    {"tag_id": "2A", "tag_pos": {"x": 193, "y": 260}},
    {"tag_id": "3A", "tag_pos": {"x": 260, "y": 193}},
    {"tag_id": "4A", "tag_pos": {"x": 350, "y": 150}},
    
    {"tag_id": "5A", "tag_pos": {"x": 260, "y": 350}},
    {"tag_id": "6A", "tag_pos": {"x": 295, "y": 294}},
    {"tag_id": "7A", "tag_pos": {"x": 350, "y": 259}},

    //Tile 2
    {"tag_id": "1B", "tag_pos": {"x": 440, "y": 150}},
    {"tag_id": "2B", "tag_pos": {"x": 515, "y": 119}},
    {"tag_id": "3B", "tag_pos": {"x": 550, "y": 40}},
    
    {"tag_id": "4B", "tag_pos": {"x": 650, "y": 40}},
    {"tag_id": "5B", "tag_pos": {"x": 685, "y": 119}},
    {"tag_id": "6B", "tag_pos": {"x": 760, "y": 150}},
    
    {"tag_id": "7B", "tag_pos": {"x": 760, "y": 250}},
    {"tag_id": "8B", "tag_pos": {"x": 685, "y": 290}},
    {"tag_id": "9B", "tag_pos": {"x": 650, "y": 360}},
    
    {"tag_id": "10B", "tag_pos": {"x": 440, "y": 259}},
    {"tag_id": "11B", "tag_pos": {"x": 515, "y": 290}},
    {"tag_id": "12B", "tag_pos": {"x": 550, "y": 360}},

    {"tag_id": "13B", "tag_pos": {"x": 600, "y": 89}},
    {"tag_id": "14B", "tag_pos": {"x": 715, "y": 204.5}},
    {"tag_id": "15B", "tag_pos": {"x": 600, "y": 320}},
    {"tag_id": "16B", "tag_pos": {"x": 485, "y": 204.5}},
    
    //Tile 3
    {"tag_id": "1C", "tag_pos": {"x": 150, "y": 450}},
    {"tag_id": "2C", "tag_pos": {"x": 150, "y": 550}},
    {"tag_id": "3C", "tag_pos": {"x": 150, "y": 650}},
    {"tag_id": "4C", "tag_pos": {"x": 150, "y": 750}},
    
    {"tag_id": "5C", "tag_pos": {"x": 250, "y": 450}},
    {"tag_id": "6C", "tag_pos": {"x": 250, "y": 550}},
    {"tag_id": "7C", "tag_pos": {"x": 250, "y": 650}},
    {"tag_id": "8C", "tag_pos": {"x": 250, "y": 750}},

    //Tile 4
    {"tag_id": "1D", "tag_pos": {"x": 650, "y": 450}},
    {"tag_id": "2D", "tag_pos": {"x": 650, "y": 550}},
    {"tag_id": "3D", "tag_pos": {"x": 650, "y": 650}},
    {"tag_id": "4D", "tag_pos": {"x": 650, "y": 750}},
    
    {"tag_id": "5D", "tag_pos": {"x": 550, "y": 450}},
    {"tag_id": "6D", "tag_pos": {"x": 550, "y": 550}},
    {"tag_id": "7D", "tag_pos": {"x": 550, "y": 650}},
    {"tag_id": "8D", "tag_pos": {"x": 550, "y": 750}},

    //Tile 5
    {"tag_id": "1E", "tag_pos": {"x": 150, "y": 850}},
    {"tag_id": "2E", "tag_pos": {"x": 150, "y": 950}},
    {"tag_id": "3E", "tag_pos": {"x": 150, "y": 1050}},
    {"tag_id": "4E", "tag_pos": {"x": 150, "y": 1150}},
    {"tag_id": "5E", "tag_pos": {"x": 260, "y": 850}},
    {"tag_id": "6E", "tag_pos": {"x": 260, "y": 950}},
    {"tag_id": "7E", "tag_pos": {"x": 260, "y": 1050}},
    {"tag_id": "8E", "tag_pos": {"x": 260, "y": 1150}},
    {"tag_id": "9E", "tag_pos": {"x": 50, "y": 950}},
    {"tag_id": "10E", "tag_pos": {"x": 50, "y": 1050}},
    {"tag_id": "11E", "tag_pos": {"x": 350, "y": 950}},
    {"tag_id": "12E", "tag_pos": {"x": 350, "y": 1050}},

    //Tile 6
    {"tag_id": "1F", "tag_pos": {"x": 650, "y": 850}},
    {"tag_id": "2F", "tag_pos": {"x": 650, "y": 950}},
    {"tag_id": "3F", "tag_pos": {"x": 650, "y": 1050}},
    {"tag_id": "4F", "tag_pos": {"x": 650, "y": 1150}},
    
    {"tag_id": "5F", "tag_pos": {"x": 550, "y": 850}},
    {"tag_id": "6F", "tag_pos": {"x": 550, "y": 950}},
    {"tag_id": "7F", "tag_pos": {"x": 450, "y": 950}},
    
    {"tag_id": "8F", "tag_pos": {"x": 450, "y": 1050}},
    {"tag_id": "9F", "tag_pos": {"x": 550, "y": 1050}},
    {"tag_id": "10F", "tag_pos": {"x": 550, "y": 1150}}
  ],

    routes: [
    {"route": "Route 1", "tags": ["1A", "2A", "3A", "4A", "1B", "2B", "13B", "5B", "14B", "9B", "1D", "2D", "3D", "4D", "1F", "2F", "3F", "4F"], "color": "#ff0000"},
    {"route": "Route 2", "tags": ["5A", "6A", "7A", "10B", "11B", "12B", "5D", "6D", "7D", "8D", "5F", "7F", "11E"], "color": "#07cf00"},
    {"route": "Route 3", "tags": []}
  ],

  scenarios: [
    "Placeholder 1",
    "Placeholder 2",
    "Placeholder 3"
  ],

  chosen_tag: {"tag_id": "1A", "tag_pos": {"x": 155, "y": 350}},
  show_tags: false,
  
  chosen_scenario: '',
  speed: 50,
  sim_speed: 20,
  max_packages: 12,
  score: 80,
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
