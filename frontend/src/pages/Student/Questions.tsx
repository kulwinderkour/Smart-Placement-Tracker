import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { aiApi } from "../../api/ai";
import {
  Brain,
  BookOpen,
  Code,
  Award,
  Loader2,
  Users,
  Shuffle,
  CheckCircle,
  X,
} from "lucide-react";

// Types
interface Question {
  id: string;
  type: "mcq" | "coding" | "theory" | "situational";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  examples?: Array<{ input: string; output: string }>;
  hints?: string[];
}

interface QuestionSet {
  topic: string;
  difficulty: string;
  type: string;
  totalQuestions: number;
  questions: Question[];
}

interface Evaluation {
  score: number;
  maxScore: number;
  grade: string;
  feedback: string;
  strengths: string[];
  improvements: string[];
  betterAnswer: string;
}

const Card = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => (
  <div
    style={{
      background: "var(--student-surface)",
      border: "1px solid #21262d",
      borderRadius: 12,
      padding: "24px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      ...style,
    }}
  >
    {children}
  </div>
);

const DIFFICULTY_STYLES: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  easy: { bg: "rgba(34,197,94,0.15)", color: "#22c55e", border: "#22c55e" },
  medium: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "#f59e0b" },
  hard: { bg: "rgba(239,68,68,0.15)", color: "#ef4444", border: "#ef4444" },
};

const TYPE_STYLES: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  mcq: { bg: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "#3b82f6" },
  coding: { bg: "rgba(168,85,247,0.15)", color: "#a855f7", border: "#a855f7" },
  theory: { bg: "rgba(16,185,129,0.15)", color: "#10b981", border: "#10b981" },
  situational: {
    bg: "rgba(251,146,60,0.15)",
    color: "#fb923c",
    border: "#fb923c",
  },
  mixed: { bg: "rgba(107,114,128,0.15)", color: "var(--student-text-dim)", border: "var(--student-text-dim)" },
};

