# Timer API and SSE Schema

This app can load timers from an HTTP API snapshot and receive live updates from an SSE stream.

## Environment Variables

- `VITE_TIMERS_API_URL`: HTTP endpoint for initial timer snapshot (`GET` JSON).
- `VITE_TIMERS_SSE_URL`: SSE endpoint for live timer events (`EventSource`).

If either variable is missing, that source is skipped.

## Timer Object

A timer payload should provide fields that map to the app `Timer` type:

```json
{
  "date": "2026-04-17",
  "time": "18:30",
  "system": "6RCQ-V",
  "name": "Infrastructure Hub",
  "structure": "IHub",
  "state": "Final",
  "status": "Hostile",
  "region": "Vale of the Silent"
}
```

Notes:
- `date` must be `YYYY-MM-DD`.
- `time` must be `HH:mm` (UTC).
- `status` should be `Friendly` or `Hostile`.
- Unknown/extra fields are ignored.

## Snapshot API

### Request

```http
GET /timers
Accept: application/json
```

### Response (recommended)

```json
{
  "version": 1,
  "snapshotId": "2026-04-17T12:00:00Z",
  "timers": [
    {
      "date": "2026-04-17",
      "time": "18:30",
      "system": "6RCQ-V",
      "name": "Infrastructure Hub",
      "structure": "IHub",
      "state": "Final",
      "status": "Hostile",
      "region": "Vale of the Silent"
    }
  ]
}
```

Also accepted by the current client:
- Top-level array of timers: `[Timer, Timer, ...]`

## SSE Stream

### Connection

```http
GET /timers/stream
Accept: text/event-stream
```

### Supported Events

#### `snapshot`
Replace local timers with provided full snapshot.

```text
event: snapshot
data: {"timers":[ ... ]}
```

#### `upsert`
Insert/update one or many timers.

```text
event: upsert
data: {"timer": { ... }}
```

or

```text
event: upsert
data: {"timers": [ ... ]}
```

#### `delete`
Delete timers by key(s) or timer identity.

```text
event: delete
data: {"key":"2026-04-17|18:30|6RCQ-V|IHub|Infrastructure Hub"}
```

or

```text
event: delete
data: {"keys":["...","..."]}
```

or

```text
event: delete
data: {"timer": { ... }}
```

### Generic Message Envelope (optional)

The client also accepts default `message` events with:

```json
{
  "type": "snapshot | upsert | delete",
  "data": { }
}
```

## Identity Rules

The current client identifies a timer by:

```text
{date}|{time}|{system}|{structure}|{name}
```

For reliable updates/deletes, keep those fields stable across events.
