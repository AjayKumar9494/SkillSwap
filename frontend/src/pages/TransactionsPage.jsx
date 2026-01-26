import { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { api } from "../services/api";
import { Alert } from "../components/Alert";

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setError("");
    try {
      const { data } = await api.get("/transactions/mine", { params: { limit: 20 } });
      setTransactions(data.items);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load history");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <PageLayout>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-brand-600">Credits</p>
          <h1 className="text-3xl font-bold text-slate-900">Credit history</h1>
        </div>
        {error && <Alert variant="error">{error}</Alert>}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transactions</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100">
            {transactions.map((t) => (
              <div key={t._id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-800">{t.description || t.type}</p>
                  <p className="text-slate-500">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
                <div className={`font-semibold ${t.type === "earn" ? "text-emerald-600" : "text-red-500"}`}>
                  {t.type === "earn" ? "+" : "-"}
                  {t.amount}
                </div>
              </div>
            ))}
            {!transactions.length && <p className="text-sm text-slate-600">No transactions yet.</p>}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default TransactionsPage;

