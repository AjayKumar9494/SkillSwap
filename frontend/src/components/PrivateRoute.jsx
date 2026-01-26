import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageLayout } from "./PageLayout";

export const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <PageLayout>
        <p className="text-center text-slate-600">Loading...</p>
      </PageLayout>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

