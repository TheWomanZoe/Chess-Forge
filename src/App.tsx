    import { useState } from 'react'
    import { Chess } from 'chess.js'
    import { Chessboard, type PieceDropHandlerArgs } from 'react-chessboard'
    import './App.css'

    function App() {
        const [chess] = useState(new Chess())
        const [position, updatePosition] = useState(chess.fen())
        const [evaluation, updateEval] = useState<number | null>(null)
        const pieceValue: {[key: string]: number} = {
            p: 1,
            n: 3,
            b: 3,
            r: 5,
            q: 9,
            k: 0
        }

        const kingPosition: {[key: string]: number} = {
            'a1': -3.0, 'b1': -4.0, 'c1': -4.0, 'd1': -5.0, 'e1': -5.0, 'f1': -4.0, 'g1': -4.0, 'h1': -3.0,
            'a2': -3.0, 'b2': -4.0, 'c2': -4.0, 'd2': -5.0, 'e2': -5.0, 'f2': -4.0, 'g2': -4.0, 'h2': -3.0,
            'a3': -3.0, 'b3': -4.0, 'c3': -4.0, 'd3': -5.0, 'e3': -5.0, 'f3': -4.0, 'g3': -4.0, 'h3': -3.0,
            'a4': -3.0, 'b4': -4.0, 'c4': -4.0, 'd4': -5.0, 'e4': -5.0, 'f4': -4.0, 'g4': -4.0, 'h4': -3.0,
            'a5': -2.0, 'b5': -3.0, 'c5': -3.0, 'd5': -4.0, 'e5': -4.0, 'f5': -3.0, 'g5': -3.0, 'h5': -2.0,
            'a6': -1.0, 'b6': -2.0, 'c6': -2.0, 'd6': -2.0, 'e6': -2.0, 'f6': -2.0, 'g6': -2.0, 'h6': -1.0,
            'a7': 2.0,  'b7': 2.0,  'c7': 0.0,  'd7': 0.0,  'e7': 0.0,  'f7': 0.0,  'g7': 2.0,  'h7': 2.0,
            'a8': 2.0,  'b8': 3.0,  'c8': 1.0,  'd8': 0.0,  'e8': 0.0,  'f8': 1.0,  'g8': 3.0,  'h8': 2.0
        }

        const queenPosition: {[key: string]: number} = {
            'a1': -2.0, 'b1': -1.0, 'c1': -1.0, 'd1': -0.5, 'e1': -0.5, 'f1': -1.0, 'g1': -1.0, 'h1': -2.0,
            'a2': -1.0, 'b2': 0.0,  'c2': 0.0,  'd2': 0.0,  'e2': 0.0,  'f2': 0.0,  'g2': 0.0,  'h2': -1.0,
            'a3': -1.0, 'b3': 0.0,  'c3': 0.5,  'd3': 0.5,  'e3': 0.5,  'f3': 0.5,  'g3': 0.0,  'h3': -1.0,
            'a4': -0.5, 'b4': 0.0,  'c4': 0.5,  'd4': 0.5,  'e4': 0.5,  'f4': 0.5,  'g4': 0.0,  'h4': -0.5,
            'a5': -1.0, 'b5': 0.0,  'c5': 0.5,  'd5': 0.5,  'e5': 0.5,  'f5': 0.5,  'g5': 0.0,  'h5': -1.0,
            'a6': -1.0, 'b6': 0.0,  'c6': 0.0,  'd6': 0.0,  'e6': 0.0,  'f6': 0.0,  'g6': 0.0,  'h6': -1.0,
            'a7': -2.0, 'b7': -1.0, 'c7': -1.0, 'd7': -0.5, 'e7': -0.5, 'f7': -1.0, 'g7': -1.0, 'h7': -2.0,
            'a8': -2.0, 'b8': -1.0, 'c8': -1.0, 'd8': -0.5, 'e8': -0.5, 'f8': -1.0, 'g8': -1.0, 'h8': -2.0
        }

        const knightPosition: {[key: string]: number} = {
            'a1': -5.0, 'b1': -4.0, 'c1': -3.0, 'd1': -3.0, 'e1': -3.0, 'f1': -3.0, 'g1': -4.0, 'h1': -5.0,
            'a2': -4.0, 'b2': -2.0, 'c2': 0.0,  'd2': 0.0,  'e2': 0.0,  'f2': 0.0,  'g2': -2.0, 'h2': -4.0,
            'a3': -3.0, 'b3': 0.0,  'c3': 1.0,  'd3': 1.5,  'e3': 1.5,  'f3': 1.0,  'g3': 0.0,  'h3': -3.0,
            'a4': -3.0, 'b4': 0.5,  'c4': 1.5,  'd4': 2.0,  'e4': 2.0,  'f4': 1.5,  'g4': 0.5,  'h4': -3.0,
            'a5': -3.0, 'b5': 0.0,  'c5': 1.5,  'd5': 2.0,  'e5': 2.0,  'f5': 1.5,  'g5': 0.0,  'h5': -3.0,
            'a6': -3.0, 'b6': 0.5,  'c6': 1.0,  'd6': 1.5,  'e6': 1.5,  'f6': 1.0,  'g6': 0.5,  'h6': -3.0,
            'a7': -4.0, 'b7': -2.0, 'c7': 0.0,  'd7': 0.0,  'e7': 0.0,  'f7': 0.0,  'g7': -2.0, 'h7': -4.0,
            'a8': -5.0, 'b8': -4.0, 'c8': -3.0, 'd8': -3.0, 'e8': -3.0, 'f8': -3.0, 'g8': -4.0, 'h8': -5.0
        }

        const bishopPosition: {[key: string]: number} = {
            'a1': -2.0, 'b1': -1.0, 'c1': -1.0, 'd1': -1.0, 'e1': -1.0, 'f1': -1.0, 'g1': -1.0, 'h1': -2.0,
            'a2': -1.0, 'b2': 0.0,  'c2': 0.0,  'd2': 0.0,  'e2': 0.0,  'f2': 0.0,  'g2': 0.0,  'h2': -1.0,
            'a3': -1.0, 'b3': 0.0,  'c3': 1.0,  'd3': 1.0,  'e3': 1.0,  'f3': 1.0,  'g3': 0.0,  'h3': -1.0,
            'a4': -1.0, 'b4': 0.0,  'c4': 1.0,  'd4': 2.0,  'e4': 2.0,  'f4': 1.0,  'g4': 0.0,  'h4': -1.0,
            'a5': -1.0, 'b5': 0.0,  'c5': 1.0,  'd5': 2.0,  'e5': 2.0,  'f5': 1.0,  'g5': 0.0,  'h5': -1.0,
            'a6': -1.0, 'b6': 0.0,  'c6': 1.0,  'd6': 1.0,  'e6': 1.0,  'f6': 1.0,  'g6': 0.0,  'h6': -1.0,
            'a7': -1.0, 'b7': 0.0,  'c7': 0.0,  'd7': 0.0,  'e7': 0.0,  'f7': 0.0,  'g7': 0.0,  'h7': -1.0,
            'a8': -2.0, 'b8': -1.0, 'c8': -1.0, 'd8': -1.0, 'e8': -1.0, 'f8': -1.0, 'g8': -1.0, 'h8': -2.0
        }

        const rookPosition: {[key: string]: number} = {
            'a1': 0.0, 'b1': 0.0, 'c1': 0.0, 'd1': 0.0, 'e1': 0.0, 'f1': 0.0, 'g1': 0.0, 'h1': 0.0,
            'a2': 0.5, 'b2': 1.0, 'c2': 1.0, 'd2': 1.0, 'e2': 1.0, 'f2': 1.0, 'g2': 1.0, 'h2': 0.5,
            'a3': -0.5,'b3': 0.0, 'c3': 0.0, 'd3': 0.0, 'e3': 0.0, 'f3': 0.0, 'g3': 0.0, 'h3': -0.5,
            'a4': -0.5,'b4': 0.0, 'c4': 0.0, 'd4': 0.0, 'e4': 0.0, 'f4': 0.0, 'g4': 0.0, 'h4': -0.5,
            'a5': -0.5,'b5': 0.0, 'c5': 0.0, 'd5': 0.0, 'e5': 0.0, 'f5': 0.0, 'g5': 0.0, 'h5': -0.5,
            'a6': -0.5,'b6': 0.0, 'c6': 0.0, 'd6': 0.0, 'e6': 0.0, 'f6': 0.0, 'g6': 0.0, 'h6': -0.5,
            'a7': -0.5,'b7': 0.0, 'c7': 0.0, 'd7': 0.0, 'e7': 0.0, 'f7': 0.0, 'g7': 0.0, 'h7': -0.5,
            'a8': 0.0, 'b8': 0.0, 'c8': 0.0, 'd8': 0.0, 'e8': 0.0, 'f8': 0.0, 'g8': 0.0, 'h8': 0.0
        }

        const pawnPosition: {[key: string]: number} = {
            'a1': 0.0,  'b1': 0.0,  'c1': 0.0,  'd1': 0.0,  'e1': 0.0,  'f1': 0.0,  'g1': 0.0,  'h1': 0.0,
            'a2': 5.0,  'b2': 5.0,  'c2': 5.0,  'd2': 5.0,  'e2': 5.0,  'f2': 5.0,  'g2': 5.0,  'h2': 5.0,
            'a3': 1.0,  'b3': 1.0,  'c3': 2.0,  'd3': 3.0,  'e3': 3.0,  'f3': 2.0,  'g3': 1.0,  'h3': 1.0,
            'a4': 0.5,  'b4': 0.5,  'c4': 1.0,  'd4': 2.5,  'e4': 2.5,  'f4': 1.0,  'g4': 0.5,  'h4': 0.5,
            'a5': 0.0,  'b5': 0.0,  'c5': 0.0,  'd5': 2.0,  'e5': 2.0,  'f5': 0.0,  'g5': 0.0,  'h5': 0.0,
            'a6': 0.5,  'b6': -0.5, 'c6': -1.0, 'd6': 0.0,  'e6': 0.0,  'f6': -1.0, 'g6': -0.5, 'h6': 0.5,
            'a7': 0.5,  'b7': 1.0,  'c7': 1.0,  'd7': -2.0, 'e7': -2.0, 'f7': 1.0,  'g7': 1.0,  'h7': 0.5,
            'a8': 0.0,  'b8': 0.0,  'c8': 0.0,  'd8': 0.0,  'e8': 0.0,  'f8': 0.0,  'g8': 0.0,  'h8': 0.0
        }

        const EngineMove = () => {
            const board = chess.board()

            const flipSquare = (square: string) => {
                const file = square[0]
                const rank = parseInt(square[1], 10)
                return `${file}${9 - rank}`
            }

            const evalPosition = (board: any) => {
                wTotal = 0
                bTotal = 0

                for (let i = 0; i < board.length; i++) {
                    for (let j = 0; j < board[i].length; j++) {
                        let piece = board[i][j]
                        if (!piece) continue

                        let positionalBonus = 0

                        if (piece.color === 'w') {
                            switch (piece.type) {
                                case 'p':
                                    positionalBonus = pawnPosition[flipSquare(piece.square)]
                                    break
                                case 'r':
                                    positionalBonus = rookPosition[flipSquare(piece.square)]
                                    break
                                case 'n':
                                    positionalBonus = knightPosition[flipSquare(piece.square)]
                                    break
                                case 'b':
                                    positionalBonus = bishopPosition[flipSquare(piece.square)]
                                    break
                                case 'q':
                                    positionalBonus = queenPosition[flipSquare(piece.square)]
                                    break
                                case 'k':
                                    positionalBonus = kingPosition[flipSquare(piece.square)]
                                    break
                            }

                            wTotal += pieceValue[piece.type] + positionalBonus
                        }
                        if (piece.color === 'b') {
                            switch (piece.type) {
                                case 'p':
                                    positionalBonus = pawnPosition[piece.square]
                                    break
                                case 'r':
                                    positionalBonus = rookPosition[piece.square]
                                    break
                                case 'n':
                                    positionalBonus = knightPosition[piece.square]
                                    break
                                case 'b':
                                    positionalBonus = bishopPosition[piece.square]
                                    break
                                case 'q':
                                    positionalBonus = queenPosition[piece.square]
                                    break
                                case 'k':
                                    positionalBonus = kingPosition[piece.square]
                                    break
                            }

                            bTotal += pieceValue[piece.type] + positionalBonus
                        }
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
                const engineMove = possible[i]
                chess.move(engineMove)

                const playerPossible = chess.moves()
                if (playerPossible.length === 0) {
                    wTotal = 0
                    bTotal = 0
                    evalPosition(chess.board())
                    moves.set(engineMove, bTotal - wTotal)
                } else {
                    let worstResponseValue = Infinity
                    for (let j = 0; j < playerPossible.length; j++) {
                        chess.move(playerPossible[j])
                        wTotal = 0
                        bTotal = 0
                        evalPosition(chess.board())

                        const evalAfterResponse = bTotal - wTotal
                        if (evalAfterResponse < worstResponseValue) worstResponseValue = evalAfterResponse

                        chess.undo()
                    }
                    moves.set(engineMove, worstResponseValue)
                }

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
                <h2>{evaluation > 0 ? evaluation === 0 ? 'Equal' : 'Black is winning' : 'White is winning'}</h2>
                <Chessboard options={options}/>
            </div>
        )
    }

    export default App
