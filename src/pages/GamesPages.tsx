import { useEffect, useMemo, useState } from "react";
import SearchBar from "../components/SearchBar";
import type { Game, GamesData } from "../types/game";

type SortOption =
    | "series"
    | "release-date"
    | "name"
    | "genre"
    | "platform"
    | "publisher";

type FilterKey = "series" | "platform" | "genre" | "publisher";

interface Filters {
    series: string;
    platform: string;
    genre: string;
    publisher: string;
}

const EMPTY_FILTERS: Filters = {
    series: "",
    platform: "",
    genre: "",
    publisher: "",
};

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

        return parsed.filter(
            (id): id is number => typeof id === "number"
        );
    } catch {
        return [];
    }
}

function saveGameToCollection(gameId: number): boolean {
    const collection = getCollectionIds();

    if (collection.includes(gameId)) return false;

    collection.push(gameId);

    try {
        localStorage.setItem(
            "gamelog-collection",
            JSON.stringify(collection)
        );
        return true;
    } catch (error) {
        console.error("Could not save game to collection:", error);
        return false;
    }
}

function matchesFilters(game: Game, filters: Filters): boolean {
    return (
        (!filters.series || game.series === filters.series) &&
        (!filters.platform || game.platforms.includes(filters.platform)) &&
        (!filters.genre || game.genre === filters.genre) &&
        (!filters.publisher || game.publisher === filters.publisher)
    );
}

function GameCard({ game }: { game: Game }) {
    const [isAdded, setIsAdded] = useState(
        () => getCollectionIds().includes(game.id)
    );

    const gamePageUrl =
        `/game-page.html?id=${encodeURIComponent(String(game.id))}`;

    function handleAddToCollection() {
        if (saveGameToCollection(game.id)) {
            setIsAdded(true);
        }
    }

    return (
        <article className="game-card">
            <div className="game-card-flip">
                <div className="game-card-inner">
                    <div className="game-card-front">
                        <a
                            href={gamePageUrl}
                            aria-label={`View details for ${game.name}`}
                        >
                            <img
                                className="game-cover"
                                src={game.img}
                                alt={`Cover of ${game.name}`}
                                loading="lazy"
                            />
                        </a>
                    </div>

                    <div className="game-card-back">
                        <p>
                            Release date: {formatReleaseDate(game.release_date)}
                        </p>
                        <p>Publisher: {game.publisher}</p>
                        <p>Genre: {game.genre}</p>
                        <p>Platforms: {game.platforms.join(", ")}</p>

                        <button
                            type="button"
                            className="add-to-collection"
                            onClick={handleAddToCollection}
                            disabled={isAdded}
                        >
                            {isAdded
                                ? "Added to Collection"
                                : "Add to Collection"}
                        </button>
                    </div>
                </div>
            </div>

            <h3 className="game-name">
                <a href={gamePageUrl}>{game.name}</a>
            </h3>
        </article>
    );
}

function GamesPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const [sortBy, setSortBy] = useState<SortOption>("series");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

    useEffect(() => {
        async function loadGames() {
            try {
                const response = await fetch("/data/games.json");

                if (!response.ok) {
                    throw new Error(`Failed to load games: ${response.status}`);
                }

                const data: GamesData = await response.json();
                setGames(data.games);
            } catch (error) {
                console.error("Could not load games:", error);
                setError("Unable to load games. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        }

        void loadGames();
    }, []);

    const filteredGames = useMemo(
        () => games.filter((game) => matchesFilters(game, filters)),
        [games, filters]
    );

    const sortedGames = useMemo(() => {
        const result = [...filteredGames];

        result.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case "release-date":
                    comparison = a.release_date.localeCompare(b.release_date);
                    break;
                case "name":
                    comparison = a.name.localeCompare(b.name);
                    break;
                case "genre":
                    comparison = a.genre.localeCompare(b.genre);
                    break;
                case "platform":
                    comparison = a.platforms.join(", ").localeCompare(
                        b.platforms.join(", ")
                    );
                    break;
                case "publisher":
                    comparison = a.publisher.localeCompare(b.publisher);
                    break;
                case "series":
                default:
                    comparison = a.series.localeCompare(b.series);
                    break;
            }

            if (comparison === 0) {
                comparison = a.name.localeCompare(b.name);
            }

            return sortDirection === "asc" ? comparison : -comparison;
        });

        return result;
    }, [filteredGames, sortBy, sortDirection]);

    function getFilterOptions(key: FilterKey): string[] {
        const otherFilters: Filters = {
            ...filters,
            [key]: "",
        };

        const matchingGames = games.filter((game) =>
            matchesFilters(game, otherFilters)
        );

        let values: string[];

        switch (key) {
            case "series":
                values = matchingGames.map((game) => game.series);
                break;
            case "platform":
                values = matchingGames.flatMap((game) => game.platforms);
                break;
            case "genre":
                values = matchingGames.map((game) => game.genre);
                break;
            case "publisher":
                values = matchingGames.map((game) => game.publisher);
                break;
        }

        return [...new Set(values)].sort((a, b) => a.localeCompare(b));
    }

    function updateFilter(key: FilterKey, value: string) {
        setFilters((current) => ({
            ...current,
            [key]: value,
        }));
    }

    const hasActiveFilters = Object.values(filters).some(Boolean);

    const seriesGroups = useMemo(() => {
        const groups = new Map<string, Game[]>();

        for (const game of sortedGames) {
            const group = groups.get(game.series) ?? [];
            group.push(game);
            groups.set(game.series, group);
        }

        return [...groups.entries()];
    }, [sortedGames]);

    const platformGroups = useMemo(() => {
        const groups = new Map<string, Game[]>();

        for (const game of sortedGames) {
            const matchingPlatforms = filters.platform
                ? game.platforms.filter(
                    (platform) => platform === filters.platform
                )
                : game.platforms;

            for (const platform of matchingPlatforms) {
                const group = groups.get(platform) ?? [];

                // Avoid duplicating the same game within a platform group.
                if (!group.some((item) => item.id === game.id)) {
                    group.push(game);
                }

                groups.set(platform, group);
            }
        }

        return [...groups.entries()].sort(([a], [b]) =>
            a.localeCompare(b)
        );
    }, [sortedGames, filters.platform]);

    function renderGameGrid(groupGames: Game[]) {
        return (
            <div className="game-grid">
                {groupGames.map((game) => (
                    <GameCard key={game.id} game={game} />
                ))}
            </div>
        );
    }

    
