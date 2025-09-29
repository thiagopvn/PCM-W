# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a PCM (Planned Corrective Maintenance) web application built with vanilla JavaScript, HTML, and CSS. It's a service order management system for maintenance operations, integrated with Firebase for authentication and data storage.

## Development Commands

### Running Locally
```bash
# Start local development server (Python)
python3 -m http.server 8000

# Or using Node.js
npx http-server -p 8000

# Access at http://localhost:8000
```

No build, compilation, or transpilation is required. The application runs directly in the browser.

## Architecture

### Application Flow
1. **Entry Point**: `index.html` - Loading screen that observes auth state via `observeAuthState()`
2. **Auth Router**: Automatically redirects to `/src/Telainicial/Telainicial.html` (authenticated) or `/src/login/login.html` (unauthenticated)
3. **Module Pattern**: Each feature is a self-contained directory with HTML, JS, and CSS files

### Core Libraries (`lib/`)
- **`firebase.js`** - Firebase SDK initialization (v10.7.1 via CDN), exports `auth` and `db` instances
- **`auth.js`** - Authentication utilities:
  - `requireAuthAsync()` - Returns Promise<boolean>, redirects to login if unauthenticated (use in DOMContentLoaded)
  - `observeAuthState(callback)` - Listen to auth state changes
  - `loginUser(email, password)` / `registerUser()` / `logoutUser()` - Return `{ success, user?, error? }`
- **`firestore.js`** - Centralized database operations:
  - All functions return `{ success: boolean, data?: any, error?: string }`
  - COLLECTIONS constant defines collection names (use this, not hardcoded strings)
  - Includes specialized queries: `getDashboardStats()`, `getTechnicianPerformance()`, `getFrequentServices()`
  - `subscribeToServiceOrders(callback)` - Real-time updates via onSnapshot

### Feature Modules (`src/`)
- **`login/`** - Authentication pages (login.html, cadastro.html)
- **`Telainicial/`** - Main dashboard/home screen after login
- **`Dashboard/`** - Analytics with Chart.js (status charts, technician performance, service trends)
- **`OS/`** - Service order management:
  - `NovaOS.html` - Create new service orders with equipment/sector/maintainer selection
  - `GerenciarOS.html` - List and manage existing orders
- **`ManutencaoPrev/`** - Preventive maintenance scheduling
- **`equipamentos/`** - Equipment registry with CRUD operations, maintenance history
- **`profile/`** - User profile management

### Firestore Data Model
```
serviceOrders: {
  orderNumber, serviceDate, serviceType, priority, equipment,
  location, sector, technician, requester, status,
  problemDescription, observations, createdAt, updatedAt
}

equipments: {
  name, model, serial, status (active/maintenance/inactive),
  location, sector, lastMaintenance, nextMaintenance, notes,
  createdAt, updatedAt
}

preventiveTasks: {
  nextDate, description, equipment, sector, createdAt, updatedAt
}

sectors: { name, active }
maintainers: { name, active }
users: { email, role, createdAt }
```

**Important**: Service orders link to equipments via `equipment` field (equipment name), NOT `equipmentId`. Equipment details page queries service orders using `where('equipmentId', '==', id)` but this relationship is not enforced in NovaOS creation.

## Common Patterns

### Module Initialization
```javascript
import { requireAuthAsync, logoutUser } from '../../lib/auth.js';

document.addEventListener('DOMContentLoaded', async function() {
    if (!(await requireAuthAsync())) {
        return; // Auto-redirects to login
    }
    // Initialize module...
});
```

### Data Operations
```javascript
import { createServiceOrder, getServiceOrders } from '../../lib/firestore.js';

const result = await createServiceOrder(data);
if (result.success) {
    // Handle success
} else {
    console.error(result.error);
}
```

### Form Submission
Standard pattern across all modules:
1. `e.preventDefault()`
2. Disable submit button: `submitButton.disabled = true`
3. Show loading state: `submitButton.classList.add('loading')` or change button text
4. Try/catch with Firestore operation
5. Show success/error message via `showMessage(message, 'success'|'error')`
6. Reset form on success: `form.reset()`
7. Re-enable button in `finally` block

### Data Loading with Default Seeding
`getSectors()` and `getMaintainers()` in `firestore.js` automatically seed default data if collections are empty. This ensures dropdowns always have options on first use.

### Equipment Integration
When creating service orders (`NovaOS.js`):
- Equipment dropdown loads from `getEquipments({ status: 'active' })`
- Selecting equipment auto-fills location and sector from `equipment.location` and `equipment.sector`
- Uses `dataset` attributes on options for cross-field data binding

## UI Conventions

### Styling
- Global styles in `src/styles.css`, mobile overrides in `src/mobile-styles.css`
- Font Awesome icons via CDN: `<i class="fas fa-icon-name"></i>`
- Alert messages: `.alert.alert-success` / `.alert.alert-danger`
- Status badges: `.equipment-status.status-active` / `.status-maintenance` / `.status-inactive`

### Navigation
- Each module includes logout button with consistent implementation
- Profile button redirects to `../profile/profile.html`
- Uses relative paths from module directories (e.g., `../login/login.html`)

### Charts (Dashboard)
Uses Chart.js via CDN. Common chart types:
- Bar charts for technician performance
- Doughnut charts for status distribution
- Line charts for trends over time

## Key Technical Details

- **ES6 Modules**: All JS uses `import`/`export`, loaded via `<script type="module">`
- **CDN Dependencies**: Firebase SDK (10.7.1), Font Awesome, Chart.js - no package manager
- **No Build Process**: Browser-native JavaScript, no transpilation
- **Timestamps**: Always use `serverTimestamp()` for createdAt/updatedAt fields
- **Portuguese UI**: Form labels, messages, and interface text in Portuguese
- **Firebase Project**: `pcm-w-3d110` (API keys in `lib/firebase.js` are safe for frontend)

## Navigation Paths
Due to nested module structure, be careful with relative paths:
- From module (e.g., `src/OS/NovaOS.js`): Use `../../lib/auth.js`
- Logout redirects: Modules typically redirect to `../login/login.html`
- Home redirect: `../Telainicial/Telainicial.html` or absolute `/src/Telainicial/Telainicial.html`