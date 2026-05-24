import React, { useState } from "react";

/**
 * Simple counter component to test React functionality
 */
export const TestCounter: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: "20px", border: "2px solid #007bff", borderRadius: "8px", margin: "20px 0" }}>
      <h3>React Test Component</h3>
      <p>Count: {count}</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{ padding: "8px 16px", marginRight: "8px", cursor: "pointer" }}
      >
        Increment
      </button>
      <button 
        onClick={() => setCount(0)}
        style={{ padding: "8px 16px", cursor: "pointer" }}
      >
        Reset
      </button>
    </div>
  );
};
