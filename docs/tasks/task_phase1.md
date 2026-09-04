
| Order | Responsibility               | File                                                     |
| ----: | ---------------------------- | -------------------------------------------------------- |
|     1 | Shared Types                 | `packages/shared-types/weather.types.ts`                 |
|     2 | Shared Types                 | `packages/shared-types/user.types.ts`                    |
|     3 | Backend                      | `services/api/prisma/schema.prisma`                      |
|     4 | Backend                      | `services/api/src/app.js`                                |
|     5 | Backend                      | `services/api/src/server.js`                             |
|     6 | Backend                      | `services/api/src/middleware/error.middleware.js`        |
|     7 | Backend / Auth               | `services/api/src/modules/auth/auth.service.js`          |
|     8 | Backend / Auth               | `services/api/src/modules/auth/auth.controller.js`       |
|     9 | Backend / Auth               | `services/api/src/modules/auth/auth.routes.js`           |
|    10 | Backend / Auth               | `services/api/src/middleware/auth.middleware.js`         |
|    11 | Backend / Users              | `services/api/src/modules/users/user.controller.js`      |
|    12 | Backend / Users              | `services/api/src/modules/users/user.routes.js`          |
|    13 | Backend / Locations          | `services/api/src/modules/locations/location.service.js` |
|    14 | Backend / Locations          | `services/api/src/modules/locations/location.routes.js`  |
|    15 | Weather Integration          | `integrations/weather/weather.client.js`                 |
|    16 | Weather Integration          | `integrations/weather/weather.adapter.js`                |
|    17 | Weather Integration          | `integrations/weather/index.js`                          |
|    18 | Backend / Weather API        | `services/api/src/rest/weather.routes.js`                |
|    19 | Frontend / API               | `apps/web-app/src/services/api.js`                       |
|    20 | Frontend / Location          | `apps/web-app/src/hooks/useGeolocation.js`               |
|    21 | Frontend / Location          | `apps/web-app/src/components/LocationSearch.jsx`         |
|    22 | Frontend / Weather           | `apps/web-app/src/components/WeatherCard.jsx`            |
|    23 | Frontend / Weather           | `apps/web-app/src/components/ForecastCard.jsx`           |
|    24 | AI Service                   | `services/ai-service/main.py`                            |
|    25 | AI Service / LLM             | `services/ai-service/llm/client.py`                      |
|    26 | AI Service / Weather Context | `services/ai-service/services/weather_context.py`        |
|    27 | AI Service / Session         | `services/ai-service/services/session.py`                |
|    28 | AI Service / Agent           | `services/ai-service/agents/citizen_assistant/agent.py`  |
|    29 | Frontend / Chat              | `apps/web-app/src/components/ChatWindow.jsx`             |
|    30 | Frontend / Chat              | `apps/web-app/src/pages/Chat.jsx`                        |
|    31 | Frontend / Auth              | `apps/web-app/src/context/AuthContext.jsx`               |
|    32 | Frontend / Dashboard         | `apps/web-app/src/pages/Dashboard.jsx`                   |
|    33 | Documentation                | `README.md`                                              |

## Phase 1 Team Task Distribution

### 1. Backend — Ashish + Kanchan

**Primary responsibility:** Core API, authentication, users, locations, database, middleware.

| Member      | Responsibility                                     | Files                                                                        |
| ----------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Kanchan** | Backend lead, API architecture, Auth, middleware   | `app.js`, `server.js`, `auth/*`, `auth.middleware.js`, `error.middleware.js` |
| **Ashish**  | Users, locations, Prisma/database, backend support | `users/*`, `locations/*`, `prisma/schema.prisma`                             |

#### Kanchan

* Express application setup
* Server boot
* Authentication architecture
* Register/login/refresh
* Password hashing
* JWT generation/verification
* Protected-route middleware
* Central error handling
* Backend API structure/review

#### Ashish

* User profile APIs
* Location CRUD
* Location search
* Saved locations
* Prisma schema
* Database-related implementation
* Support Kanchan on backend integration

---

# 2. Weather Integration — Saikat + Ashish

**Primary responsibility: Saikat**

| Member     | Role           | Responsibility                               |
| ---------- | -------------- | -------------------------------------------- |
| **Saikat** | **Main owner** | Weather provider integration + normalization |
| **Ashish** | Helper/Support | Backend integration and testing support      |

### Saikat

Files:

```text
integrations/weather/
├── weather.client.js
├── weather.adapter.js
└── index.js
```

Responsibilities:

* External weather API communication
* Provider configuration
* Raw API response handling
* Weather response normalization
* Current weather
* Hourly forecast
* Daily forecast
* Error handling for provider failures
* Make provider details invisible to the rest of the application

### Ashish

* Help connect weather integration with backend routes
* Test API responses
* Help with error cases
* Review integration from backend perspective

---

# 3. AI Service — Kanchan + Ashish + Saikat

This should be a **shared module**, but give each person a clear ownership area.

