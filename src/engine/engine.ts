import { Chess } from 'chess.js'
import { pieceValue, kingPosition, queenPosition, rookPosition, knightPosition, bishopPosition, pawnPosition } from "./tables.ts"
import { ZobristKeys, computeZobristHash } from "./zobrist.ts"
import { TranspositionTable } from "./transpositionTables.ts";

const zobristKeys = new ZobristKeys()
const transpositionTable = new TranspositionTable(64)

//mirrors the square from the middle of the board
const flipSquare = (square: string) => {
    const file = square[0]
    const rank = parseInt(square[1], 10)
    return `${file}${9 - rank}`
}

//evaluates the position
export const evalPosition = (board: any[], engineColor: 'w' | 'b',chessInstance?: any, hash?: bigint) => {
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
    let finalScore =  engineColor === 'w' ? wTotal - bTotal : bTotal - wTotal

    if (hash !== undefined && chessInstance) {
        let complexity = 0

        let pieceCount = 0
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board[i].length; j++) {
                if (board[i][j]) pieceCount++
            }
        }

        complexity += pieceCount * 2

        const numberOfMoves = chessInstance.moves().length
        complexity += numberOfMoves * 1.5
        complexity = Math.min(complexity, 100)

        const baseNoise = 1
        const complexityNoise = (complexity / 100) * 2
        const totalNoise = baseNoise + complexityNoise

        const noiseSeed = Number(hash % 1000n)
        const pseudoRandom = Math.sin(noiseSeed) * 10000
        const noise = (pseudoRandom - Math.floor(pseudoRandom)) * totalNoise * 2 - totalNoise

        finalScore += noise
    }

    return finalScore
}

export function EngineMove(fen: string, maxDepth = 4) {
    const chess = new Chess(fen)

    const removeNotation = (move: string) => move.replace(/[+#?!]+$/g, '')
    const MATE_VALUE = 1000000 // a very high value to represent checkmate
    const engineColor = chess.turn() as 'w' | 'b'
    const takePriorityBonus = 50 // bonus for moves that capture a piece, to prioritize them in move ordering
    const checkPriorityBonus = 40 // bonus for moves that give check, to prioritize them in move ordering
    const transpositionTablePriorityBonus = 1000 // bonus for moves that are found in the transposition table, to prioritize them in move ordering

    //alpha-beta pruning algorithm
    const alphaBeta = (depth: number, alpha: number, beta: number, isMaximizing: boolean): number => {
        const hash = computeZobristHash(chess, zobristKeys)
        const ttScore = transpositionTable.probe(hash, depth, alpha, beta)

        if (ttScore !== null)
            return ttScore

        if (chess.isGameOver()) {
            if (chess.isCheckmate()) {
                const winner = chess.turn() === 'w' ? 'b' : 'w'
                const mateDistance = (maxDepth - depth)
                const score = (winner === engineColor) ? (MATE_VALUE - mateDistance) : -(MATE_VALUE + mateDistance)

                transpositionTable.store(hash, depth, score, 'exact')
                return score
            }

            return 0
        }

        if (depth === 0) {
            const score = evalPosition(chess.board(), engineColor, chess, hash)

            transpositionTable.store(hash, depth, score, 'exact')
            return score
        }

        const moves = chess.moves()

        const TTbestMove = transpositionTable.getBestMove(hash)

        const scoredMoves: { m: string; score: number }[] = []
        for (const m of moves) {
            let orderScore = 0

            if (TTbestMove && removeNotation(m) === TTbestMove)
                orderScore += transpositionTablePriorityBonus

            chess.move(removeNotation(m))
            orderScore += evalPosition(chess.board(), engineColor, chess)

            if (m.includes('x')) orderScore += takePriorityBonus
            if (m.includes('+') || m.includes('#')) orderScore += checkPriorityBonus
            chess.undo()
            scoredMoves.push({m, score: orderScore})
        }
        scoredMoves.sort((a, b) => isMaximizing ? (b.score - a.score) : (a.score - b.score))

        let bestMove: string | undefined
        let flag: 'exact' | 'lowerbound' | 'upperbound' = 'upperbound'

        if (isMaximizing) {
            let value = -Infinity
            for (const mv of scoredMoves) {
                chess.move(removeNotation(mv.m))
                const child = alphaBeta(depth - 1, alpha, beta, false)
                chess.undo()

                if (child > value) {
                    value = child
                    bestMove = mv.m
                }
                if (value > alpha) {
                    alpha = value
                    flag = 'exact'
                }
                if (alpha >= beta) {
                    transpositionTable.store(hash, depth, value, 'lowerbound', mv.m)
                    break
                }

            }

            transpositionTable.store(hash, depth, value, flag, bestMove)
            return value
        } else {
            let value = Infinity
            for (const mv of scoredMoves) {
                chess.move(removeNotation(mv.m))
                const child = alphaBeta(depth - 1, alpha, beta, true)
                chess.undo()

                if (child < value) {
                    value = child
                    bestMove = mv.m
                }
                if (value < beta) {
                    beta = value
                    flag = 'exact'
                }
                if (alpha >= beta) {
                    transpositionTable.store(hash, depth, value, 'lowerbound', mv.m)
                    break
                }
            }

            transpositionTable.store(hash, depth, value, flag, bestMove)
            return value
        }
    }

    const possible = chess.moves()
    const movesMap = new Map<string, number>()

    //evaluate all possible moves at the root level
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

    //select the best move
    let bestMoves: string[] = []
    let bestValue = -Infinity
    movesMap.forEach((value, key) => {
        if (value > bestValue) {
            bestValue = value
            bestMoves = [key]
        } else if (value === bestValue) bestMoves.push(key)
    })

    //randomly pick one of the best moves
    const best = bestMoves.length ? bestMoves[Math.floor(Math.random() * bestMoves.length)] : ''

    if (!best)
        return {move: '', eval: evalPosition(chess.board(), engineColor)}

    //evaluate the final position after the best move and sends it back
    chess.move(removeNotation(best))
    const finalEval = evalPosition(chess.board(), engineColor)
    chess.undo()

    console.log(finalEval)

    return {move: best, eval: finalEval}
}

export function ClearTranspositionTable() {
    transpositionTable.clear()
}