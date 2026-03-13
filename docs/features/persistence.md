# Persistence Slice

The adoption workflow now persists data to a JSON file so pets and applications survive backend restarts.

## Storage model

- default file: `tmp/petong-data.json`
- implementation: `backend/src/file-store.js`
- service integration: `backend/src/adoption-service.js`

## Current behavior

- pets persist after creation
- applications persist after submission
- approval status persists
- sequence counters persist, so IDs continue correctly after restart

## Runtime override

Set `PETONG_DATA_FILE` to use a different file path:

```bash
PETONG_DATA_FILE=/absolute/path/petong-data.json npm run start:backend
```

This keeps the current stack simple while moving the project beyond in-memory-only behavior.
