
import { useEffect, useState } from "react";
import SearchBar from "../components/SearchBar";
import type { Game, GamesData } from "../types/game";

const COLLECTION_KEY = "gamelog-collection";

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
        const savedCollection = localStorage.getItem(COLLECTION_KEY);

        if (!savedCollection) {
            return [];
        }

        const parsed: unknown = JSON.parse(savedCollection);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(
            (id): id is number => typeof id === "number"
        );
    } catch (error) {
        console.error("Could not read your collection:", error);
        return [];
    }
}

function addGameToCollection(gameId: number): boolean {
    const collection = getCollectionIds();

    if (collection.includes(gameId)) {
        return false;
    }

    collection.push(gameId);

    localStorage.setItem(
        COLLECTION_KEY,
        JSON.stringify(collection)
    );

    return true;
}

export default function GamePage() {
    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [collectionMessage, setCollectionMessage] = useState("");
    const [isAdded, setIsAdded] = useState(false);

    useEffect(() => {
        async function loadGame() {
            setLoading(true);
            setNotFound(false);
            setErrorMessage("");

            const params = new URLSearchParams(window.location.search);
            const idParameter = params.get("id");

            if (!idParameter || !/^\d+$/.test(idParameter)) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            const gameId = Number(idParameter);

            try {
                const response = await fetch("/data/games.json");

                if (!response.ok) {
                    throw new Error(
                        `Failed to load games: ${response.status}`
                    );
                }

                const data: GamesData = await response.json();

                const selectedGame = data.games.find(
                    (item) => item.id === gameId
                );

                if (!selectedGame) {
                    setNotFound(true);
                    return;
                }

                setGame(selectedGame);
                setIsAdded(getCollectionIds().includes(selectedGame.id));
            } catch (error) {
                console.error("Could not load game details:", error);
                setErrorMessage(
                    "Unable to load game details. Please try again later."
                );
            } finally {
                setLoading(false);
            }
        }

        void loadGame();
    }, []);

    useEffect(() => {
        document.title = game ? `${game.name} | GameLog` : "Game Details | GameLog";
    }, [game]);

    function handleAddToCollection() {
        if (!game) {
            return;
        }

        try {
            const added = addGameToCollection(game.id);

            if (added) {
                setCollectionMessage(
                    `${game.name} was added to My Collection!`
                );
            } else {
                setCollectionMessage(
                    `${game.name} is already in My Collection.`
                );
            }

            setIsAdded(true);
        } catch (error) {
            console.error("Could not save the game:", error);

            setCollectionMessage(
                "Unable to save this game. Please try again."
            );
        }
    }

    return (
        <>
            <header className="site-header">
                <nav className="navbar" aria-label="Main navigation">
                    <a href="/" className="site-logo">
                        GameLog
                    </a>

                    <div className="nav-links">
                        <a href="/collection.html" className="nav-link">
                            My Collection
                        </a>

                        <a href="/games.html" className="nav-link">
                            Available Games
                        </a>

                        <SearchBar />
                    </div>
                </nav>
            </header>

            <main className="game-detail-page">
                <nav className="breadcrumb" aria-label="Breadcrumb">
                    <span>{game?.name ?? "Game Details"}</span>
                </nav>

                <section
                    className="game-detail"
                    aria-labelledby="game-title"
                >
                    {loading && (
                        <p id="game-loading" role="status">
                            Loading game details...
                        </p>
                    )}

                    {!loading && errorMessage && (
                        <p role="alert">{errorMessage}</p>
                    )}

                    {!loading && !errorMessage && notFound && (
                        <div id="game-not-found">
                            <h1>Game Not Found</h1>

                            <p>
                                We couldn't find this game. It may not exist
                                in our database.
                            </p>

                            <a href="/games.html" className="primary-button">
                                Browse Available Games
                            </a>
                        </div>
                    )}

                    {!loading && !errorMessage && game && (
                        <div
                            className="game-detail-content"
                            id="game-detail-content"
                        >
                            <div className="game-detail-cover">
                                <img
                                    id="game-cover"
                                    src={game.img}
                                    alt={`Cover of ${game.name}`}
                                />
                            </div>

                            <div className="game-detail-info">
                                <p className="game-series">
                                    {game.series}
                                </p>

                                <h1 id="game-title">{game.name}</h1>

                                <p id="game-release-date">
                                    Release date:{" "}
                                    {formatReleaseDate(game.release_date)}
                                </p>

                                <dl className="game-metadata">
                                    <div>
                                        <dt>Publisher</dt>
                                        <dd>{game.publisher}</dd>
                                    </div>

                                    <div>
                                        <dt>Genre</dt>
                                        <dd>{game.genre}</dd>
                                    </div>

                                    <div>
                                        <dt>Platforms</dt>
                                        <dd>{game.platforms.join(", ")}</dd>
                                    </div>
                                </dl>

                                <button
                                    type="button"
                                    id="add-to-collection"
                                    className="primary-button"
                                    disabled={isAdded}
                                    onClick={handleAddToCollection}
                                >
                                    {isAdded
                                        ? "Already in My Collection"
                                        : "Add to My Collection"}
                                </button>

                                {collectionMessage && (
                                    <p id="collection-message" role="status">
                                        {collectionMessage}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </main>

            <footer className="site-footer">
                <p>
                    &copy; 2026 GameLog. Track your gaming journey.
                </p>
            </footer>
        </>
    );
}
