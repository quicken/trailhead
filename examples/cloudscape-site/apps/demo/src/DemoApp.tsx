import React, { useState } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Input from "@cloudscape-design/components/input";
import FormField from "@cloudscape-design/components/form-field";
import "@cloudscape-design/global-styles/index.css";

export function DemoApp() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSuccess = () => {
    window.shell.feedback.success("Operation completed successfully!");
  };

  const handleError = () => {
    window.shell.feedback.error("Something went wrong!");
  };

  const handleWarning = () => {
    window.shell.feedback.warning("Please review your input");
  };

  const handleInfo = () => {
    window.shell.feedback.info("This is an informational message");
  };

  const handleConfirm = async () => {
    const result = await window.shell.feedback.confirm(
      "Are you sure you want to proceed?",
      "Confirm Action"
    );
    window.shell.feedback.info(`You clicked: ${result ? "Confirm" : "Cancel"}`);
  };

  const handleApiCall = async () => {
    setLoading(true);
    window.shell.feedback.busy("Loading data...");
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    window.shell.feedback.clear();
    setLoading(false);
    window.shell.feedback.success("Data loaded successfully!");
  };

  return (
    <SpaceBetween size="l">
      <Container
        header={
          <Header variant="h2" description="CloudScape Design System Demo">
            Shell API Demo
          </Header>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Your Name" description="Enter your name to test the form">
            <Input
              value={name}
              onChange={({ detail }) => setName(detail.value)}
              placeholder="Enter your name"
            />
          </FormField>

          <div>
            <strong>Current value:</strong> {name || "(empty)"}
          </div>
        </SpaceBetween>
      </Container>

      <Container
        header={
          <Header variant="h2" description="Test different notification types">
            Feedback System
          </Header>
        }
      >
        <SpaceBetween size="m" direction="horizontal">
          <Button onClick={handleSuccess}>Success</Button>
          <Button onClick={handleError}>Error</Button>
          <Button onClick={handleWarning}>Warning</Button>
          <Button onClick={handleInfo}>Info</Button>
        </SpaceBetween>
      </Container>

      <Container
        header={
          <Header variant="h2" description="Test dialog interactions">
            Dialogs
          </Header>
        }
      >
        <Button onClick={handleConfirm}>Show Confirm Dialog</Button>
      </Container>

      <Container
        header={
          <Header variant="h2" description="Test HTTP client with loading states">
            HTTP Client
          </Header>
        }
      >
        <Button onClick={handleApiCall} loading={loading}>
          Simulate API Call
        </Button>
      </Container>
    </SpaceBetween>
  );
}