| Member      | Main responsibility                          |
| ----------- | -------------------------------------------- |
| **Kanchan** | AI service architecture + LLM integration    |
| **Ashish**  | Session/context + API integration            |
| **Saikat**  | Weather context + weather-data understanding |

### Kanchan

```text
services/ai-service/
├── main.py
└── llm/
    └── client.py
```

Responsibilities:

* FastAPI service
* `/chat` endpoint
* LLM API wrapper
* Prompt structure
* Model configuration
* AI response handling
* AI-service architecture

### Saikat

```text
services/ai-service/services/
└── weather_context.py
```

Responsibilities:

* Convert weather JSON into useful AI context
* Decide which weather information should be provided to the LLM
* Handle current/hourly/daily weather context
* Make weather information understandable to the citizen assistant

### Ashish

```text
services/ai-service/services/
└── session.py
```

Responsibilities:

* Conversation/session handling
* Follow-up question context
* Session memory
* Integration between `/chat` and conversation state
* Testing conversation flow

### Shared AI responsibility

All three should review:

```text
agents/citizen_assistant/agent.py
```

The agent is where the pieces come together:

```text
User Query
    ↓
Session Context
    ↓
Weather Context
    ↓
Citizen Assistant Agent
    ↓
LLM Client
    ↓
Natural Language Response
```

---

# 4. Frontend — Biyas + Saikat + Ashish

**Main implementation:** Biyas + Saikat
**Support/Review:** Ashish

| Member     | Responsibility                       |
| ---------- | ------------------------------------ |
| **Biyas**  | Dashboard/UI + authentication UI     |
| **Saikat** | Weather components + location + chat |
| **Ashish** | Integration testing + review         |

### Biyas

```text
src/pages/
├── Dashboard.jsx
└── Chat.jsx

src/context/
└── AuthContext.jsx
```

Responsibilities:

* Dashboard page
* Chat page structure
* Authentication state
* Protected frontend routes
* Overall page-level UI
* Frontend routing/integration

### Saikat

```text
src/components/
├── WeatherCard.jsx
├── ForecastCard.jsx
├── LocationSearch.jsx
└── ChatWindow.jsx

src/hooks/
└── useGeolocation.js

src/services/
└── api.js
```

Responsibilities:

* Current weather UI
* Forecast UI
* Location search
* GPS integration
* Chat interface
* Axios/API communication
* Connect frontend with backend and AI service

### Ashish

* Review frontend API integration
* Test Dashboard → Backend flow
* Test Chat → AI-service flow
* Check authentication behavior
* Help debug frontend/backend integration issues

---

# 5. Shared Types — Ashish + Saikat

**Responsibility:** Keep frontend and backend data contracts consistent.

```text
packages/shared-types/
├── weather.types.ts
└── user.types.ts
```

### Ashish

Main responsibility:

* User types
* Auth types
* Saved-location types
* Database/API shape consistency

### Saikat

Main responsibility:

* Weather types
* Current-weather shape
* Hourly forecast shape
* Daily forecast shape

Both should agree on the **final API contract** before frontend/backend implementation starts.

---

# 6. README + Documentation — Biyas

**All README-related and documentation-update work belongs to Biyas.**

### Biyas handles

```text
README.md
```

and all Phase 1 documentation updates, including:

* Project setup instructions
* Environment variable documentation
* How to run backend
* How to run frontend
* How to run AI service
* API overview
* Folder structure documentation
* Phase 1 implementation status
* Team contribution documentation
* Setup/troubleshooting notes
* Updating README whenever architecture changes

Other members should provide Biyas with the technical information, but **Biyas owns the final README/documentation updates**.

---

# Final Ownership Map

| Area                       | Primary         | Secondary / Support                 |
| -------------------------- | --------------- | ----------------------------------- |
| **Backend**                | Kanchan         | Ashish                              |
| **Weather Integration**    | **Saikat**      | Ashish                              |
| **AI Service**             | Kanchan         | Ashish + Saikat                     |
| **Frontend**               | Biyas + Saikat  | Ashish                              |
| **Shared Types**           | Ashish + Saikat | —                                   |
| **README / Documentation** | **Biyas**       | Everyone provides technical updates |

## Phase 1 Responsibility Flow

```text
                         PHASE 1
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
     BACKEND             WEATHER               AI
        │                   │                   │
 Kanchan + Ashish      Saikat + Ashish    Kanchan + Ashish
                                            + Saikat
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                       FRONTEND
                            │
                  Biyas + Saikat
                       │
                  Ashish Review
                            │
                            ▼
                    SHARED TYPES
                     Ashish + Saikat
                            │
                            ▼
                  README / DOCUMENTATION
                          Biyas
```

### Phase 1 ownership principle

**Kanchan:** Backend + AI architecture
**Ashish:** Backend/database + AI session + integration support
**Saikat:** Weather integration owner + frontend weather/chat + AI weather context
**Biyas:** Frontend pages + complete documentation ownership
