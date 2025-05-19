"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Camera,
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  Play,
  Square,
  Download,
  Info,
  AlertTriangle,
  Bell,
  Sliders,
} from "lucide-react"
import { useWebcam } from "@/hooks/use-webcam"
import { drawDetectionOverlay } from "@/utils/draw-detection"
import { apiService, type WebcamAnalysisResult } from "@/lib/api-service"
import { useToast } from "@/hooks/use-toast"
import { BackendStatus } from "@/components/backend-status"

export default function WebcamDetection() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [sensitivity, setSensitivity] = useState(75)
  const [showOverlay, setShowOverlay] = useState(true)
  const [activeTab, setActiveTab] = useState("live")
  const [capturedFrames, setCapturedFrames] = useState<string[]>([])
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [analysisResult, setAnalysisResult] = useState<WebcamAnalysisResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [detectionCount, setDetectionCount] = useState(0)
  const [processingTime, setProcessingTime] = useState(0)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()

  const { videoRef, canvasRef, isStreaming, error, startWebcam, stopWebcam, captureFrame } = useWebcam({
    width: 1280,
    height: 720,
  })

  useEffect(() => {
    const initWebcam = async () => {
      try {
        await startWebcam()
      } catch (err) {
        toast({
          title: "Webcam Error",
          description: "Could not access webcam. Please ensure you have granted permission.",
          variant: "destructive",
        })
      }
    }
    initWebcam()
    return () => stopWebcam()
  }, [])

  useEffect(() => {
    if (analysisResult && showOverlay && overlayCanvasRef.current && videoRef.current) {
      const canvas = overlayCanvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext("2d")
      if (ctx) drawDetectionOverlay(ctx, analysisResult.areas, canvas.width, canvas.height)
    }
  }, [analysisResult, showOverlay])

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    if (isAnalyzing && isStreaming) {
      intervalId = setInterval(async () => {
        if (isProcessing) return
        const frame = captureFrame()
        if (frame) {
          setIsProcessing(true)
          try {
            const result = await apiService.analyzeWebcamFrame(frame, sessionId, sensitivity)
            setSessionId(result.session_id)
            setAnalysisResult(result)
            setDetectionCount(result.frames_analyzed)
            setProcessingTime(result.processing_time * 1000)
            setCapturedFrames((prev) => [frame, ...prev].slice(0, 5))
          } catch (error) {
            toast({
              title: "Analysis Error",
              description: "Failed to analyze webcam frame. Please try again.",
              variant: "destructive",
            })
          } finally {
            setIsProcessing(false)
          }
        }
      }, 1000)
    }
    return () => intervalId && clearInterval(intervalId)
  }, [isAnalyzing, isStreaming, isProcessing, sessionId, sensitivity])

  const toggleAnalysis = () => {
    if (!isAnalyzing) {
      setIsAnalyzing(true)
      toast({ title: "Analysis Started", description: "Analyzing webcam feed for deepfakes..." })
    } else {
      setIsAnalyzing(false)
      toast({ title: "Analysis Stopped", description: `Analyzed ${detectionCount} frames` })
    }
  }

  const downloadFrame = () => {
    if (capturedFrames.length > 0) {
      const link = document.createElement("a")
      link.href = capturedFrames[0]
      link.download = `satya-ai-detection-${new Date().toISOString()}.jpg`
      link.click()
    }
  }

  const applySettings = () => {
    toast({
      title: "Settings Applied",
      description: `Detection sensitivity set to ${sensitivity}%`,
    })
  }

  const handleRetryWebcam = async () => {
    try {
      await startWebcam()
      toast({ title: "Webcam Connected", description: "Successfully connected to webcam." })
    } catch (err) {
      toast({
        title: "Webcam Error",
        description: "Still unable to access webcam. Please check your browser settings.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen flex flex-col space-background">
      <header className="border-b border-slate-800 bg-black/50 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-cyan-500 flex items-center justify-center text-black font-bold text-xl">
              S
            </div>
            <div>
              <span className="text-xl font-bold text-white">
                Satya<span className="text-cyan-500">AI</span>
              </span>
              <p className="text-xs text-slate-400">Synthetic Authentication Technology for Your Analysis</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-slate-300 hover:text-cyan-400 flex items-center gap-1">Home</Link>
            <Link href="/scan" className="text-slate-300 hover:text-cyan-400 flex items-center gap-1">Scan</Link>
            <Link href="/webcam-detection" className="text-white hover:text-cyan-400 flex items-center gap-1 px-3 py-2 rounded-md bg-slate-800/50">Webcam Detection</Link>
            <Link href="/history" className="text-slate-300 hover:text-cyan-400 flex items-center gap-1">History</Link>
            <Link href="/settings" className="text-slate-300 hover:text-cyan-400 flex items-center gap-1">Settings</Link>
          </nav>
          <div className="flex items-center gap-3">
            <BackendStatus />
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="h-8 w-8 rounded-full bg-cyan-500 flex items-center justify-center text-black font-bold">U</div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-1">
        <div className="mb-6 flex items-center gap-2">
          <Link href="/" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Live Deepfake Detection</h1>
          <Badge variant="outline" className="ml-2 bg-cyan-950/50 text-cyan-400 border-cyan-700">
            Beta
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm shadow-xl">
              <CardHeader className="border-b border-slate-800 bg-slate-900/50">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Webcam Feed</CardTitle>
                  <div className="flex items-center gap-2">
                    {isStreaming ? (
                      <Badge className="bg-green-600/20 text-green-400 hover:bg-green-600/30 border-green-800">
                        <div className="h-2 w-2 rounded-full bg-green-400 mr-1 animate-pulse"></div>
                        Live
                      </Badge>
                    ) : (
                      <Badge className="bg-red-600/20 text-red-400 hover:bg-red-600/30 border-red-800">
                        <div className="h-2 w-2 rounded-full bg-red-400 mr-1"></div>
                        Offline
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 relative">
                {error ? (
                  <div className="flex flex-col items-center justify-center p-8 h-96 bg-slate-950/50">
                    <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Webcam Access Error</h3>
                    <p className="text-slate-400 text-center mb-4 max-w-md">
                      Unable to access your webcam. Please ensure you have granted camera permissions
                      to this application in your browser settings.
                    </p>
                    <Button onClick={handleRetryWebcam} className="bg-cyan-600 hover:bg-cyan-700">
                      Retry Connection
                    </Button>
                  </div>
                ) : (
                  <div className="relative w-full aspect-video bg-black">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    ></video>
                    <canvas
                      ref={canvasRef}
                      className="hidden"
                      width="1280"
                      height="720"
                    ></canvas>
                    {showOverlay && (
                      <canvas
                        ref={overlayCanvasRef}
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                      ></canvas>
                    )}
                    <div className="absolute top-4 left-4 p-2 rounded-md bg-black/70 backdrop-blur-sm flex items-center gap-2">
                      {isAnalyzing ? (
                        <div className="animate-pulse">
                          <ShieldCheck className="h-5 w-5 text-cyan-500" />
                        </div>
                      ) : (
                        <Camera className="h-5 w-5 text-slate-400" />
                      )}
                      <span className="text-xs font-medium text-white">
                        {isAnalyzing ? "Analyzing Feed" : "Webcam Ready"}
                      </span>
                    </div>
                    {analysisResult && isAnalyzing && (
                      <div className="absolute bottom-4 right-4 p-3 rounded-md bg-black/70 backdrop-blur-sm">
                        <div className="mb-2 flex justify-between items-center gap-4">
                          <span className="text-xs text-slate-400">Detection Confidence</span>
                          <Badge
                            className={
                              analysisResult.score > 0.7
                                ? "bg-red-600/20 text-red-400 border-red-800"
                                : analysisResult.score > 0.3
                                ? "bg-yellow-600/20 text-yellow-400 border-yellow-800"
                                : "bg-green-600/20 text-green-400 border-green-800"
                            }
                          >
                            {analysisResult.score > 0.7
                              ? "High"
                              : analysisResult.score > 0.3
                              ? "Medium"
                              : "Low"}
                          </Badge>
                        </div>
                        <Progress
                          value={analysisResult.score * 100}
                          className="h-2 mb-1"
                          indicatorClassName={
                            analysisResult.score > 0.7
                              ? "bg-red-500"
                              : analysisResult.score > 0.3
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-4 flex flex-wrap gap-3 justify-between items-center">
              <div className="flex gap-2">
                <Button
                  onClick={toggleAnalysis}
                  className={
                    isAnalyzing
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-cyan-600 hover:bg-cyan-700"
                  }
                  disabled={!isStreaming || error}
                >
                  {isAnalyzing ? (
                    <>
                      <Square className="h-4 w-4 mr-2" /> Stop Analysis
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" /> Start Analysis
                    </>
                  )}
                </Button>
                <Button
                  onClick={downloadFrame}
                  variant="outline"
                  className="border-slate-700 text-slate-200 hover:bg-slate-800"
                  disabled={capturedFrames.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" /> Save Frame
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  <Switch
                    id="detection-overlay"
                    checked={showOverlay}
                    onCheckedChange={setShowOverlay}
                  />
                  <Label htmlFor="detection-overlay" className="ml-2 text-sm text-slate-300">
                    Show Detection Overlay
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm shadow-xl">
              <CardHeader className="border-b border-slate-800 bg-slate-900/50">
                <CardTitle className="text-white">Live Detection Results</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {analysisResult ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-400">Detection Status</span>
                      <Badge
                        className={
                          analysisResult.is_synthetic
                            ? "bg-red-600/20 text-red-400 border-red-800"
                            : "bg-green-600/20 text-green-400 border-green-800"
                        }
                      >
                        {analysisResult.is_synthetic ? "Synthetic Detected" : "Authentic"}
                      </Badge>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm text-slate-400 mb-1">
                        <span>Confidence Score</span>
                        <span>{Math.round(analysisResult.score * 100)}%</span>
                      </div>
                      <Progress
                        value={analysisResult.score * 100}
                        className="h-2"
                        indicatorClassName={
                          analysisResult.score > 0.7
                            ? "bg-red-500"
                            : analysisResult.score > 0.3
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }
                      />
                    </div>

                    <div className="pt-2 grid grid-cols-2 gap-2 text-sm">
                      <div className="p-3 rounded-md bg-slate-800/50">
                        <div className="text-slate-400 mb-1">Frames Analyzed</div>
                        <div className="text-white font-medium">{detectionCount}</div>
                      </div>
                      <div className="p-3 rounded-md bg-slate-800/50">
                        <div className="text-slate-400 mb-1">Processing Time</div>
                        <div className="text-white font-medium">{processingTime.toFixed(0)} ms</div>
                      </div>
                    </div>

                    {analysisResult.is_synthetic && (
                      <div className="flex items-start gap-2 p-3 rounded-md bg-red-950/30 border border-red-900/50 mt-4">
                        <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-red-400 font-medium mb-1">Synthetic Content Detected</p>
                          <p className="text-red-300/80 text-sm">
                            The analysis indicates this may be a deepfake or synthetic content. Verify with
                            additional methods if important.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Info className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-slate-400 font-medium mb-1">No Analysis Data</h3>
                    <p className="text-slate-500 text-sm">
                      Start the analysis to see real-time deepfake detection results.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm shadow-xl">
              <CardHeader className="border-b border-slate-800 bg-slate-900/50 flex flex-row items-center justify-between">
                <CardTitle className="text-white">Detection Settings</CardTitle>
                <Sliders className="h-5 w-5 text-slate-400" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label htmlFor="sensitivity" className="text-sm text-slate-300">
                        Detection Sensitivity
                      </Label>
                      <span className="text-xs text-slate-400">{sensitivity}%</span>
                    </div>
                    <input
                      id="sensitivity"
                      type="range"
                      min="1"
                      max="100"
                      value={sensitivity}
                      onChange={(e) => setSensitivity(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-slate-500">Less Strict</span>
                      <span className="text-xs text-slate-500">More Strict</span>
                    </div>
                  </div>

                  <Button onClick={applySettings} className="w-full bg-cyan-600 hover:bg-cyan-700">
                    Apply Settings
                  </Button>

                  <div className="text-xs text-slate-500 p-3 rounded-md bg-slate-800/50">
                    <p className="flex items-center gap-1 mb-2">
                      <Info className="h-3 w-3" /> Higher sensitivity may increase false positives
                    </p>
                    <p>
                      Adjust the sensitivity based on your environment. Lower values are more lenient,
                      while higher values enforce stricter detection.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="live" className="data-[state=active]:bg-cyan-600">
                Captured Frames
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-cyan-600">
                Detection History
              </TabsTrigger>
              <TabsTrigger value="help" className="data-[state=active]:bg-cyan-600">
                Usage Guide
              </TabsTrigger>
            </TabsList>
            <TabsContent value="live" className="mt-4">
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm shadow-xl">
                <CardHeader className="border-b border-slate-800 bg-slate-900/50">
                  <CardTitle className="text-white">Recently Captured Frames</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {capturedFrames.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {capturedFrames.map((frame, index) => (
                        <div key={index} className="relative">
                          <img
                            src={frame}
                            alt={`Captured frame ${index + 1}`}
                            className="w-full aspect-video object-cover rounded-md border border-slate-700"
                          />
                          <Badge
                            className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm"
                            variant="outline"
                          >
                            Frame {index + 1}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Camera className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-slate-400 font-medium mb-1">No Frames Captured</h3>
                      <p className="text-slate-500 text-sm">
                        Start the analysis to begin capturing frames from your webcam.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm shadow-xl">
                <CardHeader className="border-b border-slate-800 bg-slate-900/50">
                  <CardTitle className="text-white">Session History</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="text-center py-12">
                    <Info className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-slate-400 font-medium mb-1">Session Data Available</h3>
                    <p className="text-slate-500 text-sm mb-4">
                      Your detection history for this session will appear here.
                    </p>
                    <Button variant="outline" className="border-slate-700 text-slate-300">
                      View Full History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="help" className="mt-4">
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm shadow-xl">
                <CardHeader className="border-b border-slate-800 bg-slate-900/50">
                  <CardTitle className="text-white">How to Use Webcam Detection</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-4 bg-slate-800/50 rounded-lg">
                        <div className="h-10 w-10 rounded-full bg-cyan-900/50 flex items-center justify-center mb-3">
                          <Camera className="h-5 w-5 text-cyan-400" />
                        </div>
                        <h3 className="text-white font-medium mb-2">1. Connect Webcam</h3>
                        <p className="text-slate-400 text-sm">
                          Grant camera permissions when prompted. The webcam feed will appear in the main
                          viewing area.
                        </p>
                      </div>
                      <div className="p-4 bg-slate-800/50 rounded-lg">
                        <div className="h-10 w-10 rounded-full bg-cyan-900/50 flex items-center justify-center mb-3">
                          <Play className="h-5 w-5 text-cyan-400" />
                        </div>
                        <h3 className="text-white font-medium mb-2">2. Start Analysis</h3>
                        <p className="text-slate-400 text-sm">
                          Click the "Start Analysis" button to begin detecting synthetic content in your webcam
                          feed.
                        </p>
                      </div>
                      <div className="p-4 bg-slate-800/50 rounded-lg">
                        <div className="h-10 w-10 rounded-full bg-cyan-900/50 flex items-center justify-center mb-3">
                          <ShieldCheck className="h-5 w-5 text-cyan-400" />
                        </div>
                        <h3 className="text-white font-medium mb-2">3. Review Results</h3>
                        <p className="text-slate-400 text-sm">
                          Real-time detection results will appear in the panel to the right. Adjust sensitivity
                          as needed.
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-800/30 rounded-lg mt-6">
                      <p className="text-slate-300 mb-2">
                        <strong>Note:</strong> This detection technology analyzes visual artifacts and patterns
                        that may indicate synthetic or manipulated content.
                      </p>
                      <p className="text-slate-400 text-sm">
                        For the most accurate results, ensure good lighting conditions and minimal background
                        movement. The detection is still in beta and may not catch all types of synthetic
                        content.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-black/50 backdrop-blur-md py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            © 2025 SatyaAI. All rights reserved.
          </div>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-xs text-slate-500 hover:text-cyan-400">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-xs text-slate-500 hover:text-cyan-400">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-xs text-slate-500 hover:text-cyan-400">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
