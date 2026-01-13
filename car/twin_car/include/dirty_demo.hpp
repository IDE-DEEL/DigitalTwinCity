#ifndef DIRTY_DEMO_HPP
#define DIRTY_DEMO_HPP
#include "connectivity.hpp"
#include "jsonreader.hpp"

/*
Route format example:
{
  "route": {
    "2": [6, 4, 2],
    "3": [1, 8],
    "7": [3, 2, 1],
    "6": [6, 5]
  }
}
*/

/**
 * @brief Simulate following a route defined in a JsonDocument.
 * 
 * For each tile and tag in the route, it looks up details from the JSON reader
 * and prints step information. It also sends MQTT messages if connectivity is provided.
 * 
 * This simulation is without actual hardware interaction. It demonstrates route processing logic.
 * @param routeDoc JsonDocument containing the route definition.
 * @param reader JsonReader instance to look up tile details.
 * @param connectivity Optional Connectivity instance for MQTT publishing.
 * @note This function blocks while simulating the route.
 */
void simulate_route(const JsonDocument& routeDoc, JsonReader& reader, Connectivity& connectivity){

    // Check if routeDoc has the expected structure
    JsonArrayConst route = routeDoc["route"].as<JsonArrayConst>();
    
    if (route.isNull()) {
        Serial.println("Invalid route document structure.");
        Serial.println("routeDoc content: ");
        serializeJsonPretty(routeDoc, Serial);
        Serial.println();
        return;
    }

    Serial.println("\n=== Route Started ===");
    
    // Build flat list of waypoints from compressed format
    int stepIndex = 0;
    
    for (JsonObjectConst tileObj : route) {
        int tile_nr = tileObj["tile"];
        JsonArrayConst tags = tileObj["tags"].as<JsonArrayConst>();
        
        if (tags.isNull()) {
            Serial.printf("Warning: No tags found for tile %d\n", tile_nr);
            continue;
        }
        
        for (int tag_index : tags) {
            // Look up tile details from rfid.json
            String template_name = "unknown";
            String binding = "not found";
            JsonDocument doc = reader.getDocument();
            JsonArray tiles = doc["tiles"];
            for (JsonObject tile : tiles) {
                if (tile["tile_nr"] == tile_nr) {
                    template_name = tile["template"].as<String>();
                    JsonObject bindings = tile["bindings"];
                    String tagKey = String(tag_index);
                    
                    JsonVariant bindingVar = bindings[tagKey];
                    if (!bindingVar.isNull()) {
                        binding = bindingVar.as<String>();
                    }
                    break;
                }
            }
            
            // Print step information with aligned columns
            Serial.printf("Step %-2d: Tile type %-11s at tile coordinate (%d,%d), RFID binding is %s\n",
                         stepIndex, template_name.c_str(), tile_nr, tag_index, binding.c_str());
            
                // Store tile number and tag index in message
                JsonDocument msgDoc;
                msgDoc["tileNumber"] = tile_nr;
                msgDoc["tagIndex"] = tag_index;

                // Serialize JSON to string
                String jsonString;
                serializeJson(msgDoc, jsonString);

                // Send via MQTT
                if (&connectivity != nullptr) {
                    connectivity.publish(PUB_TOPIC_RFID, jsonString.c_str());
                } else {
                    Serial.println("Connectivity not set, cannot publish: " + jsonString);
                }
            
            stepIndex++;
            delay(1000);
        }
    }
    
    Serial.println("=== Route Complete ===\n");
}

#endif