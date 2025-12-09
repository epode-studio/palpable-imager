// Palpable Imager - Renderer Process

// State
let selectedDrive = null
let downloadedImagePath = null
let deviceId = null
let pairingCode = null
let isPairingCodeAuth = false
let existingDevices = []
let deviceMode = 'new' // 'new' or 'existing'

// DOM Elements
const authScreen = document.getElementById('auth-screen')
const mainScreen = document.getElementById('main-screen')
const successScreen = document.getElementById('success-screen')
const authBtn = document.getElementById('auth-btn')
const logoutBtn = document.getElementById('logout-btn')
const deviceNameInput = document.getElementById('device-name')
const drivesList = document.getElementById('drives-list')
const refreshDrivesBtn = document.getElementById('refresh-drives')
const flashBtn = document.getElementById('flash-btn')
const progressContainer = document.getElementById('progress-container')
const progressFill = document.getElementById('progress-fill')
const progressStatus = document.getElementById('progress-status')
const pairingCodeEl = document.getElementById('pairing-code')
const flashAnotherBtn = document.getElementById('flash-another')

// Pairing code auth elements
const pairingCodeInput = document.getElementById('pairing-code-input')
const pairingAuthBtn = document.getElementById('pairing-auth-btn')
const pairingError = document.getElementById('pairing-error')

// Device management elements
const existingDeviceContainer = document.getElementById('existing-device-container')
const deviceActions = document.getElementById('device-actions')
const editDeviceBtn = document.getElementById('edit-device-btn')
const deleteDeviceBtn = document.getElementById('delete-device-btn')
const editDeviceModal = document.getElementById('edit-device-modal')
const editDeviceNameInput = document.getElementById('edit-device-name')
const cancelEditBtn = document.getElementById('cancel-edit-btn')
const saveEditBtn = document.getElementById('save-edit-btn')
const checkUpdatesBtn = document.getElementById('check-updates-btn')
const appVersionEl = document.getElementById('app-version')

// Initialize
async function init() {
  // Add platform class for OS-specific styling (e.g., macOS traffic lights)
  const platform = await window.palpable.getPlatform()
  document.body.classList.add(`platform-${platform}`)

  // Check authentication state (browser OAuth)
  const authState = await window.palpable.getAuthState()
  
  // Also check for pairing code auth
  const pairingState = await window.palpable.getPairingState()
  
  if (authState.isAuthenticated) {
    isPairingCodeAuth = false
    showMainScreen()
  } else if (pairingState.isPaired) {
    // User authenticated via pairing code
    isPairingCodeAuth = true
    deviceId = pairingState.deviceId
    showMainScreen()
  } else {
    showAuthScreen()
  }
  
  // Set up event listeners
  setupEventListeners()
}

// Wizard state
let currentStep = 1

