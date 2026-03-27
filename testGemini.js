import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyC_mgNYXnMZyjKhXCezA_qMlf5jgl18H54");

async function testGemini() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const result = await model.generateContent("Say hello in one sentence");
    const response = await result.response;

    console.log("API is working ✅");
    console.log(response.text());

  } catch (error) {
    console.log("API error ❌");
    console.error(error.message);
  }
}

testGemini();