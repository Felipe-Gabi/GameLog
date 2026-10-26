"use strict";
function initializeHomePage() {
    const heroSearchButton = document.querySelector("#hero-search-button");
    if (!heroSearchButton) {
        return;
    }
    heroSearchButton.addEventListener("click", () => {
        window.location.href = "games.html";
    });
}
initializeHomePage();
//# sourceMappingURL=main.js.map