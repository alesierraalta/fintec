# Hexagonal Architecture Guide

## Scope

This reference focuses on ports and adapters separation for clean boundaries.

## Ports

- Define interfaces for external interactions.
- Keep ports in the core or application layer.

## Adapters

- Implement ports for persistence, messaging, and HTTP.
- Provide test adapters for isolated unit tests.
