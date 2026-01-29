import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Styles
import './styles/index.css'

// Pages (to be created)
// import HomePage from './pages/HomePage'
// import LoginPage from './pages/LoginPage'
// import RegisterPage from './pages/RegisterPage'
// import DashboardPage from './pages/DashboardPage'
// import DraftPage from './pages/DraftPage'
// import LeaguePage from './pages/LeaguePage'
// import RosterPage from './pages/RosterPage'
// import TradePage from './pages/TradePage'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    SplitScreen Fantasy League
                  </h1>
                  <p className="text-lg text-gray-600">
                    Mobile-first fantasy platform for League of Legends esports
                  </p>
                  <p className="mt-4 text-sm text-gray-500">
                    Setup complete! Ready for development.
                  </p>
                </div>
              </div>
            } />
            {/* Add routes as pages are created */}
            {/* <Route path="/login" element={<LoginPage />} /> */}
            {/* <Route path="/register" element={<RegisterPage />} /> */}
            {/* <Route path="/dashboard" element={<DashboardPage />} /> */}
            {/* <Route path="/draft/:leagueId" element={<DraftPage />} /> */}
            {/* <Route path="/league/:leagueId" element={<LeaguePage />} /> */}
            {/* <Route path="/roster/:leagueId" element={<RosterPage />} /> */}
            {/* <Route path="/trade/:leagueId" element={<TradePage />} /> */}
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App
