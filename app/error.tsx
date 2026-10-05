"use client";

// Shown when a search fails, for instance when the database cannot be read.
export default function SearchError({ reset }: { reset: () => void }) {
  return (
    <main className="column">
      <h1 className="results-title">Les annonces ne sont pas disponibles pour le moment</h1>
      <p className="note">
        La recherche n'a pas abouti. <button onClick={reset}>Réessayer</button>
      </p>
    </main>
  );
}
