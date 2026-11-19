# 📋 Daily Checklist & WhatsApp Bot Otomatis (Railway)

Website pengingat harian untuk mengecek **8 Channel YouTube** dan **4 Toko Shopee**, dilengkapi bot WhatsApp otomatis yang berjalan 24 jam nonstop di cloud **Railway** menggunakan **Nomor WhatsApp Keduamu Sendiri**.

---

## ✨ Fitur Utama
1. **Checklist Harian Cepat**: 1 klik untuk menandai channel/toko yang sudah diedit. Ada riwayat jam selesai.
2. **Pengingat Otomatis 24/7**:
   - ☀️ **Pukul 06:00 WIB**: Mengirim daftar channel & toko yang harus diedit hari ini.
   - 🌙 **Pukul 20:00 WIB**: Mengirim laporan mana yang sudah selesai dan mana yang masih belum.
   - **TETAP TERKIRIM walau laptop & HP mati total** karena server aktif terus di cloud Railway.
3. **Pengirim dari Nomor Keduamu Sendiri**: Tidak menggunakan pihak ketiga atau CallMeBot luar.
4. **Tombol "Kirim WA Sekarang"**: Klik di web kapan saja untuk cek progress langsung di chat WA.

---

## 🚀 Panduan Deploy ke Railway (Gratis & Mudah)

### Langkah 1: Upload ke GitHub
1. Buat repository baru di [GitHub](https://github.com/new), beri nama misalnya `niki-checklist`.
2. Buka terminal di folder ini (`c:\Niki Project\Niki Website`), lalu jalankan:
   ```bash
   git init
   git add .
   git commit -m "Initial commit Daily Checklist & WhatsApp Bot"
   git branch -M main
   git remote add origin https://github.com/USERNAME_KAMU/niki-checklist.git
   git push -u origin main
   ```

### Langkah 2: Deploy di Railway.app
1. Buka [Railway.app](https://railway.app/) dan login dengan akun GitHub kamu.
2. Klik **"New Project"** > **"Deploy from GitHub repo"**.
3. Pilih repository `niki-checklist`.
4. Railway akan otomatis mendeteksi Node.js dan langsung mem-build server.
5. Klik tab **Settings** pada project di Railway > bagian **Networking** > klik **"Generate Domain"** (kamu akan dapat link publik seperti `https://niki-checklist-production.up.railway.app`).

> [!TIP]
> **Agar nomor WA tidak perlu scan ulang setiap kali restart server di Railway:**
> Di dashboard Railway, klik service kamu > klik menu **"Volumes"** > **"Add Volume"** > beri Mount Path: `/app/auth_info`.

---

### Langkah 3: Scan QR Code Nomor Kedua
1. Buka link domain Railway kamu di browser (bisa dari laptop atau HP).
2. Masuk ke menu **⚙️ Pengaturan**.
3. Di bagian **"Bot WhatsApp Nomor Kedua"**, akan muncul **QR Code**.
4. Buka WhatsApp di **Nomor Kedua** > masuk ke **Perangkat Tertaut (Linked Devices)** > **Tautkan Perangkat** > arahkan kamera ke QR Code tersebut.
5. Setelah terhubung, status akan berubah jadi **🟢 Nomor Kedua Terhubung (+628...)**.

---

### Langkah 4: Masukkan Nomor Utama
1. Masukkan nomor WhatsApp utamamu di kolom **"Nomor WhatsApp Utama (Penerima)"**.
2. Klik **🚀 Kirim Tes**.
3. Cek WhatsApp utamamu — pesan dari nomor keduamu akan langsung masuk! 🎉
