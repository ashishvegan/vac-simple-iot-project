const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'simple-iot-world-secret-key-2026';
const DB_FILE = path.join(__dirname, 'data', 'db.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Helper to get formatted Time and Date strictly in Asia/Kolkata (IST +5:30)
function getKolkataTimeAndDate(date = new Date()) {
  try {
    const timeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);

    const dateParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).formatToParts(date);

    const day = dateParts.find(p => p.type === 'day')?.value || '01';
    const month = dateParts.find(p => p.type === 'month')?.value || '01';
    const year = dateParts.find(p => p.type === 'year')?.value || '2026';

    return {
      time: timeParts,
      date: `${day}-${month}-${year}`
    };
  } catch (err) {
    // Fallback manual offset (+5:30 = 330 mins)
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    let hours = ist.getHours();
    const minutes = ist.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 is 12
    const strHours = hours.toString().padStart(2, '0');
    const time = `${strHours}:${minutes} ${ampm}`;

    const day = ist.getDate().toString().padStart(2, '0');
    const month = (ist.getMonth() + 1).toString().padStart(2, '0');
    const year = ist.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    return { time, date: dateStr };
  }
}

// Database initial state template
const initialDb = {
  users: [
    {
      id: "u_default_ashish",
      name: "Ashish",
      email: "ashish@example.com",
      passwordHash: bcrypt.hashSync("123456", 10)
    }
  ],
  deviceState: {
    online: false,
    lastSeen: 0,
    currentTemperature: 34,
    currentHumidity: 50,
    lcdLine1: "SMART DISPLAY",
    lcdLine2: "MyData",
    ledState: "OFF"
  },
  recordCounter: 4,
  records: [
    {
      id: 1,
      temperature: 34,
      humidity: 50,
      time: "11:30 AM",
      date: "03-10-2026",
      timestamp: Date.now() - 180000
    },
    {
      id: 2,
      temperature: 35,
      humidity: 49,
      time: "11:45 AM",
      date: "03-10-2026",
      timestamp: Date.now() - 120000
    },
    {
      id: 3,
      temperature: 34,
      humidity: 51,
      time: "12:00 PM",
      date: "03-10-2026",
      timestamp: Date.now() - 60000
    },
    {
      id: 4,
      temperature: 34,
      humidity: 50,
      time: "12:04 PM",
      date: "03-10-2026",
      timestamp: Date.now()
    }
  ]
};

// Safe DB file load / save
function loadDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      saveDb(initialDb);
      return initialDb;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data.deviceState) data.deviceState = initialDb.deviceState;
    if (!data.records) data.records = [];
    if (!data.users) data.users = initialDb.users;
    return data;
  } catch (err) {
    console.error('Error loading db.json:', err);
    return initialDb;
  }
}

function saveDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing db.json:', err);
  }
}

let db = loadDb();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Auth Helper
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ----------------- AUTH ROUTES ----------------- //

