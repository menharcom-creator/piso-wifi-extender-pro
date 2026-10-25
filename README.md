# Piso WiFi Extender Pro
## Build unsigned IPA (GitHub)
1. Upload this whole folder to a GitHub repo (keep the `.github/workflows/` folder).
2. Actions tab -> "Build unsigned IPA" -> Run workflow (also runs on push to main).
3. Download artifact `PisoWiFiExtenderPro-unsigned-ipa`, unzip, sign on-device with ESign.
## Backend (admin login + recovery)
`npm run backend` (Node 18+). First login creates the admin. Forgot password: on the server run `npm run reset-token`, then use "Forgot Password" in the app. `DEV_MODE=1` allows localhost-only reset for private development; never enable in production. Security events: `database/security.log`.
In the app: Extender -> Backend URL = `http://<server-ip>:8787`.
## Works / needs hardware
Works: connectivity + ping, speed test, diagnostics, extender profiles + reachability, backup/restore, admin auth/recovery.
Not possible from a web/iOS app: reading SSID, scanning networks, joining Wi-Fi. Needs a router adapter (not included): device list/block, SSID/password change, restart.
