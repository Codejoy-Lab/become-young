"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Download, RotateCcw, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PhotoProcessingPage() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

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

  // 音乐自动播放功能
  useEffect(() => {
    const playMusic = async () => {
      if (audioRef.current) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.log("自动播放被浏览器阻止，需要用户交互后播放");
        }
      }
    };
    
    playMusic();
  }, []);

  // 音乐播放控制函数
  const toggleMusic = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.log("播放失败:", error);
        }
      }
    }
  };

  const handleFileSelection = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "格式不支持",
        description: "请上传图片格式的文件",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "图片大小不能超过10MB",
        variant: "destructive",
      });
      return;
    }

    setCurrentFile(file);
    setProcessedImage(null);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
    event.target.value = "";
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        if (!base64) {
          reject(new Error("无法读取图片"));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.readAsDataURL(file);
    });
  };

  const processImage = async () => {
    if (!currentFile) {
      toast({
        title: "请先上传图片",
        description: "需要先选择一张图片才能处理",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const base64Image = await fileToBase64(currentFile);

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

      if (!result?.success || !result?.imageUrl) {
        throw new Error(result?.error || "处理失败，请重试");
      }

      setProcessedImage(result.imageUrl);

      toast({
        title: "容光焕发",
        description: "今天的你依然活力",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "图片处理过程中出现错误，请重试";
      toast({
        title: "处理失败",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (processedImage) {
      const link = document.createElement("a");
      link.href = processedImage;
      link.download = "processed-image.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetApp = () => {
    setCurrentFile(null);
    setPreviewUrl("");
    setProcessedImage(null);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/nature-bg.jpg')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/10 to-primary/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="w-24" />
          </div>
          
          {/* 音乐播放控制按钮 */}
          <div className="fixed top-8 right-6 z-20">
            <button
              onClick={toggleMusic}
              className="w-8 h-8 bg-black/40 rounded-full flex items-center justify-center hover:bg-black/30 transition-all duration-300 shadow-lg"
            >
              <Music 
                className={`w-4 h-4 text-white/50 ${isPlaying ? 'animate-spin-slow' : ''}`} 
              />
            </button>
          </div>
        </div>

        {/* Main Title */}
        <div className="flex justify-center -mb-4 -mt-8">
          <img src="/tittle.png" className="w-96 ml-8" />
        </div>

        {/* Upload Area */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
          <Card className="w-full aspect-square bg-card/95 backdrop-blur-sm border-2 border-dashed border-border/50 rounded-3xl p-1 mb-8">
            <div
              className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors rounded-2xl"
              onClick={handleUploadClick}
            >
              {processedImage ? (
                <img
                  src={processedImage || "/placeholder.svg"}
                  alt="Processed"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : previewUrl ? (
                <img
                  src={previewUrl || "/placeholder.svg"}
                  alt="Uploaded"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <>
                  <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-accent-foreground" />
                  </div>
                  <p className="text-foreground font-medium text-lg mb-2">
                    点击上传照片
                  </p>
                  <p className="text-muted-foreground text-sm">
                    支持JPG、PNG格式
                  </p>
                </>
              )}
            </div>
          </Card>

          {/* Action Button */}
          <Button
            onClick={processedImage ? downloadImage : processImage}
            disabled={isProcessing}
            className="w-full h-14 bg-gradient-to-r from-[#19b0aa] to-[#19b0aa]/80 hover:from-[#19b0aa]/90 hover:to-[#19b0aa]/70 text-white font-medium text-lg rounded-full shadow-lg mb-4"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                处理中...
              </div>
            ) : processedImage ? (
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                下载图片
              </div>
            ) : (
              "变年轻"
            )}
          </Button>

          {/* Reset Button */}
          {(currentFile || processedImage) && (
            <button
              onClick={resetApp}
              className="flex items-center gap-2 text-card/80 hover:text-card transition-colors text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              重新生成
            </button>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        
        {/* 背景音乐 */}
        <audio
          ref={audioRef}
          loop
          preload="auto"
        >
          <source src="/时光不老.MP3" type="audio/mpeg" />
          您的浏览器不支持音频播放。
        </audio>
      </div>
    </div>
  );
}
