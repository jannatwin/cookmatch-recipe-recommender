# CookMatch Software Requirements Specification

Oct 17, 2026 · @saske

## 1. Introduction

CookMatch is a web-based system that recommends recipes from the ingredients a user already has at home. This document states what the system must do, and it is the basis for the design, use case modeling and implementation planning of the Software Engineering course project.

### 1.1 Purpose

This specification defines the functional and non-functional requirements of CookMatch so that the team, the instructor and future maintainers share one agreed description of the system.

### 1.2 Scope

CookMatch takes the user's available ingredients as the main input and returns a ranked list of recipes, with missing ingredients and substitutes shown. It also prioritizes ingredients close to expiry to reduce food waste, and lets users filter results by cuisine, cooking time and dietary preference. Items the first version does not cover are listed in section 8.

### 1.3 Definitions

| Term | Meaning |
| --- | --- |
| Match score | Percentage of a recipe's required ingredients that the user already has |
| Almost-achievable recipe | A recipe with only one or two missing ingredients |
| Substitute | An alternative ingredient that can replace a missing one in a recipe |
| Expiring ingredient | An ingredient the user marked as close to its expiry date |
| Pantry | The user's current list of available ingredients |

## 2. Overall Description

CookMatch is a standalone web application that sits between a user's pantry and a recipe database, turning a list of ingredients into ranked, ready-to-cook suggestions.

### 2.1 Product perspective

The system has four parts that work together: a web user interface, a recommendation engine that searches and scores recipes, a recipe database, and a user account module. The user interface passes the entered ingredients to the engine, the engine reads recipe data from the database, and ranked results return to the user.

### 2.2 User classes

| User class | Description | Main needs |
| --- | --- | --- |
| Registered user | Anyone who cooks at home and has an account | Enter ingredients, view ranked recipes, apply filters, start cooking |
| Administrator | Team member who maintains recipe and ingredient data | Add, edit and remove recipes, ingredients and substitutes |

### 2.3 Operating environment

- Runs in a modern web browser (Chrome, Firefox, Edge, Safari) on desktop and mobile screens.
- Server side runs on a standard web server with a relational or document database.

### 2.4 Assumptions and dependencies

- Users can name their ingredients in text, and the database holds a matching ingredient name or alias.
- A recipe database with ingredients, instructions and tags is available before the first release.
- Users have an internet connection while using the system.

### 2.5 Constraints

- The project is built within the Software Engineering course timeline and follows the standard SDLC phases.
- Matching uses ingredient presence or absence only, not quantities.
- Recommendation quality is limited by the completeness of the recipe and ingredient database.

## 3. Functional Requirements

The system shall provide the 21 functions below. Priority is High (needed for the first release), Medium (expected) or Low (nice to have).

### 3.1 Account management

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The system shall let a new user register with a name, email and password | High |
| FR-2 | The system shall let a registered user log in and log out | High |
| FR-3 | The system shall reject invalid credentials and show a clear error message | High |

### 3.2 Ingredient input

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-4 | The system shall let the user enter available ingredients by typing, with name suggestions as they type | High |
| FR-5 | The system shall let the user add, edit and remove ingredients in their pantry list | High |
| FR-6 | The system shall let the user optionally mark an ingredient with an expiry date | Medium |
| FR-7 | The system shall validate the input and match entered names to database ingredients, including known aliases | High |

### 3.3 Matching and ranking

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-8 | The system shall search the recipe database for recipes that use the user's ingredients | High |
| FR-9 | The system shall calculate a match score for each recipe as the percentage of required ingredients the user has | High |
| FR-10 | The system shall return recipes ranked from highest to lowest match score | High |
| FR-11 | The system shall give higher priority to recipes that use expiring ingredients | Medium |
| FR-12 | The system shall show, for each recipe, which ingredients the user has and which are missing | High |

### 3.4 Near matches and substitutes

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-13 | The system shall highlight recipes with only one or two missing ingredients as almost achievable | High |
| FR-14 | The system shall suggest substitutes for a missing ingredient when one exists in the database | Medium |

### 3.5 Filtering

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-15 | The system shall let the user filter recipes by cuisine, cooking time and dietary preference | High |
| FR-16 | The system shall apply several filters together and keep the ranking order within the filtered results | Medium |

### 3.6 Recipe details and cooking

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-17 | The system shall let the user select a recipe from the recommended list | High |
| FR-18 | The system shall display complete recipe details: ingredients, instructions and an image where available | High |
| FR-19 | The system shall let the user start cooking from the recipe details view | Low |