export default function Questions() {
  useAuthStore(); // keep store subscription alive
  const token = localStorage.getItem("access_token");

  const [generating, setGenerating] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuestionSet | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [userSkills, setUserSkills] = useState<string[]>([]);

  // Form state
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    "easy" | "medium" | "hard"
  >("medium");
  const selectedType = "mcq" as const;
  const [questionCount, setQuestionCount] = useState(10);
  const [customQuestion, setCustomQuestion] = useState("");
  const [useCustomQuestion, setUseCustomQuestion] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showGeneratingPopup, setShowGeneratingPopup] = useState(false);
  const [generatingField, setGeneratingField] = useState("");

  // Load user profile and topics
  useEffect(() => {
    loadUserProfile();
    loadTopics();
  }, []);

  const loadUserProfile = () => {
    const profile = localStorage.getItem("userProfile");
    if (profile) {
      try {
        const parsed = JSON.parse(profile);
        setUserSkills(parsed.skills || []);
      } catch (err) {
        console.error("Failed to parse user profile:", err);
      }
    }
  };

  const loadTopics = async () => {
    try {
      const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(
        `${BASE}/questions/topics?skills=${userSkills.join(",")}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          console.error("loadTopics: expected JSON but got", contentType);
          return;
        }
        const data = await response.json();
        setTopics(data.topics ?? []);
      }
    } catch (err) {
      console.error("Failed to load topics:", err);
    }
  };

  const generateQuestions = async () => {
    if (!useCustomQuestion && !selectedTopic) {
      alert("Please select a topic or enter a custom question");
      return;
    }

    if (useCustomQuestion && !customQuestion.trim()) {
      alert("Please enter a custom question");
      return;
    }

    // Show generating popup
    const field = useCustomQuestion ? "Custom Questions" : selectedTopic;
    setGeneratingField(field);
    setShowGeneratingPopup(true);

    setGenerating(true);
    setShowResults(false);
    setEvaluation(null);
    setUserAnswers({});

    try {
      // Use the AI API instead of direct fetch
      const topic = useCustomQuestion ? customQuestion.trim() : selectedTopic;
      const response = await aiApi.getInterviewQuestions(topic, userSkills, selectedDifficulty, selectedType, questionCount);
      
      // AI engine returns { success, data: { questions: [...], type, difficulty } }
      const payload = response.data?.data ?? response.data;
      const rawQuestions: Question[] = (payload?.questions || [])
        .filter((q: { options?: string[] }) => Array.isArray(q.options) && q.options.length >= 2)
        .map(
          (q: { question: string; answer?: string; correct_answer?: string; options?: string[]; explanation?: string }, i: number) => ({
            id: `q${i + 1}`,
            type: "mcq" as const,
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correct_answer || q.answer || "",
            explanation: q.explanation || q.answer || "",
            topic: topic,
            difficulty: selectedDifficulty,
          })
        );
      const questionSet: QuestionSet = {
        topic: topic,
        difficulty: selectedDifficulty,
        type: selectedType,
        totalQuestions: rawQuestions.length || questionCount,
        questions: rawQuestions,
      };

      setQuestions(questionSet);
      setCurrentQuestionIndex(0);
      setShowResults(false);
      setFromCache(false); // AI API doesn't use cache
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Failed to generate questions. Please try again.";
      console.error("Error generating questions:", error);
      alert(msg);
    } finally {
      setGenerating(false);
      // Hide generating popup after a short delay
      setTimeout(() => {
        setShowGeneratingPopup(false);
      }, 1500);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < (questions?.questions.length || 0) - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const submitAnswers = () => {
    setShowResults(true);
  };

  const evaluateAnswer = async (question: Question) => {
    const userAnswer = userAnswers[question.id];
    if (!userAnswer) return;

    setEvaluating(true);
    try {
      const BASE = import.meta.env.VITE_EXPRESS_URL || "http://localhost:8081";
      const response = await fetch(`${BASE}/questions/evaluate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.question,
          userAnswer: userAnswer,
          correctAnswer: question.correctAnswer,
          topic: question.topic,
        }),
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const result = await response.json();
          setEvaluation(result);
        } else {
          console.error("evaluateAnswer: expected JSON but got", contentType);
        }
      }
    } catch (err) {
      console.error("Failed to evaluate answer:", err);
    } finally {
      setEvaluating(false);
    }
  };

  const resetQuiz = () => {
    setQuestions(null);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setShowResults(false);
    setEvaluation(null);
  };

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case "mcq":
        return <CheckCircle size={20} />;
      case "coding":
        return <Code size={20} />;
      case "theory":
        return <BookOpen size={20} />;
      case "situational":
        return <Users size={20} />;
      default:
        return <Brain size={20} />;
    }
  };

  const currentQuestion = questions?.questions[currentQuestionIndex];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--student-bg)",
        color: "var(--student-text)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "var(--student-surface)",
          borderBottom: "1px solid #21262d",
          padding: "16px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "linear-gradient(135deg, #a78bfa 0%, #099268 100%)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Brain size={20} color="#fff" />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: 600,
                  margin: 0,
                  color: "var(--student-text)",
                }}
              >
                AI Question Generator
              </h1>
              <p style={{ fontSize: "14px", color: "var(--student-text-muted)", margin: 0 }}>
                Practice interview questions with AI-powered generation
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                padding: "6px 12px",
                background: "var(--student-border)",
                borderRadius: "6px",
                fontSize: "12px",
                color: "var(--student-text-muted)",
              }}
            >
              {questions
                ? `${questions.questions.length} Questions`
                : "Ready to Generate"}
            </div>
            {fromCache && (
              <div
                style={{
                  padding: "6px 12px",
                  background: "#a78bfa",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#ffffff",
                }}
              >
                From Cache
              </div>
            )}
          </div>
        </div>
      </header>

      <main style={{ padding: "32px 20px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Dashboard - Field Selection */}
          {!questions && !showModal && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  background:
                    "linear-gradient(135deg, #a78bfa 0%, #099268 100%)",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 32px",
                }}
              >
                <Brain size={40} color="#fff" />
              </div>

              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  margin: "0 0 16px",
                  color: "var(--student-text)",
                }}
              >
                Generate Practice Questions
              </h2>

              <p
                style={{
                  fontSize: "16px",
                  color: "var(--student-text-muted)",
                  margin: "0 0 48px",
                  lineHeight: "1.6",
                }}
              >
                Choose your field of practice and generate AI-powered interview
                questions tailored to your needs
              </p>

              {/* Field Selection Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "20px",
                  marginBottom: "40px",
                  maxWidth: "800px",
                  margin: "0 auto 40px",
                }}
              >
                {topics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => {
                      setSelectedTopic(topic);
                      setShowModal(true);
                    }}
                    style={{
                      background: "var(--student-surface)",
                      border: "1px solid #21262d",
                      borderRadius: "12px",
                      padding: "24px 20px",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "var(--student-border)";
                      e.currentTarget.style.borderColor = "#a78bfa";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "var(--student-surface)";
                      e.currentTarget.style.borderColor = "var(--student-border)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        background:
                          "linear-gradient(135deg, #a78bfa 0%, #099268 100%)",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Brain size={20} color="#fff" />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: 600,
                          margin: "0 0 4px",
                          color: "var(--student-text)",
                        }}
                      >
                        {topic}
                      </h3>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "var(--student-text-muted)",
                          margin: 0,
                          lineHeight: "1.4",
                        }}
                      >
                        Generate interview questions for {topic} roles
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Questions Option */}
              <button
                onClick={() => {
                  setUseCustomQuestion(true);
                  setShowModal(true);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "12px",
                  background: "transparent",
                  color: "#a78bfa",
                  border: "1px solid #a78bfa",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#a78bfa";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#a78bfa";
                }}
              >
                <Brain size={16} />
                Practice with Custom Questions
              </button>
            </div>
          )}

          {/* Question Display */}
          {questions && currentQuestion && !showResults && (
            <div>
              {/* Progress Bar */}
              <Card style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "var(--student-text-muted)" }}>
                    Question {currentQuestionIndex + 1} of{" "}
                    {questions.questions.length}
                  </span>
                  <span style={{ fontSize: "14px", color: "var(--student-text-muted)" }}>
                    {Math.round(
                      ((currentQuestionIndex + 1) /
                        questions.questions.length) *
                        100,
                    )}
                    % Complete
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "var(--student-border)",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${((currentQuestionIndex + 1) / questions.questions.length) * 100}%`,
                      height: "100%",
                      background:
                        "linear-gradient(90deg, #a78bfa 0%, #099268 100%)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </Card>

              {/* Question Card */}
              <Card>
                {/* Question Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    {getQuestionIcon(currentQuestion.type)}
                    <div>
                      <h3
                        style={{
                          fontSize: "18px",
                          fontWeight: 600,
                          margin: "0 0 4px",
                          color: "var(--student-text)",
                        }}
                      >
                        {currentQuestion.topic}
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            background:
                              DIFFICULTY_STYLES[currentQuestion.difficulty].bg,
                            color:
                              DIFFICULTY_STYLES[currentQuestion.difficulty]
                                .color,
                            fontSize: "12px",
                            fontWeight: 500,
                            padding: "4px 8px",
                            borderRadius: "12px",
                            textTransform: "uppercase",
                          }}
                        >
                          {currentQuestion.difficulty}
                        </span>
                        <span
                          style={{
                            background: TYPE_STYLES[currentQuestion.type].bg,
                            color: TYPE_STYLES[currentQuestion.type].color,
                            fontSize: "12px",
                            fontWeight: 500,
                            padding: "4px 8px",
                            borderRadius: "12px",
                            textTransform: "uppercase",
                          }}
                        >
                          {currentQuestion.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question Text */}
                <div
                  style={{
                    fontSize: "16px",
                    lineHeight: 1.6,
                    marginBottom: "24px",
                    color: "var(--student-text)",
                  }}
                >
                  {currentQuestion.question}
                </div>

                {/* MCQ Options */}
                {currentQuestion.type === "mcq" && (
                  <div style={{ marginBottom: "24px" }}>
                    {currentQuestion.options.map((option, index) => (
                      <label
                        key={index}
                        style={{
                          display: "block",
                          padding: "12px 16px",
                          marginBottom: "8px",
                          background:
                            userAnswers[currentQuestion.id] === option
                              ? "rgba(167, 139, 250, 0.15)"
                              : "var(--student-bg)",
                          border:
                            userAnswers[currentQuestion.id] === option
                              ? "2px solid #a78bfa"
                              : "1px solid #21262d",
                          borderRadius: "8px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <input
                          type="radio"
                          name={currentQuestion.id}
                          value={option}
                          checked={userAnswers[currentQuestion.id] === option}
                          onChange={(e) =>
                            handleAnswerChange(
                              currentQuestion.id,
                              e.target.value,
                            )
                          }
                          style={{ marginRight: "12px" }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}

                {/* Theory/Coding/Situational Answer */}
                {"theory,coding,situational".includes(currentQuestion.type) && (
                  <div style={{ marginBottom: "24px" }}>
                    <textarea
                      value={userAnswers[currentQuestion.id] || ""}
                      onChange={(e) =>
                        handleAnswerChange(currentQuestion.id, e.target.value)
                      }
                      placeholder="Type your answer here..."
                      style={{
                        width: "100%",
                        minHeight: "120px",
                        padding: "12px 16px",
                        background: "var(--student-bg)",
                        border: "1px solid #21262d",
                        borderRadius: "8px",
                        color: "var(--student-text)",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                    />
                  </div>
                )}

                {/* Coding Examples */}
                {currentQuestion.type === "coding" &&
                  currentQuestion.examples && (
                    <div style={{ marginBottom: "24px" }}>
                      <h4
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          margin: "0 0 12px",
                          color: "var(--student-text-muted)",
                        }}
                      >
                        Examples:
                      </h4>
                      {currentQuestion.examples.map((example, index) => (
                        <div
                          key={index}
                          style={{
                            background: "var(--student-bg)",
                            border: "1px solid #21262d",
                            borderRadius: "6px",
                            padding: "12px",
                            marginBottom: "8px",
                            fontFamily: "monospace",
                            fontSize: "13px",
                          }}
                        >
                          <div
                            style={{ color: "var(--student-text-muted)", marginBottom: "4px" }}
                          >
                            Input:
                          </div>
                          <div
                            style={{ color: "var(--student-text)", marginBottom: "8px" }}
                          >
                            {example.input}
                          </div>
                          <div
                            style={{ color: "var(--student-text-muted)", marginBottom: "4px" }}
                          >
                            Output:
                          </div>
                          <div style={{ color: "var(--student-text)" }}>
                            {example.output}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Hints */}
                {currentQuestion.hints && currentQuestion.hints.length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    <h4
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        margin: "0 0 12px",
                        color: "var(--student-text-muted)",
                      }}
                    >
                      Hints:
                    </h4>
                    {currentQuestion.hints.map((hint, index) => (
                      <div
                        key={index}
                        style={{
                          background: DIFFICULTY_STYLES.easy.bg,
                          border: `1px solid ${DIFFICULTY_STYLES.easy.border}30`,
                          borderRadius: "6px",
                          padding: "8px 12px",
                          marginBottom: "8px",
                          fontSize: "13px",
                          color: DIFFICULTY_STYLES.easy.color,
                        }}
                      >
                        💡 {hint}
                      </div>
                    ))}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <button
                    onClick={prevQuestion}
                    disabled={currentQuestionIndex === 0}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background:
                        currentQuestionIndex === 0 ? "var(--student-border)" : "var(--student-border)",
                      color: currentQuestionIndex === 0 ? "var(--student-text-muted)" : "var(--student-text)",
                      border: "1px solid #21262d",
                      borderRadius: "8px",
                      padding: "10px 16px",
                      fontSize: "14px",
                      cursor:
                        currentQuestionIndex === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    Previous
                  </button>

                  {currentQuestionIndex === questions.questions.length - 1 ? (
                    <button
                      onClick={submitAnswers}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "#a78bfa",
                        color: "#ffffff",
                        border: "1px solid #a78bfa",
                        borderRadius: "8px",
                        padding: "10px 16px",
                        fontSize: "14px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Submit Answers
                    </button>
                  ) : (
                    <button
                      onClick={nextQuestion}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "#a78bfa",
                        color: "#ffffff",
                        border: "1px solid #a78bfa",
                        borderRadius: "8px",
                        padding: "10px 16px",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      Next
                    </button>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Results */}
          {showResults && questions && (
            <div>
              <Card>
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    margin: "0 0 24px",
                    color: "var(--student-text)",
                  }}
                >
                  Quiz Results
                </h2>

                {questions.questions.map((question, index) => (
                  <div
                    key={question.id}
                    style={{
                      background: "var(--student-bg)",
                      border: "1px solid #21262d",
                      borderRadius: "8px",
                      padding: "20px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      {getQuestionIcon(question.type)}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: "16px",
                            fontWeight: 500,
                            marginBottom: "8px",
                            color: "var(--student-text)",
                          }}
                        >
                          {index + 1}. {question.question}
                        </div>

                        {/* User Answer */}
                        <div style={{ marginBottom: "8px" }}>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--student-text-muted)",
                              marginRight: "8px",
                            }}
                          >
                            Your Answer:
                          </span>
                          <span style={{ fontSize: "14px", color: "var(--student-text)" }}>
                            {userAnswers[question.id] || "Not answered"}
                          </span>
                        </div>

                        {/* Correct Answer */}
                        <div style={{ marginBottom: "8px" }}>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--student-text-muted)",
                              marginRight: "8px",
                            }}
                          >
                            Correct Answer:
                          </span>
                          <span
                            style={{
                              fontSize: "14px",
                              color: "#a78bfa",
                              fontWeight: 500,
                            }}
                          >
                            {question.correctAnswer}
                          </span>
                        </div>

                        {/* Explanation */}
                        <div style={{ marginTop: "12px" }}>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--student-text-muted)",
                              marginRight: "8px",
                            }}
                          >
                            Explanation:
                          </span>
                          <div
                            style={{
                              fontSize: "13px",
                              color: "var(--student-text)",
                              marginTop: "4px",
                            }}
                          >
                            {question.explanation}
                          </div>
                        </div>

                        {/* Evaluate Button */}
                        {"theory,coding,situational".includes(question.type) &&
                          userAnswers[question.id] && (
                            <button
                              onClick={() => evaluateAnswer(question)}
                              disabled={evaluating}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                background: "var(--student-border)",
                                color: "var(--student-text)",
                                border: "1px solid #21262d",
                                borderRadius: "6px",
                                padding: "8px 12px",
                                fontSize: "12px",
                                marginTop: "12px",
                                cursor: evaluating ? "not-allowed" : "pointer",
                              }}
                            >
                              {evaluating ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Brain size={12} />
                              )}
                              {evaluating
                                ? "Evaluating..."
                                : "Get AI Evaluation"}
                            </button>
                          )}

                        {/* Evaluation Result */}
                        {evaluation && (
                          <div
                            style={{
                              background: DIFFICULTY_STYLES.easy.bg,
                              border: `1px solid ${DIFFICULTY_STYLES.easy.border}30`,
                              borderRadius: "8px",
                              padding: "16px",
                              marginTop: "12px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "12px",
                              }}
                            >
                              <Award
                                size={16}
                                color={DIFFICULTY_STYLES.easy.color}
                              />
                              <span
                                style={{
                                  fontSize: "14px",
                                  fontWeight: 600,
                                  color: DIFFICULTY_STYLES.easy.color,
                                }}
                              >
                                Score: {evaluation.score}/{evaluation.maxScore}{" "}
                                ({evaluation.grade})
                              </span>
                            </div>

                            <div style={{ marginBottom: "12px" }}>
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "var(--student-text-muted)",
                                  marginBottom: "4px",
                                }}
                              >
                                Feedback:
                              </div>
                              <div
                                style={{ fontSize: "13px", color: "var(--student-text)" }}
                              >
                                {evaluation.feedback}
                              </div>
                            </div>

                            {evaluation.strengths.length > 0 && (
                              <div style={{ marginBottom: "12px" }}>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "var(--student-text-muted)",
                                    marginBottom: "4px",
                                  }}
                                >
                                  Strengths:
                                </div>
                                {evaluation.strengths.map((strength, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      fontSize: "12px",
                                      color: DIFFICULTY_STYLES.easy.color,
                                      marginLeft: "8px",
                                    }}
                                  >
                                    • {strength}
                                  </div>
                                ))}
                              </div>
                            )}

                            {evaluation.improvements.length > 0 && (
                              <div style={{ marginBottom: "12px" }}>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "var(--student-text-muted)",
                                    marginBottom: "4px",
                                  }}
                                >
                                  Areas for Improvement:
                                </div>
                                {evaluation.improvements.map(
                                  (improvement, i) => (
                                    <div
                                      key={i}
                                      style={{
                                        fontSize: "12px",
                                        color: "#ef4444",
                                        marginLeft: "8px",
                                      }}
                                    >
                                      • {improvement}
                                    </div>
                                  ),
                                )}
                              </div>
                            )}

                            <div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "var(--student-text-muted)",
                                  marginBottom: "4px",
                                }}
                              >
                                Better Answer:
                              </div>
                              <div
                                style={{
                                  fontSize: "13px",
                                  color: "var(--student-text)",
                                  fontStyle: "italic",
                                }}
                              >
                                {evaluation.betterAnswer}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Reset Button */}
                <div style={{ textAlign: "center", marginTop: "24px" }}>
                  <button
                    onClick={resetQuiz}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#a78bfa",
                      color: "#ffffff",
                      border: "1px solid #a78bfa",
                      borderRadius: "8px",
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    <Shuffle size={16} />
                    Generate New Questions
                  </button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Question Generation Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "var(--student-surface)",
              border: "1px solid #21262d",
              borderRadius: 16,
              padding: "32px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "24px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    background:
                      "linear-gradient(135deg, #a78bfa 0%, #099268 100%)",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Brain size={20} color="#fff" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: 600,
                      margin: 0,
                      color: "var(--student-text)",
                    }}
                  >
                    Generate Practice Questions
                  </h2>
                  <p style={{ fontSize: "14px", color: "var(--student-text-muted)", margin: 0 }}>
                    Customize your interview preparation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--student-text-muted)",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content - Form */}
            <div style={{ marginBottom: "24px" }}>
              {/* Custom Question Toggle */}
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={useCustomQuestion}
                    onChange={(e) => setUseCustomQuestion(e.target.checked)}
                    style={{
                      width: "20px",
                      height: "20px",
                      accentColor: "#a78bfa",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "var(--student-text)",
                    }}
                  >
                    Practice with Your Own Questions
                  </span>
                </label>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--student-text-muted)",
                    margin: "8px 0 0",
                    lineHeight: "1.4",
                  }}
                >
                  Enter questions you want to practice and get AI-generated
                  similar questions for interview preparation
                </p>
              </div>

              {/* Custom Question Input */}
              {useCustomQuestion ? (
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: 500,
                      marginBottom: "8px",
                      color: "var(--student-text)",
                    }}
                  >
                    Enter Your Practice Questions
                  </label>
                  <textarea
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Enter the questions you want to practice for your interview...&#10;&#10;Examples:&#10;• 'Tell me about yourself and your experience with React'&#10;• 'How do you handle state management in large applications?'&#10;• 'Explain the difference between REST and GraphQL APIs'&#10;• 'Write a function to find the maximum depth of a binary tree'&#10;• 'Describe a challenging technical problem you solved recently'"
                    style={{
                      width: "100%",
                      minHeight: "100px",
                      padding: "10px 12px",
                      background: "var(--student-bg)",
                      border: "1px solid #21262d",
                      borderRadius: "8px",
                      color: "var(--student-text)",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                  />
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--student-text-muted)",
                      margin: "8px 0 0",
                      lineHeight: "1.4",
                    }}
                  >
                    💡 Enter one or more interview questions you want to
                    practice. The AI will generate similar questions to help you
                    prepare.
                  </p>
                </div>
              ) : (
                /* Topic Selection */
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: 500,
                      marginBottom: "8px",
                      color: "var(--student-text)",
                    }}
                  >
                    Practice Topic
                  </label>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "var(--student-bg)",
                      border: "1px solid #21262d",
                      borderRadius: "8px",
                      color: "var(--student-text)",
                      fontSize: "14px",
                    }}
                  >
                    <option value="">Select a topic to practice</option>
                    {topics.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Form Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                {/* Difficulty */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: 500,
                      marginBottom: "8px",
                      color: "var(--student-text)",
                    }}
                  >
                    Difficulty Level
                  </label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) =>
                      setSelectedDifficulty(
                        e.target.value as "easy" | "medium" | "hard",
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "var(--student-bg)",
                      border: "1px solid #21262d",
                      borderRadius: "8px",
                      color: "var(--student-text)",
                      fontSize: "14px",
                    }}
                  >
                    <option value="easy">Easy (Beginner)</option>
                    <option value="medium">Medium (Intermediate)</option>
                    <option value="hard">Hard (Advanced)</option>
                  </select>
                </div>

                {/* Number of Questions */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: 500,
                      marginBottom: "8px",
                      color: "var(--student-text)",
                    }}
                  >
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "var(--student-bg)",
                      border: "1px solid #21262d",
                      borderRadius: "8px",
                      color: "var(--student-text)",
                      fontSize: "14px",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "20px",
                borderTop: "1px solid #21262d",
              }}
            >
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "transparent",
                  color: "var(--student-text-muted)",
                  border: "1px solid #21262d",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  generateQuestions();
                  setShowModal(false);
                }}
                disabled={
                  generating ||
                  (!useCustomQuestion && !selectedTopic) ||
                  (useCustomQuestion && !customQuestion.trim())
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background:
                    generating ||
                    (!useCustomQuestion && !selectedTopic) ||
                    (useCustomQuestion && !customQuestion.trim())
                      ? "var(--student-border)"
                      : "#a78bfa",
                  color:
                    generating ||
                    (!useCustomQuestion && !selectedTopic) ||
                    (useCustomQuestion && !customQuestion.trim())
                      ? "var(--student-text-muted)"
                      : "#ffffff",
                  border: "1px solid #21262d",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor:
                    generating ||
                    (!useCustomQuestion && !selectedTopic) ||
                    (useCustomQuestion && !customQuestion.trim())
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {generating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Brain size={16} />
                )}
                {generating ? "Generating..." : "Generate Questions"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generating Questions Popup */}
      {showGeneratingPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              background: "var(--student-surface)",
              border: "1px solid #21262d",
              borderRadius: 16,
              padding: "40px",
              maxWidth: "400px",
              width: "90%",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
            }}
          >
            {/* Loading Animation */}
            <div
              style={{
                width: "60px",
                height: "60px",
                margin: "0 auto 24px",
                background: "linear-gradient(135deg, #a78bfa 0%, #099268 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "pulse 2s infinite",
              }}
            >
              <Brain size={28} color="#fff" />
            </div>

            {/* Generating Text */}
            <h3
              style={{
                fontSize: "20px",
                fontWeight: 600,
                margin: "0 0 12px",
                color: "var(--student-text)",
              }}
            >
              Generating Questions
            </h3>

            <p
              style={{
                fontSize: "14px",
                color: "var(--student-text-muted)",
                margin: "0 0 20px",
                lineHeight: "1.4",
              }}
            >
              Creating AI-powered questions for{" "}
              <strong style={{ color: "#a78bfa" }}>{generatingField}</strong>
            </p>

            {/* Progress Dots */}
            <div
              style={{ display: "flex", gap: "8px", justifyContent: "center" }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  background: "#a78bfa",
                  borderRadius: "50%",
                  animation: "bounce 1.4s infinite ease-in-out both",
                }}
              />
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  background: "#a78bfa",
                  borderRadius: "50%",
                  animation: "bounce 1.4s infinite ease-in-out both",
                  animationDelay: "0.16s",
                }}
              />
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  background: "#a78bfa",
                  borderRadius: "50%",
                  animation: "bounce 1.4s infinite ease-in-out both",
                  animationDelay: "0.32s",
                }}
              />
            </div>

            {/* CSS Animations */}
            <style>{`
              @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
              }

              @keyframes bounce {
                0%, 80%, 100% { transform: scale(0); }
                40% { transform: scale(1); }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
}