return (
    <>
        <header className="site-header">
            <nav className="navbar" aria-label="Main navigation">
                <a href="/index.html" className="site-logo">
                    GameLog
                </a>

                <div className="nav-links">
                    <a href="/collection.html" className="nav-link">
                        My Collection
                    </a>

                    <a
                        href="/games.html"
                        className="nav-link"
                        aria-current="page"
                    >
                        Available Games
                    </a>

                    <SearchBar />
                </div>
            </nav>
        </header>

        <main className="available-games-page">
            <section
                className="available-games-header"
                aria-labelledby="page-title"
            >
                <h1 id="page-title">Available Games</h1>
                <p>
                    Explore the games in GameLog, discover new series,
                    and find your next gaming adventure.
                </p>
            </section>

            <section
                className="game-browser-controls"
                aria-labelledby="browse-title"
            >
                <h2 id="browse-title">Browse Games</h2>

                <div className="game-sort-controls">
                    <label htmlFor="game-sort">Sort by</label>

                    <select
                        id="game-sort"
                        value={sortBy}
                        onChange={(event) =>
                            setSortBy(event.target.value as SortOption)
                        }
                    >
                        <option value="series">Series</option>
                        <option value="release-date">Release Date</option>
                        <option value="name">Name</option>
                        <option value="genre">Genre</option>
                        <option value="platform">Platform</option>
                        <option value="publisher">Publisher</option>
                    </select>

                    <button
                        type="button"
                        id="sort-direction"
                        className="sort-direction-button"
                        aria-label={
                            sortDirection === "asc"
                                ? "Change to descending order"
                                : "Change to ascending order"
                        }
                        onClick={() =>
                            setSortDirection((current) =>
                                current === "asc" ? "desc" : "asc"
                            )
                        }
                    >
                        {sortDirection === "asc"
                            ? "↑ Ascending"
                            : "↓ Descending"}
                    </button>
                </div>

                <div className="game-filter-controls">
                    <h3>Filter Games</h3>

                    <div className="game-filter">
                        <label htmlFor="filter-series">Series</label>
                        <select
                            id="filter-series"
                            value={filters.series}
                            onChange={(event) =>
                                updateFilter("series", event.target.value)
                            }
                        >
                            <option value="">All Series</option>
                            {getFilterOptions("series").map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="game-filter">
                        <label htmlFor="filter-platform">Platform</label>
                        <select
                            id="filter-platform"
                            value={filters.platform}
                            onChange={(event) =>
                                updateFilter("platform", event.target.value)
                            }
                        >
                            <option value="">All Platforms</option>
                            {getFilterOptions("platform").map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="game-filter">
                        <label htmlFor="filter-genre">Genre</label>
                        <select
                            id="filter-genre"
                            value={filters.genre}
                            onChange={(event) =>
                                updateFilter("genre", event.target.value)
                            }
                        >
                            <option value="">All Genres</option>
                            {getFilterOptions("genre").map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="game-filter">
                        <label htmlFor="filter-publisher">Publisher</label>
                        <select
                            id="filter-publisher"
                            value={filters.publisher}
                            onChange={(event) =>
                                updateFilter("publisher", event.target.value)
                            }
                        >
                            <option value="">All Publishers</option>
                            {getFilterOptions("publisher").map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        id="clear-filters"
                        onClick={() => setFilters(EMPTY_FILTERS)}
                        disabled={!hasActiveFilters}
                    >
                        Clear Filters
                    </button>
                </div>

                <p
                    id="game-results-count"
                    className="game-results-count"
                    aria-live="polite"
                >
                    {isLoading
                        ? "Loading games..."
                        : error
                            ? error
                            : `Showing ${sortedGames.length} of ${games.length} games.`}
                </p>
            </section>

            <section
                className="available-games-list"
                aria-label="Game catalog"
            >
                <div id="games-container">
                    {isLoading && <p>Loading games...</p>}

                    {!isLoading && error && <p>{error}</p>}

                    {!isLoading && !error && sortedGames.length === 0 && (
                        <p>No games match your filters.</p>
                    )}

                    {!isLoading && !error && sortedGames.length > 0 && (
                        <>
                            {sortBy === "series" &&
                                seriesGroups.map(([series, groupGames]) => (
                                    <section
                                        className="game-series"
                                        key={series}
                                    >
                                        <h2 className="game-series-title">
                                            {series}
                                        </h2>
                                        {renderGameGrid(groupGames)}
                                    </section>
                                ))}

                            {sortBy === "platform" &&
                                platformGroups.map(([platform, groupGames]) => (
                                    <section
                                        className="game-series"
                                        key={platform}
                                    >
                                        <h2 className="game-series-title">
                                            {platform}
                                        </h2>
                                        {renderGameGrid(groupGames)}
                                    </section>
                                ))}

                            {sortBy !== "series" && sortBy !== "platform" &&
                                renderGameGrid(sortedGames)}
                        </>
                    )}
                </div>
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

export default GamesPage;
