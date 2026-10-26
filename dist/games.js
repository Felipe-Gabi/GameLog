// Format release dates that may be YYYY-MM-DD, YYYY-MM, or YYYY.
function formatReleaseDate(date) {
    const fullDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const monthNames = [
        "January", "February", "March", "April",
        "May", "June", "July", "August",
        "September", "October", "November", "December"
    ];
    if (fullDateMatch) {
        const [, year, month, day] = fullDateMatch;
        return `${Number(day)} ${monthNames[Number(month) - 1]} ${year}`;
    }
    const monthMatch = /^(\d{4})-(\d{2})$/.exec(date);
    if (monthMatch) {
        const [, year, month] = monthMatch;
        return `${monthNames[Number(month) - 1]} ${year}`;
    }
    if (/^\d{4}$/.test(date)) {
        return date;
    }
    return date;
}
// Read the IDs of games already in the collection.
function getCollectionIds() {
    try {
        const savedCollection = localStorage.getItem("gamelog-collection");
        if (!savedCollection) {
            return [];
        }
        const parsed = JSON.parse(savedCollection);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((id) => typeof id === "number");
    }
    catch {
        return [];
    }
}
// Save a game without creating a duplicate.
function saveGameToCollection(gameId) {
    const collection = getCollectionIds();
    if (collection.includes(gameId)) {
        return false;
    }
    collection.push(gameId);
    try {
        localStorage.setItem("gamelog-collection", JSON.stringify(collection));
        return true;
    }
    catch (error) {
        console.error("Could not save game to collection:", error);
        return false;
    }
}
// Create an individual game card.
function createGameCard(game) {
    const card = document.createElement("article");
    card.classList.add("game-card");
    // Create a link to this game's detail page.
    const gamePageUrl = `game-page.html?id=${encodeURIComponent(String(game.id))}`;
    // Create the flip container for the image and information.
    const flipContainer = document.createElement("div");
    flipContainer.classList.add("game-card-flip");
    const inner = document.createElement("div");
    inner.classList.add("game-card-inner");
    // FRONT: Cover image.
    const front = document.createElement("div");
    front.classList.add("game-card-front");
    const coverLink = document.createElement("a");
    coverLink.href = gamePageUrl;
    coverLink.setAttribute("aria-label", `View details for ${game.name}`);
    const cover = document.createElement("img");
    cover.classList.add("game-cover");
    cover.src = game.img;
    cover.alt = `Cover of ${game.name}`;
    cover.loading = "lazy";
    coverLink.append(cover);
    front.append(coverLink);
    // BACK: Game information.
    const back = document.createElement("div");
    back.classList.add("game-card-back");
    const releaseDate = document.createElement("p");
    releaseDate.textContent =
        `Release date: ${formatReleaseDate(game.release_date)}`;
    const publisher = document.createElement("p");
    publisher.textContent = `Publisher: ${game.publisher}`;
    const genre = document.createElement("p");
    genre.textContent = `Genre: ${game.genre}`;
    const platforms = document.createElement("p");
    platforms.textContent =
        `Platforms: ${game.platforms.join(", ")}`;
    // Add to Collection button.
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.classList.add("add-to-collection");
    function updateAddButton() {
        const alreadyAdded = getCollectionIds().includes(game.id);
        addButton.textContent = alreadyAdded
            ? "Added to Collection"
            : "Add to Collection";
        addButton.disabled = alreadyAdded;
    }
    updateAddButton();
    addButton.addEventListener("click", () => {
        const added = saveGameToCollection(game.id);
        if (added) {
            updateAddButton();
        }
    });
    // Put the information and button on the back.
    back.append(releaseDate, publisher, genre, platforms, addButton);
    // Assemble the flipping image area.
    inner.append(front, back);
    flipContainer.append(inner);
    // TITLE: Keep it outside the flipping image.
    const title = document.createElement("h3");
    title.classList.add("game-name");
    const titleLink = document.createElement("a");
    titleLink.href = gamePageUrl;
    titleLink.textContent = game.name;
    title.append(titleLink);
    // Assemble the complete card.
    card.append(flipContainer, title);
    return card;
}
// Render games in a regular grid.
function renderGamesByName(games, gamesContainer) {
    gamesContainer.replaceChildren();
    if (games.length === 0) {
        return;
    }
    const gameGrid = document.createElement("div");
    gameGrid.classList.add("game-grid");
    for (const game of games) {
        gameGrid.append(createGameCard(game));
    }
    gamesContainer.append(gameGrid);
}
// Group games by series.
function renderGamesBySeries(games, gamesContainer) {
    gamesContainer.replaceChildren();
    const gamesBySeries = new Map();
    for (const game of games) {
        const seriesGames = gamesBySeries.get(game.series) ?? [];
        seriesGames.push(game);
        gamesBySeries.set(game.series, seriesGames);
    }
    for (const [series, seriesGames] of gamesBySeries) {
        const section = document.createElement("section");
        section.classList.add("game-series");
        const heading = document.createElement("h2");
        heading.classList.add("game-series-title");
        heading.textContent = series;
        const gameGrid = document.createElement("div");
        gameGrid.classList.add("game-grid");
        for (const game of seriesGames) {
            gameGrid.append(createGameCard(game));
        }
        section.append(heading, gameGrid);
        gamesContainer.append(section);
    }
}
// Group games by platform.
function renderGamesByPlatform(games, gamesContainer, selectedPlatform) {
    gamesContainer.replaceChildren();
    const gamesByPlatform = new Map();
    for (const game of games) {
        const platformsToShow = selectedPlatform
            ? game.platforms.filter((platform) => platform === selectedPlatform)
            : game.platforms;
        for (const platform of platformsToShow) {
            const platformGames = gamesByPlatform.get(platform) ?? [];
            platformGames.push(game);
            gamesByPlatform.set(platform, platformGames);
        }
    }
    const sortedGroups = [...gamesByPlatform.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [platform, platformGames] of sortedGroups) {
        const section = document.createElement("section");
        section.classList.add("game-platform");
        const heading = document.createElement("h2");
        heading.classList.add("game-platform-title");
        heading.textContent = platform;
        const gameGrid = document.createElement("div");
        gameGrid.classList.add("game-grid");
        for (const game of platformGames) {
            gameGrid.append(createGameCard(game));
        }
        section.append(heading, gameGrid);
        gamesContainer.append(section);
    }
}
// Populate a filter with unique, alphabetically sorted values.
function populateFilter(select, values, defaultLabel) {
    const currentValue = select.value;
    select.replaceChildren();
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = defaultLabel;
    select.append(defaultOption);
    const sortedValues = [...new Set(values)]
        .filter((value) => value.trim() !== "")
        .sort((a, b) => a.localeCompare(b));
    for (const value of sortedValues) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.append(option);
    }
    // Preserve the current selection if it is still available.
    if (sortedValues.includes(currentValue)) {
        select.value = currentValue;
    }
}
// Load the catalog and initialize sorting and filtering.
async function initializeGamesPage() {
    const gamesContainer = document.querySelector("#games-container");
    const resultsCount = document.querySelector("#game-results-count");
    const sortSelect = document.querySelector("#game-sort");
    const sortDirectionButton = document.querySelector("#sort-direction");
    const seriesFilter = document.querySelector("#filter-series");
    const platformFilter = document.querySelector("#filter-platform");
    const genreFilter = document.querySelector("#filter-genre");
    const publisherFilter = document.querySelector("#filter-publisher");
    const clearFiltersButton = document.querySelector("#clear-filters");
    // Verify that every required HTML element exists.
    if (!gamesContainer ||
        !resultsCount ||
        !sortSelect ||
        !sortDirectionButton ||
        !seriesFilter ||
        !platformFilter ||
        !genreFilter ||
        !publisherFilter ||
        !clearFiltersButton) {
        console.error("Could not find all game catalog controls.");
        return;
    }
    // These constants retain the validated element types inside callbacks.
    const catalogContainer = gamesContainer;
    const catalogResultsCount = resultsCount;
    const catalogSortSelect = sortSelect;
    const catalogSeriesFilter = seriesFilter;
    const catalogPlatformFilter = platformFilter;
    const catalogGenreFilter = genreFilter;
    const catalogPublisherFilter = publisherFilter;
    const catalogClearFiltersButton = clearFiltersButton;
    try {
        const response = await fetch("data/games.json");
        if (!response.ok) {
            throw new Error(`Failed to load games: ${response.status}`);
        }
        const data = await response.json();
        const allGames = data.games;
        // Populate all four filters from the game database.
        populateFilter(catalogSeriesFilter, allGames.map((game) => game.series), "All series");
        populateFilter(catalogPlatformFilter, allGames.flatMap((game) => game.platforms), "All platforms");
        populateFilter(catalogGenreFilter, allGames.map((game) => game.genre), "All genres");
        populateFilter(catalogPublisherFilter, allGames.map((game) => game.publisher), "All publishers");
        // Update each filter's options based on the other active filters.
        function refreshFilterOptions() {
            let selectionChanged;
            // Repeat if clearing an invalid selection affects other filters.
            do {
                selectionChanged = false;
                const filterDefinitions = [
                    {
                        select: catalogSeriesFilter,
                        label: "All series",
                        getValues: (game) => [game.series],
                        matches: (game) => (!catalogPlatformFilter.value ||
                            game.platforms.includes(catalogPlatformFilter.value)) &&
                            (!catalogGenreFilter.value ||
                                game.genre === catalogGenreFilter.value) &&
                            (!catalogPublisherFilter.value ||
                                game.publisher === catalogPublisherFilter.value)
                    },
                    {
                        select: catalogPlatformFilter,
                        label: "All platforms",
                        getValues: (game) => game.platforms,
                        matches: (game) => (!catalogSeriesFilter.value ||
                            game.series === catalogSeriesFilter.value) &&
                            (!catalogGenreFilter.value ||
                                game.genre === catalogGenreFilter.value) &&
                            (!catalogPublisherFilter.value ||
                                game.publisher === catalogPublisherFilter.value)
                    },
                    {
                        select: catalogGenreFilter,
                        label: "All genres",
                        getValues: (game) => [game.genre],
                        matches: (game) => (!catalogSeriesFilter.value ||
                            game.series === catalogSeriesFilter.value) &&
                            (!catalogPlatformFilter.value ||
                                game.platforms.includes(catalogPlatformFilter.value)) &&
                            (!catalogPublisherFilter.value ||
                                game.publisher === catalogPublisherFilter.value)
                    },
                    {
                        select: catalogPublisherFilter,
                        label: "All publishers",
                        getValues: (game) => [game.publisher],
                        matches: (game) => (!catalogSeriesFilter.value ||
                            game.series === catalogSeriesFilter.value) &&
                            (!catalogPlatformFilter.value ||
                                game.platforms.includes(catalogPlatformFilter.value)) &&
                            (!catalogGenreFilter.value ||
                                game.genre === catalogGenreFilter.value)
                    }
                ];
                for (const filter of filterDefinitions) {
                    // Find games matching the other three filters.
                    const matchingGames = allGames.filter(filter.matches);
                    const availableValues = [
                        ...new Set(matchingGames.flatMap(filter.getValues))
                    ]
                        .filter((value) => value.trim() !== "")
                        .sort((a, b) => a.localeCompare(b));
                    const previousValue = filter.select.value;
                    // Remove a selection if it is no longer available.
                    if (previousValue &&
                        !availableValues.includes(previousValue)) {
                        filter.select.value = "";
                        selectionChanged = true;
                    }
                    // Rebuild the dropdown with the available options.
                    populateFilter(filter.select, availableValues, filter.label);
                    // Restore the selection if it remains valid.
                    if (previousValue &&
                        availableValues.includes(previousValue)) {
                        filter.select.value = previousValue;
                    }
                }
            } while (selectionChanged);
        }
        // Apply all selected filters together.
        function getFilteredGames() {
            return allGames.filter((game) => {
                const matchesSeries = !catalogSeriesFilter.value ||
                    game.series === catalogSeriesFilter.value;
                const matchesPlatform = !catalogPlatformFilter.value ||
                    game.platforms.includes(catalogPlatformFilter.value);
                const matchesGenre = !catalogGenreFilter.value ||
                    game.genre === catalogGenreFilter.value;
                const matchesPublisher = !catalogPublisherFilter.value ||
                    game.publisher === catalogPublisherFilter.value;
                return (matchesSeries &&
                    matchesPlatform &&
                    matchesGenre &&
                    matchesPublisher);
            });
        }
        // Filter first, then sort and render the matching games.
        function updateCatalog() {
            const filteredGames = getFilteredGames();
            const sortMode = catalogSortSelect.value;
            const selectedPlatform = catalogPlatformFilter.value;
            const sortedGames = [...filteredGames];
            if (sortMode === "name") {
                sortedGames.sort((a, b) => a.name.localeCompare(b.name));
                renderGamesByName(sortedGames, catalogContainer);
            }
            else if (sortMode === "release-date") {
                sortedGames.sort((a, b) => a.release_date.localeCompare(b.release_date) ||
                    a.name.localeCompare(b.name));
                renderGamesByName(sortedGames, catalogContainer);
            }
            else if (sortMode === "genre") {
                sortedGames.sort((a, b) => a.genre.localeCompare(b.genre) ||
                    a.name.localeCompare(b.name));
                renderGamesByName(sortedGames, catalogContainer);
            }
            else if (sortMode === "publisher") {
                sortedGames.sort((a, b) => a.publisher.localeCompare(b.publisher) ||
                    a.name.localeCompare(b.name));
                renderGamesByName(sortedGames, catalogContainer);
            }
            else if (sortMode === "platform") {
                sortedGames.sort((a, b) => a.name.localeCompare(b.name));
                renderGamesByPlatform(sortedGames, catalogContainer, selectedPlatform);
            }
            else {
                // Default view: group matching games by series.
                sortedGames.sort((a, b) => a.series.localeCompare(b.series) ||
                    a.name.localeCompare(b.name));
                renderGamesBySeries(sortedGames, catalogContainer);
            }
            // Update the result count.
            if (filteredGames.length === 0) {
                catalogResultsCount.textContent =
                    "No games match your selected filters.";
            }
            else {
                const filterIsActive = Boolean(catalogSeriesFilter.value ||
                    catalogPlatformFilter.value ||
                    catalogGenreFilter.value ||
                    catalogPublisherFilter.value);
                const filterDescription = filterIsActive
                    ? " matching your filters"
                    : "";
                if (sortMode === "series") {
                    const seriesCount = new Set(filteredGames.map((game) => game.series)).size;
                    catalogResultsCount.textContent =
                        `Showing ${filteredGames.length} games${filterDescription} across ${seriesCount} series.`;
                }
                else if (sortMode === "platform") {
                    if (selectedPlatform) {
                        catalogResultsCount.textContent =
                            `Showing ${filteredGames.length} games${filterDescription} on ${selectedPlatform}.`;
                    }
                    else {
                        const platformCount = new Set(filteredGames.flatMap((game) => game.platforms)).size;
                        catalogResultsCount.textContent =
                            `Showing ${filteredGames.length} games${filterDescription} across ${platformCount} platforms. Games may appear in multiple platform sections.`;
                    }
                }
                else {
                    const sortDescription = sortMode === "release-date"
                        ? "release date"
                        : sortMode;
                    catalogResultsCount.textContent =
                        `Showing ${filteredGames.length} games${filterDescription}, sorted by ${sortDescription}.`;
                }
            }
            // Enable Clear Filters only when a filter is active.
            catalogClearFiltersButton.disabled = !(catalogSeriesFilter.value ||
                catalogPlatformFilter.value ||
                catalogGenreFilter.value ||
                catalogPublisherFilter.value);
        }
        // Refresh dependent options and the catalog when a filter changes.
        function handleFilterChange() {
            refreshFilterOptions();
            updateCatalog();
        }
        catalogSeriesFilter.addEventListener("change", handleFilterChange);
        catalogPlatformFilter.addEventListener("change", handleFilterChange);
        catalogGenreFilter.addEventListener("change", handleFilterChange);
        catalogPublisherFilter.addEventListener("change", handleFilterChange);
        // Sorting continues to work alongside the filters.
        catalogSortSelect.addEventListener("change", updateCatalog);
        // Reset all filters and restore every available option.
        catalogClearFiltersButton.addEventListener("click", () => {
            catalogSeriesFilter.value = "";
            catalogPlatformFilter.value = "";
            catalogGenreFilter.value = "";
            catalogPublisherFilter.value = "";
            refreshFilterOptions();
            updateCatalog();
        });
        // Populate all filter options and render the initial catalog.
        refreshFilterOptions();
        updateCatalog();
    }
    catch (error) {
        console.error("Could not load the game catalog:", error);
        catalogResultsCount.textContent =
            "Unable to load games. Please try again later.";
    }
}
initializeGamesPage();
export {};
//# sourceMappingURL=games.js.map