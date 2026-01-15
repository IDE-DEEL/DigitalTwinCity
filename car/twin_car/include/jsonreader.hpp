#ifndef JSONREADER_HPP
#define JSONREADER_HPP

#include <Arduino.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <FS.h>
#include "PID.hpp"
#include "connectivity.hpp"

/**
 * @brief Handles reading and writing JSON data using LittleFS with embedded fallback.
 * 
 * Usage:
 * 1. Create instance: JsonReader jsonReader("/rfid.json");
 * 2. Call jsonReader.begin() in setup()
 * 3. Use jsonReader.load() and jsonReader.save() to manage JSON data
 * 4. Use jsonReader.findTag(...) to search for tags
 * 5. Use jsonReader.addTag(...) to add new tags
 * 6. Use jsonReader.getDocument() for advanced JSON manipulations
 * 7. Uses embedded factory default JSON if the file is missing
 */
class JsonReader {
public:
    /**
     * @brief Construct a new Json Reader object
     * 
     * @param filePath The path to the JSON file in LittleFS (e.g., "/rfid.json")
     */
    JsonReader(const char* filePath = "/rfid.json");

    /**
     * @brief Initialize LittleFS and load the JSON data.
     *        If the file is missing, it restores from embedded factory defaults.
     * @return true if initialization and loading were successful
     * @return false if something went wrong
     */
    bool begin();

    /**
     * @brief Reload the data from the file system.
     * @return true if successful
     */
    bool load();

    /**
     * @brief Save the current state of the JSON document to the file system.
     * @return true if successful
     */
    bool save();

    /**
     * @brief Search for a tag by its UID.
     * 
     * @param uidHex The UID to search for.
     * @param resultDoc A JsonDocument to store the result if found.
     * @return true if the tag was found
     * @return false if not found
     */
    bool findTag(const String& uidHex, JsonDocument& resultDoc);

    /**
     * @brief Add a new tag to the database and save it.
     * 
     * @param uid The UID of the tag.
     * @param tile_nr The tile where the tag is located.
     * @param tag_index The index of the tag within the specific tile type.
     * @return true if successful
     */
    bool addTag(const String& uid, int tile_nr, const char* tag_index);

    /**
     * @brief Get the underlying JsonDocument (for advanced usage).
     * @return JsonDocument& 
     */
    JsonDocument& getDocument();

    /**
     * @brief Get road type enum from tag name.
     * 
     * @param tag_name The name of the tag.
     * @return enum road_types Corresponding road type.
     */
    enum road_types get_road_type_from_tag(const String& tag_name);

private:
    const char* _filePath;
    JsonDocument _doc;

    /**
     * @brief Restore the file from embedded program memory.
     * @return true if successful
     */
    bool restoreFactoryDefaults();
};

#endif // JSONREADER_HPP