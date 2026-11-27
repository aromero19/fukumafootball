"use client";
import { useState } from "react";

const TIE = 33, OPEN = 34;
type Team = { id: number; name: string };

/** Winner buttons for one game. Nothing saves until the named confirm button is pressed. */
export default function AdminResultChoice({ away, home, saved }: { away: Team; home: Team; saved: number }) {
  const [choice, setChoice] = useState({ saved, picked: saved });
  // A newly saved result replaces whatever was selected.
  if (choice.saved !== saved) setChoice({ saved, picked: saved });
  const picked = choice.picked;
  const options = [away, home, { id: TIE, name: "Tie" }, { id: OPEN, name: "Open" }];
  const confirm = picked === OPEN ? "Confirm: reopen picks" : picked === TIE ? "Confirm: tie" : `Confirm: ${options.find(option => option.id === picked)?.name} won`;
  return <>
    <fieldset className="admin-choice"><legend className="sr-only">Winner of {away.name} at {home.name}</legend>
      {options.map(option => <label key={option.id} className={option.id === TIE || option.id === OPEN ? "is-minor" : undefined}>
        <input type="radio" name="win_team_id" value={option.id} checked={picked === option.id} onChange={() => setChoice({ saved, picked: option.id })} />
        <span>{option.name}{saved === option.id && option.id !== OPEN && <small>Saved</small>}</span>
      </label>)}
    </fieldset>
    {picked !== saved && <div className="admin-confirm">
      <button className="button" name="confirm_result" value="on">{confirm}</button>
      <button className="button secondary" type="button" onClick={() => setChoice({ saved, picked: saved })}>Cancel</button>
    </div>}
  </>;
}
