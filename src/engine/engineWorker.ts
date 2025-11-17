import { EngineMove } from "./engine.ts"

onmessage = (event) => {
    const { fen, depth } = event.data

    try {
        const response = EngineMove(fen, depth)
        postMessage({ ok: true, response: response })
    } catch (error) {
        postMessage({ ok: false, error: String(error) })
    }
}