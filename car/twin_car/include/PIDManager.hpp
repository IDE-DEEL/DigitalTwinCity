#ifndef PID_MANAGER_HPP
#define PID_MANAGER_HPP

#include <Arduino.h>
#include "PID.hpp"
#include <vector>

/**
 * @brief Manager for multiple PID instances.
 * Allows batch initialization, calibration, and updating.
 * 
 * Usage:
 * 1. Create instance: PIDManager pidManager;
 * 2. Call pidManager.init() in setup()
 * 3. Use pidManager.compute(...) to get PID output for specific road type
 * 4. Use pidManager.reset(...) to reset specific or all PID controllers
 */
class PIDManager
{
public:
    
    /**
     * @brief Initialize a new PID Manager object
     * @note Call this during setup()
     * @return 0 on success or if already initialized.
     *
     * return is int type to accomodate future error handling.
     */
    int init(){

        if (!_pidControllers.empty())
        {
            return 0; // Already initialized
        }

        // Create PID controllers for each road type
        enum road_types road_types_arr[] = {STRAIGHT, CURVE, ROUNDABOUT, T_JUNCTION, CROSSROAD};
        
        for (size_t i = 0; i < sizeof(road_types_arr) / sizeof(road_types_arr   [0]); i++)
        {
            _pidControllers.push_back(new PID(road_types_arr[i]));
        }
        
        // Initialiseer road type
        _previous_road_type = STRAIGHT;
        return 0;
    }
    
    /**
     * @brief Calculate PID output based on two magnetometer readings
     * @param type Road type enum value options: STRAIGHT, CURVE, ROUNDABOUT, T_JUNCTION, CROSSROAD
     * @param magLeft Left magnetometer processed sample
     * @param magRight Right magnetometer processed sample
     * @returns PID output value to be used for steering control
     */
    float compute(enum road_types type, const mag_sample_processed& magLeft, const mag_sample_processed& magRight){
        
        // Update interne previous road type
        _pidControllers[type]->set_previous_road_type(_previous_road_type);
        
        // Bereken output
        float output = _pidControllers[type]->compute(magLeft, magRight);
        
        // Zet manager previous road type naar het type dat net behandeld is
        _previous_road_type = type;
        return output;
    }

    /**
     * @brief Reset PID controller state (errors and timing) for specified road type
     * @param type Road type enum value options: STRAIGHT, CURVE, ROUNDABOUT, T_JUNCTION, CROSSROAD
     */
    void reset(enum road_types type){
        _pidControllers[type]->reset();
    }

    /**
     * @brief Reset all PID controllers
     */
    void reset(){
        for (auto pid : _pidControllers){
            pid->reset();
        }
    }

    private:
    std::vector<PID*> _pidControllers;
    enum road_types _previous_road_type;

};


#endif // PID_MANAGER_HPP