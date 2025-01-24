"use client"

import { useEffect, useState, useCallback } from "react"
import styles from "./styles.module.css"

type Position = {
  x: number
  y: number
}

const GRID_SIZE = 20
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 }
]
const INITIAL_DIRECTION = { x: 0, y: -1 }
const INITIAL_GAME_SPEED = 200
const SPEED_INCREASE = 0.95
const RAINBOW_COLORS = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3']

export function SnakeGame() {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE)
  const [direction, setDirection] = useState<Position>(INITIAL_DIRECTION)
  const [food, setFood] = useState<Position>({ x: 15, y: 15 })
  const [gameOver, setGameOver] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameSpeed, setGameSpeed] = useState(INITIAL_GAME_SPEED)
  const [score, setScore] = useState(0)
  const [foodColorIndex, setFoodColorIndex] = useState(0)
  const [gameWon, setGameWon] = useState(false)

  const generateFood = useCallback(() => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    }
  }, [])

  const startGame = useCallback(() => {
    setGameStarted(true)
    setSnake(INITIAL_SNAKE)
    setDirection(INITIAL_DIRECTION)
    setFood({ x: 15, y: 15 })
    setGameOver(false)
    setGameWon(false)
    setGameSpeed(INITIAL_GAME_SPEED)
    setScore(0)
    setFoodColorIndex(0)
  }, [])

  const moveSnake = useCallback(() => {
    if (gameOver || gameWon || !gameStarted) return

    setSnake(currentSnake => {
      const newHead = {
        x: currentSnake[0].x + direction.x,
        y: currentSnake[0].y + direction.y
      }

      // Wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameOver(true)
        return currentSnake
      }

      // Self collision
      if (currentSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true)
        return currentSnake
      }

      const newSnake = [newHead, ...currentSnake]
      
      if (newHead.x === food.x && newHead.y === food.y) {
        setFood(generateFood())
        setScore(prev => prev + 1)
        setGameSpeed(prev => prev * SPEED_INCREASE)
        setFoodColorIndex(prev => (prev + 1) % RAINBOW_COLORS.length)
        
        // Win condition
        if (newSnake.length === GRID_SIZE * GRID_SIZE) {
          setGameWon(true)
          return newSnake
        }
      } else {
        newSnake.pop()
      }

      return newSnake
    })
  }, [direction, food, gameOver, generateFood, gameStarted, gameWon])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((!gameStarted || gameOver || gameWon) && e.key === "Enter") {
        startGame()
        return
      }

      if (!gameStarted) return

      switch (e.key) {
        case "ArrowUp":
          setDirection(prev => prev.y === 1 ? prev : { x: 0, y: -1 })
          break
        case "ArrowDown":
          setDirection(prev => prev.y === -1 ? prev : { x: 0, y: 1 })
          break
        case "ArrowLeft":
          setDirection(prev => prev.x === 1 ? prev : { x: -1, y: 0 })
          break
        case "ArrowRight":
          setDirection(prev => prev.x === -1 ? prev : { x: 1, y: 0 })
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    const gameInterval = setInterval(moveSnake, gameSpeed)

    return () => {
      window.removeEventListener("keydown", handleKeyPress)
      clearInterval(gameInterval)
    }
  }, [moveSnake, gameStarted, gameSpeed, startGame, gameOver, gameWon])

  if (!gameStarted) {
    return (
      <div className={styles.container}>
        <div className={styles.startScreen}>
          <h1 className={styles.title}>SNAKE GAME</h1>
          <div className={styles.blinkingText}>PRESS ENTER KEY TO START</div>
          <div className={styles.instructions}>
            <p>Use arrow keys to control the snake</p>
            <p>Eat food to grow and speed up</p>
            <p>Don&apos;t hit walls or yourself!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameBoard}>
        <div className={styles.score}>SCORE: {score}</div>
        {snake.map((segment, i) => (
          <div
            key={i}
            className={styles.snakeSegment}
            style={{
              left: `${(segment.x * 100) / GRID_SIZE}%`,
              top: `${(segment.y * 100) / GRID_SIZE}%`
            }}
          />
        ))}
        <div
          className={styles.food}
          style={{
            left: `${(food.x * 100) / GRID_SIZE}%`,
            top: `${(food.y * 100) / GRID_SIZE}%`,
            backgroundColor: RAINBOW_COLORS[foodColorIndex]
          }}
        />
        {(gameOver || gameWon) && (
          <div className={styles.gameOver}>
            <h2>{gameWon ? "YOU WIN!" : "GAME OVER"}</h2>
            <p>Score: {score}</p>
            <div className={styles.blinkingText}>PRESS ENTER TO RETRY</div>
          </div>
        )}
      </div>
    </div>
  )
}