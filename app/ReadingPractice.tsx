"use client";
import React, { useState, useRef } from "react";

const passages = [
  `Dyslexia is a learning difference that affects reading, writing, and spelling. With the right support, everyone can improve their reading skills.`,
  `Mathematics can be fun and challenging. Practice makes perfect, and everyone can learn to solve problems with patience and effort.`,
  `Writing is a powerful way to express ideas. With practice, spelling and grammar can improve, making communication easier.`,
  `Reading aloud helps build confidence and fluency. Take your time and enjoy the story as you read each word clearly.`
];

function getInitialWordStates(passage: string) {
  const words = passage.split(/(\s+)/);
  return words.map((w) => ({ word: w, correct: false, wrong: false, attempted: false }));
}

function calculateScore(wordStates: { word: string; correct: boolean; wrong: boolean; attempted: boolean }[]) {
  const attempted = wordStates.filter(w => w.word.trim().length > 0 && w.attempted);
  const correct = attempted.filter(w => w.correct).length;
  const wrong = attempted.filter(w => w.wrong).length;
  if (attempted.length === 0) return 0;
  return Math.round((correct / (correct + wrong)) * 100);
}

export default function ReadingPractice() {
  const [passageIdx, setPassageIdx] = useState(0);
  const [wordStates, setWordStates] = useState(getInitialWordStates(passages[0]));
  const [feedback, setFeedback] = useState("");
  const [listening, setListening] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);

  const currentPassage = passages[passageIdx];
  const words = currentPassage.split(/(\s+)/);

  // Start speech recognition
  const startListening = () => {
    setFeedback("");
    setScore(null);
    if (!('webkitSpeechRecognition' in window)) {
      setFeedback("Speech recognition not supported in this browser.");
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      checkTranscript(transcript);
    };
    recognition.onerror = (event: any) => {
      if (event.error === "network") {
        setFeedback(
          "Network error: Speech recognition requires an internet connection and may only work in Chrome on localhost or HTTPS. Please check your connection, use Chrome, and try again."
        );
      } else {
        setFeedback("Error: " + event.error);
      }
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    // Calculate score when stopped
    const newScore = calculateScore(wordStates);
    setScore(newScore);
    setFeedback(getScoreFeedback(newScore));
  };

  // Check transcript against passage, positionally
  const checkTranscript = (transcript: string) => {
    const spokenWords = transcript.trim().split(/\s+/).map(w => w.toLowerCase().replace(/[^a-zA-Z]/g, ""));
    let newStates = [...wordStates];
    let passageIdxLocal = 0;
    for (let i = 0; i < words.length; i++) {
      if (words[i].trim().length === 0) continue;
      const cleanWord = words[i].toLowerCase().replace(/[^a-zA-Z]/g, "");
      const spoken = spokenWords[passageIdxLocal];
      if (spoken !== undefined) {
        if (spoken === cleanWord) {
          newStates[i] = { ...newStates[i], correct: true, wrong: false, attempted: true };
        } else {
          newStates[i] = { ...newStates[i], correct: false, wrong: true, attempted: true };
        }
        passageIdxLocal++;
      } else {
        newStates[i] = { ...newStates[i], correct: false, wrong: false, attempted: false };
      }
    }
    setWordStates(newStates);
    // Live scoring
    const newScore = calculateScore(newStates);
    setScore(newScore);
    // Do NOT stop listening automatically; let user control it
    // Feedback can be updated live, but do not call stopListening here
  };

  // Reset for another try
  const reset = () => {
    let nextIdx = passageIdx;
    while (nextIdx === passageIdx && passages.length > 1) {
      nextIdx = Math.floor(Math.random() * passages.length);
    }
    setPassageIdx(nextIdx);
    setWordStates(getInitialWordStates(passages[nextIdx]));
    setFeedback("");
    setScore(null);
    stopListening();
  };

  function getScoreFeedback(score: number | null) {
    if (score === null) return "";
    if (score === 100) return "Excellent! You read every word correctly.";
    if (score >= 80) return "Very good! Just a few words missed.";
    if (score >= 50) return "Good effort! Keep practicing to improve your accuracy.";
    return "Keep practicing. Try reading slowly and clearly.";
  }

  // Find missed words for remediation (attempted and wrong)
  const missedWords = wordStates.filter(w => w.wrong && w.attempted && w.word.trim().length > 0).map(w => w.word);

  return (
    <div className="rp-bg">
      <div className="rp-card" role="main" aria-label="Reading Practice">
        <div className="rp-header">
          <h1 className="rp-title">Reading Practice</h1>
          <span className={`rp-mic ${listening ? "rp-mic-on" : ""}`} title={listening ? "Listening..." : "Not listening"}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={listening ? "#388e3c" : "#888"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
          </span>
        </div>
        <div className="rp-passage" aria-label="Passage to read">
          {wordStates.map((state, idx) => (
            <span
              key={idx}
              className={`rp-word${state.correct ? " rp-word-correct" : state.wrong ? " rp-word-wrong" : ""}`}
              aria-label={state.word.trim()}
            >
              {state.word}
            </span>
          ))}
        </div>
        <div className="rp-controls">
          <button onClick={listening ? stopListening : startListening} className="rp-btn rp-btn-main" aria-pressed={listening} aria-label={listening ? "Stop Listening" : "Start Reading Aloud"}>
            {listening ? <span>&#9632;</span> : <span>&#127908;</span>} {listening ? "Stop Listening" : "Start Reading"}
          </button>
          <button onClick={reset} className="rp-btn rp-btn-secondary" aria-label="Reset Practice">
            &#8635; Reset
          </button>
        </div>
        <div className="rp-score-area">
          {score !== null && (
            <div className="rp-score-badge" aria-label={`Score: ${score}%`}>
              <span>{score}%</span>
            </div>
          )}
          {feedback && <div className="rp-feedback">{feedback}</div>}
        </div>
        {score !== null && missedWords.length > 0 && (
          <div className="rp-remedy">
            <strong>Words to practice:</strong> {missedWords.join(", ")}
          </div>
        )}
        <div className="rp-tip">
          <small>Tip: Speak clearly and at a moderate pace. Words will highlight as you read them correctly, or red if incorrect.</small>
        </div>
      </div>
    </div>
  );
}
