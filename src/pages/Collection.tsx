import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import SearchBar from "../components/SearchBar";
import type { Game, GamesData } from "../types/game";

interface GameDetails {
    rating?: number | undefined;
    completedDate?: string | undefined;
}

type GameDetailsMap = Record<string, GameDetails>;

interface CollectionBackup {
    app: "GameLog";
    formatVersion: 1;
    exportedAt: string;
    collection: number[];
    gameDetails: GameDetailsMap;
}

function formatReleaseDate(date: string): string {
    const monthNames = [
        "January", "February", "March", "April",
        "May", "June", "July", "August",
        "September", "October", "November", "December",
    ];

    const fullDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

    if (fullDateMatch) {
        const [, year, month, day] = fullDateMatch;
        return `${Number(day)} ${monthNames[Number(month) - 1]} ${year}`;
    }

    const monthMatch = /^(\d{4})-(\d{2})$/.exec(date);

    if (monthMatch) {
        const [, year, month] = monthMatch;
        return `${monthNames[Number(month) - 1]} ${year}`;
    }

    return date;
}

function getCollectionIds(): number[] {
    try {
        const saved = localStorage.getItem("gamelog-collection");
        if (!saved) return [];

        const parsed: unknown = JSON.parse(saved);

        if (!Array.isArray(parsed)) return [];

        return [...new Set(
            parsed.filter(
                (id): id is number =>
                    typeof id === "number" && Number.isFinite(id)
            )
        )];
    } catch {
        return [];
    }
}

function getGameDetails(): GameDetailsMap {
    try {
        const saved = localStorage.getItem("gamelog-game-details");
        if (!saved) return {};

        const parsed: unknown = JSON.parse(saved);

        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return {};
        }

        return parsed as GameDetailsMap;
    } catch {
        return {};
    }
}

function saveGameDetails(details: GameDetailsMap): boolean {
    try {
        localStorage.setItem(
            "gamelog-game-details",
            JSON.stringify(details)
        );
        return true;
    } catch (error) {
        console.error("Could not save game details:", error);
        return false;
    }
}

function removeGameFromStorage(gameId: number): boolean {
    try {
        const updated = getCollectionIds().filter((id) => id !== gameId);

        localStorage.setItem(
            "gamelog-collection",
            JSON.stringify(updated)
        );

        return true;
    } catch (error) {
        console.error("Could not remove game:", error);
        return false;
    }
}

function isValidBackup(value: unknown): value is CollectionBackup {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    const backup = value as Partial<CollectionBackup>;

    if (
        backup.app !== "GameLog" ||
        backup.formatVersion !== 1 ||
        !Array.isArray(backup.collection) ||
        !backup.collection.every(
            (id) => typeof id === "number" && Number.isFinite(id)
        ) ||
        !backup.gameDetails ||
        typeof backup.gameDetails !== "object" ||
        Array.isArray(backup.gameDetails)
    ) {
        return false;
    }

    return true;
}

