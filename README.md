# Shift:Kronos

Shift:Kronos is the umbrella repository for both the current active application and the earlier legacy code that informed it.

## Repository Layout

- `Shift.Kronos/`: active application and current development workspace
- `aipa/`: legacy frontend retained for reference during later consolidation
- `aipa_backend/`: legacy backend retained for reference during later consolidation

## Current Development Target

Active product work now happens inside `Shift.Kronos/`.

That application is the current path for:

- product development
- validation and testing
- Vercel deployment
- branding and product evolution

## Naming Rules

- user-facing product name: `Shift:Kronos`
- GitHub/package/deployment slug: `shift-kronos`
- active app folder name: `Shift.Kronos/`

## Deployment

When deploying to Vercel, use `Shift.Kronos/` as the project root directory.

## Future Consolidation

The legacy `aipa/` and `aipa_backend/` folders remain in this repository intentionally. They are not the active app, but they are being preserved until a later integration pass merges the useful parts into the current `Shift.Kronos/` application.
