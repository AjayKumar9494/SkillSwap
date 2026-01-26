import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageLayout } from "../components/PageLayout";
import { useAuth } from "../context/AuthContext";
import { Alert } from "../components/Alert";

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout hideNav>
      <div className="container flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Create your SkillSwap account</CardTitle>
            <p className="text-sm text-slate-500">Start teaching and learning today.</p>
          </CardHeader>
          <CardContent>
            {error && <Alert variant="error">{error}</Alert>}
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                <Input name="name" required value={form.name} onChange={handleChange} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <Input name="email" type="email" required value={form.email} onChange={handleChange} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <Input name="password" type="password" required value={form.password} onChange={handleChange} />
              </div>
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Register"}
              </Button>
              <p className="text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link to="/login" className="text-brand-600 hover:text-brand-700">
                  Login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default RegisterPage;

