# Urban Art - E-commerce avec Paiement Sécurisé Stripe

Site e-commerce pour vendre des œuvres d'art avec système de paiement sécurisé intégré via Stripe.

## 🚀 Fonctionnalités

- ✅ Panier d'achat complet avec localStorage
- ✅ Paiement sécurisé via Stripe Checkout
- ✅ Gestion des quantités et suppression d'articles
- ✅ Pages de confirmation et d'annulation
- ✅ Webhooks Stripe pour suivi des paiements
- ✅ Interface responsive et animations élégantes
- ✅ Support multilingue (FR, EN, RU, ZH, UZ)
- ✅ Protection XSS avec méthodes DOM sécurisées

## 📋 Prérequis

- Node.js (v14 ou supérieur)
- npm ou yarn
- Compte Stripe (gratuit pour les tests)

## 🔧 Installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer Stripe

1. Créez un compte sur [Stripe](https://dashboard.stripe.com/register)
2. Récupérez vos clés API dans le [Dashboard Stripe](https://dashboard.stripe.com/apikeys)
3. Copiez le fichier `.env.example` en `.env` :

```bash
cp .env.example .env
```

4. Modifiez le fichier `.env` avec vos clés Stripe :

```env
STRIPE_SECRET_KEY=sk_test_votre_cle_secrete
STRIPE_PUBLISHABLE_KEY=pk_test_votre_cle_publique
STRIPE_WEBHOOK_SECRET=whsec_votre_webhook_secret
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Configurer les Webhooks Stripe (Optionnel pour le développement)

Pour tester les webhooks en local :

```bash
# Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# Se connecter
stripe login

# Lancer le serveur de webhooks
stripe listen --forward-to localhost:3000/webhook
```

Copiez le webhook secret affiché dans votre fichier `.env`.

## 🚀 Démarrage

### Mode développement

```bash
npm run dev
```

### Mode production

```bash
npm start
```

Le site sera accessible sur [http://localhost:3000](http://localhost:3000)

## 🧪 Mode Test Stripe

En mode test, utilisez ces numéros de carte :

- **Paiement réussi** : `4242 4242 4242 4242`
- **Paiement échoué** : `4000 0000 0000 0002`
- **3D Secure requis** : `4000 0027 6000 3184`

Date d'expiration : n'importe quelle date future
CVC : n'importe quel code à 3 chiffres

## 📁 Structure du Projet

```
urban-art-project/
├── server.js              # Serveur Express + endpoints API
├── cart.js                # Gestion du panier côté client
├── script.js              # Scripts principaux du site
├── translations.js        # Gestion multilingue
├── index.html             # Page principale
├── success.html           # Page de confirmation
├── cancel.html            # Page d'annulation
├── styles.css             # Styles complets
├── package.json           # Dépendances
└── .env.example           # Template de configuration
```

## 🔒 Sécurité

- ✅ Clés API stockées dans `.env` (non versionné)
- ✅ Validation côté serveur des données
- ✅ Protection XSS avec méthodes DOM sécurisées
- ✅ HTTPS requis en production
- ✅ Webhooks signés pour vérifier l'authenticité

## 🌐 Déploiement en Production

### Variables d'environnement à configurer

```env
STRIPE_SECRET_KEY=sk_live_votre_cle_live
STRIPE_PUBLISHABLE_KEY=pk_live_votre_cle_live
STRIPE_WEBHOOK_SECRET=whsec_votre_webhook_live
NODE_ENV=production
FRONTEND_URL=https://votre-domaine.com
```

### Checklist

- [ ] Remplacer les clés de test par les clés live
- [ ] Configurer HTTPS sur votre domaine
- [ ] Configurer les webhooks en production
- [ ] Tester avec de vraies cartes
- [ ] Activer le mode live sur Stripe

## 📞 Support

Pour toute question sur l'intégration Stripe :
- [Documentation Stripe](https://stripe.com/docs)
- [Dashboard Stripe](https://dashboard.stripe.com)
- [Support Stripe](https://support.stripe.com)

## 📄 Licence

Tous droits réservés © 2025 Urban Art
