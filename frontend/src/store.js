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
  }
})