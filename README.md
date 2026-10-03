# Simple IoT World 🌐⚡

An end-to-end IoT and Web Application integrating an **ESP8266 (NodeMCU CP2102)** microcontroller with an **Express & Node.js** cloud backend, deployable directly on **Render**, featuring a **Tailwind CSS** responsive dashboard with real-time gauges, historical analytics, 16x2 LCD remote control, and LED actuation.

> **Project Credit**: Developed with Love ❤️ by **Rohit and Team**, Department of ETC, SB Jain, Nagpur.

---

## 📋 Features Checklist

- **Hardware & Microcontroller**:
  - **ESP8266 (NodeMCU CP2102)**
  - **DHT11 Sensor**: Pin `D5` (GPIO 14)
  - **16x2 LCD I2C (@0x27)**: Pins `D1` (SCL) & `D2` (SDA)
  - **LED Actuator**: Pin `D3` (GPIO 0)
  - WiFi credentials: SSID `ESP8266`, Password `12345678`
  - LCD Sequence on startup & loop as specified in prompt
  - HTTPS / SSL support for Render cloud connection (`WiFiClientSecure` with `client.setInsecure()`)
- **Backend**:
  - Node.js & Express REST API
  - Simple JSON Database (`data/db.json`)
  - Authentication (JWT + Bcrypt)
  - Real-time ESP8266 Online/Offline status detection
  - Asia/Kolkata (+5:30) IST timestamps
  - Deployable on Render with `npm start`
- **Frontend Dashboard**:
  - Vibrant Red Gradient theme with Glassmorphism
  - Light / Dark Mode Toggle with persistence
  - **Page 1: Auth**: Login & Registration forms with demo account preloaded
  - **Page 2: Web Dashboard**:
    - **Header**: App Name, "Welcome <User>", ESP8266 Online/Offline beacon status, Theme toggle, Logout
    - **Tab 1: Monitor & Records**:
      - Current Temperature & Humidity in cards with colorful Radial Gauges & Seek Bars
      - Interactive Chart.js graphs for Temperature and Humidity trends
      - Paginated Historical Records table (`# | Temperature | Humidity | Time | Date | Action`)
      - Single-click row deletion & Clear all records
      - Built-in sensor simulator button for manual testing before hardware is connected
    - **Tab 2: Smart LCD Display**:
      - 2 input fields (Row 1 & Row 2, Max 16 characters each with live counters)
      - Realistic 16x2 LCD hardware simulator preview with dot matrix font
      - "Save to LCD" button and quick presets
    - **Tab 3: LED Control**:
      - Innovative 3D illuminated toggle switch and glowing neon bulb visualizer
      - Real-time cloud sync with ESP8266 pin `D3`
    - **Footer**: Animated pulsing heart icon with team and department credits

---

## 🔌 Hardware Pin Connections

| Component | Pin on NodeMCU (ESP8266) | GPIO Number | Description |
| :--- | :--- | :--- | :--- |
| **DHT11 Sensor** | `D5` | `GPIO 14` | Data pin (use 10k pull-up if module doesn't have one) |
| **DHT11 VCC** | `3V3` | - | 3.3V Power |
| **DHT11 GND** | `G` | - | Ground |
| **16x2 LCD I2C SCL** | `D1` | `GPIO 5` | I2C Clock |
| **16x2 LCD I2C SDA** | `D2` | `GPIO 4` | I2C Data |
| **LCD VCC / GND** | `Vin` (5V) / `G` | - | Power & Ground |
| **LED Anode (+)** | `D3` | `GPIO 0` | Connect through 220Ω - 330Ω resistor |
| **LED Cathode (-)** | `G` | - | Ground |

---

## 🚀 Running the Web Application Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
The server will start at `http://localhost:3000`.

### 3. Login to Dashboard
Open your browser at `http://localhost:3000`:
- **Default Account**:
  - Email: `ashish@example.com`
  - Password: `123456`
- Or click **Register** to create a new user.

---

## ☁️ Deploying to Render

1. **Push to GitHub**:
   Initialize a Git repository and push this project folder to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Simple IoT World Web App"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Create a Web Service on Render**:
   - Go to [Render Dashboard](https://dashboard.render.com).
   - Click **New +** > **Web Service**.
   - Select your GitHub repository.
   - Configure settings:
     - **Name**: `simple-iot-world` (or any unique name)
     - **Region**: Any (e.g., Singapore / Frankfurt / Oregon)
     - **Branch**: `main`
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Free
   - Click **Create Web Service**.

3. **Copy your Render URL**:
   Once deployed, Render gives you a public URL such as:
   `https://simple-iot-world.onrender.com`

---

## 🛠️ Flashing ESP8266 (Arduino IDE)

1. Open Arduino IDE.
2. Install **ESP8266 Board Package**:
   - Go to **File** > **Preferences**.
   - Add to *Additional Boards Manager URLs*: `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
   - Go to **Tools** > **Board** > **Boards Manager**, search for `esp8266` and install.
3. Install Required Libraries via **Tools** > **Manage Libraries**:
   - `LiquidCrystal_I2C` (by Frank de Brabander or Marco Schwartz)
   - `DHT sensor library` (by Adafruit) + `Adafruit Unified Sensor`
   - `ArduinoJson` (v6 or v7 by Benoit Blanchon)
4. Open `esp8266/esp8266_iot_world.ino`.
5. Update your Render URL on line 42:
   ```cpp
   const char* serverUrl = "https://your-app-name.onrender.com"; // Your Render URL (No trailing slash)
   ```
6. Select Board **NodeMCU 1.0 (ESP-12E Module)** and choose your COM port.
7. Click **Upload**.

---

## 🧪 Manual Testing

- The dashboard includes a **Simulate Sensor Reading** button on Tab 1.
- You can test adding readings, checking charts, testing the pagination, saving LCD text, and turning the LED ON and OFF directly in the browser even before hardware connection!
