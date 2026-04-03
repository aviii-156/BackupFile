import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Generate access and refresh tokens
 */
export const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry }
  );
};

export const generateRefreshToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry }
  );
};

export const generateTempToken = (email) => {
  return jwt.sign(
    { email, purpose: 'registration' },
    config.jwt.tempSecret,
    { expiresIn: config.jwt.tempExpiry }
  );
};

export const generateTokens = (userId, role) => {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken(userId, role);
  
  return { accessToken, refreshToken };
};

export default { generateAccessToken, generateRefreshToken, generateTempToken, generateTokens };
