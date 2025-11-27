#ifndef READJSON_HPP
#define READJSON_HPP

#include <Arduino.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>

/**
 * @brief Reads a JSON file and parses its content into a JsonDocument.
 */
class ReadJson {
public:
    /**
     * @brief Reads a JSON file and parses its content into a JsonDocument.
     * 
     * @param filepath The path to the JSON file.
     * @param doc Reference to a JsonDocument where the parsed data will be stored.
     * @return true if the file was read and parsed successfully, false otherwise.
     */
    bool read(const char* filepath, JsonDocument& doc);
};

#endif // READJSON_HPP