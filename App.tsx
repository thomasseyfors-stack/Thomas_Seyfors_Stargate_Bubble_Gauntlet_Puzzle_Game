
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { OrbState, FiredOrbState, ParticleState, Vector2D, LevelData } from './types';
import { GameStatus } from './types';
import { GAME_WIDTH, GAME_HEIGHT, ORB_DIAMETER, ORB_RADIUS, GRID_COLS, ORB_COLORS, ORB_SYMBOLS, ORB_SPEED, SHOTS_BEFORE_CEILING_DROP, CEILING_ROW_LIMIT, LEVELS, NUM_CHEVRONS } from './constants';
import { playSfx, unlockAudio } from './sfx';

// --- Helper Functions ---
const getPositionFromGrid = (row: number, col: number): Vector2D => {
  const x = col * ORB_DIAMETER + (row % 2) * ORB_RADIUS + ORB_RADIUS * 3;
  const y = row * (ORB_DIAMETER - 6) + ORB_RADIUS;
  return { x, y };
};

const getDistance = (p1: Vector2D, p2: Vector2D) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

// --- Sub-Components ---
const Orb: React.FC<{ orb: OrbState | FiredOrbState }> = React.memo(({ orb }) => {
    const jiggleX = 'jiggle' in orb && orb.jiggle ? (Math.random() - 0.5) * (orb.jiggle / 2) : 0;
    const jiggleY = 'jiggle' in orb && orb.jiggle ? (Math.random() - 0.5) * (orb.jiggle / 2) : 0;

    return (
        <div
            style={{
                left: orb.position.x,
                top: orb.position.y,
                width: ORB_DIAMETER,
                height: ORB_DIAMETER,
                backgroundColor: ORB_COLORS[orb.color],
                transform: `translate(calc(-50% + ${jiggleX}px), calc(-50% + ${jiggleY}px))`,
                boxShadow: `inset 0 0 10px #000a, 0 0 10px ${ORB_COLORS[orb.color]}`,
            }}
            className="absolute rounded-full transition-all duration-100 flex items-center justify-center"
        >
            <span className="text-2xl text-black/50 font-bold select-none">
                {ORB_SYMBOLS[orb.color]}
            </span>
        </div>
    );
});

const ParticleComp: React.FC<{ state: ParticleState }> = React.memo(({ state }) => (
    <div
      style={{ left: state.position.x, top: state.position.y, backgroundColor: state.color, opacity: state.life / 30, width: state.size, height: state.size }}
      className="absolute rounded-full"
    />
));

const Chevron: React.FC<{ symbol: string; isLocked: boolean; angle: number; }> = React.memo(({ symbol, isLocked, angle }) => (
    <div className="absolute top-1/2 left-1/2 w-16 h-20 -m-8" style={{ transform: `rotate(${angle}deg) translate(280px)`}}>
        <div className={`w-full h-full bg-gray-600 transition-all duration-300 ${isLocked ? 'bg-orange-500 shadow-[0_0_15px_5px_rgba(255,165,0,0.7)]' : 'bg-gray-700'}`} style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'}}>
            <div className="text-center text-4xl mt-4 font-bold" style={{ transform: `rotate(${-angle}deg)`}}>
                {isLocked ? 'V' : symbol}
            </div>
        </div>
    </div>
));

const StargateFrame: React.FC<{lockedChevrons: Set<number>}> = React.memo(({ lockedChevrons }) => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-gray-800 border-[20px] border-gray-600 animate-[spin_120s_linear_infinite]">
             {ORB_SYMBOLS.slice(0, NUM_CHEVRONS).map((symbol, i) => (
                <Chevron key={i} symbol={symbol} isLocked={lockedChevrons.has(i)} angle={i * (360/NUM_CHEVRONS)} />
            ))}
        </div>
    </div>
));


const Launcher: React.FC<{ angle: number, currentOrbColor: string, nextOrbColor: string, currentOrbSymbol: string, nextOrbSymbol: string }> = React.memo(({ angle, currentOrbColor, nextOrbColor, currentOrbSymbol, nextOrbSymbol }) => (
    <>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-24 flex justify-center items-end" style={{ transformOrigin: '50% 100%', transform: `translateX(-50%) rotate(${angle}rad)`}}>
             <div className="w-8 h-24 bg-gray-600 border-2 border-gray-400 rounded-t-md relative">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: currentOrbColor, boxShadow: `0 0 10px ${currentOrbColor}`}}>
                     <span className="text-xl text-black/50 font-bold select-none">{currentOrbSymbol}</span>
                </div>
             </div>
        </div>
         <div className="absolute bottom-2 left-2 text-center z-20">
            <p className="text-xs">NEXT</p>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: nextOrbColor, boxShadow: `0 0 8px ${nextOrbColor}`}}>
                 <span className="text-lg text-black/50 font-bold select-none">{nextOrbSymbol}</span>
            </div>
        </div>
    </>
));

