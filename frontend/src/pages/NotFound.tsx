import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-warning/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-warning" />
                </div>

                <h1 className="text-6xl font-heading font-bold text-primary dark:text-primary-300 mb-2">404</h1>
                <h2 className="text-xl font-semibold dark:text-dark-text mb-3">Page Not Found</h2>
                <p className="text-text-muted dark:text-dark-text/60 mb-8">
                    The page you're looking for doesn't exist or has been moved.
                </p>

                <Link to="/" className="btn-primary inline-flex items-center gap-2">
                    <Home className="w-4 h-4" /> Go Home
                </Link>
            </div>
        </div>
    );
}
