import { Chess } from 'chess.js'
import { pieceValue, kingPosition, queenPosition, rookPosition, knightPosition, bishopPosition, pawnPosition } from "./tables.ts"

export function EngineMove(fen: string, maxDepth = 4) {
    const chess = new Chess(fen)

    const flipSquare = (square: string) => {
        const file = square[0]
        const rank = parseInt(square[1], 10)
        return `${file}${9 - rank}`
    }

    const evalPosition = (board: any[], engineColor: 'w' | 'b') => {
        let wTotal = 0
        let bTotal = 0

        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board[i].length; j++) {
                const piece = board[i][j]
                if (!piece) continue

                let positionalBonus = 0
                if (piece.color === 'w') {
                    switch (piece.type) {
                        case 'p':
                            positionalBonus = pawnPosition[piece.square];
                            break
                        case 'r':
                            positionalBonus = rookPosition[piece.square];
                            break
                        case 'n':
                            positionalBonus = knightPosition[piece.square];
                            break
                        case 'b':
                            positionalBonus = bishopPosition[piece.square];
                            break
                        case 'q':
                            positionalBonus = queenPosition[piece.square];
                            break
                        case 'k':
                            positionalBonus = kingPosition[piece.square];
                            break
                    }

                    wTotal += pieceValue[piece.type] + positionalBonus
                } else {
                    switch (piece.type) {
                        case 'p':
                            positionalBonus = pawnPosition[flipSquare(piece.square)];
                            break
                        case 'r':
                            positionalBonus = rookPosition[flipSquare(piece.square)];
                            break
                        case 'n':
                            positionalBonus = knightPosition[flipSquare(piece.square)];
                            break
                        case 'b':
                            positionalBonus = bishopPosition[flipSquare(piece.square)];
                            break
                        case 'q':
                            positionalBonus = queenPosition[flipSquare(piece.square)];
                            break
                        case 'k':
                            positionalBonus = kingPosition[flipSquare(piece.square)];
                            break
                    }

                    bTotal += pieceValue[piece.type] + positionalBonus
                }
            }
        }
        return engineColor === 'w' ? wTotal - bTotal : bTotal - wTotal
    }

    const removeNotation = (move: string) => move.replace(/[+#?!]+$/g, '')
    const MATE_VALUE = 1000000
    const engineColor = chess.turn() as 'w' | 'b'

    const alphaBeta = (depth: number, alpha: number, beta: number, isMaximizing: boolean): number => {
        if (chess.isGameOver()) {
            if (chess.isCheckmate()) {
                const winner = chess.turn() === 'w' ? 'b' : 'w'

                const mateDistance = (maxDepth - depth)
                return (winner === engineColor) ? (MATE_VALUE - mateDistance) : -(MATE_VALUE - mateDistance)
            }

            return 0
        }

        if (depth === 0)
            return evalPosition(chess.board(), engineColor)

        const moves = chess.moves()

        const scoredMoves: { m: string; score: number }[] = []
        for (const m of moves) {
            chess.move(removeNotation(m))
            let score = evalPosition(chess.board(), engineColor)

            if (m.includes('x')) score += 50
            if (m.includes('+') || m.includes('#')) score += 40
            chess.undo()
            scoredMoves.push({m, score})
        }
        scoredMoves.sort((a, b) => isMaximizing ? (b.score - a.score) : (a.score - b.score))

        if (isMaximizing) {
            let value = -Infinity
            for (const mv of scoredMoves) {
                chess.move(removeNotation(mv.m))
                const child = alphaBeta(depth - 1, alpha, beta, false)
                chess.undo()

                if (child > value) value = child
                if (value > alpha) alpha = value
                if (alpha >= beta)
                    break

            }
            return value
        } else {
            let value = Infinity
            for (const mv of scoredMoves) {
                chess.move(removeNotation(mv.m))
                const child = alphaBeta(depth - 1, alpha, beta, true)
                chess.undo()

                if (child < value) value = child
                if (value < beta) beta = value
                if (alpha >= beta)
                    break
            }
            return value
        }
    }

    const possible = chess.moves()
    const movesMap = new Map<string, number>()

    for (const move of possible) {
        chess.move(removeNotation(move))

        let score: number
        if (chess.isCheckmate())
            score = MATE_VALUE
        else
            score = alphaBeta(maxDepth - 1, -Infinity, Infinity, false)

        movesMap.set(move, score)
        chess.undo()
    }

    let bestMoves: string[] = []
    let bestValue = -Infinity
    movesMap.forEach((value, key) => {
        if (value > bestValue) {
            bestValue = value
            bestMoves = [key]
        } else if (value === bestValue) bestMoves.push(key)
    })

    const bestMove = bestMoves.length ? bestMoves[Math.floor(Math.random() * bestMoves.length)] : ''

    if (!bestMove)
        return {move: '', eval: evalPosition(chess.board(), engineColor)}

    chess.move(removeNotation(bestMove))
    const finalEval = evalPosition(chess.board(), engineColor)
    chess.undo()

    return {move: bestMove, eval: finalEval}
}