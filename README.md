# OùPêcher

Carte interactive pour les pêcheurs amateurs en Belgique et France.

Renseigne les espèces de poissons présentes par cours d'eau ou lac, les permis requis et les techniques de pêche autorisées.

## Stack technique

- **Frontend** : HTML/CSS/JavaScript + [Leaflet.js](https://leafletjs.com/)
- **Backend** : Python / [FastAPI](https://fastapi.tiangolo.com/)
- **Base de données** : [Supabase](https://supabase.com/) (PostgreSQL)

## Structure du projet

```
oupcher/
├── frontend/
│   ├── index.html          # Page principale avec la carte
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── map.js          # Initialisation et gestion de la carte Leaflet
│       ├── api.js          # Appels à l'API FastAPI
│       └── ui.js           # Interactions interface (panneaux, filtres)
├── backend/
│   ├── app/
│   │   ├── main.py         # Point d'entrée FastAPI
│   │   ├── config.py       # Configuration (variables d'env)
│   │   ├── database.py     # Client Supabase
│   │   ├── models/         # Modèles Pydantic
│   │   ├── routers/        # Routes API
│   │   └── schemas/        # Schémas de validation
│   ├── requirements.txt
│   └── .env.example
├── database/
│   └── migrations/
│       └── 001_initial_schema.sql
└── .gitignore
```

## Installation

### Prérequis

- Python 3.11+
- Compte Supabase (gratuit)

### Backend

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Remplir .env avec les clés Supabase
```

### Lancer le serveur

```bash
uvicorn app.main:app --reload
```

L'API est disponible sur `http://localhost:8000`.
La documentation Swagger est sur `http://localhost:8000/docs`.

### Frontend

Ouvrir `frontend/index.html` dans un navigateur, ou servir avec :

```bash
python -m http.server 5500 --directory frontend
```

## Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com/)
2. Exécuter le script SQL dans `database/migrations/001_initial_schema.sql` via l'éditeur SQL Supabase
3. Copier l'URL et la clé anon depuis *Project Settings > API*
4. Les coller dans le fichier `.env`

## Variables d'environnement

| Variable | Description |
|---|---|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_KEY` | Clé API anon/public Supabase |
| `ALLOWED_ORIGINS` | Origines autorisées pour CORS (ex: `http://localhost:5500`) |
