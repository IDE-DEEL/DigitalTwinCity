# Gebruik van `Connectivity` in `main.cpp`

Hieronder staat de uitleg over hoe je de
nieuwe Connectivity-klasse gebruikt.

---

## 1. Instantie aanmaken

## Bovenaan in main.cpp:

```cpp
#define USE_MQTT 1  // als je MQTT gebruikt

#if USE_MQTT
#include "Connectivity.hpp"
static Connectivity connectivity(WIFI_SSID, WIFI_PASS);
#endif
```

## In setup():

```cpp
void setup()
{
  Serial.begin(115200);
  delay(200);

#if USE_RFID
  rfid.begin();
#endif

#if USE_MQTT
  connectivity.begin();
#endif

#if USE_MAGNETOMETER
  magManager.add(&magLeft);
  magManager.add(&magRight);
  int ret = magManager.initAll();
  if (ret) { ... }
  ret = magManager.calibrateAll();
  if (ret) { ... }
#endif

  delay(5000);
}
```

## In loop():

```cpp
void loop()
{
#if USE_MQTT
  connectivity.loop();
#endif

#if USE_RFID
  String uidHex = rfid.poll();
  if (uidHex.length())
  {
  #if USE_MQTT
    String payload = "{\"uid\":\"" + uidHex + "\",\"ms\":" + String(millis()) + "}";
    connectivity.publish(PUB_TOPIC_RFID, payload);
  #else
    Serial.printf("RFID UID: %s\n", uidHex.c_str());
  #endif
  }
#endif

#if USE_MAGNETOMETER
  int ret = magManager.updateAll();
  if (ret)
  {
    Serial.printf("Magnetometer update error: %d\n", ret);
    freeze();
  }
  Serial.printf("Mag Left: %.2f | Mag Right: %.2f\n",
    magLeft.getFilteredMagnitude(),
    magRight.getFilteredMagnitude());
#endif
}
```
## Optioneel:

Je kan nog een standaard topic instellen, kan bijv. in setup:

```cpp
connectivity.setDefaultPubTopic(PUB_TOPIC_OUT);
connectivity.publishDefault("System online");
```

