import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react';
import {
  FiTrash2,
  FiAlertTriangle,
  FiInfo,
  FiClock,
  FiFilter,
  FiArchive,
  FiCheckCircle
} from 'react-icons/fi';

const fetcher = (url) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  }).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  });
};

export default function Dashboard() {
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!token) {
      router.push('/auth');
    }
  }, [router, token]);

  // Declare all hooks at the top level.
  const [userId, setUserId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  // Retrieve user_id from localStorage when the component mounts.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('user_id');
      if (storedUserId) {
        setUserId(storedUserId);
      } else {
        console.error('No user_id found in localStorage');
      }
    }
  }, []);

  // Use SWR unconditionally. The key is null until userId is available.
  const { data, error } = useSWR(
    userId ? `/api/events?user_id=${userId}` : null,
    fetcher
  );

  // Instead of an early return before all hooks are defined, 
  // conditionally render a loading screen within the returned JSX.
  return (
    <>
      {(!token || !userId || !data) ? (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          {!token ? (
            <p>Redirection vers la page de connexion...</p>
          ) : !userId ? (
            <p>Chargement des informations utilisateur...</p>
          ) : (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Chargement des événements...</p>
            </div>
          )}
        </div>
      ) : (
        // Render the dashboard UI once token, userId and data are available.
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">
                Tableau de bord des événements
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setModalType('all');
                    setIsModalOpen(true);
                  }}
                  className="flex items-center bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <FiTrash2 className="mr-2" />
                  Tout supprimer
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {['all', 'campaigns', 'submissions'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg flex items-center ${activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {tab === 'campaigns' && <FiArchive className="mr-2" />}
                  {tab === 'submissions' && <FiCheckCircle className="mr-2" />}
                  {tab === 'all' ? 'Tous' : tab === 'campaigns' ? 'Campagnes' : 'Soumissions'}
                </button>
              ))}
            </div>

            {/* Sorting Controls */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-wrap gap-4 items-center">
              <div className="flex items-center">
                <FiFilter className="text-gray-500 mr-2" />
                <select
                  value={`${sortConfig.key}-${sortConfig.direction}`}
                  onChange={(e) => {
                    const [key, direction] = e.target.value.split('-');
                    setSortConfig({ key, direction });
                  }}
                  className="bg-gray-50 px-3 py-2 rounded-lg"
                >
                  <option value="date-desc">Plus récent</option>
                  <option value="date-asc">Plus ancien</option>
                </select>
              </div>
              <span className="text-sm text-gray-500">
                {/* Calculate the final event count */}
                {(() => {
                  const { campaigns = [], user_events = [] } = data || {};
                  const formSubmitEvents = user_events.filter(e => e.event_type === 'formSubmit' && Number(e.user_id) === Number(userId));
                  const filteredCampaigns = campaigns.filter(e => Number(e.user_id) === Number(userId));
                  const allEvents = [...filteredCampaigns, ...formSubmitEvents];

                  const sortedEvents = [...allEvents].sort((a, b) => {
                    const dateA = new Date(a.created_at || a.timestamp);
                    const dateB = new Date(b.created_at || b.timestamp);
                    return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
                  });

                  const filteredEvents = sortedEvents.filter(event => {
                    if (activeTab === 'campaigns') return event.campaign_id;
                    if (activeTab === 'submissions') return event.event_type;
                    return true;
                  });
                  return `${filteredEvents.length} résultat${filteredEvents.length > 1 ? 's' : ''}`;
                })()}
              </span>
            </div>

            {/* Events List */}
            <div className="grid gap-4">
              {(() => {
                const { campaigns = [], user_events = [] } = data || {};
                const formSubmitEvents = user_events.filter(e => e.event_type === 'formSubmit' && Number(e.user_id) === Number(userId));
                const filteredCampaigns = campaigns.filter(e => Number(e.user_id) === Number(userId));
                const allEvents = [...filteredCampaigns, ...formSubmitEvents];

                const sortedEvents = [...allEvents].sort((a, b) => {
                  const dateA = new Date(a.created_at || a.timestamp);
                  const dateB = new Date(b.created_at || b.timestamp);
                  return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
                });

                const filteredEvents = sortedEvents.filter(event => {
                  if (activeTab === 'campaigns') return event.campaign_id;
                  if (activeTab === 'submissions') return event.event_type;
                  return true;
                });

                if (filteredEvents.length === 0) {
                  return (
                    <div className="bg-white p-8 rounded-xl shadow-sm text-center">
                      <FiInfo className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Aucun événement trouvé</p>
                    </div>
                  );
                }

                return filteredEvents.map((event) => (
                  <div key={event.id} className="bg-white p-4 md:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                      <div className="mb-4 md:mb-0">
                        <div className="flex items-center mb-2">
                          <span className={`inline-block w-3 h-3 rounded-full mr-2 ${event.campaign_id ? 'bg-blue-500' : 'bg-green-500'
                            }`}></span>
                          <h3 className="font-semibold text-gray-900">
                            {event.campaign_id ? `Campagne #${event.campaign_id}` : 'Soumission de formulaire'}
                          </h3>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <FiClock className="mr-2" />
                          {new Date(event.created_at || event.timestamp).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Link href={`/event/${event.id}?source=${event.campaign_id ? 'campaign' : 'userevent'}`}>
                          <p className="flex items-center text-blue-600 hover:text-blue-700 px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100">
                            Détails
                          </p>
                        </Link>
                        <button
                          onClick={() => {
                            setModalType('single');
                            setSelectedEventId(event.id);
                            setIsModalOpen(true);
                          }}
                          className="flex items-center text-red-600 hover:text-red-700 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100"
                        >
                          <FiTrash2 className="mr-2" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Confirmation Modal */}
            {isModalOpen && (
              <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                  <div className="text-center mb-6">
                    <FiAlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {modalContent[modalType].title}
                    </h2>
                    <p className="text-gray-600">{modalContent[modalType].text}</p>
                  </div>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        setSelectedEventId(null);
                        setModalType(null);
                      }}
                      className="flex-1 px-6 py-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={async () => {
                        const success = await modalContent[modalType].action();
                        if (success) {
                          setIsModalOpen(false);
                        }
                      }}
                      className="flex-1 px-6 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center justify-center"
                    >
                      <FiTrash2 className="mr-2" />
                      Confirmer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
