import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function ClaudeCodeAnimation() {
  const [inputValue, setInputValue] = useState('')
  const shareText = 'share'
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [showResponse, setShowResponse] = useState(false)
  const [showMcpResponse, setShowMcpResponse] = useState(false)
  const mcpText = '⏺ oscar - /share (MCP)'
  const responseText = '⏺ Your chat is now publicly accessible at:\n  https://www.getoscar.ai/chat/demo-chat'
  const [mcpIndex, setMcpIndex] = useState(0)
  const [responseIndex, setResponseIndex] = useState(0)
  const [streamingComplete, setStreamingComplete] = useState(false)

  useEffect(() => {
    if (currentIndex < shareText.length) {
      const timer = setTimeout(() => {
        setInputValue(shareText.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
      }, 120)
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
    if (showMessage && !showMcpResponse) {
      const timer = setTimeout(() => {
        setShowMcpResponse(true)
        setMcpIndex(0)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [showMessage, showMcpResponse])

  useEffect(() => {
    if (showMcpResponse && mcpIndex < mcpText.length) {
      const timer = setTimeout(() => {
        setMcpIndex(mcpIndex + 1)
      }, 35)
      return () => clearTimeout(timer)
    } else if (showMcpResponse && mcpIndex === mcpText.length && !showResponse) {
      const timer = setTimeout(() => {
        setShowResponse(true)
        setResponseIndex(0)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [showMcpResponse, mcpIndex, mcpText, showResponse])

  useEffect(() => {
    if (showResponse && responseIndex < responseText.length) {
      const timer = setTimeout(() => {
        setResponseIndex(responseIndex + 1)
      }, 35)
      return () => clearTimeout(timer)
    } else if (showResponse && responseIndex === responseText.length && !streamingComplete) {
      setStreamingComplete(true)
    }
  }, [showResponse, responseIndex, responseText, streamingComplete])

  useEffect(() => {
    if (streamingComplete) {
      const timer = setTimeout(() => {
        setShowMessage(false)
        setShowResponse(false)
        setShowMcpResponse(false)
        setIsSubmitting(false)
        setCurrentIndex(0)
        setMcpIndex(0)
        setResponseIndex(0)
        setStreamingComplete(false)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [streamingComplete])

  return (
    <main className="container mx-auto h-[500px] overflow-hidden">
      <div className="h-full bg-gray-100 rounded-lg border shadow-lg max-w-4xl mx-auto flex flex-col overflow-hidden">
        {/* Mac-style header */}
        <div className="flex items-center px-3 py-2 bg-gray-50 rounded-t-lg border-b">
          <div className="flex space-x-1.5">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
          </div>
        </div>
        
        {/* Main content area */}
        <div className="flex-1 bg-white p-4">
          <AnimatePresence>
            {showMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4"
              >
                <div className="text-gray-400 font-mono text-sm">
                  &gt; {shareText}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MCP Response */}
          <AnimatePresence>
            {showMcpResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4"
              >
                <div className="text-gray-700 font-mono text-sm">
                  {mcpText.slice(0, mcpIndex)}
                  {mcpIndex < mcpText.length && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                      className="inline-block w-0.5 h-3 bg-gray-700 ml-0.5"
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Final Response */}
          <AnimatePresence>
            {showResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4"
              >
                <div className="text-gray-700 font-mono text-sm whitespace-pre-line">
                  {streamingComplete ? (
                    <>
                      ⏺ Your chat is now publicly accessible at:{'\n'}
                      {'  '}
                      <a
                        href="https://www.getoscar.ai/chat/demo-chat"
                        className="text-blue-600 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        https://www.getoscar.ai/chat/demo-chat
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
        
        {/* Bottom input area - fixed to bottom */}
        <div className="bg-white p-4 rounded-b-lg">
          {/* Thinking indicator */}
          <AnimatePresence>
            {showMessage && !streamingComplete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-2"
              >
                <div className="text-red-600 text-sm font-mono">
                  ✳ Thinking… (esc to interrupt)
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Input field */}
          <div className="flex items-center mb-2 border border-gray-300 rounded px-3 py-2">
            <span className="text-gray-600 mr-2 font-mono">&gt;</span>
            <div className="flex-1 relative">
              <div className="flex items-center">
                {inputValue}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                  className="inline-block w-0.5 h-4 bg-black ml-1"
                />
              </div>
            </div>
          </div>
          
          {/* Status line */}
          <div className="flex items-center text-sm text-gray-500 pl-3">
            <span className="text-purple-500 mr-2">⏵⏵</span>
            <span>accept edits on</span>
            <span className="text-gray-400 ml-1">(shift+tab to cycle)</span>
          </div>
        </div>
      </div>
    </main>
  )
}