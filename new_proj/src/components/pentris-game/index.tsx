"use client"

import { useEffect, useState, useCallback } from "react"
import styles from "./styles.module.css"

const GRID_WIDTH = 12
const GRID_HEIGHT = 24
const INITIAL_SPEED = 200
const SPEED_INCREASE = 0.95

// 5블록 펜토미노 모양 정의
const PENTOMINOES = [
    // I 모양
    [[1, 1, 1, 1, 1]],
    // L 모양
    [[1, 0, 0, 0], [1, 1, 1, 1]],
    // T 모양
    [[1, 1, 1], [0, 1, 0], [0, 1, 0]],
    // U 모양
    [[1, 0, 1], [1, 1, 1]],
    // X 모양
    [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
    // P 모양
    [[1, 1], [1, 1], [1, 0]],
    // Z 모양
    [[1, 1, 0], [0, 1, 0], [0, 1, 1]],
    // F 모양
    [[0, 1, 1], [1, 1, 0], [0, 1, 0]],
    // Y 모양
    [[0, 1], [1, 1], [0, 1], [0, 1]],
    // N 모양
    [[1, 0], [1, 0], [1, 1], [0, 1]]
]

export function PentrisGame() {
    const [grid, setGrid] = useState<number[][]>(Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0)))
    const [currentPiece, setCurrentPiece] = useState<number[][]>([])
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [gameOver, setGameOver] = useState(false)
    const [gameStarted, setGameStarted] = useState(false)
    const [score, setScore] = useState(0)
    const [gameSpeed, setGameSpeed] = useState(INITIAL_SPEED)


    const checkCollision = useCallback((piece: number[][], pos: { x: number, y: number }) => {
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (piece[y][x]) {
                    const newX = pos.x + x
                    const newY = pos.y + y
                    if (
                        newX < 0 ||
                        newX >= GRID_WIDTH ||
                        newY >= GRID_HEIGHT ||
                        (newY >= 0 && grid[newY][newX])
                    ) {
                        return true
                    }
                }
            }
        }
        return false
    }, [grid])

    const generatePiece = useCallback(() => {
        const piece = PENTOMINOES[Math.floor(Math.random() * PENTOMINOES.length)]
        setCurrentPiece(piece)
        const startX = Math.floor((GRID_WIDTH - piece[0].length) / 2)
        const startY = 0
        if (!checkCollision(piece, { x: startX, y: startY })) {
            setPosition({ x: startX, y: startY })
        } else {
            setGameOver(true)
        }
    }, [checkCollision])

    const rotatePiece = useCallback((piece: number[][]) => {
        const newPiece = Array(piece[0].length).fill(0)
            .map((_, i) => piece.map(row => row[piece[0].length - 1 - i]))
        return newPiece
    }, [])

    const mergePiece = useCallback(() => {
        setGrid(prevGrid => {
            const newGrid = prevGrid.map(row => [...row])
            for (let y = 0; y < currentPiece.length; y++) {
                for (let x = 0; x < currentPiece[y].length; x++) {
                    if (currentPiece[y][x] && position.y + y >= 0) {
                        newGrid[position.y + y][position.x + x] = currentPiece[y][x]
                    }
                }
            }
            return newGrid
        })
    }, [currentPiece, position])

    const clearLines = useCallback(() => {
        setGrid(prevGrid => {
            const newGrid = prevGrid.filter(row => row.some(cell => !cell))
            const clearedLines = GRID_HEIGHT - newGrid.length
            const newRows = Array(clearedLines).fill(0).map(() => Array(GRID_WIDTH).fill(0))
            if (clearedLines > 0) {
                setScore(prev => prev + clearedLines * 100)
                setGameSpeed(prev => prev * SPEED_INCREASE)
            }
            return [...newRows, ...newGrid]
        })
    }, [])

    const moveDown = useCallback(() => {
        const newPos = { ...position, y: position.y + 1 }
        if (!checkCollision(currentPiece, newPos)) {
            setPosition(newPos)
        } else {
            mergePiece()
            clearLines()
            generatePiece()
        }
    }, [checkCollision, currentPiece, position, mergePiece, clearLines, generatePiece])

    const startGame = useCallback(() => {
        setGrid(Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0)))
        setGameStarted(true)
        setGameOver(false)
        setScore(0)
        setGameSpeed(INITIAL_SPEED)
        generatePiece()
    }, [generatePiece])

    useEffect(() => {

        const handleKeyPress = (e: KeyboardEvent) => {
            if ((!gameStarted || gameOver) && e.key === "Enter") {
                startGame();
                return;
            }
            switch (e.key) {
                case "ArrowLeft": {
                    const newPos = { ...position, x: position.x - 1 }
                    if (!checkCollision(currentPiece, newPos)) setPosition(newPos)
                    break
                }
                case "ArrowRight": {
                    const newPos = { ...position, x: position.x + 1 }
                    if (!checkCollision(currentPiece, newPos)) setPosition(newPos)
                    break
                }
                case "ArrowDown": {
                    moveDown()
                    break
                }
                case "ArrowUp": {
                    const rotated = rotatePiece(currentPiece)
                    if (!checkCollision(rotated, position)) setCurrentPiece(rotated)
                    break
                }
            }
        }

        const gameInterval = setInterval(() => {
            const newPos = { ...position, y: position.y + 1 }
            if (!checkCollision(currentPiece, newPos)) {
                setPosition(newPos)
            } else {
                if (position.y <= 0) {
                    setGameOver(true)
                    return
                }
                mergePiece()
                clearLines()
                generatePiece()
            }
        }, gameSpeed)

        window.addEventListener("keydown", handleKeyPress)
        return () => {
            clearInterval(gameInterval)
            window.removeEventListener("keydown", handleKeyPress)
        }
    }, [
        gameStarted,
        gameOver,
        currentPiece,
        position,
        checkCollision,
        moveDown,
        rotatePiece,
        mergePiece,
        clearLines,
        generatePiece,
        gameSpeed
    ])

    if (!gameStarted) {
        return (
            <div className={styles.container}>
                <div className={styles.startScreen}>
                    <h1 className={styles.title}>PENTRIS</h1>
                    <div className={styles.blinkingText}>PRESS ENTER TO START</div>
                    <div className={styles.instructions}>
                        <p>← → : Move</p>
                        <p>↑ : Rotate</p>
                        <p>↓ : Soft Drop</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.gameBoard}>
                <div className={styles.score}>SCORE: {score}</div>
                {grid.map((row, y) =>
                    row.map((cell, x) => (
                        <div
                            key={`${y}-${x}`}
                            className={`${styles.cell} ${cell ? styles.filled : ''}`}
                            style={{
                                left: `${(x * 100) / GRID_WIDTH}%`,
                                top: `${(y * 100) / GRID_HEIGHT}%`,
                                width: `${100 / GRID_WIDTH}%`,
                                height: `${100 / GRID_HEIGHT}%`
                            }}
                        />
                    ))
                )}
                {currentPiece.map((row, y) =>
                    row.map((cell, x) =>
                        cell ? (
                            <div
                                key={`piece-${y}-${x}`}
                                className={styles.cell}
                                style={{
                                    left: `${((position.x + x) * 100) / GRID_WIDTH}%`,
                                    top: `${((position.y + y) * 100) / GRID_HEIGHT}%`,
                                    width: `${100 / GRID_WIDTH}%`,
                                    height: `${100 / GRID_HEIGHT}%`
                                }}
                            />
                        ) : null
                    )
                )}
                {gameOver && (
                    <div className={styles.gameOver}>
                        <h2>GAME OVER</h2>
                        <p>Score: {score}</p>
                        <div className={styles.blinkingText}>PRESS ENTER TO RETRY</div>
                    </div>
                )}
            </div>
        </div>
    )
}