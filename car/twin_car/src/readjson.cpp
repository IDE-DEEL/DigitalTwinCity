#include "readjson.hpp"

bool ReadJson::read(const char* filepath, JsonDocument& doc) {
    File file = SPIFFS.open(filepath, "r");
    if (!file) {
        Serial.printf("Failed to open file: %s\n", filepath);
        return false;
    }

    DeserializationError error = deserializeJson(doc, file);
    if (error) {
        Serial.print("deserializeJson() failed: ");
        Serial.println(error.c_str());
        file.close();
        return false;
    }

    file.close();
    return true;
}
