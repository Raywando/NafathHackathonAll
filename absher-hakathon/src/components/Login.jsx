import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();

        // Mock Authentication Logic
        if (password === 'password') {
            let user = null;
            if (username === 'user1') {
                user = { id: 1, name: 'Abdullah Almuqaytib', role: 'Admin', avatar: 'https://ui-avatars.com/api/?name=Abdullah+Almuqaytib&background=4f46e5&color=fff' };
            } else if (username === 'user2') {
                user = { id: 2, name: 'Guest User', role: 'Visitor', avatar: 'https://ui-avatars.com/api/?name=Guest+User&background=ec4899&color=fff' };
            }

            if (user) {
                console.log('✅ Login successful:', user);
                // Save to both localStorage and sessionStorage for redundancy
                localStorage.setItem('authUser', JSON.stringify(user));
                sessionStorage.setItem('authUser', JSON.stringify(user));
                console.log('💾 User saved to storage');
                navigate('/scanner');
            } else {
                setError('Invalid username');
            }
        } else {
            setError('Invalid password');
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-pink-600/20 rounded-full blur-[100px]"></div>

            <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Lock className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                    <p className="text-white/50">Sign in to pair your device</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">Username</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Enter username"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Enter password"
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <button
                        type="submit"
                        className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-100 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-white/10"
                    >
                        Sign In <ArrowRight className="w-5 h-5" />
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-white/30 text-xs">Demo Creds: user1 / password</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
