-- OùPêcher – Schéma initial
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query)

-- ─────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────

CREATE TABLE fish (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    scientific_name TEXT,
    description     TEXT,
    min_size_cm     INTEGER,
    image_url       TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE water_bodies (
    id        SERIAL PRIMARY KEY,
    name      TEXT NOT NULL,
    type      TEXT NOT NULL CHECK (type IN ('river', 'lake', 'pond', 'canal')),
    country   CHAR(2) NOT NULL CHECK (country IN ('BE', 'FR')),
    region    TEXT,
    latitude  DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geojson   JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permits (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    country     CHAR(2) NOT NULL CHECK (country IN ('BE', 'FR')),
    description TEXT,
    price_eur   NUMERIC(6, 2),
    url         TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Liaison : espèces présentes dans un cours d'eau
CREATE TABLE water_body_fish (
    water_body_id INTEGER NOT NULL REFERENCES water_bodies(id) ON DELETE CASCADE,
    fish_id       INTEGER NOT NULL REFERENCES fish(id) ON DELETE CASCADE,
    PRIMARY KEY (water_body_id, fish_id)
);

-- Liaison : permis requis pour un cours d'eau
CREATE TABLE water_body_permits (
    water_body_id INTEGER NOT NULL REFERENCES water_bodies(id) ON DELETE CASCADE,
    permit_id     INTEGER NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
    PRIMARY KEY (water_body_id, permit_id)
);

-- Techniques autorisées par cours d'eau
CREATE TABLE water_body_techniques (
    id            SERIAL PRIMARY KEY,
    water_body_id INTEGER NOT NULL REFERENCES water_bodies(id) ON DELETE CASCADE,
    technique     TEXT NOT NULL
);

-- ─────────────────────────────────────────
-- INDEX
-- ─────────────────────────────────────────

CREATE INDEX idx_water_bodies_country  ON water_bodies(country);
CREATE INDEX idx_water_bodies_location ON water_bodies(latitude, longitude);
CREATE INDEX idx_water_body_fish_wb    ON water_body_fish(water_body_id);
CREATE INDEX idx_water_body_permits_wb ON water_body_permits(water_body_id);
CREATE INDEX idx_techniques_wb         ON water_body_techniques(water_body_id);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Obligatoire pour que l'API Supabase (anon key) puisse lire les données.
-- ─────────────────────────────────────────

ALTER TABLE fish                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_bodies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_body_fish       ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_body_permits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_body_techniques ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour toutes les tables (carte accessible sans connexion)
CREATE POLICY "Lecture publique" ON fish                  FOR SELECT USING (true);
CREATE POLICY "Lecture publique" ON water_bodies          FOR SELECT USING (true);
CREATE POLICY "Lecture publique" ON permits               FOR SELECT USING (true);
CREATE POLICY "Lecture publique" ON water_body_fish       FOR SELECT USING (true);
CREATE POLICY "Lecture publique" ON water_body_permits    FOR SELECT USING (true);
CREATE POLICY "Lecture publique" ON water_body_techniques FOR SELECT USING (true);

-- ─────────────────────────────────────────
-- DONNÉES DE DÉMONSTRATION
-- ─────────────────────────────────────────

-- Espèces
INSERT INTO fish (name, scientific_name, min_size_cm) VALUES
    ('Brochet',             'Esox lucius',           50),
    ('Carpe commune',       'Cyprinus carpio',        40),
    ('Perche',              'Perca fluviatilis',      20),
    ('Truite fario',        'Salmo trutta fario',     23),
    ('Truite arc-en-ciel',  'Oncorhynchus mykiss',    23),
    ('Sandre',              'Sander lucioperca',      40),
    ('Gardon',              'Rutilus rutilus',        NULL),
    ('Barbeau fluviatile',  'Barbus barbus',          40),
    ('Ombre commun',        'Thymallus thymallus',    30),
    ('Chevesne',            'Squalius cephalus',      NULL),
    ('Vairon',              'Phoxinus phoxinus',      NULL);

-- Permis
INSERT INTO permits (name, country, description, price_eur, url) VALUES
    ('Permis pêche Wallonie – réciprocitaire', 'BE',
     'Permis annuel valable en eaux libres de Wallonie',
     45.00, 'https://www.peche-wallonie.be'),
    ('Carte de pêche nationale', 'FR',
     'Carte annuelle obligatoire en France métropolitaine',
     90.00, 'https://www.cartedepeche.fr'),
    ('Carte journalière vacanciers', 'FR',
     'Carte journalière pour les non-résidents',
     12.00, NULL);

-- Cours d'eau (coordonnées identiques aux données de démo du frontend)
INSERT INTO water_bodies (name, type, country, region, latitude, longitude) VALUES
    ('Ourthe à Hamoir',  'river', 'BE', 'Liège',  50.4283, 5.5256),
    ('Meuse à Namur',    'river', 'BE', 'Namur',  50.4673, 4.8697),
    ('Lac de Butgenbach','lake',  'BE', 'Liège',  50.4173, 6.2090);

-- Liaisons cours d'eau ↔ espèces
-- Ourthe à Hamoir (id=1) : Truite fario(4), Ombre commun(9), Chevesne(10), Vairon(11)
INSERT INTO water_body_fish (water_body_id, fish_id) VALUES
    (1, 4), (1, 9), (1, 10), (1, 11);

-- Meuse à Namur (id=2) : Sandre(6), Brochet(1), Barbeau(8), Carpe(2), Gardon(7)
INSERT INTO water_body_fish (water_body_id, fish_id) VALUES
    (2, 6), (2, 1), (2, 8), (2, 2), (2, 7);

-- Lac de Butgenbach (id=3) : Truite arc-en-ciel(5), Truite fario(4), Perche(3), Brochet(1)
INSERT INTO water_body_fish (water_body_id, fish_id) VALUES
    (3, 5), (3, 4), (3, 3), (3, 1);

-- Liaisons cours d'eau ↔ permis (tous requièrent le permis Wallonie, id=1)
INSERT INTO water_body_permits (water_body_id, permit_id) VALUES
    (1, 1), (2, 1), (3, 1);

-- Techniques autorisées par cours d'eau
INSERT INTO water_body_techniques (water_body_id, technique) VALUES
    (1, 'Pêche à la mouche'),
    (1, 'Pêche au lancer léger'),
    (1, 'Pêche au toc'),
    (2, 'Pêche au coup'),
    (2, 'Pêche au lancer'),
    (2, 'Pêche à la carpe'),
    (2, 'Pêche aux leurres'),
    (3, 'Pêche à la mouche'),
    (3, 'Pêche au lancer'),
    (3, 'Pêche à la traîne');
