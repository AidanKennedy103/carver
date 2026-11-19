# Carver Scale

A Bluetooth bathroom scale that Carver reads directly. It uses the standard Bluetooth
**Weight Scale** profile (service `0x181D`), the same one Carver's **Connect a scale**
already listens for, so no app changes are needed when you build one.

## Build a prototype (an afternoon, about $20)

| Part | Notes |
|---|---|
| ESP32 dev board | ESP32-WROOM-32 or ESP32-C3 |
| HX711 amplifier | 24-bit load-cell ADC |
| 4 × 50 kg half-bridge load cells | Sold as a "bathroom scale load cell kit"; one per corner |
| Board or old scale shell | Load cells under each corner |
| Power | 3×AAA box or USB |

1. Wire the four cells into one bridge (the kits include a diagram), then HX711
   **DT → GPIO 16**, **SCK → GPIO 4**, **VCC → 3.3 V**, **GND → GND**.
2. In the Arduino IDE, install the board package for ESP32 and the libraries
   **HX711** (Bogdan Necula) and **NimBLE-Arduino** (h2zero).
3. Flash `carver-scale.ino`, open the Serial Monitor at 115200, and adjust
   `CAL_FACTOR` until a known weight reads correctly.
4. In Carver: Physical Metrics → **Scale & Health** → **Connect a scale** → *Carver Scale*.

## Where it connects

| Where | Works? |
|---|---|
| Chrome on Android, Chrome or Edge on a computer | Yes (Web Bluetooth) |
| iPhone, in the free **Bluefy** browser | Yes |
| iPhone, Carver from the Home Screen (Safari) | Not yet: Safari has no Web Bluetooth |

**Getting it on every iPhone** needs one of:
- **Wi-Fi sync (next step):** the ESP32 also has Wi-Fi. The scale posts each weigh-in to
  the signed-in user's Supabase account (a `scale_readings` table with a device code
  you enter once), and Carver picks it up like any other synced data. No Bluetooth needed.
- **A native iOS app (later):** a thin App Store wrapper around Carver that reads
  Bluetooth and Apple Health directly. That also unlocks Home Screen widgets and the
  rest timer on the lock screen.

## Body fat

Body fat needs bioelectrical impedance (the metal pads), which an HX711 can't do. Two
routes:
- **White-label:** OEM makers of smart scales (search "BLE body fat scale OEM",
  e.g. Chipsea or Lefu modules) sell scales with your logo from roughly 500–1,000 units.
  Ask for the standard **Body Composition** service (`0x181B`); Carver already reads
  body fat, muscle and water from it.
- **DIY:** a BIA front-end chip such as the AD5933, which is a much bigger project.
