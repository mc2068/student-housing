import type { ReactNode } from "react";
import { faculties } from "../collection/data";
import { type Filters, SIZE_CHOICES } from "../search/search";
import { activeFilterLabels, FURNISHED_VALUE, GENDER_VALUE, KIND_VALUE, PARAM } from "./filters";
import { furnishedName, KIND_LABEL, PRICE_BASIS_LABEL, sizeChoiceLabel } from "./labels";

// Students know their faculty by its acronym, so the list is in acronym order, whatever the type.
const FACULTIES = [...faculties].sort((a, b) => a.short.localeCompare(b.short, "fr"));

function Choice({ type, name, value, checked, children }: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  children: ReactNode;
}) {
  return (
    <label className="choice">
      <input type={type} name={name} value={value} defaultChecked={checked} />
      <span>{children}</span>
    </label>
  );
}

function Budget({ id, name, label, value }: { id: string; name: string; label: string; value?: number }) {
  return (
    <div className="budget">
      <label htmlFor={id}>{label}</label>
      <div className="budget-field">
        <input id={id} name={name} type="number" inputMode="numeric" min="1" step="1" defaultValue={value} placeholder="Sans limite" />
        <span aria-hidden="true">DT</span>
      </div>
    </div>
  );
}

/** The search form. It works without JavaScript: submitting it puts the faculty and the filters in the address. */
export function SearchForm({ facultyId, filters = {} }: { facultyId?: string; filters?: Filters }) {
  const activeCount = activeFilterLabels(filters).length;
  return (
    <form className="search" action="/" method="get">
      <label htmlFor="faculte">Votre faculté, école ou institut</label>
      <select id="faculte" name={PARAM.faculty} defaultValue={facultyId ?? ""} required>
        <option value="" disabled>
          Choisir dans la liste
        </option>
        {FACULTIES.map((faculty) => (
          <option key={faculty.id} value={faculty.id}>
            {faculty.short} : {faculty.name}
          </option>
        ))}
      </select>

      <details className="filters">
        <summary>{activeCount === 0 ? "Affiner la recherche" : `Affiner la recherche (${activeCount})`}</summary>

        <fieldset>
          <legend>Type de logement</legend>
          <div className="choices">
            <Choice type="radio" name={PARAM.kind} value="" checked={!filters.kind}>
              Les deux
            </Choice>
            <Choice type="radio" name={PARAM.kind} value={KIND_VALUE.rental} checked={filters.kind === "rental"}>
              {KIND_LABEL.rental}
            </Choice>
            <Choice type="radio" name={PARAM.kind} value={KIND_VALUE.flatshare} checked={filters.kind === "flatshare"}>
              {KIND_LABEL.flatshare}
            </Choice>
          </div>
        </fieldset>

        <fieldset>
          <legend>Budget maximum par mois, en dinars</legend>
          <div className="budgets">
            <Budget
              id="budget-personne"
              name={PARAM.perPersonBudget}
              label={`${KIND_LABEL.flatshare}, ${PRICE_BASIS_LABEL.flatshare}`}
              value={filters.perPersonBudget}
            />
            <Budget
              id="budget-logement"
              name={PARAM.wholeUnitBudget}
              label={`${KIND_LABEL.rental}, ${PRICE_BASIS_LABEL.rental}`}
              value={filters.wholeUnitBudget}
            />
          </div>
          <p className="hint">Un budget laissé vide ne fixe aucune limite. Avec un budget, les annonces sans prix sont masquées.</p>
        </fieldset>

        <fieldset>
          <legend>Logement ouvert aux</legend>
          <div className="choices">
            <Choice type="radio" name={PARAM.gender} value="" checked={!filters.gender}>
              Peu importe
            </Choice>
            <Choice type="radio" name={PARAM.gender} value={GENDER_VALUE.girls} checked={filters.gender === "girls"}>
              Filles
            </Choice>
            <Choice type="radio" name={PARAM.gender} value={GENDER_VALUE.boys} checked={filters.gender === "boys"}>
              Garçons
            </Choice>
          </div>
        </fieldset>

        <fieldset>
          <legend>Taille (plusieurs choix possibles)</legend>
          <div className="choices">
            {SIZE_CHOICES.map((size) => (
              <Choice key={size} type="checkbox" name={PARAM.sizes} value={String(size)} checked={filters.sizes?.includes(size) ?? false}>
                {sizeChoiceLabel(size)}
              </Choice>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Ameublement</legend>
          <div className="choices">
            <Choice type="radio" name={PARAM.furnished} value="" checked={filters.furnished === undefined}>
              Peu importe
            </Choice>
            <Choice type="radio" name={PARAM.furnished} value={FURNISHED_VALUE.yes} checked={filters.furnished === true}>
              {furnishedName(true)}
            </Choice>
            <Choice type="radio" name={PARAM.furnished} value={FURNISHED_VALUE.no} checked={filters.furnished === false}>
              {furnishedName(false)}
            </Choice>
          </div>
        </fieldset>

        <p className="hint">
          Une annonce qui ne précise pas sa taille, son ameublement ou à qui elle s'adresse reste affichée, avec la
          mention « non précisé ».
        </p>
      </details>

      <button type="submit">Voir les annonces</button>
    </form>
  );
}
