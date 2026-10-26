
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, FormEvent } from "react";
import type { Game, GamesData } from "../types/game";

const MAX_SUGGESTIONS = 6;

function getReleaseYear(date: string): string {
    return date.slice(0, 4);
}

function SearchBar() {
    const [allGames, setAllGames] = useState<Game[]>([]);
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const formRef = useRef<HTMLFormElement>(null);

    // Load the game database.
    useEffect(() => {
        async function loadGames() {
            try {
                const response = await fetch("/data/games.json");

                if (!response.ok) {
                    throw new Error(
                        `Failed to load games: ${response.status}`
                    );
                }

                const data: GamesData = await response.json();
                setAllGames(data.games);
            } catch (error) {
                console.error("Could not load games for search:", error);
            }
        }

        void loadGames();
    }, []);

    // Close suggestions when clicking outside the search form.
    useEffect(() => {
        function handleOutsideClick(event: MouseEvent) {
            if (
                event.target instanceof Node &&
                !formRef.current?.contains(event.target)
            ) {
                setIsOpen(false);
                setActiveIndex(-1);
            }
        }

        document.addEventListener("click", handleOutsideClick);

        return () => {
            document.removeEventListener("click", handleOutsideClick);
        };
    }, []);

    // Find and prioritize matching games.
    const normalizedQuery = query.trim().toLowerCase();

    const results = normalizedQuery
        ? allGames
              .filter((game) => {
                  return (
                      game.name.toLowerCase().includes(normalizedQuery) ||
                      game.series.toLowerCase().includes(normalizedQuery)
                  );
              })
              .sort((a, b) => {
                  const aStartsWith = a.name
                      .toLowerCase()
                      .startsWith(normalizedQuery);

                  const bStartsWith = b.name
                      .toLowerCase()
                      .startsWith(normalizedQuery);

                  if (aStartsWith && !bStartsWith) return -1;
                  if (!aStartsWith && bStartsWith) return 1;

                  return a.name.localeCompare(b.name);
              })
              .slice(0, MAX_SUGGESTIONS)
        : [];

    function openGame(game: Game) {
        window.location.href =
            `/game-page.html?id=${encodeURIComponent(String(game.id))}`;
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!normalizedQuery) return;

        const selectedGame = results[activeIndex] ?? results[0];

        if (selectedGame) {
            openGame(selectedGame);
        } else {
            setIsOpen(true);
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Escape") {
            setIsOpen(false);
            setActiveIndex(-1);
            return;
        }

        if (event.key === "ArrowDown" && results.length > 0) {
            event.preventDefault();
            setIsOpen(true);

            setActiveIndex((current) =>
                current >= results.length - 1 ? 0 : current + 1
            );
        }

        if (event.key === "ArrowUp" && results.length > 0) {
            event.preventDefault();
            setIsOpen(true);

            setActiveIndex((current) =>
                current <= 0 ? results.length - 1 : current - 1
            );
        }

        if (
            event.key === "Enter" &&
            isOpen &&
            results.length > 0
        ) {
            event.preventDefault();

            const selectedGame = results[activeIndex] ?? results[0];

            if (selectedGame) {
                openGame(selectedGame);
            }
        }
    }

    return (
        <form
            ref={formRef}
            className="nav-search search-form"
            role="search"
            onSubmit={handleSubmit}
        >
            <label htmlFor="game-search" className="visually-hidden">
                Search games
            </label>

            <input
                type="search"
                id="game-search"
                name="q"
                placeholder="Search games..."
                autoComplete="off"
                aria-label="Search games"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isOpen && normalizedQuery !== ""}
                aria-controls="search-suggestions"
                aria-activedescendant={
                    activeIndex >= 0
                        ? `search-suggestion-${activeIndex}`
                        : undefined
                }
                value={query}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setIsOpen(Boolean(event.target.value.trim()));
                    setActiveIndex(-1);
                }}
                onFocus={() => {
                    if (normalizedQuery) setIsOpen(true);
                }}
                onKeyDown={handleKeyDown}
            />

            <button type="submit" aria-label="Submit game search">
                <span aria-hidden="true">⌕</span>
            </button>

            <div
                className="search-suggestions"
                id="search-suggestions"
                role="listbox"
                hidden={!isOpen || !normalizedQuery}
            >
                {results.length === 0 && normalizedQuery ? (
                    <p className="search-no-results">
                        No games found. Try another search.
                    </p>
                ) : (
                    results.map((game, index) => (
                        <a
                            key={game.id}
                            id={`search-suggestion-${index}`}
                            className={`search-suggestion ${
                                index === activeIndex ? "active" : ""
                            }`}
                            href={`/game-page.html?id=${encodeURIComponent(
                                String(game.id)
                            )}`}
                            role="option"
                            aria-selected={index === activeIndex}
                            onMouseEnter={() => setActiveIndex(index)}
                        >
                            <img
                                className="search-suggestion-cover"
                                src={`/${game.img.replace(/^\/+/, "")}`}
                                alt=""
                                loading="lazy"
                            />

                            <div className="search-suggestion-details">
                                <span className="search-suggestion-name">
                                    {game.name}
                                </span>

                                <span className="search-suggestion-metadata">
                                    {getReleaseYear(game.release_date)} ·{" "}
                                    {game.publisher}
                                </span>
                            </div>
                        </a>
                    ))
                )}
            </div>
        </form>
    );
}

export default SearchBar;
