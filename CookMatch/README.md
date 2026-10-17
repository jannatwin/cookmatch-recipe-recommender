# CookMatch

**A smart recipe recommendation system based on available ingredients.**

CookMatch is a web-based system that helps users decide what to cook using the ingredients they already have at home. The user enters the ingredients in their kitchen, and CookMatch returns a ranked list of recipes they can prepare. It also highlights recipes that are almost achievable with only one or two missing ingredients, and suggests substitutes when an ingredient is unavailable.

This project is developed for the Software Engineering course. It applies the full software development life cycle (SDLC): requirement analysis, system design, use case modeling and implementation planning.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Objectives](#objectives)
3. [Key Features](#key-features)
4. [How It Works](#how-it-works)
5. [System Architecture](#system-architecture)
6. [Tech Stack](#tech-stack)
7. [Project Structure](#project-structure)
8. [Getting Started](#getting-started)
9. [Configuration](#configuration)
10. [API Overview](#api-overview)
11. [Database Overview](#database-overview)
12. [UI Design](#ui-design)
13. [Limitations](#limitations)
14. [Future Enhancements](#future-enhancements)
15. [Documentation](#documentation)
16. [Team](#team)

---

## Problem Statement

People often struggle to decide what to cook when they do not want to buy new ingredients and only wish to use what is already at home. Traditional recipe websites are built around searching by dish name or by a single ingredient, and they do not tell the user how many required ingredients are missing. This wastes time on unusable recipes, causes unnecessary grocery purchases, and often leaves food unused until it spoils.

CookMatch takes the ingredients a user already owns as the main input and produces practical, ready-to-cook suggestions, while also reducing food waste.

## Objectives

1. Recommend recipes based on the ingredients currently available to the user.
2. Rank recipes by the percentage of required ingredients the user already has.
3. Reduce household food waste by prioritizing recipes that use ingredients close to expiry.
4. Suggest substitute ingredients when a recipe is missing one or more items.
5. Let users filter recipes by cuisine, cooking time and dietary preference.
6. Apply standard Software Engineering practices (requirement specification, use case modeling and system design) throughout development.

## Key Features

| Feature | Description |
| --- | --- |
| Account management | Register, log in and log out |
| Ingredient input | Type ingredients with name suggestions, add or remove them, and optionally set expiry dates |
| Smart matching | Ranks recipes by match score, the share of required ingredients the user has |
| Almost-achievable recipes | Highlights recipes missing only one or two ingredients |
| Substitute suggestions | Shows replacement options for missing ingredients |
| Expiry prioritization | Recipes that use ingredients close to expiry rank higher |
| Filters | Filter by cuisine, cooking time and dietary preference |
| Recipe details | Full ingredient list, step-by-step instructions and image |
| Admin tools | Manage recipes, ingredients, aliases and substitutes |

## How It Works

1. The user registers or logs in.
2. The user enters the ingredients they have.
3. CookMatch validates the input and sends the request to the recommendation engine.
4. The engine searches the recipe database and calculates a match score for each recipe:

   ```
   Match score = (ingredients the user has / ingredients the recipe requires) x 100%
   ```

5. Recipes are ranked from highest to lowest score. Recipes that use expiring ingredients rank above recipes with a similar score.
6. The user views the ranked list, applies filters, and selects a recipe.
7. CookMatch shows the complete recipe, and the user starts cooking.

Matching is based on the presence or absence of ingredients only. Quantities are not considered.

## System Architecture

CookMatch uses a layered client-server architecture.

| Layer | Responsibility |
| --- | --- |
| Presentation | Web UI for login, ingredient entry, recommendations, filters and recipe details |
| Application | REST API that handles requests, validation and authentication |
| Business logic | Ingredient normalizer, matching and ranking engine, substitute finder |
| Data | Relational database for users, ingredients, recipes, substitutes and pantry data |

```
Browser  <--HTTPS/JSON-->  REST API  -->  Matching Engine  -->  Database
```

See [`cookmatch_architecture_and_database.md`](cookmatch_architecture_and_database.md) for the component diagram, sequence diagram and module details.

## Tech Stack

> This is the proposed stack. Update it if the team uses different tools.

| Part | Technology |
| --- | --- |
| Frontend | React, CSS (claymorphism style) |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Authentication | JWT, bcrypt |
| API style | REST over HTTPS, JSON |

## Project Structure

```
cookmatch/
  client/                  # React web app
    src/
      pages/               # Login, Pantry, Recommendations, RecipeDetails
      components/          # RecipeCard, IngredientChip, FilterPills, ScoreBadge
      api/                 # API call helpers
  server/
    src/
      routes/              # auth, pantry, recommendations, recipes, admin
      controllers/
      services/            # normalizer, matcher, substitutes
      middleware/          # auth, role check, validation
      db/                  # connection, migrations, seed data
  docs/                    # SRS, architecture, API, design files
  README.md
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- PostgreSQL 14 or later
- npm

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd cookmatch

# 2. Install backend dependencies
cd server
npm install

# 3. Install frontend dependencies
cd ../client
npm install
```

### Set up the database

```bash
# Create the database
createdb cookmatch

# Create tables (schema is in cookmatch_architecture_and_database.md)
psql -d cookmatch -f server/src/db/schema.sql

# Load sample data
psql -d cookmatch -f server/src/db/seed.sql
```

### Run the app

```bash
# Start the backend (from /server)
npm run dev

# Start the frontend (from /client)
npm start
```

The frontend runs at `http://localhost:3000` and the API at `http://localhost:5000` by default.

> The commands above assume the folder structure and npm scripts shown in this README. Adjust them to match the final code.

## Configuration

Create a `.env` file in the `server` folder:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/cookmatch
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=1h
EXPIRY_WARNING_DAYS=3
```

| Variable | Meaning |
| --- | --- |
| `PORT` | Port the API listens on |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign tokens; keep it private |
| `JWT_EXPIRES_IN` | Token lifetime |
| `EXPIRY_WARNING_DAYS` | How many days before expiry an ingredient counts as "expiring soon" |

Never commit the `.env` file to version control.

## API Overview

Base path: `/v1`. All requests and responses use JSON. Protected endpoints need the header `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose | Access |
| --- | --- | --- | --- |
| POST | `/auth/register` | Create an account | Public |
| POST | `/auth/login` | Log in | Public |
| GET | `/ingredients/search?q=` | Ingredient suggestions | User |
| GET / PUT | `/pantry` | View or replace the pantry | User |
| GET | `/recommendations` | Ranked recipes with filters | User |
| GET | `/recipes/{id}` | Recipe details | User |
| POST / PUT / DELETE | `/recipes` | Manage recipes | Admin |
| POST | `/ingredients`, `/substitutes` | Manage ingredients and substitutes | Admin |

Example request:

```
GET /v1/recommendations?cuisine=1&maxTime=30&diet=Vegetarian
```

See [`api.md`](api.md) for the full reference with request and response examples.

## Database Overview

PostgreSQL with 11 tables:

`users`, `ingredients`, `ingredient_aliases`, `pantry_items`, `cuisines`, `recipes`, `recipe_ingredients`, `recipe_steps`, `dietary_tags`, `recipe_dietary_tags`, `substitutes`

Recipes link to ingredients through `recipe_ingredients` (presence only, no quantity). Alternative and regional ingredient names are stored in `ingredient_aliases`, so new names can be added without changing recipes.

See [`cookmatch_architecture_and_database.md`](cookmatch_architecture_and_database.md) for the ER diagram, SQL schema and the core matching query.

## UI Design

The interface uses a **claymorphism** style: soft, puffy, pastel elements that look like modeling clay on a warm cream background.

- Ingredients appear as small clay chips; recipes appear as plump clay cards.
- A circular badge on each card shows the match score. Mint means a high match, butter yellow means almost achievable.
- Buttons squish when pressed.
- Cocoa-brown text keeps contrast readable, and match status is never shown by color alone.

## Limitations

- Recommendation accuracy depends on how complete and correct the recipe and ingredient database is.
- Matching ignores ingredient quantities and checks presence only.
- Nutritional and dietary information, if included, is approximate and not verified by a certified nutritionist.
- Image-based ingredient recognition (for example, detecting ingredients from a photo of a fridge) is not supported.
- Regional and local ingredient names may not be fully standardized in the first version of the database.

## Future Enhancements

- Personalized recommendations based on user preferences and previous recipe choices
- Recommendations based on nutritional requirements
- Quantity-aware matching
- Ingredient recognition from photos
- Standardized regional and local ingredient names

## Documentation

| Document | Contents |
| --- | --- |
| [`api.md`](api.md) | Full API reference |
| [`cookmatch_architecture_and_database.md`](cookmatch_architecture_and_database.md) | Architecture, diagrams, database schema and queries |
| Software Requirements Specification | Functional requirements (FR-1 to FR-21), non-functional requirements, use cases |

## Team

| Name | Role |
| --- | --- |
| _Add name_ | _Add role_ |
| _Add name_ | _Add role_ |

**Course:** Software Engineering
**Instructor:** _Add name_
**Submission date:** _Add date_

## License

_Add a license if the project will be shared publicly, or note that it is for academic use only._
