import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImageIcon, ArrowUp } from 'lucide-react'

export function CursorAnimation() {
  const [inputValue, setInputValue] = useState('')
  const shareText = '/share'
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [showResponse, setShowResponse] = useState(false)
  const responseText = 'Your chat is now available at https://getoscar.ai/chat/demo-chat.'
  const [responseIndex, setResponseIndex] = useState(0)
  const [streamingComplete, setStreamingComplete] = useState(false)

  useEffect(() => {
    if (currentIndex < shareText.length) {
      const timer = setTimeout(() => {
        setInputValue(shareText.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
      }, 100)
      return () => clearTimeout(timer)
    } else if (currentIndex === shareText.length && !isSubmitting) {
      const timer = setTimeout(() => {
        setIsSubmitting(true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, shareText, isSubmitting])

  useEffect(() => {
    if (isSubmitting) {
      const timer = setTimeout(() => {
        setShowMessage(true)
        setInputValue('')
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [isSubmitting])

  useEffect(() => {
    if (showMessage && !showResponse) {
      const timer = setTimeout(() => {
        setShowResponse(true)
        setResponseIndex(0)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [showMessage, showResponse])

  useEffect(() => {
    if (showResponse && responseIndex < responseText.length) {
      const timer = setTimeout(() => {
        setResponseIndex(responseIndex + 1)
      }, 25)
      return () => clearTimeout(timer)
    } else if (showResponse && responseIndex === responseText.length && !streamingComplete) {
      setStreamingComplete(true)
    }
  }, [showResponse, responseIndex, responseText, streamingComplete])

  useEffect(() => {
    if (showResponse) {
      const timer = setTimeout(() => {
        setShowMessage(false)
        setShowResponse(false)
        setIsSubmitting(false)
        setCurrentIndex(0)
        setResponseIndex(0)
        setStreamingComplete(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [showResponse])

  return (
    <section className="container mx-auto h-[500px] overflow-hidden">
      <div className="h-full bg-gray-100 rounded-lg border shadow-lg mx-auto flex flex-col overflow-hidden">
        {/* Mac-style header */}
        <div className="flex items-center px-3 py-2 bg-gray-50 rounded-t-lg border-b">
          <div className="flex space-x-1.5">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
          </div>
        </div>
        {/* Demo content */}
        <div className="flex-1 flex bg-white rounded-b-lg">
          <div className="flex-1 p-6 hidden md:block">
            {/* Main content area */}
          </div>
          <aside className="h-full w-full md:w-84 p-4 md:border-l overflow-hidden" style={{ backgroundColor: 'rgb(248, 248, 248)' }}>
            <div className="h-full flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-start justify-center">
                <div className="w-full max-w-3xl flex flex-col items-start space-y-2">
                  <AnimatePresence>
                    {showMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="w-full"
                        style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '6px 8px'
                        }}
                      >
                        <div style={{
                          fontSize: '12px',
                          lineHeight: '1.5',
                          fontFamily: 'inherit',
                          color: '#374151'
                        }}>
                          /share
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="w-full">
                    <AnimatePresence mode="wait">
                      {showMessage && !showResponse && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          style={{ padding: '0px 8px' }}
                        >
                          <motion.span
                            className="text-gray-400 font-mono text-sm"
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            ...
                          </motion.span>
                        </motion.div>
                      )}

                      {showResponse && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          style={{
                            padding: '8px',
                            fontSize: '12px',
                            lineHeight: '1.5',
                            fontFamily: 'inherit'
                          }}
                        >
                          <div style={{ color: '#6b7280' }}>
                            {streamingComplete ? (
                              <>
                                Your chat is now available at{' '}
                                <a
                                  href="https://getoscar.ai/chat/demo-chat"
                                  style={{
                                    color: '#2563eb',
                                    textDecoration: 'underline',
                                    pointerEvents: 'auto'
                                  }}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  https://getoscar.ai/chat/demo-chat.
                                </a>
                              </>
                            ) : (
                              <>
                                {responseText.slice(0, responseIndex)}
                                {responseIndex < responseText.length && (
                                  <motion.span
                                    animate={{ opacity: [1, 0] }}
                                    transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                                    className="inline-block w-0.5 h-3 bg-gray-700 ml-0.5"
                                  />
                                )}
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-full max-w-3xl">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                    style={{
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px'
                    }}
                  >
                    <div className="absolute inset-0 z-10" />

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1 px-1">
                        <div
                          className="flex items-center justify-center"
                          style={{
                            padding: '2px',
                            height: '18px',
                            width: 'auto',
                            borderRadius: '4px',
                            border: '1px solid #e5e5e5',
                            fontSize: '11px'
                          }}
                        >
                          <span style={{ fontSize: '11px', color: '#9ca3af', paddingLeft: '1px', opacity: 0.5 }}>@</span>
                          <span style={{ color: '#9ca3af', fontSize: '11px', margin: '0 4px' }}>Add Context</span>
                        </div>
                      </div>

                      <div className="relative" style={{ minHeight: '18px', maxHeight: '240px' }}>
                        <div style={{
                          fontSize: '12px',
                          lineHeight: '1.6',
                          color: '#374151',
                          fontFamily: 'inherit',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {inputValue}
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                            className="inline-block w-0.5 h-3 bg-gray-700 ml-0.5"
                          />
                        </div>
                        {!inputValue && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            fontSize: '12px',
                            color: '#9ca3af',
                            opacity: 0.5,
                            pointerEvents: 'none',
                            lineHeight: '1.5'
                          }}>
                            Plan, search, build anything
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between" style={{ height: '19px' }}>
                        <div className="flex items-center gap-1">
                          <div
                            className="flex items-center gap-1"
                            style={{
                              fontSize: '11px',
                              padding: '2.5px 4px',
                              borderRadius: '23px',
                              gap: '4px',
                              lineHeight: '12px'
                            }}
                          >
                            <span style={{ fontSize: '11px', opacity: 0.5 }}>∞</span>
                            <span style={{ opacity: 0.8, fontSize: '11px' }}>Agent</span>
                            <span style={{ opacity: 0.5, fontSize: '0.8em' }}>⌘I</span>
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              padding: '2.5px 6px',
                              borderRadius: '23px',
                              lineHeight: '12px'
                            }}
                          >
                            <span style={{ fontSize: '11px', opacity: 0.8 }}>Auto</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div style={{ padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ImageIcon style={{ width: '12px', height: '12px', color: '#6b7280' }} />
                          </div>
                          <motion.div
                            style={{
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                              backgroundColor: '#f9fafb',
                              border: '1px solid #e5e7eb'
                            }}
                            animate={isSubmitting ? {
                              scale: [1, 0.95, 1.05, 1],
                              backgroundColor: ["#f9fafb", "#eff6ff", "#f0fdf4", "#f9fafb"]
                            } : {}}
                            transition={{ duration: 0.6, times: [0, 0.2, 0.5, 1] }}
                          >
                            <ArrowUp style={{ width: '12px', height: '12px', color: '#6b7280' }} />
                            {isSubmitting && (
                              <motion.div
                                className="absolute inset-0 rounded-full border-2 border-blue-500"
                                initial={{ scale: 1, opacity: 1 }}
                                animate={{ scale: 1.5, opacity: 0 }}
                                transition={{ duration: 0.6 }}
                              />
                            )}
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
