import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Auth() {
    const [isSignUp, setIsSignUp] = useState(true)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('') // NEW — holds our own error message
    const navigate = useNavigate()
    const location = useLocation()

    // Signing in is optional, so this screen always needs a way out. Go back to
    // wherever they came from; if /auth was opened directly there is no history
    // entry to return to, so fall back to Today.
    const close = useCallback(() => {
        if (location.key === 'default') navigate('/')
        else navigate(-1)
    }, [location.key, navigate])

    useEffect(() => {
        const onKey = (event) => {
            if (event.key === 'Escape') close()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [close])

    const handleSubmit = async (e) => {
        e.preventDefault()


        if (isSignUp) {
            const trimmedName = name.trim()

            // name rules
            if (!trimmedName) {
                setError('Please enter your name.')
                return
            }

            if (/\s/.test(trimmedName)) {
                setError('Your name cannot contain spaces.')
                return
            }
        }

        // email rules
        const isValidEmail = email.includes('@') && email.includes('.')
        if (!isValidEmail) {
            setError('Please enter a valid email address.')
            return
        }

        // password rules
        if (isSignUp) {
            const trimmedName = name.trim()

            if (!trimmedName) {
                setError('Please enter your name.')
                return
            }

            if (/\s/.test(trimmedName)) {
                setError('Your name cannot contain spaces.')
                return
            }

            const isValidEmail = email.includes('@') && email.includes('.')
            if (!isValidEmail) {
                setError('Please enter a valid email address.')
                return
            }

            const hasMinLength = password.length >= 8
            const hasUppercase = /[A-Z]/.test(password)
            const hasNumber = /[0-9]/.test(password)
            const hasSymbol = /[^A-Za-z0-9]/.test(password)

            if (!hasMinLength || !hasUppercase || !hasNumber || !hasSymbol) {
                setError('Password must be at least 8 characters and include an uppercase letter, a number, and a symbol.')
                return
            }
        }
        setError('')

        if (isSignUp) {
            // Create a new account. `options.data` stores extra info
            // alongside the account — here, the name they typed.
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name.trim() || email.split('@')[0] },
                },
            })

            if (signUpError) {
                setError(signUpError.message)
                return
            }
        } else {
            // Check email+password against the real account
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) {
                setError(signInError.message)
                return
            }
        }

        // Success — App.jsx will pick up the new session automatically
        // (we're wiring that part next), so we just close the form here.
        navigate('/')
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
            // Clicking the backdrop dismisses; the guard keeps clicks inside the
            // card from bubbling up and closing it.
            onClick={(event) => {
                if (event.target === event.currentTarget) close()
            }}
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
                <button
                    type="button"
                    onClick={close}
                    aria-label="Close sign in"
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '32px',
                        height: '32px',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'none',
                        border: 'none',
                        borderRadius: '50%',
                        color: '#666666',
                        fontSize: '20px',
                        lineHeight: 1,
                        cursor: 'pointer',
                        padding: 0,
                    }}
                >
                    ×
                </button>

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
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
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
