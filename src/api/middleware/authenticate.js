import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') return null;

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  return token;
};

const buildDataCheckString = (params) => {
  const dataCheckArr = [];
  for (const [key, value] of params.entries()) {
    dataCheckArr.push(`${key}=${value}`);
  }
  dataCheckArr.sort((a, b) => a.localeCompare(b));
  return dataCheckArr.join('\n');
};

const validateTelegramHash = (dataCheckString, botToken, hash) => {
  const webAppSecret = process.env.TELEGRAM_WEBAPP_SECRET ?? 'WebAppData';
  const secretKey = crypto.createHmac('sha256', webAppSecret).update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const computedBuffer = Buffer.from(computedHash, 'hex');
  const receivedBuffer = Buffer.from(hash, 'hex');

  if (computedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(computedBuffer, receivedBuffer);
};

const validateTelegramInitData = (initData, botToken) => {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');

    if (!validateTelegramHash(buildDataCheckString(params), botToken, hash)) {
      return null;
    }

    const userString = params.get('user');
    if (!userString) return null;

    return JSON.parse(userString);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
};

export const authenticateJwt = async (authorizationHeader) => {
  const token = extractBearerToken(authorizationHeader);
  if (!token) return null;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (!decoded?.userId) return null;

  return User.findOne({ _id: decoded.userId, status: 'active' }).select('-password');
};

export const authenticateTelegram = async (initData) => {
  if (!initData) return null;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return null;

  const telegramUser = validateTelegramInitData(initData, botToken);
  if (!telegramUser?.id) return null;

  return User.findOne({
    'telegram.id': String(telegramUser.id),
    status: 'active',
  }).select('-password');
};
