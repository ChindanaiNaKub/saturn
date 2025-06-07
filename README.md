# Saturn Chess Reader

A comprehensive PGN (Portable Game Notation) Chess Reader and Editor website built with Next.js, featuring powerful analysis tools and engine integration.

## Features

### 🚀 Core Functionalities

**PGN Upload & Input**
- 📁 Upload PGN files directly from your computer
- 📝 Paste PGN text directly into the interface
- 🔗 Load PGN from web URLs
- 🎯 Sample game loader for quick testing

**Interactive Chessboard**
- 🎨 Beautiful, responsive chessboard display
- ↔️ Move navigation (forward/backward/start/end)
- 🎬 Auto-play mode with customizable speed
- 🔄 Board orientation toggle (white/black)
- ✨ Move highlighting and animations
- 📱 Fully responsive design

**Game Information Display**
- 🏷️ Complete PGN header information
- 👥 Player names, ratings, and details
- 📅 Event information and dates
- 🏆 Game results and ECO codes
- 📋 Formatted move list with navigation

**Analysis Tools**
- 🎯 Interactive move list with click navigation
- 📊 Engine analysis (Stockfish integration planned)
- 🔍 Position evaluation and best moves
- 📈 Error and blunder detection (coming soon)

**User Experience**
- 🎨 Modern, clean interface using shadcn/ui
- 🌓 Dark/light mode support
- 📱 Mobile-friendly responsive design
- ⚡ Fast performance and smooth interactions
- 🛡️ Robust error handling

### 🛠️ Technical Stack

- **Framework**: Next.js 14 with App Router
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Chess Logic**: chess.js library
- **Chessboard**: react-chessboard
- **Icons**: Lucide React
- **Engine**: Stockfish (integration planned)
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm/yarn/pnpm

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd saturn
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Usage

### Uploading Games

1. **File Upload**: Click "Choose File" and select a PGN file
2. **Paste Text**: Copy and paste PGN text directly
3. **URL Loading**: Enter a URL pointing to a PGN file
4. **Sample Game**: Try the built-in Fischer vs Spassky sample

### Navigating Games

- Use the sidebar to switch between multiple games
- Navigate through moves using the control buttons
- Click on moves in the move list to jump to specific positions
- Use the auto-play feature to watch games automatically

### Analyzing Positions

- View comprehensive game information in the Info tab
- Examine the raw PGN text in the PGN tab
- Engine analysis coming soon in the Analysis tab

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles and CSS variables
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Main page component
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── chess-analyzer.tsx # Main chess analysis component
│   ├── header.tsx        # Navigation header
│   ├── pgn-upload.tsx    # PGN upload interface
│   └── sidebar.tsx       # Game list sidebar
├── lib/                  # Utility libraries
│   ├── pgn-utils.ts      # PGN parsing and formatting
│   └── utils.ts          # General utilities
└── public/               # Static assets
```

## Planned Features

### 🔮 Upcoming

- 🤖 **Stockfish Integration**: Full engine analysis with evaluations
- 🎯 **Opening Database**: ECO classification and opening explorer
- 📊 **Game Statistics**: Win rates, piece activity, time analysis
- 🔄 **Import/Export**: Direct integration with Chess.com and Lichess
- 🎨 **Customization**: Themes, board styles, and piece sets
- 📱 **Mobile App**: React Native version
- 🏗️ **Game Editor**: Edit and annotate games
- 🔍 **Position Search**: Find similar positions across games
- 🎓 **Training Mode**: Tactical puzzles from game positions

### 🌟 Advanced Features

- **Multi-format Support**: Support for other chess formats
- **Database Integration**: Connect to chess databases
- **Collaborative Analysis**: Share and collaborate on analysis
- **Tournament Management**: Organize and track tournaments
- **Streaming Integration**: Live game analysis
- **AI Commentary**: Automated game commentary

## Contributing

We welcome contributions! Please feel free to submit issues and enhancement requests.

### Development Guidelines

1. Use TypeScript for all new code
2. Follow the existing code style and conventions
3. Add tests for new functionality
4. Update documentation as needed

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Chess.js for robust chess logic
- react-chessboard for the beautiful board component
- shadcn/ui for the excellent component library
- The chess community for inspiration and feedback

---

Built with ❤️ for the chess community
