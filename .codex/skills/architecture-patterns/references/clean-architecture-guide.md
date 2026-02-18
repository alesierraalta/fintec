# Clean Architecture Guide

## Scope

This reference expands the layer definitions, dependency rules, and testing approach.

## Layers

- Entities: core business rules, no framework dependencies.
- Use Cases: application-specific workflows and orchestration.
- Interface Adapters: controllers, presenters, gateways.
- Frameworks and Drivers: UI, database, queues, external APIs.

## Testing Notes

- Test entities and use cases without infrastructure.
- Mock ports at the boundaries.
