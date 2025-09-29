"use client";

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";

interface PhotoUploadProps {
  currentFile: File | null;
  onFileSelect: (file: File | null) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  onError: (message: string) => void;
  clearError: () => void;
}

export default function PhotoUpload({
  currentFile,
  onFileSelect,
  isProcessing,
  setIsProcessing,
  onError,
  clearError,
}: PhotoUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string>("");
  const [showDownloadBtn, setShowDownloadBtn] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentFile) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(currentFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [currentFile]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      onError("请选择图片文件");
      return;
    }

    // 验证文件大小 (限制为10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError("图片文件不能超过10MB");
      return;
    }

    onFileSelect(file);
    clearError();
    setProcessedImageUrl("");
    setShowDownloadBtn(false);
  };

  const handleUploadAreaClick = () => {
    if (!currentFile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleReupload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }

    onFileSelect(null);
    setProcessedImageUrl("");
    setShowDownloadBtn(false);
    clearError();
  };

  const handleProcessImage = async () => {
    if (!currentFile) {
      onError("请先上传图片");
      return;
    }

    setIsProcessing(true);
    clearError();

    try {
      // 将文件转换为base64
      const base64Image = await fileToBase64(currentFile);

      // 调用API
      const response = await fetch("/api/process-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error || `处理失败: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.imageUrl) {
        setProcessedImageUrl(result.imageUrl);
        setShowDownloadBtn(true);
      } else {
        throw new Error(result.error || "处理失败");
      }
    } catch (error) {
      console.error("处理失败:", error);
      onError(error instanceof Error ? error.message : "处理失败，请重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDownload = () => {
    if (processedImageUrl) {
      const link = document.createElement("a");
      link.href = processedImageUrl;
      link.download = `processed_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const displayImageUrl = processedImageUrl || previewUrl;

  return (
    <section className="upload-section">
      {displayImageUrl ? (
        <div className="upload-preview">
          <img
            src={displayImageUrl}
            alt="上传的图片"
            className="uploaded-image"
          />
        </div>
      ) : (
        <div
          className={`upload-area ${currentFile ? "has-image" : ""} ${
            dragOver ? "dragover" : ""
          } ${isProcessing ? "loading" : ""}`}
          onClick={handleUploadAreaClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="upload-content">
            <svg
              className="upload-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <div className="upload-text">
              <h3>点击或拖拽上传照片</h3>
              <p>
                支持 JPG、PNG 格式
                <br />
                文件大小不超过 10MB
              </p>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <div className={`upload-actions ${currentFile ? "show" : ""}`}>
        {!showDownloadBtn ? (
          <button
            className="btn btn-primary"
            onClick={handleProcessImage}
            disabled={isProcessing || !currentFile}
          >
            {isProcessing ? "处理中..." : "开始变年轻"}
          </button>
        ) : (
          <button className="btn download-btn" onClick={handleDownload}>
            下载照片
          </button>
        )}

        <div style={{ margin: "auto" }} onClick={handleReupload}>
          重新上传
        </div>
      </div>
    </section>
  );
}
