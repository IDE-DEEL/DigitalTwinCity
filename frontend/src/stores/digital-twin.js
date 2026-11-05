import { defineStore } from 'pinia'
import { wsUrl } from '../config/api'
import { useToast } from 'vue-toastification'

export const useDigitalTwinStore = defineStore('digitalTwin', {
  state: () => ({
    table_data: [
        {"status": true, "color": "#0000FF", "auto_id": "auto_A", "energie": 100, "pakketje": 0, "route": "route_1", "visueel": true},
        {"status": true, "color": "#FF0000", "auto_id": "auto_B", "energie": 100, "pakketje": 0, "route": "route_1", "visueel": false},
        {"status": true, "color": "#008000", "auto_id": "auto_C", "energie": 100, "pakketje": 0, "route": "route_1", "visueel": false},
        {"status": true, "color": "#FFFF00", "auto_id": "auto_D", "energie": 100, "pakketje": 0, "route": "route_1", "visueel": false},
        {"status": true, "color": "#800080", "auto_id": "auto_E", "energie": 100, "pakketje": 0, "route": "route_1", "visueel": false}
    ],

    car_data: [
        {"auto_id": "auto_A", "tag_id": "04:CA:41:6D:BC:2A:81"},
        {"auto_id": "auto_B", "tag_id": "04:CB:41:6D:BC:2A:81"},
        {"auto_id": "auto_C", "tag_id": "04:CC:41:6D:BC:2A:81"},
        {"auto_id": "auto_D", "tag_id": "04:CD:41:6D:BC:2A:81"},
        {"auto_id": "auto_E", "tag_id": "04:B5:71:6E:BC:2A:81"}
    ],

    car_depot_routes: [],
    tag_positions: [],
    routes: [],
    houses: [],
    scenario_houses: [],

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
    
    chosen_scenario: 'Rustig',
    speed: 50,
    sim_speed: 20,
    max_packages: 12,
    active: false,
    time: "00:00",

    factor_x: 0,
    factor_y: 0,

    socket: null,
    connectionStatus: 'disconnected'
  }),

  actions: {
    connect() {
      if (this.socket) return

      const toast = useToast()
      this.connectionStatus = 'connecting'
      let socket
      try {
        socket = new WebSocket(wsUrl('/api/v1/ws/digital_twin'))
      } catch (error) {
        this.connectionStatus = 'disconnected'
        console.error('Digital Twin connection failed:', error)
        toast.error('Kan geen verbinding maken met de Digital Twin.')
        return
      }
      this.socket = socket
      let connectionErrorShown = false

      this.socket.onopen = () => {
        this.connectionStatus = 'connected'
        console.log('WebSocket connected')
      }

      this.socket.onmessage = (event) => {
        if (this.socket !== socket) return
        let message
        try {
          message = JSON.parse(event.data)
        } catch (error) {
          console.warn('Invalid Digital Twin message:', error)
          return
        }
        if (!message || Array.isArray(message) || typeof message.type !== 'string') {
          console.warn('Unexpected Digital Twin message:', message)
          return
        }
        const { type, payload } = message

        switch (type) {
          case 'speed':
            if (typeof payload !== 'number' || !Number.isFinite(payload)) break
            this.speed = payload
            break

          case 'scenario':
            if (typeof payload !== 'string') break
            this.chosen_scenario = payload
            break

          case 'activation':
            if (typeof payload !== 'boolean') break
            console.log("start: " + payload)

            this.active = payload
            break

          case 'car_data':
            console.log("car_data: ", payload)
            if (!Array.isArray(payload)) {
              console.warn('Invalid car data payload:', payload)
              break
            }
            payload.filter(car => car && typeof car.auto_id === 'string').forEach(newCar => {
              const existingCar = this.car_data.find(c => c.auto_id === newCar.auto_id)
              if (existingCar) {
                existingCar.tag_id = newCar.tag_id
              } else {
                this.car_data.push(newCar)
              }
            })
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
            if (!payload || typeof payload !== 'object' || Array.isArray(payload)) break
            this.results = payload
            break

          case 'houses': 
            const scenario = this.scenario_houses.find(s => s.Scenario === this.chosen_scenario);

            console.log(scenario)

            if (!Array.isArray(payload) || !Array.isArray(scenario?.tags)) break
            scenario.tags.forEach(tag => {
                const update = payload.find(p => p && p.tag_id === tag.tag_id)
                if (update) tag.undeliverd_packages = update.remaining
                console.log(tag.undeliverd_packages)
            })

            break

        }
      }

      this.socket.onerror = () => {
        if (this.socket !== socket) return
        this.connectionStatus = 'disconnected'
        if (!connectionErrorShown) {
          connectionErrorShown = true
          toast.error('Er is een probleem met de Digital Twin-verbinding.')
        }
      }

      this.socket.onclose = () => {
        if (this.socket !== socket) return
        this.connectionStatus = 'disconnected'
        console.log('WebSocket disconnected')
        this.socket = null
        if (!connectionErrorShown) {
          connectionErrorShown = true
          toast.error('De verbinding met de Digital Twin is verbroken.')
        }
      }
    },

    findCar(id) {
      return this.table_data.find(
        c => c.auto_id === id
      )
    },

    updatePackages(payload) {
      if (!payload || typeof payload.car_id !== 'string' || !Number.isFinite(payload.packages)) return
      const car = this.findCar(payload.car_id)
      if (car) {
        car.pakketje = payload.packages
      }
    },

    updateRoute(payload) {
      if (!payload || typeof payload.car_id !== 'string' || typeof payload.route !== 'string') return
      const car = this.findCar(payload.car_id)
      if (car) {
        car.route = payload.route

        console.log(car.route)
      }
    },

    updateStatus(payload) {
      if (!payload || typeof payload.car_id !== 'string' || typeof payload.status !== 'boolean') return
      const car = this.findCar(payload.car_id)
      if (car) {
        car.status = payload.status
      }
    },

    updateEnergy(payload) {
      if (!payload || typeof payload.car_id !== 'string' || !Number.isFinite(payload.energy)) return
      const car = this.findCar(payload.car_id)
      if (car) {
        car.energie = payload.energy
      }
    },

    sendData(type, payload) {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log(type + " " + payload)
        
        try {
          this.socket.send(JSON.stringify({ type, payload }))
          return true
        } catch (error) {
          console.error('Digital Twin command failed:', error)
          useToast().error('Het commando kon niet worden verstuurd.')
          return false
        }
      } else {
        console.warn('Digital Twin command not sent: socket is not open')
        useToast().error('Geen verbinding met de Digital Twin. Probeer het later opnieuw.')
        return false
      }
    },

    async fetchTagPositions() {
      try {
        const response = await fetch('/data/test-map4-tags.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.tag_positions = await response.json(); 
      } catch (error) {
        console.error('Kon de tag posities niet laden:', error);
      }
    },

    async fetchDepotRoutes() {
      try {
        const response = await fetch('/data/depot-routes.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.car_depot_routes = await response.json(); 
      } catch (error) {
        console.error('Kon de depot routes niet laden:', error);
      }
    },

    async fetchRoutes() {
      try {
        const response = await fetch('/data/routes.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.routes = await response.json(); 
      } catch (error) {
        console.error('Kon de routes niet laden:', error);
      }
    },

    async fetchHouses() {
      try {
        const response = await fetch('/data/houses.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.houses = await response.json(); 
      } catch (error) {
        console.error('Kon de huizen niet laden:', error);
      }
    },

    async fetchHousesPerScenario() {
      try {
        const response = await fetch('/data/scenarios.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const scenarios = await response.json();
        if (!Array.isArray(scenarios) || !scenarios.every(item => item && typeof item.Scenario === 'string' && Array.isArray(item.tags))) {
          throw new Error('Invalid scenarios format');
        }
        this.scenario_houses = scenarios; 
      } catch (error) {
        console.error('Kon de huizen per scenario niet laden:', error);
        useToast().error('Scenario’s konden niet worden geladen. Probeer de pagina opnieuw te laden.');
      }
    }
  }
})