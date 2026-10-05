import type { Listing } from "../search/search";
import {
  age,
  dinars,
  type FactLabel,
  furnishedLabel,
  genderRestrictionLabel,
  KIND_LABEL,
  neighbourhoodName,
  PRICE_BASIS_LABEL,
  sizeLabel,
  sourceLabel,
} from "./labels";
import { reportLink } from "./report";

function Fact({ text, stated }: FactLabel) {
  return <li className={stated ? "fact" : "fact fact-unstated"}>{text}</li>;
}

export function ListingCard({ listing, now }: { listing: Listing; now: Date }) {
  const source = sourceLabel(listing.sourceId);
  return (
    <article className={`card card-${listing.kind}`}>
      <header className="card-head">
        <span className="card-kind">{KIND_LABEL[listing.kind]}</span>
        <time className="card-age" dateTime={listing.postedAt}>
          {age(listing.postedAt, now)}
        </time>
      </header>

      {listing.price === null ? (
        <p className="card-price card-price-unstated">Prix non précisé</p>
      ) : (
        <p className="card-price">
          <span className="card-amount">{dinars(listing.price)}</span>
          <span className="card-basis"> par mois, {PRICE_BASIS_LABEL[listing.kind]}</span>
        </p>
      )}

      <p className="card-place">{neighbourhoodName(listing.neighbourhoodId)}</p>

      <ul className="facts">
        <Fact {...sizeLabel(listing.size)} />
        <Fact {...furnishedLabel(listing.furnished)} />
        <Fact {...genderRestrictionLabel(listing.genderRestriction)} />
      </ul>

      {/* Posts mix French, Arabic and Tunisian Arabic in Latin letters: the text sets its own direction. */}
      <blockquote className="card-excerpt" dir="auto">
        {listing.excerpt}
      </blockquote>

      <footer className="card-foot">
        <a className="card-link" href={listing.url} target="_blank" rel="noopener noreferrer">
          Voir l'annonce sur {source.site}
        </a>
        {source.group && (
          <p className="card-source">
            Groupe <bdi>{source.group}</bdi>
          </p>
        )}
        <a className="card-report" href={reportLink(listing.url)}>
          Signaler cette annonce
        </a>
      </footer>
    </article>
  );
}
