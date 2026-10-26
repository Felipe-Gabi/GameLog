const MAX_SUGGESTIONS = 6;
let allGames = [];
// Get the year from a release date such as "1997-12-31".
function getReleaseYear(date) {
    return date.slice(0, 4);
}
// Load the game database once.
async function loadGames() {
    try {
        const response = await fetch("data/games.json");
        if (!response.ok) {
            throw new Error(`Failed to load games: ${response.status}`);
        }
        const data = await response.json();
        allGames = data.games;
        // Initialize every search form on the current page.
        initializeSearchForms();
    }
    catch (error) {
        console.error("Could not load games for search:", error);
    }
}
// Find games whose names or series match the search query.
function searchGames(query) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return [];
    }
    return allGames
        .filter((game) => {
        return (game.name.toLowerCase().includes(normalizedQuery) ||
            game.series.toLowerCase().includes(normalizedQuery));
    })
        .sort((a, b) => {
        const aStartsWith = a.name
            .toLowerCase()
            .startsWith(normalizedQuery);
        const bStartsWith = b.name
            .toLowerCase()
            .startsWith(normalizedQuery);
        // Put game names that start with the query first.
        if (aStartsWith && !bStartsWith) {
            return -1;
        }
        if (!aStartsWith && bStartsWith) {
            return 1;
        }
        return a.name.localeCompare(b.name);
    })
        .slice(0, MAX_SUGGESTIONS);
}
// Create one clickable game suggestion.
function createSuggestion(game) {
    const link = document.createElement("a");
    link.classList.add("search-suggestion");
    link.href = `game-page.html?id=${encodeURIComponent(String(game.id))}`;
    link.setAttribute("role", "option");
    // Game cover.
    const cover = document.createElement("img");
    cover.classList.add("search-suggestion-cover");
    cover.src = game.img;
    cover.alt = "";
    cover.loading = "lazy";
    // Container for the game name and metadata.
    const details = document.createElement("div");
    details.classList.add("search-suggestion-details");
    // Game name.
    const name = document.createElement("span");
    name.classList.add("search-suggestion-name");
    name.textContent = game.name;
    // Release year and publisher.
    const metadata = document.createElement("span");
    metadata.classList.add("search-suggestion-metadata");
    metadata.textContent =
        `${getReleaseYear(game.release_date)} · ${game.publisher}`;
    details.append(name, metadata);
    link.append(cover, details);
    return link;
}
// Set up autocomplete for every search form on the current page.
function initializeSearchForms() {
    const searchForms = document.querySelectorAll(".search-form");
    searchForms.forEach((form, formIndex) => {
        // Find the search input.
        const searchInputElement = form.querySelector('input[type="search"]');
        if (!searchInputElement) {
            console.warn("A search form is missing its search input.");
            return;
        }
        // TypeScript now knows this is a valid input element.
        const searchInput = searchInputElement;
        // Find the suggestions container, or create one if necessary.
        let suggestions = form.querySelector(".search-suggestions");
        if (!suggestions) {
            suggestions = document.createElement("div");
            suggestions.classList.add("search-suggestions");
            suggestions.hidden = true;
            form.append(suggestions);
        }
        const suggestionsList = suggestions;
        // Accessibility attributes for autocomplete.
        searchInput.setAttribute("role", "combobox");
        searchInput.setAttribute("aria-autocomplete", "list");
        searchInput.setAttribute("aria-expanded", "false");
        const listId = `search-suggestions-${formIndex}`;
        suggestionsList.id = listId;
        suggestionsList.setAttribute("role", "listbox");
        searchInput.setAttribute("aria-controls", listId);
        // Store the current matching games and keyboard selection.
        let currentResults = [];
        let activeIndex = -1;
        // Hide suggestions and clear the keyboard selection.
        function closeSuggestions() {
            suggestionsList.hidden = true;
            searchInput.setAttribute("aria-expanded", "false");
            searchInput.removeAttribute("aria-activedescendant");
            activeIndex = -1;
        }
        // Update the highlighted suggestion during keyboard navigation.
        function updateActiveSuggestion() {
            const links = suggestionsList.querySelectorAll(".search-suggestion");
            links.forEach((link, index) => {
                const isActive = index === activeIndex;
                link.classList.toggle("active", isActive);
                link.setAttribute("aria-selected", String(isActive));
                if (isActive) {
                    searchInput.setAttribute("aria-activedescendant", link.id);
                    link.scrollIntoView({ block: "nearest" });
                }
            });
        }
        // Display suggestions matching the current query.
        function displaySuggestions(query) {
            suggestionsList.replaceChildren();
            activeIndex = -1;
            if (!query.trim()) {
                currentResults = [];
                closeSuggestions();
                return;
            }
            currentResults = searchGames(query);
            // Display a message if nothing matches.
            if (currentResults.length === 0) {
                const message = document.createElement("p");
                message.classList.add("search-no-results");
                message.textContent = "No games found. Try another search.";
                suggestionsList.append(message);
                suggestionsList.hidden = false;
                searchInput.setAttribute("aria-expanded", "true");
                searchInput.removeAttribute("aria-activedescendant");
                return;
            }
            // Create a suggestion for each matching game.
            currentResults.forEach((game, index) => {
                const link = createSuggestion(game);
                link.id = `${listId}-option-${index}`;
                link.setAttribute("aria-selected", "false");
                suggestionsList.append(link);
            });
            suggestionsList.hidden = false;
            searchInput.setAttribute("aria-expanded", "true");
        }
        // Update suggestions whenever the user types.
        searchInput.addEventListener("input", () => {
            displaySuggestions(searchInput.value);
        });
        // Reopen suggestions when the user returns to the input.
        searchInput.addEventListener("focus", () => {
            if (searchInput.value.trim()) {
                displaySuggestions(searchInput.value);
            }
        });
        // Keyboard navigation.
        searchInput.addEventListener("keydown", (event) => {
            // Escape closes the suggestions.
            if (event.key === "Escape") {
                closeSuggestions();
                return;
            }
            // Arrow Down selects the next suggestion.
            if (event.key === "ArrowDown" && currentResults.length > 0) {
                event.preventDefault();
                if (suggestionsList.hidden) {
                    displaySuggestions(searchInput.value);
                }
                if (currentResults.length > 0) {
                    activeIndex =
                        (activeIndex + 1) % currentResults.length;
                    updateActiveSuggestion();
                }
                return;
            }
            // Arrow Up selects the previous suggestion.
            if (event.key === "ArrowUp" && currentResults.length > 0) {
                event.preventDefault();
                activeIndex =
                    activeIndex <= 0
                        ? currentResults.length - 1
                        : activeIndex - 1;
                updateActiveSuggestion();
                return;
            }
            // Enter opens the highlighted game or the first result.
            if (event.key === "Enter" && !suggestionsList.hidden) {
                const selectedGame = activeIndex >= 0
                    ? currentResults[activeIndex]
                    : currentResults[0];
                // Check that a game exists before using its ID.
                if (selectedGame) {
                    event.preventDefault();
                    window.location.href =
                        `game-page.html?id=${encodeURIComponent(String(selectedGame.id))}`;
                }
            }
        });
        // Handle form submission without navigating to search.html.
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const selectedGame = activeIndex >= 0
                ? currentResults[activeIndex]
                : currentResults[0];
            if (selectedGame) {
                window.location.href =
                    `game-page.html?id=${encodeURIComponent(String(selectedGame.id))}`;
                return;
            }
            // If no results have been displayed yet, search now.
            if (searchInput.value.trim()) {
                displaySuggestions(searchInput.value);
            }
        });
        // Close suggestions when the user clicks outside this form.
        document.addEventListener("click", (event) => {
            if (event.target instanceof Node &&
                !form.contains(event.target)) {
                closeSuggestions();
            }
        });
    });
}
// Start loading the database and initialize search.
loadGames();
export {};
//# sourceMappingURL=search.js.map