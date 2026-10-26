import SearchBar from "./components/SearchBar";
import GamesPage from "./pages/GamesPages";
import CollectionPage from "./pages/Collection";
import GamePage from "./pages/GamePage";

function App() {
    if (window.location.pathname.endsWith("/games.html")) {
        return <GamesPage />;
    }

    if (window.location.pathname.endsWith("/game-page.html")) {
        return <GamePage />;
    }

    if (window.location.pathname.endsWith("/collection.html")) {
        return <CollectionPage />;
    }

    return (
        <>
            {/* Navigation */}
            <header className="site-header">
                <nav className="navbar" aria-label="Main navigation">
                    <a
                        href="/index.html"
                        className="site-logo"
                        aria-current="page"
                    >
                        GameLog
                    </a>

                    <div className="nav-links">
                        <a
                            href="/collection.html"
                            className="nav-link"
                        >
                            My Collection
                        </a>

                        <a
                            href="/games.html"
                            className="nav-link"
                        >
                            Available Games
                        </a>

                        {/* React search with autocomplete */}
                        <SearchBar />
                    </div>
                </nav>
            </header>

            <main>
                {/* Welcome Section */}
                <section
                    className="hero"
                    aria-labelledby="hero-title"
                >
                    <div className="hero-content">
                        <h1 id="hero-title">
                            Your gaming journey, all in one place.
                        </h1>

                        <p>
                            Keep track of the games you've completed,
                            remember your experiences, and build your
                            personal gaming collection.
                        </p>

                        <div className="hero-actions">
                            <a
                                href="/collection.html"
                                className="primary-button"
                            >
                                Start Your Collection
                            </a>

                            <button
                                type="button"
                                className="secondary-button"
                                id="hero-search-button"
                                onClick={() => {
                                    window.location.href = "/games.html";
                                }}
                            >
                                Our Games List
                            </button>
                        </div>
                    </div>
                </section>

                {/* About Section */}
                <section
                    className="about"
                    id="about"
                    aria-labelledby="about-title"
                >
                    <h2 id="about-title">
                        About GameLog
                    </h2>

                    <p>
                        GameLog is your personal space to record the games
                        you've finished, rate your experiences, and save
                        notes about your gaming adventures.
                    </p>
                </section>
            </main>

            {/* Footer */}
            <footer className="site-footer">
                <p>&copy; 2026 GameLog. All rights reserved.</p>
            </footer>
        </>
    );
}

export default App;
