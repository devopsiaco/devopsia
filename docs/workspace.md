# Workspace Artifacts (V1)

## Artifacts payload format

The workspace reads artifacts encoded with the `DEVOPSIA_ARTIFACTS_V1` payload shape:

```json
{ "files": [ { "path": "relative/path.ext", "content": "...", "mime": "..." } ] }
```

The parser accepts payloads directly on the structured response (`artifacts_v1`, `artifactsV1`, or `files`) or in an artifact body that contains the JSON payload (optionally prefixed by `[DEVOPSIA_ARTIFACTS_V1]`). Each file path is normalized to a safe, relative path and file sizes are capped to prevent oversized payloads.

## Tree building

File paths are split on `/` to build a folder/file tree. Folders are sorted before files, and names are sorted alphabetically. The tree builder also returns a `Map` keyed by path for fast lookups when rendering the viewer pane.

## Diff logic

When a new run is saved, the client fetches the most recent prior run for the same user that contains `artifacts_v1`. If a selected file path exists in both runs, the Workspace enables a diff toggle. Diff rendering uses line-level comparisons and shows a unified diff with added/removed line highlights.

## GitHub scaffold export rules

The GitHub scaffold export builds a ZIP file containing the artifact files plus optional repository conventions:

* `README.md` is generated if missing, with a short “How to use” section and an optional excerpt of the user prompt.
* `.gitignore` is generated if missing, with patterns based on detected project types:
  * Terraform (`.tf` files)
  * Helm (`Chart.yaml`)
  * Kubernetes (`kustomization.yaml`, or `manifests/*.yaml`)
  * Node (`package.json`)
  * Python (`pyproject.toml` or `requirements.txt`)
* `LICENSE` is included only when the user has previously set a license choice in local storage (MIT only).

All exports are generated client-side without server dependencies to keep static-host compatibility.