### 3.7 Administration

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-20 | The administrator shall be able to add, edit and delete recipes | High |
| FR-21 | The administrator shall be able to manage ingredients, aliases and substitute mappings | Medium |

## 4. Non-Functional Requirements

Targets below are proposed starting values for the team to confirm during design.

| ID | Category | Requirement |
| --- | --- | --- |
| NFR-1 | Performance | The system shall return ranked recommendations within 3 seconds for a pantry of up to 30 ingredients |
| NFR-2 | Performance | The system shall support at least 50 concurrent users without noticeable slowdown |
| NFR-3 | Usability | A new user shall be able to enter ingredients and view recommendations without training |
| NFR-4 | Usability | The interface shall work on desktop and mobile screen sizes |
| NFR-5 | Reliability | The system shall keep an availability of at least 99% during demonstration and testing periods |
| NFR-6 | Security | Passwords shall be stored as salted hashes, never in plain text |
| NFR-7 | Security | Only the administrator role shall be able to change recipe and ingredient data |
| NFR-8 | Security | User input shall be sanitized to prevent injection attacks |
| NFR-9 | Portability | The system shall run in current versions of Chrome, Firefox, Edge and Safari |
| NFR-10 | Maintainability | The matching algorithm shall be a separate module so it can be changed without altering the interface |
| NFR-11 | Accuracy | Match scores shall be computed consistently, so the same pantry always gives the same ranking |

## 5. External Interface Requirements

| Interface | Requirement |
| --- | --- |
| User interface | Pages for register / log in, ingredient entry, recommended recipe list with filters, and recipe details. Each recipe card shows match score, missing ingredients and substitutes |
| Hardware | Any device with a web browser and internet access; no special hardware |
| Software | Web server, application back end, and a database holding recipes, ingredients, substitutes and user accounts |
| Communication | Browser and server communicate over HTTPS; the interface sends ingredient lists and receives ranked results |

## 6. Data Requirements

The system stores the following main entities.

| Entity | Key data |
| --- | --- |
| User | Name, email, password hash, role (user or administrator) |
| Ingredient | Name, aliases |
| Pantry item | User, ingredient, optional expiry date |
| Recipe | Title, cuisine, cooking time, dietary tags, instructions, image |
| Recipe ingredient | Recipe, ingredient (presence only, no quantity) |
| Substitute | Ingredient, replacement ingredient |

### Matching rule

The match score of a recipe is the share of its required ingredients that the user already has. Quantities are not considered.

```latex
\text{Match score} = \frac{\text{ingredients the user has}}{\text{ingredients the recipe requires}} \times 100\%
```

Recipes are sorted by match score from highest to lowest. A recipe that uses expiring ingredients ranks above recipes with a similar score; the exact weighting is to be decided in the design phase.

## 7. Use Case Summary

The system has two actors: the User and the Administrator. Each use case below is to be detailed with a full description, flows and exceptions in the use case modeling phase.

| ID | Use case | Actor | Related requirements |
| --- | --- | --- | --- |
| UC-1 | Register / Log in | User | FR-1 to FR-3 |
| UC-2 | Enter available ingredients | User | FR-4 to FR-7 |
| UC-3 | View recommended recipes | User | FR-8 to FR-12 |
| UC-4 | View almost-achievable recipes and substitutes | User | FR-13, FR-14 |
| UC-5 | Filter recipes | User | FR-15, FR-16 |
| UC-6 | View recipe details | User | FR-17, FR-18 |
| UC-7 | Start cooking | User | FR-19 |
| UC-8 | Manage recipes, ingredients and substitutes | Administrator | FR-20, FR-21 |

## 8. Limitations and Out of Scope

1. Recommendation accuracy depends on how complete and correct the recipe and ingredient database is.
2. The first version matches on ingredient presence or absence only and ignores quantities.
3. Any nutritional or dietary information is approximate and not verified by a certified nutritionist.
4. Image-based ingredient recognition, such as detecting ingredients from a photo of a fridge, is not supported.
5. Regional and local ingredient names may not be fully standardized in the initial database.

## 9. Future Enhancements

- Personalized recommendations based on user preferences and previous recipe choices.
- Recommendations based on nutritional requirements.
- Quantity-aware matching.
- Image-based ingredient recognition from a photo.
- Standardized regional and local ingredient names in the database.
