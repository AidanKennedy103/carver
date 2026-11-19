// Carver Scale firmware: an ESP32 + HX711 bathroom scale that speaks the standard
// Bluetooth Weight Scale profile, so Carver (and any app that supports the profile)
// can read it with no pairing code or custom protocol.
//
// Hardware (about $15–25):
//   - ESP32 dev board (ESP32-WROOM-32 or ESP32-C3)
//   - HX711 load-cell amplifier
//   - 4 × 50 kg half-bridge load cells (the kind in every cheap bathroom scale), wired as one full bridge
//   - a flat board or an old bathroom scale's shell, and a 3×AAA box or USB power
// Wiring: HX711 DT → GPIO 16, SCK → GPIO 4, VCC → 3.3 V, GND → GND.
//
// Libraries (Arduino IDE → Library Manager): "HX711" by Bogdan Necula, and
// "NimBLE-Arduino" by h2zero.
//
// Calibrating: flash with CAL_FACTOR as is, open the Serial Monitor (115200), stand on
// it with nothing, then put a known weight on. Change CAL_FACTOR until it reads right.
//
// How it works: at power-on it tares (keep it empty for 2 s). Step on; when the reading
// holds steady for 1.5 s it's sent as a Weight Measurement (0x2A9D) indication, in kg
// at 0.005 kg resolution. Carver's "Connect a scale" finds it as "Carver Scale".

#include <HX711.h>
#include <NimBLEDevice.h>

static const int PIN_DT = 16, PIN_SCK = 4;
static float CAL_FACTOR = 21500.0;          // raw units per kg: calibrate this
static const float ON_SCALE_KG = 5.0;       // below this, nobody is standing on it
static const float STEADY_KG = 0.1;         // readings within this count as steady
static const uint32_t STEADY_MS = 1500;

HX711 cell;
NimBLECharacteristic *weightChar;
bool connected = false;

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer *) override { connected = true; }
  void onDisconnect(NimBLEServer *) override { connected = false; NimBLEDevice::startAdvertising(); }
};

// Weight Measurement: flags (SI units, no timestamp/user/BMI), then weight in 0.005 kg steps
void sendWeight(float kg) {
  uint16_t raw = (uint16_t)lroundf(kg / 0.005f);
  uint8_t data[3] = { 0x00, (uint8_t)(raw & 0xff), (uint8_t)(raw >> 8) };
  weightChar->setValue(data, sizeof data);
  weightChar->indicate();
  Serial.printf("Sent %.2f kg\n", kg);
}

void setup() {
  Serial.begin(115200);
  cell.begin(PIN_DT, PIN_SCK);
  cell.set_scale(CAL_FACTOR);
  delay(500);
  cell.tare(20);   // keep the scale empty while it starts

  NimBLEDevice::init("Carver Scale");
  NimBLEServer *server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  NimBLEService *svc = server->createService((uint16_t)0x181D);   // Weight Scale
  // Weight Scale Feature: 0x00000000 = no timestamp, no multiple users, no BMI, default resolution
  NimBLECharacteristic *feature = svc->createCharacteristic((uint16_t)0x2A9E, NIMBLE_PROPERTY::READ);
  uint8_t feat[4] = { 0, 0, 0, 0 };
  feature->setValue(feat, sizeof feat);
  weightChar = svc->createCharacteristic((uint16_t)0x2A9D, NIMBLE_PROPERTY::INDICATE);
  svc->start();
  NimBLEAdvertising *adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID((uint16_t)0x181D);
  adv->setName("Carver Scale");
  adv->start();
  Serial.println("Carver Scale ready");
}

void loop() {
  static float last = 0, sent = 0;
  static uint32_t steadySince = 0;
  if (!cell.is_ready()) { delay(10); return; }
  float kg = cell.get_units(4);
  if (kg < ON_SCALE_KG) { sent = 0; steadySince = 0; last = kg; delay(100); return; }
  if (fabsf(kg - last) > STEADY_KG) steadySince = millis();
  last = kg;
  // Live readings while settling, then the final one once it holds still
  if (connected && millis() - steadySince >= STEADY_MS && fabsf(kg - sent) > STEADY_KG) {
    sendWeight(kg);
    sent = kg;
  }
  delay(100);
}
