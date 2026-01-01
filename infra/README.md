# Infrastructure

## Deploying Firebase rules/indexes

Run the following command from the repository root after configuring Firebase locally:

```
firebase deploy --only firestore:rules,firestore:indexes,storage
```
