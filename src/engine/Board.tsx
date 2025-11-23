import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Chess } from "chess.js"
import { Chessboard, type PieceDropHandlerArgs, type ChessboardOptions } from 'react-chessboard'
import EngineWorker from './engineWorker?worker'
import "./Board.css"

const chess = new Chess()

export function Board() {
    const workerRef = useRef<Worker | null>(null)
    const engineStartTimeRef = useRef<number | null>(null)
    const engineSideRef = useRef<'w' | 'b' | null>(null)
    const jobIDRef = useRef(0)
    const [position, updatePosition] = useState(chess.fen())
    const [playerColor, updatePlayerColor] = useState<'w' | 'b'>('w')
    const [isThinking, updateIsThinking] = useState(false)
    const [timeControl, updateTimeControl] = useState<'blitz' | 'rapid' | 'unlimited'>('blitz')
    const [whiteTime, updateWhiteTime] = useState<number>(() => {
        const saved = localStorage.getItem('GameState')
        if (!saved)
            return 180

        try {
            return JSON.parse(saved).whiteTime ?? 180
        } catch {
            return 180
        }
    })
    const [blackTime, updateBlackTime] = useState<number>(() => {
        const saved = localStorage.getItem('GameState')
        if (!saved)
            return 180

        try {
            return JSON.parse(saved).blackTime ?? 180
        } catch {
            return 180
        }
    })
    const [gameOver, updateGameOver] = useState(false)
    const [depth, updateDepth] = useState(4)
    const [startedGame, updateStartedGame] = useState(false)
    const [showSetup, updateShowSetup] = useState(() => {
        const saved = localStorage.getItem('GameState')
        if (!saved)
            return true

        try {
            const gameState = JSON.parse(saved)
            return gameState && gameState.fen ? false : true
        } catch {
            return true
        }
    })
    const [moveHistory, updateMoveHistory] = useState<string[]>([])
    let gameState: object = {}

    const applyTimeControl = (tc: 'blitz' | 'rapid' | 'unlimited') => {
        updateTimeControl(tc)

        switch (tc) {
            case 'blitz':
                updateWhiteTime(180)
                updateBlackTime(180)
                updateDepth(4)
                break
            case 'rapid':
                updateWhiteTime(600)
                updateBlackTime(600)
                updateDepth(4)
                break
            case 'unlimited':
                updateWhiteTime(Infinity)
                updateBlackTime(Infinity)
                updateDepth(5)
                break
        }
    }

    useEffect(() => {
        if (gameOver)
            return
        if (timeControl === 'unlimited')
            return
        if (!startedGame)
            return

        const interval = setInterval(() => {
            if (chess.turn() === playerColor) {
                if (chess.turn() === 'w') {
                    updateWhiteTime((time: number) => {
                        if (time <= 1) {
                            updateGameOver(true)
                            alert('Black wins on time!')
                            return 0
                        }
                        return time - 1
                    })
                }

                if (chess.turn() === 'b') {
                    updateBlackTime((time: number) => {
                        if (time <= 1) {
                            updateGameOver(true)
                            alert('White wins on time!')
                            return 0
                        }
                        return time - 1
                    })
                }
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [startedGame, playerColor, timeControl, gameOver])

    useEffect(() => {
        workerRef.current = new EngineWorker()

        workerRef.current.onmessage = (event) => {
            const { ok, response, error, jobID } = event.data

            if (jobID === undefined || jobID !== jobIDRef.current)
                return

            const start = engineStartTimeRef.current
            const side = engineSideRef.current
            let elapsedTime = 0
            if (start && side)
                elapsedTime = Math.floor((Date.now() - start) / 1000)

            engineStartTimeRef.current = null
            engineSideRef.current = null
            updateIsThinking(false)

            if (!ok) {
                console.error("Engine Worker Error: ", error)
                updateIsThinking(false)
                return
            }

            if (side === 'w') {
                updateWhiteTime((prev: number) => {
                    const remaining = prev - elapsedTime
                    const clamped = remaining <= 0 ? 0 : remaining

                    if (clamped === 0) {
                        updateGameOver(true)
                        alert('Black wins on time!')
                    }

                    const newGameState = {
                        fen: chess.fen(),
                        playerColor,
                        toMove: chess.turn(),
                        timeControl,
                        whiteTime: clamped,
                        blackTime,
                    }
                    localStorage.setItem('GameState', JSON.stringify(newGameState))

                    return clamped
                })
            } else if (side === 'b') {
                updateBlackTime((prev: number) => {
                    const remaining = prev - elapsedTime
                    const clamped = remaining <= 0 ? 0 : remaining

                    if (clamped === 0) {
                        updateGameOver(true)
                        alert('White wins on time!')
                    }

                    const newGameState = {
                        fen: chess.fen(),
                        playerColor,
                        toMove: chess.turn(),
                        timeControl,
                        whiteTime,
                        blackTime: clamped,
                    }
                    localStorage.setItem('GameState', JSON.stringify(newGameState))

                    return clamped
                })
            }

            if (gameOver)
                return

            const { move } = response
            try {
                const result = chess.move(move)
                if (chess.isGameOver())
                    updateGameOver(true)

                updatePosition(chess.fen())
                updateIsThinking(false)

                if (result && result.san)
                    updateMoveHistory((history) => [...history, result.san])

                if (gameState)
                    localStorage.removeItem('GameState')

                gameState = {
                    fen: chess.fen(),
                    playerColor: playerColor,
                    toMove: chess.turn(),
                    timeControl: timeControl,
                    whiteTime: whiteTime,
                    blackTime: blackTime,
                }

                localStorage.setItem('GameState', JSON.stringify(gameState))
            } catch (error) {
                console.log('Failed to make engine move:', error)
                updateIsThinking(false)
            }
        }

        return () => {
            workerRef.current?.terminate()
            workerRef.current = null
        }
    }, [])

    useEffect(() => {
        const saved = localStorage.getItem('GameState')
        if (!saved)
            return

        try {
            const gameState = JSON.parse(saved)
            chess.load(gameState.fen)
            updatePosition(chess.fen())
            updatePlayerColor(gameState.playerColor)
            updateTimeControl(gameState.timeControl)
            updateWhiteTime(gameState.whiteTime)
            updateBlackTime(gameState.blackTime)
            updateStartedGame(true)

            const history = chess.history({ verbose: false })
            updateMoveHistory(history)

            if (gameState.toMove !== playerColor)
                EngineToPlay(depth)
        } catch (error) {
            console.error('Failed to load saved game state:', error)
        }
    }, [])

    const EngineToPlay = (depth = 4) => {
        if (!workerRef.current)
            return

        const timeLeft = chess.turn() === 'w' ? whiteTime : blackTime
        const totalTime = timeControl === 'blitz' ? 180 : timeControl === 'rapid' ? 600 : Infinity
        const percentageDifference = Math.abs((timeLeft - totalTime) / totalTime) * 100

        if (percentageDifference > 50 || timeLeft <= 60)
            updateDepth(Math.random() < 0.5 ? 3 : 4)
        if (percentageDifference > 80 || timeLeft <= 20)
            updateDepth(3)
        if (timeLeft <= 5)
            updateDepth(2)

        jobIDRef.current += 1
        const jobID = jobIDRef.current

        engineSideRef.current = chess.turn() as 'w' | 'b'
        engineStartTimeRef.current = Date.now()

        updateIsThinking(true)
        workerRef.current.postMessage({ fen: chess.fen(), depth: depth, jobID: jobID })
    }

    useEffect(() => {
        if (chess.turn() !== playerColor && !chess.isGameOver() && startedGame)
            EngineToPlay(depth)
    }, [playerColor, startedGame])

    const onDrop = ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
        if (!startedGame)
            return false

        if (gameOver)
            return false

        if (!targetSquare)
            return false

        if (isThinking)
            return false

        if (chess.turn() !== playerColor)
            return false

        try {
            const move = chess.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q'
            })

            if (move) {
                updatePosition(chess.fen())

                if (move.san)
                    updateMoveHistory((history) => [...history, move.san])

                if (gameState)
                    localStorage.removeItem('GameState')

                gameState = {
                    fen: chess.fen(),
                    playerColor: playerColor,
                    toMove: chess.turn(),
                    timeControl: timeControl,
                    whiteTime: whiteTime,
                    blackTime: blackTime,
                }

                localStorage.setItem('GameState', JSON.stringify(gameState))

                EngineToPlay(depth)
            }
        } catch (error) {
            console.error('Invalid move:', error)
            return false
        }

        return false
    }

    const handleStartGame = () => {
        updateShowSetup(false)
        updateStartedGame(true)
    }

    const handleNewGame = () => {
        localStorage.removeItem('GameState')
        chess.reset()
        updatePosition(chess.fen())
        updateGameOver(false)
        updateStartedGame(false)
        updateShowSetup(true)
        updateMoveHistory([])
    }

    const options: ChessboardOptions = {
        position: position,
        onPieceDrop: onDrop,
        boardOrientation: playerColor === 'w' ? 'white' : 'black'
    }

    const isWhitesTurn = chess.turn() === 'w'
    const isBlacksTurn = chess.turn() === 'b'

    return (
        <div className="board-page">
            {showSetup && (
                <div className="setup-overlay">
                    <div className="setup-box setup-theme">
                        <h2>New game</h2>

                        <div className="setup-row">
                            <span>Time control</span>
                            <div className="setup-row-buttons">
                                <button onClick={() => applyTimeControl("blitz")}>Blitz (3m)</button>
                                <button onClick={() => applyTimeControl("rapid")}>Rapid (10m)</button>
                                <button onClick={() => applyTimeControl("unlimited")}>Unlimited</button>
                            </div>
                        </div>

                        <div className="setup-row">
                            <span>Play as</span>
                            <div className="setup-row-buttons">
                                <button onClick={() => updatePlayerColor('w')}>White</button>
                                <button onClick={() => updatePlayerColor('b')}>Black</button>
                            </div>
                        </div>

                        <button className="primary-button" onClick={handleStartGame}>
                            Start game
                        </button>
                    </div>
                </div>
            )}

            <div className="board-layout">
                <div className="side-timer side-timer-left">
                    <div className={`timer-card white ${isWhitesTurn ? 'active' : ''}`}>
                        <span className="timer-label">White</span>
                        <span className="timer-value">
                            {whiteTime === Infinity ? "∞" : `${whiteTime}s`}
                        </span>
                    </div>
                </div>

                <div className="center-column">
                    <div id="board" className="board-wrapper">
                        <Chessboard options={options} />
                    </div>
                </div>

                <div className="side-panel">
                    <div className={`timer-card black ${isBlacksTurn ? 'active' : ''}`}>
                        <span className="timer-label">Black</span>
                        <span className="timer-value">
                            {blackTime === Infinity ? "∞" : `${blackTime}s`}
                        </span>
                    </div>

                    <div className="history-panel">
                        {moveHistory.length === 0 && <div className="history-empty">No moves yet</div>}
                        {moveHistory.length > 0 && (() => {
                            const rows: JSX.Element[] = []
                            for (let i = 0; i < moveHistory.length; i += 2) {
                                const moveNumber = i / 2 + 1
                                const whiteMove = moveHistory[i]
                                const blackMove = moveHistory[i + 1]
                                rows.push(
                                    <div key={i} className="history-row">
                                        <span className="history-move-number">{moveNumber}.</span>
                                        <span className="history-move">{whiteMove}</span>
                                        {blackMove && <span className="history-move">{blackMove}</span>}
                                    </div>
                                )
                            }
                            return rows
                        })()}
                    </div>

                    <button className="primary-button new-game-button" onClick={handleNewGame}>
                        New game
                    </button>
                </div>
            </div>
        </div>
    )
}
