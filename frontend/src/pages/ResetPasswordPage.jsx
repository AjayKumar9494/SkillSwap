import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageLayout } from "../components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Alert } from "../components/Alert";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");
  const { setUser } = useAuth();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    setError("");
    try {
      const { data } = await api.post("/auth/reset-password", { token, password });
      setUser(data.user);
      localStorage.setItem("token", data.token);
      setStatus("Password updated. Redirecting...");
      setTimeout(() => navigate("/dashboard"), 800);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed");
    }
  };

  return (
    <PageLayout hideNav>
      <div className="container flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Set a new password</CardTitle>
          </CardHeader>
          <CardContent>
            {!token && <Alert variant="error">Reset token missing</Alert>}
            {status && <Alert variant="success">{status}</Alert>}
            {error && <Alert variant="error">{error}</Alert>}
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">New password</label>
                <Input
                  type="password"
                  required
                  value={password}
                  minLength={6}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" type="submit" disabled={!token}>
                Save password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default ResetPasswordPage;

