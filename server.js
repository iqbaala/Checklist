const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const QRCode = require('qrcode');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const AUTH_DIR = path.join(__dirname, 'auth_info');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ═══════════════════════════════════════════
// 1. DATA PERSISTENCE
// ═══════════════════════════════════════════
const defaultData = {
  items: [
    { id: 'yt-1', type: 'youtube', name: 'Channel YouTube 1', url: '' },
    { id: 'yt-2', type: 'youtube', name: 'Channel YouTube 2', url: '' },
    { id: 'yt-3', type: 'youtube', name: 'Channel YouTube 3', url: '' },
    { id: 'yt-4', type: 'youtube', name: 'Channel YouTube 4', url: '' },
    { id: 'yt-5', type: 'youtube', name: 'Channel YouTube 5', url: '' },
    { id: 'yt-6', type: 'youtube', name: 'Channel YouTube 6', url: '' },
    { id: 'yt-7', type: 'youtube', name: 'Channel YouTube 7', url: '' },
    { id: 'yt-8', type: 'youtube', name: 'Channel YouTube 8', url: '' },
    { id: 'sp-1', type: 'shopee', name: 'Toko Shopee 1', url: '' },
    { id: 'sp-2', type: 'shopee', name: 'Toko Shopee 2', url: '' },
    { id: 'sp-3', type: 'shopee', name: 'Toko Shopee 3', url: '' },
    { id: 'sp-4', type: 'shopee', name: 'Toko Shopee 4', url: '' }
  ],
  log: {},
  settings: {
    targetPhone: '',
    morningTime: '06:00',
    eveningTime: '20:00',
    morningEnabled: true,
    eveningEnabled: true,
    autoReset: true,
    timezone: 'Asia/Jakarta'
  }
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      return { ...defaultData, ...JSON.parse(content) };
    }
  } catch (err) {
    console.error('Error reading data file:', err);
  }
  return defaultData;
}

let appData = loadData();

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(appData, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving data file:', err);
  }
}

// ═══════════════════════════════════════════
// 2. WHATSAPP CONNECTION (BAILEYS)
// ═══════════════════════════════════════════
let sock = null;
let currentQR = null;
let botStatus = 'disconnected'; // 'connected' | 'scan_needed' | 'disconnected'
let connectedNumber = null;

