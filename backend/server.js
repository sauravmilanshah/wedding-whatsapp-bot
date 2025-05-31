// server.js - LLM-powered Wedding WhatsApp Bot Backend
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Wedding bot server is running!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test it at: http://localhost:${PORT}/test`);
});