function setupEventListeners() {
  // Browser OAuth Auth
  authBtn.addEventListener('click', handleAuth)

  // Listen for auth success from main process
  window.palpable.onAuthSuccess((data) => {
    isPairingCodeAuth = false
    showMainScreen()
  })

  // Pairing Code Auth (Alternative)
  pairingCodeInput.addEventListener('input', handlePairingCodeInput)
  pairingAuthBtn.addEventListener('click', handlePairingCodeAuth)

  // Listen for pairing success
  window.palpable.onPairingSuccess((data) => {
    isPairingCodeAuth = true
    deviceId = data.deviceId
    showMainScreen()
  })

  // Wizard navigation
  document.getElementById('step1-next').addEventListener('click', () => goToStep(2))
  document.getElementById('step2-back').addEventListener('click', () => goToStep(1))
  document.getElementById('step2-next').addEventListener('click', () => goToStep(3))
  document.getElementById('step3-back').addEventListener('click', () => goToStep(2))

  // Device selection
  document.getElementById('device-mode-existing').addEventListener('change', handleDeviceModeChange)
  document.getElementById('device-mode-new').addEventListener('change', handleDeviceModeChange)
  document.getElementById('existing-device-select').addEventListener('change', handleExistingDeviceSelect)

  // Device management
  editDeviceBtn.addEventListener('click', handleEditDevice)
  deleteDeviceBtn.addEventListener('click', handleDeleteDevice)
  cancelEditBtn.addEventListener('click', closeEditModal)
  saveEditBtn.addEventListener('click', handleSaveEdit)

  // Device name
  deviceNameInput.addEventListener('input', updateNextButtonState)

  // Drives
  refreshDrivesBtn.addEventListener('click', loadDrives)

  // Flash
  flashBtn.addEventListener('click', handleFlash)

  // Success screen
  flashAnotherBtn.addEventListener('click', resetToMain)

  // Progress listeners
  window.palpable.onDownloadProgress(updateDownloadProgress)
  window.palpable.onFlashProgress(updateFlashProgress)

  // Update listeners (from menu)
  window.palpable.onUpdateAvailable((data) => {
    console.log('Update available:', data.version)
    showUpdateDownloadModal()
  })

  window.palpable.onUpdateDownloadProgress((data) => {
    // Show modal if it's not already shown (in case progress comes before available event)
    const updateModal = document.getElementById('update-modal')
    if (updateModal && updateModal.style.display === 'none') {
      showUpdateDownloadModal()
    }
    updateUpdateDownloadProgress(data.percent)
  })

  window.palpable.onUpdateDownloaded((data) => {
    hideUpdateDownloadModal()
    showUpdateReadyModal(data.version)
  })

  window.palpable.onUpdateError((data) => {
    hideUpdateDownloadModal()
    alert(`Update error: ${data.message}`)
  })

  // Update modal buttons
  const updateRestartNowBtn = document.getElementById('update-restart-now')
  const updateRestartLaterBtn = document.getElementById('update-restart-later')
  
  if (updateRestartNowBtn) {
    updateRestartNowBtn.addEventListener('click', handleUpdateRestart)
  }
  
  if (updateRestartLaterBtn) {
    updateRestartLaterBtn.addEventListener('click', hideUpdateReadyModal)
  }
}

// Screen Management
function showScreen(screen) {
  authScreen.classList.remove('active')
  mainScreen.classList.remove('active')
  successScreen.classList.remove('active')
  screen.classList.add('active')
}

function showAuthScreen() {
  showScreen(authScreen)
}

async function showMainScreen() {
  showScreen(mainScreen)
  await loadDevices()
  loadDrives()
  goToStep(1) // Start at step 1
}

// Wizard Navigation
function goToStep(step) {
  if (step < 1 || step > 3) return

  // Validate before moving forward
  if (step > currentStep) {
    if (currentStep === 1 && !canProceedFromStep1()) {
      return
    }
    if (currentStep === 2 && !canProceedFromStep2()) {
      return
    }
  }

  // Update current step
  currentStep = step

  // Update step visibility
  document.querySelectorAll('.wizard-step').forEach(el => {
    el.classList.remove('active')
  })
  document.querySelector(`.wizard-step[data-step="${step}"]`).classList.add('active')

  // Update progress indicator
  document.querySelectorAll('.progress-step').forEach(el => {
    const stepNum = parseInt(el.dataset.step)
    el.classList.remove('active', 'completed')

    if (stepNum === step) {
      el.classList.add('active')
    } else if (stepNum < step) {
      el.classList.add('completed')
    }
  })

  // Update summary on step 3
  if (step === 3) {
    updateSummary()
  }

    // Update button states per step
    if (step === 1) {
      updateNextButtonState()
    }
    if (step === 2) {
      const next = document.getElementById('step2-next')
      if (next) {
        next.disabled = !selectedDrive
      }
    }

  // Update flash button state on step 3
  if (step === 3) {
    updateFlashButtonState()
  }
}

function canProceedFromStep1() {
  if (deviceMode === 'existing') {
    const select = document.getElementById('existing-device-select')
    return select.value !== '' && !select.disabled
  } else {
    return deviceNameInput.value.trim().length > 0
  }
}

function canProceedFromStep2() {
  return selectedDrive !== null
}

function updateNextButtonState() {
  const nextBtn = document.getElementById('step1-next')
  nextBtn.disabled = !canProceedFromStep1()
}

function updateSummary() {
  // Update device name
  const deviceName = deviceMode === 'existing'
    ? existingDevices.find(d => d.id === deviceId)?.name || 'Unknown'
    : deviceNameInput.value.trim()
  document.getElementById('summary-device').textContent = deviceName

  // Update drive name
  const drives = document.querySelectorAll('.drive-option')
  let driveName = '-'
  drives.forEach(option => {
    if (option.dataset.device === selectedDrive) {
      const nameEl = option.querySelector('.drive-name')
      const sizeEl = option.querySelector('.drive-size')
      if (nameEl && sizeEl) {
        driveName = `${nameEl.textContent} (${sizeEl.textContent})`
      }
    }
  })
  document.getElementById('summary-drive').textContent = driveName
}

