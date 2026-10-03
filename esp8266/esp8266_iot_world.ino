/*
 ============================================================================
  Project: Simple IoT World
  Institution: Dept of ETC, SB Jain, Nagpur
  Authors: Rohit and Team
  Target: ESP8266 (NodeMCU CP2102)

  Hardware Connections:
  - DHT11 Sensor: Data Pin -> D5 (GPIO 14), VCC -> 3.3V, GND -> GND
  - LCD 16x2 I2C (@0x27):
      SCL -> D1 (GPIO 5)
      SDA -> D2 (GPIO 4)
      VCC -> 5V (Vin) or 3.3V, GND -> GND
  - LED Actuator: Anode (+) -> D3 (GPIO 0) through 220Ω resistor, Cathode (-) -> GND

  Libraries Required:
  1. ESP8266WiFi & ESP8266HTTPClient (Built into ESP8266 core)
  2. Wire (Built-in I2C)
  3. LiquidCrystal_I2C (by Frank de Brabander or Marco Schwartz)
  4. DHT sensor library (by Adafruit) + Adafruit Unified Sensor
  5. ArduinoJson (by Benoit Blanchon, v6 or v7)
 ============================================================================
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ----------------- HARDWARE PIN DEFINITIONS ----------------- //
#define DHTPIN D5          // DHT11 Data Pin connected to D5 (GPIO 14)
#define DHTTYPE DHT11      // DHT 11
#define LEDPIN D3          // LED connected to D3 (GPIO 0)
#define LCD_SCL D1         // I2C SCL connected to D1 (GPIO 5)
#define LCD_SDA D2         // I2C SDA connected to D2 (GPIO 4)

// ----------------- WIFI & SERVER CREDENTIALS ----------------- //
const char* ssid     = "ESP8266";
const char* password = "12345678";

// Keep it blank - add your Render URL after deployment (e.g. "https://simple-iot-world.onrender.com")
// Note: Do NOT include a trailing slash!
const char* serverUrl = ""; 

// ----------------- HARDWARE OBJECTS ----------------- //
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHTPIN, DHTTYPE);

// ----------------- GLOBAL VARIABLES ----------------- //
float currentTemp = 34.0;
float currentHum  = 50.0;
String lcdLine1   = "SMART DISPLAY";
String lcdLine2   = "MyData";
String ledState   = "OFF";

unsigned long lastServerSyncTime = 0;
const unsigned long syncInterval = 10000; // Send & fetch data every 10 seconds

// Helper to center or pad strings to 16 characters for 16x2 LCD
void printLcdRows(String row1, String row2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  // Truncate to 16 characters if longer
  if (row1.length() > 16) row1 = row1.substring(0, 16);
  lcd.print(row1);

  lcd.setCursor(0, 1);
  if (row2.length() > 16) row2 = row2.substring(0, 16);
  lcd.print(row2);
}

// ----------------- SERVER COMMUNICATION ----------------- //
void sendAndFetchServerData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Not connected, skipping server sync.");
    return;
  }

  // Check if server URL is configured
  if (strlen(serverUrl) == 0) {
    Serial.println("[HTTP] Server URL is blank. Please configure serverUrl.");
    return;
  }

  // Read sensors
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  if (!isnan(h) && !isnan(t)) {
    currentHum = h;
    currentTemp = t;
  } else {
    Serial.println("[DHT11] Warning: Failed to read from sensor, using last values.");
  }

  Serial.printf("[Sensors] Temp: %.1f C, Humidity: %.1f %%\n", currentTemp, currentHum);

  // Setup WiFi Client (Supports HTTPS for Render)
  WiFiClientSecure client;
  client.setInsecure(); // Bypass SSL fingerprint check on ESP8266

  HTTPClient http;
  String endpoint = String(serverUrl) + "/api/device/data";

  Serial.print("[HTTP] POST to: ");
  Serial.println(endpoint);

  if (http.begin(client, endpoint)) {
    http.addHeader("Content-Type", "application/json");

    // Prepare JSON payload
    StaticJsonDocument<256> reqDoc;
    reqDoc["temperature"] = round(currentTemp);
    reqDoc["humidity"] = round(currentHum);

    String reqPayload;
    serializeJson(reqDoc, reqPayload);

    int httpCode = http.POST(reqPayload);

    if (httpCode > 0) {
      Serial.printf("[HTTP] POST Code: %d\n", httpCode);
      if (httpCode == HTTP_CODE_OK || httpCode == 201) {
        String respPayload = http.getString();
        Serial.println("[HTTP] Response: " + respPayload);

        // Parse response from server
        StaticJsonDocument<512> respDoc;
        DeserializationError err = deserializeJson(respDoc, respPayload);

        if (!err) {
          if (respDoc.containsKey("lcdLine1")) {
            lcdLine1 = respDoc["lcdLine1"].as<String>();
          }
          if (respDoc.containsKey("lcdLine2")) {
            lcdLine2 = respDoc["lcdLine2"].as<String>();
          }
          if (respDoc.containsKey("ledState")) {
            ledState = respDoc["ledState"].as<String>();
            ledState.toUpperCase();
            
            // Actuate physical LED on Pin D3
            if (ledState == "ON") {
              digitalWrite(LEDPIN, HIGH);
            } else {
              digitalWrite(LEDPIN, LOW);
            }
          }
        }
      }
    } else {
      Serial.printf("[HTTP] POST failed, error: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  } else {
    Serial.println("[HTTP] Unable to connect to server");
  }
}

// ----------------- SETUP ----------------- //
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n--- Simple IoT World Starting ---");

  // Initialize LED Pin
  pinMode(LEDPIN, OUTPUT);
  digitalWrite(LEDPIN, LOW);

  // Initialize I2C Pins for LCD 16x2 on NodeMCU D1 & D2
  Wire.begin(LCD_SDA, LCD_SCL);

  // Initialize LCD 16x2
  lcd.init();
  lcd.backlight();

  // Initialize DHT11
  dht.begin();

  // Setup Step 1:
  // R1: MyProject
  // R2: WELCOME
  // delay(3S)
  printLcdRows("MyProject", "WELCOME");
  Serial.println("LCD: MyProject / WELCOME");
  delay(3000);

  // Setup Step 2:
  // R1: CONNECTING TO
  // R2: WiFi.........
  printLcdRows("CONNECTING TO", "WiFi.........");
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int retryCount = 0;
  while (WiFi.status() != WL_CONNECTED && retryCount < 40) {
    delay(500);
    Serial.print(".");
    retryCount++;
  }
  Serial.println();

  // Setup Step 3:
  // R1: CONNECTED TO
  // R2: WiFi...SUCCESS
  if (WiFi.status() == WL_CONNECTED) {
    printLcdRows("CONNECTED TO", "WiFi...SUCCESS");
    Serial.println("WiFi Connected! IP Address: " + WiFi.localIP().toString());
  } else {
    printLcdRows("CONNECTED TO", "WiFi...FAILED");
    Serial.println("WiFi Connection Failed. Running in offline loop mode.");
  }
  delay(2000);

  // Initial sync with server
  sendAndFetchServerData();
  lastServerSyncTime = millis();
}

// ----------------- MAIN LOOP ----------------- //
void loop() {
  // Check if 10 seconds have elapsed to sync with server
  if (millis() - lastServerSyncTime >= syncInterval) {
    sendAndFetchServerData();
    lastServerSyncTime = millis();
  }

  // Exact 4-stage LCD cycling sequence requested in prompt:

  // Stage 1:
  // R1: TEMPERATURE
  // R2: 38 'C
  // delay(2s)
  printLcdRows("TEMPERATURE", String((int)round(currentTemp)) + " 'C");
  delay(2000);

  // Stage 2:
  // R1: HUMIDITY
  // R2: 59 %
  // delay(2s)
  printLcdRows("HUMIDITY", String((int)round(currentHum)) + " %");
  delay(2000);

  // Stage 3:
  // Get below details from Server
  // R1: SMART DISPLAY
  // R2: MyData
  // delay(2s)
  printLcdRows(lcdLine1, lcdLine2);
  delay(2000);

  // Stage 4:
  // Get this from Server
  // R1: LED STATUS
  // R2: ON/OFF
  // delay(2s)
  printLcdRows("LED STATUS", ledState);
  delay(2000);
}
