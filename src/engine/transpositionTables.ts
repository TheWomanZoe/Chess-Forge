export type TTFlag = 'exact' | 'lowerbound' | 'upperbound'

export interface TTEntry {
    hash: bigint
    depth: number
    score: number
    flag: TTFlag
    bestMove?: string
}

export class TranspositionTable {
    private table: (TTEntry | null)[]
    private size: number
    private hits: number = 0
    private misses: number = 0

    constructor(sizeMB: number) {
        this.size = Math.floor((sizeMB * 1024 * 1024) / 32)
        this.table = new Array(this.size).fill(null)
        console.log(`Transposition Table initialized with size: ${this.size} entries (${sizeMB} MB)`)
    }

    private getIndex(hash: bigint): number {
        return Number(hash % BigInt(this.size))
    }

    store(hash: bigint, depth: number, score: number, flag: TTFlag, bestMove?: string) {
        const index = this.getIndex(hash)
        const existing = this.table[index]

        if (!existing || depth >= existing.depth)
            this.table[index] = { hash, depth, score, flag, bestMove }
    }

    probe(hash: bigint, depth: number, alpha: number, beta: number): number | null {
        const index = this.getIndex(hash)
        const entry = this.table[index]

        if (!entry || entry.hash !== hash) {
            this.misses++
            return null
        }

        if (entry.depth < depth) {
            this.misses++
            return null
        }

        this.hits++

        if (entry.flag === 'exact')
            return entry.score
        if (entry.flag === 'lowerbound' && entry.score >= beta)
            return entry.score
        if (entry.flag === 'upperbound' && entry.score <= alpha)
            return entry.score

        return null
    }

    getBestMove(hash: bigint): string | null {
        const index = this.getIndex(hash)
        const entry = this.table[index]

        if (!entry || entry.hash !== hash)
            return null

        return entry.bestMove || null
    }

    clear() {
        this.table.fill(null)
        this.hits = 0
        this.misses = 0
    }

    getStats() {
        const total = this.hits + this.misses
        const hitRate = total > 0 ? (this.hits / total * 100).toFixed(1) : '0.0'

        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: `${hitRate}%`,
            size: this.size
        }
    }
}