# 🎨 Guide du Système de Design - Prestation

## Vue d'ensemble

Ce document décrit le système de design moderne et cohérent du projet **Prestation**. Le design utilise un système de variables CSS avancé pour maintenir la cohérence visuelle à travers toute l'application.

---

## 📦 Architecture des Fichiers CSS

```
src/styles/
├── theme.css              # Système de design principal (variables, utilitaires)
├── FormStyles.css         # Styles pour les formulaires modernes
├── Notifications.css      # Styles pour les notifications
├── Loaders.css            # Styles pour les loaders et skeletons
└── THEME_GUIDE.md         # Ce fichier

src/components/
├── Button/Button.css      # Boutons avec variantes
├── Navbar/Navbar.css      # Barre de navigation
├── Card/Card.css          # Cartes et conteneurs
├── Input/Input.css        # Champs de saisie
├── Layout/Layout.css      # Layout et mise en page
└── Table/Table.css        # Tableaux de données
```

---

## 🎯 Palettes de Couleurs

### Couleurs Primaires
- **Primary-500**: `#3b82f6` - Couleur principale (bleu)
- **Primary-600**: `#2563eb` - Variante plus foncée
- **Primary-700**: `#1d4ed8` - Variante encore plus foncée
- **Primary-800**: `#1e40af` - Couleur foncée très saturée

### Couleurs Secondaires
- **Secondary-500**: `#64748b` - Gris neutre
- **Secondary-600**: `#475569` - Gris plus foncé
- **Secondary-700**: `#334155` - Gris très foncé

### Couleurs Statut
- **Success**: Vert `#22c55e`
- **Error/Danger**: Rouge `#ef4444`
- **Warning/Accent**: Amber `#f59e0b`
- **Info**: Bleu clair `#416aff`

---

## 🌈 Gradients Disponibles

```css
/* Gradients prédéfinis */
--gradient-primary: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 100%);
--gradient-success: linear-gradient(135deg, var(--success-500) 0%, var(--success-700) 100%);
--gradient-warning: linear-gradient(135deg, var(--accent-500) 0%, var(--accent-700) 100%);
--gradient-danger: linear-gradient(135deg, var(--error-500) 0%, var(--error-700) 100%);
--gradient-glass: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%);
```

---

## 💫 Ombres & Profondeur

```css
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.15);

/* Ombres colorées */
--shadow-primary: 0 8px 16px -2px rgba(59, 130, 246, 0.15);
--shadow-success: 0 8px 16px -2px rgba(34, 197, 94, 0.15);
--shadow-danger: 0 8px 16px -2px rgba(239, 68, 68, 0.15);
```

---

## 📏 Système d'Espacement

Base: **8px** (utiliser les variables `--spacing-*`)

```
--spacing-1: 0.25rem (2px)
--spacing-2: 0.5rem  (4px)
--spacing-3: 0.75rem (6px)
--spacing-4: 1rem    (8px) ← Unité de base
--spacing-6: 1.5rem  (12px)
--spacing-8: 2rem    (16px)
--spacing-12: 3rem   (24px)
--spacing-16: 4rem   (32px)
```

---

## 🎲 Rayons de Bordure

```
--radius-none: 0
--radius-sm: 0.25rem     (2px)
--radius-base: 0.5rem    (4px)
--radius-md: 0.625rem    (5px)  ← Défaut pour inputs
--radius-lg: 1rem        (8px)  ← Défaut pour cartes
--radius-xl: 1.5rem      (12px)
--radius-2xl: 2rem       (16px)
--radius-full: 9999px    (circulaire)
```

---

## 📝 Typographie

### Familles de Polices

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', ...
--font-mono: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', ...
```

### Tailles de Police

```
--text-xs:   0.75rem   (12px)
--text-sm:   0.875rem  (14px)  ← Texte par défaut
--text-base: 1rem      (16px)
--text-lg:   1.125rem  (18px)
--text-xl:   1.25rem   (20px)
--text-2xl:  1.5rem    (24px)
--text-3xl:  1.875rem  (30px)
--text-4xl:  2.25rem   (36px)
```

### Poids de Police

```
--font-light:     300
--font-normal:    400
--font-medium:    500  ← Texte fort
--font-semibold:  600
--font-bold:      700  ← Titres
--font-extrabold: 800
```

### Hauteurs de Ligne

```
--line-height-tight:    1.25
--line-height-snug:     1.375
--line-height-normal:   1.5    ← Par défaut
--line-height-relaxed:  1.625
--line-height-loose:    2
```

---

## ⏱️ Transitions & Animations

### Variables de Transition

```css
--transition-fast:   150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base:   200ms cubic-bezier(0.4, 0, 0.2, 1);  ← Défaut
--transition-slow:   300ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slower: 500ms cubic-bezier(0.4, 0, 0.2, 1);
```

### Animations Disponibles

- `slideIn` - Animation d'apparition glissante
- `fadeIn` - Apparition progressive
- `pulse` - Pulsation continue
- `shimmer` - Scintillement (pour skeletons)
- `spin` - Rotation continue (loaders)
- `bounce` - Rebondissement

---

## 🎨 Composants & Classes Utilitaires

### Boutons

```html
<!-- Variantes -->
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-success">Success</button>
<button class="btn btn-danger">Danger</button>
<button class="btn btn-outline">Outline</button>

