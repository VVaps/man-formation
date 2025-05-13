import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  FaUserEdit, 
  FaSave, 
  FaTimes, 
  FaLock, 
  FaEnvelope, 
  FaPhone, 
  FaUser,
  FaSignOutAlt
} from 'react-icons/fa';

const Profile = () => {
  const router = useRouter();
  const [form, setForm] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [originalData, setOriginalData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) {
      router.push('/auth');
      return;
    }

    fetch('/api/profile?ts=' + Date.now(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setForm({
            username: data.user.username,
            email: data.user.email,
            phone: data.user.phone,
            password: '',
            confirmPassword: '',
          });
          setOriginalData({
            username: data.user.username,
            email: data.user.email,
            phone: data.user.phone,
          });
        } else {
          setError(data.error || 'Échec du chargement du profil');
        }
      })
      .catch(() => {
        setError('Échec du chargement du profil');
      })
      .finally(() => setLoading(false));
  }, [router, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    
    if (name === 'password') {
      const strength = Math.min(3, [
        /[A-Z]/.test(value),
        /[0-9]/.test(value),
        value.length >= 8
      ].filter(Boolean).length);
      setPasswordStrength(strength);
    }
  };

  const handleEdit = (e) => {
    e.preventDefault();
    setEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = (e) => {
    e.preventDefault();
    setForm({
      ...originalData,
      password: '',
      confirmPassword: '',
    });
    setEditing(false);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          phone: form.phone,
          ...(form.password && { password: form.password })
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess('Profil mis à jour avec succès');
        setEditing(false);
        setOriginalData(form);
      } else {
        setError(data.error || 'Erreur de mise à jour');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center">
            <FaUser className="mr-3 text-blue-600" />
            Profil Utilisateur
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
          >
            <FaSignOutAlt className="mr-2" />
            Déconnexion
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6">
            {(error || success) && (
              <div className={`mb-6 p-4 rounded-lg flex items-center ${
                error ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
              }`}>
                {error ? <FaTimes className="mr-2" /> : <FaSave className="mr-2" />}
                {error || success}
              </div>
            )}

            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaUser className="inline mr-2" />
                      Nom d&apos;utilisateur
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      disabled={!editing}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaEnvelope className="inline mr-2" />
                      Adresse e-mail
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      disabled={!editing}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaPhone className="inline mr-2" />
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      disabled={!editing}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {editing && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FaLock className="inline mr-2" />
                        Nouveau mot de passe
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Laisser vide pour inchangé"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      {form.password && (
                        <div className="mt-2 flex gap-1">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className={`h-2 flex-1 rounded-full ${
                                passwordStrength > i 
                                  ? ['bg-red-500', 'bg-orange-500', 'bg-green-500'][i]
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FaLock className="inline mr-2" />
                        Confirmation du mot de passe
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirmez le nouveau mot de passe"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 border-t pt-6">
                {!editing ? (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FaUserEdit className="mr-2" />
                    Modifier le Profil
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex items-center bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <FaTimes className="mr-2" />
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="flex items-center bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <FaSave className="mr-2" />
                      Sauvegarder
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
