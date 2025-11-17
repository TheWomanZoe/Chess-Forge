import { useEffect, useRef, useState } from 'react'
import { Chess } from "chess.js"
import { Chessboard, type PieceDropHandlerArgs } from 'react-chessboard'
import EngineWorker from './engineWorker?worker'

const chess = new Chess()

export function Board(){
    const workerRef = useRef<Worker | null>(null)
    const [position, updatePosition] = useState(chess.fen())
    const [evaluation, updateEval] = useState<number | null>(null)

    useEffect(() => {
        workerRef.current = new EngineWorker()

        workerRef.current.onmessage = (event) => {
            const { ok, response, error } = event.data

            if (!ok) {
                console.error("Engine Worker Error: ", error)
                return
            }

            const { move, eval: evalScore } = response
            try {
                chess.move(move)
                updatePosition(chess.fen())
                updateEval(Number(evalScore))
            } catch (error) {
                console.log('Failed to make engine move:', error)
            }
        }

        return () => {
            workerRef.current?.terminate()
        }
    }, [])

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
                workerRef.current?.postMessage({ fen: chess.fen(), depth: 3 })
            }
        } catch (error) {
            console.log('Failed to make engine move:', error)
        }

        return false
    }

    const options = {
        position: position,
        onPieceDrop: onDrop
    }

    return (
        <div>
            <h1>Evaluation: {evaluation / 10}</h1>
            <Chessboard options={options}/>
        </div>
    )
}