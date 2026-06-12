import { defineStore } from 'pinia'
import { wsUrl } from '../config/api'

export const TAG_POSITION_SCALE = 5.33
export const MAP_PIXEL_SIZE = 100 * TAG_POSITION_SCALE

export const normalizeTagId = (tagId) => {
  return String(tagId ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

export const normalizeCarData = (payload) => {
  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .map((car) => ({
      ...car,
      tag_id: normalizeTagId(
        car.tag_id ?? car.rfid_tag ?? car.tag
      ),
    }))
    .filter((car) => car.tag_id)
}

export const useDigitalTwinStore = defineStore('digitalTwin', {
  state: () => ({
    table_data: [
        {"status": true, "auto_id": "auto_A", "energie": 100, "pakketje": 2, "route": "Route 1", "visueel": true},
        {"status": true, "auto_id": "auto_B", "energie": 100, "pakketje": 4, "route": "Route 1", "visueel": false},
        {"status": false, "auto_id": "auto_C", "energie": 100, "pakketje": 1, "route": "Route 1", "visueel": true},
        {"status": false, "auto_id": "auto_D", "energie": 100, "pakketje": 2, "route": "Route 1", "visueel": false},
        {"status": false, "auto_id": "auto_E", "energie": 100, "pakketje": 2, "route": "Route 1", "visueel": false}
    ],

    car_data: [
        {"auto_id": "auto_A", "tag_id": "1A"},
        {"auto_id": "auto_B", "tag_id": "3A"}
    ],

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
        {"route": "Route 1", "tags": ["1A", "2A", "3A", "4A", "1B", "2B", "13B", "5B", "14B", "9B", "1D", "2D", "3D", "4D", "1F", "2F", "3F", "4F"], "color": "#ff0000"}
    ],

    scenarios: [
        "Rustig",
        "Gemiddeld",
        "Druk"
    ],

    results: {
        "environment": 0,
        "economic": 0,
        "social": 0,
        "energy": 0,
        "safety": 0,
        "maintenance": 0,
        "total": 0
    },

    chosen_tag: {"tag_id": "1A", "tag_pos": {"x": 155, "y": 350}},
    show_tags: false,
    
    chosen_scenario: '',
    speed: 50,
    sim_speed: 20,
    max_packages: 12,
    active: false,
    time: "00:00",

    factor_x: 0,
    factor_y: 0,

    socket: null
  }),

  actions: {
    connect() {
      if (this.socket) return

      this.socket = new WebSocket(
        wsUrl('/api/v1/ws/digital_twin')
      )

      this.socket.onopen = () => {
        console.log('WebSocket connected')
      }

      this.socket.onmessage = (event) => {
        const { type, payload } = JSON.parse(event.data)

        switch (type) {
          case 'speed':
            this.speed = payload
            break

          case 'scenario':
            this.chosen_scenario = payload
            break

          case 'activation':
            this.active = payload === 'start'
            break

          case 'car_data':
            this.car_data = payload
            break

          case 'car_packages':
            this.updatePackages(payload)
            break

          case 'car_status':
            this.updateStatus(payload)
            break

          case 'car_energy':
            this.updateEnergy(payload)
            break

          case 'car_route':
            this.updateRoute(payload)
            break

          case 'results':
            this.results = payload
        }
      }

      this.socket.onclose = () => {
        console.log('WebSocket disconnected')
        this.socket = null
      }
    },

    findCar(id) {
      return this.table_data.find(
        c => c.auto_id === id
      )
    },

    updatePackages(payload) {
      const car = this.findCar(payload.car_id)
      if (car) {
        car.pakketje = payload.packages
      }
    },

    updateRoute(payload) {
      const car = this.findCar(payload.car_id)
      if (car) {
        car.route = payload.route
      }
    },

    updateStatus(payload) {
      const car = this.findCar(payload.car_id)
      if (car) {
        car.status = payload.status
      }
    },

    updateEnergy(payload) {
      const car = this.findCar(payload.car_id)
      if (car) {
        car.energie = payload.energy
      }
    },

    sendData(type, payload) {
      if (
        this.socket &&
        this.socket.readyState === WebSocket.OPEN
      ) {
        this.socket.send(
          JSON.stringify({
            type,
            payload,
          })
        )
      } else {
        console.error('Socket is not open')
      }
    },
  }
})