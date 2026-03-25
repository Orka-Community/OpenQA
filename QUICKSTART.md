# OpenQA - Guide de Démarrage Rapide

## Installation One-Liner

```bash
curl -fsSL https://openqa.orkajs.dev/install.sh | bash
```

## Configuration Minimale

```bash
# Configurer votre clé API LLM
openqa config set llm.provider openai
openqa config set llm.apiKey sk-xxx

# Configurer l'URL de votre SaaS
openqa config set saas.url https://your-app.com

# (Optionnel) Configurer GitHub pour créer des issues
openqa config set github.token ghp_xxx
openqa config set github.owner your-username
openqa config set github.repo your-repo
```

## Démarrage

```bash
# Lancer OpenQA
openqa start
```

## Accès aux Interfaces

Une fois démarré, ouvrez votre navigateur :

- **DevTools**: http://localhost:3000
- **Kanban**: http://localhost:3000/kanban  
- **Config**: http://localhost:3000/config

## Commandes Utiles

```bash
# Voir le statut
openqa status

# Voir les logs
openqa logs --follow

# Arrêter OpenQA
openqa stop
```

## Installation Alternative (Clone Git)

```bash
git clone https://github.com/orka-js/openqa.git
cd openqa
npm install
npm run build
cp .env.example .env
# Éditer .env avec vos paramètres
npm start
```

## Docker

```bash
# Créer .env avec vos paramètres
cp .env.example .env

# Lancer avec Docker
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

## Que fait OpenQA ?

1. **Teste automatiquement** votre application SaaS
2. **Détecte les bugs** (UI, console errors, flows cassés)
3. **Crée des issues GitHub** pour les bugs critiques
4. **Crée des tickets Kanban** pour le suivi QA
5. **Prend des screenshots** comme preuves
6. **Tourne 24/7** de manière autonome

## Support

- Documentation: https://github.com/orka-js/openqa
- Issues: https://github.com/orka-js/openqa/issues
- Discord: https://discord.gg/orkajs
