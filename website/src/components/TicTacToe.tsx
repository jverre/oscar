import { useState } from 'react'

type Player = 'X' | 'O' | null

export function TicTacToe() {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null))
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X')

  const calculateWinner = (squares: Player[]): Player => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ]
    
    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a]
      }
    }
    
    return null
  }

  const handleClick = (i: number) => {
    if (board[i] || calculateWinner(board)) return
    
    const newBoard = [...board]
    newBoard[i] = currentPlayer
    setBoard(newBoard)
    setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X')
  }

  const resetGame = () => {
    setBoard(Array(9).fill(null))
    setCurrentPlayer('X')
  }

  const winner = calculateWinner(board)
  const isDraw = !winner && board.every(square => square !== null)

  return (
    <div className="font-mono text-center">
      <pre className="inline-block text-left">
{`     │     │     
  ${board[0] || ' '}  │  ${board[1] || ' '}  │  ${board[2] || ' '}  
─────┼─────┼─────
  ${board[3] || ' '}  │  ${board[4] || ' '}  │  ${board[5] || ' '}  
─────┼─────┼─────
  ${board[6] || ' '}  │  ${board[7] || ' '}  │  ${board[8] || ' '}  
     │     │     `}
      </pre>

      {/* Invisible clickable overlay */}
      <div className="relative -mt-[108px] mb-4">
        <div className="grid grid-cols-3 gap-0 w-[192px] h-[96px] mx-auto">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <button
              key={i}
              onClick={() => handleClick(i)}
              className="w-16 h-8 opacity-0 hover:opacity-10 hover:bg-gray-500 cursor-pointer disabled:cursor-default"
              disabled={!!board[i] || !!winner || isDraw}
              aria-label={`Square ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-4">
        {winner && <div>PLAYER {winner} WINS!</div>}
        {isDraw && <div>DRAW!</div>}
        {!winner && !isDraw && <div>PLAYER {currentPlayer}'S TURN</div>}
      </div>

      <button onClick={resetGame} className="mt-2 hover:underline">
        [NEW GAME]
      </button>
    </div>
  )
}