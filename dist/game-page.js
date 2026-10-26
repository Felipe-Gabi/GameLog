const COLLECTION_KEY = "gamelog-collection";
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
    return date;
}
// Read the saved game IDs from localStorage.
function getCollectionIds() {
    try {
        const savedCollection = localStorage.getItem(COLLECTION_KEY);
        if (!savedCollection) {
            return [];
        }
        const parsed = JSON.parse(savedCollection);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((id) => typeof id === "number");
    }
    catch (error) {
        console.error("Could not read your collection:", error);
        return [];
    }
}
// Save a game ID without creating duplicates.
function addGameToCollection(gameId) {
    const collection = getCollectionIds();
    if (collection.includes(gameId)) {
        return false;
    }
    collection.push(gameId);
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
    return true;
}
// Display the selected game's details.
function displayGame(game) {
    const loadingMessage = document.querySelector("#game-loading");
    const detailContent = document.querySelector("#game-detail-content");
    const notFoundMessage = document.querySelector("#game-not-found");
    const breadcrumbName = document.querySelector("#breadcrumb-game-name");
    const seriesElement = document.querySelector("#game-series");
    const titleElement = document.querySelector("#game-title");
    const coverElement = document.querySelector("#game-cover");
    const releaseDateElement = document.querySelector("#game-release-date");
    const publisherElement = document.querySelector("#game-publisher");
    const genreElement = document.querySelector("#game-genre");
    const platformsElement = document.querySelector("#game-platforms");
    const addButton = document.querySelector("#add-to-collection");
    const collectionMessage = document.querySelector("#collection-message");
    if (!loadingMessage ||
        !detailContent ||
        !notFoundMessage ||
        !breadcrumbName ||
        !seriesElement ||
        !titleElement ||
        !coverElement ||
        !releaseDateElement ||
        !publisherElement ||
        !genreElement ||
        !platformsElement ||
        !addButton ||
        !collectionMessage) {
        console.error("Some game detail elements are missing from the HTML.");
        return;
    }
    // Keep a safely typed reference to the validated button.
    const collectionButton = addButton;
    // Update the page title and breadcrumb.
    document.title = `${game.name} | GameLog`;
    breadcrumbName.textContent = game.name;
    // Display the game's information.
    seriesElement.textContent = game.series;
    titleElement.textContent = game.name;
    coverElement.src = game.img;
    coverElement.alt = `Cover of ${game.name}`;
    releaseDateElement.textContent =
        `Release date: ${formatReleaseDate(game.release_date)}`;
    publisherElement.textContent = game.publisher;
    genreElement.textContent = game.genre;
    platformsElement.textContent = game.platforms.join(", ");
    // Show the details and hide the loading message.
    loadingMessage.hidden = true;
    notFoundMessage.hidden = true;
    detailContent.hidden = false;
    // Set the correct button state.
    function updateCollectionButton() {
        const collection = getCollectionIds();
        const isAdded = collection.includes(game.id);
        collectionButton.disabled = isAdded;
        collectionButton.textContent = isAdded
            ? "Already in My Collection"
            : "Add to My Collection";
    }
    updateCollectionButton();
    // Add the selected game to My Collection.
    collectionButton.addEventListener("click", () => {
        try {
            const added = addGameToCollection(game.id);
            if (added) {
                collectionMessage.textContent =
                    `${game.name} was added to My Collection!`;
            }
            else {
                collectionMessage.textContent =
                    `${game.name} is already in My Collection.`;
            }
            collectionMessage.hidden = false;
            updateCollectionButton();
        }
        catch (error) {
            console.error("Could not save the game:", error);
            collectionMessage.textContent =
                "Unable to save this game. Please try again.";
            collectionMessage.hidden = false;
        }
    });
}
async function initializeGamePage() {
    const loadingMessage = document.querySelector("#game-loading");
    const notFoundMessage = document.querySelector("#game-not-found");
    const detailContent = document.querySelector("#game-detail-content");
    if (!loadingMessage || !notFoundMessage || !detailContent) {
        console.error("Could not find the game detail containers.");
        return;
    }
    // Get the game ID from the URL, e.g. game-page.html?id=1
    const params = new URLSearchParams(window.location.search);
    const idParameter = params.get("id");
    if (!idParameter || !/^\d+$/.test(idParameter)) {
        loadingMessage.hidden = true;
        detailContent.hidden = true;
        notFoundMessage.hidden = false;
        return;
    }
    const gameId = Number(idParameter);
    try {
        const response = await fetch("data/games.json");
        if (!response.ok) {
            throw new Error(`Failed to load games: ${response.status}`);
        }
        const data = await response.json();
        const selectedGame = data.games.find((game) => game.id === gameId);
        if (!selectedGame) {
            loadingMessage.hidden = true;
            detailContent.hidden = true;
            notFoundMessage.hidden = false;
            return;
        }
        displayGame(selectedGame);
    }
    catch (error) {
        console.error("Could not load game details:", error);
        loadingMessage.textContent =
            "Unable to load game details. Please try again later.";
    }
}
initializeGamePage();
export {};
//# sourceMappingURL=game-page.js.map