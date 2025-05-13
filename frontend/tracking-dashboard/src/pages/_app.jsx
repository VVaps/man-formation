import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import './styles/global.css';
import { useRouter } from 'next/router';
import { FaChartLine } from 'react-icons/fa';

function MyApp({ Component, pageProps }) {
  const [token, setToken] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false);
  const router = useRouter();

  const inactivityTimerRef = useRef(null);
  const expirationTimerRef = useRef(null);
  const desktopDropdownRef = useRef(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('phone');

    setToken(null);
    setIsAdmin(false);

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (expirationTimerRef.current) clearTimeout(expirationTimerRef.current);

    window.location.href = '/auth';
  }, []); // Removed the unnecessary dependency 'router'

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setToken(null);
      setIsAdmin(false);
      return;
    }
    setToken(storedToken);

    try {
      const decoded = jwtDecode(storedToken);
      const currentTime = Date.now() / 1000;
      const timeUntilExpiration = decoded.exp - currentTime;

      setIsAdmin(decoded.is_admin || false);

      if (timeUntilExpiration <= 0) {
        handleLogout();
        return;
      }

      expirationTimerRef.current = setTimeout(handleLogout, timeUntilExpiration * 1000);
    } catch (err) {
      handleLogout();
    }
  }, [handleLogout]);

  useEffect(() => {
    const INACTIVITY_LIMIT = 1 * 60 * 60 * 1000;

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(handleLogout, INACTIVITY_LIMIT);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer, { passive: true });
    });

    resetInactivityTimer();

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer, { passive: true });
      });
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [handleLogout]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (desktopDropdownRef.current && !desktopDropdownRef.current.contains(event.target)) {
        setDesktopDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMobileNav = () => {
    setMobileNavOpen(prev => !prev);
  };

  const [username, setUsername] = useState(null);
  useEffect(() => {
    const storedUser = localStorage.getItem('username');
    if (storedUser) {
      setUsername(storedUser);
    }
  }, []);

  const isFakePage = router.pathname === '/fake-page';

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {!isFakePage && (
        // Made header "relative" so that the mobile dropdown is anchored to it.
        <header className="relative bg-blue-600 text-white py-4 px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-[250px]">
            <Link href="/">
              <div className="flex items-center">
                <FaChartLine className="w-8 h-8 text-white" />
                <span className="ml-2 text-xl font-bold whitespace-nowrap">TrackDash</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation – remains unchanged except for the updated "Démarrer" button */}
          <nav className="hidden md:flex space-x-2 items-center">
            <Link href="/">
              <p className={`px-3 py-2 rounded-lg transition-all duration-200 ${router.pathname === '/' ? 'bg-blue-700' : 'hover:bg-blue-700'
                }`}>
                Accueil
              </p>
            </Link>
            {!token ? (
              <>
                <Link href="/auth">
                  <p className="px-3 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200">
                    Connexion
                  </p>
                </Link>
                <Link href="/auth?mode=register">
                  <p className="px-3 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200">
                    Inscription
                  </p>
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard">
                  <p className={`px-3 py-2 rounded-lg transition-all duration-200 ${router.pathname === '/dashboard' ? 'bg-blue-700' : 'hover:bg-blue-700'
                    }`}>
                    Tableau de Bord
                  </p>
                </Link>
                <Link href="/profile">
                  <p className={`px-3 py-2 rounded-lg transition-all duration-200 ${router.pathname === '/profile' ? 'bg-blue-700' : 'hover:bg-blue-700'
                    }`}>
                    Profil
                  </p>
                </Link>

                <div className="relative" ref={desktopDropdownRef}>
                  <button
                    onClick={() => setDesktopDropdownOpen(prev => !prev)}
                    className="flex items-center px-3 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200"
                  >
                    <span>Démarrer</span>
                    <svg
                      className={`w-4 h-4 ml-1 transform transition-transform ${desktopDropdownOpen ? 'rotate-180' : ''}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {desktopDropdownOpen && (
                    <div className="absolute bg-white text-black shadow-lg mt-2 z-10 rounded-lg overflow-hidden border border-blue-100 min-w-[200px]">
                      <Link href="/start-campaign">
                        <p className="px-4 py-3 hover:bg-blue-50 transition-colors duration-150">
                          Lancez votre campagne
                        </p>
                      </Link>
                      <div className="border-t border-blue-100" />
                      <Link href="/start-crawl">
                        <p className="px-4 py-3 hover:bg-blue-50 transition-colors duration-150">
                          Démarrer le Crawl
                        </p>
                      </Link>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <Link href="/admin">
                    <p className={`px-3 py-2 rounded-lg transition-all duration-200 ${router.pathname === '/admin' ? 'bg-blue-700' : 'hover:bg-blue-700'
                      }`}>
                      Admin
                    </p>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200"
                >
                  Déconnexion
                </button>
              </>
            )}
          </nav>

          {/* Mobile Nav Toggle Button */}
          <button
            className="md:hidden focus:outline-none p-2 hover:bg-blue-700 rounded-lg transition-colors"
            onClick={toggleMobileNav}
            aria-label="Basculer la navigation"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={mobileNavOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>

          {/* Mobile Dropdown Navigation – now placed inside the header with absolute positioning */}
          {mobileNavOpen && (
            <div className="absolute left-0 right-0 top-full bg-blue-600 text-white shadow-lg z-50">
              <div className="px-6 py-4 space-y-2">
                <Link href="/">
                  <p
                    className="block py-2 hover:bg-blue-700 rounded-lg"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Accueil
                  </p>
                </Link>
                {!token ? (
                  <>
                    <Link href="/auth">
                      <p
                        className="block py-2 hover:bg-blue-700 rounded-lg"
                        onClick={() => setMobileNavOpen(false)}
                      >
                        Connexion
                      </p>
                    </Link>
                    <Link href="/auth?mode=register">
                      <p
                        className="block py-2 hover:bg-blue-700 rounded-lg"
                        onClick={() => setMobileNavOpen(false)}
                      >
                        Inscription
                      </p>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/dashboard">
                      <p
                        className="block py-2 hover:bg-blue-700 rounded-lg"
                        onClick={() => setMobileNavOpen(false)}
                      >
                        Tableau de Bord
                      </p>
                    </Link>
                    <Link href="/profile">
                      <p
                        className="block py-2 hover:bg-blue-700 rounded-lg"
                        onClick={() => setMobileNavOpen(false)}
                      >
                        Profil
                      </p>
                    </Link>

                    {/* Nested "Démarrer" Dropdown for Mobile */}
                    <div className="space-y-2">
                      <button
                        onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
                        className="w-full flex justify-between items-center py-2 px-3 hover:bg-blue-700 rounded-lg"
                      >
                        <span>Démarrer</span>
                        <svg
                          className={`w-4 h-4 transform transition-transform ${mobileDropdownOpen ? 'rotate-180' : ''
                            }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      {mobileDropdownOpen && (
                        <div className="ml-4 space-y-2">
                          <Link href="/start-campaign">
                            <p
                              className="block py-2 px-3 hover:bg-blue-700 rounded-lg"
                              onClick={() => {
                                setMobileDropdownOpen(false);
                                setMobileNavOpen(false);
                              }}
                            >
                              Lancez votre campagne
                            </p>
                          </Link>
                          <Link href="/start-crawl">
                            <p
                              className="block py-2 px-3 hover:bg-blue-700 rounded-lg"
                              onClick={() => {
                                setMobileDropdownOpen(false);
                                setMobileNavOpen(false);
                              }}
                            >
                              Démarrer le Crawl
                            </p>
                          </Link>
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <Link href="/admin">
                        <p
                          className="block py-2 hover:bg-blue-700 rounded-lg"
                          onClick={() => setMobileNavOpen(false)}
                        >
                          Admin
                        </p>
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileNavOpen(false);
                      }}
                      className="w-full text-left py-2 px-3 hover:bg-blue-700 rounded-lg"
                    >
                      Déconnexion
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </header>
      )}

      <main className="container mx-auto flex-grow py-10 px-4">
        <Component {...pageProps} />
      </main>

      {!isFakePage && (
        <footer className="bg-blue-600 text-white py-6 text-center mt-auto">
          <div className="container mx-auto px-4">
            <p className="text-sm mb-2 opacity-90">
              © 2025 Tableau de Bord de Suivi. Tous droits réservés.
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="/privacy" className="text-sm opacity-75 hover:opacity-100 transition-opacity">
                Confidentialité
              </Link>
              <Link href="/terms" className="text-sm opacity-75 hover:opacity-100 transition-opacity">
                Conditions d&apos;utilisation
              </Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default MyApp;
