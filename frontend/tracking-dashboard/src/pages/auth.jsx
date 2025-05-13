import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FiArrowLeft, FiEye, FiEyeOff, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

function decodeJwt(token) {
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedPayload = atob(payloadBase64);
    return JSON.parse(decodedPayload);
  } catch (err) {
    console.error('Failed to decode JWT', err);
    return null;
  }
}

export default function Auth() {
  const router = useRouter();
  const { mode, verified } = router.query;
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState({ type: '', content: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [inputErrors, setInputErrors] = useState({});

  useEffect(() => setIsRegister(mode === 'register'), [mode]);
  useEffect(() => {
    if (verified === '1') {
      setMessage({ 
        type: 'success', 
        content: 'Votre adresse e-mail a été vérifiée. Vous pouvez maintenant vous connecter.' 
      });
    }
  }, [verified]);

  const validateField = (name, value) => {
    let error = '';
    switch(name) {
      case 'email':
        if (!/^\S+@\S+\.\S+$/.test(value)) error = 'Adresse email invalide';
        break;
      case 'phone':
        if (!/^\+?[0-9\s\-]{10,15}$/.test(value)) error = 'Numéro de téléphone invalide';
        break;
      case 'password':
        const strength = Math.min(3, [
          /[A-Z]/.test(value),
          /[0-9]/.test(value),
          value.length >= 8
        ].filter(Boolean).length);
        setPasswordStrength(strength);
        break;
      case 'confirmPassword':
        if (value !== formData.password) error = 'Les mots de passe ne correspondent pas';
        break;
    }
    setInputErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'phone') {
      const formatted = value
        .replace(/\D/g, '')
        .replace(/(\d{2})(?=\d)/g, '$1 ')
        .trim();
      setFormData(prev => ({ ...prev, [name]: formatted }));
    }
    
    validateField(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', content: '' });
    
    if (isRegister) {
      if (formData.password !== formData.confirmPassword) {
        return setMessage({ 
          type: 'error', 
          content: 'Les mots de passe ne correspondent pas' 
        });
      }
      
      const errors = Object.keys(formData).reduce((acc, key) => {
        validateField(key, formData[key]);
        if (inputErrors[key]) acc[key] = inputErrors[key];
        return acc;
      }, {});
      
      if (Object.keys(errors).length > 0) return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister ? formData : { 
        email: formData.email, 
        password: formData.password 
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Échec de l&apos;authentification");

      if (isRegister) {
        setMessage({
          type: 'success',
          content: 'Inscription réussie. Veuillez vérifier votre e-mail.'
        });
        setFormData({ email: '', username: '', phone: '', password: '', confirmPassword: '' });
      } else {
        // Save token and user_id in localStorage.
        localStorage.setItem('token', data.token);
        localStorage.setItem('user_id', data.user_id);
        const payload = decodeJwt(data.token);
        if (payload?.username) localStorage.setItem('username', payload.username);
        window.location.href = '/';
      }
    } catch (error) {
      setMessage({ type: 'error', content: error.message });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrengthColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500'
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transition-all duration-300 hover:shadow-2xl">
        <button
          onClick={() => router.push('/')}
          className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
        >
          <FiArrowLeft className="mr-2" />
          Retour à l&apos;accueil
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">
            {isRegister ? 'Créer un compte' : 'Bienvenue'}
          </h1>
          <p className="text-gray-600">
            {isRegister ? 'Commencez votre voyage avec nous' : 'Connectez-vous à votre compte'}
          </p>
        </div>

        {message.content && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${
            message.type === 'error' 
              ? 'bg-red-100 text-red-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {message.type === 'error' ? (
              <FiAlertCircle className="mr-2 flex-shrink-0" />
            ) : (
              <FiCheckCircle className="mr-2 flex-shrink-0" />
            )}
            {message.content}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse e-mail
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full p-3 border ${
                inputErrors.email ? 'border-red-500' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`}
              required
            />
            {inputErrors.email && (
              <span className="text-red-500 text-sm mt-1">{inputErrors.email}</span>
            )}
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom d&apos;utilisateur
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full p-3 border ${
                    inputErrors.phone ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`}
                  placeholder="+33 6 12 34 56 78"
                  required
                />
                {inputErrors.phone && (
                  <span className="text-red-500 text-sm mt-1">{inputErrors.phone}</span>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full p-3 border ${
                  inputErrors.password ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-12`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-500 hover:text-blue-600"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {isRegister && (
              <div className="mt-2">
                <div className="flex gap-1 mb-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full ${
                        passwordStrength > i 
                          ? passwordStrengthColors[passwordStrength] 
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre
                </p>
              </div>
            )}
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full p-3 border ${
                  inputErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`}
                required
              />
              {inputErrors.confirmPassword && (
                <span className="text-red-500 text-sm mt-1">
                  {inputErrors.confirmPassword}
                </span>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition-colors relative"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                {isRegister ? 'Inscription en cours...' : 'Connexion en cours...'}
              </div>
            ) : isRegister ? (
              'Créer un compte'
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          {isRegister ? 'Déjà inscrit ?' : 'Pas encore de compte ?'}
          <button
            onClick={() => {
              router.push(isRegister ? '/auth' : '/auth?mode=register');
              setMessage({ type: '', content: '' });
            }}
            className="ml-2 text-blue-600 font-semibold hover:underline"
          >
            {isRegister ? 'Se connecter' : 'Créer un compte'}
          </button>
        </p>
      </div>
    </div>
  );
}
