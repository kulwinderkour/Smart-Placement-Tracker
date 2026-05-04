const express = require("express");

const router = express.Router();

// ── Static skill map per field of study ──────────────────────────────────────
const FIELD_SKILLS = {
  // Computer Science variants
  cse: [
    "Python", "Java", "C++", "JavaScript", "TypeScript", "React", "Node.js",
    "Express.js", "SQL", "PostgreSQL", "MongoDB", "Git", "Docker", "REST APIs",
    "Data Structures", "Algorithms", "System Design", "Machine Learning",
    "Deep Learning", "TensorFlow", "PyTorch", "Linux", "AWS", "GCP", "Azure",
  ],
  cs: [
    "Python", "Java", "C++", "JavaScript", "TypeScript", "React", "Node.js",
    "Express.js", "SQL", "PostgreSQL", "MongoDB", "Git", "Docker", "REST APIs",
    "Data Structures", "Algorithms", "System Design", "Machine Learning",
    "Deep Learning", "TensorFlow", "PyTorch", "Linux", "AWS", "GCP", "Azure",
  ],
  "computer science": [
    "Python", "Java", "C++", "JavaScript", "TypeScript", "React", "Node.js",
    "SQL", "MongoDB", "Git", "Docker", "Data Structures", "Algorithms",
    "System Design", "Machine Learning", "Linux", "AWS",
  ],
  "computer science and engineering": [
    "Python", "Java", "C++", "JavaScript", "TypeScript", "React", "Node.js",
    "SQL", "PostgreSQL", "MongoDB", "Git", "Docker", "REST APIs",
    "Data Structures", "Algorithms", "System Design", "Machine Learning",
    "Linux", "AWS", "GCP",
  ],
  // Information Technology
  it: [
    "Python", "Java", "JavaScript", "HTML", "CSS", "React", "SQL", "MySQL",
    "MongoDB", "Networking", "Cybersecurity", "Linux", "Git", "Docker",
    "Cloud Computing", "REST APIs", "PHP", "Database Management",
  ],
  "information technology": [
    "Python", "Java", "JavaScript", "HTML", "CSS", "React", "SQL", "MySQL",
    "MongoDB", "Networking", "Cybersecurity", "Linux", "Git", "Docker",
    "Cloud Computing", "REST APIs",
  ],
  // Electronics / EEE
  ece: [
    "Embedded C", "C", "C++", "MATLAB", "Arduino", "Raspberry Pi", "VHDL",
    "Verilog", "Signal Processing", "PCB Design", "IoT", "FPGA",
    "Microcontrollers", "Python", "LabVIEW", "Circuit Design", "VLSI",
  ],
  eee: [
    "MATLAB", "Embedded C", "C", "PLC Programming", "SCADA", "AutoCAD Electrical",
    "Python", "Circuit Design", "Power Systems", "Control Systems",
    "Signal Processing", "Arduino", "Raspberry Pi",
  ],
  "electronics and communication": [
    "Embedded C", "C", "C++", "MATLAB", "Arduino", "VHDL", "Verilog",
    "Signal Processing", "PCB Design", "IoT", "FPGA", "Microcontrollers",
    "Python", "LabVIEW",
  ],
  // Mechanical
  me: [
    "AutoCAD", "SolidWorks", "CATIA", "ANSYS", "MATLAB", "C", "Python",
    "3D Modeling", "FEA", "CFD", "Manufacturing Processes", "Thermodynamics",
    "Project Management",
  ],
  "mechanical engineering": [
    "AutoCAD", "SolidWorks", "CATIA", "ANSYS", "MATLAB", "3D Modeling",
    "FEA", "CFD", "Manufacturing Processes", "Thermodynamics", "Project Management",
  ],
  // Civil
  civil: [
    "AutoCAD", "STAAD Pro", "Revit", "ETABS", "SAP2000", "MS Project",
    "Surveying", "Primavera", "SketchUp", "Building Information Modeling",
  ],
  "civil engineering": [
    "AutoCAD", "STAAD Pro", "Revit", "ETABS", "SAP2000", "MS Project",
    "Surveying", "Primavera",
  ],
  // MBA / Management
  mba: [
    "Excel", "PowerPoint", "Business Analysis", "Financial Modeling", "SQL",
    "Tableau", "Power BI", "Marketing Strategy", "Project Management",
    "SAP", "CRM", "Supply Chain Management", "Leadership",
  ],
  management: [
    "Excel", "PowerPoint", "Business Analysis", "SQL", "Tableau", "Power BI",
    "Marketing Strategy", "Project Management", "SAP", "CRM", "Leadership",
  ],
  // Data / AI
  "data science": [
    "Python", "R", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
    "Pandas", "NumPy", "SQL", "Tableau", "Power BI", "Statistics", "Spark",
    "Hadoop", "Scikit-learn", "NLP", "Computer Vision",
  ],
  ai: [
    "Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
    "NLP", "Computer Vision", "OpenCV", "Transformers", "Reinforcement Learning",
    "Pandas", "NumPy", "SQL", "Scikit-learn",
  ],
  // Default fallback
  default: [
    "Python", "Excel", "SQL", "Communication", "Problem Solving", "Git",
    "Project Management", "Data Analysis", "Leadership", "Teamwork",
  ],
};

/**
 * Normalise branch/field string: lowercase + trim.
 * Tries exact match, then substring match, then default.
 */
function resolveSkills(field) {
  if (!field) return FIELD_SKILLS.default;

  const key = field.toLowerCase().trim();

  // Exact match
  if (FIELD_SKILLS[key]) return FIELD_SKILLS[key];

  // Substring match (e.g. "B.Tech CSE" → "cse")
  for (const [mapKey, skills] of Object.entries(FIELD_SKILLS)) {
    if (mapKey === "default") continue;
    if (key.includes(mapKey) || mapKey.includes(key)) return skills;
  }

  return FIELD_SKILLS.default;
}

// ---------------------------------------------------------------------------
// GET /api/skills/suggestions?field=CSE
// ---------------------------------------------------------------------------
router.get("/suggestions", (req, res) => {
  const field = req.query.field || "";
  const suggestions = resolveSkills(field);
  return res.json({ suggestions, field });
});

module.exports = router;
