    import { useState } from 'react'
    import { Chess } from 'chess.js'
    import { Chessboard, type PieceDropHandlerArgs } from 'react-chessboard'
    import './App.css'

    function App() {
        const [chess] = useState(new Chess())
        const [position, updatePosition] = useState(chess.fen())
        const [evaluation, updateEval] = useState<number | null>(null)
        const [wPosition, updateWPosition] = useState<number | null>(null)
        const [bPosition, updateBPosition] = useState<number | null>(null)
        const pieceValue: {[key: string]: number} = {
            p: 1,
            n: 3,
            b: 3,
            r: 5,
            q: 9,
            k: 90
        }

        const EngineMove = () => {
            const board = chess.board()

            const evalPosition = (board: any) => {
                for (let i = 0; i < board.length; i++) {
                    for (let j = 0; j < board[i].length; j++) {
                        let piece = board[i][j]
                        if (!piece) continue

                        if (piece.color === 'w') wTotal += pieceValue[piece.type]
                        if (piece.color === 'b') bTotal += pieceValue[piece.type]
                    }
                }
            }

            let wTotal = 0
            let bTotal = 0

            const possible = chess.moves()
            const moves = new Map<string, number>()

            if (chess.isGameOver()) {
                alert('Game Over')
                return;
            }

            for (let i = 0; i < possible.length; i++) {
                chess.move(possible[i])
                const newBoard = chess.board()

                evalPosition(newBoard)

                moves.set(possible[i], bTotal - wTotal)
                wTotal = 0
                bTotal = 0

                chess.undo()
            }

            let bestMoves: string[] = []
            let bestValue = -Infinity

            moves.forEach((value, key) => {
                if (value > bestValue) {
                    bestValue = value
                    bestMoves = [key]
                } else if (value === bestValue) {
                    bestMoves.push(key)
                }
            })

            const bestMove = bestMoves.length
                ? bestMoves[Math.floor(Math.random() * bestMoves.length)]
                : ''

            chess.move(bestMove)

            updatePosition(chess.fen())

            evalPosition(board)

            updateWPosition(wTotal)
            updateBPosition(bTotal)
            updateEval(bTotal - wTotal)
        }

        const onDrop = ({sourceSquare, targetSquare}: PieceDropHandlerArgs) => {
            if (!targetSquare)
                return false

            try {
                const move = chess.move({
                    from: sourceSquare,
                    to: targetSquare,
                    promotion: 'q'
                })

                if (move) {
                    updatePosition(chess.fen())
                    setTimeout(EngineMove, 500)
                }

                return false
            }
            catch (error) {
                return false
            }
        }

        const options = {
            position: position,
            onPieceDrop: onDrop,
        }

        return(
            <div id={'board'}>
                <h1 id={'eval'}>Piece evaluation: {evaluation}</h1>
                <Chessboard options={options}/>
            </div>
        )
    }

    export default App
