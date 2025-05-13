import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FaChartLine,
  FaGlobe,
  FaRocket,
  FaChartBar,
  FaUser,
  FaArrowRight,
  FaSignOutAlt
} from 'react-icons/fa';

export default function Home() {
  // Initial state uses placeholders that match your design.
  const [stats, setStats] = useState([
    { label: 'Campagnes lancées', value: '0', icon: <FaRocket className="w-6 h-6" /> },
    { label: 'Crawls initiés', value: '0', icon: <FaGlobe className="w-6 h-6" /> },
    { label: 'Données collectées', value: '0', icon: <FaChartBar className="w-6 h-6" /> }
  ]);
  const [username, setUsername] = useState(null);

  // Fetch real stats from your backend API
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/get-stats');
        const data = await res.json();
        if (data.stats) {
          // Map icons based on label to keep same styling
          const iconMapping = {
            'Campagnes lancées': <FaRocket className="w-6 h-6" />,
            'Crawls initiés': <FaGlobe className="w-6 h-6" />,
            'Données collectées': <FaChartBar className="w-6 h-6" />,
          };
          const updatedStats = data.stats.map(stat => ({
            ...stat,
            icon: iconMapping[stat.label] || stat.icon
          }));
          setStats(updatedStats);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    }
    fetchStats();
  }, []);

  useEffect(() => {
    // Get username from localStorage after component mounts
    const storedUser = localStorage.getItem('username');
    if (storedUser) {
      setUsername(storedUser);
    }
  }, []);

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('phone');
    
    // Refresh the page to update UI state
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <FaChartLine className="w-8 h-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">TrackDash</span>
            </div>
            
            {username ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700 flex items-center">
                  <FaUser className="mr-2" />{username}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <FaSignOutAlt />
                  <span>Déconnexion</span>
                </button>
              </div>
            ) : (
              <Link href="/auth">
                <div className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                  <FaUser className="w-5 h-5" />
                  <span>Se connecter</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Analyse Avancée des Interactions Web
          </h1>
          
          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                    {stat.icon}
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-gray-600">{stat.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          <Link href="/start-crawl">
            <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer">
              <div className="flex items-start mb-6">
                <div className="bg-blue-100 p-4 rounded-xl text-blue-600">
                  <FaGlobe className="w-6 h-6" />
                </div>
                <div className="ml-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Analyse de Site Web</h3>
                  <p className="text-gray-600">
                    Exploration approfondie avec collecte de données et génération de rapports
                  </p>
                </div>
                <FaArrowRight className="ml-auto text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="border-t pt-6">
                <div className="text-sm font-semibold text-gray-500 mb-2">Dernières analyses</div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2" />
                    Analyse en cours - example.com
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="h-2 w-2 bg-gray-300 rounded-full mr-2" />
                    Terminé - demo-site.org
                  </div>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/start-campaign">
            <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer">
              <div className="flex items-start mb-6">
                <div className="bg-purple-100 p-4 rounded-xl text-purple-600">
                  <FaRocket className="w-6 h-6" />
                </div>
                <div className="ml-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Gestion de Campagne</h3>
                  <p className="text-gray-600">
                    Supervision de campagnes avec suivi temps réel et analyse comportementale
                  </p>
                </div>
                <FaArrowRight className="ml-auto text-gray-400 group-hover:text-purple-600 transition-colors" />
              </div>
              <div className="border-t pt-6">
                <div className="text-sm font-semibold text-gray-500 mb-2">Campagnes actives</div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2" />
                    Formation Sécurité Web
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="h-2 w-2 bg-blue-500 rounded-full mr-2" />
                    Étude UX Avancée
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