// --- Main App Component ---
export default function App() {
  const [status, setStatus] = useState<GameStatus>(GameStatus.StartScreen);
  const [levelIndex, setLevelIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [grid, setGrid] = useState<Map<string, OrbState>>(new Map());
  const [currentOrb, setCurrentOrb] = useState<FiredOrbState | null>(null);
  const [nextOrbColor, setNextOrbColor] = useState(0);
  const [firedOrb, setFiredOrb] = useState<FiredOrbState | null>(null);
  const [particles, setParticles] = useState<ParticleState[]>([]);
  const [fallingOrbs, setFallingOrbs] = useState<OrbState[]>([]);
  const [shotsUntilDrop, setShotsUntilDrop] = useState(SHOTS_BEFORE_CEILING_DROP);
  const [launcherAngle, setLauncherAngle] = useState(0);
  const [lockedChevrons, setLockedChevrons] = useState<Set<number>>(new Set());

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>();
  const prevChevronCount = useRef(0);

  const getAvailableColors = useCallback(() => {
    const colorsInGrid = new Set<number>();
    grid.forEach(orb => {
        if (orb.color < NUM_CHEVRONS) colorsInGrid.add(orb.color);
    });
    return colorsInGrid.size > 0 ? Array.from(colorsInGrid) : ORB_SYMBOLS.map((_, i) => i).slice(0, NUM_CHEVRONS);
  }, [grid]);

  const generateNewOrb = useCallback(() => {
    const availableColors = getAvailableColors();
    const newColor = availableColors[Math.floor(Math.random() * availableColors.length)];
    if (!currentOrb) {
        setCurrentOrb({ id: Date.now(), position: {x: GAME_WIDTH / 2, y: GAME_HEIGHT - 30}, velocity: {x: 0, y: 0}, color: nextOrbColor });
    }
    setNextOrbColor(newColor);
  }, [getAvailableColors, currentOrb, nextOrbColor]);


  const loadLevel = useCallback((index: number) => {
    const levelData = LEVELS[index];
    if (!levelData) return;
    const newGrid = new Map<string, OrbState>();
    levelData.layout.forEach((row, r) => {
      row.forEach((colorIndex, c) => {
        if (colorIndex !== null) {
          const pos = getPositionFromGrid(r, c);
          const orb: OrbState = { id: Math.random(), position: pos, color: colorIndex, gridPos: { row: r, col: c } };
          newGrid.set(`${r},${c}`, orb);
        }
      });
    });
    setGrid(newGrid);
    setShotsUntilDrop(SHOTS_BEFORE_CEILING_DROP);
    setCurrentOrb(null);
    setNextOrbColor(Math.floor(Math.random() * NUM_CHEVRONS));
    generateNewOrb();
    setLockedChevrons(new Set());
    setFallingOrbs([]);
    prevChevronCount.current = 0;
  }, [generateNewOrb]);
  
  const startGame = useCallback(() => {
    unlockAudio();
    setLevelIndex(0);
    setScore(0);
    loadLevel(0);
    setStatus(GameStatus.Playing);
  }, [loadLevel]);

  const createParticles = (position: Vector2D, count: number, color: string) => {
    const newParticles: ParticleState[] = [];
    for (let i = 0; i < count; i++) {
        newParticles.push({
            id: Math.random(),
            position: { ...position },
            velocity: { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 },
            life: 20 + Math.random() * 20,
            color: color,
            size: 2 + Math.random() * 4
        });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  const handleFire = useCallback(() => {
    if (firedOrb || !currentOrb) return;
    playSfx('fire');
    const angle = launcherAngle + Math.PI / 2;
    setFiredOrb({
        ...currentOrb,
        velocity: {
            x: -Math.cos(angle) * ORB_SPEED,
            y: -Math.sin(angle) * ORB_SPEED,
        }
    });
    setCurrentOrb(null);
    setShotsUntilDrop(prev => prev - 1);
  }, [firedOrb, currentOrb, launcherAngle]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
      if(!gameAreaRef.current) return;
      const rect = gameAreaRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const angle = Math.atan2(mouseY - (GAME_HEIGHT - 30), mouseX - GAME_WIDTH / 2);
      setLauncherAngle(angle - Math.PI / 2);
  }, []);

  const gameLoop = useCallback(() => {
    // Update particles
    setParticles(prev => prev.map(p => ({ ...p, position: {x: p.position.x + p.velocity.x, y: p.position.y + p.velocity.y}, life: p.life - 1})).filter(p => p.life > 0));

    // Update falling orbs
    setFallingOrbs(prev => prev.map(orb => ({ ...orb, position: {x: orb.position.x + orb.velocity!.x, y: orb.position.y + orb.velocity!.y}, velocity: {x: orb.velocity!.x, y: orb.velocity!.y + 0.2} })).filter(orb => orb.position.y < GAME_HEIGHT + ORB_DIAMETER));

    // Update jiggle effect
    setGrid(prevGrid => {
        const newGrid = new Map(prevGrid);
        let changed = false;
        // FIX: Explicitly type `orb` and `key` to handle TypeScript inference issue.
        newGrid.forEach((orb: OrbState, key) => {
            if (orb.jiggle && orb.jiggle > 0) {
                newGrid.set(key, {...orb, jiggle: orb.jiggle - 1});
                changed = true;
            }
        });
        return changed ? newGrid : prevGrid;
    });

    if (!firedOrb) {
        if (!currentOrb) generateNewOrb();
        animationFrameId.current = requestAnimationFrame(gameLoop);
        return;
    };

    let newOrb = { ...firedOrb };
    newOrb.position.x += newOrb.velocity.x;
    newOrb.position.y += newOrb.velocity.y;
    
    // Wall bounce
    if (newOrb.position.x < ORB_RADIUS + 120 || newOrb.position.x > GAME_WIDTH - ORB_RADIUS - 120) {
        newOrb.velocity.x *= -1;
    }

    let snapped = false;

    // Ceiling collision
    if (newOrb.position.y < ORB_RADIUS) {
        newOrb.position.y = ORB_RADIUS;
        snapped = true;
    }
    
    // Orb collision
    if(!snapped){
        for(const existingOrb of grid.values()){
            const dist = getDistance(newOrb.position, existingOrb.position);
            if(dist < ORB_DIAMETER){
                snapped = true;
                break;
            }
        }
    }

    if(snapped) {
        playSfx('snap');
        // Snap to grid
        const newGridPos = { row: 0, col: 0 };
        let minDist = Infinity;
        for (let r = 0; r < 20; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (!grid.has(`${r},${c}`)) {
                    const gridCenter = getPositionFromGrid(r, c);
                    const dist = getDistance(newOrb.position, gridCenter);
                    if (dist < minDist) {
                        minDist = dist;
                        newGridPos.row = r;
                        newGridPos.col = c;
                    }
                }
            }
        }

        const newOrbInGrid: OrbState = {
            id: newOrb.id,
            position: getPositionFromGrid(newGridPos.row, newGridPos.col),
            color: newOrb.color,
            gridPos: newGridPos,
        };
        
        const newGrid = new Map<string, OrbState>(grid);
        newGrid.set(`${newGridPos.row},${newGridPos.col}`, newOrbInGrid);
        
        // Jiggle neighbors
        const neighbors = getNeighbors(newGridPos.row, newGridPos.col);
        neighbors.forEach(key => {
            if (newGrid.has(key)) {
                const neighbor = newGrid.get(key)!;
                newGrid.set(key, {...neighbor, jiggle: 10});
            }
        });

        // Match checking
        const matches = findMatches(newGrid, newOrbInGrid);
        
        if (matches.length >= 3) {
            playSfx('match');
            const matchedColor = newOrbInGrid.color;
            setLockedChevrons(prev => new Set(prev).add(matchedColor));

            matches.forEach(orb => {
                newGrid.delete(`${orb.gridPos.row},${orb.gridPos.col}`);
                createParticles(orb.position, 10, ORB_COLORS[orb.color]);
            });
            setScore(s => s + matches.length * 10);
            
            const floaters = findFloatingOrbs(newGrid);
            if (floaters.length > 0) {
                 const newFallingOrbs = floaters.map(orb => {
                    newGrid.delete(`${orb.gridPos.row},${orb.gridPos.col}`);
                    return {...orb, velocity: {x: (Math.random() - 0.5) * 2, y: Math.random() * -2}};
                 });
                 setFallingOrbs(prev => [...prev, ...newFallingOrbs]);
                 setScore(s => s + floaters.length * 20);
            }
        }

        setGrid(newGrid);
        setFiredOrb(null);

        // Game over check
        if (newOrbInGrid.gridPos.row >= CEILING_ROW_LIMIT) {
             setStatus(GameStatus.GameOver);
             playSfx('game_over');
             return;
        }

    } else {
       setFiredOrb(newOrb);
    }
    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [firedOrb, grid, currentOrb, generateNewOrb]);

  // Win condition check
  useEffect(() => {
    if (lockedChevrons.size > prevChevronCount.current) {
        if (lockedChevrons.size === NUM_CHEVRONS) {
            playSfx('gate_open');
            setStatus(GameStatus.LevelClear);
            setTimeout(() => {
                const nextLevel = levelIndex + 1;
                if (nextLevel < LEVELS.length) {
                    setLevelIndex(nextLevel);
                    loadLevel(nextLevel);
                    setStatus(GameStatus.Playing);
                } else {
                    setStatus(GameStatus.GameOver); // Or a You Win screen
                    playSfx('game_over');
                }
            }, 3000);
        } else {
            playSfx('chevron_lock');
        }
    }
    prevChevronCount.current = lockedChevrons.size;
  }, [lockedChevrons, levelIndex, loadLevel]);

  // Handle ceiling drop
  useEffect(() => {
    if(status === GameStatus.Playing && shotsUntilDrop <= 0){
        setShotsUntilDrop(SHOTS_BEFORE_CEILING_DROP);
        setGrid(prevGrid => {
            const newGrid = new Map<string, OrbState>();
            let maxRow = 0;
            prevGrid.forEach(orb => {
                const newRow = orb.gridPos.row + 1;
                if (newRow > maxRow) maxRow = newRow;
                const newOrb = { ...orb, gridPos: { ...orb.gridPos, row: newRow }, position: getPositionFromGrid(newRow, orb.gridPos.col) };
                newGrid.set(`${newRow},${orb.gridPos.col}`, newOrb);
            });
             if (maxRow >= CEILING_ROW_LIMIT) {
                 setStatus(GameStatus.GameOver);
                 playSfx('game_over');
             }
            return newGrid;
        });
    }
  }, [shotsUntilDrop, status]);

  useEffect(() => {
    if (status === GameStatus.Playing) {
      animationFrameId.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    }
  }, [status, gameLoop]);


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold text-cyan-400 mb-4 tracking-widest">STARGATE: BUBBLE GAUNTLET</h1>
      <div 
        className="relative bg-black border-4 border-gray-600 shadow-2xl shadow-cyan-500/20" 
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      >
        <StargateFrame lockedChevrons={lockedChevrons} />
        <div 
            ref={gameAreaRef}
            className="absolute inset-0"
            style={{clipPath: 'circle(42% at 50% 50%)'}}
            onMouseMove={handleMouseMove}
            onClick={handleFire}
        >
            {status === GameStatus.StartScreen && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 text-center p-8">
                    <h2 className="text-5xl mb-4 text-yellow-400">MISSION BRIEFING</h2>
                    <p className="mb-2">Lock all 7 chevrons to activate the Stargate!</p>
                    <p className="mb-6">Match 3 or more symbols to lock the corresponding chevron.</p>
                    <p className="font-bold mb-2">CONTROLS:</p>
                    <p>Move Mouse: Aim Zat'nik'tel</p>
                    <p>Click: Fire Energy Orb</p>
                    <button onClick={startGame} className="mt-8 px-8 py-4 bg-cyan-500 text-gray-900 font-bold text-2xl rounded-lg hover:bg-cyan-300 transition-colors shadow-lg shadow-cyan-500/50">
                        DIAL THE GATE
                    </button>
                </div>
            )}
            {status === GameStatus.LevelClear && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 text-center">
                    <h2 className="text-5xl text-cyan-400 z-20">GATE ACTIVATED</h2>
                    <p className="z-20">Proceeding to next gate address...</p>
                </div>
            )}
            {status === GameStatus.GameOver && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 text-center p-8">
                    <h2 className="text-6xl mb-4 text-red-500">UNSCHEDULED OFF-WORLD ACTIVATION</h2>
                    <p className="text-2xl mb-8">Your final score: {score}</p>
                    <button onClick={startGame} className="mt-8 px-8 py-4 bg-cyan-500 text-gray-900 font-bold text-2xl rounded-lg hover:bg-cyan-300 transition-colors shadow-lg shadow-cyan-500/50">
                        RE-ENGAGE
                    </button>
                </div>
            )}
            
            {Array.from(grid.values()).map((orb: OrbState) => <Orb key={orb.id} orb={orb} />)}
            {firedOrb && <Orb orb={firedOrb} />}
            {fallingOrbs.map((orb: OrbState) => <Orb key={orb.id} orb={orb} />)}
            {particles.map(p => <ParticleComp key={p.id} state={p} />)}
            
            {status === GameStatus.Playing && currentOrb && <Launcher angle={launcherAngle} currentOrbColor={ORB_COLORS[currentOrb.color]} nextOrbColor={ORB_COLORS[nextOrbColor]} currentOrbSymbol={ORB_SYMBOLS[currentOrb.color]} nextOrbSymbol={ORB_SYMBOLS[nextOrbColor]} />}
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-red-500/30" style={{top: (CEILING_ROW_LIMIT) * (ORB_DIAMETER - 6)}} />
        </div>
      </div>
      <div className="flex justify-between w-full text-2xl mt-4 px-2" style={{maxWidth: GAME_WIDTH}}>
        <div>SCORE: {score}</div>
        <div>CHEVRONS: {lockedChevrons.size} / {NUM_CHEVRONS}</div>
        <div>DROP IN: {shotsUntilDrop}</div>
      </div>
    </div>
  );
}

