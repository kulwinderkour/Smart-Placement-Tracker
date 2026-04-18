const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

async function testFlow() {
  console.log("1. Attempting Register...");
  try {
    let regRes = await axios.post(`${BASE_URL}/auth/register`, {
      email: "rc@gmail.com",
      password: "password123",
      role: "student"
    });
    console.log("Register SUCCESS:", regRes.data.email);
  } catch(e) {
    if (e.response && e.response.status === 400 && e.response.data.detail === "Email already registered") {
      console.log("User already registered. Updating password...");
      // There is no password update route but we know the user exists
    } else {
      console.error("Register Failed:", e.response ? e.response.data : e.message);
    }
  }
}

testFlow();
