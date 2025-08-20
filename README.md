# Around the World - AI App
[![FastAPI](https://img.shields.io/badge/FastAPI-009688.svg?&logo=FastAPI&logoColor=white)](#)
[![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js&logoColor=white)](#)
[![LangChain](https://img.shields.io/badge/LangChain-1c3c3c.svg?logo=langchain&logoColor=white)](#)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991.svg?logo=OpenAI&logoColor=white)](#)
[![SQLite](https://img.shields.io/badge/SQLite-%2307405e.svg?logo=sqlite&logoColor=white)](#)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=fff)](#)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?logo=bootstrap&logoColor=fff)](#)

This project enhances the usability of the [Worldwide Travel Cities Dataset](https://www.kaggle.com/datasets/furkanima/worldwide-travel-cities-ratings-and-climate/data) by leveraging modern AI tools. It provides an interactive platform for users to explore destinations through intelligent filtering and a conversational interface.

-----

## Table of Contents

  * [Features](https://www.google.com/search?q=%23features)
  * [Project Goals](https://www.google.com/search?q=%23project-goals)
  * [Tools & Technologies](https://www.google.com/search?q=%23tools--technologies)
  * [Getting Started](https://www.google.com/search?q=%23getting-started)
  * [Running Instructions](https://www.google.com/search?q=%23running-instructions)
  * [License](https://www.google.com/search?q=%23license)

-----

## Features

  * **Conversational AI Assistant**
      * Chat with an LLM to help you choose the best European destination based on your preferences.
  * **Interactive Travel Destination Search**
      * Browse destinations on an interactive map and list.
      * Use dynamic, AI-generated filters that adapt to refine your search.
  * **Destination Details**
      * View detailed information for any destination stored in the database.

-----

## Project Goals

  * Improve the user experience for exploring travel destinations.
  * Use AI to create dynamic, personalized recommendations.
  * Experiment with modern tools like LLMs, map-based search, and filter generation.

-----

## Tools & Technologies

  * **Frontend**: Next.js
  * **Backend**: FastAPI (with AI model integration)
  * **AI**: LLM (for chat interface and dynamic filter generation)
  * **Database**: Supabase with PostgreSQL
  * **Vector Database**: Supabase (for RAG)
  * **Visualization**: OpenLayers (for map visualization)
  * **Database ORM**: SQLModel
  * **Chat History**: LangChain
  * **UI**: Bootstrap

-----

## Getting Started

This project is a monorepo with separate folders for the frontend and backend.

### Prerequisites

  * Node.js (v18+)
  * Python (v3.10+)
  * Docker and Docker Compose
  * An OpenAI API Key
  * A Supabase project URL and API Key

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Danzigerrr/Worldwide-Travel-Destinations-AI-App
    cd worldwide-travel-destinations-ai-app
    ```

2.  **Set up environment variables:**

      * Create a `.env` file in the `backend/` directory.
      * Create a `.env.local` file in the `frontend/` directory.

    **Backend `.env`:**

    ```bash
    AUTH_SECRET_KEY=...
    AUTH_ALGORITHM=...
    API_URL="http://localhost:3000"
    OPENAI_API_KEY=...
    SUPABASE_CONNECTION_STRING=...
    ```

    **Frontend `.env.local`:**

    ```bash
    NEXT_PUBLIC_BACKEND_API_URL="http://localhost:8000"
    ```

3.  **Set up the database:**

      * Your Supabase project needs a `chats` and a `messages` table. You can use the provided SQL scripts in the `backend` directory to create them.

-----

## Running Instructions

### 1\. Run the Backend

Navigate to the `backend/` directory and use the following command to start the FastAPI server.

```bash
cd backend/api
fastapi dev main.py
```

The backend will be accessible at `http://localhost:8000`.


### 2\. Run the Frontend

In a new terminal window, navigate to the `frontend/` directory and start the Next.js development server.

```bash
cd frontend
npm install
npm run dev
```

The application will be accessible at `http://localhost:3000`.

-----

## License

This project is licensed under the GNU GPL v3.0. See [LICENSE](https://www.google.com/search?q=LICENSE) for details.