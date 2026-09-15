# Historical results recovery

Imported 32,565 distinct picks for 27 historical participants, covering 1,982 games and 132 weeks in 2016–2024. Twelve participants absent from the current roster were created with `active=false`. Existing participants retain their activity status, and 2026 remains current.

## User features

`/history` provides career totals and weighted accuracy, season and weekly accuracy charts, matching accessible tables, and an archive grid with unavailable weeks marked. Choose a former player using the inactive entries in the player selector. Season points open weekly trends; weekly points open saved picks. `/results` links back to player history. Both graphs and totals use published database standings, including future results as they become available. Zero-scored periods are omitted; gaps are never plotted as losses. Tied games credit either recorded selection under the existing league rules.

The data is applied to the configured database. The History page requires deployment of this app update; no schema migration is needed.

## Sources and decisions

- Source: the 135 Excel/CSV exports under `\\192.168.1.235\vault\smb\FukumaFootball\Results`.
- Matchups and winners: [nflverse historical schedules](https://github.com/nflverse/nfldata/blob/master/data/games.csv). Matching uses the season, week, and the teams observed in each source column, never assumed column order. Team relocation/name changes map to the app's fixed franchise IDs.
- Confirmed name merges: Robyn Romero → Robyn Sunata; Jill Walker → Jill Sunata; both Austin placeholder surnames → Austin Norton.
- Obvious team spelling errors are normalized: Sewhawks, Cheifs, Bangals, Raideres, Flacons.
- TestAccount_DoNotUse and zzTestPerson are excluded.
- Identical duplicate picks collapse. The newest submission timestamp wins for revised picks (20 choices); conflicting choices at identical latest timestamps would be withheld. Timestamp zones are normalized to UTC. Source row, column, file hash, and the decision are retained in the working import plan. Export timestamps can be after games and are not evidence of on-time submission.
- `2019/responses.xlsx` is assigned to 2019 week 9 using its November 1–3 timestamps and all matching game columns.
- Rows 2–17 of the 2022 week 10 CSV are a copied 2021 week 18 block, established by January 2022 timestamps and its 16 matchups. They are deduplicated against that season's original export; November rows belong to 2022 week 10.
- Historical kickoff times are left unknown rather than fabricating times from inconsistent form labels.
- Emails, secret codes, network identifiers, themes, and confirmation emails are not imported.

## Coverage limits

| Season | Missing weeks |
| --- | --- |
| 2016 | 12 |
| 2017 | None |
| 2018 | None |
| 2019 | 13–17 |
| 2020 | None; two played games have no recovered picks |
| 2021 | None; Jets–Colts in week 9 has no recovered picks |
| 2022 | 11 |
| 2023 | 7–18 |
| 2024 | 13–18 |

Unmatched source columns are withheld: Buccaneers–Dolphins in 2017 week 1; Broncos–Patriots in 2020 week 5; Jets–Chargers and Broncos–Dolphins in 2020 week 6; Bills–Bengals in 2022 week 17. These columns do not match the schedule for the source week (rescheduled/canceled games). They are not reassigned to another scoring week by assumption. In 2023 week 6, the 49ers–Browns column has one `at Bears` selection (Aunty Mats, row 6); that single choice is withheld while its valid 49ers selections are retained. Missing games/weeks and blank picks receive no invented selections or credit. These are reconstructed available records, not certified complete original season totals.

## Reproduce and verify

1. Copy Results to the ignored `.historical-source/Results` directory, and download the schedule CSV to `.historical-source/nfl-games.csv`.
2. Run `python scripts/extract-history.py` with a Python environment containing openpyxl, then `python scripts/reconstruct-history.py`.
3. Review `.historical-source/import-plan.json`. It contains sanitized picks, source references, file hashes, coverage, exclusions, and revisions.
4. Run `node --env-file=.env.local scripts/import-history.mjs` for a rollback preview. It requires the trusted operations connection. PostgreSQL identity sequences may advance during a preview even though inserted rows roll back.
5. Run the same command with `--apply` to commit an authorized import. It is additive and idempotent: conflicts with existing results/picks abort rather than overwrite; active seasons are rejected; new players are inactive. All writes are one transaction. Neither the submission RPC nor email worker runs.

The applied report is `reports/historical-import-applied.json`; the full sanitized plan is retained locally in `.historical-source/import-plan.json`. Preserve the source exports and plan for future correction audits. The report records the plan and schedule SHA-256 hashes.

Validation: 50 relevant tests passed (history, database, family picks), production build and lint passed. Every one of the 32,565 hosted historical picks was compared with its planned player, matchup, selection, and winner after import. The graph, tables, player filters, and saved-pick navigation are also checked in the local browser preview.
