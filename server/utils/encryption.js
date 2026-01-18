const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

/**
 * Get the encryption key as a 32-byte buffer
 * Handles both hex strings and raw keys
 */
const getEncryptionKeyBuffer = () => {
    if (!ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY environment variable is not set.');
    }
    
    // If it's a hex string (64 characters), convert from hex
    if (/^[a-f0-9]{64}$/i.test(ENCRYPTION_KEY)) {
        return Buffer.from(ENCRYPTION_KEY, 'hex');
    }
    
    // Otherwise treat as raw key and ensure it's 32 bytes
    const keyBuffer = Buffer.from(ENCRYPTION_KEY);
    if (keyBuffer.length < 32) {
        throw new Error('ENCRYPTION_KEY must be at least 32 bytes long for AES-256 encryption.');
    }
    
    return keyBuffer.slice(0, 32);
};

/**
 * Validate that encryption key is configured
 */
const validateEncryptionKey = () => {
    if (!ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY environment variable is not set. Please configure it for token encryption.');
    }
};

/**
 * Encrypt data using AES-256-GCM
 * @param {string} plaintext - Data to encrypt
 * @returns {string} Encrypted data in format: iv:encryptedData:authTag (all base64)
 */
const encrypt = (plaintext) => {
    if (!plaintext) return null;
    
    try {
        validateEncryptionKey();
        
        // Generate random 16-byte IV
        const iv = crypto.randomBytes(16);
        
        // Get the properly formatted encryption key
        const keyBuffer = getEncryptionKeyBuffer();
        
        // Create cipher using AES-256-GCM
        const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
        
        // Encrypt the plaintext
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Get authentication tag
        const authTag = cipher.getAuthTag();
        
        // Return IV:encryptedData:authTag (all base64 encoded)
        const result = [
            iv.toString('base64'),
            encrypted,
            authTag.toString('base64')
        ].join(':');
        
        return result;
    } catch (error) {
        console.error('Encryption error:', error.message);
        throw error;
    }
};

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encrypted - Encrypted data in format: iv:encryptedData:authTag
 * @returns {string} Decrypted plaintext
 */
const decrypt = (encrypted) => {
    if (!encrypted) return null;
    
    try {
        validateEncryptionKey();
        
        // Parse the encrypted string
        const parts = encrypted.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted token format');
        }
        
        const [ivBase64, encryptedHex, authTagBase64] = parts;
        
        // Decode components
        const iv = Buffer.from(ivBase64, 'base64');
        const authTag = Buffer.from(authTagBase64, 'base64');
        
        // Get the properly formatted encryption key
        const keyBuffer = getEncryptionKeyBuffer();
        
        // Create decipher
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
        
        // Set authentication tag
        decipher.setAuthTag(authTag);
        
        // Decrypt
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error.message);
        throw error;
    }
};

module.exports = {
    encrypt,
    decrypt,
    validateEncryptionKey
};
