import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

// One sheet, four modes:
//   signin / signup — the usual pair
//   forgot          — ask for a reset link
//   reset           — set a new password, reached from that emailed link
//                     (App.jsx sends us here on Supabase's PASSWORD_RECOVERY)

const COPY = {
    signin: { title: 'Welcome Back', sub: 'Sign in to access your day', submit: 'Sign In' },
    signup: { title: 'Create Account', sub: 'Sign up to start your journey', submit: 'Sign Up' },
    forgot: { title: 'Reset your password', sub: 'We’ll email you a link to set a new one', submit: 'Send reset link' },
    reset: { title: 'Set a new password', sub: 'Almost there — pick something you’ll remember', submit: 'Save password' },
}

// Same rule for sign-up and for resetting. Returns a message, or null if fine.
function validatePassword(password) {
    const ok =
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    return ok
        ? null
        : 'Password must be at least 8 characters and include an uppercase letter, a number, and a symbol.'
}

function validateEmail(email) {
    return email.includes('@') && email.includes('.')
        ? null
        : 'Please enter a valid email address.'
}

// The form is noValidate: inputs keep type="email"/"password" so phones show
// the right keyboard, but the messages come from the validators above rather
// than the browser's native popup, whose wording differs per browser.
//
// Where Supabase should send people back to after they click the emailed link.
// Read from the live URL so it works on localhost and under the GitHub Pages
// subpath without being hardcoded. The hash is excluded, which is what we want.
function redirectTarget() {
    return window.location.origin + window.location.pathname
}

export default function Auth() {
    const navigate = useNavigate()
    const location = useLocation()

    const [mode, setMode] = useState(location.state?.reset ? 'reset' : 'signup')
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [sent, setSent] = useState(false)
    const [busy, setBusy] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    // A recovery link can land while the sheet is already open.
    useEffect(() => {
        if (location.state?.reset) setMode('reset')
    }, [location.state])

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

    function switchMode(next) {
        setMode(next)
        setError('')
        setSent(false)
        setPassword('')
        setConfirm('')
    }


    const handleGoogleSignIn = async () => {
        setError('')
        setBusy(true)
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectTarget(),
                scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly',
            },
        })
        setBusy(false)
        if (oauthError) setError(oauthError.message)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        /* ---- set a new password (arrived from the email link) ---- */
        if (mode === 'reset') {
            const passwordError = validatePassword(password)
            if (passwordError) return setError(passwordError)
            if (password !== confirm) return setError('Those two passwords don’t match.')

            setBusy(true)
            const { error: updateError } = await supabase.auth.updateUser({ password })
            setBusy(false)
            if (updateError) return setError(updateError.message)

            // The recovery link already signed them in, so there's nowhere to
            // send them but into the app.
            navigate('/')
            return
        }

        /* ---- ask for a reset link ---- */
        if (mode === 'forgot') {
            const emailError = validateEmail(email)
            if (emailError) return setError(emailError)

            setBusy(true)
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectTarget(),
            })
            setBusy(false)

            // Rate limiting is about our mail sender, not about who has an
            // account, so it's safe — and much less confusing — to say it out
            // loud. Every other failure stays hidden behind the same
            // confirmation, since "no such account" would let anyone check who
            // has one.
            if (resetError?.status === 429) {
                return setError('Too many requests just now. Wait a minute and try again.')
            }

            setSent(true)
            return
        }

        /* ---- sign up ---- */
        if (mode === 'signup') {
            const trimmedName = name.trim()
            if (!trimmedName) return setError('Please enter your name.')
            if (/\s/.test(trimmedName)) return setError('Your name cannot contain spaces.')

            const emailError = validateEmail(email)
            if (emailError) return setError(emailError)

            const passwordError = validatePassword(password)
            if (passwordError) return setError(passwordError)

            setBusy(true)
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: trimmedName } },
            })
            setBusy(false)
            if (signUpError) return setError(signUpError.message)

            navigate('/')
            return
        }

        /* ---- sign in ---- */
        const emailError = validateEmail(email)
        if (emailError) return setError(emailError)

        setBusy(true)
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        setBusy(false)
        if (signInError) return setError(signInError.message)

        navigate('/')
    }

    const copy = COPY[mode]

    return (
        <div
            className="auth-backdrop"
            // Clicking the backdrop dismisses; the guard keeps clicks inside the
            // card from bubbling up and closing it.
            onClick={(event) => {
                if (event.target === event.currentTarget) close()
            }}
        >
            <div className="auth-card">
                <button type="button" className="auth-close" onClick={close} aria-label="Close sign in">
                    ×
                </button>

                <div className="auth-head">
                    <h2>{copy.title}</h2>
                    <p>{copy.sub}</p>
                </div>

                {/* Reset link sent — a confirmation instead of the form. */}
                {mode === 'forgot' && sent ? (
                    <div className="auth-form">
                        <p className="auth-note">
                            If an account exists for <strong>{email}</strong>, a reset link is on
                            its way. It expires in an hour.
                        </p>
                        <p className="auth-note">
                            Nothing after a minute? Check your spam folder before trying again.
                        </p>
                        <button type="button" className="auth-submit" onClick={() => switchMode('signin')}>
                            Back to sign in
                        </button>
                    </div>
                ) : (
                    <form className="auth-form" onSubmit={handleSubmit} noValidate>
                        {mode === 'signup' && (
                            <div className="auth-field">
                                <label htmlFor="auth-name">Name</label>
                                <input
                                    id="auth-name"
                                    type="text"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        )}

                        {mode !== 'reset' && (
                            <div className="auth-field">
                                <label htmlFor="auth-email">Email</label>
                                <input
                                    id="auth-email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        )}

                        {mode !== 'forgot' && (
                            <div className="auth-field">
                                <label htmlFor="auth-password">
                                    {mode === 'reset' ? 'New password' : 'Password'}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="auth-password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        style={{ paddingRight: '48px', width: '100%', boxSizing: 'border-box' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            color: 'var(--green)',
                                            padding: 0,
                                        }}
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {mode === 'reset' && (
                            <div className="auth-field">
                                <label htmlFor="auth-confirm">Confirm new password</label>
                                <input
                                    id="auth-confirm"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                />
                            </div>
                        )}

                        {mode === 'signin' && (
                            <div className="auth-forgot-row">
                                <button
                                    type="button"
                                    className="auth-link"
                                    onClick={() => switchMode('forgot')}
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        <button type="submit" className="auth-submit" disabled={busy}>
                            {busy ? 'Working…' : copy.submit}
                        </button>

                        {error && <p className="auth-error">{error}</p>}
                    </form>
                )}

                {(mode === 'signin' || mode === 'signup') && (
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={busy}
                        style={{
                            marginTop: '10px',
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#ffffff',
                            color: '#1a1a1a',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Continue with Google
                    </button>
                )}

                {/* Mode switch */}
                {mode === 'forgot' && !sent && (
                    <div className="auth-alt">
                        <button type="button" className="auth-link" onClick={() => switchMode('signin')}>
                            Back to sign in
                        </button>
                    </div>
                )}

                {(mode === 'signin' || mode === 'signup') && (
                    <div className="auth-alt">
                        {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button
                            type="button"
                            className="auth-link"
                            onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
                        >
                            {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
