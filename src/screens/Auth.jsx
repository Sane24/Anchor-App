import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Auth({ onLogin }) {
    const [isSignUp, setIsSignUp] = useState(false)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('') // NEW — holds our own error message
    const navigate = useNavigate()

    const handleSubmit = (e) => {
        e.preventDefault()

        // NEW — our own check, same as before
        const isValidEmail = email.includes('@') && email.includes('.')
        if (!isValidEmail) {
            setError('Please enter a valid email address.')
            return // stop here, don't sign in/up
        }
        setError('') // clear any old error

        try {
            const displayName = isSignUp && name.trim()
                ? name.trim()
                : (email ? email.split('@')[0] : 'User')

            localStorage.setItem('userName', displayName)

            if (typeof onLogin === 'function') {
                onLogin(displayName)
            }

            navigate('/today')
        } catch (err) {
            console.error('Login error:', err)
            navigate('/today')
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '16px',
            }}
        // Note: no onClick-to-close here — sign-in is required to use the app,
        // so there's nowhere for a backdrop click to sensibly send someone.
        >
            <div
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    padding: '28px 24px',
                    width: '100%',
                    maxWidth: '340px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    position: 'relative',
                }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', color: '#1a1a1a', fontWeight: '700' }}>
                        {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </h2>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>
                        {isSignUp ? 'Sign up to start your journey' : 'Sign in to access your day'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {isSignUp && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#555', textTransform: 'uppercase' }}>
                                Name
                            </label>
                            <input
                                type="text"
                                placeholder="Your Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={isSignUp}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '14px',
                                    outline: 'none',
                                    backgroundColor: '#f8fafc',
                                }}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#555', textTransform: 'uppercase' }}>
                            Email
                        </label>
                        <input
                            type="text"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                fontSize: '14px',
                                outline: 'none',
                                backgroundColor: '#f8fafc',
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#555', textTransform: 'uppercase' }}>
                            Password
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                fontSize: '14px',
                                outline: 'none',
                                backgroundColor: '#f8fafc',
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        style={{
                            marginTop: '10px',
                            padding: '12px',
                            backgroundColor: 'var(--green, #7c3aed)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                        }}
                    >
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                    {error && (
                        <p style={{ color: '#ff9b9b', fontWeight: 'bold', textAlign: 'center', margin: 0 }}>
                            {error}
                        </p>
                    )}
                </form>

                {/* Toggle Mode */}
                <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '13px', color: '#666' }}>
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--green, #7c3aed)',
                            fontWeight: '600',
                            cursor: 'pointer',
                            padding: 0,
                            textDecoration: 'underline',
                        }}
                    >
                        {isSignUp ? 'Sign In' : 'Sign Up'}

                    </button>
                </div>
            </div>
        </div>
    )
}
