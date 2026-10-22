from fastapi import APIRouter, Query
from typing import List, Dict

router = APIRouter(prefix="/skills", tags=["skills"])

FIELD_SKILLS: Dict[str, List[str]] = {
    "cse": [
        "Python", "Java", "C++", "JavaScript", "TypeScript", "React", "Node.js",
        "Express.js", "SQL", "PostgreSQL", "MongoDB", "Git", "Docker", "REST APIs",
        "Data Structures", "Algorithms", "System Design", "Machine Learning",
        "Deep Learning", "TensorFlow", "PyTorch", "Linux", "AWS", "GCP", "Azure",
    ],
    "cs": [
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
    "it": [
        "Python", "Java", "JavaScript", "HTML", "CSS", "React", "SQL", "MySQL",
        "MongoDB", "Networking", "Cybersecurity", "Linux", "Git", "Docker",
        "Cloud Computing", "REST APIs", "PHP", "Database Management",
    ],
    "ece": [
        "Embedded C", "C", "C++", "MATLAB", "Arduino", "Raspberry Pi", "VHDL",
        "Verilog", "Signal Processing", "PCB Design", "IoT", "FPGA",
        "Microcontrollers", "Python", "LabVIEW", "Circuit Design", "VLSI",
    ],
    "eee": [
        "MATLAB", "Embedded C", "C", "PLC Programming", "SCADA", "AutoCAD Electrical",
        "Python", "Circuit Design", "Power Systems", "Control Systems",
        "Signal Processing", "Arduino", "Raspberry Pi",
    ],
    "me": [
        "AutoCAD", "SolidWorks", "CATIA", "ANSYS", "MATLAB", "C", "Python",
        "CNC Programming", "Thermodynamics", "GD&T", "Finite Element Analysis",
        "Manufacturing Processes", "Robotics",
    ],
    "civil": [
        "AutoCAD", "STAAD Pro", "Revit", "ETABS", "Primavera", "MS Project",
        "GIS", "Surveying", "Structural Analysis", "Concrete Technology",
        "Geotechnical Engineering",
    ],
}

DEFAULT_SKILLS = [
    "Python", "Java", "JavaScript", "React", "Node.js", "SQL", "Git",
    "Data Structures", "Algorithms", "Communication Skills", "Problem Solving"
]

@router.get("/suggestions")
def get_skill_suggestions(field: str = Query(default="")):
    cleaned = field.lower().strip()
    for key, skills in FIELD_SKILLS.items():
        if key in cleaned or cleaned in key:
            return {"suggestions": skills, "field": field}
    return {"suggestions": DEFAULT_SKILLS, "field": field}
