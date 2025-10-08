# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EduPet Collection** is a gamified learning app for elementary school students (grades 3-5) that integrates quiz-based learning with farm management and animal collection. The core gameplay loop involves daily learning missions that reward students with virtual currency, plant growth, and gacha tickets.

This is a **hybrid Next.js + static HTML project**:
- Next.js components exist in `src/` but the primary working version uses static HTML files in the root directory
- The main user-facing pages are HTML files (not Next.js pages)
- **Focus development efforts on the HTML files** unless specifically working on Next.js migration

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Next.js dev server (port 3000)
npm run build        # Build Next.js app
npm start            # Start production Next.js server
npm run lint         # Run ESLint
```

**No test framework is currently configured.**

## Key Entry Points

- `index.html` - Home dashboard with learning missions, weakness learning, garden status
- `tutorial.html` - First-time user onboarding (7 pages)
- `quiz-adaptive.html` - Adaptive difficulty quiz interface with extra learning mode
- `simple-farm.html` - Plant growing and management
- `animal-collection.html` - Gacha system and animal encyclopedia
- `subject-select.html` - Choose learning subjects (supports extra learning mode)
- `achievements.html` - Track user progress and unlock rewards

## Critical System Architecture

### ⚠️ Single Source of Truth: PlantSystem

**All game state flows through `plant-system.js` (localStorage: `plantSystemUser`):**

```
┌─────────────────────────────────────────────────────────┐
│                     PlantSystem                          │
│  (plant-system.js - localStorage: plantSystemUser)      │
│                                                           │
│  ├─ wallet: { money, water }                            │
│  ├─ rewards: {                                          │
│  │    growthTickets: [],                                │
│  │    normalGachaTickets: 0,                            │
│  │    premiumGachaTickets: 0                            │
│  │  }                                                    │
│  └─ daily: { completedSubjects, completedSubjectIds }   │
└─────────────────────────────────────────────────────────┘
```

**CRITICAL RULES:**
1. **Never create separate localStorage keys** for money, tickets, or rewards
2. **Always use `plantSystem.getUserData()` and `plantSystem.saveUserData()`** to read/write state
3. **Money operations:** Use `plantSystem.getMoney()`, `plantSystem.addMoney()`, `plantSystem.spendMoney()`
4. **Ticket operations:** Read/write directly to `user.rewards.normalGachaTickets` and `user.rewards.premiumGachaTickets`

### Data Flow Pattern

1. **Local-first architecture**: All game state stored in localStorage
2. **Firebase integration**: Optional cloud sync via `firebase-integration.js`
3. **Offline queue**: Failed Firebase operations queued and retried when online

### Core Systems

#### 1. Plant System (`plant-system.js`)

**Class:** `PlantSystem`

**Reward tiers** (defined in `config.REWARD_THRESHOLDS`):
- 3 subjects → 1 growth ticket
- 5 subjects → 1 normal gacha ticket
- 6 subjects → 1 additional growth ticket
- 9 subjects → 1 premium gacha ticket + 1 growth ticket

**Growth mechanics:**
- Plants require 20 water + 24 hours to become READY
- Growth tickets expire after 24 hours
- Use `plantSystem.completeSubject(user, subjectId, subjectName)` to grant rewards

**Money system:**
```javascript
plantSystem.getMoney()           // Get current balance
plantSystem.addMoney(100)        // Add money (e.g., harvest)
plantSystem.spendMoney(100)      // Spend money (returns {success, currentMoney})
plantSystem.setMoney(100)        // Set money (admin only)
```

#### 2. Learning System

**12 subjects:** english, math, science, korean, social, common, idiom, person, economy, production, toeic, ai

**Adaptive difficulty:**
- 80%+ accuracy → increase difficulty
- 40%- accuracy → decrease difficulty

**Question structure:** `src/data/questions/[subject]/level[X]-[Y].json`
- **File naming:** `level{1-3}-{1|2}.json` where 1/2 alternates by odd/even days
- **Target:** 60 questions per subject (30 easy + 20 medium + 10 hard)

**Progress tracking:**
- Stored in `localStorage.learningProgress`
- Daily reset at 04:00 Asia/Seoul timezone

**Extra Learning Mode:**
- Trigger: Selecting already-completed subjects
- Check: `localStorage.extraLearningMode === 'true'`
- Behavior: No rewards, unlimited questions

#### 3. Weakness Learning System (`weakness-learning.js`)

- Auto-detects weakest subject from `user.learning.subjectScores`
- Loads questions from actual question bank
- Date-based rotation between level files
- Integrated on home screen "Today's Learning" card

#### 4. Animal Collection System

**Gacha mechanics:**
- Normal tickets (5 subjects): Common 60%, Rare 30%, Epic 9%, Legendary 1%
- Premium tickets (9 subjects): Common 5%, Rare 62%, Epic 30%, Legendary 3%

**Reading tickets:**
```javascript
// animal-collection.html uses this pattern
function getTicketsFromPlantSystem() {
    const userData = JSON.parse(localStorage.getItem('plantSystemUser'));
    return {
        normal: userData?.rewards?.normalGachaTickets || 0,
        premium: userData?.rewards?.premiumGachaTickets || 0
    };
}
```

**Using tickets:**
```javascript
// Must decrement from plantSystemUser
const userData = plantSystem.getUserData();
userData.rewards.premiumGachaTickets--;
plantSystem.saveUserData(userData);
```

#### 5. Firebase Integration (`firebase-integration.js`)

**Class:** `EduPetFirebaseIntegration`
- Anonymous auth on first load
- Real-time sync: stats, plant state, farm state, learning progress
- Offline queue via `queueForLater()`
- Legacy `eduPetGameState` used only for Firebase migration (do not use for new features)

### LocalStorage Schema

**Primary keys (use these):**
```javascript
'plantSystemUser'             // Single source of truth for money, tickets, rewards
'plantSystemPlants'           // All plants: { [plantId]: { stage, water, ownerId } }
'learningProgress'            // Daily progress per subject
'selectedSubjects'            // Array of subject IDs for quiz session
'extraLearningMode'           // 'true' when in extra learning mode
'animalCollection'            // Animal gacha collection data
```

**Legacy keys (do not use):**
```javascript
'simpleFarmState'             // Old farm system (migrated to plantSystem.wallet)
'eduPetGameState'             // Only for Firebase migration
```

**Settings:**
```javascript
'eduPetSettings'              // { userName, fontSize, soundEnabled }
'eduPetOnboardingCompleted'   // 'true' after tutorial
```

### Daily Reset Logic

**Reset time:** 04:00 Asia/Seoul timezone

**Reset actions** (implemented in `plant-system.js:dailyReset()`):
- Clear `daily.completedSubjects` counter
- Clear `daily.completedSubjectIds` array
- Remove expired growth tickets (older than 24h)
- Update `lastResetDate` to current date

## Key Constraints & Business Rules

### Economic System
- Monthly withdrawal cap: 10,000원 maximum
- Plant grade values: Common(0원) → Advanced(100원) → Epic(1,000원) → Legendary(3,000원)
- Daily learning requirement: 25 minutes minimum
- Downgrade penalty: 1 day without care = plant drops 1 grade

### Learning Rewards Flow
```
Daily Study → Complete Subjects → Earn Rewards
├── 3 subjects → 1 growth ticket
├── 5 subjects → 1 normal gacha ticket
├── 6 subjects → 1 growth ticket (additional)
└── 9 subjects → 1 premium gacha ticket + 1 growth ticket

