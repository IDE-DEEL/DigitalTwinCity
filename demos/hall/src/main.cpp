#include <Arduino.h>

// ADC pin definition
#define ADC_PIN 36  // GPIO 36 (ADC0)

// Hall sensor specifications
#define QUIESCENT_VOLTAGE_5V 2.5    // V (output at 0 Gauss when powered by 5V)
#define SENSITIVITY 1.8             // mV/G (typical sensitivity)
#define VCC_VOLTAGE 3.3             // V (supply voltage)
#define EXPECTED_QUIESCENT_VOLTAGE (QUIESCENT_VOLTAGE_5V * (VCC_VOLTAGE / 5.0))

struct adcReading {
  int raw;            // Raw ADC value
  float voltage;     // Converted voltage
  float field;       // Calculated magnetic field in Gauss
  float devVoltage;  // Deviation from expected quiescent voltage
  float devPercent;  // Deviation percentage
};

void printHeader() {
  Serial.printf("Hall Effect Sensor Reading - GPIO %d\n", ADC_PIN);
  Serial.print("Expected quiescent voltage: ");
  Serial.print(EXPECTED_QUIESCENT_VOLTAGE, 3);
  Serial.println(" V");
  Serial.println("Raw ADC | Voltage (V) | Magnetic Field (G) | Dev (V) | Dev (%)");
  Serial.println("------------------------------------------------------------------");
}

void getADCReading(adcReading& reading) {
  /* Calculations and values were extracted from datasheet here: https://www.alldatasheet.com/datasheet-pdf/view/473135/SECELECTRONICS/SS49E.html */
  
  // Read analog value from ADC Pin
  reading.raw = analogRead(ADC_PIN);
  
  // Convert to voltage (sensor operates 0-3.3V range)
  reading.voltage = (reading.raw / 4095.0) * VCC_VOLTAGE;
  
  // Calculate magnetic field in Gauss
  // Field = (Voltage - Expected Quiescent) / Sensitivity in Volts
  reading.field = (reading.voltage - EXPECTED_QUIESCENT_VOLTAGE) / (SENSITIVITY / 1000.0);
  
  // Calculate deviation from expected quiescent voltage
  reading.devVoltage = reading.voltage - EXPECTED_QUIESCENT_VOLTAGE;
  
  // Calculate percentage deviation from expected quiescent
  reading.devPercent = 0.0;
  if (abs(EXPECTED_QUIESCENT_VOLTAGE) > 0.001) {
    reading.devPercent = (reading.devVoltage / EXPECTED_QUIESCENT_VOLTAGE) * 100.0;
  }
}

void printADCReading(const adcReading& reading) {
  // Print raw ADC value
  Serial.print(reading.raw);
  Serial.print("     | ");

  // Print voltage with 3 decimal places
  Serial.print(reading.voltage, 3);  // 3 decimal places
  Serial.print(" V     | ");

  // Print magnetic field with 1 decimal place
  if (reading.field >= 0) {
    Serial.print(" ");
  }
  Serial.print(reading.field, 1);  // 1 decimal place
  Serial.print(" G      | ");

  // Print deviation from expected quiescent in voltage
  if (reading.devVoltage >= 0) {
    Serial.print(" ");
  }
  Serial.print(reading.devVoltage, 3);  // 3 decimal places for voltage
  Serial.print(" V   | ");

  // Print deviation from expected quiescent in percentage
  if (reading.devPercent >= 0) {
    Serial.print(" ");
  }
  Serial.print(reading.devPercent, 1);  // 1 decimal place
  Serial.println(" %");
}

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  
  // Configure ADC pin
  pinMode(ADC_PIN, INPUT);
  
  // Set ADC resolution to 12 bits (0-4095)
  analogReadResolution(12);
  
  // Print header
  printHeader();
}

void loop() {

  // Read ADC and calculate values
  struct adcReading reading;
  getADCReading(reading);

  // Print the reading
  printADCReading(reading);

  // Wait 100ms before next reading to make console output readable
  delay(100);
}