function downloadBackup(): void {
    const backup: CollectionBackup = {
        app: "GameLog",
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        collection: getCollectionIds(),
        gameDetails: getGameDetails(),
    };

    const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "gamelog-backup.json";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

async function readBackupFile(file: File): Promise<unknown> {
    return JSON.parse(await file.text()) as unknown;
}

function GameCollectionCard({
    game,
    details,
    onUpdateDetails,
    onRemove,
}: {
    game: Game;
    details: GameDetails;
    onUpdateDetails: (gameId: number, details: GameDetails) => void;
    onRemove: (gameId: number) => void;
}) {
    const gamePageUrl =
        `/game-page.html?id=${encodeURIComponent(String(game.id))}`;

    function updateRating(rating: number | undefined) {
        onUpdateDetails(game.id, {
            ...details,
            rating,
        });
    }

    return (
        <article className="game-card">
            <a
                href={gamePageUrl}
                className="game-cover-link"
                aria-label={`View details for ${game.name}`}
            >
                <img
                    className="game-cover"
                    src={game.img}
                    alt={`Cover of ${game.name}`}
                    loading="lazy"
                />
            </a>

            <h3 className="game-name">
                <a href={gamePageUrl}>{game.name}</a>
            </h3>

            <div className="game-card-details">
                <p>Release date: {formatReleaseDate(game.release_date)}</p>
                <p>Publisher: {game.publisher}</p>
                <p>Genre: {game.genre}</p>
                <p>Platforms: {game.platforms.join(", ")}</p>
            </div>

            <div className="game-rating">
                <label htmlFor={`rating-${game.id}`}>
                    Your rating (0–10)
                </label>

                <select
                    id={`rating-${game.id}`}
                    value={details.rating ?? ""}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                        const value = event.target.value;
                        updateRating(value === "" ? undefined : Number(value));
                    }}
                >
                    <option value="">Not rated</option>
                    {Array.from({ length: 11 }, (_, rating) => (
                        <option key={rating} value={rating}>
                            {rating}/10
                        </option>
                    ))}
                </select>

                <div
                    className="rating-stars"
                    role="group"
                    aria-label={`Rate ${game.name}`}
                >
                    {Array.from({ length: 10 }, (_, index) => {
                        const rating = index + 1;
                        const isActive =
                            details.rating !== undefined &&
                            rating <= details.rating;

                        return (
                            <button
                                key={rating}
                                type="button"
                                className="rating-star"
                                aria-label={`Rate ${rating} out of 10`}
                                aria-pressed={details.rating === rating}
                                onClick={() => updateRating(rating)}
                            >
                                {isActive ? "★" : "☆"}
                            </button>
                        );
                    })}
                </div>

                {details.rating !== undefined && (
                    <span className="rating-value">
                        {details.rating}/10
                    </span>
                )}

                {details.rating !== undefined && (
                    <button
                        type="button"
                        className="clear-rating"
                        onClick={() => updateRating(undefined)}
                    >
                        Clear rating
                    </button>
                )}
            </div>

            <div className="game-completion-date">
                <label htmlFor={`completed-${game.id}`}>
                    Completion date
                </label>

                <input
                    id={`completed-${game.id}`}
                    type="date"
                    max={new Date().toLocaleDateString("en-CA")}
                    value={details.completedDate ?? ""}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        onUpdateDetails(game.id, {
                            ...details,
                            completedDate: event.target.value || undefined,
                        })
                    }
                />
            </div>

            <button
                type="button"
                className="remove-from-collection"
                onClick={() => onRemove(game.id)}
            >
                Remove from Collection
            </button>
        </article>
    );
}

function CollectionPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [collectionIds, setCollectionIds] = useState<number[]>([]);
    const [gameDetails, setGameDetails] = useState<GameDetailsMap>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [backupMessage, setBackupMessage] = useState("");

    useEffect(() => {
        setCollectionIds(getCollectionIds());
        setGameDetails(getGameDetails());

        async function loadGames() {
            try {
                const response = await fetch("/data/games.json");

                if (!response.ok) {
                    throw new Error(`Failed to load games: ${response.status}`);
                }

                const data: GamesData = await response.json();
                setGames(data.games);
            } catch (loadError) {
                console.error("Could not load games:", loadError);
                setError("Unable to load games. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        }

        void loadGames();
    }, []);

    const collectionGames = collectionIds
        .map((id) => games.find((game) => game.id === id))
        .filter((game): game is Game => game !== undefined);

    function updateGameDetails(
        gameId: number,
        updatedDetails: GameDetails
    ) {
        const updated = { ...gameDetails };
        const key = String(gameId);

        if (
            updatedDetails.rating === undefined &&
            updatedDetails.completedDate === undefined
        ) {
            delete updated[key];
        } else {
            updated[key] = updatedDetails;
        }

        if (saveGameDetails(updated)) {
            setGameDetails(updated);
            setBackupMessage("");
        } else {
            setBackupMessage("Could not save your changes.");
        }
    }

    function removeGame(gameId: number) {
        if (!window.confirm("Remove this game from your collection?")) {
            return;
        }

        if (!removeGameFromStorage(gameId)) {
            setBackupMessage("Could not remove the game.");
            return;
        }

        const updatedIds = collectionIds.filter((id) => id !== gameId);
        const updatedDetails = { ...gameDetails };

        delete updatedDetails[String(gameId)];

        if (!saveGameDetails(updatedDetails)) {
            setBackupMessage(
                "The game was removed, but its saved details could not be updated."
            );
        } else {
            setGameDetails(updatedDetails);
            setBackupMessage("Game removed from your collection.");
        }

        setCollectionIds(updatedIds);
    }

    async function importBackup(file: File) {
        try {
            const parsed = await readBackupFile(file);

            if (!isValidBackup(parsed)) {
                setBackupMessage("This is not a valid GameLog backup.");
                return;
            }

            const knownIds = new Set(games.map((game) => game.id));
            const unknownIds = parsed.collection.filter(
                (id) => !knownIds.has(id)
            );

            if (unknownIds.length > 0) {
                setBackupMessage(
                    "The backup contains game IDs that are not in your current game database."
                );
                return;
            }

            const confirmed = window.confirm(
                "Importing this backup will replace your current collection and personal game details. Continue?"
            );

            if (!confirmed) return;

            const oldCollection = localStorage.getItem("gamelog-collection");
            const oldDetails = localStorage.getItem("gamelog-game-details");

            try {
                localStorage.setItem(
                    "gamelog-collection",
                    JSON.stringify([...new Set(parsed.collection)])
                );

                localStorage.setItem(
                    "gamelog-game-details",
                    JSON.stringify(parsed.gameDetails)
                );
            } catch (writeError) {
                if (oldCollection === null) {
                    localStorage.removeItem("gamelog-collection");
                } else {
                    localStorage.setItem("gamelog-collection", oldCollection);
                }

                if (oldDetails === null) {
                    localStorage.removeItem("gamelog-game-details");
                } else {
                    localStorage.setItem("gamelog-game-details", oldDetails);
                }

                throw writeError;
            }

            setCollectionIds(getCollectionIds());
            setGameDetails(getGameDetails());
            setBackupMessage("Backup imported successfully.");
        } catch (importError) {
            console.error("Could not import backup:", importError);
            setBackupMessage(
                "Could not import the backup. Check that the file is valid JSON."
            );
        }
    }

    return (
        <>
            <header className="site-header">
                <nav className="navbar" aria-label="Main navigation">
                    <a href="/index.html" className="site-logo">
                        GameLog
                    </a>

                    <div className="nav-links">
                        <a
                            href="/collection.html"
                            className="nav-link"
                            aria-current="page"
                        >
                            My Collection
                        </a>

                        <a href="/games.html" className="nav-link">
                            Available Games
                        </a>

                        <SearchBar />
                    </div>
                </nav>
            </header>

            <main className="collection-page">
                <section className="collection-header">
                    <h1>My Collection</h1>
                    <p>
                        Track the games you've finished and record your thoughts.
                    </p>
                </section>

                <section className="collection-backup-controls">
                    <h2>Backup Your Collection</h2>

                    <div className="collection-backup-actions">
                        <button type="button" onClick={downloadBackup}>
                            Export Backup
                        </button>

                        <label htmlFor="backup-file">
                            Import Backup (JSON)
                        </label>

                        <input
                            id="backup-file"
                            type="file"
                            accept="application/json,.json"
                            onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                const file = event.target.files?.[0];

                                if (file) {
                                    void importBackup(file);
                                    event.target.value = "";
                                }
                            }}
                        />
                    </div>

                    {backupMessage && (
                        <p id="backup-status" role="status" aria-live="polite">
                            {backupMessage}
                        </p>
                    )}
                </section>

                <section className="game-list" aria-label="Your games">
                    {isLoading && <p>Loading your collection...</p>}

                    {!isLoading && error && <p role="alert">{error}</p>}

                    {!isLoading && !error && collectionGames.length === 0 && (
                        <p className="empty-collection">
                            Your collection is empty. Visit Available Games
                            to add a game.
                        </p>
                    )}

                    {!isLoading && !error && collectionGames.length > 0 && (
                        <div className="game-grid">
                            {collectionGames.map((game) => (
                                <GameCollectionCard
                                    key={game.id}
                                    game={game}
                                    details={gameDetails[String(game.id)] ?? {}}
                                    onUpdateDetails={updateGameDetails}
                                    onRemove={removeGame}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <footer className="site-footer">
                <div className="site-footer-content">
                    <p>© 2026 GameLog. All rights reserved.</p>
                </div>
            </footer>
        </>
    );
}

export default CollectionPage;
