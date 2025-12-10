#ifndef RESERVATION_MANAGER_HPP
#define RESERVATION_MANAGER_HPP

#include <Arduino.h>
#include "Connectivity.hpp"

/**
 * @brief Manager voor reserveren en vrijgeven van baanstukken via MQTT.
 *
 * De manager publiceert reserve/release requests naar
 * `track/segments/{segmentId}/request` en luistert op
 * `track/segments/+/response`. Correlatie gebeurt op een gegenereerde
 * `nonce` die in het request wordt opgenomen en door de server in de
 * response wordt teruggegeven.
 *
 * Deze implementatie is simpel en blockt tijdens een reserve-aanvraag
 * totdat een response met `status: "ok"` is ontvangen (retry loop).
 */
class ReservationManager
{
public:
    ReservationManager();

    /**
     * @brief Initialiseer de manager met een Connectivity-instantie.
     * @param connectivity Pointer naar de bestaande Connectivity instantie.
     * @param clientId Optionele client identifier (bijv. "car-1").
     */
    void begin(Connectivity* connectivity, const char* clientId = nullptr);

    /**
     * @brief Vraag een reservering aan voor een segment.
     *
     * Blocking call: het wacht tot een response met status "ok" of tot timeout.
     * Bij denial zal de functie wachten `retryIntervalMs` en het verzoek
     * opnieuw proberen (oneindig, aanpasbaar binnen implementatie).
     *
     * @param segmentId Segment identifier (bv. "A1").
     * @param leaseMs Gewenste TTL in ms voor de reservering.
     * @param outReservationId Uitgangsparameter die bij succes de reservation_id bevat.
     * @param timeoutMs Hoe lang (ms) te wachten op een enkele response poging.
     * @param retryIntervalMs Interval (ms) tussen retries na denial/timeout.
     * @return true als reservering gelukt is en `outReservationId` is gezet.
     */
    bool requestReservation(const String& segmentId, unsigned long leaseMs, String& outReservationId,
                            unsigned long timeoutMs = 10000UL, unsigned long retryIntervalMs = 1000UL);

    /**
     * @brief Geef een reservering vrij.
     * @param segmentId Segment identifier.
     * @param reservationId Reservation id (optioneel).
     * @param timeoutMs Hoe lang (ms) te wachten op response.
     * @return true bij succesvolle release.
     */
    bool releaseReservation(const String& segmentId, const String& reservationId,
                            unsigned long timeoutMs = 5000UL);

    /**
     * @brief Periodieke housekeeping (placeholder).
     *
     * Roep dit periodiek aan in `loop()` indien extra taken gewenst zijn.
     */
    void loop();

private:
    Connectivity* _conn;
    String _clientId;

    // Correlatie / response buffer
    String _pendingNonce;
    String _lastResponseTopic;
    String _lastResponsePayload;
    volatile bool _gotResponse;

    // Singleton pointer voor static callback dispatch
    static ReservationManager* _instance;

    // Static wrapper om MQTT callbacks aan deze instance door te geven
    static void staticMqttHandler(const char* topic, byte* payload, unsigned int len);
    void handleMqttMessage(const char* topic, byte* payload, unsigned int len);

    String makeNonce();
};

#endif // RESERVATION_MANAGER_HPP