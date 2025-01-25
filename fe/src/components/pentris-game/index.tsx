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
  [[1], [1], [1], [1], [1]],
  // L 모양
  [[1, 0], [1, 0], [1, 0], [1, 1]],
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
  // Y 모양
  [[1, 0], [1, 1], [1, 0], [1, 0]],
  // W 모양
  [[1, 0, 0], [1, 1, 0], [0, 1, 1]],
  // F 모양
  [[0, 1, 1], [1, 1, 0], [0, 1, 0]]
]

// 블록 색상 배열 추가
const BLOCK_COLORS = [
  { bg: '#FF0000', border: '#CC0000' }, // 빨강
  { bg: '#FF7F00', border: '#CC6600' }, // 주황
  { bg: '#FFFF00', border: '#CCCC00' }, // 노랑
  { bg: '#00FF00', border: '#00CC00' }, // 초록
  { bg: '#0066FF', border: '#0052CC' }, // 파랑
  { bg: '#0000FF', border: '#0000CC' }, // 남색
  { bg: '#8B00FF', border: '#6600CC' }, // 보라
];

export function PentrisGame() {
  const [grid, setGrid] = useState<number[][]>(Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0)));
  const [currentPiece, setCurrentPiece] = useState(() => {
    const piece = PENTOMINOES[Math.floor(Math.random() * PENTOMINOES.length)];
    return piece;
  });
  const [position, setPosition] = useState(() => {
    const piece = PENTOMINOES[Math.floor(Math.random() * PENTOMINOES.length)];
    return { x: Math.floor((GRID_WIDTH - piece[0].length) / 2), y: 0 };
  });
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(INITIAL_SPEED);
  const [currentColor, setCurrentColor] = useState(() => BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)]);

  const generatePiece = () => {
    const piece = PENTOMINOES[Math.floor(Math.random() * PENTOMINOES.length)]
    const startX = Math.floor((GRID_WIDTH - piece[0].length) / 2)
    // 새로운 색상 선택
    const newColor = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)]
    setCurrentColor(newColor)
    setCurrentPiece(piece)
    setPosition({ x: startX, y: 0 })
  }
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
            newGrid[position.y + y][position.x + x] = BLOCK_COLORS.indexOf(currentColor) + 1
          }
        }
      }
      return newGrid
    })
  }, [currentPiece, position, currentColor])

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
    if (!gameStarted || gameOver) return;
    
    const newPos = { ...position, y: position.y + 1 };
    if (!checkCollision(currentPiece, newPos)) {
      setPosition(newPos);
    } else {
      if (position.y <= 0) {
        setGameOver(true);
        return;
      }
      mergePiece();
      clearLines();
      generatePiece();
    }
  }, [gameStarted, gameOver, position, currentPiece, checkCollision, mergePiece, clearLines, generatePiece]);

  // hardDrop 함수 수정
  const hardDrop = useCallback(() => {
    if (!gameStarted || gameOver) return;
    
    let newY = position.y;
    // 바닥 위치 찾기
    while (!checkCollision(currentPiece, { x: position.x, y: newY + 1 })) {
      newY++;
    }
    
    // 현재 블록과 위치 임시 저장
    const pieceToMerge = currentPiece;
    const finalPosition = { x: position.x, y: newY };
    
    // 위치 업데이트
    setPosition(finalPosition);
    
    // 다음 프레임에서 병합 및 다음 블록 생성
    setTimeout(() => {
      setGrid(prevGrid => {
        const newGrid = prevGrid.map(row => [...row]);
        for (let y = 0; y < pieceToMerge.length; y++) {
          for (let x = 0; x < pieceToMerge[y].length; x++) {
            if (pieceToMerge[y][x] && finalPosition.y + y >= 0) {
              newGrid[finalPosition.y + y][finalPosition.x + x] = BLOCK_COLORS.indexOf(currentColor) + 1;
            }
          }
        }
        return newGrid;
      });
      
      clearLines();
      generatePiece();
    }, 50);
    
  }, [
    gameStarted, 
    gameOver, 
    position, 
    currentPiece, 
    checkCollision, 
    currentColor,
    clearLines, 
    generatePiece
  ]);
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameInterval = setInterval(() => {
      moveDown();
    }, gameSpeed);

    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver) return;

      switch (e.key) {
        case "ArrowLeft": {
          const newPos = { ...position, x: position.x - 1 };
          if (!checkCollision(currentPiece, newPos)) setPosition(newPos);
          break;
        }
        case "ArrowRight": {
          const newPos = { ...position, x: position.x + 1 };
          if (!checkCollision(currentPiece, newPos)) setPosition(newPos);
          break;
        }
        case "ArrowDown": {
          moveDown();
          break;
        }
        case "ArrowUp": {
          const rotated = rotatePiece(currentPiece);
          if (!checkCollision(rotated, position)) setCurrentPiece(rotated);
          break;
        }
        case " ": {
          hardDrop();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    
    return () => {
      clearInterval(gameInterval);
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [
    gameStarted,
    gameOver,
    gameSpeed,
    position,
    currentPiece,
    moveDown,
    checkCollision,
    rotatePiece,
    hardDrop
  ]);

  const startGame = useCallback(() => {
    const initialPiece = PENTOMINOES[Math.floor(Math.random() * PENTOMINOES.length)];
    const startX = Math.floor((GRID_WIDTH - initialPiece[0].length) / 2);
    const initialColor = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
    
    requestAnimationFrame(() => {
      setGrid(Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0)));
      setCurrentPiece(initialPiece);
      setPosition({ x: startX, y: 0 });
      setCurrentColor(initialColor);
      setGameStarted(true);
      setGameOver(false);
      setScore(0);
      setGameSpeed(INITIAL_SPEED);
    });
  }, []);

  // 게임 시작용 useEffect 수정
  useEffect(() => {
    const handleStart = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (!gameStarted || gameOver)) {
        e.preventDefault();  // 기본 동작 방지
        startGame();
      }
    };

    window.addEventListener("keydown", handleStart);
    return () => window.removeEventListener("keydown", handleStart);
  }, [gameStarted, gameOver, startGame]);

  const getDropPosition = useCallback(() => {
    let y = position.y;
    while (!checkCollision(currentPiece, { x: position.x, y: y + 1 })) {
      y++;
    }
    return { x: position.x, y };
  }, [position.x, position.y, currentPiece, checkCollision]);


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
                height: `${100 / GRID_HEIGHT}%`,
                ...(cell ? {
                  backgroundColor: BLOCK_COLORS[cell - 1].bg,
                  border: `1px solid ${BLOCK_COLORS[cell - 1].border}`
                } : {})
              }}
            />
          ))
        )}
        {currentPiece.map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <div
                key={`piece-${y}-${x}`}
                className={`${styles.cell}`}
                style={{
                  left: `${((position.x + x) * 100) / GRID_WIDTH}%`,
                  top: `${((position.y + y) * 100) / GRID_HEIGHT}%`,
                  width: `${100 / GRID_WIDTH}%`,
                  height: `${100 / GRID_HEIGHT}%`,
                  backgroundColor: currentColor.bg,
                  border: `1px solid ${currentColor.border}`
                }}
              />
            ) : null
          )
        )}
        {/* 그림자 블록 */}
        {currentPiece.map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <div
                key={`shadow-${y}-${x}`}
                className={`${styles.cell}`}
                style={{
                  left: `${((position.x + x) * 100) / GRID_WIDTH}%`,
                  top: `${((getDropPosition().y + y) * 100) / GRID_HEIGHT}%`,
                  width: `${100 / GRID_WIDTH}%`,
                  height: `${100 / GRID_HEIGHT}%`,
                  backgroundColor: 'rgba(128, 128, 128, 0.3)',
                  border: '1px dashed gray'
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