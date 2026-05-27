Agriculture-Sales Tracker
An end-to-end AI-powered receipt extraction and inventory management system designed for agricultural distribution businesses.
This application automates the ingestion of handwritten receipts using local vision models and persists the data to a SQLite database.

Architecture Overview
The system is split into two distinct components:

Backend (Ubuntu Server): A FastAPI-based Python server that handles AI vision inference via Ollama, parses unstructured data, and manages the SQLite database.

Frontend (Windows Laptop): A responsive React dashboard built with Vite and Tailwind CSS that serves as the interface for receipt uploads and data visualization.