function showSuccessScreen() {
  showScreen(successScreen)
  
  if (isPairingCodeAuth) {
    // User already authenticated with pairing code - device is already linked
    pairingCodeEl.textContent = '✓ Linked'
    pairingCodeEl.style.color = '#22c55e'
    document.querySelector('.pairing-hint').textContent = 'Your device is already linked to your account'
  } else if (pairingCode) {
    pairingCodeEl.textContent = pairingCode
    pairingCodeEl.style.color = ''
    document.querySelector('.pairing-hint').textContent = 'Save this code to connect this device to your account'
  } else {
    pairingCodeEl.textContent = '------'
    pairingCodeEl.style.color = ''
  }
}

// Authentication (Browser OAuth)
async function handleAuth() {
  authBtn.disabled = true
  authBtn.textContent = 'Opening browser...'
  
  await window.palpable.startAuth()
  
  // Reset button after a delay
  setTimeout(() => {
    authBtn.disabled = false
    authBtn.textContent = 'Sign in with Palpable'
  }, 3000)
}

async function handleLogout() {
  await window.palpable.logout()
  await window.palpable.clearPairing()
  isPairingCodeAuth = false
  deviceId = null
  showAuthScreen()
}

// Pairing Code Authentication (Alternative)
function handlePairingCodeInput() {
  const code = pairingCodeInput.value.trim().toUpperCase()
  pairingAuthBtn.disabled = code.length !== 6
  pairingError.classList.add('hidden')
}

async function handlePairingCodeAuth() {
  const code = pairingCodeInput.value.trim().toUpperCase()
  
  if (code.length !== 6) return
  
  pairingAuthBtn.disabled = true
  pairingAuthBtn.textContent = 'Connecting...'
  pairingError.classList.add('hidden')
  
  try {
    // First validate the code
    const validation = await window.palpable.validatePairingCode(code)
    
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid pairing code')
    }
    
    if (validation.expired) {
      throw new Error('This pairing code has expired')
    }
    
    // Now authenticate with the code
    const result = await window.palpable.authWithPairingCode(code)
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to connect')
    }
    
    // Success - the onPairingSuccess listener will handle the screen transition
    
  } catch (err) {
    pairingError.textContent = err.message
    pairingError.classList.remove('hidden')
    
    pairingAuthBtn.disabled = false
    pairingAuthBtn.textContent = 'Connect'
  }
}

// Drive Management
async function loadDrives() {
  drivesList.innerHTML = '<div class="loading">Scanning for drives...</div>'
  selectedDrive = null
  updateFlashButtonState()
  
  const drives = await window.palpable.listDrives()
  
  if (drives.length === 0) {
    drivesList.innerHTML = `
      <div class="no-drives">
        <p>No SD cards detected</p>
        <p style="font-size: 12px; margin-top: 8px;">Insert an SD card and click Refresh</p>
      </div>
    `
    return
  }
  
  drivesList.innerHTML = drives.map(drive => `
    <label class="drive-option" data-device="${drive.device}">
      <input type="radio" name="drive" value="${drive.device}">
      <div class="drive-icon">${drive.isCard ? '💾' : '💽'}</div>
      <div class="drive-info">
        <div class="drive-name">${drive.displayName || drive.description || drive.device}</div>
        <div class="drive-size">${formatBytes(drive.size)} • ${drive.device}</div>
      </div>
    </label>
  `).join('')
  
  // Add click handlers
  drivesList.querySelectorAll('.drive-option').forEach(option => {
    option.addEventListener('click', () => selectDrive(option))
  })
}

function selectDrive(option) {
  // Deselect all
  drivesList.querySelectorAll('.drive-option').forEach(el => el.classList.remove('selected'))

  // Select this one
  option.classList.add('selected')
  option.querySelector('input').checked = true
  selectedDrive = option.dataset.device

  // Enable next button on step 2
  document.getElementById('step2-next').disabled = false
}

// Device Management
async function loadDevices() {
  if (isPairingCodeAuth) {
    // Can't load devices if authenticated via pairing code
    return
  }
  
  try {
    const result = await window.palpable.getDevices()
    if (result.success) {
      existingDevices = result.devices || []
      updateDeviceSelector()
    }
  } catch (err) {
    console.error('Failed to load devices:', err)
  }
}

