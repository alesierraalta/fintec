---
name: architecture-patterns
description: >
  Master proven backend architecture patterns including Clean Architecture, Hexagonal Architecture, and Domain-Driven Design.
  Trigger: Designing backend architectures or applying DDD and Clean Architecture patterns.
metadata:
  version: '1.0'
  scope: [root]
  auto_invoke:
    - 'Designing new backend systems from scratch'
    - 'Refactoring monolithic applications for better maintainability'
    - 'Establishing architecture standards for your team'
    - 'Migrating from tightly coupled to loosely coupled architectures'
    - 'Implementing domain-driven design principles'
    - 'Creating testable and mockable codebases'
    - 'Planning microservices decomposition'
allowed-tools: Read, Edit, Write, Grep, Task
---

## When to Use

Use this skill when:

- Designing new backend systems from scratch
- Refactoring monolithic applications for better maintainability
- Establishing architecture standards for your team
- Migrating from tightly coupled to loosely coupled architectures
- Implementing domain-driven design principles
- Creating testable and mockable codebases
- Planning microservices decomposition

---

## Critical Patterns

- Dependency Rule: dependencies point inward toward the domain.
- Business logic stays framework-agnostic and testable without infrastructure.
- Ports and adapters isolate external systems from the core.
- Use cases orchestrate application logic; controllers remain thin.
- Model the domain with entities, value objects, aggregates, and events.
- Bound contexts and ubiquitous language are explicit and documented.

---

## Core Concepts

### 1. Clean Architecture (Uncle Bob)

Layers (dependency flows inward):

- Entities: core business models
- Use Cases: application business rules
- Interface Adapters: controllers, presenters, gateways
- Frameworks and Drivers: UI, database, external services

Key principles:

- Inner layers know nothing about outer layers
- Business logic independent of frameworks
- Testable without UI, database, or external services

### 2. Hexagonal Architecture (Ports and Adapters)

Components:

- Domain Core: business logic
- Ports: interfaces defining interactions
- Adapters: implementations of ports (database, REST, message queue)

Benefits:

- Swap implementations easily (mock for testing)
- Technology-agnostic core
- Clear separation of concerns

### 3. Domain-Driven Design (DDD)

Strategic patterns:

- Bounded Contexts: separate models for different domains
- Context Mapping: how contexts relate
- Ubiquitous Language: shared terminology

Tactical patterns:

- Entities: objects with identity
- Value Objects: immutable objects defined by attributes
- Aggregates: consistency boundaries
- Repositories: data access abstraction
- Domain Events: things that happened

---

## Clean Architecture Pattern

Directory structure:

```
app/
  domain/
    entities/
    value_objects/
    interfaces/
  use_cases/
  adapters/
    repositories/
    controllers/
    gateways/
  infrastructure/
```

---

## Code Examples

```python
# domain/entities/user.py
from dataclasses import dataclass
from datetime import datetime

@dataclass
class User:
    id: str
    email: str
    name: str
    created_at: datetime
    is_active: bool = True

    def deactivate(self):
        self.is_active = False

    def can_place_order(self) -> bool:
        return self.is_active
```

```python
# domain/interfaces/user_repository.py
from abc import ABC, abstractmethod
from typing import Optional
from domain.entities.user import User

class IUserRepository(ABC):
    @abstractmethod
    async def find_by_id(self, user_id: str) -> Optional[User]:
        pass

    @abstractmethod
    async def save(self, user: User) -> User:
        pass
```

```python
# use_cases/create_user.py
from dataclasses import dataclass
from datetime import datetime
import uuid
from domain.entities.user import User
from domain.interfaces.user_repository import IUserRepository

@dataclass
class CreateUserRequest:
    email: str
    name: str

@dataclass
class CreateUserResponse:
    user: User
    success: bool
    error: str | None = None

class CreateUserUseCase:
    def __init__(self, user_repository: IUserRepository):
        self.user_repository = user_repository

    async def execute(self, request: CreateUserRequest) -> CreateUserResponse:
        existing = await self.user_repository.find_by_id(request.email)
        if existing:
            return CreateUserResponse(user=None, success=False, error="Email already exists")

        user = User(
            id=str(uuid.uuid4()),
            email=request.email,
            name=request.name,
            created_at=datetime.now(),
            is_active=True,
        )

        saved_user = await self.user_repository.save(user)
        return CreateUserResponse(user=saved_user, success=True)
```

---

## Best Practices

- Dependency Rule: dependencies always point inward.
- Interface Segregation: small, focused interfaces.
- Business Logic in Domain: keep frameworks out of the core.
- Test Independence: core testable without infrastructure.
- Bounded Contexts: clear domain boundaries.
- Ubiquitous Language: consistent terminology.
- Thin Controllers: delegate to use cases.
- Rich Domain Models: behavior with data.

---

## Common Pitfalls

- Anemic Domain: entities with only data, no behavior.
- Framework Coupling: business logic depends on frameworks.
- Fat Controllers: business logic in controllers.
- Repository Leakage: exposing ORM objects to the domain.
- Missing Abstractions: concrete dependencies in core.
- Over-Engineering: applying clean architecture to trivial CRUD.

---

## Commands

```bash
# Use your project test runner to validate core logic
```

---

## Resources

- **References**: `references/`
- **Templates**: `assets/clean-architecture-template/`
- **Examples**: `assets/ddd-examples/`
