require("dotenv").config();
const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function testRedis() {
  console.log("Checking environment variables...");
  console.log("URL:", process.env.UPSTASH_REDIS_REST_URL ? "Exists" : "MISSING");
  console.log("TOKEN:", process.env.UPSTASH_REDIS_REST_TOKEN ? "Exists" : "MISSING");

  try {
    console.log("\nTesting Redis connection...");
    await redis.set("test_key", "working");
    const result = await redis.get("test_key");
    console.log("Result for 'test_key':", result);
    
    if (result === "working") {
      console.log("\n✅ SUCCESS: Upstash Redis is working correctly!");
    } else {
      console.log("\n❌ FAILED: Upstash Redis returned unexpected value.");
    }
  } catch (err) {
    console.error("\n❌ ERROR: Upstash connection failed!");
    console.error(err.message);
    if (err.message.includes("Unauthorized")) {
      console.log("HINT: Please check if your UPSTASH_REDIS_REST_TOKEN is correct.");
    }
  }
}

testRedis();
