import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageLayout } from "../components/PageLayout";
import { useAuth } from "../context/AuthContext";
import { Alert } from "../components/Alert";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Basic validation
    if (!form.email || !form.password) {
      setError("Please enter both email and password");
      return;
    }
    
    setLoading(true);
    try {
      await login(form);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      // Handle different types of errors
      if (err.response) {
        // Server responded with error
        const errorMessage = err.response.data?.message || "Login failed. Please check your credentials.";
        setError(errorMessage);
      } else if (err.request) {
        // Request was made but no response received
        setError("Unable to connect to server. Please make sure the backend is running on http://localhost:5000");
      } else {
        // Something else happened
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout hideNav>
      <div className="container flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <p className="text-sm text-slate-500">Earn daily credits by logging in.</p>
          </CardHeader>
          <CardContent>
            {error && <Alert variant="error">{error}</Alert>}
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <Input name="email" type="email" required value={form.email} onChange={handleChange} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <Input name="password" type="password" required value={form.password} onChange={handleChange} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <Link to="/forgot-password" className="text-brand-600 hover:text-brand-700">
                  Forgot password?
                </Link>
                <Link to="/register" className="text-slate-500 hover:text-slate-700">
                  Create account
                </Link>
              </div>
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default LoginPage;

