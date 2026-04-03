/**
 * useAuth – thin re-export of useAuthContext for convenience.
 * Usage: const { user, role, logout, isAuthenticated } = useAuth();
 */
export { useAuthContext as useAuth } from "@/context/AuthContext";
