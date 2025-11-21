import { useEffect, useRef, useState } from 'react'
import { Chess } from "chess.js"
import { Chessboard, type PieceDropHandlerArgs, type ChessboardOptions} from 'react-chessboard'
import EngineWorker from './engineWorker?worker'

const chess = new Chess()

export function Board(){
    const workerRef = useRef<Worker | null>(null)
    const engineStartTimeRef = useRef<number | null>(null)
    const engineSideRef = useRef<'w' | 'b' | null>(null)
    const [position, updatePosition] = useState(chess.fen())
    const [playerColor, updatePlayerColor] = useState<'w' | 'b'>('w')
    const [isThinking, updateIsThinking] = useState(false)
    const [timeControl, updateTimeControl] = useState<'blitz' | 'rapid' | 'unlimited'>('blitz')
    const [whiteTime, updateWhiteTime] = useState(180)
    const [blackTime, updateBlackTime] = useState(180)
    const [gameOver, updateGameOver] = useState(false)
    const [depth, updateDepth] = useState(4)

    const applyTimeControl = (tc: 'blitz' | 'rapid' | 'unlimited') => {
        updateTimeControl(tc)

        switch (tc) {
            case 'blitz':
                updateWhiteTime(180)
                updateBlackTime(180)
                break
            case 'rapid':
                updateWhiteTime(600)
                updateBlackTime(600)
                break
            case 'unlimited':
                updateWhiteTime(Infinity)
                updateBlackTime(Infinity)
                break
        }
    }

    useEffect(() => {
        if (gameOver)
            return
        if (timeControl === 'unlimited')
            return

        const interval = setInterval(() => {
            if (chess.turn() === playerColor) {
                if (chess.turn() === 'w') {
                    updateWhiteTime((time) => {
                        if (time <= 1) {
                            updateGameOver(true)
                            alert('Black wins on time!')
                            return 0
                        }
                        return time - 1
                    })
                }

                if (chess.turn() === 'b') {
                    updateBlackTime((time) => {
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
    }, [chess.turn(), isThinking, timeControl, gameOver])

    useEffect(() => {
        workerRef.current = new EngineWorker()

        workerRef.current.onmessage = (event) => {
            const { ok, response, error } = event.data

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
                return
            }

            if (side === 'w') {
                updateWhiteTime(prev => {
                    const remaining = prev - elapsedTime
                    if (remaining <= 0) {
                        updateGameOver(true)
                        alert('Black wins on time!')
                        return 0
                    }
                    return remaining
                })
            } else if (side === 'b') {
                updateBlackTime(prev => {
                    const remaining = prev - elapsedTime
                    if (remaining <= 0) {
                        updateGameOver(true)
                        alert('White wins on time!')
                        return 0
                    }
                    return remaining
                })
            }

            if (gameOver)
                return

            const { move, eval: evalScore } = response
            try {
                chess.move(move)
                if (chess.isGameOver())
                    updateGameOver(true)

                updatePosition(chess.fen())
            } catch (error) {
                console.log('Failed to make engine move:', error)
            }
        }

        return () => {
            workerRef.current?.terminate()
            workerRef.current = null
        }
    }, [])

    const EngineToPlay = (depth = 4) => {
        if (!workerRef.current)
            return

        engineSideRef.current = chess.turn() as 'w' | 'b'
        engineStartTimeRef.current = Date.now()

        updateIsThinking(true)
        workerRef.current.postMessage({ fen: chess.fen(), depth })
    }

    useEffect(() => {
        if (chess.turn() !== playerColor && !chess.isGameOver())
            EngineToPlay(depth)
    }, [playerColor])

    const onDrop = ({sourceSquare, targetSquare}: PieceDropHandlerArgs) => {
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
                EngineToPlay(depth)
            }
        } catch (error) {

        }

        return false
    }

    const SwitchColor = () => {
        const newColor = playerColor === 'w' ? 'b' : 'w'
        updatePlayerColor(newColor)

        chess.reset()
        engineStartTimeRef.current = null
        engineSideRef.current = null
        updatePosition(chess.fen())
        updateGameOver(false)
        applyTimeControl(timeControl)

        if (newColor === 'b')
            EngineToPlay(depth)
    }

    const options: ChessboardOptions = {
        position: position,
        onPieceDrop: onDrop,
        boardOrientation: playerColor === 'w' ? 'white' : 'black'
    }

    return (
        <div>
            <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                <button onClick={() => applyTimeControl("blitz")}>Blitz (3m)</button>
                <button onClick={() => applyTimeControl("rapid")}>Rapid (10m)</button>
                <button onClick={() => applyTimeControl("unlimited")}>Unlimited</button>
            </div>

            <div style={{marginBottom: '10px'}}>
                <b>White:</b> {whiteTime === Infinity ? "∞" : whiteTime}s
                <br/>
                <b>Black:</b> {blackTime === Infinity ? "∞" : blackTime}s
            </div>
            <button onClick={SwitchColor}>
                Switch to {playerColor === 'w' ? 'Black' : 'White'}
            </button>
            <Chessboard options={options}/>
        </div>
    )
}