import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {jwtDecode} from 'jwt-decode';
import Loader from '../components/loading';
import { CSVLink } from 'react-csv';

const AdminPage = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    crawlAccess: null,
    campaignAccess: null,
  });
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [previewUser, setPreviewUser] = useState(null);

  // Authentication and data fetching
  useEffect(() => {
    setMounted(true);
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
    if (!storedToken) router.push('/auth');
  }, [router]);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (!decoded.is_admin) router.push('/unauthorized');
      } catch (err) {
        router.push('/auth');
      }
    }
  }, [token, router]);

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetch(`/api/admin/users?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch users');
          return res.json();
        })
        .then((data) => {
          const normalizedUsers = data.users.map((user) => ({
            ...user,
            // Convert values to booleans
            can_start_crawl: Number(user.can_start_crawl) === 1,
            can_start_campaign: Number(user.can_start_campaign) === 1,
          }));
          setUsers(normalizedUsers);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError('Failed to load user data');
          setLoading(false);
        });
    }
  }, [token]);

  // Filtering and sorting logic
  const filteredUsers = users
    .filter((user) => {
      const matchesSearch = Object.values(user).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      );
      const matchesCrawl = filters.crawlAccess !== null 
        ? user.can_start_crawl === filters.crawlAccess 
        : true;
      const matchesCampaign = filters.campaignAccess !== null 
        ? user.can_start_campaign === filters.campaignAccess 
        : true;
      return matchesSearch && matchesCrawl && matchesCampaign;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Bulk actions
  const toggleAllUsers = () => {
    if (selectedUsers.size === currentUsers.length) {
      setSelectedUsers(new Set());
    } else {
      const newSelected = new Set(currentUsers.map((user) => user.id));
      setSelectedUsers(newSelected);
    }
  };

  const bulkDelete = async () => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${selectedUsers.size} utilisateurs ?`)) {
      try {
        const res = await fetch('/api/admin/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userIds: Array.from(selectedUsers) }),
        });
        if (!res.ok) throw new Error('Failed to delete users');
        setUsers((prev) => prev.filter((u) => !selectedUsers.has(u.id)));
        setSelectedUsers(new Set());
      } catch (err) {
        console.error(err);
        setError(err.message);
      }
    }
  };

  // Access management
  const toggleAccess = async (type, userId, currentStatus) => {
    try {
      const endpoint = type === 'crawl' 
        ? '/api/admin/toggle-crawl-access' 
        : '/api/admin/toggle-campaign-access';
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        // Notice we send the target user's ID in the payload.
        body: JSON.stringify({ 
          userId, 
          [`can_start_${type}`]: !currentStatus 
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update access');
      }

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          String(u.id) === String(userId)
            ? { ...u, [`can_start_${type}`]: !currentStatus }
            : u
        )
      );
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // User deletion
  const deleteUser = async (userId) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;
    
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error('Failed to delete user');
      setUsers((prevUsers) => prevUsers.filter((u) => String(u.id) !== String(userId)));
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  if (!mounted) return <Loader />;

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-blue-600">
        Tableau de bord administrateur
      </h1>

      {/* Controls Section */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[300px]">
          <input
            type="text"
            placeholder="Rechercher des utilisateurs..."
            className="w-full px-4 py-2 border rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-4 items-center">
          <select
            className="px-4 py-2 border rounded-lg"
            value={filters.crawlAccess ?? ''}
            onChange={(e) => 
              setFilters((prev) => ({
                ...prev,
                crawlAccess: e.target.value !== '' ? e.target.value === 'true' : null,
              }))
            }
          >
            <option value="">Tous les accès Crawl</option>
            <option value="true">Accès activé</option>
            <option value="false">Accès désactivé</option>
          </select>

          <select
            className="px-4 py-2 border rounded-lg"
            value={filters.campaignAccess ?? ''}
            onChange={(e) => 
              setFilters((prev) => ({
                ...prev,
                campaignAccess: e.target.value !== '' ? e.target.value === 'true' : null,
              }))
            }
          >
            <option value="">Tous les accès Campagne</option>
            <option value="true">Accès activé</option>
            <option value="false">Accès désactivé</option>
          </select>

          <CSVLink 
            data={currentUsers}
            filename="utilisateurs.csv"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Exporter CSV
          </CSVLink>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <div className="mb-4 flex items-center gap-4">
          <span className="text-gray-600">
            {selectedUsers.size} sélectionné(s)
          </span>
          <button
            onClick={bulkDelete}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Supprimer la sélection
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Table Section */}
      {loading ? (
        <div className="text-center py-8">
          <Loader />
          <p className="mt-2 text-gray-600">Chargement des utilisateurs...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-blue-600">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === currentUsers.length}
                      onChange={toggleAllUsers}
                      className="cursor-pointer"
                    />
                  </th>
                  {['Nom', 'Email', 'Téléphone', 'Crawl', 'Campagne', 'Actions'].map((header) => (
                    <th 
                      key={header}
                      className="px-6 py-4 text-left text-sm font-semibold text-blue-600 cursor-pointer"
                      onClick={() => {
                        if (header === 'Nom') {
                          setSortConfig({
                            key: 'username',
                            direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
                          });
                        }
                      }}
                    >
                      {header}
                      {sortConfig.key === 'username' && (
                        <span className="ml-2">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentUsers.map((user) => (
                  <tr 
                    key={user.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setPreviewUser(user)}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedUsers);
                          e.target.checked 
                            ? newSelected.add(user.id)
                            : newSelected.delete(user.id);
                          setSelectedUsers(newSelected);
                        }}
                        className="cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.phone}
                    </td>
                    
                    {['crawl', 'campaign'].map((type) => (
                      <td key={type} className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAccess(type, user.id, user[`can_start_${type}`]);
                          }}
                          className={`w-10 h-5 rounded-full relative transition-colors ${
                            user[`can_start_${type}`] 
                              ? 'bg-blue-600' 
                              : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                              user[`can_start_${type}`] 
                                ? 'translate-x-5' 
                                : 'translate-x-1'
                            }`}
                            style={{ top: '2px' }}
                          />
                        </button>
                      </td>
                    ))}

                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteUser(user.id);
                        }}
                        className="flex items-center text-red-600 hover:text-red-800 transition-colors"
                      >
                        {/* Using an inline SVG for deletion icon */}
                        <svg
                          className="w-5 h-5 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center px-6 py-4 border-t">
            <div className="text-sm text-gray-600">
              {filteredUsers.length} utilisateurs trouvés
            </div>
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 rounded-lg ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {users.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              Aucun utilisateur trouvé
            </div>
          )}
        </div>
      )}

      {/* User Preview Modal */}
      {previewUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <h2 className="text-2xl font-bold mb-4">{previewUser.username}</h2>
            <div className="space-y-2">
              <p><strong>Email:</strong> {previewUser.email}</p>
              <p><strong>Téléphone:</strong> {previewUser.phone}</p>
              <p>
                <strong>Accès Crawl:</strong> 
                {previewUser.can_start_crawl ? ' Activé' : ' Désactivé'}
              </p>
              <p>
                <strong>Accès Campagne:</strong> 
                {previewUser.can_start_campaign ? ' Activé' : ' Désactivé'}
              </p>
            </div>
            <button
              onClick={() => setPreviewUser(null)}
              className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
