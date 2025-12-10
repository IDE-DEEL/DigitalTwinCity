#ifndef JSONREADER_HPP
#define JSONREADER_HPP

#include <Arduino.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <FS.h>

/**
 * @brief Handles reading and writing JSON data using LittleFS with embedded fallback.
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
     * @param name The name associated with the tag.
     * @param location The location associated with the tag.
     * @return true if successful
     */
    bool addTag(const String& uid, const String& name, const String& location);

    /**
     * @brief Get the underlying JsonDocument (for advanced usage).
     * @return JsonDocument& 
     */
    JsonDocument& getDocument();

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