async function connectToWhatsApp() {
  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: true,
      browser: ['Daily Checklist Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQR = await QRCode.toDataURL(qr);
        botStatus = 'scan_needed';
        console.log('📌 WhatsApp QR Code siap di-scan!');
      }

      if (connection === 'open') {
        currentQR = null;
        botStatus = 'connected';
        connectedNumber = sock.user?.id ? sock.user.id.split(':')[0] : 'Aktif';
        console.log(`✅ WhatsApp Bot Nomor Kedua BERHASIL TERTAMBUNG: ${connectedNumber}`);
      }

      if (connection === 'close') {
        botStatus = 'disconnected';
        currentQR = null;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`⚠️ Koneksi WhatsApp terputus (status code: ${statusCode}). Reconnecting: ${shouldReconnect}`);

        if (shouldReconnect) {
          setTimeout(connectToWhatsApp, 3000);
        } else {
          console.log('🚪 Nomor kedua telah logout. Mereset session auth...');
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch (e) {}
          setTimeout(connectToWhatsApp, 2000);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (err) {
    console.error('Error initializing WhatsApp socket:', err);
    setTimeout(connectToWhatsApp, 5000);
  }
}

connectToWhatsApp();

// ═══════════════════════════════════════════
// 3. SEND MESSAGE HELPER
// ═══════════════════════════════════════════
async function sendWhatsApp(targetRaw, text) {
  if (!sock || botStatus !== 'connected') {
    throw new Error('WhatsApp Bot (nomor kedua) belum tersambung!');
  }

  let phone = String(targetRaw).replace(/\D/g, '');
  if (phone.startsWith('0')) {
    phone = '62' + phone.slice(1);
  }

  if (!phone || phone.length < 8) {
    throw new Error('Nomor tujuan tidak valid!');
  }

  const jid = `${phone}@s.whatsapp.net`;
  return await sock.sendMessage(jid, { text });
}

function getTodayString() {
  const d = new Date();
  const year = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  return year; // YYYY-MM-DD in WIB
}

function buildSummaryMessage(type) {
  const dStr = getTodayString();
  const dayLog = appData.log[dStr] || {};
  const items = appData.items || [];

  const yt = items.filter(x => x.type === 'youtube');
  const sp = items.filter(x => x.type === 'shopee');
  const ytDone = yt.filter(x => dayLog[x.id]);
  const ytMiss = yt.filter(x => !dayLog[x.id]);
  const spDone = sp.filter(x => dayLog[x.id]);
  const spMiss = sp.filter(x => !dayLog[x.id]);

  const total = items.length;
  const done = ytDone.length + spDone.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const nowWIB = new Date().toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (type === 'morning') {
    let msg = `☀️ *PENGINGAT PAGI (Pukul ${nowWIB} WIB)*\n`;
    msg += `📅 Tanggal: ${dStr}\n\n`;
    msg += `Halo! Jangan lupa hari ini ada *${total} channel & toko* yang harus dicek & diedit:\n\n`;

    msg += `▶️ *YouTube (${yt.length} channel):*\n`;
    yt.forEach(x => { msg += `  • ${x.name}\n`; });

    msg += `\n🛍️ *Shopee (${sp.length} toko):*\n`;
    sp.forEach(x => { msg += `  • ${x.name}\n`; });

    msg += `\nSemangat untuk hari ini! 💪 Buka checklist di website untuk tandai selesai.`;
    return msg;
  }

  // Evening or manual summary
  let msg = `${type === 'evening' ? '🌙 *PENGINGAT MALAM*' : '📊 *STATUS CHECKLIST SAAT INI*'}\n`;
  msg += `📅 Tanggal: ${dStr} (${nowWIB} WIB)\n`;
  msg += `Progress: *${done} dari ${total} selesai (${pct}%)*\n\n`;

  if (ytDone.length) {
    msg += `▶️ *YouTube Selesai (${ytDone.length}/${yt.length}):*\n`;
    ytDone.forEach(x => { msg += `  ✅ ${x.name}\n`; });
  }
  if (ytMiss.length) {
    msg += `▶️ *YouTube Belum (${ytMiss.length}):*\n`;
    ytMiss.forEach(x => { msg += `  ⏳ ${x.name}\n`; });
  }

  if (spDone.length) {
    msg += `\n🛍️ *Shopee Selesai (${spDone.length}/${sp.length}):*\n`;
    spDone.forEach(x => { msg += `  ✅ ${x.name}\n`; });
  }
  if (spMiss.length) {
    msg += `🛍️ *Shopee Belum (${spMiss.length}):*\n`;
    spMiss.forEach(x => { msg += `  ⏳ ${x.name}\n`; });
  }

  if (done === total) {
    msg += `\n🎉 *Hebat! Semua channel & toko sudah tuntas diedit hari ini!*`;
  } else {
    msg += `\n⚠️ *Ada ${total - done} item yang belum selesai.* Jangan lupa dicek ya!`;
  }

  return msg;
}

// ═══════════════════════════════════════════
// 4. CRON SCHEDULER (24/7 CLOUD WORKER)
// ═══════════════════════════════════════════
let lastFiredMinute = '';

cron.schedule('* * * * *', async () => {
  try {
    const nowWIB = new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (nowWIB === lastFiredMinute) return;
    lastFiredMinute = nowWIB;

    const { targetPhone, morningTime, eveningTime, morningEnabled, eveningEnabled } = appData.settings;

    if (!targetPhone || botStatus !== 'connected') return;

    // Morning Trigger
    if (morningEnabled && nowWIB === (morningTime || '06:00')) {
      console.log(`⏰ Menjalankan pengingat pagi otomatis pada ${nowWIB} WIB ke ${targetPhone}`);
      const text = buildSummaryMessage('morning');
      await sendWhatsApp(targetPhone, text);
    }

    // Evening Trigger
    if (eveningEnabled && nowWIB === (eveningTime || '20:00')) {
      console.log(`⏰ Menjalankan pengingat malam otomatis pada ${nowWIB} WIB ke ${targetPhone}`);
      const text = buildSummaryMessage('evening');
      await sendWhatsApp(targetPhone, text);
    }
  } catch (err) {
    console.error('Error on cron schedule execution:', err);
  }
});

// ═══════════════════════════════════════════
// 5. REST APIS FOR FRONTEND
// ═══════════════════════════════════════════

// Status WhatsApp Bot
app.get('/api/status', (req, res) => {
  res.json({
    status: botStatus,
    qr: currentQR,
    connectedNumber,
    targetPhone: appData.settings.targetPhone,
    morningTime: appData.settings.morningTime,
    eveningTime: appData.settings.eveningTime
  });
});

// Get all checklist data & settings
app.get('/api/data', (req, res) => {
  res.json(appData);
});

// Save checklist data & settings
app.post('/api/data', (req, res) => {
  const { items, log, settings } = req.body;
  if (items) appData.items = items;
  if (log) appData.log = log;
  if (settings) appData.settings = { ...appData.settings, ...settings };
  saveData();
  res.json({ success: true, message: 'Data berhasil disimpan!' });
});

// Manual trigger send summary to WA
app.post('/api/send-now', async (req, res) => {
  try {
    const target = req.body.targetPhone || appData.settings.targetPhone;
    if (!target) {
      return res.status(400).json({ error: 'Nomor WhatsApp tujuan belum diisi!' });
    }
    const text = buildSummaryMessage('summary');
    await sendWhatsApp(target, text);
    res.json({ success: true, message: 'Pesan berhasil dikirim dari nomor kedua!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset session / Logout WhatsApp
app.post('/api/logout', async (req, res) => {
  try {
    if (sock) {
      await sock.logout();
    }
  } catch (e) {}
  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  } catch (e) {}
  botStatus = 'disconnected';
  connectedNumber = null;
  currentQR = null;
  setTimeout(connectToWhatsApp, 1500);
  res.json({ success: true, message: 'WhatsApp berhasil di-logout. Silakan scan ulang.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server Checklist & WhatsApp Bot berjalan di port ${PORT}`);
});
