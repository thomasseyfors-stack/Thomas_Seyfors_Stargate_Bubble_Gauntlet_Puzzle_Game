
export interface Vector2D {
  x: number;
  y: number;
}

export interface OrbState {
  id: number;
  position: Vector2D;
  color: number; // Index into a color array
  gridPos: { row: number; col: number };
  isMatched?: boolean;
  isFloating?: boolean;
  jiggle?: number;
  velocity?: Vector2D;
}

export interface FiredOrbState {
    id: number;
    position: Vector2D;
    velocity: Vector2D;
    color: number;
}

export interface ParticleState {
    id: number;
    position: Vector2D;
    velocity: Vector2D;
    life: number;
    color: string;
    size: number;
}

export enum GameStatus {
  StartScreen,
  Playing,
  LevelClear,
  GameOver,
}

export interface LevelData {
    layout: (number | null)[][];
}