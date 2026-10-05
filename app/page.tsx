import { faculties } from "../collection/data";
import { VISIBLE_DAYS } from "../collection/domain";
import { searchListings } from "../search/search";
import { database } from "./database";
import { activeFilterLabels, facultyIdFromParams, filtersFromParams, PARAM, type SearchParams } from "./filters";
import { neighbourhoodName } from "./labels";
import { ListingCard } from "./listing-card";
import { SearchForm } from "./search-form";

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const faculty = faculties.find((f) => f.id === facultyIdFromParams(params));

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
  const filters = filtersFromParams(params);
  const active = activeFilterLabels(filters);
  const listings = await searchListings({ facultyId: faculty.id, ...filters }, { db: await database(), faculties, now });
  const allListings = `/?${PARAM.faculty}=${faculty.id}`;

  return (
    <>
      <section className="hero hero-compact">
        <div className="column">
          <SearchForm facultyId={faculty.id} filters={filters} />
        </div>
      </section>
      <main className="column">
        <h1 className="results-title">{faculty.name}</h1>
        <p className="results-summary">
          {listings.length === 0
            ? active.length === 0
              ? `Aucune annonce de moins de ${VISIBLE_DAYS} jours dans les quartiers proches pour le moment.`
              : `Aucune annonce de moins de ${VISIBLE_DAYS} jours ne correspond à ces critères.`
            : `${listings.length} ${listings.length === 1 ? "annonce" : "annonces"} de moins de ${VISIBLE_DAYS} jours, les plus récentes d'abord.`}
        </p>
        <p className="results-places">
          Quartiers proches ({faculty.campus}) : {faculty.neighbourhoods.map(neighbourhoodName).join(", ")}.
        </p>
        {active.length > 0 && (
          <div className="results-filters">
            <ul>
              {active.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
            <a href={allListings}>Retirer les filtres</a>
          </div>
        )}
        {listings.length === 0 ? (
          <p className="note">
            {active.length === 0
              ? "De nouvelles annonces arrivent régulièrement. Revenez bientôt, ou choisissez un établissement voisin dans la liste."
              : "Essayez d'augmenter votre budget ou de retirer un filtre. De nouvelles annonces arrivent régulièrement."}
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
