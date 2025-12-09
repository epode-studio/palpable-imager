# Palpable Imager

A dedicated desktop app for flashing Palpable OS to SD cards. Sign in with your Palpable account, name your device, select an SD card, and flash — all in one click.

![Palpable Imager](assets/screenshot.png)

## Features

- **One-Click Flashing** — No need to download images separately
- **Account Integration** — Devices are automatically linked to your account
- **Cached Downloads** — Palpable OS is cached locally for faster subsequent flashes
- **Cross-Platform** — Works on macOS, Windows, and Linux
- **Secure Auth** — OAuth via system browser (not embedded webview)

## Installation

### Download

Download the latest release for your platform:
- **macOS**: [Palpable Imager.dmg](https://github.com/paultnylund/palpable/releases)
- **Windows**: [Palpable Imager Setup.exe](https://github.com/paultnylund/palpable/releases)
- **Linux**: [Palpable Imager.AppImage](https://github.com/paultnylund/palpable/releases)

### macOS: "App is damaged" Error

macOS Gatekeeper blocks apps that aren't signed with an Apple Developer certificate. To fix this:

**Option 1: Right-click to open**
- Right-click (or Control-click) the app → Click "Open" → Click "Open" again in the dialog

**Option 2: Remove quarantine attribute**
```bash
xattr -cr "/Applications/Palpable Imager.app"
```

**Option 3: Allow in System Settings**
- System Settings → Privacy & Security → Scroll down to "Palpable Imager was blocked" → Click "Open Anyway"

### Build from Source

```bash
# Clone the repo
git clone https://github.com/paultnylund/palpable.git
cd palpable/palpable-imager

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for distribution
npm run build
```

## Usage

1. **Sign In** — Click "Sign in with Palpable" to authenticate via browser
2. **Name Device** — Give your device a recognizable name
3. **Select SD Card** — Insert an SD card and select it from the list
4. **Flash** — Click "Flash Palpable OS" and wait for completion
5. **Setup** — Insert the SD card in your Pi and follow on-screen instructions

## How It Works

1. Authenticates via OAuth using system browser for security
2. Downloads Palpable OS image (cached for 24 hours)
3. Registers a new device in your Palpable account
4. Decompresses and flashes the image using `dd` (with sudo prompt)
5. Shows pairing code for device setup

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with DevTools)
npm run dev

# Run production build
npm start
```

### Project Structure

```
palpable-imager/
├── src/
│   ├── main.js        # Electron main process
│   ├── preload.js     # Secure IPC bridge
│   ├── renderer.js    # UI logic
│   ├── index.html     # App HTML
│   └── styles.css     # App styles
├── assets/            # Icons and images
├── build/             # Build configuration
└── package.json       # Dependencies and scripts
```

### Building for Distribution

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:mac
npm run build:win
npm run build:linux

# Build for all platforms
npm run dist
```

## Security

- **OAuth via Browser** — Authentication happens in your default browser, not an embedded webview
- **PKCE Flow** — Uses Proof Key for Code Exchange for secure OAuth
- **Custom Protocol** — `palpable-imager://` protocol handles OAuth callbacks
- **Sudo Prompt** — Flashing requires explicit admin permission
- **No Credentials Stored** — Only OAuth tokens are stored locally

## Requirements

- **macOS**: 10.13+ (with `xz` for decompression)
- **Windows**: Windows 10+
- **Linux**: Ubuntu 18.04+ or equivalent

### Dependencies

The app requires these system tools:
- `xz` — For decompressing .img.xz files
- `dd` — For writing images to disk (requires sudo)

## License

MIT License — see [LICENSE](LICENSE) for details.

## Related

- [Palpable](https://palpable.technology) — The main Palpable platform
- [Palpable OS](https://github.com/paultnylund/palpable-os) — The OS that gets flashed

