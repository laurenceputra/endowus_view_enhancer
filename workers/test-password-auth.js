/**
 * Test script for password-based login + JWT auth
 * 
 * Run with: node test-password-auth.js
 *
 * Requires Node.js 18+ (global fetch)
 * 
 * This tests the complete auth flow:
 * 1. Register a new user
 * 2. Login with credentials (issue tokens)
 * 3. Refresh tokens
 * 4. Upload encrypted data (access token)
 * 5. Download encrypted data (access token)
 * 6. Delete data (access token)
 */

import crypto from 'node:crypto';

if (typeof fetch !== 'function') {
    throw new Error('Global fetch is required. Use Node.js 18+ or provide a fetch polyfill.');
}

// Configuration
const BASE_URL = process.env.SYNC_SERVER_URL || 'http://localhost:8787';
const TEST_USER_ID = `test-user-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';

/**
 * Hash password for authentication (matches frontend implementation)
 */
function hashPasswordForAuth(password, userId) {
    const data = password + '|' + userId;
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Test registration endpoint
 */
async function testRegister() {
    console.log('\n=== Testing Registration ===');
    console.log(`User ID: ${TEST_USER_ID}`);
    console.log(`Password: ${TEST_PASSWORD}`);
    
    const passwordHash = hashPasswordForAuth(TEST_PASSWORD, TEST_USER_ID);
    console.log(`Password Hash: ${passwordHash.substring(0, 20)}...`);
    
    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: TEST_USER_ID,
            passwordHash
        })
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, result);
    
    if (!result.success) {
        throw new Error(`Registration failed: ${result.message}`);
    }
    
    console.log('✅ Registration successful!');
    return passwordHash;
}

/**
 * Test login endpoint
 */
async function testLogin(passwordHash) {
    console.log('\n=== Testing Login ===');
    
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: TEST_USER_ID,
            passwordHash
        })
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, result);
    
    if (!result.success) {
        throw new Error(`Login failed: ${result.message}`);
    }
    
    console.log('✅ Login successful!');
    if (!result.tokens || !result.tokens.accessToken || !result.tokens.refreshToken) {
        throw new Error('Login did not return tokens');
    }
    return result.tokens;
}

/**
 * Test token refresh endpoint
 */
async function testRefresh(refreshToken) {
    console.log('\n=== Testing Token Refresh ===');

    const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${refreshToken}`
        }
    });

    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, result);

    if (!result.success) {
        throw new Error(`Refresh failed: ${result.error || 'Unknown error'}`);
    }

    console.log('✅ Refresh successful!');
    return result.tokens;
}

/**
 * Test upload with access token
 */
async function testUpload(accessToken) {
    console.log('\n=== Testing Upload ===');
    
    const testData = {
        userId: TEST_USER_ID,
        deviceId: 'test-device-123',
        encryptedData: Buffer.from('encrypted_test_data').toString('base64'),
        timestamp: Date.now(),
        version: 1
    };
    
    const response = await fetch(`${BASE_URL}/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-User-Id': TEST_USER_ID
        },
        body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, result);
    
    if (!result.success) {
        throw new Error(`Upload failed: ${result.error || 'Unknown error'}`);
    }
    
    console.log('✅ Upload successful!');
}

/**
 * Test download with access token
 */
async function testDownload(accessToken) {
    console.log('\n=== Testing Download ===');
    
    const response = await fetch(`${BASE_URL}/sync/${TEST_USER_ID}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-User-Id': TEST_USER_ID
        }
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
    
    if (!result.success) {
        throw new Error(`Download failed: ${result.error || 'Unknown error'}`);
    }
    
    console.log('✅ Download successful!');
}

/**
 * Test delete with access token
 */
async function testDelete(accessToken) {
    console.log('\n=== Testing Delete ===');
    
    const response = await fetch(`${BASE_URL}/sync/${TEST_USER_ID}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-User-Id': TEST_USER_ID
        }
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, result);
    
    if (!result.success) {
        throw new Error(`Delete failed: ${result.error || 'Unknown error'}`);
    }
    
    console.log('✅ Delete successful!');
}

/**
 * Test invalid credentials
 */
async function testInvalidCredentials() {
    console.log('\n=== Testing Invalid Credentials ===');
    
    const wrongPasswordHash = hashPasswordForAuth('WrongPassword', TEST_USER_ID);
    
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: TEST_USER_ID,
            passwordHash: wrongPasswordHash
        })
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, result);
    
    if (result.success) {
        throw new Error('Expected login to fail with wrong password!');
    }
    
    console.log('✅ Invalid credentials correctly rejected!');
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('==========================================');
    console.log('Token Authentication Test Suite');
    console.log('==========================================');
    console.log(`Server: ${BASE_URL}`);
    console.log(`Test User: ${TEST_USER_ID}`);
    
    try {
        // Test registration
        const passwordHash = await testRegister();
        
        // Test login
        const tokens = await testLogin(passwordHash);

        // Test refresh
        const refreshedTokens = await testRefresh(tokens.refreshToken);
        const accessToken = refreshedTokens.accessToken || tokens.accessToken;
        
        // Test upload with access token
        await testUpload(accessToken);
        
        // Test download with access token
        await testDownload(accessToken);
        
        // Test delete with access token
        await testDelete(accessToken);
        
        // Test invalid credentials
        await testInvalidCredentials();
        
        console.log('\n==========================================');
        console.log('✅ ALL TESTS PASSED!');
        console.log('==========================================');
        
    } catch (error) {
        console.error('\n==========================================');
        console.error('❌ TEST FAILED!');
        console.error('==========================================');
        console.error(error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run tests
runTests();
