import { defineStore } from 'pinia'
import { wsUrl } from '../config/api'

export const useDigitalTwinStore = defineStore('digitalTwin', {
  state: () => ({
    table_data: [
        {"status": true, "color": "#0000FF", "auto_id": "auto_A", "energie": 100, "pakketje": 2, "route": "route_1", "visueel": true},
        {"status": true, "color": "#FF0000", "auto_id": "auto_B", "energie": 100, "pakketje": 4, "route": "route_1", "visueel": false},
        {"status": true, "color": "#008000", "auto_id": "auto_C", "energie": 100, "pakketje": 1, "route": "route_1", "visueel": false},
        {"status": true, "color": "#FFFF00", "auto_id": "auto_D", "energie": 100, "pakketje": 2, "route": "route_1", "visueel": false},
        {"status": true, "color": "#800080", "auto_id": "auto_E", "energie": 100, "pakketje": 2, "route": "route_1", "visueel": false}
    ],

    car_data: [
        {"auto_id": "auto_A", "tag_id": "53:D1:7A:16:23:00:01"},
        {"auto_id": "auto_B", "tag_id": "5A:85:D6:DB:0A:41:89"},
        {"auto_id": "auto_C", "tag_id": "04:A1:41:6D:BC:2A:81"},
        {"auto_id": "auto_D", "tag_id": "53:6E:75:16:23:00:01"},
        {"auto_id": "auto_E", "tag_id": "53:A3:7A:16:23:00:01"}
    ],

    tag_positions: [],
    routes: [],

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
            console.log("start: " + payload)

            this.active = payload
            break

          case 'car_data':
            console.log("car_data: ", payload)
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

          case 'route':
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
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log(type + " " + payload)
        
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

    async fetchTagPositions() {
      try {
        const response = await fetch('/data/test-map4-tags.json');
        this.tag_positions = await response.json(); 
      } catch (error) {
        console.error('Kon de tag posities niet laden:', error);
      }
    },

    async fetchRoutes() {
      try {
        const response = await fetch('/data/routes.json');
        this.routes = await response.json(); 
      } catch (error) {
        console.error('Kon de routes niet laden:', error);
      }
    }
  }
})