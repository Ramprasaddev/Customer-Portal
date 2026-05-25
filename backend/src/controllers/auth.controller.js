// src/controllers/auth.controller.js
const jwt     = require('jsonwebtoken');
const { rfcLogin } = require('../services/sapSoap.service');

const JWT_SECRET     = process.env.JWT_SECRET     || 'kaartech_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

async function login(req, res) {
  try {
    const { kunnr, password } = req.body;

    if (!kunnr || !password) {
      return res.status(400).json({
        success: false,
        message: 'Customer number and password are required',
      });
    }

    const result = await rfcLogin(kunnr, password);

    if (result.status !== 'S') {
      return res.status(401).json({
        success: false,
        message: result.message || 'Invalid credentials',
      });
    }

    const token = jwt.sign(
      { kunnr: result.kunnr, loginTime: new Date().toISOString() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: result.message,
      token,
      kunnr:   result.kunnr,
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.status(500).json({ success: false, message: 'SAP connection error', error: err.message });
  }
}

module.exports = { login };