// Register
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newUser = {
    id: 'u_' + Date.now(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash
  };

  db.users.push(newUser);
  saveDb(db);

  const token = jwt.sign(
    { id: newUser.id, name: newUser.name, email: newUser.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.status(201).json({
    message: 'User registered successfully',
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const match = bcrypt.compareSync(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    message: 'Login successful',
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// Verify Current User
app.get('/api/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ----------------- IOT DEVICE & HARDWARE ROUTES ----------------- //

// ESP8266 calls this to send sensor readings (every 10s)
// Returns LCD lines & LED state in response for maximum efficiency
app.post('/api/device/data', (req, res) => {
  const { temperature, humidity } = req.body;

  if (temperature === undefined || humidity === undefined) {
    return res.status(400).json({ error: 'temperature and humidity are required' });
  }

  const tempNum = Math.round(parseFloat(temperature));
  const humNum = Math.round(parseFloat(humidity));
  const now = new Date();
  const { time, date } = getKolkataTimeAndDate(now);

  db.deviceState.currentTemperature = isNaN(tempNum) ? 0 : tempNum;
  db.deviceState.currentHumidity = isNaN(humNum) ? 0 : humNum;
  db.deviceState.lastSeen = Date.now();
  db.deviceState.online = true;

  // Add to records
  const nextId = (db.recordCounter || db.records.length) + 1;
  db.recordCounter = nextId;

  const newRecord = {
    id: nextId,
    temperature: db.deviceState.currentTemperature,
    humidity: db.deviceState.currentHumidity,
    time: time,
    date: date,
    timestamp: Date.now()
  };

  db.records.push(newRecord);

  // Keep records capped at recent 500 to avoid unbounded file growth
  if (db.records.length > 500) {
    db.records = db.records.slice(-500);
  }

  saveDb(db);

  return res.json({
    success: true,
    message: 'Reading recorded',
    lcdLine1: db.deviceState.lcdLine1 || 'SMART DISPLAY',
    lcdLine2: db.deviceState.lcdLine2 || 'MyData',
    ledState: db.deviceState.ledState || 'OFF'
  });
});

// ESP8266 or Dashboard poll endpoint
app.get('/api/device/poll', (req, res) => {
  // Update heartbeat if request comes from device
  if (req.query.source === 'esp8266') {
    db.deviceState.lastSeen = Date.now();
    db.deviceState.online = true;
    saveDb(db);
  }

  return res.json({
    lcdLine1: db.deviceState.lcdLine1 || 'SMART DISPLAY',
    lcdLine2: db.deviceState.lcdLine2 || 'MyData',
    ledState: db.deviceState.ledState || 'OFF'
  });
});

// Device and Dashboard Status (checks if ESP8266 is online: lastSeen within 35s)
app.get('/api/device/status', (req, res) => {
  const now = Date.now();
  const diffSec = Math.floor((now - (db.deviceState.lastSeen || 0)) / 1000);
  const isOnline = diffSec <= 35 && db.deviceState.lastSeen > 0;

  res.json({
    online: isOnline,
    lastSeen: db.deviceState.lastSeen,
    secondsAgo: diffSec,
    currentTemperature: db.deviceState.currentTemperature,
    currentHumidity: db.deviceState.currentHumidity,
    lcdLine1: db.deviceState.lcdLine1,
    lcdLine2: db.deviceState.lcdLine2,
    ledState: db.deviceState.ledState,
    totalRecords: db.records.length
  });
});

// Control LCD text (Field 1 & Field 2, max 16 chars each)
app.post('/api/control/lcd', authenticateToken, (req, res) => {
  let { line1, line2 } = req.body;
  
  line1 = (line1 !== undefined ? String(line1) : '').trim().substring(0, 16);
  line2 = (line2 !== undefined ? String(line2) : '').trim().substring(0, 16);

  db.deviceState.lcdLine1 = line1 || 'SMART DISPLAY';
  db.deviceState.lcdLine2 = line2 || 'MyData';

  saveDb(db);

  return res.json({
    success: true,
    message: 'LCD text updated successfully',
    lcdLine1: db.deviceState.lcdLine1,
    lcdLine2: db.deviceState.lcdLine2
  });
});

// Control LED (Turn LED ON or OFF)
app.post('/api/control/led', authenticateToken, (req, res) => {
  const { state } = req.body;
  const upperState = String(state).toUpperCase();

  if (upperState !== 'ON' && upperState !== 'OFF') {
    return res.status(400).json({ error: 'State must be ON or OFF' });
  }

  db.deviceState.ledState = upperState;
  saveDb(db);

  return res.json({
    success: true,
    message: `LED switched ${upperState}`,
    ledState: db.deviceState.ledState
  });
});

// ----------------- HISTORICAL RECORDS ROUTES ----------------- //

// Get Records with Pagination
app.get('/api/records', authenticateToken, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));

  // Reverse so newest records appear first
  const reversedRecords = [...db.records].reverse();
  const total = reversedRecords.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginated = reversedRecords.slice(startIndex, startIndex + limit);

  return res.json({
    page,
    limit,
    total,
    totalPages,
    records: paginated
  });
});

// Get Latest Records for Charts (last N records chronologically)
app.get('/api/records/recent', authenticateToken, (req, res) => {
  const count = parseInt(req.query.count) || 20;
  const recent = db.records.slice(-count);
  return res.json({ records: recent });
});

// Delete Record by ID
app.delete('/api/records/:id', authenticateToken, (req, res) => {
  const recordId = parseInt(req.params.id);
  const initialLength = db.records.length;
  db.records = db.records.filter(r => r.id !== recordId);

  if (db.records.length === initialLength) {
    return res.status(404).json({ error: 'Record not found' });
  }

  saveDb(db);
  return res.json({ success: true, message: 'Record deleted' });
});

// Clear all records
app.delete('/api/records', authenticateToken, (req, res) => {
  db.records = [];
  saveDb(db);
  return res.json({ success: true, message: 'All records cleared' });
});

// Simulator endpoint: handy for manual testing when ESP8266 is not yet online
app.post('/api/sim/reading', authenticateToken, (req, res) => {
  let { temperature, humidity } = req.body;
  if (temperature === undefined) {
    temperature = Math.floor(Math.random() * (42 - 25 + 1)) + 25;
  }
  if (humidity === undefined) {
    humidity = Math.floor(Math.random() * (75 - 40 + 1)) + 40;
  }

  const { time, date } = getKolkataTimeAndDate(new Date());
  db.deviceState.currentTemperature = parseInt(temperature);
  db.deviceState.currentHumidity = parseInt(humidity);
  db.deviceState.lastSeen = Date.now();
  db.deviceState.online = true;

  const nextId = (db.recordCounter || db.records.length) + 1;
  db.recordCounter = nextId;

  const newRecord = {
    id: nextId,
    temperature: db.deviceState.currentTemperature,
    humidity: db.deviceState.currentHumidity,
    time,
    date,
    timestamp: Date.now()
  };

  db.records.push(newRecord);
  saveDb(db);

  return res.json({
    success: true,
    message: 'Simulated reading added',
    record: newRecord
  });
});

// Catch-all for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(` Simple IoT World Server running on port ${PORT}`);
  console.log(` Timezone: Asia/Kolkata (+5:30)`);
  console.log(` Deployable on Render: Ready`);
  console.log(`===============================================`);
});
