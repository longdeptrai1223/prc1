import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { auth, signInWithGoogle, logOut, onAuthStateChange } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
      
      // Redirect based on auth state
      if (firebaseUser) {
        // If logged in and on login page, redirect to home
        if (location === '/') {
          navigate('/home');
        }
      } else {
        // If not logged in and not on login page, redirect to login
        if (location !== '/') {
          navigate('/');
        }
      }
    });

    return () => unsubscribe();
  }, [location, navigate]);

  const signIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      // Navigation will be handled by the auth state change listener
      toast({
        title: "Login successful",
        description: "Welcome to PTC Mining App!",
      });
    } catch (error) {
      console.error('Error signing in:', error);
      toast({
        title: "Login failed",
        description: "Could not sign in with Google",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await logOut();
      // Navigation will be handled by the auth state change listener
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Logout failed",
        description: "Could not sign out",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}