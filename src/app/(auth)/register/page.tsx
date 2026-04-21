"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("密码不一致");
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      setMessage("请查收邮件确认账号");
      setError(null);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-parchment">
      <div className="w-full max-w-[420px] p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-brand-navy">注册 书境</h1>
        {error && <div className="p-3 text-sm text-red-500 bg-red-100 rounded">{error}</div>}
        {message && <div className="p-3 text-sm text-green-500 bg-green-100 rounded">{message}</div>}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-navy">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-navy">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-navy">确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 border rounded-md"
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-brand-blue rounded-md hover:bg-brand-navy"
          >
            注册
          </button>
        </form>
        <div className="text-sm text-center text-brand-muted">
          已有账号？ <a href="/login" className="text-brand-blue hover:underline">去登录</a>
        </div>
      </div>
    </div>
  );
}