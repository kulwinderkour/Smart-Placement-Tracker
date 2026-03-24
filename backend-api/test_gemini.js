require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const gemini_key = process.env.GEMINI_API_KEY;
  try {
    // Some older versions or specific setups might need apiVersion? 
    // But the current SDK version should handle it.
    const genAI = new GoogleGenerativeAI(gemini_key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }, { apiVersion: 'v1' });
    const result = await model.generateContent("hello");
    console.log('Success:', result.response.text());
  } catch (err) {
    console.error('Failure:', err.message);
    if (err.status) console.error('Status:', err.status);
  }
}

test();
