"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Zap, Eye, EyeOff, Shield, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  {
    label: "Login as Admin",
    sublabel: "Priya Sharma · HR",
    email: "admin@performx.com",
    password: "Admin@123",
    icon: Shield,
    color: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/50",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    label: "Login as Manager",
    sublabel: "Rahul Mehta · Sales",
    email: "manager@performx.com",
    password: "Manager@123",
    icon: Users,
    color: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/50",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    label: "Login as Employee",
    sublabel: "Ananya Patel · Sales",
    email: "employee1@performx.com",
    password: "Employee@123",
    icon: User,
    color: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "Login as Employee",
    sublabel: "Vikram Singh · Sales",
    email: "employee2@performx.com",
    password: "Employee@123",
    icon: User,
    color: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    const res = await authApi.login(loginEmail, loginPassword);
    const { access_token, user } = res.data;
    setAuth(user, access_token);
    toast.success(`Welcome back, ${user.name}!`);
    if (user.role === "admin") router.push("/admin/dashboard");
    else if (user.role === "manager") router.push("/manager/dashboard");
    else router.push("/employee/dashboard");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning("Please enter your email and password");
      return;
    }
    setLoading(true);
    try {
      await doLogin(email, password);
    } catch {
      toast.error("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (acc: typeof DEMO_ACCOUNTS[0]) => {
    setQuickLoading(acc.email);
    try {
      await doLogin(acc.email, acc.password);
    } catch {
      toast.error("Quick login failed. Please try manually.");
    } finally {
      setQuickLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">PerformX</h1>
          <p className="text-slate-400 mt-1 text-sm">Goal Setting & Tracking Portal</p>
          <p className="text-slate-500 text-xs mt-1">AtomQuest Hackathon 1.0</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Manual login */}
          <div className="p-8">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5">Sign in to your account</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Sign In
              </Button>
            </form>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 px-8">
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
            <span className="text-xs text-slate-400 font-medium">DEMO QUICK ACCESS</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
          </div>

          {/* Quick login buttons */}
          <div className="p-6 pt-4 space-y-2">
            {DEMO_ACCOUNTS.map(acc => {
              const Icon = acc.icon;
              const isLoading = quickLoading === acc.email;
              return (
                <button
                  key={acc.email}
                  onClick={() => handleQuickLogin(acc)}
                  disabled={!!quickLoading}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    acc.color
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg bg-white/60 dark:bg-black/20 flex items-center justify-center flex-shrink-0")}>
                    {isLoading
                      ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : <Icon className={cn("w-4 h-4", acc.iconColor)} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{acc.label}</p>
                    <p className="text-xs opacity-70">{acc.sublabel}</p>
                  </div>
                  <span className="text-xs opacity-50 font-mono">{acc.email.split("@")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          All demo accounts use password: <span className="font-mono text-slate-400">*@123</span>
        </p>
      </div>
    </div>
  );
}
