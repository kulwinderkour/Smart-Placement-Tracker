const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

async function testFlow() {
  console.log("1. Attempting Register...");
  try {
    let regRes = await axios.post(`${BASE_URL}/auth/register`, {
      email: "rc2@gmail.com",
      password: "password123",
      role: "student"
    });
    console.log("Register SUCCESS:", regRes.data.email);
  } catch(e) {
    if (e.response && e.response.status === 400 && e.response.data.detail === "Email already registered") {
      console.log("User already registered.");
    } else {
      console.error("Register Failed:", e.response ? e.response.data : e.message);
      return;
    }
  }

  console.log("\n2. Attempting Login...");
  try {
    let logRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: "rc2@gmail.com",
      password: "password123"
    });
    console.log("Login SUCCESS:", logRes.data.role, logRes.data.is_onboarding_completed);
    
    console.log("\n3. Attempting /me auth fetch...");
    let meRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${logRes.data.access_token}` }
    });
    console.log("ME SUCCESS:", meRes.data.email);
  } catch(e) {
     console.error("Login/Me Failed:", e.response ? e.response.status + " " + e.response.data.detail : e.message);
  }
}

testFlow();
