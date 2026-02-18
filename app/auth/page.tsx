'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Loader2, Mail } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import * as yup from 'yup';

const loginSchema = yup.object().shape({
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().required('Password is required'),
});

const signupSchema = yup.object().shape({
    name: yup.string().required('Full name is required'),
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

export default function AuthPage() {
    const { colors } = useTheme();
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (isLogin) {
                await loginSchema.validate({ email: formData.email, password: formData.password });

                const result = await signIn('credentials', {
                    redirect: false,
                    email: formData.email,
                    password: formData.password,
                });

                if (result?.error) {
                    setError('Invalid email or password');
                } else {
                    router.push('/');
                }
            } else {
                await signupSchema.validate(formData);

                // Signup logic with axios
                const response = await axios.post('/api/auth/signup', formData);

                if (response.status === 201) {
                    // Automatically log in after signup
                    const result = await signIn('credentials', {
                        redirect: false,
                        email: formData.email,
                        password: formData.password,
                    });
                    if (result?.error) {
                        setError('Account created, but login failed. Please try signing in.');
                        setIsLogin(true);
                    } else {
                        router.push('/');
                    }
                }
            }
        } catch (err: any) {
            if (err.name === 'ValidationError') {
                setError(err.message);
            } else {
                setError(err.response?.data?.error || 'An error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        setIsGoogleLoading(true);
        signIn('google', { callbackUrl: '/' });
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[120px]" />

            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center z-10">

                {/* Brand / Emotional Side */}
                <div className="hidden md:flex flex-col space-y-6">
                    <div className="flex items-center space-x-3">
                        <img
                            src="/logo.png"
                            alt="MyArc Logo"
                            className="w-9 h-9 p-1.5 rounded-xl object-contain shadow-lg"
                            style={{ backgroundColor: colors.logoBg, boxShadow: `0 10px 15px -3px ${colors.primary}33` }}
                        />
                        <h1 className="text-2xl font-bold tracking-tight">MyArc</h1>
                    </div>
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-4xl font-extrabold tracking-tight lg:text-5xl"
                    >
                        <span className="text-primary">Reflection</span> turns experience into <span className="text-secondary">momentum</span>.
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-muted-foreground max-w-md"
                    >
                        Understand yourself deeply.<br />
                        Remember what matters.<br />
                        Move toward your goals faster.<br />
                    </motion.p>
                </div>

                {/* Auth Form Card */}
                <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl">{isLogin ? 'Welcome Back' : 'Begin Your Journey'}</CardTitle>
                        <CardDescription>
                            {isLogin ? 'Enter your credentials to continue.' : 'Create an account to start reflecting.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <AnimatePresence mode="wait">
                                {!isLogin && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-2 overflow-hidden"
                                    >
                                        <Input
                                            name="name"
                                            placeholder="Full Name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required={!isLogin}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="space-y-2">
                                <Input
                                    name="email"
                                    type="email"
                                    placeholder="Email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    name="password"
                                    type="password"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-xl border border-destructive/20 text-center animate-in fade-in slide-in-from-top-1">
                                    {error}
                                </p>
                            )}

                            <Button
                                type="submit"
                                disabled={isLoading || isGoogleLoading}
                                className="w-full bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-semibold transition-all duration-300 h-12 rounded-xl active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 flex items-center justify-center space-x-2">
                            <div className="h-px w-full bg-border" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap px-2">Or continue with</span>
                            <div className="h-px w-full bg-border" />
                        </div>

                        <div className="mt-6">
                            <Button
                                variant="outline"
                                type="button"
                                disabled={isLoading || isGoogleLoading}
                                onClick={handleGoogleSignIn}
                                className="w-full h-12 rounded-xl border-border/50 hover:bg-muted/80 hover:shadow-md active:scale-[0.98] active:bg-muted font-medium transition-all duration-200"
                            >
                                {isGoogleLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Sign in with Google
                                    </>
                                )}
                            </Button>
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-center border-t border-border/10 pt-6">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="text-sm text-muted-foreground hover:text-primary transition-colors hover:underline"
                        >
                            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                        </button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
