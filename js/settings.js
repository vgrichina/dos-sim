/**
 * DOSSim - Settings Manager
 * 
 * This file handles the settings UI for DOSSim.
 */

// Initialize settings when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initSettingsPanel();
  loadSavedSettings();
});

// Initialize settings panel UI and event listeners
function initSettingsPanel() {
  // Toggle settings panel visibility
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsContent = document.getElementById('settings-content');
  const toggleIcon = document.getElementById('toggle-icon');
  
  settingsToggle.addEventListener('click', () => {
    const isVisible = settingsContent.style.display === 'block';
    settingsContent.style.display = isVisible ? 'none' : 'block';
    toggleIcon.textContent = isVisible ? '▼' : '▲';
  });
  
  // Enable AI toggle
  const enableAiCheckbox = document.getElementById('enable-ai');
  enableAiCheckbox.addEventListener('change', () => {
    updateStatusIndicator(enableAiCheckbox.checked);
  });
  
  // Debug mode toggle
  const debugModeCheckbox = document.getElementById('debug-mode');
  debugModeCheckbox.addEventListener('change', () => {
    if (debugModeCheckbox.checked) {
      window.setAIDebugEnabled(true);
    } else {
      window.setAIDebugEnabled(false);
    }
  });
  
  // Save settings button
  const saveButton = document.getElementById('save-settings');
  saveButton.addEventListener('click', saveSettings);
  
  // Test API connection button
  const testButton = document.getElementById('test-api');
  testButton.addEventListener('click', testApiConnection);
}

// Load settings from localStorage
function loadSavedSettings() {
  try {
    const savedSettings = localStorage.getItem('dossim-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      
      // Apply saved settings to form
      document.getElementById('enable-ai').checked = settings.useRealAi;
      document.getElementById('api-key').value = settings.apiKey || '';
      document.getElementById('debug-mode').checked = settings.debugMode || false;
      
      // Set the model dropdown
      const modelSelect = document.getElementById('api-model');
      if (settings.model) {
        for (let i = 0; i < modelSelect.options.length; i++) {
          if (modelSelect.options[i].value === settings.model) {
            modelSelect.selectedIndex = i;
            break;
          }
        }
      }
      
      // Update status indicator
      updateStatusIndicator(settings.useRealAi);
      
      // Apply settings to config
      applySettingsToConfig(settings);
    }
  } catch (error) {
    console.error('Error loading saved settings:', error);
  }
}

// Save settings to localStorage
function saveSettings() {
  try {
    const settings = {
      useRealAi: document.getElementById('enable-ai').checked,
      apiKey: document.getElementById('api-key').value.trim(),
      model: document.getElementById('api-model').value,
      debugMode: document.getElementById('debug-mode').checked
    };
    
    // Save to localStorage
    localStorage.setItem('dossim-settings', JSON.stringify(settings));
    
    // Apply settings to config
    applySettingsToConfig(settings);
    
    // Show success message
    alert('Settings saved successfully!');
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('Error saving settings: ' + error.message);
  }
}

// Apply settings to DOSSimConfig
function applySettingsToConfig(settings) {
  // Update configuration
  DOSSimConfig.ai.useRealAi = settings.useRealAi;
  DOSSimConfig.ai.apiKey = settings.apiKey;
  DOSSimConfig.ai.model = settings.model;
  
  // Set debug mode if applicable
  if (settings.debugMode && window.setAIDebugEnabled) {
    window.setAIDebugEnabled(true);
  }
  
  console.log('Applied settings to config:', {
    useRealAi: DOSSimConfig.ai.useRealAi,
    model: DOSSimConfig.ai.model,
    debugMode: settings.debugMode
  });
}

// Update UI status indicator
function updateStatusIndicator(isActive) {
  const statusIndicator = document.getElementById('ai-status');
  if (isActive) {
    statusIndicator.classList.add('active');
  } else {
    statusIndicator.classList.remove('active');
  }
}

// Test the API connection
async function testApiConnection() {
  const apiKey = document.getElementById('api-key').value.trim();
  const model = document.getElementById('api-model').value;
  
  if (!apiKey) {
    alert('Please enter an API key first');
    return;
  }
  
  // Show testing message
  const testButton = document.getElementById('test-api');
  const originalText = testButton.textContent;
  testButton.textContent = 'Testing...';
  testButton.disabled = true;
  
  try {
    // Create a temporary client for testing
    const testClient = new OpenRouterClient(apiKey, model);
    
    // Make a small request to verify connection
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://dossim.app',
        'X-Title': 'DOSSim BASIC Generator'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      alert(`Connection successful! 
Model: ${model}
Rate limit: ${data.rate_limit || 'N/A'} requests/min
Credits remaining: ${data.credits || 'N/A'}`);
    } else {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('API test failed:', error);
    alert('API connection test failed: ' + error.message);
  } finally {
    // Restore button state
    testButton.textContent = originalText;
    testButton.disabled = false;
  }
}

// Expose method for debugging in console
window.resetSettings = function() {
  localStorage.removeItem('dossim-settings');
  location.reload();
};