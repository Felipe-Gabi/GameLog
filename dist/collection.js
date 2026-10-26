const COLLECTION_KEY = "gamelog-collection";
const DETAILS_KEY = "gamelog-game-details";
function exportCollection(backupStatus) {
    try {
        const backup = {
            app: "GameLog",
            formatVersion: 1,
            exportedAt: new Date().toISOString(),
            collection: getCollectionIds(),
            gameDetails: getGamePersonalDetails()
        };
        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download =
            `gamelog-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        backupStatus.textContent =
            "Your collection backup was exported successfully.";
    }
    catch (error) {
        console.error("Could not export your collection:", error);
        backupStatus.textContent =
            "Unable to export your collection. Please try again.";
    }
}
function validateBackup(value, validGameIds) {
    if (typeof value !== "object" ||
        value === null ||
        Array.isArray(value)) {
        throw new Error("The backup must contain a JSON object.");
    }
    const backup = value;
    if (backup.app !== "GameLog" ||
        backup.formatVersion !== 1) {
        throw new Error("This is not a supported GameLog backup.");
    }
    if (typeof backup.exportedAt !== "string" ||
        !Array.isArray(backup.collection) ||
        typeof backup.gameDetails !== "object" ||
        backup.gameDetails === null ||
        Array.isArray(backup.gameDetails)) {
        throw new Error("The backup file is missing required information.");
    }
    const collection = [];
    for (const id of backup.collection) {
        if (typeof id !== "number" ||
            !Number.isInteger(id) ||
            !validGameIds.has(id)) {
            throw new Error("The backup contains an unknown or invalid game ID.");
        }
        if (!collection.includes(id)) {
            collection.push(id);
        }
    }
    const gameDetails = {};
    for (const [gameId, details] of Object.entries(backup.gameDetails)) {
        if (!/^\d+$/.test(gameId) || !validGameIds.has(Number(gameId))) {
            throw new Error("The backup contains details for an unknown game.");
        }
        if (typeof details !== "object" ||
            details === null ||
            Array.isArray(details) ||
            !("rating" in details) ||
            !("completedDate" in details)) {
            throw new Error("The backup contains invalid game details.");
        }
        const rating = details.rating;
        const completedDate = details.completedDate;
        if (typeof rating !== "number" ||
            !Number.isFinite(rating) ||
            rating < 0 ||
            rating > 10 ||
            typeof completedDate !== "string") {
            throw new Error("A rating or completion date is invalid.");
        }
        if (completedDate !== "" &&
            !/^\d{4}-\d{2}-\d{2}$/.test(completedDate)) {
            throw new Error("A completion date must use YYYY-MM-DD format.");
        }
        if (completedDate !== "") {
            const parsedDate = new Date(`${completedDate}T00:00:00Z`);
            if (Number.isNaN(parsedDate.getTime()) ||
                parsedDate.toISOString().slice(0, 10) !== completedDate) {
                throw new Error("The backup contains an invalid calendar date.");
            }
        }
        gameDetails[gameId] = {
            rating,
            completedDate
        };
    }
    return {
        app: "GameLog",
        formatVersion: 1,
        exportedAt: backup.exportedAt,
        collection,
        gameDetails
    };
}
async function importCollection(file, validGameIds, backupStatus) {
    try {
        const fileText = await file.text();
        const parsed = JSON.parse(fileText);
        const backup = validateBackup(parsed, validGameIds);
        const confirmed = window.confirm("Import this GameLog backup?\n\n" +
            "This will replace your current collection, ratings, " +
            "and completion dates.");
        if (!confirmed) {
            backupStatus.textContent = "Import cancelled.";
            return;
        }
        // Keep the existing data in case saving the backup fails.
        const previousCollection = localStorage.getItem(COLLECTION_KEY);
        const previousDetails = localStorage.getItem(DETAILS_KEY);
        try {
            localStorage.setItem(COLLECTION_KEY, JSON.stringify(backup.collection));
            localStorage.setItem(DETAILS_KEY, JSON.stringify(backup.gameDetails));
        }
        catch (error) {
            // Restore the previous values if either write fails.
            if (previousCollection === null) {
                localStorage.removeItem(COLLECTION_KEY);
            }
            else {
                localStorage.setItem(COLLECTION_KEY, previousCollection);
            }
            if (previousDetails === null) {
                localStorage.removeItem(DETAILS_KEY);
            }
            else {
                localStorage.setItem(DETAILS_KEY, previousDetails);
            }
            throw error;
        }
        backupStatus.textContent =
            "Backup imported successfully. Reloading your collection...";
        window.location.reload();
    }
    catch (error) {
        console.error("Could not import the collection:", error);
        backupStatus.textContent =
            error instanceof Error
                ? `Import failed: ${error.message}`
                : "Import failed. Please check your backup file.";
    }
}
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
function getCollectionIds() {
    try {
        const saved = localStorage.getItem(COLLECTION_KEY);
        if (!saved) {
            return [];
        }
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((id) => typeof id === "number");
    }
    catch (error) {
        console.error("Could not read the saved collection:", error);
        return [];
    }
}
function getGamePersonalDetails() {
    try {
        const saved = localStorage.getItem(DETAILS_KEY);
        if (!saved) {
            return {};
        }
        const parsed = JSON.parse(saved);
        if (typeof parsed !== "object" ||
            parsed === null ||
            Array.isArray(parsed)) {
            return {};
        }
        const details = {};
        for (const [gameId, value] of Object.entries(parsed)) {
            if (typeof value === "object" &&
                value !== null &&
                "rating" in value &&
                "completedDate" in value &&
                typeof value.rating === "number" &&
                value.rating >= 0 &&
                value.rating <= 10 &&
                typeof value.completedDate === "string") {
                details[gameId] = {
                    rating: value.rating,
                    completedDate: value.completedDate
                };
            }
        }
        return details;
    }
    catch (error) {
        console.error("Could not read game ratings and dates:", error);
        return {};
    }
}
function saveGamePersonalDetails(gameId, details) {
    const allDetails = getGamePersonalDetails();
    allDetails[String(gameId)] = details;
    localStorage.setItem(DETAILS_KEY, JSON.stringify(allDetails));
}
function removeGameFromCollection(gameId) {
    const updatedCollection = getCollectionIds().filter((id) => id !== gameId);
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(updatedCollection));
}
function createCollectionCard(game, onRemove) {
    const card = document.createElement("article");
    card.classList.add("game-card");
    const gamePageUrl = `game-page.html?id=${encodeURIComponent(String(game.id))}`;
    // Create a link around the game cover.
    const coverLink = document.createElement("a");
    coverLink.href = gamePageUrl;
    coverLink.classList.add("game-cover-link");
    coverLink.setAttribute("aria-label", `View details for ${game.name}`);
    const cover = document.createElement("img");
    cover.classList.add("game-cover");
    cover.src = game.img;
    cover.alt = `Cover of ${game.name}`;
    cover.loading = "lazy";
    coverLink.append(cover);
    // Create a link around the game title.
    const title = document.createElement("h3");
    title.classList.add("game-name");
    const titleLink = document.createElement("a");
    titleLink.href = gamePageUrl;
    titleLink.textContent = game.name;
    title.append(titleLink);
    const releaseDate = document.createElement("p");
    releaseDate.textContent =
        `Release date: ${formatReleaseDate(game.release_date)}`;
    const publisher = document.createElement("p");
    publisher.textContent = `Publisher: ${game.publisher}`;
    // Load the saved rating and completion date.
    const savedDetails = getGamePersonalDetails()[String(game.id)] ?? {
        rating: 0,
        completedDate: ""
    };
    let currentRating = savedDetails.rating;
    // Rating section
    const ratingSection = document.createElement("section");
    ratingSection.classList.add("game-rating");
    const ratingTitle = document.createElement("p");
    ratingTitle.textContent = "Your rating:";
    const stars = document.createElement("div");
    stars.classList.add("rating-stars");
    stars.setAttribute("role", "group");
    stars.setAttribute("aria-label", `Rate ${game.name} from 1 to 10 stars`);
    const ratingValue = document.createElement("p");
    ratingValue.classList.add("rating-value");
    function updateStars() {
        ratingValue.textContent =
            currentRating === 0
                ? "Not rated (0/10)"
                : `${currentRating}/10 stars`;
        const starButtons = stars.querySelectorAll("button");
        starButtons.forEach((button, index) => {
            const starNumber = index + 1;
            const isSelected = starNumber <= currentRating;
            button.textContent = isSelected ? "★" : "☆";
            button.setAttribute("aria-label", `Rate ${game.name} ${starNumber} out of 10 stars`);
            button.setAttribute("aria-pressed", String(currentRating === starNumber));
        });
    }
    for (let star = 1; star <= 10; star++) {
        const starButton = document.createElement("button");
        starButton.type = "button";
        starButton.classList.add("rating-star");
        starButton.textContent = "☆";
        starButton.addEventListener("click", () => {
            currentRating = star;
            saveGamePersonalDetails(game.id, {
                rating: currentRating,
                completedDate: completionDate.value
            });
            updateStars();
        });
        stars.append(starButton);
    }
    const clearRatingButton = document.createElement("button");
    clearRatingButton.type = "button";
    clearRatingButton.classList.add("clear-rating");
    clearRatingButton.textContent = "Clear rating (0)";
    clearRatingButton.addEventListener("click", () => {
        currentRating = 0;
        saveGamePersonalDetails(game.id, {
            rating: currentRating,
            completedDate: completionDate.value
        });
        updateStars();
    });
    ratingSection.append(ratingTitle, stars, ratingValue, clearRatingButton);
    updateStars();
    // Completion date section
    const completionSection = document.createElement("section");
    completionSection.classList.add("game-completion-date");
    const completionLabel = document.createElement("label");
    completionLabel.textContent = "Date finished:";
    completionLabel.htmlFor = `completion-date-${game.id}`;
    const completionDate = document.createElement("input");
    completionDate.type = "date";
    completionDate.id = `completion-date-${game.id}`;
    completionDate.classList.add("completion-date");
    completionDate.value = savedDetails.completedDate;
    completionDate.max = new Date().toLocaleDateString("en-CA");
    completionDate.addEventListener("change", () => {
        saveGamePersonalDetails(game.id, {
            rating: currentRating,
            completedDate: completionDate.value
        });
    });
    completionSection.append(completionLabel, completionDate);
    // Remove button
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.classList.add("remove-from-collection");
    removeButton.textContent = "Remove from Collection";
    removeButton.addEventListener("click", () => {
        onRemove(game.id);
    });
    card.append(coverLink, title, releaseDate, publisher, ratingSection, completionSection, removeButton);
    return card;
}
async function initializeCollectionPage() {
    // Find the page elements first.
    const gameList = document.querySelector("#game-list");
    const exportButton = document.querySelector("#export-collection");
    const importButton = document.querySelector("#import-collection");
    const importFileInput = document.querySelector("#import-collection-file");
    const backupStatus = document.querySelector("#backup-status");
    // Check that the game list exists.
    if (!gameList) {
        console.error("Could not find the game list.");
        return;
    }
    // Export button
    if (exportButton && backupStatus) {
        exportButton.addEventListener("click", () => {
            exportCollection(backupStatus);
        });
    }
    // Import button
    if (importButton && importFileInput && backupStatus) {
        importButton.addEventListener("click", () => {
            importFileInput.click();
        });
        importFileInput.addEventListener("change", async () => {
            const file = importFileInput.files?.[0];
            if (!file) {
                return;
            }
            try {
                backupStatus.textContent = "Checking backup file...";
                const response = await fetch("data/games.json");
                if (!response.ok) {
                    throw new Error(`Failed to load games: ${response.status}`);
                }
                const data = await response.json();
                const validGameIds = new Set(data.games.map((game) => game.id));
                await importCollection(file, validGameIds, backupStatus);
            }
            catch (error) {
                console.error("Could not prepare the import:", error);
                backupStatus.textContent =
                    "Unable to prepare the import. Please try again.";
            }
            finally {
                // Allow the same file to be selected again.
                importFileInput.value = "";
            }
        });
    }
    // Find the empty-collection message.
    const emptyMessage = gameList.querySelector(".empty-collection");
    if (!emptyMessage) {
        console.error("Could not find the empty-collection message.");
        return;
    }
    // Read the saved collection.
    const collectionIds = getCollectionIds();
    if (collectionIds.length === 0) {
        emptyMessage.hidden = false;
        return;
    }
    try {
        const response = await fetch("data/games.json");
        if (!response.ok) {
            throw new Error(`Failed to load games: ${response.status}`);
        }
        const data = await response.json();
        const collectionGames = data.games.filter((game) => collectionIds.includes(game.id));
        const gameGrid = document.createElement("div");
        gameGrid.classList.add("game-grid");
        emptyMessage.hidden = collectionGames.length > 0;
        for (const game of collectionGames) {
            const card = createCollectionCard(game, (gameId) => {
                try {
                    removeGameFromCollection(gameId);
                    card.remove();
                    if (gameGrid.children.length === 0) {
                        emptyMessage.hidden = false;
                    }
                }
                catch (error) {
                    console.error("Could not remove the game from your collection:", error);
                }
            });
            gameGrid.append(card);
        }
        if (collectionGames.length > 0) {
            gameList.append(gameGrid);
        }
    }
    catch (error) {
        console.error("Could not load the collection:", error);
        emptyMessage.hidden = false;
        emptyMessage.textContent =
            "Unable to load your collection. Please try again later.";
    }
}
initializeCollectionPage();
export {};
//# sourceMappingURL=collection.js.map