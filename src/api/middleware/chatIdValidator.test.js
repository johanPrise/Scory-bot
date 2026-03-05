/**
 * Manual test file for chatIdValidator middleware
 * Run with: node src/api/middleware/chatIdValidator.test.js
 * 
 * This file provides basic verification that the middleware functions correctly.
 * For comprehensive testing, integrate with a proper testing framework.
 */

import { requireChatId, validateChatAccess } from './chatIdValidator.js';

// Mock request and response objects
const createMockReq = (overrides = {}) => ({
  query: {},
  body: {},
  params: {},
  user: null,
  path: '/test',
  method: 'GET',
  ...overrides
});

const createMockRes = () => {
  const res = {
    statusCode: null,
    jsonData: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
};

const createMockNext = () => {
  let called = false;
  return () => { called = true; return called; };
};

// Test 1: requireChatId - should reject request without chatId
console.log('Test 1: requireChatId rejects request without chatId');
const req1 = createMockReq();
const res1 = createMockRes();
const next1 = createMockNext();

requireChatId(req1, res1, next1);

if (res1.statusCode === 400 && res1.jsonData.error === 'chatId is required') {
  console.log('✅ PASS: Request without chatId rejected with 400');
} else {
  console.log('❌ FAIL: Expected 400 status with error message');
  console.log('Got:', res1.statusCode, res1.jsonData);
}

// Test 2: requireChatId - should accept request with chatId in query
console.log('\nTest 2: requireChatId accepts request with chatId in query');
const req2 = createMockReq({ query: { chatId: '123456' } });
const res2 = createMockRes();
const next2 = createMockNext();

requireChatId(req2, res2, next2);

if (req2.chatId === '123456' && !res2.statusCode) {
  console.log('✅ PASS: Request with chatId in query accepted');
} else {
  console.log('❌ FAIL: Expected chatId to be set and no error response');
  console.log('Got chatId:', req2.chatId, 'status:', res2.statusCode);
}

// Test 3: requireChatId - should accept request with chatId in body
console.log('\nTest 3: requireChatId accepts request with chatId in body');
const req3 = createMockReq({ body: { chatId: '789012' } });
const res3 = createMockRes();
const next3 = createMockNext();

requireChatId(req3, res3, next3);

if (req3.chatId === '789012' && !res3.statusCode) {
  console.log('✅ PASS: Request with chatId in body accepted');
} else {
  console.log('❌ FAIL: Expected chatId to be set and no error response');
  console.log('Got chatId:', req3.chatId, 'status:', res3.statusCode);
}

// Test 4: requireChatId - should accept request with chatId in body.metadata
console.log('\nTest 4: requireChatId accepts request with chatId in body.metadata');
const req4 = createMockReq({ body: { metadata: { chatId: '345678' } } });
const res4 = createMockRes();
const next4 = createMockNext();

requireChatId(req4, res4, next4);

if (req4.chatId === '345678' && !res4.statusCode) {
  console.log('✅ PASS: Request with chatId in body.metadata accepted');
} else {
  console.log('❌ FAIL: Expected chatId to be set and no error response');
  console.log('Got chatId:', req4.chatId, 'status:', res4.statusCode);
}

// Test 5: requireChatId - should accept request with chatId in params
console.log('\nTest 5: requireChatId accepts request with chatId in params');
const req5 = createMockReq({ params: { chatId: '901234' } });
const res5 = createMockRes();
const next5 = createMockNext();

requireChatId(req5, res5, next5);

if (req5.chatId === '901234' && !res5.statusCode) {
  console.log('✅ PASS: Request with chatId in params accepted');
} else {
  console.log('❌ FAIL: Expected chatId to be set and no error response');
  console.log('Got chatId:', req5.chatId, 'status:', res5.statusCode);
}

// Test 6: validateChatAccess - should reject request without user
console.log('\nTest 6: validateChatAccess rejects request without authenticated user');
const req6 = createMockReq({ chatId: '123456' });
const res6 = createMockRes();
const next6 = createMockNext();

await validateChatAccess(req6, res6, next6);

if (res6.statusCode === 401 && res6.jsonData.error === 'Authentication required') {
  console.log('✅ PASS: Request without user rejected with 401');
} else {
  console.log('❌ FAIL: Expected 401 status with authentication error');
  console.log('Got:', res6.statusCode, res6.jsonData);
}

console.log('\n=== Manual Tests Complete ===');
console.log('Note: validateChatAccess with valid user requires database connection');
console.log('Run integration tests with proper test database for full coverage');