// --- Logic Helpers ---

const findMatches = (grid: Map<string, OrbState>, startOrb: OrbState): OrbState[] => {
    const toCheck: OrbState[] = [startOrb];
    const checked = new Set<string>();
    const matches: OrbState[] = [];

    while(toCheck.length > 0) {
        const current = toCheck.pop()!;
        const key = `${current.gridPos.row},${current.gridPos.col}`;
        if(checked.has(key)) continue;
        checked.add(key);
        
        if (current.color === startOrb.color) {
            matches.push(current);
            const neighbors = getNeighbors(current.gridPos.row, current.gridPos.col);
            neighbors.forEach(nKey => {
                const neighborOrb = grid.get(nKey);
                if(neighborOrb) toCheck.push(neighborOrb);
            });
        }
    }
    return matches;
}

const findFloatingOrbs = (grid: Map<string, OrbState>): OrbState[] => {
    const connected = new Set<string>();
    const toCheck: OrbState[] = [];
    
    // Find all orbs connected to the ceiling (row 0)
    grid.forEach(orb => {
        if(orb.gridPos.row === 0) toCheck.push(orb);
    });

    while(toCheck.length > 0){
        const current = toCheck.pop()!;
        const key = `${current.gridPos.row},${current.gridPos.col}`;
        if(connected.has(key)) continue;
        connected.add(key);

        const neighbors = getNeighbors(current.gridPos.row, current.gridPos.col);
        neighbors.forEach(nKey => {
            const neighborOrb = grid.get(nKey);
            if(neighborOrb) toCheck.push(neighborOrb);
        });
    }

    const floating: OrbState[] = [];
    grid.forEach(orb => {
        const key = `${orb.gridPos.row},${orb.gridPos.col}`;
        if(!connected.has(key)) floating.push(orb);
    });
    
    return floating;
}

const getNeighbors = (row: number, col: number): string[] => {
    const isEvenRow = row % 2 === 0;
    const neighbors: {r: number, c: number}[] = [
        {r: row, c: col - 1}, // left
        {r: row, c: col + 1}, // right
        {r: row - 1, c: col}, // top-middle
        {r: row + 1, c: col}, // bottom-middle
    ];

    if(isEvenRow){
        neighbors.push({r: row - 1, c: col - 1}); // top-left
        neighbors.push({r: row + 1, c: col - 1}); // bottom-left
    } else {
        neighbors.push({r: row - 1, c: col + 1}); // top-right
        neighbors.push({r: row + 1, c: col + 1}); // bottom-right
    }

    return neighbors
        .filter(n => n.r >= 0 && n.c >= 0 && n.c < GRID_COLS - 3)
        .map(n => `${n.r},${n.c}`);
}
