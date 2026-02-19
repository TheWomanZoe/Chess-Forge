class Random {
    private state: bigint

    constructor(seed: number) {
        this.state = BigInt(seed)
    }

    next64(): bigint {
        this.state = (this.state * 6364136223846793005n + 1442695040888963407n) & ((1n << 64n) - 1n)
        return this.state
    }
}

export class ZobristKeys {
    pieces: bigint[][]
    castling: bigint[]
    enPassant: bigint[]
    blackToMove: bigint

    constructor(seed: number = 42069) {
        const rng = new Random(seed)

        this.pieces = []
        for (let piece = 0; piece < 12; piece++) {
            this.pieces[piece] = []
            for (let square = 0; square < 64; square++) {
                this.pieces[piece][square] = rng.next64()
            }
        }

        this.castling = []
        for (let i = 0; i < 4; i++) {
            this.castling[i] = rng.next64()
        }

        this.enPassant = []
        for (let i = 0; i < 8; i++) {
            this.enPassant[i] = rng.next64()
        }

        this.blackToMove = rng.next64()
    }

    getPieceIndex(color: 'w' | 'b', type: string): number {
        const pieceMap: { [key: string]: number } = {
            'p': 0, 'n': 1, 'b': 2, 'r': 3, 'q': 4, 'k': 5
        };
        const offset = color === 'w' ? 0 : 6;
        return pieceMap[type] + offset;
    }

    squareToIndex(square: string) {
        const file = square.charCodeAt(0) - 'a'.charCodeAt(0)
        const rank = parseInt(square[1], 10) - 1
        return rank * 8 + file
    }
}

export function computeZobristHash(chess: any, keys: ZobristKeys): bigint {
    let hash = 0n

    const board = chess.board()
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const piece = board[rank][file]
            if (piece) {
                const pieceIndex = keys.getPieceIndex(piece.color, piece.type)
                const squareIndex = keys.squareToIndex(piece.square)
                hash ^= keys.pieces[pieceIndex][squareIndex]
            }
        }
    }

    const fen = chess.fen()
    const castlingString = fen.split(' ')[2]
    if (castlingString.includes('K')) hash ^= keys.castling[0]
    if (castlingString.includes('Q')) hash ^= keys.castling[1]
    if (castlingString.includes('k')) hash ^= keys.castling[2]
    if (castlingString.includes('q')) hash ^= keys.castling[3]

    const enPassantSquare = fen.split(' ')[3]
    if (enPassantSquare !== '-') {
        const file = enPassantSquare.charCodeAt(0) - 'a'.charCodeAt(0)
        hash ^= keys.enPassant[file]
    }

    if (chess.turn() === 'b') {
        hash ^= keys.blackToMove
    }

    return hash
}