function updateDeviceSelector() {
  const select = document.getElementById('existing-device-select')
  select.innerHTML = '<option value="">Select a device...</option>'
  
  if (existingDevices.length === 0) {
    select.innerHTML = '<option value="">No existing devices</option>'
    select.disabled = true
    // Auto-select "new device" mode if no existing devices
    document.getElementById('device-mode-new').checked = true
    handleDeviceModeChange()
    return
  }
  
  select.disabled = false
  existingDevices.forEach(device => {
    const option = document.createElement('option')
    option.value = device.id
    option.textContent = `${device.name} (${device.status || 'unknown'})`
    select.appendChild(option)
  })
}

function handleDeviceModeChange() {
  const existingMode = document.getElementById('device-mode-existing').checked
  const newMode = document.getElementById('device-mode-new').checked
  const existingSelect = document.getElementById('existing-device-select')
  const nameInput = document.getElementById('device-name')

  deviceMode = existingMode ? 'existing' : 'new'

  if (existingMode) {
    existingDeviceContainer.style.display = 'block'
    nameInput.style.display = 'none'
    nameInput.value = ''
    updateDeviceActionsVisibility()
  } else {
    existingDeviceContainer.style.display = 'none'
    nameInput.style.display = 'block'
    existingSelect.value = ''
    deviceId = null
    deviceActions.style.display = 'none'
  }

  updateNextButtonState()
}

function handleExistingDeviceSelect() {
  const select = document.getElementById('existing-device-select')
  const selectedDeviceId = select.value

  if (selectedDeviceId) {
    const device = existingDevices.find(d => d.id === selectedDeviceId)
    if (device) {
      deviceId = device.id
      // Update name input for display (but it's hidden)
      deviceNameInput.value = device.name
    }
  } else {
    deviceId = null
  }

  updateDeviceActionsVisibility()
  updateNextButtonState()
}

function updateDeviceActionsVisibility() {
  const select = document.getElementById('existing-device-select')
  if (select.value && deviceMode === 'existing') {
    deviceActions.style.display = 'flex'
  } else {
    deviceActions.style.display = 'none'
  }
}

async function handleEditDevice() {
  const select = document.getElementById('existing-device-select')
  const selectedDeviceId = select.value
  
  if (!selectedDeviceId) return
  
  const device = existingDevices.find(d => d.id === selectedDeviceId)
  if (!device) return
  
  editDeviceNameInput.value = device.name
  editDeviceModal.style.display = 'block'
}

function closeEditModal() {
  editDeviceModal.style.display = 'none'
  editDeviceNameInput.value = ''
}

async function handleSaveEdit() {
  const select = document.getElementById('existing-device-select')
  const selectedDeviceId = select.value
  const newName = editDeviceNameInput.value.trim()
  
  if (!selectedDeviceId || !newName) {
    alert('Please enter a device name')
    return
  }
  
  saveEditBtn.disabled = true
  saveEditBtn.textContent = 'Saving...'
  
  try {
    const result = await window.palpable.updateDevice({
      deviceId: selectedDeviceId,
      name: newName
    })
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update device')
    }
    
    // Refresh device list from server
    await loadDevices()
    
    // Re-select the updated device
    select.value = selectedDeviceId
    deviceNameInput.value = newName
    updateDeviceActionsVisibility()
    
    closeEditModal()
  } catch (err) {
    alert(`Failed to update device: ${err.message}`)
  } finally {
    saveEditBtn.disabled = false
    saveEditBtn.textContent = 'Save'
  }
}

async function handleDeleteDevice() {
  const select = document.getElementById('existing-device-select')
  const selectedDeviceId = select.value
  
  if (!selectedDeviceId) return
  
  const device = existingDevices.find(d => d.id === selectedDeviceId)
  if (!device) return
  
  if (!confirm(`Are you sure you want to delete "${device.name}"? This action cannot be undone.`)) {
    return
  }
  
  deleteDeviceBtn.disabled = true
  deleteDeviceBtn.textContent = 'Deleting...'
  
  try {
    const result = await window.palpable.deleteDevice({
      deviceId: selectedDeviceId
    })
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete device')
    }
    
    // Refresh device list from server
    await loadDevices()
    
    // Clear selection
    select.value = ''
    deviceId = null
    deviceNameInput.value = ''
    updateDeviceActionsVisibility()
    updateFlashButtonState()
    
    // If no devices left, switch to "new device" mode
    if (existingDevices.length === 0) {
      document.getElementById('device-mode-new').checked = true
      handleDeviceModeChange()
    }
  } catch (err) {
    alert(`Failed to delete device: ${err.message}`)
  } finally {
    deleteDeviceBtn.disabled = false
    deleteDeviceBtn.textContent = 'Delete'
  }
}

