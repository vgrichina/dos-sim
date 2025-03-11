/**
 * DOSSim - Utilities
 * 
 * This file contains utility functions for DOSSim.
 */

/**
 * Debounce function to limit how often a function can be called
 * 
 * @param {Function} func - The function to debounce
 * @param {number} wait - The time to wait in milliseconds
 * @returns {Function} - The debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format a string as DOS-style file listing
 * 
 * @param {string[]} files - Array of filenames
 * @returns {string} - Formatted directory listing
 */
function formatDirListing(files) {
  if (!files || files.length === 0) {
    return "No files found.";
  }
  
  // Calculate the current date in DOS format
  const now = new Date();
  const date = `${now.getMonth()+1}-${now.getDate()}-${now.getFullYear().toString().slice(2)}`;
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  let result = "Directory of C:\\\n\n";
  
  // Add each file with size and date
  for (const file of files) {
    // Mock file size between 100 and 10000 bytes
    const size = Math.floor(Math.random() * 9900) + 100;
    result += `${file.padEnd(12)} ${String(size).padStart(8)} ${date} ${time}\n`;
  }
  
  // Add summary
  const totalBytes = files.reduce((acc) => acc + Math.floor(Math.random() * 9900) + 100, 0);
  result += `\n${files.length} file(s) ${totalBytes} bytes\n`;
  result += `${Math.floor(1024 * 1024 * 10)} bytes free\n`;
  
  return result;
}

/**
 * Parse BASIC command parameters
 * 
 * @param {string} command - The command string
 * @returns {Object} - Object with parsed parameters
 */
function parseBasicCommand(command) {
  const parts = command.split(" ");
  const filename = parts[0];
  
  const options = [];
  const flags = {};
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    
    if (part.startsWith("/")) {
      const flag = part.substring(1);
      
      // Check if this is a flag with a value
      if (i + 1 < parts.length && !parts[i + 1].startsWith("/")) {
        flags[flag] = parts[i + 1];
        i++; // Skip the next part as it's the value
      } else {
        flags[flag] = true;
      }
      
      options.push(flag);
    }
  }
  
  return {
    filename,
    options,
    flags
  };
}