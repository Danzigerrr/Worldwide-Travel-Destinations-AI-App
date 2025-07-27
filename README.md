# 🌍 Worldwide Travel Destinations AI App

[![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js\&logoColor=white)](#)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991.svg?logo=OpenAI\&logoColor=white)](#)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688.svg?\&logo=FastAPI\&logoColor=white)](#)
[![SQLite](https://img.shields.io/badge/SQLite-%2307405e.svg?logo=sqlite\&logoColor=white)](#)

An AI-powered travel assistant for exploring over 560 curated travel destinations across the world. This project turns static travel data into an interactive, intelligent, and conversational experience, helping users find ideal cities based on climate, budget, themes, and personal interests.
Kaggle dataset: [Worldwide Travel Cities](https://www.kaggle.com/datasets/furkanima/worldwide-travel-cities-ratings-and-climate/data)

This project is still under development. Keep in mind, that currently only some of the key features are implemented and ready to use!

## 📌 Table of Contents

- [💡 Key Features](#-key-features)
   * [🧠 Conversational AI Assistant](#-conversational-ai-assistant)
   * [🔍 Interactive Destination Search](#-interactive-destination-search)
   * [📍 Destination Detail View](#-destination-detail-view)
- [🎯 Project Goals](#-project-goals)
- [🗃 Dataset Description](#-dataset-description)
   * [Example Use Cases](#example-use-cases)
- [🛠 Tools & Technologies](#-tools-technologies)
- [📄 License](#-license)

---

## 💡 Key Features

### 🧠 Conversational AI Assistant

* Ask an LLM for travel suggestions tailored to your style (e.g. "Where should I go for nature and wellness in summer?").
* The RAG component allows for relevant data retrieveal and better-quality answers.
* Context-aware dialogue: the LLM uses memory and LangGraph to manage the message flow.

### 🔍 Interactive Destination Search

* Filter cities using dynamically generated filters based on data entropy - this allows to create very powerful filters and help the user make the decision while searching.
* Explore destinations on a searchable map.
* Sort and filter cities by region, budget level, theme ratings, etc.

### 📍 Destination Detail View

* View individual city pages showing:

  * City metadata (region, country, coordinates)
  * Climate data (avg/max/min temperatures by month)
  * Ratings for themes (e.g. culture, adventure, nightlife, cuisine)
  * Suggested visit duration & budget level

---

## 🎯 Project Goals

* Enhance travel discovery through interactive filtering and intelligent guidance.
* Use AI to personalize travel planning.
* Provide a robust frontend/backend architecture integrating AI workflows.

---

## 🗃 Dataset Description

The dataset [Worldwide Travel Cities](https://www.kaggle.com/datasets/furkanima/worldwide-travel-cities-ratings-and-climate/data) contains curated information on 560 global travel destinations with rich metadata and user-centric features:

* **City Metadata**: name, country, region, and geo-coordinates
* **Summaries**: one-liner descriptions of each city's appeal
* **Climate**: monthly averages for temperature (min/max/avg)
* **Ideal Visit Durations**: e.g., weekend, short trip, long trip
* **Budget Classification**: budget / mid-range / luxury
* **Thematic Ratings (0-5)**:

  * Culture
  * Nature
  * Beaches
  * Adventure
  * Cuisine
  * Nightlife
  * Urban
  * Wellness

### Example Use Cases

* Intelligent trip planners
* AI-based travel chatbots
* Clustering by thematic appeal
* Budget or season-specific travel filtering

---

## 🛠 Tools & Technologies

* **Next.js** – Frontend framework with dynamic routing
* **FastAPI** – Backend serving API endpoints and LLM features (LangChain)
* **SQLite** – Embedded database for fast prototyping
* **OpenAI API** – LLM-based recommendation engine and chatbot
* **OpenLayers** – Interactive map for visualizing cities

---

## 📄 License

This project is licensed under the **GNU GPL v3.0**. See the [LICENSE](LICENSE) file for details.

---

Feel free to fork, clone, and extend this project. Contributions are welcome!
