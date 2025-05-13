import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { FiLock, FiUser, FiMapPin, FiSmartphone, FiMail, FiCreditCard, FiPackage, FiTruck } from 'react-icons/fi';

export default function FakePage() {
  const router = useRouter();
  const { campaignId, type } = router.query;
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState({ loading: false, message: '', error: '' });
  const [isSubmitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Retrieve user_id from localStorage (saved during login)
    setUserId(localStorage.getItem('user_id'));
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, message: '', error: '' });

    // For the 'delivery' type, ensure the delivery address form is filled.
    if (type === 'delivery') {
      if (!formData.name || !formData.address) {
        setStatus({
          loading: false,
          error: "Veuillez remplir le formulaire d'adresse en bas de la page avant de cliquer sur 'Rechercher'.",
          message: ''
        });
        return;
      }
    }

    const payload = {
      ...formData,
      campaignId,
      type,
      // Do not include user_id; backend extracts it from the token.
    };

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setStatus({ loading: false, error: 'Vous devez être connecté.', message: '' });
        return;
      }
      
      const res = await fetch('/api/fake-submission', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setStatus({
          loading: false,
          message: data.message || 'Soumission enregistrée.',
          error: ''
        });
      } else {
        setStatus({
          loading: false,
          error: data.message || 'Erreur de soumission.',
          message: ''
        });
      }
    } catch (err) {
      console.error(err);
      setStatus({ loading: false, error: 'Erreur de connexion au serveur.', message: '' });
    }
  };

  const renderFormFields = () => {
    if (type === 'bank') {
      return (
        <div className="bg-gradient-to-br from-purple-900 to-purple-700 min-h-screen p-6">
          <div className="max-w-md mx-auto">
            {/* Revolut-style Header */}
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <span className="text-purple-700 font-bold">R</span>
                </div>
                <span className="text-white text-xl font-bold">Revolut</span>
              </div>
              <select className="bg-transparent text-white border-none">
                <option>FR</option>
                <option>EN</option>
              </select>
            </div>

            {/* Form for Bank */}
            <form onSubmit={handleSubmit}>
              <div className="bg-white rounded-2xl p-6 shadow-xl">
                <h2 className="text-2xl font-bold mb-6">Connectez-vous</h2>
                <div className="space-y-4">
                  <div className="flex items-center border-b pb-2">
                    <FiUser className="text-gray-400 mr-2" />
                    <input
                      type="text"
                      placeholder="Nom d'utilisateur"
                      name="username"
                      className="flex-1 outline-none"
                      onChange={handleChange}
                    />
                  </div>
                  <div className="flex items-center border-b pb-2">
                    <FiLock className="text-gray-400 mr-2" />
                    <input
                      type="password"
                      placeholder="Mot de passe"
                      name="password"
                      className="flex-1 outline-none"
                      onChange={handleChange}
                    />
                  </div>
                  <button type="submit" className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition">
                    Se connecter
                  </button>
                </div>
              </div>
            </form>

            {/* Security Badges */}
            <div className="mt-8 flex justify-center space-x-4">
              <div className="flex items-center">
                <FiLock className="text-green-400 mr-1" />
                <span className="text-white text-sm">Sécurisé</span>
              </div>
              <div className="text-white text-sm">●</div>
              <div className="text-white text-sm">Banque agréée</div>
            </div>
          </div>
        </div>
      );
    } else if (type === 'delivery') {
      return (
        <div className="min-h-screen bg-gray-50">
          {/* DPD-style Header */}
          <div className="bg-orange-600 text-white py-4 px-6">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FiTruck className="w-6 h-6" />
                <span className="text-xl font-bold">DPD</span>
              </div>
              <nav className="space-x-4">
                <a href="#" className="hover:text-orange-200">Suivi</a>
                <a href="#" className="hover:text-orange-200">Services</a>
              </nav>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Tracking Form */}
            <div className="max-w-4xl mx-auto p-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center mb-6">
                  <FiPackage className="w-8 h-8 text-orange-600 mr-3" />
                  <h1 className="text-2xl font-bold">Suivi de colis</h1>
                </div>
                
                <div className="mb-6">
                  <div className="flex items-center bg-gray-100 rounded-lg p-3">
                    <input
                      type="text"
                      placeholder="Numéro de suivi DPD"
                      className="flex-1 bg-transparent outline-none"
                      name="trackingNumber"
                      onChange={handleChange}
                    />
                    <button type="submit" className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700">
                      Rechercher
                    </button>
                  </div>
                </div>

                {/* Fake Tracking Info */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-500">Statut actuel</div>
                      <div className="font-bold text-green-600">En transit</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Dernière mise à jour</div>
                      <div className="font-bold">14:45 - 15 mars</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <FiMapPin className="text-orange-600" />
                      </div>
                      <div>
                        <div className="font-semibold">Centre de tri DPD Paris</div>
                        <div className="text-sm text-gray-500">Sorti du centre de tri</div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <FiTruck className="text-orange-600" />
                      </div>
                      <div>
                        <div className="font-semibold">En livraison</div>
                        <div className="text-sm text-gray-500">Livraison prévue avant 18h</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Address Form */}
            <div className="max-w-4xl mx-auto p-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">Confirmez votre adresse</h2>
                <div className="space-y-4">
                  <div className="flex items-center border rounded-lg p-3">
                    <FiUser className="text-gray-400 mr-2" />
                    <input
                      type="text"
                      placeholder="Nom complet"
                      name="name"
                      className="flex-1 outline-none"
                      onChange={handleChange}
                    />
                  </div>
                  <div className="flex items-center border rounded-lg p-3">
                    <FiMapPin className="text-gray-400 mr-2" />
                    <input
                      type="text"
                      placeholder="Adresse"
                      name="address"
                      className="flex-1 outline-none"
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto p-4">
        {/* ... existing generic form ... */}
      </div>
    );
  };

  return (
    <>
      {renderFormFields()}
      <div className="fixed bottom-2 right-2 bg-white p-2 rounded-lg shadow text-xs text-gray-400">
        Simulation de phishing éducative
      </div>
    </>
  );
}
