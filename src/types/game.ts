
export interface Game {
    id: number;
    name: string;
    series: string;
    release_date: string;
    publisher: string;
    genre: string;
    platforms: string[];
    img: string;
}

export interface GameMetadata {
    total_games: number;
    series: string[];
    notes: string;
}

export interface GamesData {
    metadata: GameMetadata;
    games: Game[];
}
