const API_KEY = "AIzaSyC-ZE5TIUuppi7ejy_Ax1tfnTIFtxwyJaw";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function checkModels() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log("Available Models for your Key:");
    data.models.forEach(m => {
      console.log(`- ${m.name.replace('models/', '')} (${m.displayName})`);
    });
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

checkModels();