Growth Ticket → Use within 24h → Plant advances 1 stage
Plant Growth → 5 stages → Harvest → Virtual currency
```

### Tutorial Flow (CRITICAL)

**`tutorial.html:completeOnboarding()`** grants starter bonuses:
```javascript
// ✅ CORRECT - Uses PlantSystem
plantSystem.setMoney(100);

const plantSystemUser = plantSystem.getUserData();
plantSystemUser.rewards.premiumGachaTickets += 1;
plantSystem.saveUserData(plantSystemUser);

// ❌ INCORRECT - Never use eduPetGameState for new features
const gameState = JSON.parse(localStorage.getItem('eduPetGameState'));
gameState.premiumTickets += 1;  // WRONG!
```

## Common Development Patterns

### Adding a New Subject
1. Create question files: `src/data/questions/[subject]/level1-1.json` through `level3-2.json`
2. Add subject metadata in relevant HTML files:
   ```javascript
   const subjects = {
       newsubject: { name: '새과목', icon: '📚', color: 'blue', time: 10 }
   };
   ```
3. Update `subject-select.html`, `quiz-adaptive.html`, `index.html`
4. Update `weakness-learning.js` if needed

### Implementing Extra Learning Mode
1. Check `localStorage.extraLearningMode === 'true'` in quiz initialization
2. Skip `plantSystem.completeSubject()` when in extra learning mode
3. Show exit button and orange badge "✨ 추가 학습"
4. Clean up flag on exit

### Modifying Reward Thresholds
1. Edit `plant-system.js` `config.REWARD_THRESHOLDS`
2. Update UI messages in `quiz-adaptive.html:showNextActionDialog()`
3. Sync Firebase schema in `firebase-integration.js` if needed

### Testing Full Flow
```javascript
// 1. Clear all data
localStorage.clear();

