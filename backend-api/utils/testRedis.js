require("dotenv").config();
const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function testRedisConnection() {
  console.log("--- STARTING TEST ---");
  try {
    const pingRes = await redis.ping();
    console.log("Redis PING:", pingRes); // Should be PONG

    await redis.set("test_key", "working");
    const result = await redis.get("test_key");
    console.log("TEST RESULT:", result);
    
    if (result === "working") {
      console.log("✅ UPSTASH REDIS IS PROPERLY CONFIGURED FOR WRITING");
    }
  } catch (err) {
    console.error("❌ ERROR DURING TEST:", err.message);
    if (err.message.includes("NOPERM")) {
      console.log("HINT: Database found but current token has NO WRITING PERMISSION.");
      console.log("Please ensure you are using the 'Global' or 'Admin' token from Upstash console.");
    }
  }
  console.log("--- END TEST ---");
}

testRedisConnection();