function updateFlashButtonState() {
  let hasName = false
  
  if (deviceMode === 'existing') {
    const select = document.getElementById('existing-device-select')
    hasName = select.value !== '' && !select.disabled
  } else {
    hasName = deviceNameInput.value.trim().length > 0
  }
  
  const hasDrive = selectedDrive !== null
  flashBtn.disabled = !(hasName && hasDrive)
}

// Flashing
async function handleFlash() {
  if (!selectedDrive || !deviceNameInput.value.trim()) return
  
  flashBtn.disabled = true
  progressContainer.classList.remove('hidden')
  
  try {
    // Step 1: Register device (skip if already authenticated via pairing code)
    if (!isPairingCodeAuth) {
      progressStatus.textContent = deviceMode === 'existing' ? 'Updating device...' : 'Registering device...'
      progressFill.style.width = '5%'
      
      const deviceName = deviceMode === 'existing' 
        ? existingDevices.find(d => d.id === deviceId)?.name || 'Device'
        : deviceNameInput.value.trim()
      
      const regResult = await window.palpable.registerDevice({
        deviceName,
        deviceId: deviceMode === 'existing' ? deviceId : undefined
      })
      
      if (!regResult.success) {
        throw new Error(regResult.error || 'Failed to register device')
      }
      
      deviceId = regResult.deviceId
      pairingCode = regResult.pairingCode
    } else {
      // Device already registered via pairing code
      progressStatus.textContent = 'Device already registered...'
      progressFill.style.width = '5%'
      pairingCode = null // Pairing code was already used
    }
    
    // Step 2: Download image (if not cached)
    progressStatus.textContent = 'Downloading Palpable OS...'
    progressFill.style.width = '10%'
    
    const downloadResult = await window.palpable.downloadImage()
    
    if (!downloadResult.success) {
      throw new Error(downloadResult.error || 'Failed to download image')
    }
    
    downloadedImagePath = downloadResult.path
    
    // Step 3: Flash to drive
    progressStatus.textContent = 'Flashing to SD card...'
    
    const flashResult = await window.palpable.flashImage({
      imagePath: downloadedImagePath,
      targetDevice: selectedDrive
    })
    
    if (!flashResult.success) {
      if (flashResult.cancelled) {
        progressContainer.classList.add('hidden')
        flashBtn.disabled = false
        return
      }
      throw new Error(flashResult.error || 'Failed to flash image')
    }
    
    // Success!
    showSuccessScreen()
    
  } catch (err) {
    console.error('Flash error:', err)
    progressStatus.textContent = `Error: ${err.message}`
    progressFill.style.width = '0%'
    progressFill.style.background = '#ef4444'
    alert(`Flash failed: ${err.message}`)
    
    setTimeout(() => {
      progressContainer.classList.add('hidden')
      progressFill.style.background = ''
      flashBtn.disabled = false
    }, 3000)
  }
}

function updateDownloadProgress({ percent, status }) {
  progressFill.style.width = `${10 + percent * 0.3}%` // 10-40% for download
  
  if (status === 'checking') {
    progressStatus.textContent = 'Checking for latest Palpable OS release...'
  } else if (status === 'downloading') {
    progressStatus.textContent = `Downloading Palpable OS... ${percent}%`
  } else if (status === 'cached') {
    progressStatus.textContent = 'Using cached Palpable OS image...'
  } else if (status === 'complete') {
    progressStatus.textContent = 'Download complete'
  }
}

function updateFlashProgress({ percent, status }) {
  progressFill.style.width = `${40 + percent * 0.6}%` // 40-100% for flash
  
  if (status === 'preparing') {
    progressStatus.textContent = 'Preparing...'
  } else if (status === 'decompressing') {
    progressStatus.textContent = `Decompressing... ${percent}%`
  } else if (status === 'flashing') {
    progressStatus.textContent = `Flashing to SD card... ${Math.round((percent - 30) / 0.7)}%`
  } else if (status === 'complete') {
    progressStatus.textContent = 'Flash complete!'
    progressFill.style.width = '100%'
  }
}

