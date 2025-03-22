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
 * Convert Unix line endings to DOS (CRLF) line endings
 * 
 * @param {string} text - Text with any line ending format
 * @returns {string} - Text with DOS (CRLF) line endings
 */
function toDOS(text) {
  if (!text) return "";
  
  // First normalize to Unix line endings in case there's a mix
  const unixText = text.replace(/\r\n|\r/g, '\n');
  
  // Then convert to DOS line endings
  return unixText.replace(/\n/g, '\r\n');
}

/**
 * Convert DOS line endings to Unix line endings and remove DOS-specific control characters
 * 
 * @param {string} text - Text with DOS line endings
 * @returns {string} - Clean text with Unix line endings
 */
function fromDOS(text) {
  if (!text) return "";
  
  // Remove DOS EOF character (SUB, Ctrl+Z, ASCII 26)
  text = text.replace(/\x1A/g, '');
  
  // Convert DOS (CRLF) to Unix (LF)
  return text.replace(/\r\n/g, '\n');
}

/**
 * Encode text for DOS with proper line endings
 * 
 * @param {string} text - Text to encode
 * @returns {Uint8Array} - Binary data with DOS line endings
 */
function encodeDOSText(text) {
  return new TextEncoder().encode(toDOS(text));
}

/**
 * Decode text from DOS with proper line endings
 * 
 * @param {Uint8Array} buffer - Binary data to decode
 * @returns {string} - Text with normalized line endings
 */
function decodeDOSText(buffer) {
  if (!buffer || buffer.length === 0) return "";
  return fromDOS(new TextDecoder().decode(buffer));
}