// 2. Complete tutorial
// Visit tutorial.html → 7 steps

// 3. Verify state
const user = JSON.parse(localStorage.plantSystemUser);
console.log('Money:', user.wallet.money);  // Should be 100
console.log('Premium tickets:', user.rewards.premiumGachaTickets);  // Should be 1

// 4. Test learning flow
// Complete 9 subjects → Check rewards

// 5. Test gacha
// Visit animal-collection.html → Use premium ticket
```

### Debugging localStorage
```javascript
// View all game state
const user = JSON.parse(localStorage.plantSystemUser);
console.log('Money:', user.wallet.money);
console.log('Tickets:', user.rewards);
console.log('Daily progress:', user.daily);

// View weakness learning
console.log('Subject scores:', user.learning.subjectScores);

// Clear all data (testing onboarding)
localStorage.clear();
```

## Firebase Configuration

Required: `firebase-config.js` with valid Firebase credentials

Setup documented in `FIREBASE_SETUP.md`:
1. Create Firebase project
2. Enable Authentication (Anonymous)
3. Enable Realtime Database (Asia Southeast region)
4. Configure security rules
5. Update `firebase-config.js`

## Development Notes

- **Always test onboarding:** Clear localStorage → `tutorial.html` → verify rewards
- **Firebase is optional:** App works fully offline
- **Main branch:** Use `main` for PRs, current development on `gemini` branch
- **HTML-first:** Prioritize HTML files over Next.js components
- **Date handling:** Always use Asia/Seoul timezone
- **Plant stages:** 🌰 → 🌱 → 🌿 → 🌸 → 🍎
- **Question loading:** Odd/even day logic for file selection

## Style & Design System

**Tailwind CSS via CDN** (not build process)

### Color Palette
- Primary (growth/learning): `#4CAF50` green
- Secondary (activity/fun): `#FF9800` orange
- Accent (trust/stability): `#2196F3` blue
- Danger (warnings): `#F44336` red

### Rarity Colors
- Common: `#9CA3AF` gray
- Rare: `#3B82F6` blue
- Epic: `#8B5CF6` purple
- Legendary: `#F59E0B` gold

### Typography
- Font: Noto Sans KR (Google Fonts)
- Game text: `.font-game` class (600 weight)

## File Naming Conventions

- Plant system files: `plant-system.js`, `plant.md`
- Firebase files: `firebase-*.js`
- HTML pages: kebab-case (e.g., `animal-collection.html`)
- Question data: `src/data/questions/[subject]/level[X]-[Y].json`
- Legacy marker: `-backup` or `-old` suffix
