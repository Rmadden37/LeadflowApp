# LeadFlow - Real Estate Lead Management PWA

A modern, high-performance Progressive Web App for real estate lead management built with Next.js, Firebase, and optimized for mobile devices.

## 🚀 Features

- **Real-time Lead Management** - Instant lead assignment and disposition tracking
- **Closer Queue System** - Intelligent lead routing and queue management  
- **Mobile-First Design** - Optimized for iOS and Android with PWA capabilities
- **Real-time Analytics** - Live performance tracking and reporting
- **Team Management** - Multi-team support with role-based access control
- **Scheduled Appointments** - Advanced scheduling and reminder system

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Firebase (Firestore, Functions, Authentication)
- **Styling**: Tailwind CSS with iOS-optimized animations
- **State Management**: React Query (TanStack Query)
- **UI Components**: Radix UI with custom mobile optimizations
- **PWA**: Next-PWA with offline support
- **AI Integration**: Google Genkit for intelligent features

## 📱 Performance Optimizations

This app includes extensive iOS Safari PWA optimizations:
- Hardware-accelerated animations and transitions
- Touch response optimization (zero 300ms delays)
- Memory-efficient glassmorphism effects
- Viewport-aware performance monitoring
- 60fps smooth scrolling and gestures

## 🏗 Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries and configs
│   ├── styles/             # CSS and styling files
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Helper functions
├── functions/              # Firebase Cloud Functions
├── public/                 # Static assets
├── firebase.json           # Firebase configuration
├── apphosting.yaml         # Firebase App Hosting config
└── next.config.js          # Next.js configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm 8+
- Firebase CLI

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd LeadflowApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Firebase config
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Visit the app**
   - Local: `http://localhost:9003`
   - Network: `http://[your-ip]:9003` (for mobile testing)

## 🔨 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks
- `npm run verify` - Run all checks and build
- `npm run deploy` - Deploy to Firebase Hosting
- `npm run deploy:full` - Deploy all Firebase services

## 🔥 Firebase Services

### Firestore Database
- **Collections**: `leads`, `closers`, `users`, `teams`
- **Real-time subscriptions** for live updates
- **Security rules** for role-based access

### Cloud Functions
- **Lead assignment automation**
- **Notification triggers** 
- **Data validation and processing**
- **Analytics aggregation**

### Authentication
- **Email/password authentication**
- **Role-based access control**
- **Team-based permissions**

### App Hosting
- **Server-side rendering** with Next.js
- **Automatic scaling**
- **Global CDN distribution**

## 📱 Mobile PWA Features

- **Installable** on iOS and Android home screens
- **Offline support** with service worker caching
- **Push notifications** for new leads and updates
- **Native-like navigation** and animations
- **iOS Safari optimizations** for smooth performance

## 🎨 Design System

- **Color Scheme**: Dark mode optimized with glassmorphism effects
- **Typography**: SF Pro Display system fonts for iOS compatibility  
- **Components**: Consistent design language with Radix UI base
- **Animations**: Hardware-accelerated 60fps transitions
- **Responsive**: Mobile-first with desktop adaptations

## 🔒 Security

- **Firestore Security Rules** prevent unauthorized access
- **Function-level validation** for all data operations
- **Role-based permissions** (setter, closer, manager, admin)
- **Input sanitization** and validation throughout

## 📊 Analytics & Monitoring

- **Real-time performance metrics** with custom monitoring
- **User analytics** tracking engagement and conversion
- **Error reporting** and performance insights
- **Lead conversion tracking** and team performance

## 🚀 Deployment

### Firebase App Hosting (Recommended)

```bash
# Deploy to Firebase App Hosting
npm run deploy:full
```

### Manual Deployment

```bash
# Build the application
npm run build

# Deploy to Firebase
firebase deploy
```

## 🧪 Testing

- **Unit Tests**: Jest with React Testing Library
- **E2E Tests**: Playwright for critical user flows
- **Performance Tests**: Custom monitoring and validation
- **Mobile Testing**: Real device testing tools

## 📚 Documentation

- **API Documentation**: See `/docs` folder
- **Component Library**: Storybook documentation
- **Deployment Guide**: Firebase App Hosting setup
- **Performance Guide**: iOS optimization details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Check the documentation in `/docs`
- Review the troubleshooting guide

---

**Built with ❤️ for real estate professionals**
