"use client";

import { useState } from "react";
import PhotoUpload from "./components/PhotoUpload";
// 导入错误提示组件
import ErrorMessage from "./components/ErrorMessage";

export default function Home() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");

  const handleFileSelect = (file: File | null) => {
    setCurrentFile(file);
    setError("");
  };

  const handleError = (message: string) => {
    setError(message);
  };

  const clearError = () => {
    setError("");
  };

  return (
    <div className="container">
      <header className="header">
        <h1>照片变年轻</h1>
        <p>AI智能修图，让时光倒流</p>
      </header>

      <main className="main-content">
        <PhotoUpload
          currentFile={currentFile}
          onFileSelect={handleFileSelect}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
          onError={handleError}
          clearError={clearError}
        />

        <ErrorMessage message={error} onClose={clearError} />
      </main>

      <footer className="footer">
        <p>
          Powered by{" "}
          <a
            href="https://www.volcengine.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            cmochat.com
          </a>
        </p>
      </footer>
    </div>
  );
}
