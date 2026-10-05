import { faculties } from "../collection/data";
import { VISIBLE_DAYS } from "../collection/domain";
import { searchListings } from "../search/search";
import { database } from "./database";
import { neighbourhoodName } from "./labels";
import { ListingCard } from "./listing-card";

// Students know their faculty by its acronym, so the list is in acronym order, whatever the type.
const FACULTIES = [...faculties].sort((a, b) => a.short.localeCompare(b.short, "fr"));

function SearchForm({ facultyId }: { facultyId?: string }) {
  return (
    <form className="search" action="/" method="get">
      <label htmlFor="faculte">Votre faculté, école ou institut</label>
      <select id="faculte" name="faculte" defaultValue={facultyId ?? ""} required>
        <option value="" disabled>
          Choisir dans la liste
        </option>
        {FACULTIES.map((faculty) => (
          <option key={faculty.id} value={faculty.id}>
            {faculty.short} : {faculty.name}
          </option>
        ))}
      </select>
      <button type="submit">Voir les annonces</button>
    </form>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ faculte?: string | string[] }> }) {
  const { faculte } = await searchParams;
  const faculty = faculties.find((f) => f.id === faculte);

  if (!faculty) {
    return (
      <>
        <section className="hero">
          <div className="column">
            <h1>Un logement près de votre faculté</h1>
            <p className="hero-intro">
              Les annonces de location et de colocation publiées ces {VISIBLE_DAYS} derniers jours dans les quartiers
              proches de votre établissement, dans le Grand Tunis.
            </p>
            <SearchForm />
          </div>
        </section>
        <main className="column">
          <p className="note">
            Pas de compte à créer. Chaque annonce renvoie à sa publication d'origine : c'est là que vous verrez les
            photos et que vous contacterez l'auteur.
          </p>
        </main>
      </>
    );
  }

  const now = new Date();
  const listings = await searchListings({ facultyId: faculty.id }, { db: database(), faculties, now });

  return (
    <>
      <section className="hero hero-compact">
        <div className="column">
          <SearchForm facultyId={faculty.id} />
        </div>
      </section>
      <main className="column">
        <h1 className="results-title">{faculty.name}</h1>
        <p className="results-summary">
          {listings.length === 0
            ? `Aucune annonce de moins de ${VISIBLE_DAYS} jours dans les quartiers proches pour le moment.`
            : `${listings.length} ${listings.length === 1 ? "annonce" : "annonces"} de moins de ${VISIBLE_DAYS} jours, les plus récentes d'abord.`}
        </p>
        <p className="results-places">
          Quartiers proches ({faculty.campus}) : {faculty.neighbourhoods.map(neighbourhoodName).join(", ")}.
        </p>
        {listings.length === 0 ? (
          <p className="note">
            De nouvelles annonces arrivent régulièrement. Revenez bientôt, ou choisissez un établissement voisin dans
            la liste.
          </p>
        ) : (
          <ol className="results">
            {listings.map((listing) => (
              <li key={listing.url}>
                <ListingCard listing={listing} now={now} />
              </li>
            ))}
          </ol>
        )}
      </main>
    </>
  );
}
