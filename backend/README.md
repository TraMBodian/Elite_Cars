# Backend Django sur Render

À la création du service, utilisez un **Blueprint** Render pointant vers le dépôt : [`render.yaml`](../render.yaml) configure le répertoire du backend, l’installation des dépendances, les migrations au démarrage et le contrôle de santé sur `/api/health/`.

Renseignez `DATABASE_URL` avec l’URL d’une base PostgreSQL de production (Render PostgreSQL ou Supabase). `DJANGO_SECRET_KEY` est générée par Render. Le backend autorise automatiquement le nom d’hôte attribué par Render.
