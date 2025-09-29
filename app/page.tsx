"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, Download, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function PhotoProcessingPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === "image/jpeg" || file.type === "image/png") {
        const reader = new FileReader()
        reader.onload = (e) => {
          setUploadedImage(e.target?.result as string)
          setProcessedImage(null) // Reset processed image when new image is uploaded
        }
        reader.readAsDataURL(file)
      } else {
        toast({
          title: "格式不支持",
          description: "请上传JPG或PNG格式的图片",
          variant: "destructive",
        })
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const processImage = async () => {
    if (!uploadedImage) {
      toast({
        title: "请先上传图片",
        description: "需要先选择一张图片才能处理",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      // Simulate API call to JiMeng API
      // In real implementation, you would call the actual API here
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // For demo purposes, we'll use the same image
      // In real implementation, this would be the processed image from the API
      setProcessedImage(uploadedImage)

      toast({
        title: "处理完成",
        description: "图片已成功处理",
      })
    } catch (error) {
      toast({
        title: "处理失败",
        description: "图片处理过程中出现错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadImage = () => {
    if (processedImage) {
      const link = document.createElement("a")
      link.href = processedImage
      link.download = "processed-image.jpg"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const resetApp = () => {
    setUploadedImage(null)
    setProcessedImage(null)
    setIsProcessing(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

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
            <div className="w-8 h-8 bg-card rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-primary rounded-sm" />
            </div>
            <span className="text-card font-medium text-sm">PKUFI</span>
            <span className="text-card/80 text-xs">北大方正人寿</span>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-card mb-2 text-balance">时光共赴</h1>
          <h2 className="text-4xl md:text-5xl font-bold text-card mb-4 text-balance">
            为<span className="text-accent">爱</span>守护
          </h2>
        </div>

        {/* Upload Area */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
          <Card className="w-full aspect-square bg-card/95 backdrop-blur-sm border-2 border-dashed border-border/50 rounded-3xl p-8 mb-8">
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
              ) : uploadedImage ? (
                <img
                  src={uploadedImage || "/placeholder.svg"}
                  alt="Uploaded"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <>
                  <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-accent-foreground" />
                  </div>
                  <p className="text-foreground font-medium text-lg mb-2">点击上传照片</p>
                  <p className="text-muted-foreground text-sm">支持JPG、PNG格式</p>
                </>
              )}
            </div>
          </Card>

          {/* Action Button */}
          <Button
            onClick={processedImage ? downloadImage : processImage}
            disabled={isProcessing}
            className="w-full h-14 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-accent-foreground font-medium text-lg rounded-full shadow-lg mb-4"
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
          {(uploadedImage || processedImage) && (
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
          accept="image/jpeg,image/png"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>
    </div>
  )
}
