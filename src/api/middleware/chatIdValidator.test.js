import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import {
  createValidateChatAccess,
  normalizeChatId,
  optionalChatId,
  requireChatId,
} from './chatIdValidator.js';
import logger from '../../utils/logger.js';

const previousLoggerSilent = logger.silent;
logger.silent = true;

after(() => {
  logger.silent = previousLoggerSilent;
});

const createMockReq = (overrides = {}) => ({
  query: {},
  body: {},
  params: {},
  user: null,
  path: '/test',
  method: 'GET',
  ...overrides,
});

const createMockRes = () => {
  const res = {
    statusCode: null,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
  };
  return res;
};

const createMockNext = () => {
  const next = () => {
    next.called = true;
  };
  next.called = false;
  return next;
};

test('normalizeChatId accepts Telegram chat IDs', () => {
  assert.deepEqual(normalizeChatId('123456'), { chatId: '123456', reason: null });
  assert.deepEqual(normalizeChatId('-100123456'), { chatId: '-100123456', reason: null });
  assert.deepEqual(normalizeChatId(123456), { chatId: '123456', reason: null });
  assert.deepEqual(normalizeChatId('  -100123456  '), { chatId: '-100123456', reason: null });
});

test('normalizeChatId rejects missing and invalid values', () => {
  assert.deepEqual(normalizeChatId(undefined), { chatId: null, reason: 'missing' });
  assert.deepEqual(normalizeChatId(null), { chatId: null, reason: 'missing' });
  assert.deepEqual(normalizeChatId(''), { chatId: null, reason: 'missing' });
  assert.deepEqual(normalizeChatId('abc'), { chatId: null, reason: 'invalid' });
  assert.deepEqual(normalizeChatId('12-34'), { chatId: null, reason: 'invalid' });
  assert.deepEqual(normalizeChatId(['123']), { chatId: null, reason: 'invalid' });
  assert.deepEqual(normalizeChatId({ id: '123' }), { chatId: null, reason: 'invalid' });
});

test('requireChatId reads chatId from supported request locations', () => {
  const cases = [
    { overrides: { query: { chatId: '123456' } }, expected: '123456' },
    { overrides: { body: { chatId: '-123456' } }, expected: '-123456' },
    { overrides: { body: { metadata: { chatId: '345678' } } }, expected: '345678' },
    { overrides: { params: { chatId: '901234' } }, expected: '901234' },
  ];

  for (const { overrides, expected } of cases) {
    const req = createMockReq(overrides);
    const res = createMockRes();
    const next = createMockNext();

    requireChatId(req, res, next);

    assert.equal(next.called, true);
    assert.equal(res.statusCode, null);
    assert.equal(req.chatId, expected);
  }
});

test('requireChatId rejects missing chatId', () => {
  const req = createMockReq();
  const res = createMockRes();
  const next = createMockNext();

  requireChatId(req, res, next);

  assert.equal(next.called, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.jsonData.error, 'chatId is required');
});

test('requireChatId rejects invalid chatId', () => {
  const req = createMockReq({ query: { chatId: 'not-a-chat' } });
  const res = createMockRes();
  const next = createMockNext();

  requireChatId(req, res, next);

  assert.equal(next.called, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.jsonData.error, 'Invalid chatId');
});

test('optionalChatId continues without chatId when absent', () => {
  const req = createMockReq();
  const res = createMockRes();
  const next = createMockNext();

  optionalChatId(req, res, next);

  assert.equal(next.called, true);
  assert.equal(res.statusCode, null);
  assert.equal(req.chatId, undefined);
});

test('optionalChatId rejects an invalid provided chatId', () => {
  const req = createMockReq({ body: { metadata: { chatId: { value: '123' } } } });
  const res = createMockRes();
  const next = createMockNext();

  optionalChatId(req, res, next);

  assert.equal(next.called, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.jsonData.error, 'Invalid chatId');
});

test('validateChatAccess rejects unauthenticated requests before database lookup', async () => {
  const findOneCalls = [];
  const validateChatAccess = createValidateChatAccess({
    findOne: async (query) => {
      findOneCalls.push(query);
      return null;
    },
  });
  const req = createMockReq({ chatId: '123456' });
  const res = createMockRes();
  const next = createMockNext();

  await validateChatAccess(req, res, next);

  assert.equal(next.called, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.jsonData.error, 'Authentication required');
  assert.deepEqual(findOneCalls, []);
});

test('validateChatAccess attaches group when user has access', async () => {
  const group = { chatId: '-100123456', title: 'Team chat' };
  let capturedQuery;
  const validateChatAccess = createValidateChatAccess({
    findOne: async (query) => {
      capturedQuery = query;
      return group;
    },
  });
  const req = createMockReq({
    chatId: '-100123456',
    user: { _id: 'user-1', telegram: { id: 123456 } },
  });
  const res = createMockRes();
  const next = createMockNext();

  await validateChatAccess(req, res, next);

  assert.equal(next.called, true);
  assert.equal(res.statusCode, null);
  assert.equal(req.group, group);
  assert.deepEqual(capturedQuery, {
    chatId: '-100123456',
    isActive: true,
    $or: [
      { 'members.userId': 'user-1' },
      { 'members.telegramId': '123456' },
    ],
  });
});

test('validateChatAccess rejects users without group access', async () => {
  const validateChatAccess = createValidateChatAccess({
    findOne: async () => null,
  });
  const req = createMockReq({
    chatId: '-100123456',
    user: { _id: 'user-1' },
  });
  const res = createMockRes();
  const next = createMockNext();

  await validateChatAccess(req, res, next);

  assert.equal(next.called, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.jsonData.error, 'Access denied');
});

test('validateChatAccess returns 500 on database errors', async () => {
  const validateChatAccess = createValidateChatAccess({
    findOne: async () => {
      throw new Error('database unavailable');
    },
  });
  const req = createMockReq({
    chatId: '-100123456',
    user: { _id: 'user-1' },
  });
  const res = createMockRes();
  const next = createMockNext();

  await validateChatAccess(req, res, next);

  assert.equal(next.called, false);
  assert.equal(res.statusCode, 500);
  assert.equal(res.jsonData.error, 'Internal server error');
});
