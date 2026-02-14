import React, { useState } from "react";
import { TestCounter } from "./TestCounter";

/**
 * Demo application showcasing shell API features
 */
export const DemoApp: React.FC = () => {
  const [result, setResult] = useState<string>("");

  // Feedback System Demos
  const handleBusy = () => {
    window.shell.feedback.busy("Processing...");
    setTimeout(() => window.shell.feedback.clear(), 2000);
  };

  const handleSuccess = () => {
    window.shell.feedback.success("Operation successful!");
  };

  const handleError = () => {
    window.shell.feedback.error("Something went wrong!");
  };

  const handleWarning = () => {
    window.shell.feedback.warning("Please be careful!");
  };

  const handleInfo = () => {
    window.shell.feedback.info("Here's some information");
  };

  const handleConfirm = async () => {
    const confirmed = await window.shell.feedback.confirm("Do you want to proceed with this action?", "Confirm Action");
    setResult(`Confirm result: ${confirmed}`);
  };

  const handleYesNo = async () => {
    const answer = await window.shell.feedback.yesNo("Do you agree with the terms?", "Agreement");
    setResult(`Yes/No result: ${answer}`);
  };

  const handleYesNoCancel = async () => {
    const answer = await window.shell.feedback.yesNoCancel("Save changes before closing?", "Unsaved Changes");
    setResult(`Yes/No/Cancel result: ${answer}`);
  };

  const handleCustom = async () => {
    const answer = await window.shell.feedback.custom("Choose your preferred option:", "Custom Dialog", [
      { label: "Option A", value: "a", variant: "primary" },
      { label: "Option B", value: "b", variant: "secondary" },
      { label: "Option C", value: "c", variant: "default" },
    ]);
    setResult(`Custom result: ${answer}`);
  };

  // HTTP Client Demos
  const handleHttpGet = async () => {
    const result = await window.shell.http.get("https://jsonplaceholder.typicode.com/users/1", {
      busyMessage: "Loading user...",
      showSuccess: true,
      successMessage: "User loaded successfully!",
    });

    if (result.success) {
      setResult(`HTTP GET success: ${JSON.stringify(result.data, null, 2)}`);
    } else {
      setResult(`HTTP GET error: ${result.error.message}`);
    }
  };

  const handleHttpError = async () => {
    const result = await window.shell.http.get("https://jsonplaceholder.typicode.com/invalid", {
      busyMessage: "Loading...",
    });

    if (result.success) {
      setResult(`Unexpected success`);
    } else {
      setResult(`HTTP error handled: ${result.error.message}`);
    }
  };

  const handleSilentRequest = async () => {
    const result = await window.shell.http.get("https://jsonplaceholder.typicode.com/users/1", {
      noFeedback: true,
    });

    if (result.success) {
      setResult(`Silent request success (no feedback shown)`);
    }
  };

  // Navigation Demos
  const handleNavigate = () => {
    window.shell.navigation.navigate("/demo");
    setResult("Navigated to /demo");
  };

  const handleGetPath = () => {
    const path = window.shell.navigation.getCurrentPath();
    setResult(`Current path: ${path}`);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "2rem", color: "#1e293b" }}>Shell API Demo</h1>

      {/* React Test Component */}
      <TestCounter />

      {/* Feedback System */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Feedback System</h2>
        <p style={descStyle}>Imperative API for user feedback - dialogs, toasts, and busy overlays</p>

        <div style={groupStyle}>
          <h3 style={subHeadingStyle}>Toasts (Non-blocking)</h3>
          <div style={buttonGroupStyle}>
            <button onClick={handleSuccess} style={buttonStyle}>
              Success Toast
            </button>
            <button onClick={handleError} style={buttonStyle}>
              Error Toast
            </button>
            <button onClick={handleWarning} style={buttonStyle}>
              Warning Toast
            </button>
            <button onClick={handleInfo} style={buttonStyle}>
              Info Toast
            </button>
          </div>
        </div>

        <div style={groupStyle}>
          <h3 style={subHeadingStyle}>Busy Overlay (Blocking)</h3>
          <div style={buttonGroupStyle}>
            <button onClick={handleBusy} style={buttonStyle}>
              Show Busy (2s)
            </button>
          </div>
        </div>

        <div style={groupStyle}>
          <h3 style={subHeadingStyle}>Dialogs (Blocking)</h3>
          <div style={buttonGroupStyle}>
            <button onClick={handleConfirm} style={buttonStyle}>
              Confirm Dialog
            </button>
            <button onClick={handleYesNo} style={buttonStyle}>
              Yes/No Dialog
            </button>
            <button onClick={handleYesNoCancel} style={buttonStyle}>
              Yes/No/Cancel
            </button>
            <button onClick={handleCustom} style={buttonStyle}>
              Custom Dialog
            </button>
          </div>
        </div>
      </section>

      {/* HTTP Client */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>HTTP Client</h2>
        <p style={descStyle}>HTTP client with automatic feedback orchestration and Result type</p>

        <div style={buttonGroupStyle}>
          <button onClick={handleHttpGet} style={buttonStyle}>
            GET Request (Success)
          </button>
          <button onClick={handleHttpError} style={buttonStyle}>
            GET Request (Error)
          </button>
          <button onClick={handleSilentRequest} style={buttonStyle}>
            Silent Request
          </button>
        </div>
      </section>

      {/* Navigation */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Navigation</h2>
        <p style={descStyle}>Client-side routing and navigation</p>

        <div style={buttonGroupStyle}>
          <button onClick={handleNavigate} style={buttonStyle}>
            Navigate to /demo
          </button>
          <button onClick={handleGetPath} style={buttonStyle}>
            Get Current Path
          </button>
        </div>
      </section>

      {/* Result Display */}
      {result && (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Result</h2>
          <pre style={resultStyle}>{result}</pre>
          <button onClick={() => setResult("")} style={buttonStyle}>
            Clear Result
          </button>
        </section>
      )}
    </div>
  );
};

// Styles
const sectionStyle: React.CSSProperties = {
  marginBottom: "2rem",
  padding: "1.5rem",
  backgroundColor: "white",
  borderRadius: "8px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const headingStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: "600",
  color: "#1e293b",
  marginBottom: "0.5rem",
};

const subHeadingStyle: React.CSSProperties = {
  fontSize: "1.125rem",
  fontWeight: "500",
  color: "#475569",
  marginBottom: "0.75rem",
};

const descStyle: React.CSSProperties = {
  color: "#64748b",
  marginBottom: "1rem",
};

const groupStyle: React.CSSProperties = {
  marginBottom: "1.5rem",
};

const buttonGroupStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.75rem",
};

const buttonStyle: React.CSSProperties = {
  padding: "0.5rem 1rem",
  backgroundColor: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: "6px",
  fontSize: "0.875rem",
  fontWeight: "500",
  cursor: "pointer",
  transition: "background-color 0.2s",
};

const resultStyle: React.CSSProperties = {
  padding: "1rem",
  backgroundColor: "#f8fafc",
  borderRadius: "6px",
  fontSize: "0.875rem",
  color: "#1e293b",
  overflow: "auto",
  maxHeight: "300px",
  marginBottom: "1rem",
};
