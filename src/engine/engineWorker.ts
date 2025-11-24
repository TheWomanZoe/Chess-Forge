import { EngineMove } from "./engine.ts"

//worker message handler
onmessage = (event) => {
    const { fen, depth, jobID } = event.data

    //execute engine move calculation
    try {
        const response = EngineMove(fen, depth)
        postMessage({ ok: true, response: response, jobID: jobID })
    } catch (error) {
        postMessage({ ok: false, error: String(error), jobID: jobID })
    }
}