<!-- Tailles -->
<button class="btn btn-small">Petit</button>
<button class="btn btn-medium">Moyen</button>
<button class="btn btn-large">Grand</button>

<!-- States -->
<button class="btn btn-primary" disabled>Désactivé</button>
<button class="btn btn-full">Pleine largeur</button>
```

### Badges

```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-danger">Danger</span>
<span class="badge badge-warning">Warning</span>
```

### Cartes

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Titre</h3>
    <p class="card-subtitle">Sous-titre</p>
  </div>
  <div class="card-content">
    <!-- Contenu -->
  </div>
</div>

<!-- Variante avec hover -->
<div class="card card-hover">...</div>
```

### Formulaires

```html
<!-- Input moderne -->
<div class="modern-input">
  <input type="text" placeholder="Votre texte">
</div>

<!-- Checkbox moderne -->
<label class="modern-checkbox">
  <input type="checkbox">
  <span class="checkmark"></span>
  Accepter
</label>

<!-- Radio moderne -->
<label class="modern-radio">
  <input type="radio">
  <span class="radiomark"></span>
  Option
</label>

<!-- File upload -->
<div class="file-upload-area">
  <div class="file-upload-icon">📁</div>
  <p class="file-upload-text">Glissez vos fichiers ici</p>
  <p class="file-upload-hint">ou cliquez pour parcourir</p>
</div>
```

### Notifications

```html
<div class="notification success show">
  <div class="notification-icon">✓</div>
  <div class="notification-content">
    <p class="notification-title">Succès</p>
    <p class="notification-message">Opération réussie</p>
  </div>
  <button class="notification-close">×</button>
</div>
```

### Loaders

```html
<!-- Spinner -->
<div class="spinner"></div>
<div class="spinner small"></div>
<div class="spinner medium"></div>
<div class="spinner large"></div>

<!-- Progress -->
<div class="progress-loader"></div>

<!-- Wave -->
<div class="wave-loader">
  <span></span><span></span><span></span><span></span><span></span>
</div>

<!-- Dots -->
<div class="dots-loader">
  <span></span><span></span><span></span>
</div>

<!-- Skeleton -->
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-heading"></div>
<div class="skeleton skeleton-circle"></div>
```

### Alertes

```html
<div class="alert alert-primary">
  <strong>Titre</strong> - Message d'information
</div>
<div class="alert alert-success">Succès</div>
<div class="alert alert-danger">Erreur</div>
<div class="alert alert-warning">Attention</div>
<div class="alert alert-info">Information</div>
```

---

## 🔧 Classe Utilitaire

### Z-Index

```css
--z-dropdown: 1000;
--z-sticky: 1020;
--z-modal-backdrop: 1040;
--z-modal: 1050;
--z-popover: 1060;
--z-tooltip: 1070;
--z-navbar: 1030;
```

### Points de Rupture Responsive

```css
--breakpoint-xs: 320px
--breakpoint-sm: 640px
--breakpoint-md: 768px   ← Mobile/Tablet
--breakpoint-lg: 1024px  ← Desktop
--breakpoint-xl: 1280px  ← Large Desktop
--breakpoint-2xl: 1536px ← Very Large
```

---

## 🎯 Meilleures Pratiques

### 1. **Utilisez les Variables**
```css
/* ✅ BON */
color: var(--primary-600);
padding: var(--spacing-4);
border-radius: var(--radius-lg);

/* ❌ MAUVAIS */
color: #2563eb;
padding: 1rem;
border-radius: 1rem;
```

### 2. **Transitions Fluides**
```css
/* ✅ BON */
transition: all var(--transition-base);

/* ❌ MAUVAIS */
transition: all 0.5s ease;
```

### 3. **Ombres pour la Profondeur**
```css
/* ✅ BON */
box-shadow: var(--shadow-lg);

/* ✅ AUSSI BON */
box-shadow: var(--shadow-primary); /* Ombre colorée */
```

### 4. **Espacement Cohérent**
```css
/* ✅ BON */
margin: var(--spacing-4);
gap: var(--spacing-3);

/* ❌ MAUVAIS */
margin: 15px;
gap: 10px;
```

### 5. **Classes d'État**
```html
<!-- ✅ Utilisez les classes d'état -->
<button class="btn btn-primary" disabled>Désactivé</button>
<input class="input input-error" />
<div class="notification success show"></div>
```

---

## 🚀 Amélioration du Thème

Le système de design a été amélioré avec:

✨ **Nouveautés ajoutées:**
- Variables CSS complètes pour tous les éléments visuels
- Système de gradients modernes
- Ombres colorées et profondeur
- Animations fluides et transitions cohérentes
- Badges et badges modernes
- Composants de formulaire raffinés
- Loaders et skeletons améliorés
- Support du glassmorphism
- Design system complètement documenté

🎨 **Caractéristiques:**
- Cohérence visuelle globale
- Accessibilité améliorée
- Responsive design optimisé
- Animations performantes
- Facilement personnalisable
- Maintenance simplifiée

---

## 📚 Références

- **Tailwind CSS**: [tailwindcss.com](https://tailwindcss.com)
- **Material Design 3**: [material.io](https://material.io)
- **Inter Font**: [rsms.me/inter](https://rsms.me/inter)

---

## 🤝 Support

Pour toute question ou amélioration du design, consultez les fichiers CSS correspondants ou mettez à jour `src/styles/theme.css`.
