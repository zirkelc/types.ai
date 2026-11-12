# Maintaining ai-types

## Pipeline

1. Every day, `sync.yml` downloads the [models.dev v2 API](https://models.dev/experimental/v2.0/api.json), writes a filtered snapshot to `data/models.json` and generates the types in `src/generated`.
2. A mapping per SDK package (`mappings/ai-sdk/*.ts`, `mappings/tanstack/*.ts`) connects the models.dev capabilities to the SDK option fields. The mapping is typed with the SDK types, so a wrong field name, capability path or value is a type error in the mapping file. See `mappings/define.ts` for the field kinds (`enum`, `flag`, `variants`) and the target fields (`baseType`, `subTypes`, `modelIds`). `modelIds` and `otherModelIds` name the model ID types of the SDK. The options of a target give an error type for an ID that the SDK knows only for another model type (`otherModelIds`), and add the IDs of `modelIds` to the autocomplete.
3. For each provider, a generated check file (`src/generated/<sdk>/<provider>.check.ts`) compiles the mapping against the SDK types. If the SDK renames a field or narrows a value, the type check fails.
4. The sync opens or updates one pull request (`fix(data): sync models.dev`). Its body lists the changes. If the sync only adds or changes data, the pull request merges when CI passes. If it removes data (a model, a value, or a flag from `true` to `false`), it gets the `needs-review` label and waits for a review, because the published types can become narrower.
5. Renovate opens pull requests for the SDK packages. If an SDK changes its types, the generated checks fail on that pull request. The fix is an edit of the mapping.
6. Each merge to `main` starts `release.yml`. `scripts/release.ts` takes the bump from the conventional commits since the last tag (`fix` and `perf`: patch, `feat`: minor, breaking: major, before 1.0.0 minor) and publishes with npm trusted publishing. Other commit types (`chore`, `docs`, `ci`, `test`, `refactor`) give no release. The version lives only in the tags and on npm.

## Add a provider

Add a mapping file in `mappings/<sdk>/` and run `pnpm generate`. The `fetch-models` script lists the AI SDK packages in models.dev that have no mapping yet.

## Scripts

| Script                   | Purpose                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| `pnpm sync`              | Fetch the models.dev data and generate the types.                  |
| `pnpm generate`          | Generate the types from `data/models.json` and the mappings.       |
| `pnpm diff-data`         | Show the data changes against `HEAD`, as in the sync pull request. |
| `pnpm cross-check`       | Compare models.dev with the AI SDK model catalogs (warnings only). |
| `pnpm release --dry-run` | Show the next version without a release.                           |

## One-time repository setup

1. Create a GitHub App with the repository permissions "Contents: write" and "Pull requests: write", and install it on this repository. Save its client ID as the variable `SYNC_APP_CLIENT_ID` and a private key as the secret `SYNC_APP_PRIVATE_KEY`.
2. In the repository settings: allow auto-merge, allow only squash merges with the pull request title as the commit message, and protect `main` with the required status check `check` (from `ci.yml`).
3. Publish the first version by hand: `pnpm release --bump minor` with an npm login and `gh` authentication. npm can set up trusted publishing only for a package that exists.
4. On npmjs.com, add `release.yml` of this repository as the trusted publisher of the package.
5. Install the Renovate app on the repository.