async function resetToMain() {
  selectedDrive = null
  downloadedImagePath = null
  deviceId = null
  pairingCode = null
  deviceNameInput.value = ''
  progressContainer.classList.add('hidden')
  progressFill.style.width = '0%'
  
  // If authenticated via pairing code, clear it to allow flashing new device
  if (isPairingCodeAuth) {
    await window.palpable.clearPairing()
    isPairingCodeAuth = false
  }
  
  showMainScreen()
}

// Update Management
async function loadAppVersion() {
  try {
    // Get version from electron app
    if (window.palpable.getAppVersion) {
      const version = await window.palpable.getAppVersion()
      if (appVersionEl) {
        appVersionEl.textContent = `v${version}`
      }
    } else if (appVersionEl) {
      appVersionEl.textContent = 'v1.0.0'
    }
  } catch (err) {
    console.error('Failed to load app version:', err)
    if (appVersionEl) {
      appVersionEl.textContent = 'v1.0.0'
    }
  }
}

async function handleCheckForUpdates() {
  if (!checkUpdatesBtn) return
  checkUpdatesBtn.disabled = true
  checkUpdatesBtn.textContent = 'Checking...'
  
  try {
    const result = await window.palpable.checkForUpdates()
    
    if (result.success) {
      if (result.updateAvailable) {
        // Update available - the main process will show a dialog
        checkUpdatesBtn.textContent = `Update Available: v${result.version}`
        checkUpdatesBtn.classList.add('update-available')
      } else {
        // No update available
        checkUpdatesBtn.textContent = 'Up to Date'
        checkUpdatesBtn.classList.add('up-to-date')
        setTimeout(() => {
          checkUpdatesBtn.textContent = 'Check for Updates'
          checkUpdatesBtn.classList.remove('up-to-date')
        }, 2000)
      }
    } else {
      throw new Error(result.error || 'Failed to check for updates')
    }
  } catch (err) {
    console.error('Update check failed:', err)
    checkUpdatesBtn.textContent = 'Check Failed'
    setTimeout(() => {
      checkUpdatesBtn.textContent = 'Check for Updates'
    }, 2000)
  } finally {
    checkUpdatesBtn.disabled = false
  }
}

// Utilities
function formatBytes(bytes) {
  if (!bytes) return 'Unknown size'
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(0)} MB`
}

// Update Modal Functions
function showUpdateDownloadModal() {
  const modal = document.getElementById('update-modal')
  if (modal) {
    modal.style.display = 'flex'
    const progressFill = document.getElementById('update-progress-fill')
    const progressStatus = document.getElementById('update-progress-status')
    if (progressFill) progressFill.style.width = '0%'
    if (progressStatus) progressStatus.textContent = '0%'
  }
}

function hideUpdateDownloadModal() {
  const modal = document.getElementById('update-modal')
  if (modal) {
    modal.style.display = 'none'
  }
}

function updateUpdateDownloadProgress(percent) {
  const progressFill = document.getElementById('update-progress-fill')
  const progressStatus = document.getElementById('update-progress-status')
  if (progressFill) {
    progressFill.style.width = `${percent}%`
  }
  if (progressStatus) {
    progressStatus.textContent = `${percent}%`
  }
}

function showUpdateReadyModal(version) {
  const modal = document.getElementById('update-ready-modal')
  const versionEl = document.getElementById('update-ready-version')
  if (modal) {
    modal.style.display = 'flex'
  }
  if (versionEl && version) {
    versionEl.textContent = version
  }
}

function hideUpdateReadyModal() {
  const modal = document.getElementById('update-ready-modal')
  if (modal) {
    modal.style.display = 'none'
  }
}

async function handleUpdateRestart() {
  const btn = document.getElementById('update-restart-now')
  if (btn) {
    btn.disabled = true
    btn.textContent = 'Restarting...'
  }
  
  // Call IPC to restart and install
  if (window.palpable.restartAndInstall) {
    await window.palpable.restartAndInstall()
  } else {
    // Fallback: just hide modal if IPC not available
    hideUpdateReadyModal()
  }
}

// Start
init()

