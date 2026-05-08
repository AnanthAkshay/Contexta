const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

// In-memory "database" for demo purposes
let homeSSID = 'MyHomeWiFi';
let history = [];

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Root route for status check
app.get('/', (req, res) => {
  res.send('<h1>🚀 Contexta Backend is Live</h1><p>The API is ready to receive sync data from the mobile app.</p>');
});

// 1. Sync Meeting Context
app.post('/context', (req, res) => {
  const { context, confidence, action, eventTitle, source } = req.body;
  console.log(`[Meeting] ${context} - ${eventTitle} (${confidence})`);
  history.push({ type: 'MEETING', data: req.body, time: new Date() });
  res.status(200).json({ status: 'ok' });
});

// 2. Sync Movement Data
app.post('/movement', (req, res) => {
  const { isMoving, variance, transportMode } = req.body;
  console.log(`[Movement] ${transportMode} (Variance: ${variance})`);
  history.push({ type: 'MOVEMENT', data: req.body, time: new Date() });
  res.status(200).json({ status: 'ok' });
});

// 3. Sync Home Detection
app.post('/home/detect', (req, res) => {
  const { currentSSID } = req.body;
  const isHome = currentSSID === homeSSID;
  console.log(`[Home] Connected: ${currentSSID} | Home: ${homeSSID} | Match: ${isHome}`);
  res.status(200).json({ status: 'ok', isHome });
});

// 4. Set Home SSID
app.post('/home/set', (req, res) => {
  const { ssid } = req.body;
  if (ssid) {
    homeSSID = ssid;
    console.log(`[Home] New Home SSID set: ${homeSSID}`);
    res.status(200).json({ status: 'ok', homeSSID });
  } else {
    res.status(400).json({ error: 'SSID required' });
  }
});

// Get History (Bonus for debugging)
app.get('/history', (req, res) => {
  res.json(history.slice(-20).reverse());
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🚀 Contexta Express Backend Running
  ----------------------------------
  Local:            http://localhost:${PORT}
  Android Emulator:  http://10.0.2.2:${PORT}
  ----------------------------------
  `);
});
