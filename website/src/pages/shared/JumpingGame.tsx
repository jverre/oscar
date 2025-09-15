import { useState, useEffect, useCallback, useRef } from 'react'

interface GameState {
  isJumping: boolean
  isGameRunning: boolean
  score: number
  obstacles: Array<{ id: number; position: number; height: number }>
  clouds: Array<{ id: number; position: number; size: number }>
  playerPosition: number
  highScore: number
}

export function JumpingGame() {
  const [gameState, setGameState] = useState<GameState>({
    isJumping: false,
    isGameRunning: false,
    score: 0,
    obstacles: [],
    clouds: [
      { id: 1, position: 100, size: 0.8 },
      { id: 2, position: 250, size: 1 },
      { id: 3, position: 400, size: 0.6 }
    ],
    playerPosition: 0,
    highScore: parseInt(localStorage.getItem('jumpGameHighScore') || '0')
  })

  const canvasRef = useRef<HTMLDivElement>(null)

  const jump = useCallback(() => {
    if (!gameState.isJumping && gameState.isGameRunning) {
      setGameState(prev => ({ ...prev, isJumping: true }))
      setTimeout(() => {
        setGameState(prev => ({ ...prev, isJumping: false }))
      }, 600)
    }
  }, [gameState.isJumping, gameState.isGameRunning])

  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isJumping: false,
      isGameRunning: true,
      score: 0,
      obstacles: [],
      playerPosition: 0
    }))
  }, [])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault()
        if (!gameState.isGameRunning) {
          startGame()
        } else {
          jump()
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [jump, startGame, gameState.isGameRunning])

  // Game loop
  useEffect(() => {
    if (!gameState.isGameRunning) return

    const gameInterval = setInterval(() => {
      setGameState(prev => {
        // Move obstacles
        const updatedObstacles = prev.obstacles
          .map(obstacle => ({ ...obstacle, position: obstacle.position - 4 }))
          .filter(obstacle => obstacle.position > -50)

        // Move clouds (slower)
        const updatedClouds = prev.clouds
          .map(cloud => ({ ...cloud, position: cloud.position - 0.5 }))
          .map(cloud => cloud.position < -50 ? { ...cloud, position: 450 } : cloud)

        // Add new obstacles randomly
        const shouldAddObstacle = Math.random() < 0.015 && 
          (updatedObstacles.length === 0 || updatedObstacles[updatedObstacles.length - 1].position < 300)
        
        if (shouldAddObstacle) {
          updatedObstacles.push({
            id: Date.now(),
            position: 500,
            height: Math.random() > 0.5 ? 30 : 20
          })
        }

        // Check collision with improved hitbox
        const playerHitbox = { x: 50, y: prev.isJumping ? 30 : 70, width: 25, height: 25 }
        const collision = updatedObstacles.some(obstacle => {
          const obstacleHitbox = { x: obstacle.position, y: 100 - obstacle.height, width: 20, height: obstacle.height }
          return (
            playerHitbox.x < obstacleHitbox.x + obstacleHitbox.width &&
            playerHitbox.x + playerHitbox.width > obstacleHitbox.x &&
            playerHitbox.y < obstacleHitbox.y + obstacleHitbox.height &&
            playerHitbox.y + playerHitbox.height > obstacleHitbox.y
          )
        })

        if (collision) {
          const newHighScore = Math.max(prev.score, prev.highScore)
          localStorage.setItem('jumpGameHighScore', newHighScore.toString())
          return { ...prev, isGameRunning: false, highScore: newHighScore }
        }

        return {
          ...prev,
          obstacles: updatedObstacles,
          clouds: updatedClouds,
          score: prev.score + 1
        }
      })
    }, 50)

    return () => clearInterval(gameInterval)
  }, [gameState.isGameRunning])

  const speed = Math.min(5 + gameState.score / 500, 10)

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg shadow-lg p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-800">
              {gameState.score.toString().padStart(5, '0')}
            </div>
            <div className="text-xs text-gray-500">
              HI {gameState.highScore.toString().padStart(5, '0')}
            </div>
          </div>
          {!gameState.isGameRunning && (
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">
                {gameState.score === 0 ? 'Press SPACE to start' : 'Game Over!'}
              </div>
              <button 
                onClick={startGame}
                className="px-4 py-2 bg-gray-800 text-white hover:bg-gray-700 rounded-md transition-colors text-sm font-medium"
              >
                {gameState.score > 0 ? 'Try Again' : 'Start Game'}
              </button>
            </div>
          )}
        </div>
        
        <div 
          ref={canvasRef}
          className="relative w-full h-40 bg-gradient-to-b from-sky-200 to-amber-100 rounded cursor-pointer overflow-hidden"
          onClick={gameState.isGameRunning ? jump : startGame}
        >
          {/* Sun */}
          <div className="absolute top-4 right-8 w-12 h-12 bg-yellow-400 rounded-full shadow-lg"></div>
          
          {/* Clouds */}
          {gameState.clouds.map(cloud => (
            <div
              key={cloud.id}
              className="absolute top-6 opacity-70"
              style={{ 
                left: `${cloud.position}px`,
                transform: `scale(${cloud.size})`
              }}
            >
              <div className="flex">
                <div className="w-8 h-8 bg-white rounded-full"></div>
                <div className="w-10 h-8 bg-white rounded-full -ml-4"></div>
                <div className="w-8 h-8 bg-white rounded-full -ml-4"></div>
              </div>
            </div>
          ))}
          
          {/* Ground */}
          <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-amber-600 to-amber-500">
            {/* Ground texture */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-700"></div>
            <div className="absolute bottom-2 left-0 w-full h-px bg-amber-600 opacity-50"></div>
          </div>
          
          {/* Player */}
          <div 
            className={`absolute transition-all duration-300 ease-out ${
              gameState.isJumping ? 'bottom-20' : 'bottom-10'
            }`}
            style={{ 
              left: '50px',
              transform: gameState.isJumping ? 'rotate(-10deg)' : 'rotate(0deg)'
            }}
          >
            {/* Oscar character styled as a simple geometric shape */}
            <div className="relative">
              <div className="w-8 h-8 bg-gray-800 rounded-lg shadow-md">
                {/* Eyes */}
                <div className="absolute top-2 left-1.5 w-1 h-1 bg-white rounded-full"></div>
                <div className="absolute top-2 right-1.5 w-1 h-1 bg-white rounded-full"></div>
                {/* Legs when running */}
                {gameState.isGameRunning && !gameState.isJumping && (
                  <>
                    <div className="absolute -bottom-2 left-1 w-1 h-2 bg-gray-800 animate-pulse"></div>
                    <div className="absolute -bottom-2 right-1 w-1 h-2 bg-gray-800 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Obstacles */}
          {gameState.obstacles.map(obstacle => (
            <div
              key={obstacle.id}
              className="absolute transition-all"
              style={{ 
                left: `${obstacle.position}px`,
                bottom: '10px'
              }}
            >
              {/* Cactus-style obstacle */}
              <div className={`bg-green-600 shadow-md ${obstacle.height === 30 ? 'w-4' : 'w-3'}`} style={{ height: `${obstacle.height}px` }}>
                {obstacle.height === 30 && (
                  <>
                    <div className="absolute -left-2 top-2 w-2 h-4 bg-green-600 rounded"></div>
                    <div className="absolute -right-2 top-4 w-2 h-4 bg-green-600 rounded"></div>
                  </>
                )}
              </div>
            </div>
          ))}
          
          {/* Speed lines when running fast */}
          {gameState.isGameRunning && gameState.score > 100 && (
            <>
              <div className="absolute top-16 left-0 w-full h-px bg-gray-400 opacity-20 animate-pulse"></div>
              <div className="absolute top-20 left-0 w-full h-px bg-gray-400 opacity-20 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
            </>
          )}
        </div>
        
        <div className="mt-4 flex justify-center space-x-4 text-xs text-gray-500">
          <span>SPACE/↑ to jump</span>
          <span>•</span>
          <span>Click to play</span>
        </div>
      </div>
    </div>
  )
}