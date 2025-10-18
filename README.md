# 🥊 Sticker Fight - Multiplayer Fighting Game

A real-time multiplayer fighting game built with Next.js and Socket.IO where two players control sticker man characters to battle each other.

## 🎮 How to Play

1. **Create or Join a Room**: 
   - Enter your fighter name
   - Create a new room or join an existing one with a room code
   - Share the room code with a friend

2. **Controls**:
   - **Move**: `A`/`D` keys or `←`/`→` arrow keys
   - **Jump**: `W` key or `↑` arrow key  
   - **Attack**: `SPACE` key

3. **Objective**: 
   - Reduce your opponent's health to 0 to win
   - Each attack deals 10 damage
   - Players start with 100 health

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- pnpm (or npm/yarn)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd sticker-main-indies-on-solana
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

4. Open your browser and navigate to `http://localhost:3000`

## 🏗️ Architecture

### Frontend Components
- **GameLobby**: Room creation and joining interface
- **GameArena**: The fighting arena with visual elements
- **StickerMan**: Animated sticker character component
- **GamePage**: Main game coordinator

### Backend Services
- **Socket.IO Server**: Real-time multiplayer communication
- **Game Logic**: Physics, collision detection, and game rules
- **Room Management**: Player sessions and game state

### Key Features
- ⚡ Real-time multiplayer using Socket.IO
- 🎨 CSS-based character animations
- 🎯 Collision detection and physics
- 🏆 Win/lose conditions
- 📱 Responsive design
- 🎮 Keyboard controls

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Socket.IO
- **Real-time Communication**: WebSockets
- **Styling**: Tailwind CSS with custom animations

## 🎯 Game Mechanics

### Physics System
- Gravity simulation
- Ground collision detection
- Player boundary constraints
- Velocity-based movement

### Combat System
- Attack range detection
- Health management
- Knockback effects
- Attack cooldown system

### Multiplayer Features
- Real-time position synchronization
- Attack broadcasting
- Player disconnection handling
- Room-based matchmaking

## 🎨 Visual Design

The game features a colorful sticker-style art design with:
- Animated sticker man characters
- Dynamic health bars
- Visual attack effects
- Responsive arena backgrounds
- Real-time UI updates

## 🔧 Development

### Project Structure
```
src/
├── app/                 # Next.js app directory
├── components/          # React components
├── hooks/              # Custom React hooks
├── services/           # API and Socket.IO services  
├── types/              # TypeScript type definitions
└── utils/              # Game logic and utilities
```

### Adding New Features
1. Game mechanics can be modified in `src/utils/gameLogic.ts`
2. Character animations in `src/components/StickerMan.tsx`
3. Arena design in `src/components/GameArena.tsx`
4. Socket events in `src/services/gameSocket.ts`

## 🚀 Deployment

For production deployment:

1. Build the application:
```bash
pnpm build
```

2. Start the production server:
```bash
pnpm start
```

## 🐛 Troubleshooting

### Common Issues
- **Connection Problems**: Ensure ports 3000 is available
- **Game Not Starting**: Check that both players have joined the room
- **Controls Not Working**: Make sure the game window has focus

### Debug Mode
The game includes console logging for debugging multiplayer connections and game events.

## 🎉 Credits

Built for the Underdog Hackathon - Indies on Solana

---

**Have fun fighting! 🥊**
