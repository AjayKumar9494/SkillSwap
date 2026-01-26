import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageLayout } from "../components/PageLayout";
import { Alert } from "../components/Alert";
import { api } from "../services/api";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setStatus(data.message || "If the email exists, a reset link was sent.");
    } catch (err) {
      setError(err.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout hideNav>
      <div className="container flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <p className="text-sm text-slate-500">We will email you a secure reset link.</p>
          </CardHeader>
          <CardContent>
            {status && <Alert variant="success">{status}</Alert>}
            {error && <Alert variant="error">{error}</Alert>}
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>
              <p className="text-center text-sm text-slate-600">
                Remembered password?{" "}
                <Link to="/login" className="text-brand-600 hover:text-brand-700">
                  Back to login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default ForgotPasswordPage;

