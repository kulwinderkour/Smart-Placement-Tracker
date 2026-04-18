const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

async function test() {
  try {
    console.log("Attempt 1: Login with test123@gmail.com, password: password...");
    let res = await axios.post(`${BASE_URL}/auth/login`, {
      email: "test123@gmail.com",
      password: "password"
    });
    console.log("Login SUCCESS:", res.data);
    
    console.log("Attempting me...");
    let meRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${res.data.access_token}` }
    });
    console.log("ME SUCCESS:", meRes.data);
  } catch(e) {
    console.error("Test 1 Failed:", e.response ? e.response.status + " " + e.response.data.detail : e.message);
  }
}

test();
