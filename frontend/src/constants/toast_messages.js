/**
 * Centralized toast notification messages
 * These messages are used throughout the application for consistent user feedback
 */

export const TOAST_MESSAGES = {
    nl: {
        error:{
            WS_CONNECTION_ERROR: "Kan geen verbinding maken met de server. Probeer het opnieuw. Als het probleem aanhoudt, neem dan contact op met de docent.",
            SIMULATION_VALIDATION_ERROR: "Fout bij starten simulatie: de ingevoerde gegevens voldoen niet aan de vereisten. Controleer je invoer en probeer het opnieuw.",
        },
        info: {
            UNREACHABLE_HOUSES: "Let op: er zijn huizen die niet bereikt worden met de geselecteerde routes.",
        },
      
    },
    en: {
        error:{
            WS_CONNECTION_ERROR: "Unable to connect to the server. Please try again. If the problem persists, please contact your instructor.",
            SIMULATION_VALIDATION_ERROR: "Error starting simulation: the entered data does not meet the requirements. Please check your input and try again.",
        },
        info: {
            UNREACHABLE_HOUSES: "Note: There are houses that are not reachable with the selected routes.",
        },
    },
};
